import pandas as pd
from pathlib import Path


def clean_federal_school_code_csv(csv_path: str | Path | None = None) -> None:
    """Remove '/' characters from the 'School Name' column of the federal school code CSV."""
    if csv_path is None:
        csv_path = Path(__file__).parent / "2627FederalSchoolCodeList2ndQuarter.csv"
    df = pd.read_csv(csv_path)
    df["School Name"] = df["School Name"].astype(str).str.replace("/", "", regex=False)
    df.to_csv(csv_path, index=False)


def main():
    # iterate through crime_logs folder, iterate through each subfolder, which is named with the school's code
    # in each subfolder, there is
    pass


if __name__ == "__main__":
    clean_federal_school_code_csv()
    main()