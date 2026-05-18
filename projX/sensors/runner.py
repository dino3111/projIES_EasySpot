import time

from config import (
    FAULT_MAX_DURATION_SECONDS,
    FAULT_MIN_DURATION_SECONDS,
    KAFKA_TOPIC,
    SIMULATION_INTERVAL_SECONDS,
    SIMULATION_SEED,
    TECHNICIAN_REPAIR_PROBABILITY,
)
from context_loader import load_spots
from event_builder import build_spot_event
from kafka_publisher import KafkaPublisher
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

    state_by_spot = {
        spot["spotId"]: normalize_initial_status(spot["status"], spot["zone"])
        for spot in spots
    }

    print(f"Loaded {len(spots)} spots")

    while True:
        for spot in spots:
            spot_id = spot["spotId"]
            current = state_by_spot[spot_id]
            next_status, reason, fault_duration = machine.next_status(spot_id, current)

            if next_status != current:
                state_by_spot[spot_id] = next_status

                event = build_spot_event(
                    spot=spot,
                    previous_status=current,
                    new_status=next_status,
                    reason=reason,
                    fault_duration_seconds=fault_duration,
                )
                publisher.publish(KAFKA_TOPIC, spot_id, event)

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
