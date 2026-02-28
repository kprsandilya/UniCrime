import json
import os
import re
from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen

import pandas as pd
from dotenv import load_dotenv

# Load .env from the preprocessing directory (where this script lives)
load_dotenv(Path(__file__).resolve().parent / ".env")

# Columns in UIUC-style crime log CSV
CSV_NUMBER = "Number"
CSV_REPORTED = "Reported Date/Time"
CSV_OCCURRED = "Occurred From Date/Time"
CSV_LOCATION = "Location"
CSV_DESCRIPTION = "Description"
CSV_DISPOSITION = "Disposition"

# Entity columns (match crime-log.entity.ts)
SCHOOL_CODE = "school_code"
CASE_NUMBER = "case_number"
REPORT_DATETIME = "report_datetime"
OCCURRED_DATETIME = "occurred_datetime"
LOCATION = "location"
LATITUDE = "latitude"
LONGITUDE = "longitude"
DESCRIPTION = "description"
DISPOSITION = "disposition"

# Cache to avoid re-querying same addresses (Google Maps API has usage quotas)
GEOCODE_CACHE_PATH = Path(__file__).parent / "geocode_cache.json"


def _load_geocode_cache() -> dict[str, tuple[float, float] | None]:
    if not GEOCODE_CACHE_PATH.exists():
        return {}
    try:
        with open(GEOCODE_CACHE_PATH, encoding="utf-8") as f:
            data = json.load(f)
        return {k: tuple(v) if v is not None else None for k, v in data.items()}
    except (json.JSONDecodeError, TypeError):
        return {}


def _save_geocode_cache(cache: dict[str, tuple[float, float] | None]) -> None:
    """Only persist successful results so failed lookups are retried on next run."""
    out = {k: list(v) for k, v in cache.items() if v is not None}
    with open(GEOCODE_CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)


def _geocode_google(address: str, api_key: str) -> tuple[float | None, float | None]:
    """Call Google Maps Geocoding API. Returns (lat, lng) or (None, None)."""
    url = (
        "https://maps.googleapis.com/maps/api/geocode/json?"
        f"address={quote(address)}&key={api_key}"
    )
    try:
        with urlopen(url, timeout=10) as resp:
            data = json.loads(resp.read().decode())
    except Exception as e:
        print(f"Geocode request failed for {address[:50]}...: {e}")
        return (None, None)
    status = data.get("status")
    if status != "OK" or not data.get("results"):
        if status != "ZERO_RESULTS":
            err = data.get("error_message", status)
            print(f"Geocode API {status}: {err}")
        return (None, None)
    loc = data["results"][0].get("geometry", {}).get("location")
    if not loc or "lat" not in loc or "lng" not in loc:
        return (None, None)
    return (round(float(loc["lat"]), 7), round(float(loc["lng"]), 7))


def geocode_location(
    location: str,
    cache: dict[str, tuple[float, float] | None] | None = None,
    api_key: str | None = None,
) -> tuple[float | None, float | None]:
    """
    Resolve an address string to (latitude, longitude) using Google Maps Geocoding API.
    Set GOOGLE_MAPS_API_KEY in the environment (or pass api_key). Uses an optional cache.
    """
    if not location or not str(location).strip():
        return (None, None)
    location = str(location).strip()
    query = f"{location}, Illinois, USA"

    cache = cache if cache is not None else {}
    cache_key = query
    # Only use cache for successful results; retry if we had a previous failure
    if cache_key in cache and cache[cache_key] is not None:
        return cache[cache_key]

    key = api_key or os.environ.get("GOOGLE_MAPS_API_KEY")
    if not key:
        print("Warning: GOOGLE_MAPS_API_KEY not set; skipping geocoding for this run.")
        return (None, None)

    print(f"Geocoding (Google Maps): {query}")
    try:
        coords = _geocode_google(query, key)
        if coords[0] is not None and coords[1] is not None:
            cache[cache_key] = coords
        return coords
    except Exception:
        return (None, None)


def _school_code_from_filename(path: Path) -> str:
    """e.g. 001775_uiuc.csv -> 001775"""
    stem = path.stem
    match = re.match(r"^(\d+)", stem)
    return match.group(1) if match else stem.split("_")[0] if "_" in stem else stem


def _parse_datetime(series: pd.Series) -> pd.Series:
    """Parse 'MM/DD/YYYY HH:MM' into timezone-aware datetime (UTC for storage)."""
    return pd.to_datetime(series, format="%m/%d/%Y %H:%M", utc=True)


def _normalize_disposition(series: pd.Series) -> pd.Series:
    """Title-case disposition and remove surrounding quotation marks."""
    s = series.astype(str).replace("nan", None)
    return s.apply(
        lambda x: (
            None
            if pd.isna(x) or x in (None, "", "nan")
            else str(x).strip().strip('"\'').title()
        )
    )


