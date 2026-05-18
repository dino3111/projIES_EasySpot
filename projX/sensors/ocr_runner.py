import time

from config import KAFKA_TOPIC_OCR, SIMULATION_INTERVAL_SECONDS, SIMULATION_SEED
from context_loader import load_context, spots_from_context, vehicle_plates_from_context
from kafka_publisher import KafkaPublisher
from ocr_event_builder import OcrEventGenerator


def run_ocr():
    context = load_context()
    spots = spots_from_context(context)
    if not spots:
        raise RuntimeError("No parking spots returned by backend context endpoint")
    plates = vehicle_plates_from_context(context)
    if not plates:
        raise RuntimeError(
            "No registered vehicles returned by backend context endpoint; "
            "OCR simulation requires real registered plates"
        )

    publisher = KafkaPublisher()
    generator = OcrEventGenerator(
        spots=spots, seed=SIMULATION_SEED, registered_plates=plates
    )

    print(
        f"[ocr] Loaded {len(spots)} spots and {len(plates)} "
        "registered plates for OCR simulation"
    )

    while True:
        for event, spot_id in generator.next_events():
            publisher.publish(KAFKA_TOPIC_OCR, spot_id, event)

        publisher.flush()
        if SIMULATION_INTERVAL_SECONDS > 0:
            time.sleep(SIMULATION_INTERVAL_SECONDS)
