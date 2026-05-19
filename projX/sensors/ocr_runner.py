import time

from config import (
    FAULT_MAX_DURATION_SECONDS,
    FAULT_MIN_DURATION_SECONDS,
    KAFKA_TOPIC_OCR,
    OCR_FAULT_PROBABILITY_PER_TICK,
    SIMULATION_INTERVAL_SECONDS,
    SIMULATION_SEED,
    TECHNICIAN_REPAIR_PROBABILITY,
)
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
        spots=spots,
        seed=SIMULATION_SEED,
        registered_plates=plates,
        fault_min_duration=FAULT_MIN_DURATION_SECONDS,
        fault_max_duration=FAULT_MAX_DURATION_SECONDS,
        fault_probability_per_tick=OCR_FAULT_PROBABILITY_PER_TICK,
        technician_repair_probability=TECHNICIAN_REPAIR_PROBABILITY,
    )

    print(
        f"[ocr] Loaded {len(spots)} spots and {len(plates)} "
        "registered plates for OCR simulation"
    )

    while True:
        for event, key in generator.next_events():
            publisher.publish(KAFKA_TOPIC_OCR, key, event)

        publisher.flush()
        if SIMULATION_INTERVAL_SECONDS > 0:
            time.sleep(SIMULATION_INTERVAL_SECONDS)
