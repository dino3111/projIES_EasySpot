import threading

from ocr_runner import run_ocr
from runner import run


def _run_ocr_safe():
    try:
        run_ocr()
    except Exception as exc:
        print(f"[ocr] runner crashed: {exc}")
        raise


def _run_occupancy_safe():
    try:
        run()
    except Exception as exc:
        print(f"[occupancy] runner crashed: {exc}")
        raise


if __name__ == "__main__":
    ocr_thread = threading.Thread(target=_run_ocr_safe, daemon=False, name="ocr-runner")
    occupancy_thread = threading.Thread(
        target=_run_occupancy_safe, daemon=False, name="occupancy-runner"
    )

    ocr_thread.start()
    occupancy_thread.start()

    # If one runner dies, fail the whole process so Docker restarts the service.
    while True:
        ocr_thread.join(timeout=1.0)
        occupancy_thread.join(timeout=1.0)
        if not ocr_thread.is_alive():
            raise RuntimeError("OCR runner thread terminated unexpectedly")
        if not occupancy_thread.is_alive():
            raise RuntimeError("Occupancy runner thread terminated unexpectedly")
