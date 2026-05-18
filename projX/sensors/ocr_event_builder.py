import random
import string
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


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


class OcrEventGenerator:
    """Stateful generator: tracks which plates are inside each park to produce
    consistent entry/exit sequences."""

    def __init__(
        self,
        spots: List[Dict],
        seed: int = 42,
        registered_plates: Optional[List[str]] = None,
    ):
        self.spots = spots
        self.rng = random.Random(seed)
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

    def next_events(self) -> List[Tuple[Dict, str]]:
        """Return a list of (event, spot_id) tuples for this simulation tick."""
        events = []
        for spot in self.rng.sample(self.spots, k=max(1, len(self.spots) // 4)):
            spot_id = spot["spotId"]
            parked_plate = self._plate_currently_at(spot_id)

            if parked_plate:
                # vehicle exits with high probability
                if self.rng.random() < 0.55:
                    confidence = self.rng.uniform(0.82, 0.99)
                    event = build_ocr_event(spot, "exit", parked_plate, confidence)
                    del self._parked[parked_plate]
                    events.append((event, spot_id))
            else:
                # new vehicle may enter
                if self.rng.random() < 0.45:
                    plate = self._pick_free_plate()
                    if plate:
                        confidence = self.rng.uniform(0.75, 0.99)
                        event = build_ocr_event(spot, "entry", plate, confidence)
                        self._parked[plate] = spot_id
                        events.append((event, spot_id))

        return events

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
