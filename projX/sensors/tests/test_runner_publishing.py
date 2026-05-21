# isort: skip_file
import sys
import unittest

sys.path.insert(0, ".")

from publishing import (  # noqa: E402
    NetworkFaultInjector,
    flush_pending,
    schedule_publish,
)
from sensor_fault_simulator import SensorFaultSimulator, SensorState  # noqa: E402

TOPIC = "parking-spot-events"


class _MockPublisher:
    def __init__(self):
        self.calls = []

    def publish(self, topic, key, event):
        self.calls.append((topic, key, event))


def _event(label="evt"):
    return {"eventId": label}


class FlushPendingTests(unittest.TestCase):
    def test_due_event_is_published(self):
        pub = _MockPublisher()
        evt = _event()
        pending = [(evt, "s1", 10.0)]
        result = flush_pending(pending, pub, TOPIC, now_mono=20.0)
        self.assertEqual(len(pub.calls), 1)
        self.assertEqual(pub.calls[0], (TOPIC, "s1", evt))
        self.assertEqual(result, [])

    def test_future_event_stays_pending(self):
        pub = _MockPublisher()
        evt = _event()
        pending = [(evt, "s1", 100.0)]
        result = flush_pending(pending, pub, TOPIC, now_mono=20.0)
        self.assertEqual(pub.calls, [])
        self.assertEqual(len(result), 1)

    def test_mixed_events_split_correctly(self):
        pub = _MockPublisher()
        e1, e2, e3 = _event("a"), _event("b"), _event("c")
        pending = [(e1, "s1", 5.0), (e2, "s2", 50.0), (e3, "s3", 8.0)]
        result = flush_pending(pending, pub, TOPIC, now_mono=10.0)
        published_events = [c[2] for c in pub.calls]
        self.assertIn(e1, published_events)
        self.assertIn(e3, published_events)
        self.assertNotIn(e2, published_events)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0][1], "s2")

    def test_empty_pending_is_a_noop(self):
        pub = _MockPublisher()
        result = flush_pending([], pub, TOPIC, now_mono=0.0)
        self.assertEqual(pub.calls, [])
        self.assertEqual(result, [])


class SchedulePublishImmediateTests(unittest.TestCase):
    def test_no_delay_no_dup_publishes_once(self):
        pub = _MockPublisher()
        pending = []
        schedule_publish(TOPIC, "s1", _event(), 0, False, pub, pending, 0.0)
        self.assertEqual(len(pub.calls), 1)
        self.assertEqual(pending, [])

    def test_no_delay_with_dup_publishes_twice(self):
        pub = _MockPublisher()
        pending = []
        schedule_publish(TOPIC, "s1", _event(), 0, True, pub, pending, 0.0)
        self.assertEqual(len(pub.calls), 2)
        self.assertEqual(pending, [])

    def test_no_delay_both_publishes_are_same_event(self):
        pub = _MockPublisher()
        pending = []
        evt = _event("x")
        schedule_publish(TOPIC, "s1", evt, 0, True, pub, pending, 0.0)
        self.assertIs(pub.calls[0][2], evt)
        self.assertIs(pub.calls[1][2], evt)


class SchedulePublishDelayedTests(unittest.TestCase):
    def test_delay_queues_to_pending_not_published(self):
        pub = _MockPublisher()
        pending = []
        schedule_publish(TOPIC, "s1", _event(), 5.0, False, pub, pending, 100.0)
        self.assertEqual(pub.calls, [])
        self.assertEqual(len(pending), 1)

    def test_delay_sets_correct_publish_time(self):
        pub = _MockPublisher()
        pending = []
        schedule_publish(TOPIC, "s1", _event(), 5.0, False, pub, pending, 100.0)
        _, _, publish_at = pending[0]
        self.assertAlmostEqual(publish_at, 105.0, places=5)

    def test_delay_with_dup_queues_both_to_pending(self):
        pub = _MockPublisher()
        pending = []
        schedule_publish(TOPIC, "s1", _event(), 5.0, True, pub, pending, 100.0)
        self.assertEqual(pub.calls, [])
        self.assertEqual(len(pending), 2)

    def test_delay_with_dup_both_have_same_publish_time(self):
        """Duplicate must not arrive before the original it copies."""
        pub = _MockPublisher()
        pending = []
        schedule_publish(TOPIC, "s1", _event(), 5.0, True, pub, pending, 100.0)
        t1 = pending[0][2]
        t2 = pending[1][2]
        self.assertEqual(t1, t2)

    def test_delayed_events_published_after_flush(self):
        pub = _MockPublisher()
        pending = []
        evt = _event()
        schedule_publish(TOPIC, "s1", evt, 5.0, False, pub, pending, 100.0)
        self.assertEqual(pub.calls, [])
        flush_pending(pending, pub, TOPIC, now_mono=106.0)
        self.assertEqual(len(pub.calls), 1)
        self.assertEqual(pub.calls[0][2], evt)


