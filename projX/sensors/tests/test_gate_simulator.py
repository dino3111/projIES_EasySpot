# isort: skip_file
import sys
import unittest

sys.path.insert(0, ".")

from gate_event_builder import (  # noqa: E402
    GateDirection,
    GateEventType,
    GateSimulator,
    GateState,
    ParkGate,
    build_gate_event,
)


def _park(park_id="park-1", park_name="Test Park"):
    return {"parkId": park_id, "parkName": park_name}


def _parks(n=3):
    return [_park(f"park-{i}", f"Park {i}") for i in range(1, n + 1)]


def _gate(direction=GateDirection.ENTRY, seed=42):
    import random
    return ParkGate(
        gate_id="gate-test-entry",
        direction=direction,
        rng=random.Random(seed),
    )


def _ocr_event(
    park_id="park-1",
    direction="entry",
    confidence=0.95,
    plate="AB-12-CD",
    event_type="ocr.plate.read",
):
    return {
        "eventId": "some-uuid",
        "eventType": event_type,
        "parkId": park_id,
        "payload": {
            "direction": direction,
            "confidence": confidence,
            "plate": plate,
        },
    }


class BuildGateEventTests(unittest.TestCase):
    def test_required_fields_present(self):
        event = build_gate_event(
            park_id="park-1",
            park_name="Park",
            gate_id="g1",
            direction=GateDirection.ENTRY,
            event_type=GateEventType.GATE_OPENED,
            state=GateState.OPEN,
            previous_state=GateState.CLOSED,
            reason="test",
        )
        self.assertEqual(event["eventType"], "gate.opened")
        self.assertEqual(event["parkId"], "park-1")
        self.assertEqual(event["payload"]["state"], "OPEN")
        self.assertEqual(event["payload"]["previousState"], "CLOSED")
        self.assertEqual(event["payload"]["direction"], "entry")
        self.assertIn("occurredAt", event)
        self.assertEqual(event["version"], 1)

    def test_plate_included_when_provided(self):
        event = build_gate_event(
            park_id="park-1",
            park_name="Park",
            gate_id="g1",
            direction=GateDirection.EXIT,
            event_type=GateEventType.GATE_OPENED,
            state=GateState.OPEN,
            previous_state=GateState.CLOSED,
            reason="valid_ocr_read",
            plate="AB-12-CD",
        )
        self.assertEqual(event["payload"]["plate"], "AB-12-CD")

    def test_plate_absent_when_not_provided(self):
        event = build_gate_event(
            park_id="park-1",
            park_name="Park",
            gate_id="g1",
            direction=GateDirection.ENTRY,
            event_type=GateEventType.GATE_CLOSED,
            state=GateState.CLOSED,
            previous_state=GateState.OPEN,
            reason="auto_close_timeout",
        )
        self.assertNotIn("plate", event["payload"])


class ParkGateOpenCloseTests(unittest.TestCase):
    def test_open_from_closed(self):
        gate = _gate()
        self.assertEqual(gate.state, GateState.CLOSED)
        result = gate._try_open(plate="AB-12-CD", reason="valid_ocr_read")
        self.assertIsNotNone(result)
        self.assertEqual(gate.state, GateState.OPEN)

    def test_open_returns_none_when_already_open(self):
        gate = _gate()
        gate._try_open(plate=None, reason="test")
        result = gate._try_open(plate=None, reason="test")
        self.assertIsNone(result)

    def test_auto_close_after_ticks(self):
        import random
        gate = ParkGate("g", GateDirection.ENTRY, random.Random(1))
        gate.state = GateState.OPEN
        gate._open_ticks = 1
        events = gate.tick("park-1", "Park")
        self.assertTrue(any(e["eventType"] == "gate.closed" for e, _ in events))
        self.assertEqual(gate.state, GateState.CLOSED)

    def test_block_from_closed(self):
        gate = _gate()
        result = gate._block(plate="AB-12-CD", reason="ocr_failure")
        self.assertIsNotNone(result)
        self.assertEqual(gate.state, GateState.BLOCKED)

    def test_block_returns_none_when_fault(self):
        gate = _gate()
        gate.state = GateState.FAULT
        result = gate._block(plate=None, reason="ocr_failure")
        self.assertIsNone(result)

    def test_open_returns_none_when_fault(self):
        gate = _gate()
        gate.state = GateState.FAULT
        result = gate._try_open(plate=None, reason="valid_ocr_read")
        self.assertIsNone(result)


class ParkGateFaultRecoveryTests(unittest.TestCase):
    def test_fault_state_can_recover(self):
        import random
        gate = ParkGate("g", GateDirection.ENTRY, random.Random(99))
        gate.state = GateState.FAULT
        recovered = False
        for _ in range(50):
            events = gate.tick("park-1", "Park")
            for event, _ in events:
                if event["eventType"] == "gate.recovered":
                    recovered = True
            if recovered:
                break
        self.assertTrue(recovered, "Gate never recovered from FAULT after 50 ticks")
        self.assertEqual(gate.state, GateState.CLOSED)

    def test_fault_event_has_correct_type(self):
        import random
        # Force a fault by monkeypatching the rng to always return 0
        gate = ParkGate("g", GateDirection.ENTRY, random.Random(0))
        gate.state = GateState.CLOSED
        # inject fault directly via _transition
        event = gate._transition(
            "park-1",
            "Park",
            GateState.FAULT,
            GateEventType.GATE_FAULT,
            "hardware_fault",
        )
        self.assertEqual(event["eventType"], "gate.fault")
        self.assertEqual(gate.state, GateState.FAULT)


