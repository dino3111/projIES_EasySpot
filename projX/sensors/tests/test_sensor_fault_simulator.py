# isort: skip_file
import sys
import unittest

sys.path.insert(0, ".")

from sensor_fault_simulator import SensorFaultSimulator, SensorState  # noqa: E402


class SensorStateDefaultTests(unittest.TestCase):
    def test_new_sensor_is_operational(self):
        sim = SensorFaultSimulator(seed=42)
        self.assertEqual(sim.get_state("s1"), SensorState.OPERATIONAL)

    def test_operational_sensor_emits(self):
        sim = SensorFaultSimulator(seed=42)
        self.assertTrue(sim.should_emit("s1"))

    def test_tick_returns_state(self):
        sim = SensorFaultSimulator(
            seed=42,
            offline_probability=0.0,
            degraded_probability=0.0,
            maintenance_probability=0.0,
        )
        state = sim.tick("s1", now=0.0)
        self.assertEqual(state, SensorState.OPERATIONAL)


class SensorFaultTransitionTests(unittest.TestCase):
    def test_force_offline_suppresses_emit(self):
        sim = SensorFaultSimulator(seed=42)
        sim.force_state("s1", SensorState.OFFLINE, now=0.0)
        self.assertFalse(sim.should_emit("s1"))

    def test_force_maintenance_suppresses_emit(self):
        sim = SensorFaultSimulator(seed=42)
        sim.force_state("s1", SensorState.MAINTENANCE, now=0.0)
        self.assertFalse(sim.should_emit("s1"))

    def test_force_degraded_still_emits(self):
        sim = SensorFaultSimulator(seed=42)
        sim.force_state("s1", SensorState.DEGRADED, now=0.0)
        self.assertTrue(sim.should_emit("s1"))

    def test_offline_cannot_recover_before_min_duration(self):
        sim = SensorFaultSimulator(
            seed=99, fault_min_duration=100.0, recovery_probability=1.0
        )
        sim.force_state("s1", SensorState.OFFLINE, now=0.0)
        for _ in range(20):
            state = sim.tick("s1", now=50.0)
            self.assertEqual(state, SensorState.OFFLINE)

    def test_offline_recovers_after_max_duration(self):
        sim = SensorFaultSimulator(
            seed=42, fault_min_duration=10.0, fault_max_duration=100.0
        )
        sim.force_state("s1", SensorState.OFFLINE, now=0.0)
        state = sim.tick("s1", now=200.0)
        self.assertEqual(state, SensorState.OPERATIONAL)

    def test_maintenance_cannot_recover_before_min_duration(self):
        sim = SensorFaultSimulator(
            seed=99, fault_min_duration=100.0, recovery_probability=1.0
        )
        sim.force_state("s1", SensorState.MAINTENANCE, now=0.0)
        for _ in range(20):
            state = sim.tick("s1", now=50.0)
            self.assertEqual(state, SensorState.MAINTENANCE)

    def test_maintenance_recovers_after_max_duration(self):
        sim = SensorFaultSimulator(
            seed=42, fault_min_duration=10.0, fault_max_duration=100.0
        )
        sim.force_state("s1", SensorState.MAINTENANCE, now=0.0)
        state = sim.tick("s1", now=200.0)
        self.assertEqual(state, SensorState.OPERATIONAL)

    def test_degraded_recovers_after_max_duration(self):
        sim = SensorFaultSimulator(
            seed=42, fault_min_duration=10.0, fault_max_duration=100.0
        )
        sim.force_state("s1", SensorState.DEGRADED, now=0.0)
        state = sim.tick("s1", now=200.0)
        self.assertEqual(state, SensorState.OPERATIONAL)

    def test_operational_can_fault_with_high_probability(self):
        sim = SensorFaultSimulator(seed=7, offline_probability=1.0)
        state = sim.tick("s1", now=0.0)
        self.assertEqual(state, SensorState.OFFLINE)

    def test_offline_recovery_clears_fault_start(self):
        sim = SensorFaultSimulator(
            seed=42, fault_min_duration=0.0, fault_max_duration=10.0
        )
        sim.force_state("s1", SensorState.OFFLINE, now=0.0)
        sim.tick("s1", now=50.0)
        self.assertNotIn("s1", sim._fault_start)

    def test_multiple_sensors_tracked_independently(self):
        sim = SensorFaultSimulator(seed=42, fault_min_duration=100.0)
        sim.force_state("s1", SensorState.OFFLINE, now=0.0)
        sim.force_state("s2", SensorState.OPERATIONAL, now=0.0)
        state_s1 = sim.tick("s1", now=50.0)
        state_s2 = sim.get_state("s2")
        self.assertEqual(state_s1, SensorState.OFFLINE)
        self.assertEqual(state_s2, SensorState.OPERATIONAL)


class SensorConfidenceTests(unittest.TestCase):
    def test_operational_confidence_is_none(self):
        sim = SensorFaultSimulator(seed=42)
        self.assertIsNone(sim.confidence_modifier("s1"))

    def test_degraded_confidence_is_float_in_range(self):
        sim = SensorFaultSimulator(seed=42)
        sim.force_state("s1", SensorState.DEGRADED, now=0.0)
        for _ in range(10):
            conf = sim.confidence_modifier("s1")
            self.assertIsNotNone(conf)
            self.assertGreaterEqual(conf, 0.45)
            self.assertLessEqual(conf, 0.79)

    def test_offline_confidence_is_none(self):
        sim = SensorFaultSimulator(seed=42)
        sim.force_state("s1", SensorState.OFFLINE, now=0.0)
        self.assertIsNone(sim.confidence_modifier("s1"))


