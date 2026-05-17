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

    # Base case, hour 11 (normal daytime, multiplier 1.0, 1.0)
    test_machine.next_status("free", current_hour=11)
    base_transitions = {
        status: prob for status, _, prob in test_machine.last_transitions
    }

    # Morning peak, hour 9 (entry mult 2.5)
    test_machine.next_status("free", current_hour=9)
    morning_transitions = {
        status: prob for status, _, prob in test_machine.last_transitions
    }

    assert morning_transitions["occupied"] == base_transitions["occupied"] * 2.5
    assert morning_transitions["reserved"] == base_transitions["reserved"] * 2.5

    # Check occupied to free during evening peak, hour 18 (exit mult 2.5)
    test_machine.next_status("occupied", current_hour=11)
    base_occ_transitions = {
        status: prob for status, _, prob in test_machine.last_transitions
    }

    test_machine.next_status("occupied", current_hour=18)
    evening_occ_transitions = {
        status: prob for status, _, prob in test_machine.last_transitions
    }

    assert evening_occ_transitions["free"] == base_occ_transitions["free"] * 2.5
