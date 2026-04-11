"""
fix_data.py — CarbonLedger data correction script

Builds aggregated_data.csv and country_aggregated_data.csv directly from
projects_data.csv (the authoritative output of build_projects.py), then
enriches both CSVs with retirement statistics via Section G.

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
    # Build aggregated_data.csv and country_aggregated_data.csv
    # directly from projects_data.csv — no raw Excel reads needed here.
    # -----------------------------------------------------------------------
    PROJECTS_CSV_MAIN = "public/data/projects_data.csv"

    agg_col = "Project Type Category"
    yr_col  = "Vintage Year"
    cr_col  = "Total Credits Issued"
    reg_col = "Registry"
    cty_col = "Country"

    EXCLUDED_CATS = {'Other', 'No Methodology Provided', 'Unmatched'}
    REG_LABEL = {'verra': 'Verra', 'gold standard': 'Gold Standard', 'acr': 'ACR', 'car': 'CAR'}

    print("Loading projects_data.csv...")
    proj_src = pd.read_csv(PROJECTS_CSV_MAIN, dtype=str)
    proj_src['registry']        = proj_src['registry'].str.strip()
    proj_src['category']        = proj_src['category'].str.strip()
    proj_src['country']         = proj_src['country'].fillna('').str.strip()
    proj_src['vintage_year']    = pd.to_numeric(proj_src['vintage_year'],    errors='coerce')
    proj_src['credits_issued']  = pd.to_numeric(proj_src['credits_issued'],  errors='coerce').fillna(0)
    proj_src['credits_retired'] = pd.to_numeric(proj_src['credits_retired'], errors='coerce').fillna(0)

    proj_src = proj_src[
        proj_src['vintage_year'].notna() &
        proj_src['category'].notna() &
        ~proj_src['category'].isin(EXCLUDED_CATS)
    ].copy()
    proj_src['vintage_year'] = proj_src['vintage_year'].astype(int)
    proj_src['Registry'] = proj_src['registry'].str.lower().map(REG_LABEL).fillna(proj_src['registry'])
    print(f"  {len(proj_src)} project-vintage rows after filtering")

    # ------ Build aggregated_data.csv ------
    print("\nBuilding aggregated_data.csv...")
    agg_grp = (
        proj_src
        .groupby(['Registry', 'category', 'vintage_year'])
        .agg(total_issued=('credits_issued', 'sum'), total_retired=('credits_retired', 'sum'))
        .reset_index()
        .rename(columns={
            'category':      agg_col,
            'vintage_year':  yr_col,
            'total_issued':  cr_col,
            'total_retired': 'total_credits_retired',
        })
    )
    agg_grp['retirement_rate'] = (
        agg_grp['total_credits_retired']
        / agg_grp[cr_col].replace(0, float('nan')) * 100
    ).round(1).fillna(0)
    agg_grp[cr_col]                  = agg_grp[cr_col].astype(int)
    agg_grp['total_credits_retired'] = agg_grp['total_credits_retired'].astype(int)
    agg = agg_grp[agg_grp[cr_col] > 0][[
        reg_col, agg_col, yr_col, cr_col, 'total_credits_retired', 'retirement_rate'
    ]].copy()

    verra_issued = int(agg.loc[agg[reg_col] == 'Verra',         cr_col].sum())
    gs_issued    = int(agg.loc[agg[reg_col] == 'Gold Standard', cr_col].sum())
    acr_issued   = int(agg.loc[agg[reg_col] == 'ACR',           cr_col].sum())
    car_issued   = int(agg.loc[agg[reg_col] == 'CAR',           cr_col].sum())
    print(f"  Verra:         {verra_issued:,}")
    print(f"  Gold Standard: {gs_issued:,}")
    print(f"  ACR:           {acr_issued:,}")
    print(f"  CAR:           {car_issued:,}")
    print(f"  Total rows:    {len(agg)}")
    bad_cats = set(agg[agg_col].unique()) & EXCLUDED_CATS
    print(f"  Excluded categories in agg: {bad_cats or 'none — OK'}")

    # ------ Build country_aggregated_data.csv ------
    print("\nBuilding country_aggregated_data.csv...")
    ctry_src = proj_src[
        proj_src['country'].ne('') & proj_src['country'].ne('International')
    ]
    ctry_grp = (
        ctry_src
        .groupby(['Registry', 'country', 'category', 'vintage_year'])
        .agg(total_issued=('credits_issued', 'sum'))
        .reset_index()
        .rename(columns={
            'country':      cty_col,
            'category':     agg_col,
            'vintage_year': yr_col,
            'total_issued': cr_col,
        })
    )
    ctry_grp[cr_col] = ctry_grp[cr_col].astype(int)
    ctry = ctry_grp[ctry_grp[cr_col] > 0][[
        reg_col, cty_col, agg_col, yr_col, cr_col
    ]].copy()
    print(f"  Total rows: {len(ctry)}")

    # -----------------------------------------------------------------------
    # Save intermediate state (Section G will enrich further)
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

    # --- Read authoritative categories from projects_data.csv ---
    PROJECTS_CSV_E = "public/data/projects_data.csv"
    proj_e = pd.read_csv(PROJECTS_CSV_E, dtype=str)
    proj_e['registry']          = proj_e['registry'].str.strip()
    proj_e['project_id']        = proj_e['project_id'].str.strip()
    proj_e['category']          = proj_e['category'].str.strip()
    proj_e['vintage_year']      = pd.to_numeric(proj_e['vintage_year'],      errors='coerce')
    proj_e['credits_issued']    = pd.to_numeric(proj_e['credits_issued'],    errors='coerce').fillna(0)
    proj_e['credits_retired']   = pd.to_numeric(proj_e['credits_retired'],   errors='coerce').fillna(0)
    proj_e['credits_remaining'] = pd.to_numeric(proj_e['credits_remaining'], errors='coerce').fillna(0)

    # Exclude uncategorised and invalid rows
    _EXCL_E = {'Other', 'No Methodology Provided', 'Unmatched'}
    proj_e = proj_e[
        proj_e['vintage_year'].notna() &
        proj_e['category'].notna() &
        ~proj_e['category'].isin(_EXCL_E)
    ].copy()
    proj_e['vintage_year'] = proj_e['vintage_year'].astype(int)

    # Normalise registry labels to match existing CSV convention
    _REG_LABEL = {'verra': 'Verra', 'gold standard': 'Gold Standard', 'acr': 'ACR', 'car': 'CAR'}
    proj_e['Registry'] = proj_e['registry'].str.lower().map(_REG_LABEL).fillna(proj_e['registry'])

    # Group by (Registry, category, vintage_year) and aggregate
    proj_results = []
    for (reg, cat, yr), g in proj_e.groupby(['Registry', 'category', 'vintage_year']):
        ids = sorted(g['project_id'].unique().tolist())
        issued    = int(g['credits_issued'].sum())
        retired   = int(g['credits_retired'].sum())
        remaining = int(g['credits_remaining'].sum())
        ret_rate  = round(retired / issued * 100, 1) if issued > 0 else 0.0
        proj_results.append({
            'Registry':                reg,
            'Project Type Category':   cat,
            'Vintage Year':            int(yr),
            'Project Count':           len(ids),
            'project_ids':             json.dumps(ids),
            'total_credits_issued':    issued,
            'total_credits_retired':   retired,
            'total_credits_remaining': remaining,
            'retirement_rate':         ret_rate,
        })

    project_counts_df = pd.DataFrame(proj_results, columns=[
        'Registry', 'Project Type Category', 'Vintage Year', 'Project Count', 'project_ids',
        'total_credits_issued', 'total_credits_retired', 'total_credits_remaining', 'retirement_rate',
    ])
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
    # ADDITION 3 — superseded: Section E now reads projects_data.csv
    # directly and computes credits/retirement_rate inline. No merge needed.
    # ------------------------------------------------------------------
    print("  Section G Addition 3: skipped (project_counts.csv already complete from Section E)")

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

    print("3. CSV column verification:")
    for csv_path in [AGG_CSV, CTRY_CSV, PROJECT_COUNTS_CSV]:
        cols = pd.read_csv(csv_path, nrows=0).columns.tolist()
        print(f"   {csv_path}: {cols}")


if __name__ == "__main__":
    main()
