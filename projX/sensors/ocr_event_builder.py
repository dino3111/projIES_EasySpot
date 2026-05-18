import random
import string
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


def build_ocr_failure_event(
    spot: Dict,
    failure_mode: OcrFailureMode,
    event_direction: str = "entry",
    plate: Optional[str] = None,
    confidence: Optional[float] = None,
) -> Dict:
    """
    Build an explicit OCR failure event.

    - UNREADABLE: plate=None, confidence=0.0
    - LOW_CONFIDENCE: plate present, confidence < 0.5
    - WRONG_PLATE: plate present but malformed/invalid
    - CAMERA_OFFLINE: plate=None, confidence=0.0, no camera signal
    - CAMERA_DEGRADED: plate present, confidence degraded (0.3–0.6)

    failureMode is always set in payload so consumers can distinguish
    from normal events.
    """
    payload: Dict = {
        "plate": plate or "",
        "confidence": round(confidence, 4) if confidence is not None else 0.0,
        "direction": event_direction,
        "parkName": spot["parkName"],
        "spotNumber": spot["spotNumber"],
        "zone": spot["zone"],
        "row": spot["row"],
        "col": spot["col"],
        "failureMode": failure_mode.value,
    }

    return {
        "eventId": str(uuid.uuid4()),
        "eventType": "ocr.plate.failure",
        "parkId": spot["parkId"],
        "spotId": spot["spotId"],
        "occurredAt": now_iso(),
        "payload": payload,
        "version": 1,
    }


class OcrEventGenerator:
    """Stateful generator: tracks which plates are inside each park to produce
    consistent entry/exit sequences.

    failure_rate controls the probability that any given event tick produces a
    failure event instead of (or in addition to) a normal read.  Set to 0.0 to
    disable failures entirely (default).

    offline_spots is the set of spotIds whose cameras are currently OFFLINE.
    degraded_spots is the set of spotIds whose cameras are DEGRADED.
    Both sets are mutable at runtime to simulate recovery.
    """

    def __init__(
        self,
        spots: List[Dict],
        seed: int = 42,
        registered_plates: Optional[List[str]] = None,
        failure_rate: float = 0.0,
    ):
        self.spots = spots
        self.rng = random.Random(seed)
        self.failure_rate = failure_rate
        # plate -> spotId of where the vehicle currently is (None = outside)
        self._parked: Dict[str, str] = {}
        # mutable camera state sets — callers can add/remove spot IDs at runtime
        self.offline_spots: set = set()
        self.degraded_spots: set = set()

        if registered_plates is None:
            self._plate_pool = [
                _random_pt_plate(self.rng) for _ in range(max(len(spots) * 2, 30))
            ]
        else:
            self._plate_pool = [
                p.strip().upper() for p in registered_plates if p and p.strip()
            ]

    def next_events(self) -> List[Tuple[Dict, str]]:
        """Return a list of (event, spot_id) tuples for this simulation tick."""
        events = []
        for spot in self.rng.sample(self.spots, k=max(1, len(self.spots) // 4)):
            spot_id = spot["spotId"]

            # camera offline — emit one failure event per tick, no plate read
            if spot_id in self.offline_spots:
                event = build_ocr_failure_event(
                    spot, OcrFailureMode.CAMERA_OFFLINE, confidence=0.0
                )
                events.append((event, spot_id))
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

    # ------------------------------------------------------------------
    # Camera state management (runtime recovery support)
    # ------------------------------------------------------------------

    def set_camera_offline(self, spot_id: str) -> None:
        self.offline_spots.add(spot_id)
        self.degraded_spots.discard(spot_id)

    def set_camera_degraded(self, spot_id: str) -> None:
        self.degraded_spots.add(spot_id)
        self.offline_spots.discard(spot_id)

    def recover_camera(self, spot_id: str) -> None:
        """Bring camera back to normal operation."""
        self.offline_spots.discard(spot_id)
        self.degraded_spots.discard(spot_id)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _should_fail(self) -> bool:
        return self.failure_rate > 0.0 and self.rng.random() < self.failure_rate

    def _entry_confidence(self, spot_id: str) -> float:
        if spot_id in self.degraded_spots:
            return self.rng.uniform(0.30, 0.65)
        return self.rng.uniform(0.75, 0.99)

    def _exit_confidence(self, spot_id: str) -> float:
        if spot_id in self.degraded_spots:
            return self.rng.uniform(0.30, 0.65)
        return self.rng.uniform(0.82, 0.99)

    def _make_failure_event(self, spot: Dict, direction: str, real_plate: str) -> Dict:
        """Pick a random non-offline failure mode and build the event."""
        non_offline_modes = [
            OcrFailureMode.UNREADABLE,
            OcrFailureMode.LOW_CONFIDENCE,
            OcrFailureMode.WRONG_PLATE,
            OcrFailureMode.CAMERA_DEGRADED,
        ]
        mode = self.rng.choice(non_offline_modes)

        if mode == OcrFailureMode.UNREADABLE:
            return build_ocr_failure_event(
                spot, mode, direction, plate=None, confidence=0.0
            )

        if mode == OcrFailureMode.LOW_CONFIDENCE:
            confidence = self.rng.uniform(0.10, 0.49)
            return build_ocr_failure_event(
                spot, mode, direction, plate=real_plate, confidence=confidence
            )

        if mode == OcrFailureMode.WRONG_PLATE:
            garbled = _garble_plate(self.rng, real_plate)
            return build_ocr_failure_event(
                spot,
                mode,
                direction,
                plate=garbled,
                confidence=self.rng.uniform(0.50, 0.75),
            )

        # CAMERA_DEGRADED
        confidence = self.rng.uniform(0.30, 0.65)
        return build_ocr_failure_event(
            spot, mode, direction, plate=real_plate, confidence=confidence
        )

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
