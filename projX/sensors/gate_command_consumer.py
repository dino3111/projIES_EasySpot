import json

from kafka import KafkaConsumer

from config import (
    KAFKA_BOOTSTRAP_SERVERS,
    KAFKA_TOPIC_GATE,
    KAFKA_TOPIC_GATE_COMMANDS,
    KAFKA_TOPIC_GATE_RESPONSES,
)
from gate_event_builder import GateSimulator
from kafka_publisher import KafkaPublisher


def run_gate_command_consumer(simulator: GateSimulator, publisher: KafkaPublisher) -> None:
    consumer = KafkaConsumer(
        KAFKA_TOPIC_GATE_COMMANDS,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        group_id="gate-simulator-command-consumer",
        auto_offset_reset="latest",
        enable_auto_commit=True,
    )

    print(f"[gate-commands] Listening on topic '{KAFKA_TOPIC_GATE_COMMANDS}'")

    for message in consumer:
        command = message.value
        command_id = command.get("commandId", "<no-id>")
        park_id = command.get("parkId", "<no-park>")
        direction = command.get("direction", "<no-dir>")
        command_type = command.get("commandType", "<no-type>")

        print(
            f"[gate-commands] Received command={command_type} commandId={command_id}"
            f" parkId={park_id} direction={direction}"
        )

        response, response_key, gate_event = simulator.on_gate_command(command)

        print(
            f"[gate-commands] Response commandId={command_id}"
            f" status={response['status']} reason={response['reason']}"
        )

        publisher.publish(KAFKA_TOPIC_GATE_RESPONSES, response_key, response)

        if gate_event is not None:
            publisher.publish(KAFKA_TOPIC_GATE, response_key, gate_event)
            print(
                f"[gate-commands] Gate event published eventType={gate_event['eventType']}"
                f" gateId={gate_event['payload'].get('gateId')}"
            )

        publisher.flush()
