import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 390, 'height': 844},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True
        )
        page = await context.new_page()

        await page.goto('http://localhost:3000', wait_until='networkidle')

        splash = page.locator('text=ENTER GHOST ZONE')
        if await splash.is_visible():
            await splash.click()
            await page.wait_for_timeout(1000)

        await page.locator('text=START FIFA SESSION').first.wait_for(state='visible')
        await page.screenshot(path='/tmp/test_available.png')
        print('Saved /tmp/test_available.png')

        start_btn = page.locator('text=START FIFA SESSION').first
        await start_btn.click()
        await page.wait_for_timeout(800)

        match_btn = page.locator('button:has-text("+ MATCH")').first
        await match_btn.click()
        await page.wait_for_timeout(400)
        await match_btn.click()
        await page.wait_for_timeout(400)

        extra_btn = page.locator('button:has-text("+ EXTRA")').first
        await extra_btn.click()
        await page.wait_for_timeout(400)

        await page.screenshot(path='/tmp/test_active.png')
        print('Saved /tmp/test_active.png')

        finish_btn = page.locator('button:has-text("FINISH SESSION")').first
        await finish_btn.click()
        await page.wait_for_timeout(500)

        await page.screenshot(path='/tmp/test_modal.png')
        print('Saved /tmp/test_modal.png')

        cash_btn = page.locator('button:has-text("CASH")').first
        await cash_btn.click()
        await page.wait_for_timeout(300)

        complete_btn = page.locator('text=CONFIRM & CLOSE SESSION').first
        await complete_btn.click()
        await page.wait_for_timeout(800)

        await page.screenshot(path='/tmp/test_completed.png')
        print('Saved /tmp/test_completed.png')

        await browser.close()

if __name__ == '__main__':
    asyncio.run(run())
