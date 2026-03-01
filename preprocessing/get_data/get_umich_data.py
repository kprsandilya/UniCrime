import csv
import datetime
import time
from pathlib import Path

import requests

BASE_URL = "https://www.dpss.umich.edu/api/GetCrimeLogCache"

# ===== CONFIGURE YOUR DATE RANGE HERE =====
START_DATE = "02/01/2026"
END_DATE = "02/28/2026"
SCHOOL_CODE = "002325"
OUTPUT_FILE = Path(__file__).resolve().parent.parent / "crime_logs" / f"{SCHOOL_CODE}_umich.csv"


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


def daterange(start_date, end_date):
    start = datetime.datetime.strptime(start_date, "%m/%d/%Y")
    end = datetime.datetime.strptime(end_date, "%m/%d/%Y")
    for n in range((end - start).days + 1):
        yield start + datetime.timedelta(n)


def transform_record(record):
    return {
        "Number": record["id"],
        "Reported_Date_Time": None,
        "Occurred_From_Date_Time": record["date"],
        "Location": record.get("address", ""),
        "Description": record.get("description", ""),
        "Disposition": (record.get("disposition", "")[:-4] or "Unknown"),
        "Narrative": record.get("narrative", ""),
        "School_Code": SCHOOL_CODE,
        "latitude": None,
        "longitude": None,
    }


def fetch_date(date_str):
    try:
        response = requests.get(BASE_URL, params={"date": date_str})
        response.raise_for_status()
        return response.json().get("data", [])
    except Exception as e:
        print(f"Error fetching {date_str}: {e}")
        return []


def main():
    all_records = {}

    for single_date in daterange(START_DATE, END_DATE):
        date_str = single_date.strftime("%m/%d/%Y")
        print(f"Fetching {date_str}...")

        daily_records = fetch_date(date_str)

        for record in daily_records:
            record_id = record["id"]
            if record_id not in all_records:
                all_records[record_id] = transform_record(record)

        time.sleep(0.2)  # polite API usage

    print(f"Fetched {len(all_records)} total unique records.")

    # Write CSV
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(all_records.values())

    print(f"Saved to {OUTPUT_FILE.resolve()}")


if __name__ == "__main__":
    main()