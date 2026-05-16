import os

BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8080")
SENSOR_CONTEXT_ENDPOINT = os.getenv(
    "SENSOR_CONTEXT_ENDPOINT", "/api/technician/sensors/context"
)
SIMULATION_SERVICE_TOKEN = os.getenv("SIMULATION_SERVICE_TOKEN", "")

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "parking-spot-events")

# 0 means continuous generation (no artificial sleep between cycles).
SIMULATION_INTERVAL_SECONDS = float(os.getenv("SIMULATION_INTERVAL_SECONDS", "0"))
SIMULATION_SEED = int(os.getenv("SIMULATION_SEED", "42"))
CONTEXT_LOAD_RETRIES = int(os.getenv("CONTEXT_LOAD_RETRIES", "20"))
CONTEXT_RETRY_DELAY_SECONDS = float(os.getenv("CONTEXT_RETRY_DELAY_SECONDS", "3"))
