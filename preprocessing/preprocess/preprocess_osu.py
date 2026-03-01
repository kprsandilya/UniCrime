"""
Process Ohio State (OSU) crime log TSV/CSV into the same schema as the other processed data.
File is tab-delimited. Expects filename like 003090_osu.csv.
Output: school_code, case_number, report_datetime, occurred_datetime, location,
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

# OSU file column names (tab-delimited)
OSU_CASE_NUMBER = "Case Number"
OSU_REPORTED = "Date/Time Reported"
OSU_OCCURRED_START = "Date/Time Occurrence Start"
OSU_LOCATION = "General Location"
OSU_OFFENSES = "Offenses"
OSU_DISPOSITION = "Disposition"


def _school_code_from_filename(path: Path) -> str:
    """e.g. 003090_osu.csv -> 003090"""
    stem = path.stem
    match = re.match(r"^(\d+)", stem)
    return match.group(1) if match else stem.split("_")[0] if "_" in stem else stem


def _parse_osu_datetime(series: pd.Series) -> pd.Series:
    """Parse OSU datetime (e.g. 2/27/2026 2:44:00 PM) to UTC. Accepts single or double digit month/day."""
    return pd.to_datetime(series, utc=True, errors="coerce")


def process_osu_csv(
    csv_path: str | Path,
    geocode: bool = True,
    use_geocode_cache_file: bool = True,
) -> pd.DataFrame:
    """
    Load OSU crime log (tab-delimited) and transform to the same schema as the other processed data.

    - csv_path: path to file (e.g. preprocessing/crime_logs/003090_osu.csv)
    - geocode: if True, resolve location to lat/lon via Google Maps (address + "Ohio, USA")
    - use_geocode_cache_file: if True, use shared geocode_cache.json

    Returns DataFrame with: school_code, case_number, report_datetime, occurred_datetime,
    location, latitude, longitude, description, disposition, narrative.
    """
    csv_path = Path(csv_path)
    if not csv_path.exists():
        raise FileNotFoundError(f"File not found: {csv_path}")

    for encoding in ("utf-8", "utf-16", "utf-16-le", "cp1252"):
        try:
            df = pd.read_csv(csv_path, sep="\t", encoding=encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise UnicodeDecodeError("utf-8", b"", 0, 1, "Could not decode file with utf-8, utf-16, utf-16-le, or cp1252")
    df.columns = df.columns.str.strip()
    # Duplicate "Disposition" header becomes "Disposition.1"; we only need the first
    required = (OSU_CASE_NUMBER, OSU_OCCURRED_START, OSU_LOCATION)
    for col in required:
        if col not in df.columns:
            raise ValueError(f"Expected column '{col}' in {csv_path.name}")

    # Drop rows where occurred datetime is invalid (required)
    occurred_parsed = _parse_osu_datetime(df[OSU_OCCURRED_START])
    valid_mask = occurred_parsed.notna()
    n_dropped = (~valid_mask).sum()
    if n_dropped > 0:
        df = df.loc[valid_mask].reset_index(drop=True)
        occurred_parsed = occurred_parsed.loc[valid_mask].reset_index(drop=True)
        print(f"Dropped {n_dropped} row(s) with invalid occurred date-time.")

    # Report datetime
    if OSU_REPORTED in df.columns:
        report_parsed = _parse_osu_datetime(df[OSU_REPORTED])
    else:
        report_parsed = pd.Series([pd.NaT] * len(df))

    school_code = _school_code_from_filename(csv_path)

    # No lat/lon in OSU file; all will be filled by geocoding or left NaN
    out = pd.DataFrame({
        SCHOOL_CODE: school_code,
        CASE_NUMBER: df[OSU_CASE_NUMBER].astype(str),
        REPORT_DATETIME: report_parsed,
        OCCURRED_DATETIME: occurred_parsed,
        LOCATION: df[OSU_LOCATION].astype(str),
        LATITUDE: pd.Series([float("nan")] * len(df)),
        LONGITUDE: pd.Series([float("nan")] * len(df)),
        DESCRIPTION: df[OSU_OFFENSES].astype(str).replace("nan", None) if OSU_OFFENSES in df.columns else [None] * len(df),
        DISPOSITION: _normalize_disposition(df[OSU_DISPOSITION]) if OSU_DISPOSITION in df.columns else [None] * len(df),
        NARRATIVE: [None] * len(df),
    })

    ensure_location_has_city(out, school_code)

    # Geocode rows that have no lat/lon
    if geocode:
        cache = _load_geocode_cache() if use_geocode_cache_file else {}
        for idx, row in out.iterrows():
            loc = row[LOCATION]
            if not str(loc).strip():
                continue
            lat, lon = geocode_location(loc, cache=cache, region="Ohio, USA")
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

    csv_path = crime_logs_dir / "003090_osu.csv"
    if not csv_path.exists():
        print(f"File not found: {csv_path}")
        return

    print(f"Processing {csv_path.name} (tab-delimited, geocoding via Google Maps API, Ohio, USA)...")
    df = process_osu_csv(csv_path, geocode=True, use_geocode_cache_file=True)
    out_path = crime_logs_dir / "003090_osu_processed.csv"
    df.to_csv(out_path, index=False, date_format="%Y-%m-%dT%H:%M:%S.%fZ")
    print(f"Wrote {len(df)} rows to {out_path}")


if __name__ == "__main__":
    main()
