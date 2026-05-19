# isort: skip_file
import sys
import unittest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

sys.path.insert(0, ".")

from gate_event_builder import GateSimulator, GateState  # noqa: E402
from gate_command_consumer import GateCommandConsumer     # noqa: E402


def _parks(n=2):
    return [{"parkId": f"park-{i}", "parkName": f"Park {i}"} for i in range(1, n + 1)]


def _make_consumer(simulator, published):
    class StubPublisher:
        def publish(self, topic, key, value):
            published.append((topic, key, value))

        def flush(self):
            pass

    with patch("gate_command_consumer.KafkaConsumer"):
        consumer = GateCommandConsumer(
            simulator=simulator,
            publisher=StubPublisher(),
            command_topic="parking-gate-commands",
            response_topic="parking-gate-responses",
        )
    return consumer


def _command(command_type, park_id="park-1", gate_id=None, plate="AB-12-CD",
             direction="exit", reservation_id=None):
    return {
        "commandId": "cmd-uuid-001",
        "commandType": command_type,
        "parkId": park_id,
        "gateId": gate_id or f"gate-{park_id[:8]}-exit",
        "direction": direction,
        "plate": plate,
        "reservationId": reservation_id,
        "reason": "test",
        "issuedAt": datetime.now(timezone.utc).isoformat(),
    }


class GateCommandConsumerOpenGateTests(unittest.TestCase):
    def test_open_gate_approved_payment_opens_exit_gate(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        published = []
        consumer = _make_consumer(sim, published)

        consumer._handle(_command("OPEN_GATE", "park-1", direction="exit"))

        self.assertEqual(len(published), 1)
        _, _, response = published[0]
        self.assertEqual(response["result"], "EXECUTED")
        self.assertEqual(response["commandId"], "cmd-uuid-001")
        self.assertEqual(sim.gate_states()["park-1"]["exit"], "OPEN")

    def test_block_gate_rejected_payment_blocks_exit_gate(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        published = []
        consumer = _make_consumer(sim, published)

        consumer._handle(_command("BLOCK_GATE", "park-1", direction="exit"))

        self.assertEqual(len(published), 1)
        _, _, response = published[0]
        self.assertEqual(response["result"], "EXECUTED")
        self.assertEqual(sim.gate_states()["park-1"]["exit"], "BLOCKED")

    def test_open_gate_denied_when_gate_in_fault(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        sim._gates["park-1"]["exit"].state = GateState.FAULT
        published = []
        consumer = _make_consumer(sim, published)

        consumer._handle(_command("OPEN_GATE", "park-1", direction="exit"))

        _, _, response = published[0]
        self.assertEqual(response["result"], "DENIED")
        self.assertEqual(response["reason"], "gate_in_fault")

    def test_block_gate_denied_when_gate_in_fault(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        sim._gates["park-1"]["exit"].state = GateState.FAULT
        published = []
        consumer = _make_consumer(sim, published)

        consumer._handle(_command("BLOCK_GATE", "park-1", direction="exit"))

        _, _, response = published[0]
        self.assertEqual(response["result"], "DENIED")

    def test_unknown_park_returns_denied(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        published = []
        consumer = _make_consumer(sim, published)

        consumer._handle(_command("OPEN_GATE", "park-999", direction="exit"))

        _, _, response = published[0]
        self.assertEqual(response["result"], "DENIED")
        self.assertEqual(response["reason"], "unknown_park")

    def test_unknown_command_type_returns_denied(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        published = []
        consumer = _make_consumer(sim, published)

        consumer._handle(_command("TELEPORT_GATE", "park-1", direction="exit"))

        _, _, response = published[0]
        self.assertEqual(response["result"], "DENIED")
        self.assertIn("unknown_command_type", response["reason"])


class GateCommandConsumerCorrelationTests(unittest.TestCase):
    def test_response_contains_command_id_and_plate(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        published = []
        consumer = _make_consumer(sim, published)

        consumer._handle(_command("OPEN_GATE", "park-1", plate="ZZ-99-ZZ"))

        _, _, response = published[0]
        self.assertEqual(response["commandId"], "cmd-uuid-001")
        self.assertEqual(response["plate"], "ZZ-99-ZZ")
        self.assertIn("respondedAt", response)

    def test_response_published_to_response_topic(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        published = []
        consumer = _make_consumer(sim, published)

        consumer._handle(_command("OPEN_GATE", "park-1"))

        topic, _, _ = published[0]
        self.assertEqual(topic, "parking-gate-responses")

    def test_async_flow_open_gate_does_not_block(self):
        sim = GateSimulator(parks=_parks(2), seed=1)
        published = []
        consumer = _make_consumer(sim, published)

        consumer._handle(_command("OPEN_GATE", "park-1"))
        consumer._handle(_command("BLOCK_GATE", "park-2"))

        self.assertEqual(len(published), 2)
        results = [r[2]["result"] for r in published]
        self.assertEqual(results.count("EXECUTED"), 2)


if __name__ == "__main__":
    unittest.main()
