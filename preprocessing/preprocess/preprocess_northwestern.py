"""
Process Northwestern crime log CSV into the same schema as the other processed data.
Expects filename to start with school code (e.g. 001739_northwestern.csv).
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

# Northwestern CSV column names (same structure as UMich/Purdue)
NW_NUMBER = "Number"
NW_REPORTED = "Reported_Date_Time"
NW_OCCURRED = "Occurred_From_Date_Time"
NW_LOCATION = "Location"
NW_DESCRIPTION = "Description"
NW_DISPOSITION = "Disposition"
NW_NARRATIVE = "Narrative"
NW_LAT = "latitude"
NW_LON = "longitude"


def _school_code_from_filename(path: Path) -> str:
    """e.g. 001739_northwestern.csv -> 001739"""
    stem = path.stem
    match = re.match(r"^(\d+)", stem)
    return match.group(1) if match else stem.split("_")[0] if "_" in stem else stem


def _parse_northwestern_datetime(series: pd.Series) -> pd.Series:
    """Parse Northwestern datetime (e.g. February 01, 2026 at 11:25:24 PM) to UTC."""
    return pd.to_datetime(series, format="%B %d, %Y at %I:%M:%S %p", utc=True, errors="coerce")


def process_northwestern_csv(
    csv_path: str | Path,
    geocode: bool = True,
    use_geocode_cache_file: bool = True,
) -> pd.DataFrame:
    """
    Load Northwestern crime log CSV and transform to the same schema as the other processed data.

    - csv_path: path to CSV (e.g. preprocessing/crime_logs/001739_northwestern.csv)
    - geocode: if True, resolve location to lat/lon via Google Maps (address + "Illinois, USA")
    - use_geocode_cache_file: if True, use shared geocode_cache.json

    Returns DataFrame with: school_code, case_number, report_datetime, occurred_datetime,
    location, latitude, longitude, description, disposition, narrative.
    """
    csv_path = Path(csv_path)
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV not found: {csv_path}")

    df = pd.read_csv(csv_path)
    df.columns = df.columns.str.strip()
    required = (NW_NUMBER, NW_OCCURRED, NW_LOCATION)
    for col in required:
        if col not in df.columns:
            raise ValueError(f"Expected column '{col}' in {csv_path.name}")

    # Drop rows where occurred datetime is invalid (required)
    occurred_parsed = _parse_northwestern_datetime(df[NW_OCCURRED])
    valid_mask = occurred_parsed.notna()
    n_dropped = (~valid_mask).sum()
    if n_dropped > 0:
        df = df.loc[valid_mask].reset_index(drop=True)
        occurred_parsed = occurred_parsed.loc[valid_mask].reset_index(drop=True)
        print(f"Dropped {n_dropped} row(s) with invalid occurred date-time.")

    # Report datetime
    if NW_REPORTED in df.columns:
        report_parsed = _parse_northwestern_datetime(df[NW_REPORTED])
    else:
        report_parsed = pd.Series([pd.NaT] * len(df))

    school_code = _school_code_from_filename(csv_path)

    # Location: pandas reads unquoted "NA" as NaN; normalize to "Unknown Location"
    location_series = (
        df[NW_LOCATION]
        .fillna("Unknown Location")
        .astype(str)
        .str.strip()
        .replace(["NA", "nan", "<NA>"], "Unknown Location")
    )
    location_series = location_series.replace("", "Unknown Location")

    # Use lat/lon from CSV when both present and numeric
    lat_raw = pd.to_numeric(df[NW_LAT], errors="coerce") if NW_LAT in df.columns else pd.Series([float("nan")] * len(df))
    lon_raw = pd.to_numeric(df[NW_LON], errors="coerce") if NW_LON in df.columns else pd.Series([float("nan")] * len(df))
    has_csv_coords = lat_raw.notna() & lon_raw.notna()

    out = pd.DataFrame({
        SCHOOL_CODE: school_code,
        CASE_NUMBER: df[NW_NUMBER].astype(str),
        REPORT_DATETIME: report_parsed,
        OCCURRED_DATETIME: occurred_parsed,
        LOCATION: location_series,
        LATITUDE: lat_raw.where(has_csv_coords),
        LONGITUDE: lon_raw.where(has_csv_coords),
        DESCRIPTION: df[NW_DESCRIPTION].astype(str).replace("nan", None) if NW_DESCRIPTION in df.columns else None,
        DISPOSITION: _normalize_disposition(df[NW_DISPOSITION]) if NW_DISPOSITION in df.columns else None,
        NARRATIVE: df[NW_NARRATIVE].astype(str).replace("nan", None).replace("", None) if NW_NARRATIVE in df.columns else [None] * len(df),
    })

    ensure_location_has_city(out, school_code)

    # Geocode rows that have no lat/lon and have a non-empty location
    if geocode:
        cache = _load_geocode_cache() if use_geocode_cache_file else {}
        for idx, row in out.iterrows():
            if pd.notna(out.at[idx, LATITUDE]) and pd.notna(out.at[idx, LONGITUDE]):
                continue
            loc = row[LOCATION]
            if not str(loc).strip():
                continue
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

    csv_path = crime_logs_dir / "001739_northwestern.csv"
    if not csv_path.exists():
        print(f"File not found: {csv_path}")
        return

    print(f"Processing {csv_path.name} (geocoding via Google Maps API, Illinois, USA)...")
    df = process_northwestern_csv(csv_path, geocode=True, use_geocode_cache_file=True)
    out_path = crime_logs_dir / "001739_northwestern_processed.csv"
    df.to_csv(out_path, index=False, date_format="%Y-%m-%dT%H:%M:%S.%fZ")
    print(f"Wrote {len(df)} rows to {out_path}")


if __name__ == "__main__":
    main()
