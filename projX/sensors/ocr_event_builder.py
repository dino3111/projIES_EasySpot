import random
import string
import time
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional, Tuple


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class OcrFailureMode(str, Enum):
    UNREADABLE = "UNREADABLE"
    LOW_CONFIDENCE = "LOW_CONFIDENCE"
    WRONG_PLATE = "WRONG_PLATE"
    CAMERA_OFFLINE = "CAMERA_OFFLINE"
    CAMERA_DEGRADED = "CAMERA_DEGRADED"


def _garble_plate(rng: random.Random, plate: str) -> str:
    """Return a plate-like string that does NOT match any valid PT format."""
    chars = list(plate)
    # flip a digit to a letter or vice versa at a random position to break format
    idx = rng.randint(0, len(chars) - 1)
    if chars[idx].isdigit():
        chars[idx] = rng.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    elif chars[idx].isalpha():
        chars[idx] = str(rng.randint(0, 9))
    return "".join(chars)


def _random_pt_plate(rng: random.Random) -> str:
    """
    Generate a plausible Portuguese plate covering all 4 real formats:
      AA-00-00  (1992-2005, most common in older fleet)
      00-AA-00  (2005-2013)
      00-00-AA  (2013-2020)
      AA-00-AA  (2020-present, newest format)
    Weights reflect rough fleet distribution.
    """
    letters = string.ascii_uppercase

    def ll():
        return "".join(rng.choices(letters, k=2))

    def dd():
        return f"{rng.randint(0, 99):02d}"

    fmt = rng.choices(
        ["AA-00-00", "00-AA-00", "00-00-AA", "AA-00-AA"],
        weights=[30, 35, 25, 10],
    )[0]

    if fmt == "AA-00-00":
        return f"{ll()}-{dd()}-{dd()}"
    if fmt == "00-AA-00":
        return f"{dd()}-{ll()}-{dd()}"
    if fmt == "00-00-AA":
        return f"{dd()}-{dd()}-{ll()}"
    return f"{ll()}-{dd()}-{ll()}"


def _ocr_sensor_id(park_id: str) -> str:
    """Derive OCR entrance camera sensor ID from park UUID — matches backend convention."""
    park_key = park_id.replace("-", "")[:8].upper()
    return f"OCR-{park_key}-ENT1"


def build_ocr_event(
    spot: Dict, event_direction: str, plate: str, confidence: float
) -> Dict:
    """
    Build an OCR camera read event for entry or exit at a parking lot gate.

    event_direction: "entry" | "exit"
    confidence: 0.0–1.0 (OCR read quality score)
    """
    return {
        "eventId": str(uuid.uuid4()),
        "eventType": "ocr.plate.read",
        "parkId": spot["parkId"],
        "spotId": spot["spotId"],
        "occurredAt": now_iso(),
        "payload": {
            "plate": plate,
            "confidence": round(confidence, 4),
            "direction": event_direction,
            "parkName": spot["parkName"],
            "spotNumber": spot["spotNumber"],
            "zone": spot["zone"],
            "row": spot["row"],
            "col": spot["col"],
        },
        "version": 1,
    }


def build_device_fault_event(park_id: str, park_name: str) -> Dict:
    return {
        "eventId": str(uuid.uuid4()),
        "eventType": "device.fault",
        "parkId": park_id,
        "spotId": None,
        "occurredAt": now_iso(),
        "payload": {
            "plate": None,
            "confidence": None,
            "direction": None,
            "parkName": park_name,
            "spotNumber": None,
            "zone": None,
            "row": None,
            "col": None,
            "extensions": {
                "deviceType": "OCR_CAMERA",
                "deviceId": _ocr_sensor_id(park_id),
            },
        },
        "version": 1,
    }


def build_device_recovery_event(
    park_id: str,
    park_name: str,
    recovery_type: str,
    fault_duration_seconds: float,
) -> Dict:
    return {
        "eventId": str(uuid.uuid4()),
        "eventType": "device.recovery",
        "parkId": park_id,
        "spotId": None,
        "occurredAt": now_iso(),
        "payload": {
            "plate": None,
            "confidence": None,
            "direction": None,
            "parkName": park_name,
            "spotNumber": None,
            "zone": None,
            "row": None,
            "col": None,
            "extensions": {
                "deviceType": "OCR_CAMERA",
                "deviceId": _ocr_sensor_id(park_id),
                "recoveryType": recovery_type,
                "faultDurationSeconds": round(fault_duration_seconds, 2),
            },
        },
        "version": 1,
    }


