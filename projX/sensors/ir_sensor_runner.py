import time
from datetime import datetime

from config import (
    FAULT_MAX_DURATION_SECONDS,
    FAULT_MIN_DURATION_SECONDS,
    KAFKA_TOPIC_SENSOR,
    SENSOR_HEARTBEAT_INTERVAL_SECONDS,
    SIMULATION_INTERVAL_SECONDS,
    SIMULATION_SEED,
    TECHNICIAN_REPAIR_PROBABILITY,
)
from context_loader import load_spots
from ir_sensor_event_builder import (
    build_heartbeat_event,
    events_for_transition,
    is_offline,
)
from kafka_publisher import KafkaPublisher
from state_machine import SpotStateMachine


def run_ir_sensors():
    spots = load_spots()
    if not spots:
        raise RuntimeError("No parking spots returned by backend context endpoint")

    publisher = KafkaPublisher()
    # Use SIMULATION_SEED + 2 so this machine evolves independently from the
    # occupancy runner (SIMULATION_SEED) and fault simulator (SIMULATION_SEED + 1).
    machine = SpotStateMachine(
        seed=SIMULATION_SEED + 2,
        fault_min_duration=FAULT_MIN_DURATION_SECONDS,
        fault_max_duration=FAULT_MAX_DURATION_SECONDS,
        technician_repair_probability=TECHNICIAN_REPAIR_PROBABILITY,
    )

    start_mono = time.monotonic()
    meta = {
        spot["spotId"]: {
            "occupancy": _normalize_initial(spot["status"], spot["zone"]),
            "time_in_state": 0,
            # Offset so every sensor fires its first heartbeat on the first tick
            "last_heartbeat_at": start_mono - SENSOR_HEARTBEAT_INTERVAL_SECONDS,
        }
        for spot in spots
    }

    while True:
        current_hour = datetime.now().hour
        now_mono = time.monotonic()
        published_any = False

        for spot in spots:
            spot_id = spot["spotId"]
            m = meta[spot_id]
            previous = m["occupancy"]

            next_status, _, _ = machine.next_status(
                previous,
                zone=spot.get("zone"),
                current_hour=current_hour,
                time_in_state=m["time_in_state"],
                row=spot.get("row", 0),
                col=spot.get("col", 0),
                spot_id=spot_id,
                now=now_mono,
            )

            if next_status != previous:
                m["occupancy"] = next_status
                m["time_in_state"] = 0
                for event in events_for_transition(spot, previous, next_status):
                    publisher.publish(KAFKA_TOPIC_SENSOR, spot_id, event)
                    published_any = True
            else:
                m["time_in_state"] += 1

            # Heartbeat: time-gated, only when sensor is not broken
            elapsed = now_mono - m["last_heartbeat_at"]
            if elapsed >= SENSOR_HEARTBEAT_INTERVAL_SECONDS and not is_offline(
                m["occupancy"]
            ):
                publisher.publish(
                    KAFKA_TOPIC_SENSOR,
                    spot_id,
                    build_heartbeat_event(spot),
                )
                m["last_heartbeat_at"] = now_mono
                published_any = True

        if published_any:
            publisher.flush()
        if SIMULATION_INTERVAL_SECONDS > 0:
            time.sleep(SIMULATION_INTERVAL_SECONDS)


def _normalize_initial(status: str, zone: str) -> str:
    s = (status or "free").strip().lower()
    if s == "occupied":
        return "occupied"
    if s in ("reserved", "out_of_service"):
        return s
    return "free"
