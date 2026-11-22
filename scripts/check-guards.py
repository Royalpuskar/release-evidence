"""Run Evidence Desk's dependency-free guard tests in both Python modes.

From any working directory: python path/to/scripts/check-guards.py
This checks the guard helpers, not the browser.
"""
import subprocess
import sys
from pathlib import Path

TIMEOUT_SECONDS = 30

def main():
    script = Path(__file__).resolve().with_name("browser-smoke.py")
    failed = []
    # -E ignores PYTHONOPTIMIZE, so normal mode really is unoptimized.
    # Explicit -O ensures a separate optimized interpreter run.
    for label, flags in (("normal", ["-E"]), ("optimized", ["-E", "-O"])):
        command = [sys.executable, *flags, str(script), "--self-test"]
        print(f"Running guard tests: {label}", flush=True)
        try:
            result = subprocess.run(command, check=False, timeout=TIMEOUT_SECONDS)
        except (OSError, subprocess.TimeoutExpired) as error:
            print(f"FAIL ({label}): {error}", file=sys.stderr, flush=True)
            failed.append(label)
            continue
        if result.returncode != 0:
            print(f"FAIL ({label}): exit {result.returncode}", file=sys.stderr, flush=True)
            failed.append(label)
        else:
            print(f"PASS ({label}): guard self-tests", flush=True)
    if failed:
        print("Guard validation failed: " + ", ".join(failed), file=sys.stderr)
        return 1
    print("Both guard self-test modes passed. Browser execution is separate.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
