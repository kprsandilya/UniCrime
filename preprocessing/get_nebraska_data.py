"""
Fetch University of Nebraska-Lincoln daily crime & fire log from the 60-day archive.

Uses a two-step POST: first request returns a form with _UserID; second POST
returns HTML containing the log table. Parses the table into a structured CSV.
"""
import csv
import re
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# ----------------------------
# Config
# ----------------------------
ARCHIVE_URL = "https://scsapps.unl.edu/policereports/ArchiveFile.aspx"
OUTPUT_PATH = Path(__file__).resolve().parent / "nebraska_crime_log.csv"
SCHOOL_CODE = "002565"  # University of Nebraska-Lincoln IPEDS

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


def fetch_archive() -> str:
    """Two-step POST: get _UserID from first response, then fetch archive HTML."""
    session = requests.Session()
    r1 = session.post(ARCHIVE_URL, data={}, timeout=30)
    r1.raise_for_status()
    m = re.search(r"name='_UserID' value='([^']+)'", r1.text)
    if not m:
        raise RuntimeError("Could not find _UserID in first response")
    r2 = session.post(ARCHIVE_URL, data={"_UserID": m.group(1)}, timeout=60)
    r2.raise_for_status()
    return r2.text


def parse_archive_html(html: str) -> list[dict]:
    """Parse archive HTML: find the log table and extract rows into schema dicts."""
    soup = BeautifulSoup(html, "html.parser")
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if not rows:
            continue
        # Header row is not necessarily first (there are title/metadata rows)
        header_idx = None
        for i, tr in enumerate(rows):
            cells = tr.find_all(["td", "th"])
            if not cells:
                continue
            headers = [c.get_text(strip=True) for c in cells]
            if "Case #" in headers and "Incident Code" in headers:
                header_idx = i
                break
        if header_idx is None:
            continue

        headers = [c.get_text(strip=True) for c in rows[header_idx].find_all(["td", "th"])]
        col_map = {}
        for idx, h in enumerate(headers):
            h_lower = h.lower()
            if "case" in h_lower and "#" in h_lower:
                col_map["Number"] = idx
            elif "incident code" in h_lower:
                col_map["Description"] = idx
            elif "reported" in h_lower:
                col_map["Reported_Date_Time"] = idx
            elif "disposition" in h_lower:
                col_map["Disposition"] = idx
            elif "start occurred" in h_lower:
                col_map["Occurred_From_Date_Time"] = idx
            elif "end occurred" in h_lower:
                col_map["End_Occurred"] = idx
            elif "location" in h_lower:
                col_map["Location"] = idx

        out = []
        for tr in rows[header_idx + 1 :]:
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
            for field, idx in col_map.items():
                if field == "End_Occurred":
                    if idx < len(cell_texts) and cell_texts[idx]:
                        row["Narrative"] = cell_texts[idx]
                    continue
                if idx < len(cell_texts):
                    row[field] = cell_texts[idx]
            out.append(row)
        return out
    return []


def main():
    print("Fetching UNL archive (two-step POST)...")
    html = fetch_archive()
    print("Parsing table...")
    rows = parse_archive_html(html)
    print(f"Parsed {len(rows)} rows.")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    print(f"Saved to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
