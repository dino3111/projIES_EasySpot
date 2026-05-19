import os
import time

from config import KAFKA_TOPIC_GATE, SIMULATION_INTERVAL_SECONDS, SIMULATION_SEED
from context_loader import load_spots
from gate_command_consumer import GateCommandConsumer
from gate_event_builder import GateSimulator
from kafka_publisher import KafkaPublisher

KAFKA_TOPIC_GATE_COMMANDS = os.getenv("KAFKA_TOPIC_GATE_COMMANDS", "parking-gate-commands")
KAFKA_TOPIC_GATE_RESPONSES = os.getenv("KAFKA_TOPIC_GATE_RESPONSES", "parking-gate-responses")


def _build_parks(spots):
    seen = {}
    for spot in spots:
        pid = spot["parkId"]
        if pid not in seen:
            seen[pid] = {"parkId": pid, "parkName": spot["parkName"]}
    return list(seen.values())


def run_gates():
    spots = load_spots()
    if not spots:
        raise RuntimeError("No parking spots returned by backend context endpoint")

    parks = _build_parks(spots)
    publisher = KafkaPublisher()
    simulator = GateSimulator(parks=parks, seed=SIMULATION_SEED)
    command_consumer = GateCommandConsumer(
        simulator=simulator,
        publisher=publisher,
        command_topic=KAFKA_TOPIC_GATE_COMMANDS,
        response_topic=KAFKA_TOPIC_GATE_RESPONSES,
    )

    print(f"[gates] Simulating gates for {len(parks)} parks")
    print(f"[gates] Consuming commands from {KAFKA_TOPIC_GATE_COMMANDS}")
    print(f"[gates] Publishing responses to {KAFKA_TOPIC_GATE_RESPONSES}")

    while True:
        command_consumer.poll(timeout_ms=100)

        for event, park_id in simulator.tick():
            publisher.publish(KAFKA_TOPIC_GATE, park_id, event)

        publisher.flush()
        delay = SIMULATION_INTERVAL_SECONDS if SIMULATION_INTERVAL_SECONDS > 0 else 1.0
        time.sleep(delay)
