"""
fix_data.py — CarbonLedger data correction script

Applies six surgical fixes to aggregated_data.csv and country_aggregated_data.csv:
  A) AMS-III.AU: move credits from 'Mixed renewables' ->'Rice cultivation' (Verra)
  B) AMS-III.AK: move credits from 'Cleaner cooking' ->'Public transit' (Verra)
  C) Rename project type 'Agriculture' ->'Soil & Livestock' in both CSVs
  D) Gold Standard unmapped rows: replace 'No Methodology Provided' with
     categorized rows derived from the raw Excel project type labels

Usage:
  python scripts/fix_data.py

Requires: pandas, openpyxl
"""

import json
import os
import shutil
import sys

import pandas as pd
import re

RAW_EXCEL = os.environ.get("VROD_EXCEL_PATH")
if not RAW_EXCEL:
    print("Error: VROD_EXCEL_PATH environment variable is not set.")
    print("  Set it to the path of the VROD Excel file, e.g.:")
    print("  export VROD_EXCEL_PATH=/path/to/VROD-registry-files.xlsx")
    sys.exit(1)
AGG_CSV   = "public/aggregated_data.csv"
CTRY_CSV  = "public/country_aggregated_data.csv"

# ---------------------------------------------------------------------------
# Gold Standard project-type ->Project Type Category mapping
# ---------------------------------------------------------------------------
def map_gold_project_type(pt):
    """Map a Gold Standard project type label to a Project Type Category."""
    if pd.isna(pt):
        return "Other"
    pt = str(pt).strip()
    pl = pt.lower()

    if pl == "wind":
        return "Wind"
    if pl in ("a/r", "afforestation/reforestation") or re.match(r"afforest|reforest", pl):
        return "Afforestation/Reforestation"
    if re.match(r"biogas|biomass", pl):
        return "Bioenergy"
    if re.match(r"solar|pv$", pl):
        return "Solar"
    if re.match(r"small.*hydro|hydro", pl):
        return "Hydropower"
    if pl == "geothermal":
        return "Geothermal"
    if pl == "grid efficiency":
        return "Grid efficiency"
    if re.match(r"energy efficiency", pl):
        return "Efficient appliances"
    if pl == "agriculture":
        return "Soil & Livestock"
    if pl == "composting":
        return "Composting"
    if re.match(r"manure|livestock", pl):
        return "Soil & Livestock"
    if pl == "landfill gas":
        return "Landfill gas"
    if re.match(r"waste", pl):
        return "Waste management"
    if re.match(r"industrial", pl):
        return "Industrial efficiency"
    return "Other"


def _map_verra_project_type(pt):
    """Map a Verra Project Type label to a category. Returns None if unrecognised."""
    if pd.isna(pt):
        return None
    pt = str(pt).strip()
    pl = pt.lower()
    if 'agriculture forestry' in pl or 'land use' in pl:
        return 'Afforestation/Reforestation'
    if 'energy industries' in pl:
        return 'Mixed renewables'
    if 'energy demand' in pl:
        return 'Efficient appliances'
    if 'fugitive emissions' in pl:
        return 'Fossil gas leaks'
    if 'waste handling' in pl or 'waste disposal' in pl:
        return 'Waste management'
    if 'livestock' in pl or 'manure' in pl:
        return 'Soil & Livestock'
    if 'transport' in pl:
        return 'Public transit'
    if 'chemical' in pl or 'construction' in pl or 'manufacturing' in pl or 'mining' in pl or 'metal' in pl:
        return 'Industrial efficiency'
    return None


def build_vintage_retirement_lookup():
    """Return dict keyed (registry, country, vintage_year) -> credits_retired int.

    Reads the four retirement sheets from the raw Excel file and groups by
    (registry label, normalised country, vintage year).  All existing country
    lifetime columns in country_aggregated_data.csv are left untouched.
    """
    RETIREMENT_COUNTRY_MAP = {
        'Viet Nam':                               'Vietnam',
        'Congo, The Democratic Republic of The':  'DR Congo',
        'Congo, Republic of':                     'Congo',
        'Korea, Republic of':                     'South Korea',
        'Tanzania, United Republic of':           'Tanzania',
        "Lao People's Democratic Republic":       'Laos',
        'Bolivia, Plurinational State of':        'Bolivia',
        'Venezuela, Bolivarian Republic of':      'Venezuela',
        'Iran, Islamic Republic of':              'Iran',
        'Russian Federation':                     'Russia',
        'Syrian Arab Republic':                   'Syria',
        "Côte d'Ivoire":                          'Ivory Coast',
        'Moldova, Republic of':                   'Moldova',
        'US':                                     'United States',
    }

    def norm(c):
        c = str(c).strip()
        return RETIREMENT_COUNTRY_MAP.get(c, c)

    lookup = {}

    # --- Verra ---
    verra = pd.read_excel(RAW_EXCEL, sheet_name='Verra VCUS',
                          usecols=['Vintage Start', 'Country/Area',
                                   'Quantity Issued', 'Retirement/Cancellation Date'])
    verra = verra[verra['Retirement/Cancellation Date'].notna()].copy()
    verra['vintage_year'] = pd.to_datetime(verra['Vintage Start']).dt.year
    verra['country'] = verra['Country/Area'].apply(norm)
    verra['qty'] = pd.to_numeric(verra['Quantity Issued'], errors='coerce').fillna(0)
    for (yr, cty), grp in verra.groupby(['vintage_year', 'country']):
        key = ('Verra', cty, int(yr))
        lookup[key] = lookup.get(key, 0) + int(grp['qty'].sum())

    # --- Gold Standard ---
    gold = pd.read_excel(RAW_EXCEL, sheet_name='Gold Retirements',
                         usecols=['Vintage', 'Country', 'Quantity'])
    gold['country'] = gold['Country'].apply(norm)
    gold['qty'] = pd.to_numeric(gold['Quantity'], errors='coerce').fillna(0)
    for (yr, cty), grp in gold.groupby(['Vintage', 'country']):
        key = ('Gold Standard', cty, int(yr))
        lookup[key] = lookup.get(key, 0) + int(grp['qty'].sum())

    # --- ACR ---
    acr = pd.read_excel(RAW_EXCEL, sheet_name='ACR Retirements',
                        usecols=['Vintage', 'Project Site Country', 'Quantity of Credits'])
    acr['country'] = acr['Project Site Country'].apply(norm)
    acr['qty'] = pd.to_numeric(acr['Quantity of Credits'], errors='coerce').fillna(0)
    for (yr, cty), grp in acr.groupby(['Vintage', 'country']):
        key = ('ACR', cty, int(yr))
        lookup[key] = lookup.get(key, 0) + int(grp['qty'].sum())

    # --- CAR ---
    car = pd.read_excel(RAW_EXCEL, sheet_name='CAR Retirements',
                        usecols=['Vintage', 'Project Site Country', 'Quantity of Offset Credits'])
    car['country'] = car['Project Site Country'].apply(norm)
    car['qty'] = pd.to_numeric(car['Quantity of Offset Credits'], errors='coerce').fillna(0)
    for (yr, cty), grp in car.groupby(['Vintage', 'country']):
        key = ('CAR', cty, int(yr))
        lookup[key] = lookup.get(key, 0) + int(grp['qty'].sum())

    print(f"  build_vintage_retirement_lookup: {len(lookup)} (registry, country, year) keys built")
    return lookup


