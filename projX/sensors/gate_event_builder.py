import random
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional, Tuple


class GateState(str, Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    BLOCKED = "BLOCKED"
    FAULT = "FAULT"


class GateEventType(str, Enum):
    GATE_OPENED = "gate.opened"
    GATE_CLOSED = "gate.closed"
    GATE_BLOCKED = "gate.blocked"
    GATE_FAULT = "gate.fault"
    GATE_RECOVERED = "gate.recovered"


class GateDirection(str, Enum):
    ENTRY = "entry"
    EXIT = "exit"


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def build_gate_event(
    park_id: str,
    park_name: str,
    gate_id: str,
    direction: GateDirection,
    event_type: GateEventType,
    state: GateState,
    previous_state: GateState,
    reason: str,
    plate: Optional[str] = None,
) -> Dict:
    payload = {
        "gateId": gate_id,
        "direction": direction.value,
        "state": state.value,
        "previousState": previous_state.value,
        "parkName": park_name,
        "reason": reason,
    }
    if plate is not None:
        payload["plate"] = plate

    return {
        "eventId": str(uuid.uuid4()),
        "eventType": event_type.value,
        "parkId": park_id,
        "occurredAt": now_iso(),
        "payload": payload,
        "version": 1,
    }


class ParkGate:
    """State machine for a single entry or exit gate."""

    # Probabilities for fault scenarios
    _P_STUCK_CLOSED = 0.05
    _P_STUCK_OPEN = 0.03
    _P_FAULT = 0.04
    _P_RECOVERY = 0.60

    def __init__(self, gate_id: str, direction: GateDirection, rng: random.Random):
        self.gate_id = gate_id
        self.direction = direction
        self._rng = rng
        self.state = GateState.CLOSED
        # ticks the gate has been open (auto-close after a few ticks)
        self._open_ticks = 0
        self._fault_ticks = 0

    def trigger_open(self, plate: Optional[str] = None) -> Optional[Dict]:
        """Called when a valid OCR read arrives. Returns event dict or None."""
        return self._try_open(plate, reason="valid_ocr_read")

    def trigger_blocked(self, plate: Optional[str] = None) -> Optional[Dict]:
        """Called when OCR read fails. Gate should block."""
        return self._block(plate, reason="ocr_failure")

    def tick(self, park_id: str, park_name: str) -> List[Tuple[Dict, str]]:
        """Periodic tick: auto-close open gates, maybe inject faults/recovery."""
        events = []

        if self.state == GateState.OPEN:
            self._open_ticks += 1
            if self._open_ticks >= 2:
                event = self._transition(
                    park_id,
                    park_name,
                    GateState.CLOSED,
                    GateEventType.GATE_CLOSED,
                    "auto_close_timeout",
                )
                self._open_ticks = 0
                events.append((event, park_id))

        elif self.state == GateState.CLOSED:
            roll = self._rng.random()
            if roll < self._P_STUCK_CLOSED:
                event = self._transition(
                    park_id,
                    park_name,
                    GateState.FAULT,
                    GateEventType.GATE_FAULT,
                    "stuck_closed",
                )
                events.append((event, park_id))
            elif roll < self._P_STUCK_CLOSED + self._P_FAULT:
                event = self._transition(
                    park_id,
                    park_name,
                    GateState.FAULT,
                    GateEventType.GATE_FAULT,
                    "hardware_fault",
                )
                events.append((event, park_id))

        elif self.state == GateState.BLOCKED:
            if self._rng.random() < 0.40:
                event = self._transition(
                    park_id,
                    park_name,
                    GateState.CLOSED,
                    GateEventType.GATE_CLOSED,
                    "block_timeout_reset",
                )
                events.append((event, park_id))

        elif self.state == GateState.FAULT:
            self._fault_ticks += 1
            if self._rng.random() < self._P_RECOVERY:
                event = self._transition(
                    park_id,
                    park_name,
                    GateState.CLOSED,
                    GateEventType.GATE_RECOVERED,
                    "fault_recovered",
                )
                self._fault_ticks = 0
                events.append((event, park_id))
            elif self._rng.random() < self._P_STUCK_OPEN:
                event = self._transition(
                    park_id,
                    park_name,
                    GateState.OPEN,
                    GateEventType.GATE_OPENED,
                    "stuck_open",
                )
                events.append((event, park_id))

        return events

    def _try_open(self, plate: Optional[str], reason: str) -> Optional[Dict]:
        if self.state in (GateState.FAULT,):
            return None
        if self.state == GateState.OPEN:
            return None
        prev = self.state
        self.state = GateState.OPEN
        self._open_ticks = 0
        event = build_gate_event(
            park_id="",  # filled by caller
            park_name="",
            gate_id=self.gate_id,
            direction=self.direction,
            event_type=GateEventType.GATE_OPENED,
            state=GateState.OPEN,
            previous_state=prev,
            reason=reason,
            plate=plate,
        )
        return event

    def _block(self, plate: Optional[str], reason: str) -> Optional[Dict]:
        if self.state == GateState.FAULT:
            return None
        prev = self.state
        self.state = GateState.BLOCKED
        event = build_gate_event(
            park_id="",
            park_name="",
            gate_id=self.gate_id,
            direction=self.direction,
            event_type=GateEventType.GATE_BLOCKED,
            state=GateState.BLOCKED,
            previous_state=prev,
            reason=reason,
            plate=plate,
        )
        return event

    def _transition(
        self,
        park_id: str,
        park_name: str,
        new_state: GateState,
        event_type: GateEventType,
        reason: str,
        plate: Optional[str] = None,
    ) -> Dict:
        prev = self.state
        self.state = new_state
        return build_gate_event(
            park_id=park_id,
            park_name=park_name,
            gate_id=self.gate_id,
            direction=self.direction,
            event_type=event_type,
            state=new_state,
            previous_state=prev,
            reason=reason,
            plate=plate,
        )


class GateSimulator:
    """Manages one entry + one exit gate per park."""

    def __init__(self, parks: List[Dict], seed: int = 42):
        self.parks = {str(p["parkId"]): p for p in parks}
        self._rng = random.Random(seed)
        self._gates: Dict[str, Dict[str, ParkGate]] = {}

        for park_id, park in self.parks.items():
            self._gates[park_id] = {
                "entry": ParkGate(
                    gate_id=f"gate-{park_id[:8]}-entry",
                    direction=GateDirection.ENTRY,
                    rng=random.Random(self._rng.randint(0, 2**31)),
                ),
                "exit": ParkGate(
                    gate_id=f"gate-{park_id[:8]}-exit",
                    direction=GateDirection.EXIT,
                    rng=random.Random(self._rng.randint(0, 2**31)),
                ),
            }

    def on_ocr_event(self, ocr_event: Dict) -> List[Tuple[Dict, str]]:
        """React to an OCR event. Returns list of (gate_event, park_id)."""
        park_id = str(ocr_event.get("parkId", ""))
        if park_id not in self._gates:
            return []

        park = self.parks[park_id]
        direction = ocr_event.get("payload", {}).get("direction", "entry")
        confidence = ocr_event.get("payload", {}).get("confidence", 0.0)
        plate = ocr_event.get("payload", {}).get("plate")
        event_type_ocr = ocr_event.get("eventType", "ocr.plate.read")

        gate = self._gates[park_id].get(direction)
        if gate is None:
            return []

        failure_mode = ocr_event.get("payload", {}).get("failureMode")
        is_failure = (
            event_type_ocr in ("ocr.plate.failure", "ocr.plate.unreadable", "ocr.camera.offline")
            or failure_mode is not None
            or confidence < 0.70
        )

        if is_failure:
            raw = gate._block(plate, reason="ocr_failure")
        else:
            raw = gate._try_open(plate, reason="valid_ocr_read")

        if raw is None:
            return []

        # raw event has empty park_id/park_name — patch them
        raw["parkId"] = park_id
        raw["payload"]["parkName"] = park.get("parkName", "")
        return [(raw, park_id)]

    def tick(self) -> List[Tuple[Dict, str]]:
        """Periodic tick for all gates. Returns list of (gate_event, park_id)."""
        events = []
        for park_id, park in self.parks.items():
            for gate in self._gates[park_id].values():
                for event, pid in gate.tick(park_id, park.get("parkName", "")):
                    events.append((event, pid))
        return events

    def gate_states(self) -> Dict[str, Dict[str, str]]:
        return {
            park_id: {direction: gate.state.value for direction, gate in gates.items()}
            for park_id, gates in self._gates.items()
        }
