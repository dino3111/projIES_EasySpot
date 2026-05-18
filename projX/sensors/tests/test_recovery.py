# isort: skip_file
import sys
import unittest

sys.path.insert(0, ".")

from event_builder import build_spot_event
from ocr_event_builder import (
    OcrEventGenerator,
    build_device_recovery_event,
    _ocr_sensor_id,
)
from state_machine import SpotStateMachine


def _spot(spot_id="spot-1", park_id="park-1"):
    return {
        "spotId": spot_id,
        "parkId": park_id,
        "parkName": "Test Park",
        "spotNumber": "A01",
        "zone": "STANDARD",
        "row": 1,
        "col": 1,
    }


def _spots(n=5, park_id="park-1"):
    return [
        {
            "spotId": f"spot-{i}",
            "parkId": park_id,
            "parkName": "Park",
            "spotNumber": f"A{i:02d}",
            "zone": "STANDARD",
            "row": 1,
            "col": i,
        }
        for i in range(1, n + 1)
    ]


class SpotRecoveryNotInstantaneousTests(unittest.TestCase):
    def test_fault_cannot_recover_before_min_duration(self):
        machine = SpotStateMachine(seed=42, fault_min_duration=100.0)
        machine._fault_start["spot-1"] = 0.0

        for _ in range(50):
            status, reason, duration = machine.next_status(
                "out_of_service", spot_id="spot-1", now=50.0
            )
            self.assertEqual(status, "out_of_service")
            self.assertEqual(reason, "still_faulty")
            self.assertIsNone(duration)

    def test_fault_stays_in_service_at_zero_elapsed(self):
        machine = SpotStateMachine(seed=1, fault_min_duration=30.0)
        machine._fault_start["spot-1"] = 100.0

        status, reason, _ = machine.next_status(
            "out_of_service", spot_id="spot-1", now=100.0
        )
        self.assertEqual(status, "out_of_service")


class SpotAutoRecoveryTests(unittest.TestCase):
    def test_auto_recovery_possible_after_min_duration(self):
        machine = SpotStateMachine(
            seed=1,
            fault_min_duration=10.0,
            fault_max_duration=300.0,
            technician_repair_probability=0.0,
        )
        machine._fault_start["spot-1"] = 0.0

        recovered = False
        for _ in range(60):
            status, reason, duration = machine.next_status(
                "out_of_service", spot_id="spot-1", now=200.0
            )
            if status == "free":
                self.assertEqual(reason, "AUTO_RECOVERY")
                self.assertIsNotNone(duration)
                self.assertAlmostEqual(duration, 200.0, places=1)
                recovered = True
                break
        self.assertTrue(recovered, "Expected AUTO_RECOVERY within 60 ticks")

    def test_technician_repair_recovery(self):
        machine = SpotStateMachine(
            seed=42,
            fault_min_duration=10.0,
            fault_max_duration=300.0,
            technician_repair_probability=1.0,
        )
        machine._fault_start["spot-1"] = 0.0

        recovered = False
        for _ in range(60):
            status, reason, duration = machine.next_status(
                "out_of_service", spot_id="spot-1", now=200.0
            )
            if status == "free":
                self.assertEqual(reason, "TECHNICIAN_REPAIR")
                recovered = True
                break
        self.assertTrue(recovered, "Expected TECHNICIAN_REPAIR within 60 ticks")

    def test_guaranteed_recovery_after_max_duration(self):
        machine = SpotStateMachine(fault_min_duration=10.0, fault_max_duration=100.0)
        machine._fault_start["spot-1"] = 0.0

        status, reason, duration = machine.next_status(
            "out_of_service", spot_id="spot-1", now=200.0
        )
        self.assertEqual(status, "free")
        self.assertEqual(reason, "TECHNICIAN_REPAIR")
        self.assertAlmostEqual(duration, 200.0, places=1)

    def test_fault_duration_is_reported_correctly(self):
        machine = SpotStateMachine(
            seed=1,
            fault_min_duration=0.0,
            fault_max_duration=1000.0,
            technician_repair_probability=0.0,
        )
        machine._fault_start["spot-1"] = 50.0

        for _ in range(60):
            status, _, duration = machine.next_status(
                "out_of_service", spot_id="spot-1", now=300.0
            )
            if status == "free":
                self.assertAlmostEqual(duration, 250.0, places=1)
                break

    def test_fault_tracking_cleared_after_recovery(self):
        machine = SpotStateMachine(
            seed=1, fault_min_duration=0.0, technician_repair_probability=0.0
        )
        machine._fault_start["spot-1"] = 0.0

        for _ in range(60):
            status, _, _ = machine.next_status(
                "out_of_service", spot_id="spot-1", now=100.0
            )
            if status == "free":
                self.assertNotIn("spot-1", machine._fault_start)
                break

    def test_multiple_spots_tracked_independently(self):
        machine = SpotStateMachine(
            seed=5,
            fault_min_duration=10.0,
            fault_max_duration=300.0,
            technician_repair_probability=0.0,
        )
        machine._fault_start["spot-A"] = 0.0
        machine._fault_start["spot-B"] = 0.0

        status_a, _, _ = machine.next_status(
            "out_of_service", spot_id="spot-A", now=5.0
        )
        status_b, _, _ = machine.next_status(
            "out_of_service", spot_id="spot-B", now=5.0
        )
        self.assertEqual(status_a, "out_of_service")
        self.assertEqual(status_b, "out_of_service")

    def test_non_recovery_transitions_return_none_duration(self):
        machine = SpotStateMachine(seed=42)

        _, _, dur = machine.next_status("free", spot_id="spot-x", now=0.0)
        self.assertIsNone(dur)