def build_vintage_project_lookup():
    RETIREMENT_COUNTRY_MAP = {
        'Viet Nam': 'Vietnam',
        'Congo, The Democratic Republic of The': 'DR Congo',
        'Congo, Republic of': 'Congo',
        'Korea, Republic of': 'South Korea',
        'Tanzania, United Republic of': 'Tanzania',
        "Lao People's Democratic Republic": 'Laos',
        'Bolivia, Plurinational State of': 'Bolivia',
        'Venezuela, Bolivarian Republic of': 'Venezuela',
        'Iran, Islamic Republic of': 'Iran',
        'Russian Federation': 'Russia',
        'Syrian Arab Republic': 'Syria',
        "Côte d'Ivoire": 'Ivory Coast',
        'Moldova, Republic of': 'Moldova',
        'US': 'United States',
    }

    def norm(c):
        c = str(c).strip()
        return RETIREMENT_COUNTRY_MAP.get(c, c)

    lookup = {}

    # --- Verra ---
    verra = pd.read_excel(RAW_EXCEL, sheet_name='Verra VCUS',
                          usecols=['ID', 'Country/Area', 'Vintage Start'])
    verra['vintage_year'] = pd.to_datetime(verra['Vintage Start']).dt.year
    verra['country'] = verra['Country/Area'].apply(norm)
    for (yr, cty), grp in verra.groupby(['vintage_year', 'country']):
        lookup[('Verra', cty, int(yr))] = grp['ID'].astype(str).unique().tolist()

    # --- Gold Standard ---
    gold = pd.read_excel(RAW_EXCEL, sheet_name='Gold Issuances',
                         usecols=['GSID', 'Country', 'Vintage'])
    gold['country'] = gold['Country'].apply(norm)
    for (yr, cty), grp in gold.groupby(['Vintage', 'country']):
        lookup[('Gold Standard', cty, int(yr))] = grp['GSID'].astype(str).unique().tolist()

    # --- ACR ---
    acr = pd.read_excel(RAW_EXCEL, sheet_name='ACR Issuances',
                        usecols=['Project ID', 'Project Site Country', 'Vintage'])
    acr['country'] = acr['Project Site Country'].apply(norm)
    for (yr, cty), grp in acr.groupby(['Vintage', 'country']):
        lookup[('ACR', cty, int(yr))] = grp['Project ID'].astype(str).unique().tolist()

    # --- CAR ---
    car = pd.read_excel(RAW_EXCEL, sheet_name='CAR Issuances',
                        usecols=['Project ID', 'Project Site Country', 'Vintage'])
    car['country'] = car['Project Site Country'].apply(norm)
    for (yr, cty), grp in car.groupby(['Vintage', 'country']):
        lookup[('CAR', cty, int(yr))] = grp['Project ID'].astype(str).unique().tolist()

    print(f"  build_vintage_project_lookup: {len(lookup)} (registry, country, year) keys built")
    return lookup


