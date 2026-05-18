import time

import requests
from config import (
    BACKEND_BASE_URL,
    CONTEXT_LOAD_RETRIES,
    CONTEXT_RETRY_DELAY_SECONDS,
    SENSOR_CONTEXT_ENDPOINT,
    SIMULATION_SERVICE_TOKEN,
)


class ContextLoadError(RuntimeError):
    pass


def _headers():
    if SIMULATION_SERVICE_TOKEN:
        return {"X-Simulation-Token": SIMULATION_SERVICE_TOKEN}
    return {}


def load_context():
    last_error = None

    for attempt in range(1, CONTEXT_LOAD_RETRIES + 1):
        try:
            response = requests.get(
                f"{BACKEND_BASE_URL}{SENSOR_CONTEXT_ENDPOINT}",
                headers=_headers(),
                timeout=30,
            )
            response.raise_for_status()
            context = response.json()
            _validate_context(context)
            return context
        except requests.RequestException as exc:
            last_error = exc
            if attempt == CONTEXT_LOAD_RETRIES:
                break
            time.sleep(CONTEXT_RETRY_DELAY_SECONDS)

    raise ContextLoadError(
        f"Failed to load context after {CONTEXT_LOAD_RETRIES} attempts"
    ) from last_error


def load_spots():
    context = load_context()
    park_name_by_id = {
        str(park["id"]): park.get("name", "") for park in context["parkingLots"]
    }

    return [
        {
            "parkId": str(spot["parkingLotId"]),
            "parkName": park_name_by_id.get(str(spot["parkingLotId"]), ""),
            "spotId": str(spot["id"]),
            "spotNumber": spot["spotNumber"],
            "zone": spot["zone"],
            "row": spot["row"],
            "col": spot["col"],
            "status": spot["status"],
        }
        for spot in context["parkingSpots"]
    ]


def load_vehicle_plates():
    context = load_context()
    plates = []
    for vehicle in context["vehicles"]:
        plate = vehicle.get("plate")
        if plate:
            plates.append(str(plate).strip().upper())

    # preserve order while removing duplicates
    unique = []
    seen = set()
    for plate in plates:
        if plate in seen:
            continue
        seen.add(plate)
        unique.append(plate)

    return unique


def load_reservations():
    context = load_context()
    return [
        {
            "reservationId": res["reservationId"],
            "spotId": res["spotId"],
            "arrival": res["arrivalDateTime"],
            "departure": res["departureDateTime"],
            "status": res["status"],
        }
        for res in context.get("activeReservations", [])
        if res.get("spotId")
    ]


def _validate_context(context):
    required_top_level = [
        "version",
        "generatedAt",
        "parkingLots",
        "parkingSpots",
        "sensors",
        "users",
        "vehicles",
        "activeReservations",
    ]
    missing = [key for key in required_top_level if key not in context]
    if missing:
        raise ContextLoadError(f"Missing context keys: {', '.join(missing)}")

    if not isinstance(context["parkingSpots"], list):
        raise ContextLoadError("'parkingSpots' must be a list")

    for idx, spot in enumerate(context["parkingSpots"]):
        for key in (
            "id",
            "parkingLotId",
            "spotNumber",
            "zone",
            "row",
            "col",
            "status",
        ):
            if key not in spot:
                raise ContextLoadError(f"Missing '{key}' in parkingSpots[{idx}]")
