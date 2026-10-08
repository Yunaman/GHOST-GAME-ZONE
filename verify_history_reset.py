import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 390, 'height': 844})
        page = await context.new_page()

        # 1. Open home floor
        await page.goto('http://localhost:3000', wait_until='networkidle')
        await asyncio.sleep(1)

        # Skip intro if splash visible
        skip_btn = page.locator('button:has-text("SKIP INTRO")')
        if await skip_btn.count() > 0:
            try:
                await skip_btn.click(force=True, timeout=2000)
            except Exception:
                pass
            await asyncio.sleep(0.5)

        # Close install app card if visible
        close_card = page.locator('button[aria-label="Dismiss app install prompt"]')
        if await close_card.count() > 0:
            try:
                await close_card.click(force=True, timeout=2000)
            except Exception:
                pass
            await asyncio.sleep(0.5)

        # Enter floor if tap prompt visible
        enter_tap = page.locator('text="Tap anywhere to enter floor"')
        if await enter_tap.count() > 0:
            try:
                await enter_tap.click(force=True, timeout=2000)
            except Exception:
                pass
            await asyncio.sleep(0.5)

        # Start session on TV 1 if AVAILABLE
        start_btn = page.locator('button:has-text("START SESSION")').first
        if await start_btn.count() > 0:
            await start_btn.click(force=True)
            await asyncio.sleep(1)

        # Add match (Test immediate +MATCH first tap)
        add_match = page.locator('button:has-text("+ MATCH")').first
        if await add_match.count() > 0:
            await add_match.click(force=True)
            await asyncio.sleep(1)

        # Finish session
        finish_btn = page.locator('button:has-text("FINISH SESSION")').first
        if await finish_btn.count() > 0:
            await finish_btn.click(force=True)
            await asyncio.sleep(0.5)
            # Select Cash
            cash_btn = page.locator('button:has-text("CASH")').first
            if await cash_btn.count() > 0:
                await cash_btn.click(force=True)
                await asyncio.sleep(1)

        # 2. Go to History
        await page.goto('http://localhost:3000/history', wait_until='networkidle')
        await asyncio.sleep(1)
        await page.screenshot(path='/home/jules/verification/screenshots/history_before_clear.png')

        # Click Clear History
        clear_hist = page.locator('button:has-text("CLEAR HISTORY")')
        if await clear_hist.count() > 0:
            await clear_hist.click(force=True)
            await asyncio.sleep(1.5)

        await page.screenshot(path='/home/jules/verification/screenshots/history_after_clear.png')

        # 3. Go to Reports and verify Reports kept its values despite History clear
        await page.goto('http://localhost:3000/reports', wait_until='networkidle')
        await asyncio.sleep(1)
        await page.screenshot(path='/home/jules/verification/screenshots/reports_kept_values.png')

        # Click Reset Reports
        reset_rep = page.locator('button:has-text("RESET REPORTS")')
        if await reset_rep.count() > 0:
            await reset_rep.click(force=True)
            await asyncio.sleep(1.5)

        await page.screenshot(path='/home/jules/verification/screenshots/reports_after_reset.png')

        await browser.close()

asyncio.run(main())