class GateSimulatorTests(unittest.TestCase):
    def test_each_park_has_entry_and_exit_gates(self):
        sim = GateSimulator(parks=_parks(3), seed=1)
        for park_id in ["park-1", "park-2", "park-3"]:
            states = sim.gate_states()
            self.assertIn("entry", states[park_id])
            self.assertIn("exit", states[park_id])

    def test_valid_ocr_opens_entry_gate(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        events = sim.on_ocr_event(_ocr_event("park-1", "entry", 0.95))
        self.assertEqual(len(events), 1)
        event, park_id = events[0]
        self.assertEqual(event["eventType"], "gate.opened")
        self.assertEqual(park_id, "park-1")

    def test_valid_ocr_opens_exit_gate(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        events = sim.on_ocr_event(_ocr_event("park-1", "exit", 0.90))
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0][0]["eventType"], "gate.opened")

    def test_low_confidence_ocr_blocks_gate(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        events = sim.on_ocr_event(_ocr_event("park-1", "entry", 0.55))
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0][0]["eventType"], "gate.blocked")
        self.assertEqual(sim.gate_states()["park-1"]["entry"], "BLOCKED")

    def test_ocr_failure_event_type_blocks_gate(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        events = sim.on_ocr_event(
            _ocr_event("park-1", "entry", 0.99, event_type="ocr.plate.unreadable")
        )
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0][0]["eventType"], "gate.blocked")

    def test_camera_offline_blocks_gate(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        events = sim.on_ocr_event(
            _ocr_event("park-1", "entry", 0.99, event_type="ocr.camera.offline")
        )
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0][0]["eventType"], "gate.blocked")

    def test_unknown_park_returns_no_events(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        events = sim.on_ocr_event(_ocr_event("park-999", "entry", 0.95))
        self.assertEqual(events, [])

    def test_park_id_and_park_name_patched_in_event(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        events = sim.on_ocr_event(_ocr_event("park-1", "entry", 0.95))
        event = events[0][0]
        self.assertEqual(event["parkId"], "park-1")
        self.assertEqual(event["payload"]["parkName"], "Park 1")

    def test_tick_returns_list(self):
        sim = GateSimulator(parks=_parks(3), seed=42)
        result = sim.tick()
        self.assertIsInstance(result, list)

    def test_tick_events_over_many_cycles(self):
        sim = GateSimulator(parks=_parks(5), seed=7)
        total = sum(len(sim.tick()) for _ in range(200))
        self.assertGreater(total, 0, "No gate events generated in 200 ticks")

    def test_gate_states_returns_all_parks(self):
        parks = _parks(4)
        sim = GateSimulator(parks=parks, seed=1)
        states = sim.gate_states()
        self.assertEqual(len(states), 4)
        for state_map in states.values():
            self.assertIn(state_map["entry"], [s.value for s in GateState])
            self.assertIn(state_map["exit"], [s.value for s in GateState])

    def test_plate_included_in_gate_event_from_ocr(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        events = sim.on_ocr_event(_ocr_event("park-1", "entry", 0.95, plate="ZZ-99-ZZ"))
        event = events[0][0]
        self.assertEqual(event["payload"]["plate"], "ZZ-99-ZZ")


class GateSimulatorKafkaPublishTests(unittest.TestCase):
    """Integration-style: simulate Kafka publish using a stub publisher."""

    def test_events_published_on_valid_ocr(self):
        published = []

        class StubPublisher:
            def publish(self, topic, key, value):
                published.append((topic, key, value))

            def flush(self):
                pass

        sim = GateSimulator(parks=_parks(2), seed=42)
        publisher = StubPublisher()

        ocr_events = [
            _ocr_event("park-1", "entry", 0.92),
            _ocr_event("park-2", "exit", 0.88),
            _ocr_event("park-1", "entry", 0.50),  # low confidence → blocked
        ]

        for ocr in ocr_events:
            for event, park_id in sim.on_ocr_event(ocr):
                publisher.publish("parking-gate-events", park_id, event)

        self.assertEqual(len(published), 3)
        types = [p[2]["eventType"] for p in published]
        self.assertIn("gate.opened", types)
        self.assertIn("gate.blocked", types)

    def test_fault_event_published_on_tick(self):
        published = []

        class StubPublisher:
            def publish(self, topic, key, value):
                published.append((topic, key, value))

            def flush(self):
                pass

        import random
        sim = GateSimulator(parks=_parks(3), seed=99)
        publisher = StubPublisher()

        # force one gate into FAULT and then tick to publish recovery
        park_id = "park-1"
        gate = sim._gates[park_id]["entry"]
        gate.state = GateState.FAULT

        # tick many times to guarantee recovery event
        for _ in range(100):
            for event, pid in sim.tick():
                publisher.publish("parking-gate-events", pid, event)

        all_types = [p[2]["eventType"] for p in published]
        self.assertIn("gate.recovered", all_types)


if __name__ == "__main__":
    unittest.main()
