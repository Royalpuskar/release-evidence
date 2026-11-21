"""Optional real-browser acceptance checks; run with Python and Playwright.
From repo root: python -m pip install playwright; python -m playwright install chromium;
python scripts/browser-smoke.py
Dependency-free guard regression: python -O scripts/browser-smoke.py --self-test
Uses only synthetic data and a loopback server. Does not deploy anything.
"""
import json
import hashlib
import functools
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import sys
import unittest

TRUST_WARNING = 'Local digest comparison and unverified user attestations; not authorization'

def require(condition, message):
    if not condition:
        raise AssertionError(message)

def validate_receipt(receipt, changed):
    require(receipt.get('integrity') == 'mismatch', 'Incorrect receipt integrity')
    require(receipt.get('decision') == 'BLOCKED', 'Incorrect receipt decision')
    require(receipt.get('actual') == changed, 'Incorrect receipt digest')
    blockers = receipt.get('blockers')
    require(isinstance(blockers, list) and len(blockers) == 4, 'Incorrect blockers')
    require(receipt.get('trust') == TRUST_WARNING, 'Receipt trust warning missing or altered')

class GuardTests(unittest.TestCase):
    def test_false_condition_fails_even_under_optimization(self):
        with self.assertRaisesRegex(AssertionError, 'sentinel'):
            require(False, 'sentinel')
        require(True, 'valid condition')

    def test_receipt_rejects_missing_or_changed_safety_fields(self):
        changed = hashlib.sha256(b'abd').hexdigest()
        valid = dict(integrity='mismatch', decision='BLOCKED', actual=changed,
                     blockers=[{}, {}, {}, {}], trust=TRUST_WARNING)
        validate_receipt(valid, changed)
        for field, invalid in [('integrity', 'match'), ('decision', 'APPROVED'),
                               ('actual', '0' * 64), ('blockers', []),
                               ('trust', 'Verified and authorized')]:
            with self.subTest(field=field):
                with self.assertRaises(AssertionError):
                    validate_receipt(dict(valid, **{field: invalid}), changed)
                missing = dict(valid)
                del missing[field]
                with self.assertRaises(AssertionError):
                    validate_receipt(missing, changed)

def main():
    from playwright.sync_api import sync_playwright, expect
    root = Path(__file__).resolve().parents[1]
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(
        SimpleHTTPRequestHandler, directory=str(root)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    known = hashlib.sha256(b'abc').hexdigest()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            print('Chromium:', browser.version)
            page = browser.new_page(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
            errors, external = [], []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('request', lambda request: external.append(request.url)
                    if not request.url.startswith(base + '/') else None)
            page.goto(base + '/investigate.html')
            expect(page.locator('#decision')).to_have_text('BLOCKED')
            expect(page.locator('#blockers li')).to_have_count(4)
            print('PASS: missing evidence blocks release')
            page.locator('#sample').click()
            expect(page.locator('#actual')).to_contain_text(known)
            expect(page.locator('#decision')).to_have_text('BLOCKED')
            expect(page.locator('#blockers li')).to_have_count(3)
            print('PASS: known vector hashes correctly; missing claims block')
            for control in page.locator('#checks input').all():
                control.check()
            expect(page.locator('#decision')).to_have_text('READY FOR HUMAN REVIEW')
            print('PASS: matching digest and claims allow human review only')
            page.locator('#expected').fill('0' * 64)
            expect(page.locator('#checks input')).to_have_count(3)
            require(all(not c.is_checked() for c in page.locator('#checks input').all()), 'Claims did not reset')
            for control in page.locator('#checks input').all():
                control.check()
            expect(page.locator('#decision')).to_have_text('BLOCKED')
            expect(page.locator('#trail')).to_contain_text('MISMATCH')
            print('PASS: changed reference clears claims; mismatch cannot be overridden')
            page.locator('#expected').fill(known)
            for control in page.locator('#checks input').all():
                control.check()
            expect(page.locator('#decision')).to_have_text('READY FOR HUMAN REVIEW')
            page.locator('#artifact').set_input_files({
                'name': 'changed.txt', 'mimeType': 'text/plain', 'buffer': b'abd'})
            changed = hashlib.sha256(b'abd').hexdigest()
            expect(page.locator('#actual')).to_contain_text(changed)
            expect(page.locator('#decision')).to_have_text('BLOCKED')
            expect(page.locator('#checks input')).to_have_count(3)
            require(all(not c.is_checked() for c in page.locator('#checks input').all()), 'Claims did not reset')
            print('PASS: changed file detected and claims cleared')
            with page.expect_download() as download:
                page.locator('#receipt').click()
            receipt = json.loads(Path(download.value.path()).read_text())
            validate_receipt(receipt, changed)
            print('PASS: downloaded receipt records mismatch, blockers and trust warning')
            page.set_viewport_size({'width': 390, 'height': 844})
            require(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Horizontal overflow at mobile width')
            print('PASS: mobile-width document has no horizontal overflow')
            require(not errors, f'Browser page errors: {errors}')
            require(not external, f'External requests: {external}')
            print('PASS: no page errors or external requests observed')
            browser.close()
    finally:
        server.shutdown()
        server.server_close()

if __name__ == '__main__':
    if sys.argv[1:] == ['--self-test']:
        unittest.main(argv=[sys.argv[0]], verbosity=2)
    else:
        main()
