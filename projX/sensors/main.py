import threading

from ocr_runner import run_ocr
from runner import run


def _run_ocr_safe():
    try:
        run_ocr()
    except Exception as exc:
        print(f"[ocr] runner crashed: {exc}")
        raise


if __name__ == "__main__":
    ocr_thread = threading.Thread(target=_run_ocr_safe, daemon=True, name="ocr-runner")
    ocr_thread.start()
    run()
