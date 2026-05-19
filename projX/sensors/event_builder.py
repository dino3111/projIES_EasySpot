import uuid
from datetime import datetime, timezone

_RECOVERY_REASONS = frozenset({"AUTO_RECOVERY", "TECHNICIAN_REPAIR"})


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def build_spot_event(
    spot, previous_status, new_status, reason, fault_duration_seconds=None
):
    payload = {
        "parkName": spot["parkName"],
        "spotNumber": spot["spotNumber"],
        "zone": spot["zone"],
        "row": spot["row"],
        "col": spot["col"],
        "reason": reason,
    }
    if reason in _RECOVERY_REASONS and fault_duration_seconds is not None:
        payload["recoveryType"] = reason
        payload["faultDurationSeconds"] = round(fault_duration_seconds, 2)

    return {
        "eventId": str(uuid.uuid4()),
        "eventType": "spot.status.changed",
        "parkId": spot["parkId"],
        "spotId": spot["spotId"],
        "previousStatus": previous_status,
        "status": new_status,
        "occurredAt": now_iso(),
        "payload": payload,
        "version": 1,
    }
