# isort: skip_file
import sys
import unittest

sys.path.insert(0, ".")

from gate_event_builder import (  # noqa: E402
    GateCommandStatus,
    GateCommandType,
    GateDirection,
    GateSimulator,
    GateState,
    ParkGate,
    build_gate_command_response,
)


def _parks(n=2):
    return [{"parkId": f"park-{i}", "parkName": f"Park {i}"} for i in range(1, n + 1)]


def _command(
    command_id="cmd-1",
    park_id="park-1",
    direction="entry",
    command_type="OPEN_GATE",
):
    return {
        "commandId": command_id,
        "parkId": park_id,
        "direction": direction,
        "commandType": command_type,
    }


class BuildGateCommandResponseTests(unittest.TestCase):
    def test_required_fields(self):
        resp = build_gate_command_response(
            command_id="cmd-1",
            gate_id="g1",
            park_id="park-1",
            direction=GateDirection.ENTRY,
            command_type=GateCommandType.OPEN_GATE,
            status=GateCommandStatus.EXECUTED,
            reason="command_accepted",
            state=GateState.OPEN,
        )
        self.assertEqual(resp["commandId"], "cmd-1")
        self.assertEqual(resp["status"], "EXECUTED")
        self.assertEqual(resp["commandType"], "OPEN_GATE")
        self.assertEqual(resp["gateState"], "OPEN")
        self.assertIn("respondedAt", resp)

    def test_denied_response(self):
        resp = build_gate_command_response(
            command_id="cmd-2",
            gate_id="g1",
            park_id="park-1",
            direction=GateDirection.EXIT,
            command_type=GateCommandType.CLOSE_GATE,
            status=GateCommandStatus.DENIED,
            reason="gate_in_fault",
            state=GateState.FAULT,
        )
        self.assertEqual(resp["status"], "DENIED")
        self.assertEqual(resp["reason"], "gate_in_fault")


class ParkGateExecuteCommandTests(unittest.TestCase):
    def _gate(self, direction=GateDirection.ENTRY):
        import random
        return ParkGate("gate-test", direction, random.Random(42))

    def test_open_command_executes_from_closed(self):
        gate = self._gate()
        status, reason, event = gate.execute_command(
            "cmd-1", GateCommandType.OPEN_GATE, "park-1", "Park 1"
        )
        self.assertEqual(status, GateCommandStatus.EXECUTED)
        self.assertEqual(gate.state, GateState.OPEN)
        self.assertIsNotNone(event)
        self.assertEqual(event["eventType"], "gate.opened")
        self.assertEqual(event["payload"]["reason"], "backend_command")

    def test_open_command_denied_when_fault(self):
        gate = self._gate()
        gate.state = GateState.FAULT
        status, reason, event = gate.execute_command(
            "cmd-1", GateCommandType.OPEN_GATE, "park-1", "Park 1"
        )
        self.assertEqual(status, GateCommandStatus.DENIED)
        self.assertEqual(reason, "gate_in_fault")
        self.assertIsNone(event)

    def test_open_command_denied_when_already_open(self):
        gate = self._gate()
        gate.state = GateState.OPEN
        status, reason, event = gate.execute_command(
            "cmd-1", GateCommandType.OPEN_GATE, "park-1", "Park 1"
        )
        self.assertEqual(status, GateCommandStatus.DENIED)
        self.assertEqual(reason, "already_open")

    def test_close_command_executes_from_open(self):
        gate = self._gate()
        gate.state = GateState.OPEN
        status, reason, event = gate.execute_command(
            "cmd-2", GateCommandType.CLOSE_GATE, "park-1", "Park 1"
        )
        self.assertEqual(status, GateCommandStatus.EXECUTED)
        self.assertEqual(gate.state, GateState.CLOSED)
        self.assertIsNotNone(event)
        self.assertEqual(event["eventType"], "gate.closed")

    def test_close_command_denied_when_already_closed(self):
        gate = self._gate()
        self.assertEqual(gate.state, GateState.CLOSED)
        status, reason, event = gate.execute_command(
            "cmd-2", GateCommandType.CLOSE_GATE, "park-1", "Park 1"
        )
        self.assertEqual(status, GateCommandStatus.DENIED)
        self.assertEqual(reason, "already_closed")

    def test_close_command_denied_when_fault(self):
        gate = self._gate()
        gate.state = GateState.FAULT
        status, reason, event = gate.execute_command(
            "cmd-2", GateCommandType.CLOSE_GATE, "park-1", "Park 1"
        )
        self.assertEqual(status, GateCommandStatus.DENIED)
        self.assertEqual(reason, "gate_in_fault")


