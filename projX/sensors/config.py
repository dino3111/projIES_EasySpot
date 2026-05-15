import os

BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8080")
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "parking-spot-events")
SIMULATION_INTERVAL_SECONDS = float(os.getenv("SIMULATION_INTERVAL_SECONDS", "1.5"))
SIMULATION_SEED = int(os.getenv("SIMULATION_SEED", "42"))
