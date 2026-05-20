import threading
import time

from config import (
    KAFKA_TOPIC_GATE,
    KAFKA_TOPIC_GATE_COMMANDS,
    KAFKA_TOPIC_GATE_RESPONSES,
    SIMULATION_INTERVAL_SECONDS,
    SIMULATION_SEED,
)
from context_loader import load_spots
from gate_command_consumer import run_gate_command_consumer
from gate_event_builder import GateSimulator
from kafka_publisher import KafkaPublisher


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

    print(f"[gates] Simulating gates for {len(parks)} parks")
    print(f"[gates] Consuming commands from {KAFKA_TOPIC_GATE_COMMANDS}")
    print(f"[gates] Publishing responses to {KAFKA_TOPIC_GATE_RESPONSES}")

    command_thread = threading.Thread(
        target=run_gate_command_consumer,
        args=(simulator, publisher),
        daemon=True,
        name="gate-command-consumer",
    )
    command_thread.start()

    while True:
        if not command_thread.is_alive():
            raise RuntimeError("gate-command-consumer thread terminated unexpectedly")

        for event, park_id in simulator.tick():
            publisher.publish(KAFKA_TOPIC_GATE, park_id, event)

        publisher.flush()
        if SIMULATION_INTERVAL_SECONDS > 0:
            time.sleep(SIMULATION_INTERVAL_SECONDS)
