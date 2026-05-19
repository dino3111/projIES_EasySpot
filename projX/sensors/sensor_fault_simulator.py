import random
import time
from collections import deque
from dataclasses import dataclass
from enum import Enum
from typing import Deque, Dict, List, Optional


class SensorState(str, Enum):
    OPERATIONAL = "OPERATIONAL"
    DEGRADED = "DEGRADED"
    OFFLINE = "OFFLINE"
    MAINTENANCE = "MAINTENANCE"


@dataclass
class SensorHistoryEntry:
    timestamp: float
    state: SensorState
    reason: str


class SensorFaultSimulator:
    """
    Per-sensor device-level fault simulator for IR parking sensors.

    Tracks device health state (OPERATIONAL/DEGRADED/OFFLINE/MAINTENANCE)
    independently of occupancy state. Provides helpers for suppressing
    events (OFFLINE/MAINTENANCE), degrading confidence (DEGRADED),
    duplicating readings, and delaying transmissions.
    """

    def __init__(
        self,
        seed: int = 42,
        degraded_probability: float = 0.005,
        offline_probability: float = 0.002,
        maintenance_probability: float = 0.001,
        recovery_probability: float = 0.15,
        fault_min_duration: float = 30.0,
        fault_max_duration: float = 300.0,
        duplicate_probability: float = 0.03,
        delay_probability: float = 0.05,
        delay_max_seconds: float = 10.0,
        history_size: int = 50,
    ):
        self.rng = random.Random(seed)
        self.degraded_probability = degraded_probability
        self.offline_probability = offline_probability
        self.maintenance_probability = maintenance_probability
        self.recovery_probability = recovery_probability
        self.fault_min_duration = fault_min_duration
        self.fault_max_duration = fault_max_duration
        self.duplicate_probability = duplicate_probability
        self.delay_probability = delay_probability
        self.delay_max_seconds = delay_max_seconds
        self.history_size = history_size

        self._states: Dict[str, SensorState] = {}
        self._fault_start: Dict[str, float] = {}
        self._history: Dict[str, Deque[SensorHistoryEntry]] = {}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def tick(self, sensor_id: str, now: Optional[float] = None) -> SensorState:
        """Advance the device state machine for one simulation tick.

        Returns the sensor's current state after the tick.
        """
        if now is None:
            now = time.monotonic()

        current = self._states.get(sensor_id, SensorState.OPERATIONAL)

        if current == SensorState.OPERATIONAL:
            new_state = self._tick_operational(sensor_id, now)
        elif current == SensorState.DEGRADED:
            new_state = self._tick_degraded(sensor_id, now)
        elif current == SensorState.OFFLINE:
            new_state = self._tick_offline(sensor_id, now)
        else:  # MAINTENANCE
            new_state = self._tick_maintenance(sensor_id, now)

        if new_state != current:
            self._transition(sensor_id, new_state, now)

        return new_state

    def get_state(self, sensor_id: str) -> SensorState:
        return self._states.get(sensor_id, SensorState.OPERATIONAL)

    def should_emit(self, sensor_id: str) -> bool:
        """Return False when the sensor is OFFLINE or in MAINTENANCE — suppress event."""
        return self.get_state(sensor_id) not in (
            SensorState.OFFLINE,
            SensorState.MAINTENANCE,
        )

    def confidence_modifier(self, sensor_id: str) -> Optional[float]:
        """Return a confidence score [0,1] for DEGRADED sensors; None otherwise.

        Callers include this in the event payload to signal reduced read quality.
        """
        if self.get_state(sensor_id) == SensorState.DEGRADED:
            return round(self.rng.uniform(0.45, 0.79), 4)
        return None

    def should_duplicate(self, sensor_id: str) -> bool:
        """Return True if this reading should be published a second time.

        Only applies to DEGRADED sensors — simulates duplicate transmissions.
        """
        if self.get_state(sensor_id) != SensorState.DEGRADED:
            return False
        return self.rng.random() < self.duplicate_probability

    def get_delay(self, sensor_id: str) -> float:
        """Return extra seconds to delay before publishing this reading (0.0 = no delay).

        Only applies to DEGRADED sensors — simulates delayed transmissions.
        """
        if self.get_state(sensor_id) != SensorState.DEGRADED:
            return 0.0
        if self.rng.random() < self.delay_probability:
            return self.rng.uniform(0.5, self.delay_max_seconds)
        return 0.0

    def force_state(
        self, sensor_id: str, state: SensorState, now: Optional[float] = None
    ) -> None:
        """Directly set sensor device state — useful for tests and manual overrides."""
        if now is None:
            now = time.monotonic()
        if state in (
            SensorState.OFFLINE,
            SensorState.MAINTENANCE,
            SensorState.DEGRADED,
        ):
            self._fault_start[sensor_id] = now
        else:
            self._fault_start.pop(sensor_id, None)
        self._transition(sensor_id, state, now)

    def get_history(self, sensor_id: str) -> List[SensorHistoryEntry]:
        return list(self._history.get(sensor_id, deque()))

    # ------------------------------------------------------------------
    # State transition helpers
    # ------------------------------------------------------------------

    def _tick_operational(self, sensor_id: str, now: float) -> SensorState:
        roll = self.rng.random()
        if roll < self.offline_probability:
            self._fault_start[sensor_id] = now
            return SensorState.OFFLINE
        roll -= self.offline_probability
        if roll < self.maintenance_probability:
            self._fault_start[sensor_id] = now
            return SensorState.MAINTENANCE
        roll -= self.maintenance_probability
        if roll < self.degraded_probability:
            self._fault_start[sensor_id] = now
            return SensorState.DEGRADED
        return SensorState.OPERATIONAL

    def _tick_degraded(self, sensor_id: str, now: float) -> SensorState:
        fault_start = self._fault_start.get(sensor_id, now)
        elapsed = now - fault_start

        if elapsed >= self.fault_max_duration:
            self._fault_start.pop(sensor_id, None)
            return SensorState.OPERATIONAL

        # DEGRADED can escalate to OFFLINE
        if self.rng.random() < self.offline_probability:
            self._fault_start[sensor_id] = now
            return SensorState.OFFLINE

        if elapsed >= self.fault_min_duration and self.rng.random() < self.recovery_probability:
            self._fault_start.pop(sensor_id, None)
            return SensorState.OPERATIONAL

        return SensorState.DEGRADED

    def _tick_offline(self, sensor_id: str, now: float) -> SensorState:
        fault_start = self._fault_start.get(sensor_id, now)
        elapsed = now - fault_start

        if elapsed < self.fault_min_duration:
            return SensorState.OFFLINE

        if elapsed >= self.fault_max_duration:
            self._fault_start.pop(sensor_id, None)
            return SensorState.OPERATIONAL

        if self.rng.random() < self.recovery_probability:
            self._fault_start.pop(sensor_id, None)
            return SensorState.OPERATIONAL

        return SensorState.OFFLINE

    def _tick_maintenance(self, sensor_id: str, now: float) -> SensorState:
        fault_start = self._fault_start.get(sensor_id, now)
        elapsed = now - fault_start

        if elapsed < self.fault_min_duration:
            return SensorState.MAINTENANCE

        if elapsed >= self.fault_max_duration:
            self._fault_start.pop(sensor_id, None)
            return SensorState.OPERATIONAL

        if self.rng.random() < self.recovery_probability:
            self._fault_start.pop(sensor_id, None)
            return SensorState.OPERATIONAL

        return SensorState.MAINTENANCE

    def _transition(self, sensor_id: str, new_state: SensorState, now: float) -> None:
        old_state = self._states.get(sensor_id, SensorState.OPERATIONAL)
        self._states[sensor_id] = new_state
        if sensor_id not in self._history:
            self._history[sensor_id] = deque(maxlen=self.history_size)
        self._history[sensor_id].append(
            SensorHistoryEntry(
                timestamp=now,
                state=new_state,
                reason=f"{old_state.value}_to_{new_state.value}",
            )
        )
