from pathlib import Path
from playwright.sync_api import sync_playwright
import time

# ——— Config ———
# Use embed URL with toolbar=yes so Download is visible. Non-embed / guest redirect URLs
# often hit "Unexpected Error" on this server.
VIZ_URL = "https://dataviz.rae.osu.edu/t/public/views/ColumbusCampusCrimeLog/ColumbusCampusCrimeLog?:embed=yes&:toolbar=yes"
DOWNLOAD_PATH = Path(__file__).resolve().parent.parent / "columbus_crime_log.csv"
PAGE_TIMEOUT_MS = 90_000  # 90 seconds for slow Tableau loads

def download_tableau_csv():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(accept_downloads=True)
        context.set_default_timeout(PAGE_TIMEOUT_MS)
        context.set_default_navigation_timeout(PAGE_TIMEOUT_MS)
        page = context.new_page()

        # 1️⃣ Open the viz (don't use networkidle — Tableau often never goes idle)
        print("Loading dashboard…")
        page.goto(VIZ_URL, wait_until="domcontentloaded")
        page.wait_for_load_state("load")

        if "Unexpected Error" in page.content():
            raise RuntimeError(
                "Tableau returned 'Unexpected Error'. The embed URL may be blocked or the view may be down. "
                "Try running with headless=False to see the page, or check if the viz is available in a browser."
            )

        # Wait for the Download button to appear
        print("Waiting for dashboard to render…")
        download_button_selector = "button[aria-label*='Download'], button[aria-label*='download']"
        page.wait_for_selector(download_button_selector, timeout=PAGE_TIMEOUT_MS)
        time.sleep(3)

        # 2️⃣ Open the download menu
        print("Opening download menu…")
        page.click(download_button_selector)

        # 3️⃣ Choose Data
        data_button_selector = "text=Data"
        page.wait_for_selector(data_button_selector, timeout=15_000)
        page.click(data_button_selector)

        # 4️⃣ Choose CSV
        csv_button_selector = "text=CSV"
        page.wait_for_selector(csv_button_selector, timeout=15_000)
        with page.expect_download(timeout=60_000) as download_info:
            page.click(csv_button_selector)

        download = download_info.value
        print("Downloading CSV…")
        download.save_as(DOWNLOAD_PATH)
        print(f"Downloaded to {DOWNLOAD_PATH}")

        browser.close()

if __name__ == "__main__":
    download_tableau_csv()