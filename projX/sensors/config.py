import os

BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8080")
SENSOR_CONTEXT_ENDPOINT = os.getenv(
    "SENSOR_CONTEXT_ENDPOINT", "/api/technician/sensors/context/base"
)
SIMULATION_SERVICE_TOKEN = os.getenv("SIMULATION_SERVICE_TOKEN", "")

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "parking-spot-events")
KAFKA_TOPIC_OCR = os.getenv("KAFKA_TOPIC_OCR", "parking-ocr-events")
KAFKA_TOPIC_GATE = os.getenv("KAFKA_TOPIC_GATE", "parking-gate-events")
KAFKA_TOPIC_GATE_COMMANDS = os.getenv("KAFKA_TOPIC_GATE_COMMANDS", "gate.commands")
KAFKA_TOPIC_GATE_RESPONSES = os.getenv("KAFKA_TOPIC_GATE_RESPONSES", "gate.responses")
KAFKA_TOPIC_SENSOR = os.getenv("KAFKA_TOPIC_IR_SENSOR", "parking-ir-events")

SENSOR_HEARTBEAT_INTERVAL_SECONDS = float(
    os.getenv("SENSOR_HEARTBEAT_INTERVAL_SECONDS", "30.0")
)

# 2 seconds between occupancy cycles to avoid pegging the local machine.
SIMULATION_INTERVAL_SECONDS = float(os.getenv("SIMULATION_INTERVAL_SECONDS", "2.0"))
# 60 seconds between fault-check cycles.
# With hundreds of sensors, even tiny probabilities add up fast.
FAULT_CHECK_INTERVAL_SECONDS = float(os.getenv("FAULT_CHECK_INTERVAL_SECONDS", "60.0"))
SIMULATION_SEED = int(os.getenv("SIMULATION_SEED", "42"))
MAX_SIMULATED_SPOTS = int(os.getenv("MAX_SIMULATED_SPOTS", "0"))
CONTEXT_LOAD_RETRIES = int(os.getenv("CONTEXT_LOAD_RETRIES", "20"))
CONTEXT_RETRY_DELAY_SECONDS = float(os.getenv("CONTEXT_RETRY_DELAY_SECONDS", "3"))

FAULT_MIN_DURATION_SECONDS = float(os.getenv("FAULT_MIN_DURATION_SECONDS", "30"))
FAULT_MAX_DURATION_SECONDS = float(os.getenv("FAULT_MAX_DURATION_SECONDS", "300"))
TECHNICIAN_REPAIR_PROBABILITY = float(
    os.getenv("TECHNICIAN_REPAIR_PROBABILITY", "0.001")
)
OCR_FAULT_PROBABILITY_PER_TICK = float(
    os.getenv("OCR_FAULT_PROBABILITY_PER_TICK", "0.000005")
)
OCR_ENTRY_PROBABILITY = float(os.getenv("OCR_ENTRY_PROBABILITY", "0.003"))
OCR_EXIT_PROBABILITY = float(os.getenv("OCR_EXIT_PROBABILITY", "0.65"))
OCR_MIN_PARKING_SECONDS = float(os.getenv("OCR_MIN_PARKING_SECONDS", "30"))
OCR_MAX_PARKING_SECONDS = float(os.getenv("OCR_MAX_PARKING_SECONDS", "300"))

# IR sensor device-level fault simulation
# With 1s ticks and ~300 sensors:
# 0.0000005 -> around 1 fault every ~100 minutes across all sensors.
SENSOR_FAULT_DEGRADED_PROBABILITY = float(
    os.getenv("SENSOR_FAULT_DEGRADED_PROBABILITY", "0.0000005")
)
SENSOR_FAULT_OFFLINE_PROBABILITY = float(
    os.getenv("SENSOR_FAULT_OFFLINE_PROBABILITY", "0.0000002")
)
SENSOR_FAULT_MAINTENANCE_PROBABILITY = float(
    os.getenv("SENSOR_FAULT_MAINTENANCE_PROBABILITY", "0.0000001")
)
# High recovery so faults resolve quickly and don't pile up as OPEN alerts
SENSOR_FAULT_RECOVERY_PROBABILITY = float(
    os.getenv("SENSOR_FAULT_RECOVERY_PROBABILITY", "0.50")
)
SENSOR_FAULT_DUPLICATE_PROBABILITY = float(
    os.getenv("SENSOR_FAULT_DUPLICATE_PROBABILITY", "0.0001")
)
SENSOR_FAULT_DELAY_PROBABILITY = float(
    os.getenv("SENSOR_FAULT_DELAY_PROBABILITY", "0.0005")
)
SENSOR_FAULT_DELAY_MAX_SECONDS = float(
    os.getenv("SENSOR_FAULT_DELAY_MAX_SECONDS", "10.0")
)
SENSOR_FAULT_HISTORY_SIZE = int(os.getenv("SENSOR_FAULT_HISTORY_SIZE", "50"))
SENSOR_NETWORK_OUT_OF_ORDER_PROBABILITY = float(
    os.getenv("SENSOR_NETWORK_OUT_OF_ORDER_PROBABILITY", "0.0005")
)
SENSOR_NETWORK_DROP_PROBABILITY = float(
    os.getenv("SENSOR_NETWORK_DROP_PROBABILITY", "0.0002")
)
SENSOR_NETWORK_DROP_BURST_MIN_SECONDS = float(
    os.getenv("SENSOR_NETWORK_DROP_BURST_MIN_SECONDS", "3.0")
)
SENSOR_NETWORK_DROP_BURST_MAX_SECONDS = float(
    os.getenv("SENSOR_NETWORK_DROP_BURST_MAX_SECONDS", "12.0")
)

# Per-state transition probabilities (must sum to <= 1.0; remainder falls back).
P_FREE_TO_FREE = float(os.getenv("P_FREE_TO_FREE", "0.72"))
P_FREE_TO_OCCUPIED = float(os.getenv("P_FREE_TO_OCCUPIED", "0.20"))
P_FREE_TO_RESERVED = float(os.getenv("P_FREE_TO_RESERVED", "0.05"))
P_FREE_TO_OUT_OF_SERVICE = float(os.getenv("P_FREE_TO_OUT_OF_SERVICE", "0.03"))

P_OCCUPIED_TO_OCCUPIED = float(os.getenv("P_OCCUPIED_TO_OCCUPIED", "0.62"))
P_OCCUPIED_TO_FREE = float(os.getenv("P_OCCUPIED_TO_FREE", "0.26"))
P_OCCUPIED_TO_OUT_OF_SERVICE = float(os.getenv("P_OCCUPIED_TO_OUT_OF_SERVICE", "0.12"))

P_RESERVED_TO_RESERVED = float(os.getenv("P_RESERVED_TO_RESERVED", "0.55"))
P_RESERVED_TO_OCCUPIED = float(os.getenv("P_RESERVED_TO_OCCUPIED", "0.30"))
P_RESERVED_TO_FREE = float(os.getenv("P_RESERVED_TO_FREE", "0.10"))
P_RESERVED_TO_OUT_OF_SERVICE = float(os.getenv("P_RESERVED_TO_OUT_OF_SERVICE", "0.05"))

P_OUT_OF_SERVICE_TO_OUT_OF_SERVICE = float(
    os.getenv("P_OUT_OF_SERVICE_TO_OUT_OF_SERVICE", "0.70")
)
P_OUT_OF_SERVICE_TO_FREE = float(os.getenv("P_OUT_OF_SERVICE_TO_FREE", "0.30"))
