import uuid
from datetime import datetime, timezone


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def build_spot_event(spot, previous_status, new_status, reason):
    return {
        "eventId": str(uuid.uuid4()),
        "eventType": "spot.status.changed",
        "parkId": spot["parkId"],
        "spotId": spot["spotId"],
        "previousStatus": previous_status,
        "status": new_status,
        "occurredAt": now_iso(),
        "payload": {
            "parkName": spot["parkName"],
            "spotNumber": spot["spotNumber"],
            "zone": spot["zone"],
            "row": spot["row"],
            "col": spot["col"],
            "reason": reason,
        },
        "version": 1,
    }