class GateSimulatorOnCommandTests(unittest.TestCase):
    def test_open_command_executes_updates_state(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        response, key, gate_event = sim.on_gate_command(
            _command("cmd-1", "park-1", "entry", "OPEN_GATE")
        )
        self.assertEqual(response["status"], "EXECUTED")
        self.assertEqual(response["commandId"], "cmd-1")
        self.assertEqual(sim.gate_states()["park-1"]["entry"], "OPEN")
        self.assertIsNotNone(gate_event)
        self.assertEqual(gate_event["eventType"], "gate.opened")

    def test_close_command_executes_from_open(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        sim._gates["park-1"]["entry"].state = GateState.OPEN
        response, key, gate_event = sim.on_gate_command(
            _command("cmd-2", "park-1", "entry", "CLOSE_GATE")
        )
        self.assertEqual(response["status"], "EXECUTED")
        self.assertEqual(sim.gate_states()["park-1"]["entry"], "CLOSED")

    def test_command_denied_when_gate_in_fault(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        sim._gates["park-1"]["exit"].state = GateState.FAULT
        response, key, gate_event = sim.on_gate_command(
            _command("cmd-3", "park-1", "exit", "OPEN_GATE")
        )
        self.assertEqual(response["status"], "DENIED")
        self.assertEqual(response["reason"], "gate_in_fault")
        self.assertIsNone(gate_event)

    def test_command_denied_for_unknown_park(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        response, key, gate_event = sim.on_gate_command(
            _command("cmd-4", "park-999", "entry", "OPEN_GATE")
        )
        self.assertEqual(response["status"], "DENIED")
        self.assertEqual(response["reason"], "unknown_park")
        self.assertIsNone(gate_event)

    def test_command_denied_for_unknown_command_type(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        response, key, gate_event = sim.on_gate_command(
            _command("cmd-5", "park-1", "entry", "LAUNCH_ROCKETS")
        )
        self.assertEqual(response["status"], "DENIED")
        self.assertEqual(response["reason"], "unknown_command_type")

    def test_command_id_correlates_in_response(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        response, key, _ = sim.on_gate_command(
            _command("my-unique-cmd-id", "park-1", "entry", "OPEN_GATE")
        )
        self.assertEqual(response["commandId"], "my-unique-cmd-id")

    def test_response_key_matches_park_id(self):
        sim = GateSimulator(parks=_parks(2), seed=1)
        response, key, _ = sim.on_gate_command(
            _command("cmd-1", "park-2", "entry", "OPEN_GATE")
        )
        self.assertEqual(key, "park-2")

    def test_exit_gate_open_command(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        response, key, gate_event = sim.on_gate_command(
            _command("cmd-6", "park-1", "exit", "OPEN_GATE")
        )
        self.assertEqual(response["status"], "EXECUTED")
        self.assertEqual(response["direction"], "exit")
        self.assertEqual(sim.gate_states()["park-1"]["exit"], "OPEN")


class GateCommandKafkaFlowTests(unittest.TestCase):
    """Integration-style: full command → response Kafka flow with stub publishers."""

    def _make_stub_publisher(self):
        published = []

        class StubPublisher:
            def publish(self, topic, key, value):
                published.append((topic, key, value))

            def flush(self):
                pass

        return StubPublisher(), published

    def test_executed_command_publishes_response_and_gate_event(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        publisher, published = self._make_stub_publisher()

        from config import KAFKA_TOPIC_GATE, KAFKA_TOPIC_GATE_RESPONSES

        command = _command("cmd-exec", "park-1", "entry", "OPEN_GATE")
        response, key, gate_event = sim.on_gate_command(command)

        publisher.publish(KAFKA_TOPIC_GATE_RESPONSES, key, response)
        if gate_event is not None:
            publisher.publish(KAFKA_TOPIC_GATE, key, gate_event)

        topics = [p[0] for p in published]
        self.assertIn(KAFKA_TOPIC_GATE_RESPONSES, topics)
        self.assertIn(KAFKA_TOPIC_GATE, topics)

        response_msg = next(
            p[2] for p in published if p[0] == KAFKA_TOPIC_GATE_RESPONSES
        )
        self.assertEqual(response_msg["commandId"], "cmd-exec")
        self.assertEqual(response_msg["status"], "EXECUTED")

    def test_denied_command_publishes_only_response(self):
        sim = GateSimulator(parks=_parks(1), seed=1)
        sim._gates["park-1"]["entry"].state = GateState.FAULT
        publisher, published = self._make_stub_publisher()

        from config import KAFKA_TOPIC_GATE_RESPONSES

        command = _command("cmd-deny", "park-1", "entry", "OPEN_GATE")
        response, key, gate_event = sim.on_gate_command(command)

        publisher.publish(KAFKA_TOPIC_GATE_RESPONSES, key, response)
        if gate_event is not None:
            publisher.publish("gate.events", key, gate_event)

        self.assertEqual(len(published), 1)
        self.assertEqual(published[0][0], KAFKA_TOPIC_GATE_RESPONSES)
        self.assertEqual(published[0][2]["status"], "DENIED")

    def test_commands_and_events_use_separate_topics(self):
        from config import (
            KAFKA_TOPIC_GATE,
            KAFKA_TOPIC_GATE_COMMANDS,
            KAFKA_TOPIC_GATE_RESPONSES,
        )

        self.assertNotEqual(KAFKA_TOPIC_GATE_COMMANDS, KAFKA_TOPIC_GATE)
        self.assertNotEqual(KAFKA_TOPIC_GATE_COMMANDS, KAFKA_TOPIC_GATE_RESPONSES)
        self.assertNotEqual(KAFKA_TOPIC_GATE_RESPONSES, KAFKA_TOPIC_GATE)


if __name__ == "__main__":
    unittest.main()
