import json

from config import KAFKA_BOOTSTRAP_SERVERS
from kafka import KafkaProducer


class KafkaPublisher:
    def __init__(self):
        self.producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda value: json.dumps(value).encode("utf-8"),
            key_serializer=lambda key: str(key).encode("utf-8"),
            acks="all",
        )

    def publish(self, topic, key, value):
        self.producer.send(topic=topic, key=key, value=value)

    def flush(self):
        self.producer.flush()
