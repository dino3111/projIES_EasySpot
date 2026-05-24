import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Dict


class SensorEventType(str, Enum):
    PRESENCE = "sensor.presence"
    ABSENCE = "sensor.absence"
    HEARTBEAT = "sensor.heartbeat"
# Occupancy states where a vehicle is physically present under the sensor
_PRESENCE_STATES = frozenset({"occupied"})

# Occupancy states where the sensor itself is out of order (no signal emitted)
_OFFLINE_STATES = frozenset({"out_of_service"})


def sensor_id_for_spot(spot_id: str) -> str:
    """Derive the IR sensor ID for a parking spot.

    Convention matches the backend ParkingSpotEventKafkaListener so that the
    sensor registry can identify the device from either event stream.
    """
    return "IR-" + spot_id.replace("-", "")[:16]


def is_presence(occupancy_status: str) -> bool:
    return occupancy_status in _PRESENCE_STATES


def is_offline(occupancy_status: str) -> bool:
    return occupancy_status in _OFFLINE_STATES


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _build_event(spot: Dict, event_type: SensorEventType) -> Dict:
    sid = sensor_id_for_spot(spot["spotId"])
    return {
        "eventId": str(uuid.uuid4()),
        "eventType": event_type.value,
        "sensorId": sid,
        "spotId": spot["spotId"],
        "parkId": spot["parkId"],
        "occurredAt": now_iso(),
        "payload": {
            "sensorId": sid,
            "spotId": spot["spotId"],
            "parkId": spot["parkId"],
            "parkName": spot["parkName"],
            "spotNumber": spot["spotNumber"],
            "zone": spot["zone"],
            "row": spot["row"],
            "col": spot["col"],
        },
        "version": 1,
    }


def build_presence_event(spot: Dict) -> Dict:
    """Vehicle detected — IR beam broken."""
    return _build_event(spot, SensorEventType.PRESENCE)


def build_absence_event(spot: Dict) -> Dict:
    """Spot is clear — IR beam restored."""
    return _build_event(spot, SensorEventType.ABSENCE)


def build_heartbeat_event(spot: Dict) -> Dict:
    """Periodic liveness signal — sensor is operational."""
    return _build_event(spot, SensorEventType.HEARTBEAT)


def events_for_transition(spot: Dict, previous: str, current: str) -> list:
    """Return the sensor events to emit when occupancy state changes.

    Rules:
      occupied  → any non-offline  : PRESENCE
      non-offline → free/reserved  : ABSENCE
      offline → non-offline        : ABSENCE  (sensor came back, spot readable)
      * → out_of_service           : nothing  (sensor silent when broken)
      no change                    : nothing
    """
    if previous == current:
        return []

    was_offline = is_offline(previous)
    now_offline = is_offline(current)

    if now_offline:
        return []

    if not was_offline:
        if is_presence(current):
            return [build_presence_event(spot)]
        return [build_absence_event(spot)]

    # was_offline and now not offline → sensor recovered
    return [build_absence_event(spot)]
