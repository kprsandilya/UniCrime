"""
Scrape Purdue West Lafayette daily crime log archives into a single CSV.

1. Fetches the index page and collects all archive links (*-daily-crime-log.php).
2. For each archive page, extracts every table (one per day) and normalizes columns.
3. Writes one structured CSV with columns aligned to the crime-log schema.
"""
import csv
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

# ----------------------------
# Config
# ----------------------------
INDEX_URL = "https://www.purdue.edu/ehps/police/statistics-policies/daily-crime-log-archives/index.php"
ARCHIVES_BASE = "https://www.purdue.edu/ehps/police/statistics-policies/daily-crime-log-archives/"
SCHOOL_CODE = "001825"  # Purdue University-Main Campus (West Lafayette) IPEDS
OUTPUT_PATH = Path(__file__).parent / "crime_logs" / f"{SCHOOL_CODE}_purdue.csv"
REQUEST_DELAY_S = 0.5

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


def get_archive_links(index_url: str, base_url: str) -> list[str]:
    """Parse index page and return absolute URLs for each daily-crime-log archive."""
    r = requests.get(index_url, timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if "daily-crime-log.php" in href and "index" not in href.lower():
            full = urljoin(base_url, href)
            if full not in links:
                links.append(full)
    return links


def parse_date_time(raw: str) -> str:
    """Leave date/time as-is for CSV; optionally normalize later."""
    if not raw or not raw.strip():
        return ""
    return raw.strip()


def extract_tables_from_page(url: str) -> list[dict]:
    """
    Fetch one archive page and return a list of row dicts from all tables.
    Each table has: Nature, Case Number, Date/Time Occurred, Date/Time Reported, General Location, Disposition.
    """
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    rows_out = []

    # Find all tables; Purdue uses <tbody> with first <tr> as header row (<th>), then <td> rows
    for table in soup.find_all("table"):
        tbody = table.find("tbody") or table
        trs = tbody.find_all("tr")
        if not trs:
            continue
        # First row may be header (th) or data (td)
        first_cells = trs[0].find_all(["th", "td"])
        if not first_cells:
            continue
        # If first row has <th>, use it as headers; otherwise skip table or use positional
        if trs[0].find("th"):
            headers = [c.get_text(strip=True) for c in first_cells]
            data_trs = trs[1:]
        else:
            headers = []
            data_trs = trs

        if not headers:
            continue
        # Normalize header names for column mapping
        header_map = {}
        for i, h in enumerate(headers):
            h_lower = h.lower()
            if "nature" in h_lower:
                header_map["Description"] = i
            elif "case number" in h_lower:
                header_map["Number"] = i
            elif "date/time occurred" in h_lower or "occurred" in h_lower:
                header_map["Occurred_From_Date_Time"] = i
            elif "date/time reported" in h_lower or "reported" in h_lower:
                header_map["Reported_Date_Time"] = i
            elif "location" in h_lower or "general location" in h_lower:
                header_map["Location"] = i
            elif "disposition" in h_lower:
                header_map["Disposition"] = i

        for tr in data_trs:
            cells = tr.find_all("td")
            if len(cells) < 2:
                continue
            cell_texts = [c.get_text(separator=" ", strip=True) for c in cells]
            row = {
                "Number": "",
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
            for field, idx in header_map.items():
                if idx < len(cell_texts):
                    row[field] = parse_date_time(cell_texts[idx])
            rows_out.append(row)

    return rows_out


def main():
    print("Fetching index page…")
    links = get_archive_links(INDEX_URL, ARCHIVES_BASE)
    print(f"Found {len(links)} archive page(s).")

    all_rows = []
    for i, url in enumerate(links):
        name = urlparse(url).path.split("/")[-1] or url
        print(f"  [{i + 1}/{len(links)}] {name}")
        try:
            rows = extract_tables_from_page(url)
            all_rows.extend(rows)
        except Exception as e:
            print(f"    Error: {e}")
        time.sleep(REQUEST_DELAY_S)

    print(f"Total rows: {len(all_rows)}")
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(all_rows)
    print(f"Saved to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
