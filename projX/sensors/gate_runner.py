import threading
import time

from config import (
    FAULT_CHECK_INTERVAL_SECONDS,
    KAFKA_TOPIC_GATE,
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

    command_thread = threading.Thread(
        target=run_gate_command_consumer,
        args=(simulator, publisher),
        daemon=True,
        name="gate-command-consumer",
    )
    command_thread.start()
    last_fault_check = time.monotonic()

    while True:
        if not command_thread.is_alive():
            raise RuntimeError("gate-command-consumer thread terminated unexpectedly")

        now_mono = time.monotonic()
        run_fault_check = (now_mono - last_fault_check) >= FAULT_CHECK_INTERVAL_SECONDS
        if run_fault_check:
            last_fault_check = now_mono

        published_any = False
        for event, park_id in simulator.tick(fault_check=run_fault_check):
            publisher.publish(KAFKA_TOPIC_GATE, park_id, event)
            published_any = True

        if published_any:
            publisher.flush()
        if SIMULATION_INTERVAL_SECONDS > 0:
            time.sleep(SIMULATION_INTERVAL_SECONDS)
