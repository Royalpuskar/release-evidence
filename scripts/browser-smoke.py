"""Optional real-browser acceptance checks; run with Python and Playwright.
From repo root: python -m pip install playwright; python -m playwright install chromium;
python scripts/browser-smoke.py
Uses only synthetic data and a loopback server. Does not deploy anything.
"""
import json
import hashlib
import functools
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

def main():
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
            assert all(not c.is_checked() for c in page.locator('#checks input').all())
            for control in page.locator('#checks input').all():
                control.check()
            expect(page.locator('#decision')).to_have_text('BLOCKED')
            expect(page.locator('#trail')).to_contain_text('MISMATCH')
            print('PASS: changed reference clears claims; mismatch cannot be overridden')
            page.locator('#expected').fill(known)
            page.locator('#artifact').set_input_files({
                'name': 'changed.txt', 'mimeType': 'text/plain', 'buffer': b'abd'})
            changed = hashlib.sha256(b'abd').hexdigest()
            expect(page.locator('#actual')).to_contain_text(changed)
            expect(page.locator('#decision')).to_have_text('BLOCKED')
            assert all(not c.is_checked() for c in page.locator('#checks input').all())
            print('PASS: changed file detected and claims cleared')
            with page.expect_download() as download:
                page.locator('#receipt').click()
            receipt = json.loads(Path(download.value.path()).read_text())
            assert receipt['integrity'] == 'mismatch'
            assert receipt['decision'] == 'BLOCKED'
            assert receipt['actual'] == changed
            assert len(receipt['blockers']) == 4
            print('PASS: downloaded receipt records mismatch and blockers')
            page.set_viewport_size({'width': 390, 'height': 844})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            print('PASS: mobile-width document has no horizontal overflow')
            assert not errors, errors
            assert not external, external
            print('PASS: no page errors or external requests observed')
            browser.close()
    finally:
        server.shutdown()
        server.server_close()

if __name__ == '__main__':
    main()
