import time

from config import KAFKA_TOPIC_OCR, SIMULATION_INTERVAL_SECONDS, SIMULATION_SEED
from context_loader import load_spots
from kafka_publisher import KafkaPublisher
from ocr_event_builder import OcrEventGenerator


def run_ocr():
    spots = load_spots()
    if not spots:
        raise RuntimeError("No parking spots returned by backend context endpoint")

    publisher = KafkaPublisher()
    generator = OcrEventGenerator(spots=spots, seed=SIMULATION_SEED)

    print(f"[ocr] Loaded {len(spots)} spots for OCR simulation")

    while True:
        for event, spot_id in generator.next_events():
            publisher.publish(KAFKA_TOPIC_OCR, spot_id, event)

        publisher.flush()
        if SIMULATION_INTERVAL_SECONDS > 0:
            time.sleep(SIMULATION_INTERVAL_SECONDS)
