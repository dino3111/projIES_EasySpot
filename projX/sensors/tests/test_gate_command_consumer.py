# isort: skip_file
import sys
import unittest
from datetime import datetime, timezone

sys.path.insert(0, ".")

from gate_event_builder import GateSimulator, GateState, GateCommandType  # noqa: E402


def _parks(n=2):
    return [{"parkId": f"park-{i}", "parkName": f"Park {i}"} for i in range(1, n + 1)]


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


class GateCommandOpenGateTests(unittest.TestCase):
    def test_open_gate_approved_payment_opens_exit_gate(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        response, park_id, gate_event = sim.on_gate_command(
            _command("OPEN_GATE", "park-1", direction="exit")
        )

        self.assertEqual(response["status"], "EXECUTED")
        self.assertEqual(response["commandId"], "cmd-uuid-001")
        self.assertEqual(sim.gate_states()["park-1"]["exit"], "OPEN")
        self.assertIsNotNone(gate_event)
        self.assertEqual(gate_event["eventType"], "gate.opened")

    def test_block_gate_rejected_payment_blocks_exit_gate(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        response, park_id, gate_event = sim.on_gate_command(
            _command("BLOCK_GATE", "park-1", direction="exit")
        )

        self.assertEqual(response["status"], "EXECUTED")
        self.assertEqual(sim.gate_states()["park-1"]["exit"], "BLOCKED")
        self.assertIsNotNone(gate_event)
        self.assertEqual(gate_event["eventType"], "gate.blocked")

    def test_open_gate_denied_when_gate_in_fault(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        sim._gates["park-1"]["exit"].state = GateState.FAULT
        response, _, _ = sim.on_gate_command(
            _command("OPEN_GATE", "park-1", direction="exit")
        )

        self.assertEqual(response["status"], "DENIED")
        self.assertEqual(response["reason"], "gate_in_fault")

    def test_block_gate_denied_when_gate_in_fault(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        sim._gates["park-1"]["exit"].state = GateState.FAULT
        response, _, _ = sim.on_gate_command(
            _command("BLOCK_GATE", "park-1", direction="exit")
        )

        self.assertEqual(response["status"], "DENIED")

    def test_unknown_park_returns_denied(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        response, _, _ = sim.on_gate_command(
            _command("OPEN_GATE", "park-999", direction="exit")
        )

        self.assertEqual(response["status"], "DENIED")
        self.assertEqual(response["reason"], "unknown_park")

    def test_unknown_command_type_returns_denied(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        response, _, _ = sim.on_gate_command(
            _command("TELEPORT_GATE", "park-1", direction="exit")
        )

        self.assertEqual(response["status"], "DENIED")
        self.assertIn("unknown_command_type", response["reason"])

    def test_plate_forwarded_to_gate_event(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        _, _, gate_event = sim.on_gate_command(
            _command("OPEN_GATE", "park-1", plate="ZZ-99-ZZ", direction="exit")
        )

        self.assertIsNotNone(gate_event)
        self.assertEqual(gate_event["payload"]["plate"], "ZZ-99-ZZ")


class GateCommandCorrelationTests(unittest.TestCase):
    def test_response_contains_command_id(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        response, _, _ = sim.on_gate_command(_command("OPEN_GATE", "park-1"))

        self.assertEqual(response["commandId"], "cmd-uuid-001")
        self.assertIn("respondedAt", response)

    def test_park_id_returned_as_key(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        _, park_id, _ = sim.on_gate_command(_command("OPEN_GATE", "park-1"))

        self.assertEqual(park_id, "park-1")

    def test_async_flow_open_and_block_independent(self):
        sim = GateSimulator(parks=_parks(2), seed=1)
        r1, _, _ = sim.on_gate_command(_command("OPEN_GATE", "park-1"))
        r2, _, _ = sim.on_gate_command(_command("BLOCK_GATE", "park-2"))

        self.assertEqual(r1["status"], "EXECUTED")
        self.assertEqual(r2["status"], "EXECUTED")


if __name__ == "__main__":
    unittest.main()
