# isort: skip_file
import sys
import unittest

sys.path.insert(0, ".")

from ocr_event_builder import (  # noqa: E402
    OcrEventGenerator,
    OcrFailureMode,
    build_ocr_failure_event,
)


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


def _spots(n=10):
    return [
        {
            "spotId": f"spot-{i}",
            "parkId": "park-1",
            "parkName": "Park",
            "spotNumber": f"A{i:02d}",
            "zone": "STANDARD",
            "row": 1,
            "col": i,
        }
        for i in range(1, n + 1)
    ]


class FailureEventBuilderTests(unittest.TestCase):
    def test_unreadable_event_has_failure_mode(self):
        event = build_ocr_failure_event(_spot(), OcrFailureMode.UNREADABLE)
        self.assertEqual(event["eventType"], "ocr.plate.failure")
        self.assertEqual(event["payload"]["failureMode"], "UNREADABLE")
        self.assertEqual(event["payload"]["plate"], "")
        self.assertEqual(event["payload"]["confidence"], 0.0)

    def test_low_confidence_event(self):
        event = build_ocr_failure_event(
            _spot(), OcrFailureMode.LOW_CONFIDENCE, plate="AB-12-CD", confidence=0.23
        )
        self.assertEqual(event["payload"]["failureMode"], "LOW_CONFIDENCE")
        self.assertEqual(event["payload"]["plate"], "AB-12-CD")
        self.assertLess(event["payload"]["confidence"], 0.5)

    def test_wrong_plate_event(self):
        event = build_ocr_failure_event(
            _spot(), OcrFailureMode.WRONG_PLATE, plate="A1-12-CD", confidence=0.61
        )
        self.assertEqual(event["payload"]["failureMode"], "WRONG_PLATE")
        self.assertEqual(event["payload"]["plate"], "A1-12-CD")

    def test_camera_offline_event(self):
        event = build_ocr_failure_event(_spot(), OcrFailureMode.CAMERA_OFFLINE)
        self.assertEqual(event["payload"]["failureMode"], "CAMERA_OFFLINE")
        self.assertEqual(event["payload"]["plate"], "")
        self.assertEqual(event["payload"]["confidence"], 0.0)

    def test_camera_degraded_event(self):
        event = build_ocr_failure_event(
            _spot(), OcrFailureMode.CAMERA_DEGRADED, plate="AB-12-CD", confidence=0.48
        )
        self.assertEqual(event["payload"]["failureMode"], "CAMERA_DEGRADED")
        self.assertLessEqual(event["payload"]["confidence"], 0.65)

    def test_failure_event_distinguishable_from_normal(self):
        """eventType differs — failure is never mistaken for absence of event."""
        failure = build_ocr_failure_event(_spot(), OcrFailureMode.UNREADABLE)
        self.assertEqual(failure["eventType"], "ocr.plate.failure")
        self.assertNotEqual(failure["eventType"], "ocr.plate.read")

    def test_failure_event_has_required_fields(self):
        event = build_ocr_failure_event(_spot(), OcrFailureMode.UNREADABLE)
        for field in ("eventId", "eventType", "parkId", "spotId", "occurredAt", "payload", "version"):
            self.assertIn(field, event)
        for field in ("plate", "confidence", "direction", "failureMode"):
            self.assertIn(field, event["payload"])


