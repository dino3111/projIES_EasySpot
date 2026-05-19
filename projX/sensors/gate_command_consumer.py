import json
import uuid
from datetime import datetime, timezone

from kafka import KafkaConsumer

from config import KAFKA_BOOTSTRAP_SERVERS


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class GateCommandConsumer:
    """Consumes gate commands from backend and applies them to a GateSimulator."""

    def __init__(self, simulator, publisher, command_topic, response_topic):
        self._simulator = simulator
        self._publisher = publisher
        self._command_topic = command_topic
        self._response_topic = response_topic
        self._consumer = KafkaConsumer(
            command_topic,
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            group_id="easyspot-gate-command-executor",
            value_deserializer=lambda v: json.loads(v.decode("utf-8")),
            auto_offset_reset="latest",
            enable_auto_commit=True,
        )

    def poll(self, timeout_ms=100):
        """Non-blocking poll. Returns number of commands processed."""
        records = self._consumer.poll(timeout_ms=timeout_ms)
        count = 0
        for _, messages in records.items():
            for msg in messages:
                self._handle(msg.value)
                count += 1
        return count

    def _handle(self, command):
        command_id = command.get("commandId")
        command_type = command.get("commandType")
        park_id = command.get("parkId")
        gate_id = command.get("gateId")
        direction = command.get("direction", "exit")
        plate = command.get("plate")
        reservation_id = command.get("reservationId")

        print(f"[gate-cmd] Received {command_type} for gate={gate_id} park={park_id} plate={plate}")

        result, reason = self._execute(command_type, park_id, direction, plate)

        response = {
            "commandId": command_id,
            "result": result,
            "parkId": park_id,
            "gateId": gate_id,
            "direction": direction,
            "plate": plate,
            "reservationId": reservation_id,
            "reason": reason,
            "respondedAt": now_iso(),
        }

        self._publisher.publish(self._response_topic, park_id, response)
        self._publisher.flush()
        print(f"[gate-cmd] Response {result} for commandId={command_id} reason={reason}")

    def _execute(self, command_type, park_id, direction, plate):
        if park_id not in self._simulator._gates:
            return "DENIED", "unknown_park"

        gate = self._simulator._gates[park_id].get(direction)
        if gate is None:
            return "DENIED", "unknown_gate_direction"

        from gate_event_builder import GateState

        if command_type == "OPEN_GATE":
            if gate.state == GateState.FAULT:
                return "DENIED", "gate_in_fault"
            raw = gate._try_open(plate=plate, reason="payment_approved")
            if raw is None:
                return "DENIED", "gate_already_open_or_fault"
            park = self._simulator.parks.get(str(park_id), {})
            raw["parkId"] = park_id
            raw["payload"]["parkName"] = park.get("parkName", "")
            return "EXECUTED", "payment_approved"

        elif command_type == "BLOCK_GATE":
            if gate.state == GateState.FAULT:
                return "DENIED", "gate_in_fault"
            raw = gate._block(plate=plate, reason="payment_rejected")
            if raw is None:
                return "DENIED", "gate_already_blocked_or_fault"
            return "EXECUTED", "payment_rejected"

        return "DENIED", f"unknown_command_type_{command_type}"

    def close(self):
        self._consumer.close()