class SensorDuplicateTests(unittest.TestCase):
    def test_operational_never_duplicates(self):
        sim = SensorFaultSimulator(seed=42, duplicate_probability=1.0)
        self.assertFalse(sim.should_duplicate("s1"))

    def test_offline_never_duplicates(self):
        sim = SensorFaultSimulator(seed=42, duplicate_probability=1.0)
        sim.force_state("s1", SensorState.OFFLINE, now=0.0)
        self.assertFalse(sim.should_duplicate("s1"))

    def test_degraded_duplicates_with_high_probability(self):
        sim = SensorFaultSimulator(seed=42, duplicate_probability=1.0)
        sim.force_state("s1", SensorState.DEGRADED, now=0.0)
        self.assertTrue(sim.should_duplicate("s1"))

    def test_degraded_no_duplicate_when_probability_zero(self):
        sim = SensorFaultSimulator(seed=42, duplicate_probability=0.0)
        sim.force_state("s1", SensorState.DEGRADED, now=0.0)
        self.assertFalse(sim.should_duplicate("s1"))


class SensorDelayTests(unittest.TestCase):
    def test_operational_has_no_delay(self):
        sim = SensorFaultSimulator(
            seed=42, delay_probability=1.0, delay_max_seconds=10.0
        )
        self.assertEqual(sim.get_delay("s1"), 0.0)

    def test_offline_has_no_delay(self):
        sim = SensorFaultSimulator(
            seed=42, delay_probability=1.0, delay_max_seconds=10.0
        )
        sim.force_state("s1", SensorState.OFFLINE, now=0.0)
        self.assertEqual(sim.get_delay("s1"), 0.0)

    def test_degraded_can_have_delay(self):
        sim = SensorFaultSimulator(
            seed=42, delay_probability=1.0, delay_max_seconds=10.0
        )
        sim.force_state("s1", SensorState.DEGRADED, now=0.0)
        delay = sim.get_delay("s1")
        self.assertGreater(delay, 0.0)
        self.assertLessEqual(delay, 10.0)

    def test_degraded_no_delay_when_probability_zero(self):
        sim = SensorFaultSimulator(
            seed=42, delay_probability=0.0, delay_max_seconds=10.0
        )
        sim.force_state("s1", SensorState.DEGRADED, now=0.0)
        self.assertEqual(sim.get_delay("s1"), 0.0)


class SensorHistoryTests(unittest.TestCase):
    def test_history_empty_for_new_sensor(self):
        sim = SensorFaultSimulator(seed=42)
        self.assertEqual(sim.get_history("s1"), [])

    def test_history_records_transitions(self):
        sim = SensorFaultSimulator(seed=42)
        sim.force_state("s1", SensorState.OFFLINE, now=0.0)
        sim.force_state("s1", SensorState.OPERATIONAL, now=100.0)
        history = sim.get_history("s1")
        self.assertEqual(len(history), 2)
        self.assertEqual(history[0].state, SensorState.OFFLINE)
        self.assertEqual(history[1].state, SensorState.OPERATIONAL)

    def test_history_bounded_by_history_size(self):
        sim = SensorFaultSimulator(seed=42, history_size=3)
        for i in range(10):
            state = SensorState.OFFLINE if i % 2 == 0 else SensorState.OPERATIONAL
            sim.force_state("s1", state, now=float(i))
        self.assertLessEqual(len(sim.get_history("s1")), 3)

    def test_history_entry_has_reason(self):
        sim = SensorFaultSimulator(seed=42)
        sim.force_state("s1", SensorState.DEGRADED, now=0.0)
        entry = sim.get_history("s1")[0]
        self.assertIn("DEGRADED", entry.reason)

    def test_history_independent_per_sensor(self):
        sim = SensorFaultSimulator(seed=42)
        sim.force_state("s1", SensorState.OFFLINE, now=0.0)
        self.assertEqual(sim.get_history("s2"), [])


class SensorForceStateTests(unittest.TestCase):
    def test_force_state_overrides_current(self):
        sim = SensorFaultSimulator(seed=42)
        sim.force_state("s1", SensorState.MAINTENANCE, now=0.0)
        self.assertEqual(sim.get_state("s1"), SensorState.MAINTENANCE)

    def test_force_operational_clears_fault_start(self):
        sim = SensorFaultSimulator(seed=42)
        sim.force_state("s1", SensorState.OFFLINE, now=0.0)
        sim.force_state("s1", SensorState.OPERATIONAL, now=100.0)
        self.assertNotIn("s1", sim._fault_start)

    def test_force_offline_sets_fault_start(self):
        sim = SensorFaultSimulator(seed=42)
        sim.force_state("s1", SensorState.OFFLINE, now=42.0)
        self.assertAlmostEqual(sim._fault_start["s1"], 42.0, places=3)


class SensorDegradedEscalationTests(unittest.TestCase):
    def test_degraded_can_escalate_to_offline(self):
        sim = SensorFaultSimulator(
            seed=42,
            offline_probability=1.0,
            fault_min_duration=0.0,
            fault_max_duration=1000.0,
            recovery_probability=0.0,
        )
        sim.force_state("s1", SensorState.DEGRADED, now=0.0)
        state = sim.tick("s1", now=500.0)
        self.assertEqual(state, SensorState.OFFLINE)

    def test_degraded_recovers_probabilistically(self):
        sim = SensorFaultSimulator(
            seed=1,
            offline_probability=0.0,
            fault_min_duration=0.0,
            fault_max_duration=1000.0,
            recovery_probability=1.0,
        )
        sim.force_state("s1", SensorState.DEGRADED, now=0.0)
        state = sim.tick("s1", now=100.0)
        self.assertEqual(state, SensorState.OPERATIONAL)


if __name__ == "__main__":
    unittest.main()
