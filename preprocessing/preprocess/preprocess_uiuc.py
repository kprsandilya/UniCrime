"""
Process UIUC crime log CSV into the same schema as the processed UMich data.
Output matches: school_code, case_number, report_datetime, occurred_datetime, location,
latitude, longitude, description, disposition, narrative.
"""

import re
from pathlib import Path

import pandas as pd

from preprocess.shared import (
    CASE_NUMBER,
    DESCRIPTION,
    DISPOSITION,
    LATITUDE,
    LONGITUDE,
    LOCATION,
    NARRATIVE,
    OCCURRED_DATETIME,
    REPORT_DATETIME,
    SCHOOL_CODE,
    _load_geocode_cache,
    _normalize_disposition,
    _save_geocode_cache,
    ensure_location_has_city,
    geocode_location,
)

# UIUC CSV column names
UIUC_NUMBER = "Number"
UIUC_REPORTED = "Reported Date/Time"
UIUC_OCCURRED = "Occurred From Date/Time"
UIUC_LOCATION = "Location"
UIUC_DESCRIPTION = "Description"
UIUC_DISPOSITION = "Disposition"


def _school_code_from_filename(path: Path) -> str:
    """e.g. 001775_uiuc.csv -> 001775"""
    stem = path.stem
    match = re.match(r"^(\d+)", stem)
    return match.group(1) if match else stem.split("_")[0] if "_" in stem else stem


def _parse_uiuc_datetime(series: pd.Series) -> pd.Series:
    """Parse UIUC datetime 'MM/DD/YYYY HH:MM' into timezone-aware UTC."""
    return pd.to_datetime(series, format="%m/%d/%Y %H:%M", utc=True, errors="coerce")


def process_uiuc_csv(
    csv_path: str | Path,
    geocode: bool = True,
    use_geocode_cache_file: bool = True,
) -> pd.DataFrame:
    """
    Load UIUC-style crime log CSV and transform to the same schema as processed UMich data.

    - csv_path: path to CSV (e.g. preprocessing/crime_logs/001775_uiuc.csv)
    - geocode: if True, resolve Location to lat/lon via Google Maps (address + "Illinois, USA")
    - use_geocode_cache_file: if True, use shared geocode_cache.json

    Returns DataFrame with: school_code, case_number, report_datetime, occurred_datetime,
    location, latitude, longitude, description, disposition, narrative.
    """
    csv_path = Path(csv_path)
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV not found: {csv_path}")

    df = pd.read_csv(csv_path)
    required = (UIUC_NUMBER, UIUC_REPORTED, UIUC_OCCURRED, UIUC_LOCATION)
    for col in required:
        if col not in df.columns:
            raise ValueError(f"Expected column '{col}' in {csv_path.name}")

    # Drop rows where datetime columns don't parse as MM/DD/YYYY HH:MM
    report_parsed = _parse_uiuc_datetime(df[UIUC_REPORTED])
    occurred_parsed = _parse_uiuc_datetime(df[UIUC_OCCURRED])
    valid_mask = report_parsed.notna() & occurred_parsed.notna()
    n_dropped = (~valid_mask).sum()
    if n_dropped > 0:
        df = df.loc[valid_mask].reset_index(drop=True)
        report_parsed = report_parsed.loc[valid_mask].reset_index(drop=True)
        occurred_parsed = occurred_parsed.loc[valid_mask].reset_index(drop=True)
        print(f"Dropped {n_dropped} row(s) with invalid date-time format (expected MM/DD/YYYY HH:MM).")

    school_code = _school_code_from_filename(csv_path)

    out = pd.DataFrame({
        SCHOOL_CODE: school_code,
        CASE_NUMBER: df[UIUC_NUMBER].astype(str),
        REPORT_DATETIME: report_parsed,
        OCCURRED_DATETIME: occurred_parsed,
        LOCATION: df[UIUC_LOCATION].astype(str),
        LATITUDE: pd.NA,
        LONGITUDE: pd.NA,
        DESCRIPTION: df[UIUC_DESCRIPTION].astype(str).replace("nan", None) if UIUC_DESCRIPTION in df.columns else None,
        DISPOSITION: _normalize_disposition(df[UIUC_DISPOSITION]) if UIUC_DISPOSITION in df.columns else None,
        NARRATIVE: [None] * len(df),
    })

    ensure_location_has_city(out, school_code)

    if geocode:
        cache = _load_geocode_cache() if use_geocode_cache_file else {}
        for idx, loc in out[LOCATION].items():
            lat, lon = geocode_location(loc, cache=cache, region="Illinois, USA")
            out.at[idx, LATITUDE] = lat
            out.at[idx, LONGITUDE] = lon
        if use_geocode_cache_file and cache:
            _save_geocode_cache(cache)

    out[LATITUDE] = pd.to_numeric(out[LATITUDE], errors="coerce")
    out[LONGITUDE] = pd.to_numeric(out[LONGITUDE], errors="coerce")
    return out


def main():
    base = Path(__file__).resolve().parent.parent
    crime_logs_dir = base / "crime_logs"
    if not crime_logs_dir.exists():
        print(f"Crime logs directory not found: {crime_logs_dir}")
        return

    csv_path = crime_logs_dir / "001775_uiuc.csv"
    if not csv_path.exists():
        print(f"File not found: {csv_path}")
        return

    print(f"Processing {csv_path.name} (geocoding via Google Maps API, Illinois, USA)...")
    df = process_uiuc_csv(csv_path, geocode=True, use_geocode_cache_file=True)
    out_path = crime_logs_dir / "001775_uiuc_processed.csv"
    df.to_csv(out_path, index=False, date_format="%Y-%m-%dT%H:%M:%S.%fZ")
    print(f"Wrote {len(df)} rows to {out_path}")


if __name__ == "__main__":
    main()