class OcrGeneratorFailureModeTests(unittest.TestCase):
    PLATES = ["AA-00-00", "BB-11-11", "CC-22-22", "DD-33-33", "EE-44-44"]

    def test_camera_offline_emits_failure_event(self):
        spots = _spots(5)
        gen = OcrEventGenerator(spots, seed=1, registered_plates=self.PLATES)
        gen.set_camera_offline("spot-1")

        failure_events = []
        for _ in range(20):
            for event, spot_id in gen.next_events():
                if spot_id == "spot-1":
                    failure_events.append(event)

        self.assertTrue(len(failure_events) > 0, "Offline camera produced no events")
        for e in failure_events:
            self.assertEqual(e["eventType"], "ocr.plate.failure")
            self.assertEqual(e["payload"]["failureMode"], "CAMERA_OFFLINE")

    def test_camera_offline_no_plate_reads(self):
        """Offline camera must never produce a normal plate.read event."""
        spots = _spots(5)
        gen = OcrEventGenerator(spots, seed=2, registered_plates=self.PLATES)
        gen.set_camera_offline("spot-2")

        for _ in range(30):
            for event, spot_id in gen.next_events():
                if spot_id == "spot-2":
                    self.assertNotEqual(event["eventType"], "ocr.plate.read")

    def test_failure_rate_produces_failure_events(self):
        spots = _spots(10)
        gen = OcrEventGenerator(
            spots, seed=42, registered_plates=self.PLATES, failure_rate=1.0
        )
        failure_events = []
        normal_events = []
        for _ in range(50):
            for event, _ in gen.next_events():
                if event["eventType"] == "ocr.plate.failure":
                    failure_events.append(event)
                else:
                    normal_events.append(event)

        self.assertGreater(len(failure_events), 0, "failure_rate=1.0 produced no failures")

    def test_failure_events_have_failure_mode_field(self):
        spots = _spots(10)
        gen = OcrEventGenerator(
            spots, seed=7, registered_plates=self.PLATES, failure_rate=1.0
        )
        for _ in range(20):
            for event, _ in gen.next_events():
                if event["eventType"] == "ocr.plate.failure":
                    self.assertIn("failureMode", event["payload"])
                    self.assertIn(
                        event["payload"]["failureMode"],
                        {"UNREADABLE", "LOW_CONFIDENCE", "WRONG_PLATE", "CAMERA_DEGRADED"},
                    )

    def test_recovery_restores_normal_reads(self):
        """After recover_camera(), spot must produce normal reads again."""
        spots = _spots(5)
        gen = OcrEventGenerator(
            spots, seed=99, registered_plates=self.PLATES, failure_rate=0.0
        )
        gen.set_camera_offline("spot-3")

        # Confirm offline produces only failures
        for _ in range(10):
            for event, spot_id in gen.next_events():
                if spot_id == "spot-3":
                    self.assertEqual(event["eventType"], "ocr.plate.failure")

        gen.recover_camera("spot-3")

        # After recovery, spot-3 must be able to produce normal reads
        normal_after_recovery = [
            event
            for _ in range(50)
            for event, spot_id in gen.next_events()
            if spot_id == "spot-3" and event["eventType"] == "ocr.plate.read"
        ]
        self.assertGreater(
            len(normal_after_recovery), 0,
            "No normal reads after camera recovery",
        )

    def test_degraded_camera_confidence_range(self):
        """Degraded camera reads must fall in 0.30–0.65 range."""
        spots = _spots(5)
        gen = OcrEventGenerator(
            spots, seed=10, registered_plates=self.PLATES, failure_rate=0.0
        )
        gen.set_camera_degraded("spot-1")

        confidences = []
        for _ in range(100):
            for event, spot_id in gen.next_events():
                if spot_id == "spot-1" and event["eventType"] == "ocr.plate.read":
                    confidences.append(event["payload"]["confidence"])

        self.assertTrue(len(confidences) > 0, "No reads from degraded camera")
        for c in confidences:
            self.assertGreaterEqual(c, 0.30, f"Confidence {c} below degraded floor")
            self.assertLessEqual(c, 0.65, f"Confidence {c} above degraded ceiling")

    def test_recovery_from_degraded(self):
        spots = _spots(5)
        gen = OcrEventGenerator(
            spots, seed=55, registered_plates=self.PLATES, failure_rate=0.0
        )
        gen.set_camera_degraded("spot-2")
        gen.recover_camera("spot-2")

        # After recovery degraded_spots must not contain spot-2
        self.assertNotIn("spot-2", gen.degraded_spots)
        self.assertNotIn("spot-2", gen.offline_spots)

    def test_failure_is_not_absence_of_event(self):
        """CAMERA_OFFLINE emits an explicit failure event — not silence."""
        spots = _spots(3)
        gen = OcrEventGenerator(
            spots, seed=13, registered_plates=self.PLATES, failure_rate=0.0
        )
        gen.set_camera_offline("spot-1")

        spot1_events = [
            event
            for _ in range(30)
            for event, spot_id in gen.next_events()
            if spot_id == "spot-1"
        ]
        self.assertGreater(len(spot1_events), 0, "Offline camera emitted zero events (silent failure)")

    def test_zero_failure_rate_produces_no_failures(self):
        spots = _spots(10)
        gen = OcrEventGenerator(
            spots, seed=3, registered_plates=self.PLATES, failure_rate=0.0
        )
        for _ in range(50):
            for event, _ in gen.next_events():
                self.assertEqual(event["eventType"], "ocr.plate.read")


if __name__ == "__main__":
    unittest.main()
