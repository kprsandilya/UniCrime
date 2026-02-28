import requests
import csv

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

with open(f"./crime_logs/{SCHOOL_CODE}_michstate.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(headers)
    writer.writerows(rows)

print(f"CSV file written: ./crime_logs/{SCHOOL_CODE}_michstate.csv")