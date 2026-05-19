import time
from datetime import datetime, timezone

from config import (
    FAULT_MAX_DURATION_SECONDS,
    FAULT_MIN_DURATION_SECONDS,
    KAFKA_TOPIC,
    SENSOR_FAULT_DEGRADED_PROBABILITY,
    SENSOR_FAULT_DELAY_MAX_SECONDS,
    SENSOR_FAULT_DELAY_PROBABILITY,
    SENSOR_FAULT_DUPLICATE_PROBABILITY,
    SENSOR_FAULT_HISTORY_SIZE,
    SENSOR_FAULT_MAINTENANCE_PROBABILITY,
    SENSOR_FAULT_OFFLINE_PROBABILITY,
    SENSOR_FAULT_RECOVERY_PROBABILITY,
    SIMULATION_INTERVAL_SECONDS,
    SIMULATION_SEED,
    TECHNICIAN_REPAIR_PROBABILITY,
)
from context_loader import load_reservations, load_spots
from event_builder import build_spot_event
from kafka_publisher import KafkaPublisher
from publishing import flush_pending, schedule_publish
from sensor_fault_simulator import SensorFaultSimulator
from state_machine import SpotStateMachine


def run():
    spots = load_spots()
    if not spots:
        raise RuntimeError("No parking spots returned by backend context endpoint")
    publisher = KafkaPublisher()
    machine = SpotStateMachine(
        seed=SIMULATION_SEED,
        fault_min_duration=FAULT_MIN_DURATION_SECONDS,
        fault_max_duration=FAULT_MAX_DURATION_SECONDS,
        technician_repair_probability=TECHNICIAN_REPAIR_PROBABILITY,
    )
    # Keyed by full spot_id (UUID) — no truncation, no risk of ID collision.
    fault_simulator = SensorFaultSimulator(
        seed=SIMULATION_SEED + 1,
        degraded_probability=SENSOR_FAULT_DEGRADED_PROBABILITY,
        offline_probability=SENSOR_FAULT_OFFLINE_PROBABILITY,
        maintenance_probability=SENSOR_FAULT_MAINTENANCE_PROBABILITY,
        recovery_probability=SENSOR_FAULT_RECOVERY_PROBABILITY,
        fault_min_duration=FAULT_MIN_DURATION_SECONDS,
        fault_max_duration=FAULT_MAX_DURATION_SECONDS,
        duplicate_probability=SENSOR_FAULT_DUPLICATE_PROBABILITY,
        delay_probability=SENSOR_FAULT_DELAY_PROBABILITY,
        delay_max_seconds=SENSOR_FAULT_DELAY_MAX_SECONDS,
        history_size=SENSOR_FAULT_HISTORY_SIZE,
    )

    meta_by_spot = {
        spot["spotId"]: {
            "status": normalize_initial_status(spot["status"], spot["zone"]),
            "time_in_state": 0,
        }
        for spot in spots
    }

    # Events queued due to delayed transmission: list of (event, key, publish_at_mono)
    pending_delayed = []

    print(f"Loaded {len(spots)} spots")

    while True:
        current_hour = datetime.now().hour
        now_ts = datetime.now(timezone.utc)
        now_mono = time.monotonic()

        pending_delayed = flush_pending(
            pending_delayed, publisher, KAFKA_TOPIC, now_mono
        )

        try:
            active_res = load_reservations()
        except Exception as exc:
            print(f"Warning: could not load reservations: {exc}")
            active_res = []

        for spot in spots:
            spot_id = spot["spotId"]
            meta = meta_by_spot[spot_id]
            current = meta["status"]

            fault_simulator.tick(spot_id, now=now_mono)

            has_pending = False
            for res in active_res:
                if res["spotId"] == spot_id and res["status"] == "CONFIRMED":
                    try:
                        arrival = datetime.fromisoformat(
                            res["arrival"].replace("Z", "+00:00")
                        )
                        diff_mins = (arrival - now_ts).total_seconds() / 60.0
                        if 0 <= diff_mins <= 15:
                            has_pending = True
                            break
                    except (ValueError, TypeError):
                        pass

            next_status, reason, fault_duration = machine.next_status(
                current,
                zone=spot.get("zone"),
                current_hour=current_hour,
                time_in_state=meta["time_in_state"],
                row=spot.get("row", 0),
                col=spot.get("col", 0),
                has_pending_reservation=has_pending,
                spot_id=spot_id,
                now=now_mono,
            )

            if next_status != current:
                meta["status"] = next_status
                meta["time_in_state"] = 0

                if fault_simulator.should_emit(spot_id):
                    confidence = fault_simulator.confidence_modifier(spot_id)
                    event = build_spot_event(
                        spot=spot,
                        previous_status=current,
                        new_status=next_status,
                        reason=reason,
                        fault_duration_seconds=fault_duration,
                        confidence=confidence,
                    )
                    schedule_publish(
                        KAFKA_TOPIC,
                        spot_id,
                        event,
                        fault_simulator.get_delay(spot_id),
                        fault_simulator.should_duplicate(spot_id),
                        publisher,
                        pending_delayed,
                        now_mono,
                    )
            else:
                meta["time_in_state"] += 1

        publisher.flush()
        if SIMULATION_INTERVAL_SECONDS > 0:
            time.sleep(SIMULATION_INTERVAL_SECONDS)


def normalize_initial_status(status, zone):
    current = (status or "free").strip().lower()
    if current in ("occupied", "reserved", "out_of_service"):
        return current
    if zone == "EV":
        return "ev"
    if zone == "ACCESSIBLE":
        return "accessible"
    return "free"


if __name__ == "__main__":
    run()