class OfflineSensorSuppressesPublishTests(unittest.TestCase):
    def test_offline_sensor_should_emit_false(self):
        sim = SensorFaultSimulator(seed=42)
        sim.force_state("spot-abc", SensorState.OFFLINE, now=0.0)
        self.assertFalse(sim.should_emit("spot-abc"))

    def test_no_publish_when_should_emit_false(self):
        pub = _MockPublisher()
        pending = []
        sim = SensorFaultSimulator(seed=42)
        sim.force_state("spot-abc", SensorState.OFFLINE, now=0.0)

        if sim.should_emit("spot-abc"):
            schedule_publish(TOPIC, "spot-abc", _event(), 0, False, pub, pending, 0.0)

        self.assertEqual(pub.calls, [])
        self.assertEqual(pending, [])


class NetworkFaultInjectorTests(unittest.TestCase):
    def test_out_of_order_reorders_due_events(self):
        pub = _MockPublisher()
        pending = [
            ({"eventId": "1"}, "s1", 0.0),
            ({"eventId": "2"}, "s2", 0.0),
            ({"eventId": "3"}, "s3", 0.0),
        ]
        faults = NetworkFaultInjector(seed=1, out_of_order_probability=1.0)
        flush_pending(pending, pub, TOPIC, now_mono=1.0, network_faults=faults)
        order = [c[2]["eventId"] for c in pub.calls]
        self.assertNotEqual(order, ["1", "2", "3"])

    def test_drop_burst_temporarily_loses_signal(self):
        faults = NetworkFaultInjector(
            seed=2,
            drop_probability=0.0,
            drop_burst_min_seconds=5.0,
            drop_burst_max_seconds=5.0,
        )
        faults._drop_until["spot-1"] = 15.0
        self.assertTrue(faults.should_drop("spot-1", 10.0))
        self.assertTrue(faults.should_drop("spot-1", 12.0))
        self.assertFalse(faults.should_drop("spot-1", 16.0))


class SensorIdCollisionTests(unittest.TestCase):
    def test_full_spot_id_key_never_collides(self):
        """Using full UUID as key means distinct spots never share simulator state."""
        sim = SensorFaultSimulator(seed=42)
        id_a = "00000000-0000-0000-0000-000000000001"
        id_b = "00000000-0000-0000-0000-000000000002"
        sim.force_state(id_a, SensorState.OFFLINE, now=0.0)
        self.assertEqual(sim.get_state(id_a), SensorState.OFFLINE)
        self.assertEqual(sim.get_state(id_b), SensorState.OPERATIONAL)

    def test_truncated_ids_would_collide_but_full_ids_do_not(self):
        """
        Two UUIDs that differ only beyond char 16 (after dash removal) would map
        to the same truncated sensor ID, but using the full UUID avoids the problem.
        """
        id_a = "12345678-1234-1234-1234-aaaaaaaaaaaa"
        id_b = "12345678-1234-1234-1234-bbbbbbbbbbbb"
        truncated_a = "IR-" + id_a.replace("-", "")[:16]
        truncated_b = "IR-" + id_b.replace("-", "")[:16]
        self.assertEqual(truncated_a, truncated_b)

        sim = SensorFaultSimulator(seed=42)
        sim.force_state(id_a, SensorState.OFFLINE, now=0.0)
        self.assertEqual(sim.get_state(id_a), SensorState.OFFLINE)
        self.assertEqual(sim.get_state(id_b), SensorState.OPERATIONAL)


if __name__ == "__main__":
    unittest.main()
