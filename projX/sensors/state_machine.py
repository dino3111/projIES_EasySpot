import random
import time


class SpotStateMachine:
    def __init__(
        self,
        seed=42,
        fault_min_duration=30.0,
        fault_max_duration=300.0,
        technician_repair_probability=0.3,
    ):
        self.rng = random.Random(seed)
        self.fault_min_duration = fault_min_duration
        self.fault_max_duration = fault_max_duration
        self.technician_repair_probability = technician_repair_probability
        self._fault_start: dict[str, float] = {}

    def next_status(self, spot_id, current_status, now=None):
        """
        Returns (new_status, reason, fault_duration_seconds).
        fault_duration_seconds is None for non-recovery transitions.
        reason is 'AUTO_RECOVERY' or 'TECHNICIAN_REPAIR' when recovering.
        """
        if now is None:
            now = time.monotonic()

        current = (current_status or "free").strip().lower()
        roll = self.rng.random()

        if current in ("ev", "accessible"):
            current = "free"

        if current == "free":
            if roll < 0.72:
                return "free", "stable_free", None
            if roll < 0.92:
                return "occupied", "vehicle_entered", None
            if roll < 0.97:
                return "reserved", "reservation_started", None
            self._fault_start[spot_id] = now
            return "out_of_service", "temporary_failure", None

        if current == "occupied":
            if roll < 0.62:
                return "occupied", "still_occupied", None
            if roll < 0.88:
                return "free", "vehicle_left", None
            if roll < 0.95:
                self._fault_start[spot_id] = now
                return "out_of_service", "fault_detected", None

        if current == "reserved":
            if roll < 0.55:
                return "reserved", "reservation_holds", None
            if roll < 0.85:
                return "occupied", "reserved_vehicle_arrived", None
            if roll < 0.95:
                return "free", "reservation_expired", None
            self._fault_start[spot_id] = now
            return "out_of_service", "fault_detected", None

        if current == "out_of_service":
            fault_start = self._fault_start.get(spot_id)
            fault_duration = (now - fault_start) if fault_start is not None else 0.0

            if fault_duration < self.fault_min_duration:
                return "out_of_service", "still_faulty", None

            # Guaranteed technician repair after max duration
            if fault_duration >= self.fault_max_duration:
                self._fault_start.pop(spot_id, None)
                return "free", "TECHNICIAN_REPAIR", fault_duration

            if roll < 0.70:
                return "out_of_service", "still_faulty", None

            recovery_type = (
                "TECHNICIAN_REPAIR"
                if self.rng.random() < self.technician_repair_probability
                else "AUTO_RECOVERY"
            )
            self._fault_start.pop(spot_id, None)
            return "free", recovery_type, fault_duration

        return "free", "reset", None
