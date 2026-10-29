#!/usr/bin/env python3
"""Exercise real terminal wagers and keyboard isolation against a local static server."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def main():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(ROOT / 'docs')))
    Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}/?guest=1&chips=250000&view='
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        def go(view):
            page.goto(base + view, wait_until='load')
            page.wait_for_function('window.__casinoReady === true')
        def text():
            return page.locator('#app').inner_text()
        def click(label):
            page.get_by_role('button', name=label, exact=False).first.click()

        go('save-create')
        assert 'Slot undefined' not in text(), text()
        assert 'SAVE LIBRARY' in text().upper(), text()
        print('PASS bare save-create deep link lands on the save library')

        go('roulette')
        inputs = page.locator('input[type=number]')
        wager, pick = inputs.nth(0), inputs.nth(1)
        for amount, number in [('5.5', '7'), ('5', '37'), ('5', '1.5'), ('5', '')]:
            wager.fill(amount)
            pick.fill(number)
            click('Spin')
            assert 'Floor chips: $250,000' in text(), (amount, number, text())
            assert page.locator('.error').count(), (amount, number, text())
        wager.fill('5')
        pick.fill('7')
        click('Spin')
        page.get_by_text('SPIN 1', exact=True).wait_for(timeout=10000)
        assert 'Last spin:' in text()
        print('PASS roulette rejects invalid wagers and numbers before settling a valid spin')

        # Naturals and dealer blackjack can finish immediately; retry until player action.
        for _ in range(20):
            go('blackjack-menu')
            click('Quick hand')
            click('Deal')
            if page.get_by_role('button', name='Decline', exact=True).count():
                click('Decline')
            if page.get_by_role('button', name='Stand (S)', exact=True).count():
                break
        else:
            raise AssertionError('Could not obtain a playable blackjack hand')
        page.locator('.rewards-phone-fab').click()
        page.keyboard.press('s')
        assert page.get_by_role('button', name='Stand (S)', exact=True).count() == 1
        page.get_by_role('button', name='Close', exact=True).click()
        page.keyboard.press('s')
        page.get_by_role('button', name='Leave table', exact=True).wait_for()
        print('PASS blackjack ignores shortcuts while phone is open and settles after closing')

        go('sportsbook')
        click('Place sports wager')
        click('Place ticket')
        assert 'Open positions:' in text() and 'Floor chips: $249,990' in text()
        click('Settle all open positions')
        assert 'SPORTS RESULTS' in text() and ('WIN:' in text() or 'LOSE:' in text() or 'PUSH:' in text())
        print('PASS sportsbook places and settles a ticket')

        go('horse-racing')
        click('Place a wager')
        click('Place ticket')
        assert 'Open tickets:' in text() and 'Floor chips: $249,995' in text()
        click('Run race & settle')
        page.get_by_text('FINISH ORDER', exact=True).wait_for(timeout=60000)
        assert 'WIN:' in text() or 'LOSE:' in text() or 'PUSH:' in text()
        print('PASS horse racing runs to an official settled result')
        assert not errors, errors
        browser.close()
    server.shutdown()


if __name__ == '__main__':
    main()
