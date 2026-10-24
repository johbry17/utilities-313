"""
build_utilities_313.py

Single-command build script for the Utilities-313 project.
Run from the repository root:

    python build_utilities_313.py

Steps:
  1. Extract data from Google Sheets and write resources/utilities_313.csv
  2. Execute utilities_313_EDA.ipynb and export to utilities_313_EDA.html
  3. Inject title, description, author, and favicon metadata into the HTML
"""

import importlib.util
import re
import subprocess
import sys
from pathlib import Path

import gspread
import pandas as pd
from bs4 import BeautifulSoup
from oauth2client.service_account import ServiceAccountCredentials

# ── paths ─────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent
RESOURCES_DIR = ROOT / "resources"
CREDS_FILE = RESOURCES_DIR / "utilities.json"
CSV_OUT = RESOURCES_DIR / "utilities_313.csv"
EDA_NOTEBOOK = ROOT / "utilities_313_EDA.ipynb"
EDA_HTML = ROOT / "utilities_313_EDA.html"

# ── HTML metadata ─────────────────────────────────────────────────────────────
HTML_META = {
    "title": "Utilities 313 - Exploratory Data Analysis",
    "description": "An exploratory data analysis project for utilities consumption in a shared living space.",
    "author": "Bryan C. Johns",
    "favicon": "static/images/favicon.ico",
}

# ── Pepco source-data corrections (Dec 2023 – Apr 2024) ─────────────────────
# Values from the "Pepco Update" worksheet, applied here to avoid storing
# uncorrected figures in the CSV.
PEPCO_CORRECTIONS = {
    "2023-12-01": 192.81,
    "2024-01-01": 196.28,
    "2024-02-01": 174.56,
    "2024-03-01": 158.60,
    "2024-04-01": 139.34,
}


# ── helpers ───────────────────────────────────────────────────────────────────

def _load_name_map():
    """Load name_map from resources/name_scrubber.py without adding to sys.path."""
    spec = importlib.util.spec_from_file_location("name_scrubber", RESOURCES_DIR / "name_scrubber.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.name_map


def _clean_currency(value: str) -> float | None:
    """Strip currency symbols and return a float, or None for empty values."""
    if value:
        cleaned = re.sub(r"[^\d.]", "", value)
        return float(cleaned) if cleaned else None
    return None


# ── step 1: extract and clean ─────────────────────────────────────────────────

def extract_data() -> pd.DataFrame:
    """Authenticate to Google Sheets and batch-read all utility worksheet data."""
    print("  Authenticating to Google Sheets...")
    scope = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive",
    ]
    creds = ServiceAccountCredentials.from_json_keyfile_name(str(CREDS_FILE), scope)
    client = gspread.authorize(creds)
    spreadsheet = client.open("Utilities 313")

    # exclude non-data worksheets
    sheets = [
        s for s in spreadsheet.worksheets()
        if s.title.lower() not in ("template", "pepco update")
    ]
    ranges = [f"{s.title}!A2:C6" for s in sheets]

    print(f"  Fetching {len(sheets)} worksheets (single batch API call)...")
    resp = spreadsheet.values_batch_get(ranges=ranges)

    data = []
    skipped = []
    for rng, vr in zip(ranges, resp["valueRanges"]):
        sheet_title = rng.split("!")[0]
        date = pd.to_datetime(sheet_title, errors="coerce")
        if pd.isna(date):
            skipped.append(sheet_title)
            continue
        for row in vr.get("values", []):
            if len(row) >= 3:
                expense, name, amount = row[0], row[1], _clean_currency(row[2])
                data.append([date, expense, name, amount])

    if skipped:
        print(f"  Skipped non-date worksheets: {skipped}")
    print(f"  Extracted {len(data)} rows.")

    return pd.DataFrame(data, columns=["Date", "Expense", "Name", "Amount"])


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """Apply pseudonymization, source-data corrections, derived columns, and sort."""
    # pseudonymize names
    name_map = _load_name_map()
    df = name_map(df)

    # Pepco corrections for Dec 2023 – Apr 2024
    for date_str, amount in PEPCO_CORRECTIONS.items():
        mask = (df["Date"] == date_str) & (df["Expense"] == "Pepco")
        if mask.any():
            df.loc[mask, "Amount"] = amount

    # Move March 2023 CleanChoice to February 2023
    # (Zen Master Shabaka moved out; bill arrived in the wrong month)
    mask = (df["Date"] == "2023-03-01") & (df["Expense"] == "CleanChoice")
    if mask.any():
        df.loc[mask, "Date"] = pd.Timestamp("2023-02-01")

    # NOTE: $143.50 CleanChoice adjustment for June 2023 remains commented out
    # pending confirmation with Detman. Do not enable without explicit sign-off.
    # df.loc[(df["Date"] == "2023-06-01") & (df["Expense"] == "CleanChoice"), "Amount"] -= 143.5

    # normalize utility provider name
    df.loc[df["Expense"] == "Pepco/Exelon", "Expense"] = "Pepco"

    df["Year"] = pd.to_datetime(df["Date"]).dt.year
    df["Month"] = pd.to_datetime(df["Date"]).dt.month

    return df.sort_values(by="Date").reset_index(drop=True)


