import csv
from pathlib import Path

import requests

url = "https://go.msu.edu/clery.php"
response = requests.get(url)
json_data = response.json()

rows = json_data["data"]

# Define column headers manually (based on column order)
headers = [
    "Description",
    "Code",
    "Building",
    "Address",
    "UnknownField",
    "Occurred_Time",
    "Reported_Time",
    "Case_Number",
    "Status"
]

SCHOOL_CODE = "002290"
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "crime_logs" / f"{SCHOOL_CODE}_michstate.csv"
OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(headers)
    writer.writerows(rows)

print(f"CSV file written: {OUTPUT_PATH.resolve()}")