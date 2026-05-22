import json

from config import (
    KAFKA_BOOTSTRAP_SERVERS,
    KAFKA_TOPIC_GATE,
    KAFKA_TOPIC_GATE_COMMANDS,
    KAFKA_TOPIC_GATE_RESPONSES,
)
from gate_event_builder import GateSimulator
from kafka import KafkaConsumer
from kafka_publisher import KafkaPublisher


def run_gate_command_consumer(
    simulator: GateSimulator, publisher: KafkaPublisher
) -> None:
    consumer = KafkaConsumer(
        KAFKA_TOPIC_GATE_COMMANDS,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        group_id="gate-simulator-command-consumer",
        auto_offset_reset="latest",
        enable_auto_commit=False,
    )

    for message in consumer:
        command = message.value
        command.get("commandId", "<no-id>")
        command.get("parkId", "<no-park>")
        command.get("direction", "<no-dir>")
        command.get("commandType", "<no-type>")

        response, response_key, gate_event = simulator.on_gate_command(command)

        publisher.publish(KAFKA_TOPIC_GATE_RESPONSES, response_key, response)

        if gate_event is not None:
            publisher.publish(KAFKA_TOPIC_GATE, response_key, gate_event)

        publisher.flush()
        consumer.commit()
