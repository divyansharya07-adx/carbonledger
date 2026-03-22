"""
fix_data.py — CarbonLedger data correction script

Applies six surgical fixes to aggregated_data.csv and country_aggregated_data.csv:
  A) AMS-III.AU: move credits from 'Mixed renewables' → 'Rice cultivation' (Verra)
  B) AMS-III.AK: move credits from 'Cleaner cooking' → 'Public transit' (Verra)
  C) Rename project type 'Agriculture' → 'Soil & Livestock' in both CSVs
  D) Gold Standard unmapped rows: replace 'No Methodology Provided' with
     categorized rows derived from the raw Excel project type labels

Usage:
  cd e:/Claude/carbonledger
  python scripts/fix_data.py

Requires: pandas, openpyxl
"""

import pandas as pd
import re

RAW_EXCEL = r"E:\Claude\Claude_trial\VROD-registry-files--2025-12.xlsx"
AGG_CSV   = "public/aggregated_data.csv"
CTRY_CSV  = "public/country_aggregated_data.csv"

# ---------------------------------------------------------------------------
# Gold Standard project-type → Project Type Category mapping
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
    # Read Verra VCUS sheet once (used for A and B)
    # -----------------------------------------------------------------------
    print("\nReading Verra VCUS sheet…")
    vcus = pd.read_excel(RAW_EXCEL, sheet_name="Verra VCUS", engine="openpyxl")
    vcus["vintage_year"] = pd.to_datetime(vcus["Vintage Start"], errors="coerce").dt.year
    vcus["qty"] = pd.to_numeric(vcus["Quantity Issued"], errors="coerce").fillna(0)

    # -----------------------------------------------------------------------
    # SECTION A — AMS-III.AU: Mixed renewables → Rice cultivation (Verra)
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
    # SECTION B — AMS-III.AK: Cleaner cooking → Public transit (Verra)
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
    # SECTION C — Rename project type 'Agriculture' → 'Soil & Livestock'
    # -----------------------------------------------------------------------
    print("\n--- FIX C: Agriculture -> Soil & Livestock ---")
    n_agg  = (agg[agg_col]  == "Agriculture").sum()
    n_ctry = (ctry[agg_col] == "Agriculture").sum()
    agg.loc[agg[agg_col]   == "Agriculture", agg_col] = "Soil & Livestock"
    ctry.loc[ctry[agg_col] == "Agriculture", agg_col] = "Soil & Livestock"
    print(f"  Renamed {n_agg} rows in aggregated_data.csv")
    print(f"  Renamed {n_ctry} rows in country_aggregated_data.csv")

    # -----------------------------------------------------------------------
    # SECTION D — Gold Standard unmapped rows → categorized by project type
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
    code_to_cat = {}   # (registry, code) → category   — Verra, Gold
    name_to_cat = {}   # (registry, name) → category   — ACR, CAR
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

    # --- Verra (reuse vcus DataFrame from Section A/B) ---
    vcus_e = vcus[['ID', 'Methodology']].copy()
    vcus_e['ID'] = vcus_e['ID'].astype(str).str.strip()
    vcus_e['Methodology'] = vcus_e['Methodology'].fillna('').astype(str).str.strip()
    vcus_e = vcus_e[vcus_e['ID'].str.len() > 0]
    proj_meth_v = (vcus_e.groupby('ID')['Methodology']
                         .agg(lambda x: x[x != ''].mode().iloc[0]
                                        if len(x[x != ''].mode()) > 0 else ''))
    verra_counts = {}
    for _, meth in proj_meth_v.items():
        cat = lookup_cat_e('Verra', meth)
        if cat:
            verra_counts[cat] = verra_counts.get(cat, 0) + 1
    print(f"  Verra: {len(proj_meth_v)} unique projects, {sum(verra_counts.values())} matched")
    for cat, cnt in sorted(verra_counts.items()):
        proj_results.append({'Registry': 'Verra', 'Project Type Category': cat, 'Project Count': cnt})

    # --- Gold Standard (reuse gold DataFrame from Section D, or load fresh if D was skipped) ---
    if gold is None:
        gold = pd.read_excel(RAW_EXCEL, sheet_name="Gold Issuances", engine="openpyxl")
    gold_e = gold[['GSID', 'Methodology']].copy()
    gold_e['GSID'] = gold_e['GSID'].astype(str).str.strip()
    gold_e['Methodology'] = gold_e['Methodology'].fillna('').astype(str).str.strip()
    gold_e = gold_e[gold_e['GSID'].str.len() > 0]
    proj_meth_g = (gold_e.groupby('GSID')['Methodology']
                         .agg(lambda x: x[x != ''].mode().iloc[0]
                                        if len(x[x != ''].mode()) > 0 else ''))
    gold_counts = {}
    for _, meth in proj_meth_g.items():
        cat = lookup_cat_e('Gold', meth)
        if cat:
            gold_counts[cat] = gold_counts.get(cat, 0) + 1
    print(f"  Gold Standard: {len(proj_meth_g)} unique projects, {sum(gold_counts.values())} matched")
    for cat, cnt in sorted(gold_counts.items()):
        proj_results.append({'Registry': 'Gold Standard', 'Project Type Category': cat, 'Project Count': cnt})

    # --- ACR ---
    print("  Reading ACR Issuances…")
    acr_e = pd.read_excel(RAW_EXCEL, sheet_name='ACR Issuances',
                          usecols=['Project ID', 'Project Methodology/Protocol'],
                          engine='openpyxl')
    acr_e['Project ID'] = acr_e['Project ID'].astype(str).str.strip()
    acr_e['Project Methodology/Protocol'] = acr_e['Project Methodology/Protocol'].fillna('').astype(str).str.strip()
    acr_e = acr_e[acr_e['Project ID'].str.len() > 0]
    proj_meth_a = (acr_e.groupby('Project ID')['Project Methodology/Protocol']
                        .agg(lambda x: x[x != ''].mode().iloc[0]
                                       if len(x[x != ''].mode()) > 0 else ''))
    acr_counts = {}
    for _, proto in proj_meth_a.items():
        cat = lookup_cat_e('ACR', proto)
        if cat:
            acr_counts[cat] = acr_counts.get(cat, 0) + 1
    print(f"  ACR: {len(proj_meth_a)} unique projects, {sum(acr_counts.values())} matched")
    for cat, cnt in sorted(acr_counts.items()):
        proj_results.append({'Registry': 'ACR', 'Project Type Category': cat, 'Project Count': cnt})

    # --- CAR ---
    print("  Reading CAR Issuances…")
    car_e = pd.read_excel(RAW_EXCEL, sheet_name='CAR Issuances',
                          usecols=['Project ID', 'Protocol and Version'],
                          engine='openpyxl')
    car_e['Project ID'] = car_e['Project ID'].astype(str).str.strip()
    car_e['Protocol and Version'] = car_e['Protocol and Version'].fillna('').astype(str).str.strip()
    car_e = car_e[car_e['Project ID'].str.len() > 0]
    proj_meth_c = (car_e.groupby('Project ID')['Protocol and Version']
                        .agg(lambda x: x[x != ''].mode().iloc[0]
                                       if len(x[x != ''].mode()) > 0 else ''))
    car_counts = {}
    for _, proto in proj_meth_c.items():
        cat = lookup_cat_e('CAR', proto)
        if cat:
            car_counts[cat] = car_counts.get(cat, 0) + 1
    print(f"  CAR: {len(proj_meth_c)} unique projects, {sum(car_counts.values())} matched")
    for cat, cnt in sorted(car_counts.items()):
        proj_results.append({'Registry': 'CAR', 'Project Type Category': cat, 'Project Count': cnt})

    project_counts_df = pd.DataFrame(proj_results,
        columns=['Registry', 'Project Type Category', 'Project Count'])
    project_counts_df.to_csv(PROJECT_COUNTS_CSV, index=False)
    print(f"\nWrote {len(project_counts_df)} rows to {PROJECT_COUNTS_CSV}")
    totals = project_counts_df.groupby('Registry')['Project Count'].sum()
    print(totals.to_string())
    print(f"Grand total: {totals.sum():,} projects")

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


if __name__ == "__main__":
    main()
