import requests
from config import BACKEND_BASE_URL


def load_spots():
    response = requests.get(
        f"{BACKEND_BASE_URL}/api/parks/list?page=1&pageSize=1000", timeout=30
    )
    response.raise_for_status()
    data = response.json()

    spots = []

    for park in data["items"]:
        details = requests.get(
            f"{BACKEND_BASE_URL}/api/parks/{park['id']}/details", timeout=30
        )
        details.raise_for_status()
        details = details.json()

        for spot in details["spots"]:
            spots.append(
                {
                    "parkId": str(details["id"]),
                    "parkName": details["name"],
                    "spotId": str(spot["spotId"]),
                    "spotNumber": spot["spotNumber"],
                    "zone": spot["zone"],
                    "row": spot["row"],
                    "col": spot["col"],
                    "status": spot["status"],
                }
            )

    return spots