class OcrEventGenerator:
    """Stateful generator: tracks which plates are inside each park to produce
    consistent entry/exit sequences. Also simulates OCR camera fault/recovery."""

    def __init__(
        self,
        spots: List[Dict],
        seed: int = 42,
        registered_plates: Optional[List[str]] = None,
        fault_min_duration: float = 30.0,
        fault_max_duration: float = 300.0,
        fault_probability_per_tick: float = 0.0,
        technician_repair_probability: float = 0.3,
    ):
        self.spots = spots
        self.rng = random.Random(seed)
        self.fault_min_duration = fault_min_duration
        self.fault_max_duration = fault_max_duration
        self.fault_probability_per_tick = fault_probability_per_tick
        self.technician_repair_probability = technician_repair_probability

        # plate -> spotId of where the vehicle currently is (None = outside)
        self._parked: Dict[str, str] = {}

        if registered_plates is None:
            self._plate_pool = [
                _random_pt_plate(self.rng) for _ in range(max(len(spots) * 2, 30))
            ]
        else:
            self._plate_pool = [
                p.strip().upper() for p in registered_plates if p and p.strip()
            ]

        # Group spots by park for camera-level fault tracking
        self._spots_by_park: Dict[str, List[Dict]] = {}
        for spot in spots:
            self._spots_by_park.setdefault(spot["parkId"], []).append(spot)

        # per park_id: fault start time (float) when camera is offline; absent = operational
        self._camera_fault_start: Dict[str, float] = {}

    def next_events(self, now: Optional[float] = None) -> List[Tuple[Dict, str]]:
        """Return a list of (event, key) tuples for this simulation tick.
        key is spot_id for plate reads, park_id for device fault/recovery events.
        """
        if now is None:
            now = time.monotonic()

        events = []

        # Camera fault/recovery phase (per park)
        for park_id, park_spots in self._spots_by_park.items():
            park_name = park_spots[0].get("parkName", "")
            if park_id not in self._camera_fault_start:
                # Camera is operational — check for new fault
                if self.fault_probability_per_tick > 0 and self.rng.random() < self.fault_probability_per_tick:
                    self._camera_fault_start[park_id] = now
                    events.append((build_device_fault_event(park_id, park_name), park_id))
            else:
                # Camera is offline — always check for recovery
                fault_duration = now - self._camera_fault_start[park_id]
                recovered, recovery_type = self._check_camera_recovery(fault_duration)
                if recovered:
                    del self._camera_fault_start[park_id]
                    events.append((
                        build_device_recovery_event(park_id, park_name, recovery_type, fault_duration),
                        park_id,
                    ))

        # Plate-read phase (skip parks with offline cameras)
        for spot in self.rng.sample(self.spots, k=max(1, len(self.spots) // 4)):
            spot_id = spot["spotId"]
            park_id = spot["parkId"]

            if park_id in self._camera_fault_start:
                continue

            parked_plate = self._plate_currently_at(spot_id)

            if parked_plate:
                if self.rng.random() < 0.55:
                    if self._should_fail():
                        event = self._make_failure_event(spot, "exit", parked_plate)
                        # do NOT remove from _parked — plate still inside, state unknown
                    else:
                        confidence = self._exit_confidence(spot_id)
                        event = build_ocr_event(spot, "exit", parked_plate, confidence)
                        del self._parked[parked_plate]
                    events.append((event, spot_id))
            else:
                if self.rng.random() < 0.45:
                    plate = self._pick_free_plate()
                    if plate:
                        if self._should_fail():
                            event = self._make_failure_event(spot, "entry", plate)
                            # do NOT add to _parked — state of entry unknown
                        else:
                            confidence = self._entry_confidence(spot_id)
                            event = build_ocr_event(spot, "entry", plate, confidence)
                            self._parked[plate] = spot_id
                        events.append((event, spot_id))

        return events

    def _check_camera_recovery(self, fault_duration: float) -> Tuple[bool, str]:
        if fault_duration >= self.fault_max_duration:
            return True, "TECHNICIAN_REPAIR"
        if fault_duration >= self.fault_min_duration and self.rng.random() < 0.30:
            recovery_type = (
                "TECHNICIAN_REPAIR"
                if self.rng.random() < self.technician_repair_probability
                else "AUTO_RECOVERY"
            )
            return True, recovery_type
        return False, ""

    def _plate_currently_at(self, spot_id: str) -> Optional[str]:
        for plate, sid in self._parked.items():
            if sid == spot_id:
                return plate
        return None

    def _pick_free_plate(self) -> Optional[str]:
        parked = set(self._parked.keys())
        free = [p for p in self._plate_pool if p not in parked]
        if not free:
            return None
        return self.rng.choice(free)
