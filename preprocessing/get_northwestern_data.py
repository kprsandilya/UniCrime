"""
Scrape Northwestern University (Chicago) daily blotter into a structured CSV.

Fetches blotter_ch.html (and optional month-specific pages). The page uses a single
table with two-column rows: label | value. Records are separated by "Case Number" rows.
"""
import csv
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

# ----------------------------
# Config
# ----------------------------
BASE_URL = "https://www.northwestern.edu/up/facts-and-figures/campus-crime/daily-blotter/"
# Main page + month pages to scrape (add more as needed)
BLOTTER_PAGES = [
    "blotter_ch.html",
    "blotter_ch-feb2026.html",
    "blotter_ch-mar2026.html",
]
OUTPUT_PATH = Path(__file__).resolve().parent / "northwestern_crime_log.csv"
SCHOOL_CODE = "001740"  # Northwestern University IPEDS

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


def parse_blotter_table(soup: BeautifulSoup) -> list[dict]:
    """Find the blotter table (two-column label|value rows) and return one dict per case."""
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if len(rows) < 2:
            continue
        # Check if this looks like the blotter (first row has "Case Number")
        first_cells = rows[0].find_all(["td", "th"])
        if len(first_cells) < 2:
            continue
        labels = [c.get_text(strip=True) for c in first_cells]
        if "Case Number" not in labels and first_cells[0].get_text(strip=True) != "Case Number":
            continue

        records = []
        current = None

        for tr in rows:
            cells = tr.find_all(["td", "th"])
            if len(cells) < 2:
                continue
            left = cells[0].get_text(strip=True)
            right = cells[1].get_text(strip=True)

            if left == "Case Number" and right:
                if current is not None:
                    records.append(current)
                current = {
                    "Number": right,
                    "Reported_Date_Time": "",
                    "Occurred_From_Date_Time": "",
                    "Location": "",
                    "Description": "",
                    "Disposition": "",
                    "Narrative": "",
                    "School_Code": SCHOOL_CODE,
                    "latitude": "",
                    "longitude": "",
                }
                continue

            if current is None:
                continue

            if left == "Date & Time: Reported":
                current["Reported_Date_Time"] = right
            elif left == "Date & Time: Occurred":
                current["Occurred_From_Date_Time"] = right
            elif left == "" and right and "at " in right and right[0].isalpha():
                # End occurred time (e.g. "February 01, 2026 at 11:45:00 PM")
                if current.get("Narrative"):
                    current["Narrative"] += " End: " + right
                else:
                    current["Narrative"] = "End occurred: " + right
            elif left == "Location:":
                current["Location"] = right
            elif left == "Common Name:" and right:
                if current["Location"]:
                    current["Location"] += " (" + right + ")"
                else:
                    current["Location"] = right
            elif left == "Incident Type:":
                current["Description"] = right
            elif left == "Criminal Offense:" and right:
                if current.get("Narrative"):
                    current["Narrative"] += " " + right
                else:
                    current["Narrative"] = right
            elif left == "Disposition:":
                current["Disposition"] = right

        if current is not None:
            records.append(current)
        return records
    return []


def fetch_page(url: str) -> list[dict]:
    """Fetch one blotter page and return parsed records."""
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    return parse_blotter_table(soup)


def main():
    all_records = []
    seen_numbers = set()

    for page in BLOTTER_PAGES:
        url = urljoin(BASE_URL, page)
        print(f"Fetching {page}...")
        try:
            records = fetch_page(url)
            for rec in records:
                if rec["Number"] and rec["Number"] not in seen_numbers:
                    seen_numbers.add(rec["Number"])
                    all_records.append(rec)
        except Exception as e:
            print(f"  Error: {e}")

    print(f"Total records: {len(all_records)}")
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(all_records)
    print(f"Saved to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
