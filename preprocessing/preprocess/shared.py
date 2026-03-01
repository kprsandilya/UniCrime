"""
Shared preprocessing utilities: geocoding (Google Maps API + cache), schema constants,
and disposition normalization. Used by preprocess_uiuc, preprocess_umich, etc.
"""

import json
import os
from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen

import pandas as pd
from dotenv import load_dotenv

# Paths relative to preprocessing/ root (parent of this package)
_PREPROCESSING_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_PREPROCESSING_ROOT / ".env")

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
NARRATIVE = "narrative"

# Cache and federal CSV in preprocessing/
GEOCODE_CACHE_PATH = _PREPROCESSING_ROOT / "geocode_cache.json"
FEDERAL_SCHOOL_CODE_CSV = _PREPROCESSING_ROOT / "2627FederalSchoolCodeList2ndQuarter.csv"


def get_school_city_lookup(csv_path: str | Path | None = None) -> dict[str, str]:
    """Load federal school code CSV and return a mapping of school_code -> City."""
    path = Path(csv_path) if csv_path is not None else FEDERAL_SCHOOL_CODE_CSV
    if not path.exists():
        return {}
    try:
        df = pd.read_csv(path, encoding="utf-8")
    except UnicodeDecodeError:
        df = pd.read_csv(path, encoding="cp1252")
    df.columns = df.columns.str.strip()
    if "School Code" not in df.columns or "City" not in df.columns:
        return {}
    return df.set_index(df["School Code"].astype(str).str.strip())["City"].astype(str).str.strip().to_dict()


def ensure_location_has_city(
    out: pd.DataFrame,
    school_code: str,
    city_lookup: dict[str, str] | None = None,
    location_column: str = LOCATION,
) -> None:
    """
    For rows where the location string does not contain a comma, append ", {City}"
    using the City from the federal school code CSV for the given school_code. Modifies out in place.
    """
    if city_lookup is None:
        city_lookup = get_school_city_lookup()
    city = city_lookup.get(str(school_code).strip())
    if not city:
        return
    city_str = city.title()
    for idx in out.index:
        loc = out.at[idx, location_column]
        if pd.isna(loc) or not str(loc).strip():
            continue
        if "," not in str(loc):
            out.at[idx, location_column] = f"{str(loc).strip()}, {city_str}"


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
    region: str = "Illinois, USA",
) -> tuple[float | None, float | None]:
    """
    Resolve an address string to (latitude, longitude) using Google Maps Geocoding API.
    Set GOOGLE_MAPS_API_KEY in the environment (or pass api_key). Uses an optional cache.
    region: appended to the address for geocoding (e.g. "Illinois, USA", "Michigan, USA").
    """
    if not location or not str(location).strip():
        return (None, None)
    location = str(location).strip()
    query = f"{location}, {region}"

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


def _normalize_disposition(series: pd.Series) -> pd.Series:
    """Title-case disposition, remove surrounding quotation marks, and replace commas with ' - ' so CSV output is not quoted."""
    s = series.astype(str).replace("nan", None)
    return s.apply(
        lambda x: (
            None
            if pd.isna(x) or x in (None, "", "nan")
            else str(x).strip().strip('"\'').title().replace(", ", " - ")
        )
    )


def clean_federal_school_code_csv(csv_path: str | Path | None = None) -> None:
    """Remove '/' characters from the 'School Name' column of the federal school code CSV."""
    if csv_path is None:
        csv_path = FEDERAL_SCHOOL_CODE_CSV
    df = pd.read_csv(csv_path, encoding="cp1252")
    df["School Name"] = df["School Name"].astype(str).str.replace("/", "", regex=False)
    df.to_csv(csv_path, index=False, encoding="utf-8")


if __name__ == "__main__":
    clean_federal_school_code_csv()
    print("Run preprocess scripts from the preprocess/ folder (e.g. python -m preprocess.preprocess_uiuc).")
