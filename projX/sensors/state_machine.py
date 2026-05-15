import random


class SpotStateMachine:
    def __init__(self, seed=42):
        self.rng = random.Random(seed)

    def next_status(self, current_status):
        current = (current_status or "free").strip().lower()
        roll = self.rng.random()

        if current in ("ev", "accessible"):
            current = "free"

        if current == "free":
            if roll < 0.72:
                return "free", "stable_free"
            if roll < 0.92:
                return "occupies", "vehicle_entered"
            if roll < 0.97:
                return "reserved", "reservation_started"
            return "out_of_service", "temporary_failure"

        if current == "occupied":
            if roll < 0.62:
                return "occupied", "still_occupied"
            if roll < 0.88:
                return "free", "vehicle_left"
            if roll < 0.95:
                return "out_of_service", "fault_detected"

        if current == "reserved":
            if roll < 0.55:
                return "reserved", "reservation_holds"
            if roll < 0.85:
                return "occupied", "reserved_vehicle_arrived"
            if roll < 0.95:
                return "free", "reservation_expired"
            return "out_of_service", "fault_detected"

        if current == "out_of_service":
            if roll < 0.70:
                return "out_of_service", "still_faulty"
            return "free", "recovered"

        return "free", "reset"
