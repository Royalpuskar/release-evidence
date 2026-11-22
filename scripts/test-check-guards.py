"""Dependency-free acceptance tests for the guard runner itself.
Run: python scripts/test-check-guards.py
Manual-only: the existing Node CI workflow does not execute these Python tests.
These tests use synthetic subprocesses, not the browser.
"""
import importlib.util
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from contextlib import redirect_stderr, redirect_stdout
from io import StringIO

RUNNER = Path(__file__).resolve().with_name('check-guards.py')

class RunnerTests(unittest.TestCase):
    def test_child_modes_and_failure_propagation(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            scripts = root / 'scripts'
            scripts.mkdir()
            runner = scripts / RUNNER.name
            shutil.copyfile(RUNNER, runner)
            child = scripts / 'browser-smoke.py'
            child.write_text(
                'import os, sys\n'
                'from pathlib import Path\n'
                'with Path(__file__).with_suffix(".trace").open("a") as f:\n'
                '    f.write(str(sys.flags.optimize) + "\\n")\n'
                'if sys.argv[1:] != ["--self-test"]:\n'
                '    sys.exit(3)\n'
                'sys.exit(7 if str(sys.flags.optimize) == os.environ.get("FAIL_MODE") else 0)\n',
                encoding='utf-8',
            )
            trace = child.with_suffix('.trace')
            for fail_mode, expected in (('none', 0), ('0', 1), ('1', 1)):
                with self.subTest(fail_mode=fail_mode):
                    trace.unlink(missing_ok=True)
                    env = dict(os.environ, PYTHONOPTIMIZE='2', FAIL_MODE=fail_mode)
                    result = subprocess.run(
                        [sys.executable, str(runner)], cwd=root, env=env,
                        capture_output=True, text=True, timeout=10, check=False,
                    )
                    self.assertEqual(result.returncode, expected, result.stdout + result.stderr)
                    self.assertEqual(trace.read_text(encoding='utf-8').splitlines(), ['0', '1'])
                    if expected:
                        self.assertIn('Guard validation failed', result.stderr)
                        self.assertNotIn('Both guard self-test modes passed', result.stdout)
                    else:
                        self.assertIn('Both guard self-test modes passed', result.stdout)

    def test_timeout_and_launch_error_do_not_skip_second_mode(self):
        spec = importlib.util.spec_from_file_location('guard_runner_under_test', RUNNER)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        for failure in (subprocess.TimeoutExpired('synthetic', 30), OSError('synthetic launch failure')):
            with self.subTest(failure=type(failure).__name__):
                with patch.object(module.subprocess, 'run', side_effect=[failure, subprocess.CompletedProcess([], 0)]) as run:
                    with redirect_stdout(StringIO()) as stdout, redirect_stderr(StringIO()) as stderr:
                        self.assertEqual(module.main(), 1)
                    self.assertEqual(run.call_count, 2)
                    self.assertEqual(run.call_args_list[0].args[0][1:2], ['-E'])
                    self.assertEqual(run.call_args_list[1].args[0][1:3], ['-E', '-O'])
                    self.assertEqual(run.call_args_list[0].kwargs['timeout'], 30)
                    self.assertIn('FAIL (normal)', stderr.getvalue())
                    self.assertIn('PASS (optimized)', stdout.getvalue())
                    self.assertNotIn('Both guard self-test modes passed', stdout.getvalue())

if __name__ == '__main__':
    unittest.main(verbosity=2)
