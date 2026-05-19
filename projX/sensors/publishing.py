"""
Stateless publish helpers with no Kafka import dependency.

Extracted as a separate module so they can be unit-tested without a broker.
"""


def flush_pending(pending_delayed, publisher, topic, now_mono):
    """Publish any queued events whose delay has elapsed; return the remainder."""
    still_pending = []
    for event, key, publish_at in pending_delayed:
        if now_mono >= publish_at:
            publisher.publish(topic, key, event)
        else:
            still_pending.append((event, key, publish_at))
    return still_pending


def schedule_publish(
    topic, key, event, delay, should_dup, publisher, pending, now_mono
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
        publisher.publish(topic, key, event)
        if should_dup:
            publisher.publish(topic, key, event)
