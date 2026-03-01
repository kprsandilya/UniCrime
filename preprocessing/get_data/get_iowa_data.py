from pathlib import Path
from playwright.sync_api import sync_playwright
import csv

# ----------------------------
# CONFIG
# ----------------------------
URL = "https://safety.uiowa.edu/crime-log#accordion-item-2146-1"  # The Drupal page URL
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "crime_logs" / "iowa_crime_log.csv"

ARG_MIN = "2025-12-29"  # start_date
ARG_MAX = "2026-02-27"  # end_date

# ----------------------------
def scrape_crime_table_with_dates():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # headless=True for silent
        context = browser.new_context()
        page = context.new_page()

        print("Loading page…")
        page.goto(URL)
        page.wait_for_load_state("networkidle")

        # 1️⃣ Set start_date and end_date
        print(f"Setting start_date={ARG_MIN} and end_date={ARG_MAX}")
        page.fill('input[name="start_date"]', ARG_MIN)
        page.fill('input[name="end_date"]', ARG_MAX)

        # 2️⃣ Trigger form submission / table refresh
        # Usually there is a submit button or the table updates automatically
        try:
            page.click('input[type="submit"], button[type="submit"]')
        except:
            print("No submit button found — assuming table updates automatically")

        # 3️⃣ Wait for table to render
        print("Waiting for table…")
        page.wait_for_selector("table.table--hover-highlight")

        # 4️⃣ Scrape table
        table = page.query_selector("table.table--hover-highlight")

        # Headers
        headers = [th.inner_text().strip() for th in table.query_selector_all("thead th")]

        # Rows
        rows = []
        for tr in table.query_selector_all("tbody tr"):
            cells = [td.inner_text().strip() for td in tr.query_selector_all("td")]
            if len(cells) == len(headers):
                rows.append(cells)

        # 5️⃣ Write CSV
        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerows(rows)

        print(f"Scraped {len(rows)} rows into {OUTPUT_PATH}")

        browser.close()

# ----------------------------
if __name__ == "__main__":
    scrape_crime_table_with_dates()