def main():
    # -----------------------------------------------------------------------
    # Load CSVs
    # -----------------------------------------------------------------------
    agg  = pd.read_csv(AGG_CSV)
    ctry = pd.read_csv(CTRY_CSV)

    print(f"Loaded aggregated_data.csv: {len(agg)} rows")
    print(f"Loaded country_aggregated_data.csv: {len(ctry)} rows")

    agg_col  = "Project Type Category"
    yr_col   = "Vintage Year"
    cr_col   = "Total Credits Issued"
    reg_col  = "Registry"
    cty_col  = "Country"

    # -----------------------------------------------------------------------
    # SECTION 0 — Remove ARB (California compliance program, not a voluntary registry)
    # -----------------------------------------------------------------------
    print("\n--- SECTION 0: Remove ARB ---")
    n_arb_agg  = (agg[reg_col]  == 'ARB').sum()
    n_arb_ctry = (ctry[reg_col] == 'ARB').sum()
    agg  = agg[agg[reg_col]   != 'ARB'].copy()
    ctry = ctry[ctry[reg_col] != 'ARB'].copy()
    print(f"  Removed {n_arb_agg} ARB rows from aggregated_data.csv")
    print(f"  Removed {n_arb_ctry} ARB rows from country_aggregated_data.csv")

    # -----------------------------------------------------------------------
    # Read Verra VCUS sheet once (used for A and B)
    # -----------------------------------------------------------------------
    print("\nReading Verra VCUS sheet…")
    vcus = pd.read_excel(RAW_EXCEL, sheet_name="Verra VCUS", engine="openpyxl")
    vcus["vintage_year"] = pd.to_datetime(vcus["Vintage Start"], errors="coerce").dt.year
    vcus["qty"] = pd.to_numeric(vcus["Quantity Issued"], errors="coerce").fillna(0)

    # Build project-type lookup for Verra blank-methodology fallback (ID -> Project Type)
    verra_proj = pd.read_excel(RAW_EXCEL, sheet_name="Verra Projects",
                               usecols=["ID", "Project Type"], engine="openpyxl")
    verra_project_type = dict(zip(
        verra_proj["ID"].astype(str).str.strip(),
        verra_proj["Project Type"].astype(str).str.strip(),
    ))

    # -----------------------------------------------------------------------
    # SECTION A — AMS-III.AU: Mixed renewables ->Rice cultivation (Verra)
    # -----------------------------------------------------------------------
    print("\n--- FIX A: AMS-III.AU ---")
    mask_au = vcus["Methodology"].astype(str).str.contains("AMS-III.AU", regex=False, na=False)
    au_rows = vcus[mask_au]
    print(f"  Raw rows matching AMS-III.AU: {len(au_rows)}")

    # Aggregate by vintage year (agg CSV)
    au_by_year = au_rows.groupby("vintage_year")["qty"].sum().astype(int)
    print(f"  Credits by year:\n{au_by_year.to_string()}")
    print(f"  Total: {au_by_year.sum():,}")

    for yr, credits in au_by_year.items():
        mask = (agg[reg_col] == "Verra") & (agg[agg_col] == "Mixed renewables") & (agg[yr_col] == yr)
        if mask.sum() == 0:
            print(f"  WARNING: no Verra/Mixed renewables/{yr} row found — skipping subtract")
            continue
        agg.loc[mask, cr_col] = agg.loc[mask, cr_col].astype(int) - credits
        # Add Rice cultivation row (or add to existing)
        rice_mask = (agg[reg_col] == "Verra") & (agg[agg_col] == "Rice cultivation") & (agg[yr_col] == yr)
        if rice_mask.sum() > 0:
            agg.loc[rice_mask, cr_col] = agg.loc[rice_mask, cr_col].astype(int) + credits
        else:
            new_row = {reg_col: "Verra", agg_col: "Rice cultivation", yr_col: yr, cr_col: credits}
            agg = pd.concat([agg, pd.DataFrame([new_row])], ignore_index=True)
    print("  aggregated_data.csv updated.")

    # Country CSV
    au_by_ctry_yr = au_rows.groupby(["Country/Area", "vintage_year"])["qty"].sum().astype(int).reset_index()
    au_by_ctry_yr.columns = [cty_col, yr_col, cr_col]
    for _, row in au_by_ctry_yr.iterrows():
        cty, yr, credits = row[cty_col], row[yr_col], row[cr_col]
        mask = (ctry[reg_col] == "Verra") & (ctry[agg_col] == "Mixed renewables") & \
               (ctry[yr_col] == yr) & (ctry[cty_col] == cty)
        if mask.sum() == 0:
            continue
        ctry.loc[mask, cr_col] = ctry.loc[mask, cr_col].astype(int) - credits
        rice_mask = (ctry[reg_col] == "Verra") & (ctry[agg_col] == "Rice cultivation") & \
                    (ctry[yr_col] == yr) & (ctry[cty_col] == cty)
        if rice_mask.sum() > 0:
            ctry.loc[rice_mask, cr_col] = ctry.loc[rice_mask, cr_col].astype(int) + credits
        else:
            new_row = {reg_col: "Verra", cty_col: cty, agg_col: "Rice cultivation",
                       yr_col: yr, cr_col: credits}
            ctry = pd.concat([ctry, pd.DataFrame([new_row])], ignore_index=True)
    print("  country_aggregated_data.csv updated.")

    # -----------------------------------------------------------------------
    # SECTION B — AMS-III.AK: Cleaner cooking ->Public transit (Verra)
    # -----------------------------------------------------------------------
    print("\n--- FIX B: AMS-III.AK ---")
    mask_ak = vcus["Methodology"].astype(str).str.strip() == "AMS-III.AK"
    ak_rows = vcus[mask_ak]
    print(f"  Raw rows matching AMS-III.AK: {len(ak_rows)}")

    ak_by_year = ak_rows.groupby("vintage_year")["qty"].sum().astype(int)
    print(f"  Credits by year:\n{ak_by_year.to_string()}")
    print(f"  Total: {ak_by_year.sum():,}")

    for yr, credits in ak_by_year.items():
        # Subtract from Cleaner cooking
        mask = (agg[reg_col] == "Verra") & (agg[agg_col] == "Cleaner cooking") & (agg[yr_col] == yr)
        if mask.sum() > 0:
            agg.loc[mask, cr_col] = agg.loc[mask, cr_col].astype(int) - credits
        else:
            print(f"  WARNING: no Verra/Cleaner cooking/{yr} row — skipping subtract")
        # Add Public transit
        pt_mask = (agg[reg_col] == "Verra") & (agg[agg_col] == "Public transit") & (agg[yr_col] == yr)
        if pt_mask.sum() > 0:
            agg.loc[pt_mask, cr_col] = agg.loc[pt_mask, cr_col].astype(int) + credits
        else:
            new_row = {reg_col: "Verra", agg_col: "Public transit", yr_col: yr, cr_col: credits}
            agg = pd.concat([agg, pd.DataFrame([new_row])], ignore_index=True)
    print("  aggregated_data.csv updated.")

    ak_by_ctry_yr = ak_rows.groupby(["Country/Area", "vintage_year"])["qty"].sum().astype(int).reset_index()
    ak_by_ctry_yr.columns = [cty_col, yr_col, cr_col]
    for _, row in ak_by_ctry_yr.iterrows():
        cty, yr, credits = row[cty_col], row[yr_col], row[cr_col]
        mask = (ctry[reg_col] == "Verra") & (ctry[agg_col] == "Cleaner cooking") & \
               (ctry[yr_col] == yr) & (ctry[cty_col] == cty)
        if mask.sum() > 0:
            ctry.loc[mask, cr_col] = ctry.loc[mask, cr_col].astype(int) - credits
        pt_mask = (ctry[reg_col] == "Verra") & (ctry[agg_col] == "Public transit") & \
                  (ctry[yr_col] == yr) & (ctry[cty_col] == cty)
        if pt_mask.sum() > 0:
            ctry.loc[pt_mask, cr_col] = ctry.loc[pt_mask, cr_col].astype(int) + credits
        else:
            new_row = {reg_col: "Verra", cty_col: cty, agg_col: "Public transit",
                       yr_col: yr, cr_col: credits}
            ctry = pd.concat([ctry, pd.DataFrame([new_row])], ignore_index=True)
    print("  country_aggregated_data.csv updated.")

    # -----------------------------------------------------------------------
    # SECTION C — Rename project type 'Agriculture' ->'Soil & Livestock'
    # -----------------------------------------------------------------------
    print("\n--- FIX C: Agriculture -> Soil & Livestock ---")
    n_agg  = (agg[agg_col]  == "Agriculture").sum()
    n_ctry = (ctry[agg_col] == "Agriculture").sum()
    agg.loc[agg[agg_col]   == "Agriculture", agg_col] = "Soil & Livestock"
    ctry.loc[ctry[agg_col] == "Agriculture", agg_col] = "Soil & Livestock"
    print(f"  Renamed {n_agg} rows in aggregated_data.csv")
    print(f"  Renamed {n_ctry} rows in country_aggregated_data.csv")

    # -----------------------------------------------------------------------
    # SECTION D — Gold Standard unmapped rows ->categorized by project type
    # -----------------------------------------------------------------------
    print("\n--- FIX D: Gold Standard 'No Methodology Provided' ---")
    no_meth_count = (agg[agg_col] == "No Methodology Provided").sum()
    if no_meth_count == 0:
        print("  No 'No Methodology Provided' rows found -- already applied, skipping.")
        gold = None  # sentinel so Section E can detect it was skipped
    else:
        print("Reading Gold Issuances sheet…")
        gold = pd.read_excel(RAW_EXCEL, sheet_name="Gold Issuances", engine="openpyxl")
        gold["vintage_year"] = pd.to_numeric(gold["Vintage"], errors="coerce")
        gold["qty"] = pd.to_numeric(gold["Quantity"], errors="coerce").fillna(0)

        # Filter blank / "Not provided" methodology rows
        blank_mask = gold["Methodology"].isna() | (gold["Methodology"].astype(str).str.strip() == "Not provided")
        gold_blank = gold[blank_mask].copy()
        print(f"  Gold Standard unmapped rows: {len(gold_blank):,}")
        print(f"  Total credits: {gold_blank['qty'].sum():,.0f}")

        # Map project types
        gold_blank["mapped_category"] = gold_blank["Project Type"].apply(map_gold_project_type)

        # Show mapping summary
        type_summary = gold_blank.groupby("mapped_category")["qty"].sum().sort_values(ascending=False)
        print("  Mapping summary:")
        for cat, tot in type_summary.items():
            print(f"    {cat}: {tot:,.0f}")

        # Remove existing 'No Methodology Provided' rows from both CSVs
        n_removed_agg  = (agg[agg_col]  == "No Methodology Provided").sum()
        n_removed_ctry = (ctry[agg_col] == "No Methodology Provided").sum()
        agg  = agg[agg[agg_col]   != "No Methodology Provided"].copy()
        ctry = ctry[ctry[agg_col] != "No Methodology Provided"].copy()
        print(f"  Removed {n_removed_agg} rows from aggregated_data.csv")
        print(f"  Removed {n_removed_ctry} rows from country_aggregated_data.csv")

        # Build new aggregated rows (by mapped_category + vintage_year)
        new_agg_rows = (
            gold_blank[gold_blank["vintage_year"].notna()]
            .groupby(["mapped_category", "vintage_year"])["qty"]
            .sum()
            .astype(int)
            .reset_index()
        )
        new_agg_rows.columns = [agg_col, yr_col, cr_col]
        new_agg_rows[reg_col] = "Gold Standard"
        new_agg_rows = new_agg_rows[[reg_col, agg_col, yr_col, cr_col]]

        print(f"  Adding {len(new_agg_rows)} new rows to aggregated_data.csv")
        agg = pd.concat([agg, new_agg_rows], ignore_index=True)

        # Build new country rows (by Country + mapped_category + vintage_year)
        ctry_col_gold = "Country"  # Gold Issuances uses "Country"
        new_ctry_rows = (
            gold_blank[gold_blank["vintage_year"].notna() & gold_blank[ctry_col_gold].notna()]
            .groupby([ctry_col_gold, "mapped_category", "vintage_year"])["qty"]
            .sum()
            .astype(int)
            .reset_index()
        )
        new_ctry_rows.columns = [cty_col, agg_col, yr_col, cr_col]
        new_ctry_rows[reg_col] = "Gold Standard"
        new_ctry_rows = new_ctry_rows[[reg_col, cty_col, agg_col, yr_col, cr_col]]

        print(f"  Adding {len(new_ctry_rows)} new rows to country_aggregated_data.csv")
        ctry = pd.concat([ctry, new_ctry_rows], ignore_index=True)

    # -----------------------------------------------------------------------
    # SECTION F — Ingest CAR (Climate Action Reserve)
    # NOTE: Verra processed total (~1,365.9M) is ~100.8M below the Berkeley
    # VROD summary (~1,466.7M). The VROD file has only one Verra issuance
    # sheet (Verra VCUS); no additional sheet bridges the gap. Known limitation.
    # -----------------------------------------------------------------------
    print("\n--- SECTION F: Ingest CAR ---")
    car_raw = pd.read_excel(RAW_EXCEL, sheet_name='CAR Issuances', engine='openpyxl')
    car_raw['vintage_year'] = pd.to_numeric(car_raw['Vintage'], errors='coerce')
    car_raw['qty']          = pd.to_numeric(car_raw['Total Offset Credits Issued'], errors='coerce').fillna(0)
    car_raw = car_raw[car_raw['qty'] > 0].copy()
    print(f"  CAR Issuances rows (positive credits): {len(car_raw):,}")

    # Build protocol ->category lookup from methodology_mapping.csv (Registry='CAR')
    meth_map_f = pd.read_csv('public/methodology_mapping.csv', dtype=str).fillna('')
    car_lookup = {}
    for _, r in meth_map_f[meth_map_f['Registry'] == 'CAR'].iterrows():
        code = r['Methodology Code'].strip()
        name = r['Methodology Name'].strip()
        cat  = r['Project Type Category'].strip()
        if code:
            car_lookup[code] = cat
        if name:
            car_lookup[name] = cat

    def map_car_protocol(proto):
        v = str(proto or '').strip()
        if not v or v.lower() in ('nan', 'none', ''):
            return 'No Methodology Provided'
        if v in car_lookup:
            return car_lookup[v]
        # Substring match — protocol name may be embedded in version string
        for key, cat in car_lookup.items():
            if key and key in v:
                return cat
        return 'No Methodology Provided'

    car_raw['cat'] = car_raw['Protocol and Version'].apply(map_car_protocol)

    cat_summary_f = car_raw.groupby('cat')['qty'].sum().sort_values(ascending=False)
    print("  CAR category mapping:")
    for cat, tot in cat_summary_f.items():
        print(f"    {cat}: {tot:,.0f}")

    # Remove any existing CAR rows from agg (idempotency — matches ctry handling below)
    n_old_car_agg = (agg[reg_col] == 'CAR').sum()
    if n_old_car_agg > 0:
        agg = agg[agg[reg_col] != 'CAR'].copy()
        print(f"  Removed {n_old_car_agg} existing CAR rows from aggregated_data.csv")

    # Aggregate-level rows (Registry, Project Type Category, Vintage Year, Total Credits Issued)
    car_agg_rows = (
        car_raw
        .groupby(['cat', 'vintage_year'])['qty']
        .sum().astype(int).reset_index()
    )
    car_agg_rows.columns = [agg_col, yr_col, cr_col]
    car_agg_rows[reg_col] = 'CAR'
    car_agg_rows = car_agg_rows[[reg_col, agg_col, yr_col, cr_col]]
    print(f"  Adding {len(car_agg_rows)} rows to aggregated_data.csv")
    print(f"  CAR total credits: {car_agg_rows[cr_col].sum():,}")
    agg = pd.concat([agg, car_agg_rows], ignore_index=True)

    # Country-level rows — drop stale 194 rows, replace with freshly derived rows
    n_old_car = (ctry[reg_col] == 'CAR').sum()
    ctry = ctry[ctry[reg_col] != 'CAR'].copy()
    print(f"  Replaced {n_old_car} existing CAR rows in country_aggregated_data.csv")
    car_ctry_rows = (
        car_raw[car_raw['Project Site Country'].notna()]
        .groupby(['Project Site Country', 'cat', 'vintage_year'])['qty']
        .sum().astype(int).reset_index()
    )
    car_ctry_rows.columns = [cty_col, agg_col, yr_col, cr_col]
    car_ctry_rows[reg_col] = 'CAR'
    car_ctry_rows = car_ctry_rows[[reg_col, cty_col, agg_col, yr_col, cr_col]]
    print(f"  Adding {len(car_ctry_rows)} country rows to country_aggregated_data.csv")
    ctry = pd.concat([ctry, car_ctry_rows], ignore_index=True)

    # -----------------------------------------------------------------------
    # Drop rows where credits went to 0 or negative (sanity clean-up)
    # -----------------------------------------------------------------------
    agg[cr_col]  = agg[cr_col].astype(int)
    ctry[cr_col] = ctry[cr_col].astype(int)
    n_zero_agg   = (agg[cr_col]  <= 0).sum()
    n_zero_ctry  = (ctry[cr_col] <= 0).sum()
    if n_zero_agg > 0:
        print(f"\n  Removing {n_zero_agg} rows with zero/negative credits from aggregated_data.csv")
        agg = agg[agg[cr_col] > 0]
    if n_zero_ctry > 0:
        print(f"  Removing {n_zero_ctry} rows with zero/negative credits from country_aggregated_data.csv")
        ctry = ctry[ctry[cr_col] > 0]

    # -----------------------------------------------------------------------
    # Save
    # -----------------------------------------------------------------------
    agg.to_csv(AGG_CSV, index=False)
    ctry.to_csv(CTRY_CSV, index=False)
    print(f"\nSaved {AGG_CSV} ({len(agg)} rows)")
    print(f"Saved {CTRY_CSV} ({len(ctry)} rows)")

    # -----------------------------------------------------------------------
    # SECTION E: Project Counts via methodology_mapping.csv
    # -----------------------------------------------------------------------
    print("\n=== SECTION E: Computing project counts ===")

    METH_MAP_CSV       = "public/methodology_mapping.csv"
    PROJECT_COUNTS_CSV = "public/project_counts.csv"

    meth_df = pd.read_csv(METH_MAP_CSV, dtype=str).fillna('')
    code_to_cat = {}   # (registry, code) ->category   — Verra, Gold
    name_to_cat = {}   # (registry, name) ->category   — ACR, CAR
    for _, r in meth_df.iterrows():
        reg  = r['Registry'].strip()
        code = r['Methodology Code'].strip()
        name = r['Methodology Name'].strip()
        cat  = r['Project Type Category'].strip()
        if code:
            code_to_cat[(reg, code)] = cat
        if name:
            name_to_cat[(reg, name)] = cat

    def lookup_cat_e(registry, meth_value):
        v = str(meth_value or '').strip()
        if not v or v.lower() in ('nan', 'none', ''):
            return None
        code = v.split(';')[0].strip()
        cat = code_to_cat.get((registry, code))
        if cat:
            return cat
        cat = name_to_cat.get((registry, v))
        if cat:
            return cat
        # CAR: protocol name embedded in longer version string
        for (reg, nm), c in name_to_cat.items():
            if reg == registry and nm and nm in v:
                return c
        return None

    proj_results = []

    # --- Verra (reuse vcus DataFrame from Section A/B, which already has vintage_year) ---
    vcus_e = vcus[['ID', 'Methodology', 'vintage_year']].copy()
    vcus_e['ID'] = vcus_e['ID'].astype(str).str.strip()
    vcus_e['Methodology'] = vcus_e['Methodology'].fillna('').astype(str).str.strip()
    vcus_e = vcus_e[vcus_e['ID'].str.len() > 0]
    vcus_e['vintage_year'] = pd.to_numeric(vcus_e['vintage_year'], errors='coerce')
    vcus_e = vcus_e[vcus_e['vintage_year'].notna()]
    vcus_e['vintage_year'] = vcus_e['vintage_year'].astype(int)
    # Mode methodology per project
    proj_meth_v = (vcus_e.groupby('ID')['Methodology']
                         .agg(lambda x: x[x != ''].mode().iloc[0]
                                        if len(x[x != ''].mode()) > 0 else ''))
    # Build project -> category map
    proj_cat_v = {}
    for proj_id, meth in proj_meth_v.items():
        cat = lookup_cat_e('Verra', meth)
        if cat is None:
            cat = _map_verra_project_type(verra_project_type.get(proj_id, '')) or 'Other'
        proj_cat_v[proj_id] = cat
    # Group unique (project_id, vintage_year) pairs by (category, vintage_year)
    verra_groups = {}
    for pid, yr in vcus_e[['ID', 'vintage_year']].drop_duplicates().itertuples(index=False):
        cat = proj_cat_v.get(pid, 'Other')
        key = (cat, yr)
        if key not in verra_groups:
            verra_groups[key] = set()
        verra_groups[key].add(pid)
    print(f"  Verra: {len(proj_meth_v)} unique projects, {len(verra_groups)} (category, vintage) groups")
    for (cat, yr), ids in sorted(verra_groups.items()):
        proj_results.append({'Registry': 'Verra', 'Project Type Category': cat,
                             'Vintage Year': yr, 'Project Count': len(ids),
                             'project_ids': json.dumps(sorted(ids))})

    # --- Gold Standard (reuse gold DataFrame from Section D, or load fresh if D was skipped) ---
    if gold is None:
        gold = pd.read_excel(RAW_EXCEL, sheet_name="Gold Issuances", engine="openpyxl")
    gold_e = gold[['GSID', 'Methodology', 'Project Type', 'Vintage']].copy()
    gold_e['GSID'] = gold_e['GSID'].astype(str).str.strip()
    gold_e['Methodology'] = gold_e['Methodology'].fillna('').astype(str).str.strip()
    gold_e['Project Type'] = gold_e['Project Type'].fillna('').astype(str).str.strip()
    gold_e = gold_e[gold_e['GSID'].str.len() > 0]
    gold_e['vintage_year'] = pd.to_numeric(gold_e['Vintage'], errors='coerce')
    gold_e = gold_e[gold_e['vintage_year'].notna()]
    gold_e['vintage_year'] = gold_e['vintage_year'].astype(int)
    _mode = lambda x: x[x != ''].mode().iloc[0] if len(x[x != ''].mode()) > 0 else ''
    proj_meth_g = gold_e.groupby('GSID')['Methodology'].agg(_mode)
    proj_pt_g   = gold_e.groupby('GSID')['Project Type'].agg(_mode)
    proj_cat_g = {}
    for gsid, meth in proj_meth_g.items():
        cat = lookup_cat_e('Gold', meth)
        if cat is None:
            cat = map_gold_project_type(proj_pt_g.get(gsid, ''))
        proj_cat_g[gsid] = cat
    gold_groups = {}
    for gsid, yr in gold_e[['GSID', 'vintage_year']].drop_duplicates().itertuples(index=False):
        cat = proj_cat_g.get(gsid, 'Other')
        key = (cat, yr)
        if key not in gold_groups:
            gold_groups[key] = set()
        gold_groups[key].add(gsid)
    print(f"  Gold Standard: {len(proj_meth_g)} unique projects, {len(gold_groups)} (category, vintage) groups")
    for (cat, yr), ids in sorted(gold_groups.items()):
        proj_results.append({'Registry': 'Gold Standard', 'Project Type Category': cat,
                             'Vintage Year': yr, 'Project Count': len(ids),
                             'project_ids': json.dumps(sorted(ids))})

    # --- ACR ---
    print("  Reading ACR Issuances…")
    acr_e = pd.read_excel(RAW_EXCEL, sheet_name='ACR Issuances',
                          usecols=['Project ID', 'Project Methodology/Protocol', 'Vintage'],
                          engine='openpyxl')
    acr_e['Project ID'] = acr_e['Project ID'].astype(str).str.strip()
    acr_e['Project Methodology/Protocol'] = acr_e['Project Methodology/Protocol'].fillna('').astype(str).str.strip()
    acr_e = acr_e[acr_e['Project ID'].str.len() > 0]
    acr_e['vintage_year'] = pd.to_numeric(acr_e['Vintage'], errors='coerce')
    acr_e = acr_e[acr_e['vintage_year'].notna()]
    acr_e['vintage_year'] = acr_e['vintage_year'].astype(int)
    proj_meth_a = (acr_e.groupby('Project ID')['Project Methodology/Protocol']
                        .agg(lambda x: x[x != ''].mode().iloc[0]
                                       if len(x[x != ''].mode()) > 0 else ''))
    proj_cat_a = {}
    for pid, proto in proj_meth_a.items():
        cat = lookup_cat_e('ACR', proto)
        proj_cat_a[pid] = cat or 'Other'
    acr_groups = {}
    for pid, yr in acr_e[['Project ID', 'vintage_year']].drop_duplicates().itertuples(index=False):
        cat = proj_cat_a.get(pid, 'Other')
        key = (cat, yr)
        if key not in acr_groups:
            acr_groups[key] = set()
        acr_groups[key].add(pid)
    print(f"  ACR: {len(proj_meth_a)} unique projects, {len(acr_groups)} (category, vintage) groups")
    for (cat, yr), ids in sorted(acr_groups.items()):
        proj_results.append({'Registry': 'ACR', 'Project Type Category': cat,
                             'Vintage Year': yr, 'Project Count': len(ids),
                             'project_ids': json.dumps(sorted(ids))})

    # --- CAR ---
    print("  Reading CAR Issuances…")
    car_e = pd.read_excel(RAW_EXCEL, sheet_name='CAR Issuances',
                          usecols=['Project ID', 'Protocol and Version', 'Vintage'],
                          engine='openpyxl')
    car_e['Project ID'] = car_e['Project ID'].astype(str).str.strip()
    car_e['Protocol and Version'] = car_e['Protocol and Version'].fillna('').astype(str).str.strip()
    car_e = car_e[car_e['Project ID'].str.len() > 0]
    car_e['vintage_year'] = pd.to_numeric(car_e['Vintage'], errors='coerce')
    car_e = car_e[car_e['vintage_year'].notna()]
    car_e['vintage_year'] = car_e['vintage_year'].astype(int)
    proj_meth_c = (car_e.groupby('Project ID')['Protocol and Version']
                        .agg(lambda x: x[x != ''].mode().iloc[0]
                                       if len(x[x != ''].mode()) > 0 else ''))
    proj_cat_c = {}
    for pid, proto in proj_meth_c.items():
        cat = lookup_cat_e('CAR', proto)
        proj_cat_c[pid] = cat or 'Other'
    car_groups = {}
    for pid, yr in car_e[['Project ID', 'vintage_year']].drop_duplicates().itertuples(index=False):
        cat = proj_cat_c.get(pid, 'Other')
        key = (cat, yr)
        if key not in car_groups:
            car_groups[key] = set()
        car_groups[key].add(pid)
    print(f"  CAR: {len(proj_meth_c)} unique projects, {len(car_groups)} (category, vintage) groups")
    for (cat, yr), ids in sorted(car_groups.items()):
        proj_results.append({'Registry': 'CAR', 'Project Type Category': cat,
                             'Vintage Year': yr, 'Project Count': len(ids),
                             'project_ids': json.dumps(sorted(ids))})

    project_counts_df = pd.DataFrame(proj_results,
        columns=['Registry', 'Project Type Category', 'Vintage Year', 'Project Count', 'project_ids'])
    project_counts_df.to_csv(PROJECT_COUNTS_CSV, index=False)
    print(f"\nWrote {len(project_counts_df)} rows to {PROJECT_COUNTS_CSV}")
    totals = project_counts_df.groupby('Registry')['Project Count'].sum()
    print(totals.to_string())
    print(f"Grand total: {totals.sum():,} project-vintage combinations")

    # -----------------------------------------------------------------------
    # Spot checks
    # -----------------------------------------------------------------------
    print("\n--- SPOT CHECKS ---")
    rc = agg[(agg[reg_col] == "Verra") & (agg[agg_col] == "Rice cultivation")]
    print(f"Verra/Rice cultivation rows: {len(rc)}")
    if len(rc):
        print(rc[[yr_col, cr_col]].to_string(index=False))

    no_meth = agg[agg[agg_col] == "No Methodology Provided"]
    print(f"\n'No Methodology Provided' rows remaining: {len(no_meth)}")

    sl = agg[agg[agg_col] == "Soil & Livestock"]
    print(f"\n'Soil & Livestock' rows: {len(sl)}")

    ag_leftover = agg[agg[agg_col] == "Agriculture"]
    print(f"'Agriculture' project type rows remaining: {len(ag_leftover)}")

    # -----------------------------------------------------------------------
    # SECTION G — Enrich CSVs with retirement data from projects_data.csv
    # -----------------------------------------------------------------------
    print("\n=== SECTION G: Retirement enrichment ===")

    PROJECTS_CSV = "public/data/projects_data.csv"
    AGG_BACKUP   = "public/aggregated_data_backup.csv"
    CTRY_BACKUP  = "public/country_aggregated_data_backup.csv"
    PC_BACKUP    = "public/project_counts_backup.csv"

    # Back up all 3 CSVs
    shutil.copy(AGG_CSV,            AGG_BACKUP)
    shutil.copy(CTRY_CSV,           CTRY_BACKUP)
    shutil.copy(PROJECT_COUNTS_CSV, PC_BACKUP)
    print("  Backed up all 3 CSVs")

    # Load projects_data.csv
    proj = pd.read_csv(PROJECTS_CSV)
    proj['credits_issued']    = pd.to_numeric(proj['credits_issued'],    errors='coerce').fillna(0)
    proj['credits_retired']   = pd.to_numeric(proj['credits_retired'],   errors='coerce').fillna(0)
    proj['credits_remaining'] = pd.to_numeric(proj['credits_remaining'], errors='coerce').fillna(0)
    print(f"  Loaded projects_data.csv: {len(proj)} rows")

    # ------------------------------------------------------------------
    # ADDITION 1 — aggregated_data.csv: retirement per Registry+Category
    # ------------------------------------------------------------------
    ret_by_reg_cat = (
        proj.groupby(['registry', 'category'])
        .agg(
            total_issued_proj=('credits_issued',  'sum'),
            total_credits_retired=('credits_retired', 'sum'),
        )
        .reset_index()
    )
    ret_by_reg_cat['retirement_rate'] = (
        ret_by_reg_cat['total_credits_retired']
        / ret_by_reg_cat['total_issued_proj'].replace(0, float('nan'))
        * 100
    ).round(1).fillna(0)
    ret_by_reg_cat = ret_by_reg_cat.rename(columns={
        'registry': reg_col,
        'category': agg_col,
    })[[reg_col, agg_col, 'total_credits_retired', 'retirement_rate']]

    for col in ['total_credits_retired', 'retirement_rate']:
        if col in agg.columns:
            agg = agg.drop(columns=[col])
    agg = agg.merge(ret_by_reg_cat, on=[reg_col, agg_col], how='left')
    agg['total_credits_retired'] = agg['total_credits_retired'].fillna(0).astype(int)
    agg['retirement_rate']       = agg['retirement_rate'].fillna(0)
    agg.to_csv(AGG_CSV, index=False)
    print(f"  aggregated_data.csv: added total_credits_retired, retirement_rate ->{len(agg)} rows saved")

    # ------------------------------------------------------------------
    # ADDITION 2 — country_aggregated_data.csv: per-country stats + registry_breakdown
    # ------------------------------------------------------------------
    country_stats = (
        proj.groupby('country')
        .agg(
            total_credits_issued=('credits_issued',    'sum'),
            total_credits_retired=('credits_retired',  'sum'),
            total_credits_remaining=('credits_remaining', 'sum'),
        )
        .reset_index()
    )
    country_stats['retirement_rate'] = (
        country_stats['total_credits_retired']
        / country_stats['total_credits_issued'].replace(0, float('nan'))
        * 100
    ).round(1).fillna(0)
    country_stats = country_stats.rename(columns={'country': cty_col})

    # Build per-country registry breakdown as JSON string
    reg_breakdown = {}
    for (country, registry), grp in proj.groupby(['country', 'registry']):
        if country not in reg_breakdown:
            reg_breakdown[country] = {}
        reg_breakdown[country][registry] = {
            'issued':   int(grp['credits_issued'].sum()),
            'retired':  int(grp['credits_retired'].sum()),
            'projects': int(len(grp)),
        }
    country_stats['registry_breakdown'] = country_stats[cty_col].map(
        lambda c: json.dumps(reg_breakdown.get(c, {}))
    )

    for col in ['total_credits_issued', 'total_credits_retired', 'total_credits_remaining',
                'retirement_rate', 'registry_breakdown']:
        if col in ctry.columns:
            ctry = ctry.drop(columns=[col])
    ctry = ctry.merge(country_stats, on=cty_col, how='left')
    ctry['total_credits_issued']    = ctry['total_credits_issued'].fillna(0).astype(int)
    ctry['total_credits_retired']   = ctry['total_credits_retired'].fillna(0).astype(int)
    ctry['total_credits_remaining'] = ctry['total_credits_remaining'].fillna(0).astype(int)
    ctry['retirement_rate']         = ctry['retirement_rate'].fillna(0)
    ctry['registry_breakdown']      = ctry['registry_breakdown'].fillna('{}')

    # ------------------------------------------------------------------
    # ADDITION 2b — vintage_credits_retired + vintage_retirement_rate
    # ------------------------------------------------------------------
    print("  Building vintage retirement lookup from raw Excel...")
    vint_lookup = build_vintage_retirement_lookup()

    ctry['vintage_credits_retired'] = ctry.apply(
        lambda r: vint_lookup.get(
            (r[reg_col], r[cty_col], int(r[yr_col])), 0
        ),
        axis=1,
    ).astype(int)

    ctry['vintage_retirement_rate'] = (
        ctry['vintage_credits_retired']
        / ctry[cr_col].replace(0, float('nan'))
        * 100
    ).round(1).fillna(0)

    unmatched = (ctry['vintage_credits_retired'] == 0) & (ctry[cr_col] > 0)
    print(f"  Rows with issued credits but no vintage retirement match: {unmatched.sum()}")

    # Note: vintage_credits_retired repeats across all category rows for the same
    # (Registry, Country, Year) — use .iloc[0] not .sum() to read the per-year value.
    iv15 = ctry[
        (ctry[reg_col] == 'Verra') &
        (ctry[cty_col] == 'India') &
        (ctry[yr_col] == 2015)
    ]
    india_verra_2015 = int(iv15['vintage_credits_retired'].iloc[0]) if len(iv15) else 0
    print(f"  SPOT CHECK India/Verra/2015 vintage_credits_retired: {india_verra_2015:,}  (expected ~8,996,504)")

    ig20 = ctry[
        (ctry[reg_col] == 'Gold Standard') &
        (ctry[cty_col] == 'India') &
        (ctry[yr_col] == 2020)
    ]
    india_gs_2020 = int(ig20['vintage_credits_retired'].iloc[0]) if len(ig20) else 0
    print(f"  SPOT CHECK India/GoldStandard/2020 vintage_credits_retired: {india_gs_2020:,}  (expected ~7,908,077)")

    # ------------------------------------------------------------------
    # ADDITION 2c — project_count
    # ------------------------------------------------------------------
    print("  Building vintage project lookup...")
    proj_lookup = build_vintage_project_lookup()

    ctry['project_ids'] = ctry.apply(
        lambda r: json.dumps(
            proj_lookup.get(
                (r[reg_col], r[cty_col], int(r[yr_col])), []
            )
        ),
        axis=1,
    )

    # Spot checks
    india_verra_2015 = proj_lookup.get(('Verra', 'India', 2015), [])
    print(f"  SPOT CHECK India/Verra/2015 project_ids count: {len(india_verra_2015)} (expected ~184)")

    india_gs_2020 = proj_lookup.get(('Gold Standard', 'India', 2020), [])
    print(f"  SPOT CHECK India/GS/2020 project_ids count: {len(india_gs_2020)} (expected ~175)")

    ctry.to_csv(CTRY_CSV, index=False)
    print(f"  country_aggregated_data.csv: added 7 columns (incl. registry_breakdown JSON + vintage retirement) ->{len(ctry)} rows saved")

    # ------------------------------------------------------------------
    # ADDITION 3 — project_counts.csv: per-registry × vintage-year stats
    # ------------------------------------------------------------------
    reg_stats = (
        proj.groupby(['registry', 'vintage_year'])
        .agg(
            total_credits_issued=('credits_issued',    'sum'),
            total_credits_retired=('credits_retired',  'sum'),
            total_credits_remaining=('credits_remaining', 'sum'),
            project_count=('project_id', 'nunique'),
        )
        .reset_index()
    )
    reg_stats['retirement_rate'] = (
        reg_stats['total_credits_retired']
        / reg_stats['total_credits_issued'].replace(0, float('nan'))
        * 100
    ).round(1).fillna(0)
    reg_stats = reg_stats.rename(columns={'registry': reg_col, 'vintage_year': 'Vintage Year'})

    for col in ['total_credits_issued', 'total_credits_retired', 'total_credits_remaining',
                'retirement_rate', 'project_count']:
        if col in project_counts_df.columns:
            project_counts_df = project_counts_df.drop(columns=[col])
    project_counts_df = project_counts_df.merge(reg_stats, on=[reg_col, 'Vintage Year'], how='left')
    project_counts_df['total_credits_issued']    = project_counts_df['total_credits_issued'].fillna(0).astype(int)
    project_counts_df['total_credits_retired']   = project_counts_df['total_credits_retired'].fillna(0).astype(int)
    project_counts_df['total_credits_remaining'] = project_counts_df['total_credits_remaining'].fillna(0).astype(int)
    project_counts_df['retirement_rate']         = project_counts_df['retirement_rate'].fillna(0)
    project_counts_df['project_count']           = project_counts_df['project_count'].fillna(0).astype(int)
    project_counts_df.to_csv(PROJECT_COUNTS_CSV, index=False)
    print(f"  project_counts.csv: added 5 columns -> {len(project_counts_df)} rows saved")

    # ------------------------------------------------------------------
    # Verification prints
    # ------------------------------------------------------------------
    print("\n--- SECTION G VERIFICATION ---")
    global_issued  = proj['credits_issued'].sum()
    global_retired = proj['credits_retired'].sum()
    global_rate    = (global_retired / global_issued * 100) if global_issued > 0 else 0
    print(f"1. Global retirement rate: {global_rate:.1f}%")

    top3 = (
        proj.groupby('country')['credits_retired']
        .sum().sort_values(ascending=False).head(3)
    )
    print("2. Top 3 countries by credits_retired:")
    for country, val in top3.items():
        print(f"   {country}: {val:,.0f}")

    print("3. Per-registry retirement rates:")
    for _, row in reg_stats.iterrows():
        print(f"   {row[reg_col]}: {row['retirement_rate']:.1f}%")

    print("4. CSV column verification:")
    for csv_path in [AGG_CSV, CTRY_CSV, PROJECT_COUNTS_CSV]:
        cols = pd.read_csv(csv_path, nrows=0).columns.tolist()
        print(f"   {csv_path}: {cols}")

    # ------------------------------------------------------------------
    # ADDITION 4 — Refresh Total Credits Issued in aggregated_data.csv
    #              (per-vintage rebuild from raw Excel for Verra + GS)
    # ------------------------------------------------------------------
    print("\n=== ADDITION 4: Refresh Total Credits Issued in aggregated_data.csv ===")

    before_verra = int(agg.loc[agg[reg_col] == 'Verra', cr_col].sum())
    before_gs    = int(agg.loc[agg[reg_col] == 'Gold Standard', cr_col].sum())
    print(f"  Before — Verra: {before_verra:,}  Gold Standard: {before_gs:,}")

    vcus_a4 = vcus[['ID', 'vintage_year', 'Methodology', 'qty']].copy()
    vcus_a4['ID'] = vcus_a4['ID'].astype(str).str.strip()
    vcus_a4[agg_col] = vcus_a4.apply(
        lambda r: (
            code_to_cat.get(('Verra', str(r['Methodology'] or '').strip().split(';')[0].strip()))
            or _map_verra_project_type(verra_project_type.get(r['ID'], ''))
            or 'Other'
        ),
        axis=1,
    )
    verra_vyr = (
        vcus_a4.groupby(['vintage_year', agg_col])['qty']
        .sum().astype(int).reset_index()
        .rename(columns={'vintage_year': yr_col, 'qty': cr_col})
    )
    verra_vyr[reg_col] = 'Verra'

    gold_src = gold if gold is not None else pd.read_excel(
        RAW_EXCEL, sheet_name='Gold Issuances', engine='openpyxl'
    )
    if 'vintage_year' not in gold_src.columns:
        gold_src = gold_src.copy()
        gold_src['vintage_year'] = pd.to_numeric(gold_src['Vintage'], errors='coerce')
        gold_src['qty']          = pd.to_numeric(gold_src['Quantity'], errors='coerce').fillna(0)
    gold_a4 = gold_src[['vintage_year', 'Project Type', 'Methodology', 'qty']].copy()
    gold_a4['Methodology'] = gold_a4['Methodology'].fillna('').astype(str).str.strip()
    gold_a4[agg_col] = gold_a4.apply(
        lambda r: lookup_cat_e('Gold', r['Methodology']) or map_gold_project_type(r['Project Type']),
        axis=1,
    )
    gs_vyr = (
        gold_a4.groupby(['vintage_year', agg_col])['qty']
        .sum().astype(int).reset_index()
        .rename(columns={'vintage_year': yr_col, 'qty': cr_col})
    )
    gs_vyr[reg_col] = 'Gold Standard'

    ret_cols = [c for c in ['total_credits_retired', 'retirement_rate'] if c in agg.columns]
    new_vg = pd.concat([verra_vyr, gs_vyr], ignore_index=True)
    if ret_cols:
        ret_lookup = (
            agg[agg[reg_col].isin(['Verra', 'Gold Standard'])]
            [[reg_col, agg_col] + ret_cols]
            .drop_duplicates([reg_col, agg_col])
        )
        new_vg = new_vg.merge(ret_lookup, on=[reg_col, agg_col], how='left')
        if 'total_credits_retired' in new_vg.columns:
            new_vg['total_credits_retired'] = new_vg['total_credits_retired'].fillna(0).astype(int)
        if 'retirement_rate' in new_vg.columns:
            new_vg['retirement_rate'] = new_vg['retirement_rate'].fillna(0)

    agg = pd.concat(
        [agg[~agg[reg_col].isin(['Verra', 'Gold Standard'])], new_vg],
        ignore_index=True,
    )
    agg[cr_col] = agg[cr_col].fillna(0).astype(int)
    agg.to_csv(AGG_CSV, index=False)

    after_verra = int(agg.loc[agg[reg_col] == 'Verra', cr_col].sum())
    after_gs    = int(agg.loc[agg[reg_col] == 'Gold Standard', cr_col].sum())
    print(f"  After  — Verra: {after_verra:,}  Gold Standard: {after_gs:,}")
    print(f"  aggregated_data.csv: refreshed {len(new_vg)} Verra/GS rows → {len(agg)} total rows saved")

    # -----------------------------------------------------------------------
    # ADDITION 4 VALIDATION
    # -----------------------------------------------------------------------
    print("\n=== ADDITION 4 VALIDATION ===")
    for reg_name in ['Verra', 'Gold Standard']:
        reg_rows = agg[agg[reg_col] == reg_name]
        other_credits = int(reg_rows.loc[reg_rows[agg_col] == 'Other', cr_col].sum())
        other_count   = int((reg_rows[agg_col] == 'Other').sum())
        print(f"{reg_name} Other: {other_credits:,} credits ({other_count} rows)")
    # Count GS issuance rows in ADDITION 4 that used project-type fallback
    gs_meths = gold_a4['Methodology'].fillna('').astype(str).str.strip()
    gs_with_meth = gs_meths[
        gs_meths.str.len().gt(0) &
        ~gs_meths.str.lower().isin(['nan', 'none', ''])
    ]
    fallback_n = int(
        gs_with_meth.apply(lambda m: lookup_cat_e('Gold', m) is None).sum()
    )
    print(f"Codes resolved via Project Type fallback: {fallback_n}")


if __name__ == "__main__":
    main()
