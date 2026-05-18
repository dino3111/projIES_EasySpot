import random


class SpotStateMachine:
    def __init__(self, seed=42, transition_probs=None):
        self.rng = random.Random(seed)
        self.transition_probs = transition_probs or self._default_transition_probs()

    def _get_time_multipliers(self, current_hour):
        if current_hour is None:
            return 1.0, 1.0  # entry_mult, exit_mult

        if 8 <= current_hour <= 10:
            return 2.5, 0.5  # Morning peak: high entry, low exit
        elif 12 <= current_hour <= 14:
            return 1.5, 1.5  # Lunch: high turnover
        elif 17 <= current_hour <= 19:
            return 0.5, 2.5  # Evening peak: low entry, high exit
        elif 22 <= current_hour or current_hour <= 6:
            return 0.1, 0.1  # Night: very low activity
        else:
            return 1.0, 1.0  # Normal daytime

    def next_status(
        self,
        current_status,
        zone="STANDARD",
        current_hour=None,
        time_in_state=0,
        row=0,
        col=0,
        has_pending_reservation=False,
    ):
        current = (current_status or "free").strip().lower()

        if current in ("ev", "accessible"):
            current = "free"

        # MTTR Logic: Deterministic recovery if repair time is reached
        # handled by the runner or here if we pass a special flag.
        # For now, let's stick to probability but with a high boost if aging.

        transitions = self.transition_probs.get(current)
        if not transitions:
            return "free", "reset"

        entry_mult, exit_mult = self._get_time_multipliers(current_hour)

        # 3. Hotspots & Spatial Preference
        # Preference for spots near (0,0). Max boost of 2.0x, decaying with distance.
        distance = (row**2 + col**2) ** 0.5
        spatial_mult = max(1.0, 2.0 / (1.0 + 0.1 * distance))
        if current == "free":
            entry_mult *= spatial_mult

        # 2. State Aging (Occupied -> Free)
        # 15 mins = 900 ticks. Sigmoid-like boost to exit_mult.
        if current == "occupied":
            # Probability is very low for first 5 mins, normal at
            # 15 mins, high after 30 mins.
            aging_factor = 1.0 / (1.0 + pow(2.718, -(time_in_state - 900) / 300.0))
            exit_mult *= max(0.01, aging_factor * 2.0)

        # 4. Reservation Integration
        if current == "free" and has_pending_reservation:
            # Force reservation status
            return "reserved", "reservation_triggered_by_backend"

        adjusted_transitions = []
        for status, reason, probability in transitions:
            adj_prob = probability

            # Temporal & Logic adjustments
            if current == "free" and status in ("occupied", "reserved"):
                adj_prob *= entry_mult
            elif current == "occupied" and status == "free":
                adj_prob *= exit_mult
            elif current == "reserved" and status == "occupied":
                # reserved spots have high arrival probability
                adj_prob *= entry_mult * 2.0

            # Zone adjustments
            if (
                (zone or "").strip().upper() in ("EV", "ACCESSIBLE")
                and current == "free"
                and status == "reserved"
            ):
                adj_prob *= 0.4

            adjusted_transitions.append((status, reason, adj_prob))

        next_status = self._weighted_choice(adjusted_transitions)
        for status, reason, _ in adjusted_transitions:
            if status == next_status:
                return status, reason
        return next_status, "state_changed"

    def _weighted_choice(self, transitions):
        roll = self.rng.random()
        cumulative = 0.0
        for status, _, probability in transitions:
            cumulative += max(0.0, probability)
            if roll < cumulative:
                return status
        return transitions[-1][0]

    def _default_transition_probs(self):
        from config import (
            P_FREE_TO_FREE,
            P_FREE_TO_OCCUPIED,
            P_FREE_TO_OUT_OF_SERVICE,
            P_FREE_TO_RESERVED,
            P_OCCUPIED_TO_FREE,
            P_OCCUPIED_TO_OCCUPIED,
            P_OCCUPIED_TO_OUT_OF_SERVICE,
            P_OUT_OF_SERVICE_TO_FREE,
            P_OUT_OF_SERVICE_TO_OUT_OF_SERVICE,
            P_RESERVED_TO_FREE,
            P_RESERVED_TO_OCCUPIED,
            P_RESERVED_TO_OUT_OF_SERVICE,
            P_RESERVED_TO_RESERVED,
        )

        return {
            "free": [
                ("free", "stable_free", P_FREE_TO_FREE),
                ("occupied", "vehicle_entered", P_FREE_TO_OCCUPIED),
                ("reserved", "reservation_started", P_FREE_TO_RESERVED),
                ("out_of_service", "temporary_failure", P_FREE_TO_OUT_OF_SERVICE),
            ],
            "occupied": [
                ("occupied", "still_occupied", P_OCCUPIED_TO_OCCUPIED),
                ("free", "vehicle_left", P_OCCUPIED_TO_FREE),
                ("out_of_service", "fault_detected", P_OCCUPIED_TO_OUT_OF_SERVICE),
            ],
            "reserved": [
                ("reserved", "reservation_holds", P_RESERVED_TO_RESERVED),
                ("occupied", "reserved_vehicle_arrived", P_RESERVED_TO_OCCUPIED),
                ("free", "reservation_expired", P_RESERVED_TO_FREE),
                ("out_of_service", "fault_detected", P_RESERVED_TO_OUT_OF_SERVICE),
            ],
            "out_of_service": [
                ("out_of_service", "still_faulty", P_OUT_OF_SERVICE_TO_OUT_OF_SERVICE),
                ("free", "recovered", P_OUT_OF_SERVICE_TO_FREE),
            ],
        }
