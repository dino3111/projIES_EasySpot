import os

BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8080")
SENSOR_CONTEXT_ENDPOINT = os.getenv(
    "SENSOR_CONTEXT_ENDPOINT", "/api/technician/sensors/context"
)
SIMULATION_SERVICE_TOKEN = os.getenv("SIMULATION_SERVICE_TOKEN", "")

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "parking-spot-events")
KAFKA_TOPIC_OCR = os.getenv("KAFKA_TOPIC_OCR", "parking-ocr-events")

# 0 means continuous generation (no artificial sleep between cycles).
SIMULATION_INTERVAL_SECONDS = float(os.getenv("SIMULATION_INTERVAL_SECONDS", "0"))
SIMULATION_SEED = int(os.getenv("SIMULATION_SEED", "42"))
CONTEXT_LOAD_RETRIES = int(os.getenv("CONTEXT_LOAD_RETRIES", "20"))
CONTEXT_RETRY_DELAY_SECONDS = float(os.getenv("CONTEXT_RETRY_DELAY_SECONDS", "3"))

FAULT_MIN_DURATION_SECONDS = float(os.getenv("FAULT_MIN_DURATION_SECONDS", "30"))
FAULT_MAX_DURATION_SECONDS = float(os.getenv("FAULT_MAX_DURATION_SECONDS", "300"))
TECHNICIAN_REPAIR_PROBABILITY = float(os.getenv("TECHNICIAN_REPAIR_PROBABILITY", "0.3"))
OCR_FAULT_PROBABILITY_PER_TICK = float(os.getenv("OCR_FAULT_PROBABILITY_PER_TICK", "0.002"))