def process_crime_log_csv(
    csv_path: str | Path,
    geocode: bool = True,
    use_geocode_cache_file: bool = True,
) -> pd.DataFrame:
    """
    Load a UIUC-style crime log CSV and transform it into a table matching the CrimeLog entity.

    - csv_path: path to CSV (e.g. preprocessing/crime_logs/001775_uiuc.csv)
    - geocode: if True, resolve Location to latitude/longitude via Google Maps Geocoding API (set GOOGLE_MAPS_API_KEY)
    - use_geocode_cache_file: if True, load/save geocode_cache.json to avoid re-querying same addresses

    Returns a DataFrame with columns: school_code, case_number, report_datetime, occurred_datetime,
    location, latitude, longitude, description, disposition.
    """
    csv_path = Path(csv_path)
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV not found: {csv_path}")

    df = pd.read_csv(csv_path)
    for col in (CSV_NUMBER, CSV_REPORTED, CSV_OCCURRED, CSV_LOCATION):
        if col not in df.columns:
            raise ValueError(f"Expected column '{col}' in {csv_path.name}")

    # Drop rows where datetime columns don't parse as MM/DD/YYYY HH:MM
    report_parsed = pd.to_datetime(df[CSV_REPORTED], format="%m/%d/%Y %H:%M", errors="coerce")
    occurred_parsed = pd.to_datetime(df[CSV_OCCURRED], format="%m/%d/%Y %H:%M", errors="coerce")
    valid_mask = report_parsed.notna() & occurred_parsed.notna()
    n_dropped = (~valid_mask).sum()
    if n_dropped > 0:
        df = df.loc[valid_mask].reset_index(drop=True)
        print(f"Dropped {n_dropped} row(s) with invalid date-time format (expected MM/DD/YYYY HH:MM).")

    school_code = _school_code_from_filename(csv_path)

    out = pd.DataFrame({
        SCHOOL_CODE: school_code,
        CASE_NUMBER: df[CSV_NUMBER].astype(str),
        REPORT_DATETIME: _parse_datetime(df[CSV_REPORTED]),
        OCCURRED_DATETIME: _parse_datetime(df[CSV_OCCURRED]),
        LOCATION: df[CSV_LOCATION].astype(str),
        LATITUDE: pd.NA,
        LONGITUDE: pd.NA,
        DESCRIPTION: df[CSV_DESCRIPTION].astype(str).replace("nan", None) if CSV_DESCRIPTION in df.columns else None,
        DISPOSITION: _normalize_disposition(df[CSV_DISPOSITION]) if CSV_DISPOSITION in df.columns else None,
    })

    if geocode:
        cache = _load_geocode_cache() if use_geocode_cache_file else {}
        for idx, loc in out[LOCATION].items():
            lat, lon = geocode_location(loc, cache=cache)
            out.at[idx, LATITUDE] = lat
            out.at[idx, LONGITUDE] = lon
        if use_geocode_cache_file and cache:
            _save_geocode_cache(cache)

    out[LATITUDE] = pd.to_numeric(out[LATITUDE], errors="coerce")
    out[LONGITUDE] = pd.to_numeric(out[LONGITUDE], errors="coerce")
    return out


def clean_federal_school_code_csv(csv_path: str | Path | None = None) -> None:
    """Remove '/' characters from the 'School Name' column of the federal school code CSV."""
    if csv_path is None:
        csv_path = Path(__file__).parent / "2627FederalSchoolCodeList2ndQuarter.csv"
    df = pd.read_csv(csv_path)
    df["School Name"] = df["School Name"].astype(str).str.replace("/", "", regex=False)
    df.to_csv(csv_path, index=False)


def main():
    crime_logs_dir = Path(__file__).parent / "crime_logs"
    if not crime_logs_dir.exists():
        print(f"Crime logs directory not found: {crime_logs_dir}")
        return

    # Process 001775_uiuc.csv as requested
    csv_path = crime_logs_dir / "001775_uiuc.csv"
    if not csv_path.exists():
        print(f"File not found: {csv_path}")
        return

    print(f"Processing {csv_path.name} (geocoding via Google Maps API)...")
    df = process_crime_log_csv(csv_path, geocode=True, use_geocode_cache_file=True)
    out_path = crime_logs_dir / "001775_uiuc_processed.csv"
    df.to_csv(out_path, index=False, date_format="%Y-%m-%dT%H:%M:%S.%fZ")
    print(f"Wrote {len(df)} rows to {out_path}")

    # Optionally iterate all CSVs in crime_logs (and subfolders) later:
    # for p in crime_logs_dir.rglob("*.csv"):
    #     if "_processed" in p.name:
    #         continue
    #     ...


if __name__ == "__main__":
    main()