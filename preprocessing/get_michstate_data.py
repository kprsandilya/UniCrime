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

with open("clery_data.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(headers)
    writer.writerows(rows)

print("CSV file written: clery_data.csv")