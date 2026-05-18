import math

from state_machine import SpotStateMachine


def test_time_multipliers_morning_peak():
    machine = SpotStateMachine()
    entry_mult, exit_mult = machine._get_time_multipliers(9)
    assert entry_mult == 2.5
    assert exit_mult == 0.5


def test_time_multipliers_lunch_turnover():
    machine = SpotStateMachine()
    entry_mult, exit_mult = machine._get_time_multipliers(13)
    assert entry_mult == 1.5
    assert exit_mult == 1.5


def test_time_multipliers_evening_peak():
    machine = SpotStateMachine()
    entry_mult, exit_mult = machine._get_time_multipliers(18)
    assert entry_mult == 0.5
    assert exit_mult == 2.5


def test_time_multipliers_night():
    machine = SpotStateMachine()
    entry_mult, exit_mult = machine._get_time_multipliers(3)
    assert entry_mult == 0.1
    assert exit_mult == 0.1

    entry_mult, exit_mult = machine._get_time_multipliers(23)
    assert entry_mult == 0.1
    assert exit_mult == 0.1


def test_time_multipliers_normal_daytime():
    machine = SpotStateMachine()
    entry_mult, exit_mult = machine._get_time_multipliers(11)
    assert entry_mult == 1.0
    assert exit_mult == 1.0


def test_time_multipliers_none_hour():
    machine = SpotStateMachine()
    entry_mult, exit_mult = machine._get_time_multipliers(None)
    assert entry_mult == 1.0
    assert exit_mult == 1.0


def test_next_status_temporal_adjustment():
    class TestMachine(SpotStateMachine):
        def __init__(self):
            super().__init__()
            self.last_transitions = []

        def _weighted_choice(self, transitions):
            self.last_transitions = transitions
            return super()._weighted_choice(transitions)

    test_machine = TestMachine()

    # Base case, hour 11, time_in_state=900 (aging factor 1.0),
    # row=10, col=10 (low hotspot)
    test_machine.next_status("free", current_hour=11, time_in_state=900, row=10, col=10)
    base_transitions = {
        status: prob for status, _, prob in test_machine.last_transitions
    }

    # Morning peak, hour 9 (entry mult 2.5)
    test_machine.next_status("free", current_hour=9, time_in_state=900, row=10, col=10)
    morning_transitions = {
        status: prob for status, _, prob in test_machine.last_transitions
    }

    assert math.isclose(
        morning_transitions["occupied"], base_transitions["occupied"] * 2.5
    )

    # Check occupied to free during evening peak,
    # hour 18 (exit mult 2.5)
    test_machine.next_status("occupied", current_hour=11, time_in_state=900)
    base_occ_transitions = {
        status: prob for status, _, prob in test_machine.last_transitions
    }

    test_machine.next_status("occupied", current_hour=18, time_in_state=900)
    evening_occ_transitions = {
        status: prob for status, _, prob in test_machine.last_transitions
    }

    assert math.isclose(
        evening_occ_transitions["free"], base_occ_transitions["free"] * 2.5
    )


def test_hotspot_effect():
    class TestMachine(SpotStateMachine):
        def __init__(self):
            super().__init__()
            self.last_transitions = []

        def _weighted_choice(self, transitions):
            self.last_transitions = transitions
            return super()._weighted_choice(transitions)

    machine = TestMachine()
    # Near entrance (0,0)
    machine.next_status("free", row=0, col=0, current_hour=11)
    near_prob = next(p for s, r, p in machine.last_transitions if s == "occupied")

    # Far away (20,20)
    machine.next_status("free", row=20, col=20, current_hour=11)
    far_prob = next(p for s, r, p in machine.last_transitions if s == "occupied")

    assert near_prob > far_prob


def test_state_aging_effect():
    class TestMachine(SpotStateMachine):
        def __init__(self):
            super().__init__()
            self.last_transitions = []

        def _weighted_choice(self, transitions):
            self.last_transitions = transitions
            return super()._weighted_choice(transitions)

    machine = TestMachine()
    # Just parked
    machine.next_status("occupied", time_in_state=10, current_hour=11)
    newly_parked_exit_prob = next(
        p for s, r, p in machine.last_transitions if s == "free"
    )

    # Parked for long time (30 mins = 1800 ticks)
    machine.next_status("occupied", time_in_state=1800, current_hour=11)
    long_parked_exit_prob = next(
        p for s, r, p in machine.last_transitions if s == "free"
    )

    assert long_parked_exit_prob > newly_parked_exit_prob


def test_reservation_integration():
    machine = SpotStateMachine()
    status, reason = machine.next_status("free", has_pending_reservation=True)
    assert status == "reserved"
    assert "backend" in reason
