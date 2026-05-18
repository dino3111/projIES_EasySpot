import time
from datetime import datetime, timezone

from config import KAFKA_TOPIC, SIMULATION_INTERVAL_SECONDS, SIMULATION_SEED
from context_loader import load_reservations, load_spots
from event_builder import build_spot_event
from kafka_publisher import KafkaPublisher
from state_machine import SpotStateMachine


def run():
    spots = load_spots()
    if not spots:
        raise RuntimeError("No parking spots returned by backend context endpoint")
    publisher = KafkaPublisher()
    machine = SpotStateMachine(seed=SIMULATION_SEED)

    # State metadata: status, time_in_state (ticks), target_repair_ticks
    meta_by_spot = {
        spot["spotId"]: {
            "status": normalize_initial_status(spot["status"], spot["zone"]),
            "time_in_state": 0,
            "target_repair_ticks": None,
        }
        for spot in spots
    }

    print(f"Loaded {len(spots)} spots")

    while True:
        current_hour = datetime.now().hour
        now_ts = datetime.now(timezone.utc)

        # Load active reservations to check for pending ones
        try:
            active_res = load_reservations()
        except Exception as exc:
            print(f"Warning: could not load reservations: {exc}")
            active_res = []

        for spot in spots:
            spot_id = spot["spotId"]
            meta = meta_by_spot[spot_id]
            current = meta["status"]

            # MTTR Logic: Overrides state machine if repair is still in progress
            if current == "out_of_service":
                if meta["target_repair_ticks"] is None:
                    # Set a repair time between 2 and 8 hours (7200 to 28800 ticks)
                    meta["target_repair_ticks"] = machine.rng.randint(7200, 28800)

                if meta["time_in_state"] < meta["target_repair_ticks"]:
                    # Still repairing, skip state machine
                    meta["time_in_state"] += 1
                    continue
                else:
                    # Repair finished, force recovery
                    next_status, reason = "free", "repair_completed"
            else:
                meta["target_repair_ticks"] = None

                # Check for reservations starting in the next 15 minutes
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

                next_status, reason = machine.next_status(
                    current,
                    zone=spot.get("zone"),
                    current_hour=current_hour,
                    time_in_state=meta["time_in_state"],
                    row=spot.get("row", 0),
                    col=spot.get("col", 0),
                    has_pending_reservation=has_pending,
                )

            if next_status != current:
                meta["status"] = next_status
                meta["time_in_state"] = 0

                event = build_spot_event(
                    spot=spot,
                    previous_status=current,
                    new_status=next_status,
                    reason=reason,
                )
                publisher.publish(KAFKA_TOPIC, spot_id, event)
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
        return "free"
    if zone == "ACCESSIBLE":
        return "free"
    return "free"


if __name__ == "__main__":
    run()
