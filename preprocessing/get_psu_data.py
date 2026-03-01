"""
Scrape Penn State University Police daily crime log into a structured CSV.

Fetches https://www.police.psu.edu/daily-crime-log and paginates through ?page=0,1,2,...
Each page has incident blocks in <article> with Drupal field classes.
"""
import csv
import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# ----------------------------
# Config
# ----------------------------
BASE_URL = "https://www.police.psu.edu/daily-crime-log"
OUTPUT_PATH = Path(__file__).resolve().parent / "psu_crime_log.csv"
SCHOOL_CODE = "003329"  # Pennsylvania State University-Main Campus (University Park) IPEDS
REQUEST_DELAY_S = 0.3

FIELDNAMES = [
    "Number",
    "Reported_Date_Time",
    "Occurred_From_Date_Time",
    "Location",
    "Description",
    "Disposition",
    "Narrative",
    "School_Code",
    "latitude",
    "longitude",
]


def parse_occurred(text: str) -> tuple[str, str]:
    """Split 'X to Y' into (start, end); else (text, '')."""
    if not text or not text.strip():
        return "", ""
    text = text.strip()
    if " to " in text:
        parts = text.split(" to ", 1)
        return parts[0].strip(), parts[1].strip()
    return text, ""


def parse_article(article) -> dict | None:
    """Extract one incident from an <article> node."""
    h2 = article.find("h2")
    if not h2:
        return None
    raw_num = h2.get_text(strip=True)
    m = re.search(r"INCIDENT\s*#\s*:\s*(.+)", raw_num, re.I)
    number = m.group(1).strip() if m else raw_num

    def field_item(*class_names):
        # Drupal field classes: field--name-field-<name>
        for name in class_names:
            div = article.find("div", class_=f"field--name-field-{name}")
            if div:
                item = div.find("div", class_="field__item")
                if item:
                    return item.get_text(separator=" ", strip=True)
        return ""

    reported = field_item("reported")
    occurred_raw = field_item("occurred")
    occurred_start, occurred_end = parse_occurred(occurred_raw)
    nature = field_item("nature-of-incident1")
    offenses = field_item("offenses1")
    location = field_item("location")
    disposition = field_item("case-disposition")

    narrative = ""
    if occurred_end:
        narrative = "End occurred: " + occurred_end
    if offenses:
        narrative = (narrative + " " + offenses).strip()

    return {
        "Number": number,
        "Reported_Date_Time": reported,
        "Occurred_From_Date_Time": occurred_start,
        "Location": location,
        "Description": nature,
        "Disposition": disposition,
        "Narrative": narrative,
        "School_Code": SCHOOL_CODE,
        "latitude": "",
        "longitude": "",
    }


def fetch_page(session: requests.Session, page: int) -> list[dict]:
    """Fetch one page of the daily log and return list of incident dicts."""
    url = BASE_URL if page == 0 else f"{BASE_URL}?page={page}"
    r = session.get(url, timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    records = []
    for article in soup.find_all("article"):
        h2 = article.find("h2")
        if not h2 or "INCIDENT" not in (h2.get_text() or ""):
            continue
        rec = parse_article(article)
        if rec:
            records.append(rec)
    return records


def main():
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0 (compatible; UniCrime scraper)"})
    all_records = []
    seen_numbers = set()
    page = 0
    max_pages = 500  # safety limit

    print("Fetching Penn State daily crime log...")
    while page < max_pages:
        print(f"  Page {page + 1}...", end=" ")
        try:
            records = fetch_page(session, page)
        except Exception as e:
            print(f"Error: {e}")
            break
        if not records:
            print("no incidents, stopping.")
            break
        new = 0
        for rec in records:
            if rec["Number"] not in seen_numbers:
                seen_numbers.add(rec["Number"])
                all_records.append(rec)
                new += 1
        print(f"{len(records)} incidents ({new} new)")
        if len(records) < 10:
            break
        page += 1
        time.sleep(REQUEST_DELAY_S)

    print(f"Total unique records: {len(all_records)}")
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(all_records)
    print(f"Saved to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
