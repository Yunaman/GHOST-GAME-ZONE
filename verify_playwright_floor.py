import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    page.goto("http://localhost:3001", wait_until="networkidle")
    time.sleep(1)
    # Click skip intro button
    skip_btn = page.query_selector("button:has-text('SKIP INTRO')")
    if skip_btn:
        skip_btn.click()
        time.sleep(1)

    page.screenshot(path="/home/jules/verification/screenshots/floor_fast.png", full_page=True)

    # Go to history
    page.goto("http://localhost:3001/history", wait_until="networkidle")
    time.sleep(1)
    skip_btn = page.query_selector("button:has-text('SKIP INTRO')")
    if skip_btn:
        skip_btn.click()
        time.sleep(1)
    page.screenshot(path="/home/jules/verification/screenshots/history_fast.png", full_page=True)

    browser.close()
print("Floor & History screenshots captured after dismissing splash")