class SpotEventPayloadTests(unittest.TestCase):
    def test_auto_recovery_event_includes_recovery_metadata(self):
        event = build_spot_event(
            spot=_spot(),
            previous_status="out_of_service",
            new_status="free",
            reason="AUTO_RECOVERY",
            fault_duration_seconds=45.5,
        )
        self.assertEqual(event["payload"]["recoveryType"], "AUTO_RECOVERY")
        self.assertAlmostEqual(event["payload"]["faultDurationSeconds"], 45.5, places=1)

    def test_technician_repair_event_includes_recovery_metadata(self):
        event = build_spot_event(
            spot=_spot(),
            previous_status="out_of_service",
            new_status="free",
            reason="TECHNICIAN_REPAIR",
            fault_duration_seconds=120.0,
        )
        self.assertEqual(event["payload"]["recoveryType"], "TECHNICIAN_REPAIR")
        self.assertAlmostEqual(
            event["payload"]["faultDurationSeconds"], 120.0, places=1
        )

    def test_non_recovery_event_has_no_recovery_metadata(self):
        event = build_spot_event(
            spot=_spot(),
            previous_status="free",
            new_status="occupied",
            reason="vehicle_entered",
        )
        self.assertNotIn("recoveryType", event["payload"])
        self.assertNotIn("faultDurationSeconds", event["payload"])

    def test_recovery_event_without_duration_has_no_metadata(self):
        event = build_spot_event(
            spot=_spot(),
            previous_status="out_of_service",
            new_status="free",
            reason="AUTO_RECOVERY",
            fault_duration_seconds=None,
        )
        self.assertNotIn("recoveryType", event["payload"])
        self.assertNotIn("faultDurationSeconds", event["payload"])

    def test_fault_duration_rounded_to_two_decimals(self):
        event = build_spot_event(
            spot=_spot(),
            previous_status="out_of_service",
            new_status="free",
            reason="AUTO_RECOVERY",
            fault_duration_seconds=45.6789,
        )
        self.assertEqual(event["payload"]["faultDurationSeconds"], 45.68)


class OcrCameraRecoveryTests(unittest.TestCase):
    def test_camera_faults_emit_device_fault_event(self):
        gen = OcrEventGenerator(
            _spots(),
            seed=42,
            registered_plates=["AA-00-00", "BB-11-11"],
            fault_probability_per_tick=1.0,
            fault_min_duration=0.0,
        )

        events = gen.next_events(now=0.0)
        fault_events = [e for e, _ in events if e["eventType"] == "device.fault"]
        self.assertGreater(len(fault_events), 0)

    def test_camera_recovery_emits_device_recovery_event(self):
        gen = OcrEventGenerator(
            _spots(),
            seed=1,
            registered_plates=["AA-00-00", "BB-11-11"],
            fault_probability_per_tick=0.0,
            fault_min_duration=10.0,
            fault_max_duration=100.0,
            technician_repair_probability=0.0,
        )
        gen._camera_fault_start["park-1"] = 0.0

        events = gen.next_events(now=200.0)
        recovery_events = [e for e, _ in events if e["eventType"] == "device.recovery"]
        self.assertEqual(len(recovery_events), 1)
        ext = recovery_events[0]["payload"]["extensions"]
        self.assertEqual(ext["recoveryType"], "TECHNICIAN_REPAIR")
        self.assertAlmostEqual(ext["faultDurationSeconds"], 200.0, places=1)
        self.assertEqual(ext["deviceType"], "OCR_CAMERA")
        self.assertIn("deviceId", ext)

    def test_camera_offline_suppresses_plate_reads(self):
        gen = OcrEventGenerator(
            _spots(10),
            seed=7,
            registered_plates=["AA-00-00", "BB-11-11", "CC-22-22", "DD-33-33"],
            fault_probability_per_tick=0.0,
            fault_min_duration=60.0,
        )
        gen._camera_fault_start["park-1"] = 0.0

        events = gen.next_events(now=30.0)
        plate_reads = [e for e, _ in events if e["eventType"] == "ocr.plate.read"]
        self.assertEqual(len(plate_reads), 0)

    def test_camera_fault_tracking_cleared_after_recovery(self):
        gen = OcrEventGenerator(
            _spots(),
            seed=1,
            registered_plates=["AA-00-00", "BB-11-11"],
            fault_probability_per_tick=0.0,
            fault_min_duration=0.0,
            fault_max_duration=10.0,
        )
        gen._camera_fault_start["park-1"] = 0.0

        gen.next_events(now=50.0)
        self.assertNotIn("park-1", gen._camera_fault_start)

    def test_device_recovery_event_contains_valid_device_id(self):
        park_id = "550e8400-e29b-41d4-a716-446655440000"
        event = build_device_recovery_event(
            park_id=park_id,
            park_name="Parque Test",
            recovery_type="AUTO_RECOVERY",
            fault_duration_seconds=75.3,
        )
        expected_sensor_id = _ocr_sensor_id(park_id)
        self.assertEqual(event["payload"]["extensions"]["deviceId"], expected_sensor_id)
        self.assertTrue(expected_sensor_id.startswith("OCR-"))
        self.assertTrue(expected_sensor_id.endswith("-ENT1"))


if __name__ == "__main__":
    unittest.main()
