"""
Process Michigan State crime log CSV into the same schema as the other processed data.
Expects filename to start with school code (e.g. 002290_michstate.csv).
Status column is mapped to disposition. Output matches: school_code, case_number,
report_datetime, occurred_datetime, location, latitude, longitude, description,
disposition, narrative.
"""

import re
from pathlib import Path

import pandas as pd

from preprocess import (
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

# Michstate CSV column names
MICHSTATE_DESCRIPTION = "Description"
MICHSTATE_ADDRESS = "Address"
MICHSTATE_BUILDING = "Building"
MICHSTATE_OCCURRED = "Occurred_Time"
MICHSTATE_REPORTED = "Reported_Time"
MICHSTATE_CASE_NUMBER = "Case_Number"
MICHSTATE_STATUS = "Status"


def _school_code_from_filename(path: Path) -> str:
    """e.g. 002290_michstate.csv -> 002290"""
    stem = path.stem
    match = re.match(r"^(\d+)", stem)
    return match.group(1) if match else stem.split("_")[0] if "_" in stem else stem


def _parse_michstate_datetime(series: pd.Series) -> pd.Series:
    """Parse Michstate datetime (e.g. 2026-01-02 14:00:00) to UTC."""
    return pd.to_datetime(series, utc=True, errors="coerce")


def process_michstate_csv(
    csv_path: str | Path,
    geocode: bool = True,
    use_geocode_cache_file: bool = True,
) -> pd.DataFrame:
    """
    Load Michstate crime log CSV and transform to the same schema as the other processed data.

    - csv_path: path to CSV (e.g. preprocessing/crime_logs/002290_michstate.csv)
    - geocode: if True, resolve location to lat/lon via Google Maps (address + "Michigan, USA")
    - use_geocode_cache_file: if True, use shared geocode_cache.json

    Status is mapped to disposition. Returns DataFrame with: school_code, case_number,
    report_datetime, occurred_datetime, location, latitude, longitude, description,
    disposition, narrative.
    """
    csv_path = Path(csv_path)
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV not found: {csv_path}")

    df = pd.read_csv(csv_path)
    df.columns = df.columns.str.strip()
    required = (MICHSTATE_CASE_NUMBER, MICHSTATE_OCCURRED)
    for col in required:
        if col not in df.columns:
            raise ValueError(f"Expected column '{col}' in {csv_path.name}")

    # Drop rows where occurred datetime is invalid (required)
    occurred_parsed = _parse_michstate_datetime(df[MICHSTATE_OCCURRED])
    valid_mask = occurred_parsed.notna()
    n_dropped = (~valid_mask).sum()
    if n_dropped > 0:
        df = df.loc[valid_mask].reset_index(drop=True)
        occurred_parsed = occurred_parsed.loc[valid_mask].reset_index(drop=True)
        print(f"Dropped {n_dropped} row(s) with invalid occurred date-time.")

    # Report datetime
    if MICHSTATE_REPORTED in df.columns:
        report_parsed = _parse_michstate_datetime(df[MICHSTATE_REPORTED])
    else:
        report_parsed = pd.Series([pd.NaT] * len(df))

    school_code = _school_code_from_filename(csv_path)

    # Location: Address if non-empty, else Building
    def _str_series(col: str) -> pd.Series:
        return df[col].astype(str).str.strip().replace("nan", "")

    if MICHSTATE_ADDRESS in df.columns and MICHSTATE_BUILDING in df.columns:
        addr = _str_series(MICHSTATE_ADDRESS)
        bld = _str_series(MICHSTATE_BUILDING)
        location_series = addr.where(addr != "", bld)
    elif MICHSTATE_ADDRESS in df.columns:
        location_series = _str_series(MICHSTATE_ADDRESS)
    elif MICHSTATE_BUILDING in df.columns:
        location_series = _str_series(MICHSTATE_BUILDING)
    else:
        location_series = pd.Series([""] * len(df))

    out = pd.DataFrame({
        SCHOOL_CODE: school_code,
        CASE_NUMBER: df[MICHSTATE_CASE_NUMBER].astype(str),
        REPORT_DATETIME: report_parsed,
        OCCURRED_DATETIME: occurred_parsed,
        LOCATION: location_series,
        LATITUDE: pd.NA,
        LONGITUDE: pd.NA,
        DESCRIPTION: df[MICHSTATE_DESCRIPTION].astype(str).replace("nan", None) if MICHSTATE_DESCRIPTION in df.columns else None,
        DISPOSITION: _normalize_disposition(df[MICHSTATE_STATUS]) if MICHSTATE_STATUS in df.columns else None,
        NARRATIVE: [None] * len(df),
    })

    ensure_location_has_city(out, school_code)

    if geocode:
        cache = _load_geocode_cache() if use_geocode_cache_file else {}
        for idx, loc in out[LOCATION].items():
            if not str(loc).strip():
                continue
            lat, lon = geocode_location(loc, cache=cache, region="Michigan, USA")
            out.at[idx, LATITUDE] = lat
            out.at[idx, LONGITUDE] = lon
        if use_geocode_cache_file and cache:
            _save_geocode_cache(cache)

    out[LATITUDE] = pd.to_numeric(out[LATITUDE], errors="coerce")
    out[LONGITUDE] = pd.to_numeric(out[LONGITUDE], errors="coerce")
    return out


def main():
    base = Path(__file__).resolve().parent
    crime_logs_dir = base / "crime_logs"
    if not crime_logs_dir.exists():
        print(f"Crime logs directory not found: {crime_logs_dir}")
        return

    csv_path = crime_logs_dir / "002290_michstate.csv"
    if not csv_path.exists():
        print(f"File not found: {csv_path}")
        return

    print(f"Processing {csv_path.name} (geocoding via Google Maps API, Michigan, USA)...")
    df = process_michstate_csv(csv_path, geocode=True, use_geocode_cache_file=True)
    out_path = crime_logs_dir / "002290_michstate_processed.csv"
    df.to_csv(out_path, index=False, date_format="%Y-%m-%dT%H:%M:%S.%fZ")
    print(f"Wrote {len(df)} rows to {out_path}")


if __name__ == "__main__":
    main()
