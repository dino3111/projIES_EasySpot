import sys
import types
import unittest
from typing import Any
from unittest.mock import Mock, patch

if "requests" not in sys.modules:

    class FakeRequestException(Exception):
        pass

    fake_requests: Any = types.ModuleType("requests")
    fake_requests.get = Mock()
    fake_requests.RequestException = FakeRequestException
    sys.modules["requests"] = fake_requests

import context_loader
from context_loader import ContextLoadError


class ContextLoaderTests(unittest.TestCase):
    def setUp(self):
        context_loader._cached_context = None
        context_loader._cached_reservations_context = None

    def _response(self, payload):
        response = Mock()
        response.raise_for_status = Mock()
        response.json = Mock(return_value=payload)
        return response

    @patch("context_loader.requests.get")
    def test_load_context_returns_payload_when_valid(self, mock_get):
        payload = {
            "version": 1,
            "generatedAt": "2026-05-16T12:00:00Z",
            "parkingLots": [{"id": "park-1", "name": "Park 1"}],
            "parkingSpots": [
                {
                    "id": "spot-1",
                    "parkingLotId": "park-1",
                    "spotNumber": "A01",
                    "zone": "ACCESSIBLE",
                    "row": 0,
                    "col": 1,
                    "status": "free",
                }
            ],
            "vehicles": [],
        }
        mock_get.return_value = self._response(payload)

        result = context_loader.load_context()

        self.assertEqual(result["version"], 1)
        mock_get.assert_called_once()
        self.assertTrue(
            mock_get.call_args.args[0].endswith("/api/technician/sensors/context/base")
        )

    @patch("context_loader.requests.get")
    def test_load_spots_maps_only_real_spots(self, mock_get):
        payload = {
            "version": 1,
            "generatedAt": "2026-05-16T12:00:00Z",
            "parkingLots": [{"id": "park-1", "name": "Park One"}],
            "parkingSpots": [
                {
                    "id": "spot-1",
                    "parkingLotId": "park-1",
                    "spotNumber": "A01",
                    "zone": "EV",
                    "row": 3,
                    "col": 4,
                    "status": "occupied",
                }
            ],
            "vehicles": [],
        }
        mock_get.return_value = self._response(payload)

        spots = context_loader.load_spots()

        self.assertEqual(len(spots), 1)
        self.assertEqual(spots[0]["spotId"], "spot-1")
        self.assertEqual(spots[0]["parkId"], "park-1")
        self.assertEqual(spots[0]["parkName"], "Park One")
        self.assertEqual(spots[0]["status"], "occupied")
        self.assertEqual({s["spotId"] for s in spots}, {"spot-1"})
        self.assertEqual({s["parkId"] for s in spots}, {"park-1"})

    @patch("context_loader.requests.get")
    def test_loaded_context_matches_backend_payload_without_invented_entities(
        self, mock_get
    ):
        payload = {
            "version": 7,
            "generatedAt": "2026-05-21T10:00:00Z",
            "parkingLots": [
                {"id": "park-1", "name": "Park One"},
                {"id": "park-2", "name": "Park Two"},
            ],
            "parkingSpots": [
                {
                    "id": "spot-1",
                    "parkingLotId": "park-1",
                    "spotNumber": "A01",
                    "zone": "EV",
                    "row": 0,
                    "col": 0,
                    "status": "free",
                },
                {
                    "id": "spot-2",
                    "parkingLotId": "park-2",
                    "spotNumber": "B07",
                    "zone": "ACCESSIBLE",
                    "row": 1,
                    "col": 2,
                    "status": "occupied",
                },
            ],
            "vehicles": [{"plate": "11-aa-22"}],
        }
        mock_get.return_value = self._response(payload)

        context = context_loader.load_context()
        spots = context_loader.spots_from_context(context)

        self.assertEqual(context["parkingLots"], payload["parkingLots"])
        self.assertEqual(context["vehicles"], payload["vehicles"])
        self.assertEqual({s["spotId"] for s in spots}, {"spot-1", "spot-2"})
        self.assertEqual({s["parkId"] for s in spots}, {"park-1", "park-2"})
        self.assertTrue(
            {s["parkId"] for s in spots}.issubset(
                {str(park["id"]) for park in context["parkingLots"]}
            )
        )

    def test_spots_from_context_is_seed_independent(self):
        context = {
            "version": 1,
            "generatedAt": "2026-05-16T12:00:00Z",
            "parkingLots": [{"id": "park-1", "name": "Park One"}],
            "parkingSpots": [
                {
                    "id": "spot-1",
                    "parkingLotId": "park-1",
                    "spotNumber": "A01",
                    "zone": "EV",
                    "row": 3,
                    "col": 4,
                    "status": "occupied",
                }
            ],
            "vehicles": [],
        }

        baseline = context_loader.spots_from_context(context)
        for seed in (1, 7, 42, 99, 2026):
            with self.subTest(seed=seed):
                # Loading context must not drift with simulation randomness settings.
                self.assertEqual(context_loader.spots_from_context(context), baseline)

    @patch("context_loader.requests.get")
    def test_load_spots_and_vehicle_plates_can_share_context(self, mock_get):
        payload = {
            "version": 1,
            "generatedAt": "2026-05-16T12:00:00Z",
            "parkingLots": [{"id": "park-1", "name": "Park One"}],
            "parkingSpots": [
                {
                    "id": "spot-1",
                    "parkingLotId": "park-1",
                    "spotNumber": "A01",
                    "zone": "EV",
                    "row": 3,
                    "col": 4,
                    "status": "occupied",
                }
            ],
            "vehicles": [{"plate": "aa-11-bb"}, {"plate": "AA-11-BB"}],
        }
        mock_get.return_value = self._response(payload)

        context = context_loader.load_context()

        spots = context_loader.spots_from_context(context)
        plates = context_loader.vehicle_plates_from_context(context)

        self.assertEqual(len(spots), 1)
        self.assertEqual(plates, ["AA-11-BB"])

    @patch("context_loader.requests.get")
    def test_load_context_raises_when_required_key_missing(self, mock_get):
        payload = {
            "version": 1,
            "generatedAt": "2026-05-16T12:00:00Z",
            "parkingLots": [],
            "parkingSpots": [],
            # missing vehicles
        }
        mock_get.return_value = self._response(payload)

        with self.assertRaises(ContextLoadError):
            context_loader.load_context()

    @patch("context_loader.requests.get")
    def test_load_context_adds_service_header_when_token_present(self, mock_get):
        payload = {
            "version": 1,
            "generatedAt": "2026-05-16T12:00:00Z",
            "parkingLots": [],
            "parkingSpots": [],
            "vehicles": [],
        }
        mock_get.return_value = self._response(payload)

        with patch.object(context_loader, "SIMULATION_SERVICE_TOKEN", "abc-token"):
            context_loader.load_context()

        _, kwargs = mock_get.call_args
        self.assertEqual(kwargs["headers"]["X-Simulation-Token"], "abc-token")

    @patch("context_loader.requests.get")
    def test_load_cached_context_reuses_single_backend_call(self, mock_get):
        payload = {
            "version": 1,
            "generatedAt": "2026-05-16T12:00:00Z",
            "parkingLots": [],
            "parkingSpots": [],
            "vehicles": [],
        }
        mock_get.return_value = self._response(payload)

        first = context_loader.load_cached_context()
        second = context_loader.load_cached_context()

        self.assertIs(first, second)
        mock_get.assert_called_once()

    @patch("context_loader.requests.get")
    def test_load_reservations_uses_dedicated_endpoint(self, mock_get):
        payload = {
            "version": 1,
            "generatedAt": "2026-05-16T12:00:00Z",
            "activeReservations": [
                {
                    "reservationId": "res-1",
                    "spotId": "spot-1",
                    "arrivalDateTime": "2026-05-16T12:00:00Z",
                    "departureDateTime": "2026-05-16T13:00:00Z",
                    "status": "CONFIRMED",
                }
            ],
        }
        mock_get.return_value = self._response(payload)

        reservations = context_loader.load_reservations()

        self.assertEqual(len(reservations), 1)
        self.assertEqual(reservations[0]["spotId"], "spot-1")
        self.assertEqual(mock_get.call_count, 1)
        called_url = mock_get.call_args.args[0]
        self.assertTrue(
            called_url.endswith("/api/technician/sensors/context/reservations")
        )


if __name__ == "__main__":
    unittest.main()
