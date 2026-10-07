import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    page.goto("http://localhost:3001", wait_until="networkidle")
    time.sleep(2)
    page.screenshot(path="/home/jules/verification/screenshots/floor_styled.png", full_page=True)

    # Also capture history page
    page.goto("http://localhost:3001/history", wait_until="networkidle")
    time.sleep(2)
    page.screenshot(path="/home/jules/verification/screenshots/history_styled.png", full_page=True)

    browser.close()
print("Screenshots captured on port 3001")
