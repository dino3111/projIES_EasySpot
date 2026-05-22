import time

from config import (
    FAULT_CHECK_INTERVAL_SECONDS,
    FAULT_MAX_DURATION_SECONDS,
    FAULT_MIN_DURATION_SECONDS,
    KAFKA_TOPIC_OCR,
    OCR_FAULT_PROBABILITY_PER_TICK,
    SIMULATION_INTERVAL_SECONDS,
    SIMULATION_SEED,
    TECHNICIAN_REPAIR_PROBABILITY,
)
from context_loader import (
    load_cached_context,
    spots_from_context,
    vehicle_plates_from_context,
)
from kafka_publisher import KafkaPublisher
from ocr_event_builder import OcrEventGenerator


def run_ocr():
    context = load_cached_context()
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

    last_fault_check = time.monotonic()

    while True:
        now_mono = time.monotonic()
        run_fault_check = (now_mono - last_fault_check) >= FAULT_CHECK_INTERVAL_SECONDS
        if run_fault_check:
            last_fault_check = now_mono

        published_any = False
        for event, key in generator.next_events(fault_check=run_fault_check):
            publisher.publish(KAFKA_TOPIC_OCR, key, event)
            published_any = True

        if published_any:
            publisher.flush()
        if SIMULATION_INTERVAL_SECONDS > 0:
            time.sleep(SIMULATION_INTERVAL_SECONDS)
