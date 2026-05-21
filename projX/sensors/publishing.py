"""
Stateless publish helpers with no Kafka import dependency.

Extracted as a separate module so they can be unit-tested without a broker.
"""

import random


class NetworkFaultInjector:
    """Injects realistic transport anomalies for IoT events."""

    def __init__(
        self,
        seed=42,
        out_of_order_probability=0.0,
        drop_probability=0.0,
        drop_burst_min_seconds=0.0,
        drop_burst_max_seconds=0.0,
    ):
        self.rng = random.Random(seed)
        self.out_of_order_probability = out_of_order_probability
        self.drop_probability = drop_probability
        self.drop_burst_min_seconds = drop_burst_min_seconds
        self.drop_burst_max_seconds = drop_burst_max_seconds
        self._drop_until = {}

    def should_drop(self, key, now_mono):
        drop_until = self._drop_until.get(key)
        if drop_until is not None and now_mono < drop_until:
            return True
        if self.rng.random() < self.drop_probability:
            duration = self._burst_duration()
            if duration > 0:
                self._drop_until[key] = now_mono + duration
            return True
        return False

    def maybe_reorder(self, pending):
        if len(pending) < 2:
            return
        if self.rng.random() >= self.out_of_order_probability:
            return
        i = self.rng.randrange(len(pending))
        j = self.rng.randrange(len(pending))
        if i != j:
            pending[i], pending[j] = pending[j], pending[i]

    def _burst_duration(self):
        hi = max(self.drop_burst_min_seconds, self.drop_burst_max_seconds)
        lo = min(self.drop_burst_min_seconds, self.drop_burst_max_seconds)
        if hi <= 0:
            return 0.0
        return self.rng.uniform(lo, hi)


def flush_pending(pending_delayed, publisher, topic, now_mono, network_faults=None):
    """Publish any queued events whose delay has elapsed; return the remainder."""
    if network_faults is not None:
        network_faults.maybe_reorder(pending_delayed)
    still_pending = []
    for event, key, publish_at in pending_delayed:
        if now_mono >= publish_at:
            if network_faults is not None and network_faults.should_drop(key, now_mono):
                continue
            publisher.publish(topic, key, event)
        else:
            still_pending.append((event, key, publish_at))
    return still_pending


def schedule_publish(
    topic,
    key,
    event,
    delay,
    should_dup,
    publisher,
    pending,
    now_mono,
    network_faults=None,
):
    """Publish or queue an event (and its optional duplicate) consistently.

    Both the original and the duplicate follow the same delay path so a
    duplicate can never arrive before the original it copies.
    """
    if delay > 0:
        pending.append((event, key, now_mono + delay))
        if should_dup:
            pending.append((event, key, now_mono + delay))
    else:
        if network_faults is not None and network_faults.should_drop(key, now_mono):
            return
        publisher.publish(topic, key, event)
        if should_dup:
            if network_faults is not None and network_faults.should_drop(key, now_mono):
                return
            publisher.publish(topic, key, event)
