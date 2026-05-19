# isort: skip_file
import sys
import unittest

sys.path.insert(0, ".")

from ir_sensor_event_builder import (  # noqa: E402
    SensorEventType,
    build_absence_event,
    build_heartbeat_event,
    build_presence_event,
    events_for_transition,
    is_offline,
    is_presence,
    sensor_id_for_spot,
)

_SPOT = {
    "spotId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "parkId": "park-001",
    "parkName": "Test Park",
    "spotNumber": "A01",
    "zone": "STANDARD",
    "row": 1,
    "col": 2,
}


class TestSensorIdForSpot(unittest.TestCase):
    def test_prefix_is_IR(self):
        sid = sensor_id_for_spot("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
        self.assertTrue(sid.startswith("IR-"))

    def test_dashes_stripped(self):
        sid = sensor_id_for_spot("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
        # dashes removed before truncation
        self.assertNotIn("-", sid[3:])

    def test_length_capped_at_16_hex_chars(self):
        sid = sensor_id_for_spot("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
        self.assertEqual(len(sid), len("IR-") + 16)

    def test_same_uuid_same_id(self):
        spot_id = "11111111-2222-3333-4444-555555555555"
        self.assertEqual(sensor_id_for_spot(spot_id), sensor_id_for_spot(spot_id))

    def test_different_uuids_different_ids(self):
        # UUIDs that differ in the first 16 hex chars (before truncation)
        a = sensor_id_for_spot("aaaaaaaa-0000-0000-0000-000000000000")
        b = sensor_id_for_spot("bbbbbbbb-0000-0000-0000-000000000000")
        self.assertNotEqual(a, b)


class TestIsPresence(unittest.TestCase):
    def test_occupied_is_presence(self):
        self.assertTrue(is_presence("occupied"))

    def test_free_not_presence(self):
        self.assertFalse(is_presence("free"))

    def test_reserved_not_presence(self):
        self.assertFalse(is_presence("reserved"))

    def test_out_of_service_not_presence(self):
        self.assertFalse(is_presence("out_of_service"))


class TestIsOffline(unittest.TestCase):
    def test_out_of_service_is_offline(self):
        self.assertTrue(is_offline("out_of_service"))

    def test_occupied_not_offline(self):
        self.assertFalse(is_offline("occupied"))

    def test_free_not_offline(self):
        self.assertFalse(is_offline("free"))

    def test_reserved_not_offline(self):
        self.assertFalse(is_offline("reserved"))


class TestEventPayloadShape(unittest.TestCase):
    def _check_shape(self, event, expected_type):
        self.assertIn("eventId", event)
        self.assertIn("eventType", event)
        self.assertEqual(event["eventType"], expected_type)
        self.assertIn("sensorId", event)
        self.assertIn("spotId", event)
        self.assertIn("parkId", event)
        self.assertIn("occurredAt", event)
        self.assertIn("payload", event)
        self.assertEqual(event["version"], 1)

        p = event["payload"]
        self.assertEqual(p["sensorId"], event["sensorId"])
        self.assertEqual(p["spotId"], _SPOT["spotId"])
        self.assertEqual(p["parkId"], _SPOT["parkId"])
        self.assertEqual(p["parkName"], _SPOT["parkName"])
        self.assertEqual(p["spotNumber"], _SPOT["spotNumber"])
        self.assertEqual(p["zone"], _SPOT["zone"])
        self.assertEqual(p["row"], _SPOT["row"])
        self.assertEqual(p["col"], _SPOT["col"])

    def test_presence_event_shape(self):
        self._check_shape(build_presence_event(_SPOT), SensorEventType.PRESENCE.value)

    def test_absence_event_shape(self):
        self._check_shape(build_absence_event(_SPOT), SensorEventType.ABSENCE.value)

    def test_heartbeat_event_shape(self):
        self._check_shape(build_heartbeat_event(_SPOT), SensorEventType.HEARTBEAT.value)

    def test_event_ids_are_unique(self):
        a = build_presence_event(_SPOT)
        b = build_presence_event(_SPOT)
        self.assertNotEqual(a["eventId"], b["eventId"])

    def test_sensor_id_matches_derivation(self):
        event = build_presence_event(_SPOT)
        self.assertEqual(event["sensorId"], sensor_id_for_spot(_SPOT["spotId"]))

    def test_occurred_at_ends_with_Z(self):
        event = build_heartbeat_event(_SPOT)
        self.assertTrue(event["occurredAt"].endswith("Z"))


class TestEventsForTransition(unittest.TestCase):
    def test_no_change_returns_empty(self):
        self.assertEqual(events_for_transition(_SPOT, "free", "free"), [])
        self.assertEqual(events_for_transition(_SPOT, "occupied", "occupied"), [])

    def test_free_to_occupied_returns_presence(self):
        evts = events_for_transition(_SPOT, "free", "occupied")
        self.assertEqual(len(evts), 1)
        self.assertEqual(evts[0]["eventType"], SensorEventType.PRESENCE.value)

    def test_reserved_to_occupied_returns_presence(self):
        evts = events_for_transition(_SPOT, "reserved", "occupied")
        self.assertEqual(len(evts), 1)
        self.assertEqual(evts[0]["eventType"], SensorEventType.PRESENCE.value)

    def test_occupied_to_free_returns_absence(self):
        evts = events_for_transition(_SPOT, "occupied", "free")
        self.assertEqual(len(evts), 1)
        self.assertEqual(evts[0]["eventType"], SensorEventType.ABSENCE.value)

    def test_occupied_to_reserved_returns_absence(self):
        evts = events_for_transition(_SPOT, "occupied", "reserved")
        self.assertEqual(len(evts), 1)
        self.assertEqual(evts[0]["eventType"], SensorEventType.ABSENCE.value)

    def test_free_to_reserved_returns_absence(self):
        evts = events_for_transition(_SPOT, "free", "reserved")
        self.assertEqual(len(evts), 1)
        self.assertEqual(evts[0]["eventType"], SensorEventType.ABSENCE.value)

    def test_to_out_of_service_returns_empty(self):
        # sensor goes offline — emits nothing
        self.assertEqual(events_for_transition(_SPOT, "free", "out_of_service"), [])
        self.assertEqual(events_for_transition(_SPOT, "occupied", "out_of_service"), [])
        self.assertEqual(events_for_transition(_SPOT, "reserved", "out_of_service"), [])

    def test_out_of_service_stays_offline_returns_empty(self):
        self.assertEqual(
            events_for_transition(_SPOT, "out_of_service", "out_of_service"), []
        )

    def test_out_of_service_to_free_returns_absence(self):
        # sensor recovered — emits ABSENCE (spot readable, cleared)
        evts = events_for_transition(_SPOT, "out_of_service", "free")
        self.assertEqual(len(evts), 1)
        self.assertEqual(evts[0]["eventType"], SensorEventType.ABSENCE.value)

    def test_out_of_service_to_reserved_returns_absence(self):
        evts = events_for_transition(_SPOT, "out_of_service", "reserved")
        self.assertEqual(len(evts), 1)
        self.assertEqual(evts[0]["eventType"], SensorEventType.ABSENCE.value)

    def test_out_of_service_to_occupied_returns_presence(self):
        # sensor recovered directly onto an occupied spot
        evts = events_for_transition(_SPOT, "out_of_service", "occupied")
        self.assertEqual(len(evts), 1)
        self.assertEqual(evts[0]["eventType"], SensorEventType.ABSENCE.value)


if __name__ == "__main__":
    unittest.main()