# ── step 2: EDA notebook → HTML ───────────────────────────────────────────────

def _jupyter_nbconvert() -> str:
    """Return the nbconvert executable that lives beside the active Python interpreter."""
    scripts_dir = Path(sys.executable).parent
    # On Windows the executable is in Scripts/; on Unix it is in bin/ (same dir as python).
    for candidate in (
        scripts_dir / "jupyter-nbconvert",
        scripts_dir / "jupyter-nbconvert.exe",
        scripts_dir / "Scripts" / "jupyter-nbconvert",
        scripts_dir / "Scripts" / "jupyter-nbconvert.exe",
    ):
        if candidate.exists():
            return str(candidate)
    # Fallback: let the shell find it (will raise CalledProcessError if missing).
    return "jupyter-nbconvert"


def export_eda_html() -> None:
    """Execute the EDA notebook and export to HTML with no input cells shown."""
    cmd = [
        _jupyter_nbconvert(),
        "--to", "html",
        "--execute",
        "--no-input",
        "--output", str(EDA_HTML),
        str(EDA_NOTEBOOK),
    ]
    subprocess.run(cmd, check=True, cwd=ROOT)
    print(f"  HTML written to: {EDA_HTML.name}")


# ── step 3: inject HTML metadata ─────────────────────────────────────────────

def inject_metadata() -> None:
    """Insert/update title, description, author, and favicon in the EDA HTML (idempotent)."""
    html_text = EDA_HTML.read_text(encoding="utf-8")
    soup = BeautifulSoup(html_text, "html.parser")

    if soup.head is None:
        soup.html.insert(0, soup.new_tag("head"))

    # title
    if soup.head.title:
        soup.head.title.string = HTML_META["title"]
    else:
        t = soup.new_tag("title")
        t.string = HTML_META["title"]
        soup.head.insert(0, t)

    # description and author (idempotent: update existing or append new)
    for name in ("description", "author"):
        tag = soup.head.find("meta", attrs={"name": name})
        if tag:
            tag["content"] = HTML_META[name]
        else:
            tag = soup.new_tag("meta", attrs={"name": name, "content": HTML_META[name]})
            soup.head.append(tag)

    # favicon (idempotent)
    link = soup.head.find("link", rel="icon")
    if link:
        link["href"] = HTML_META["favicon"]
    else:
        link_tag = soup.new_tag(
            "link",
            attrs={"rel": "icon", "href": HTML_META["favicon"], "type": "image/x-icon"},
        )
        soup.head.append(link_tag)

    EDA_HTML.write_text(str(soup), encoding="utf-8")
    print(f"  Metadata injected into: {EDA_HTML.name}")


# ── main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    print("=== Utilities 313 Build Pipeline ===\n")

    print("[1/3] Extracting and cleaning data...")
    df = extract_data()
    df = clean_data(df)
    df.to_csv(CSV_OUT, index=False)
    print(f"  CSV written to: {CSV_OUT.relative_to(ROOT)}")

    print("\n[2/3] Exporting EDA report to HTML...")
    export_eda_html()

    print("\n[3/3] Injecting HTML metadata...")
    inject_metadata()

    print("\n=== Build complete. ===")


if __name__ == "__main__":
    main()
