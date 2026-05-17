# isort: skip_file
import random
import re
import sys
import unittest

sys.path.insert(0, ".")

from ocr_event_builder import (  # noqa: E402
    OcrEventGenerator,
    _random_pt_plate,
    build_ocr_event,
)

PT_PLATE_RE = re.compile(
    r"^([A-Z]{2}-\d{2}-\d{2}|"  # AA-00-00
    r"\d{2}-[A-Z]{2}-\d{2}|"  # 00-AA-00
    r"\d{2}-\d{2}-[A-Z]{2}|"  # 00-00-AA
    r"[A-Z]{2}-\d{2}-[A-Z]{2})$"  # AA-00-AA
)


class PlateFormatTests(unittest.TestCase):
    def test_plate_format_matches_any_pt_format(self):
        rng = random.Random(1)
        for _ in range(200):
            plate = _random_pt_plate(rng)
            self.assertRegex(plate, PT_PLATE_RE, f"Bad plate: {plate}")

    def test_all_four_formats_are_generated(self):
        """Verify all 4 PT formats appear given enough samples."""
        rng = random.Random(42)
        plates = [_random_pt_plate(rng) for _ in range(500)]

        aa0000 = sum(1 for p in plates if re.match(r"^[A-Z]{2}-\d{2}-\d{2}$", p))
        a00a00 = sum(1 for p in plates if re.match(r"^\d{2}-[A-Z]{2}-\d{2}$", p))
        a0000a = sum(1 for p in plates if re.match(r"^\d{2}-\d{2}-[A-Z]{2}$", p))
        aa00aa = sum(1 for p in plates if re.match(r"^[A-Z]{2}-\d{2}-[A-Z]{2}$", p))

        self.assertGreater(aa0000, 0, "AA-00-00 never generated")
        self.assertGreater(a00a00, 0, "00-AA-00 never generated")
        self.assertGreater(a0000a, 0, "00-00-AA never generated")
        self.assertGreater(aa00aa, 0, "AA-00-AA never generated")


class OcrEventBuilderTests(unittest.TestCase):
    def _spot(self, spot_id="spot-1", park_id="park-1"):
        return {
            "spotId": spot_id,
            "parkId": park_id,
            "parkName": "Test Park",
            "spotNumber": "A01",
            "zone": "STANDARD",
            "row": 1,
            "col": 1,
        }

    def test_build_ocr_event_has_required_fields(self):
        event = build_ocr_event(self._spot(), "entry", "AB-12-CD", 0.95)
        self.assertEqual(event["eventType"], "ocr.plate.read")
        self.assertEqual(event["parkId"], "park-1")
        self.assertEqual(event["spotId"], "spot-1")
        self.assertEqual(event["payload"]["plate"], "AB-12-CD")
        self.assertEqual(event["payload"]["direction"], "entry")
        self.assertAlmostEqual(event["payload"]["confidence"], 0.95, places=2)
        self.assertIn("occurredAt", event)
        self.assertEqual(event["version"], 1)

    def test_build_ocr_event_exit(self):
        event = build_ocr_event(self._spot(), "exit", "EF-34-GH", 0.80)
        self.assertEqual(event["payload"]["direction"], "exit")

    def test_confidence_rounded_to_4_decimals(self):
        event = build_ocr_event(self._spot(), "entry", "ZZ-99-ZZ", 0.123456789)
        self.assertEqual(event["payload"]["confidence"], round(0.123456789, 4))


class OcrEventGeneratorTests(unittest.TestCase):
    def _spots(self, n=5):
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

    def test_next_events_returns_list(self):
        gen = OcrEventGenerator(self._spots(), seed=42)
        events = gen.next_events()
        self.assertIsInstance(events, list)

    def test_events_have_valid_direction(self):
        gen = OcrEventGenerator(self._spots(10), seed=7)
        for _ in range(20):
            for event, _ in gen.next_events():
                direction = event["payload"]["direction"]
                self.assertIn(direction, ("entry", "exit"))

    def test_entry_before_exit_consistency(self):
        """A plate that exited must have entered first — no exit without prior entry."""
        gen = OcrEventGenerator(self._spots(10), seed=99)
        seen_entry = set()
        for _ in range(100):
            for event, _ in gen.next_events():
                plate = event["payload"]["plate"]
                direction = event["payload"]["direction"]
                if direction == "exit":
                    self.assertIn(
                        plate, seen_entry,
                        f"Exit event for plate {plate} without prior entry"
                    )
                else:
                    seen_entry.add(plate)

    def test_multiple_ticks_produce_events(self):
        gen = OcrEventGenerator(self._spots(20), seed=1)
        total = sum(len(gen.next_events()) for _ in range(50))
        self.assertGreater(total, 0)

    def test_generator_supports_multiple_vehicles_simultaneously(self):
        """Multiple vehicles can be parked at the same time."""
        gen = OcrEventGenerator(self._spots(20), seed=5)
        for _ in range(30):
            gen.next_events()
        self.assertGreater(len(gen._parked), 0)


if __name__ == "__main__":
    unittest.main()
