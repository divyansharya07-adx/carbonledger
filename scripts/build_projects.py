"""
build_projects.py — CarbonLedger project-level ETL

Reads the VROD Excel file and outputs one row per project to
public/data/projects_data.csv with a unified schema across
ACR, CAR, Gold Standard, and Verra.

Usage:
  cd e:/Claude/carbonledger
  python scripts/build_projects.py

Requires: pandas, openpyxl
"""

import os
import re
import pandas as pd

RAW_EXCEL = os.environ.get(
    "VROD_EXCEL_PATH",
    r"E:\Personal\Personal Project\VROD-registry-files--2026-02.xlsx"
)
OUTPUT_CSV = os.environ.get(
    "OUTPUT_CSV",
    "public/data/projects_data.csv"
)
METHODOLOGY_MAP_CSV = os.environ.get(
    "METHODOLOGY_MAP_CSV",
    "public/methodology_mapping.csv"
)

os.makedirs(os.path.dirname(OUTPUT_CSV), exist_ok=True)

COUNTRY_NAME_MAP = {
    'Congo, The Democratic Republic of The': 'DR Congo',
    'Congo, Republic of': 'Congo',
    'Korea, Republic of': 'South Korea',
    'Tanzania, United Republic of': 'Tanzania',
    'Tanzania United Republic of': 'Tanzania',
    'Tanzania, United Republic Of': 'Tanzania',
    "Lao People's Democratic Republic": 'Laos',
    'Lao': 'Laos',
    'Bolivia, Plurinational State of': 'Bolivia',
    'Bolivia Plurinational State of': 'Bolivia',
    'Venezuela, Bolivarian Republic of': 'Venezuela',
    'Iran, Islamic Republic of': 'Iran',
    'Viet Nam': 'Vietnam',
    'Russian Federation': 'Russia',
    'Syrian Arab Republic': 'Syria',
    "Côte d'Ivoire": 'Ivory Coast',
    "C\u221a\u00a5te d'Ivoire": 'Ivory Coast',
    'Moldova, Republic of': 'Moldova',
    'US': 'United States',
    'MX': 'Mexico',
    'DE': 'Germany',
    'FR': 'France',
    'NI': 'Nicaragua',
    'SV': 'El Salvador',
}

OUTPUT_COLS = [
    'project_id', 'project_name', 'registry', 'country', 'project_type',
    'methodology', 'category', 'proponent', 'status', 'registration_date',
    'credits_issued', 'credits_retired', 'credits_remaining',
    'retirement_rate', 'corsia_eligible', 'sdg_eligible',
    'crediting_period_start', 'crediting_period_end',
    'verification_body', 'documents_url',
]


def normalize_country(raw):
    v = str(raw).strip() if pd.notna(raw) else ''
    if not v or v.lower() in ('nan', 'none', ''):
        return None
    return COUNTRY_NAME_MAP.get(v, v)


def coerce_credits(series):
    """Sum a series of credit values, coercing non-numeric to 0."""
    return pd.to_numeric(series, errors='coerce').fillna(0)


def bool_flag(series, true_values=('yes', 'true', '1')):
    """Return True if any value in series (lowercased string) is in true_values."""
    return series.astype(str).str.strip().str.lower().isin(true_values).any()


def build_category_lookup():
    """Load methodology_mapping.csv and return registry-specific lookup structures."""
    mmap = pd.read_csv(METHODOLOGY_MAP_CSV)

    # Verra: lookup by Methodology Code (e.g. "VMR0007", "ACM0001", "AMS-III.D.")
    verra_by_code = {}
    for _, row in mmap[mmap['Registry'] == 'Verra'].iterrows():
        code = str(row['Methodology Code']).strip()
        if code and code.lower() != 'nan':
            verra_by_code[code] = str(row['Project Type Category']).strip()

    # ACR / CAR / Gold Standard: lookup by Methodology Name
    name_lookup = {}  # (registry_key, name) -> category
    for _, row in mmap[mmap['Registry'].isin(['ACR', 'CAR', 'Gold'])].iterrows():
        reg  = str(row['Registry']).strip()
        name = str(row['Methodology Name']).strip()
        cat  = str(row['Project Type Category']).strip()
        if name and name.lower() != 'nan':
            name_lookup[(reg, name)] = cat

    return verra_by_code, name_lookup


def _map_gold_project_type(pt):
    """Map a Gold Standard Project Type label to a category (mirrors fix_data.py)."""
    if pd.isna(pt):
        return 'Other'
    pt = str(pt).strip()
    pl = pt.lower()
    if pl == 'wind':
        return 'Wind'
    if pl in ('a/r', 'afforestation/reforestation') or re.match(r'afforest|reforest', pl):
        return 'Afforestation/Reforestation'
    if re.match(r'biogas|biomass', pl):
        return 'Bioenergy'
    if re.match(r'solar|pv$', pl):
        return 'Solar'
    if re.match(r'small.*hydro|hydro', pl):
        return 'Hydropower'
    if pl == 'grid efficiency':
        return 'Grid efficiency'
    if re.match(r'energy efficiency', pl):
        return 'Efficient appliances'
    if pl == 'agriculture':
        return 'Soil & Livestock'
    if pl == 'composting':
        return 'Composting'
    if re.match(r'manure|livestock', pl):
        return 'Soil & Livestock'
    if pl == 'landfill gas':
        return 'Landfill gas'
    if re.match(r'waste', pl):
        return 'Waste management'
    if re.match(r'industrial', pl):
        return 'Industrial efficiency'
    return 'Other'


def lookup_category(registry, methodology, verra_by_code, name_lookup, project_type=None):
    """Return the Project Type Category for a project, or 'Other' if unresolved."""
    meth = str(methodology).strip() if pd.notna(methodology) else ''
    if not meth or meth.lower() in ('nan', 'none', ''):
        if registry == 'Gold Standard':
            return _map_gold_project_type(project_type)
        return 'Other'

    if registry == 'Verra':
        # Methodology may be semicolon-separated codes; try each
        for code in meth.split(';'):
            code = code.strip()
            if code in verra_by_code:
                return verra_by_code[code]
        return 'Other'

    reg_key = {'ACR': 'ACR', 'CAR': 'CAR', 'Gold Standard': 'Gold'}.get(registry)
    if not reg_key:
        return 'Other'

    # Direct name match (ACR, Gold Standard)
    if (reg_key, meth) in name_lookup:
        return name_lookup[(reg_key, meth)]

    # CAR: project methodology embeds the short protocol name + version suffix.
    # e.g. "Livestock - ARB Compliance - ARB Compliance Offset Protocol..., Nov 14, 2014"
    # Mapping name is "Livestock - ARB Compliance" — use substring match.
    if reg_key == 'CAR':
        for (rk, name), cat in name_lookup.items():
            if rk == 'CAR' and name in meth:
                return cat

    return 'Other'


# ---------------------------------------------------------------------------
# ACR
# ---------------------------------------------------------------------------
def build_acr():
    print("Loading ACR…")
    proj = pd.read_excel(RAW_EXCEL, sheet_name='ACR Projects', engine='openpyxl')
    iss  = pd.read_excel(RAW_EXCEL, sheet_name='ACR Issuances', engine='openpyxl')
    ret  = pd.read_excel(RAW_EXCEL, sheet_name='ACR Retirements', engine='openpyxl')

    # Credits aggregated per project
    issued  = (coerce_credits(iss['Total Credits Issued'])
               .groupby(iss['Project ID'].astype(str).str.strip())
               .sum().rename('credits_issued'))
    retired = (coerce_credits(ret['Quantity of Credits'])
               .groupby(ret['Project ID'].astype(str).str.strip())
               .sum().rename('credits_retired'))

    # CORSIA: CCP Approved == 'Yes' in any issuance row
    corsia_map = (
        iss['CCP Approved'].astype(str).str.strip().str.lower()
        .eq('yes')
        .groupby(iss['Project ID'].astype(str).str.strip())
        .any()
        .rename('corsia_eligible')
    )

    proj['_id'] = proj['Project ID'].astype(str).str.strip()
    proj = proj.set_index('_id')
    proj = proj.join(issued).join(retired).join(corsia_map)
    proj.index.name = 'project_id'
    proj = proj.reset_index()

    # SDG: Sustainable Development Goal(s) not empty
    sdg_col = 'Sustainable Development Goal(s)'
    proj['sdg_eligible'] = proj[sdg_col].notna() & \
                           (proj[sdg_col].astype(str).str.strip() != '')

    df = pd.DataFrame()
    df['project_id']            = proj['project_id']
    df['project_name']          = proj['Project Name']
    df['registry']              = 'ACR'
    df['country']               = proj['Project Site Country'].apply(normalize_country)
    df['project_type']          = proj['Project Type']
    df['methodology']           = proj['Project Methodology/Protocol']
    df['proponent']             = proj['Project Developer']
    df['status']                = proj['Voluntary Status']
    df['registration_date']     = None
    df['credits_issued']        = proj['credits_issued'].fillna(0).round().astype(int)
    df['credits_retired']       = proj['credits_retired'].fillna(0).round().astype(int)
    df['corsia_eligible']       = proj['corsia_eligible'].fillna(False)
    df['sdg_eligible']          = proj['sdg_eligible']
    df['crediting_period_start'] = proj['Current Crediting Period Start Date']
    df['crediting_period_end']   = proj['Current Crediting Period End Date']
    df['verification_body']     = proj['Current VVB']
    df['documents_url']         = proj['Documents']

    print(f"  ACR projects: {len(df)}")
    return df


# ---------------------------------------------------------------------------
# CAR
# ---------------------------------------------------------------------------
def build_car():
    print("Loading CAR…")
    proj = pd.read_excel(RAW_EXCEL, sheet_name='CAR Projects', engine='openpyxl')
    iss  = pd.read_excel(RAW_EXCEL, sheet_name='CAR Issuances', engine='openpyxl')
    ret  = pd.read_excel(RAW_EXCEL, sheet_name='CAR Retirements', engine='openpyxl')

    issued  = (coerce_credits(iss['Total Offset Credits Issued'])
               .groupby(iss['Project ID'].astype(str).str.strip())
               .sum().rename('credits_issued'))
    retired = (coerce_credits(ret['Quantity of Offset Credits'])
               .groupby(ret['Project ID'].astype(str).str.strip())
               .sum().rename('credits_retired'))

    # CORSIA: either CORSIA period column == 'Yes'
    iss_id = iss['Project ID'].astype(str).str.strip()
    corsia_21 = iss['Eligible for CORSIA 2021-2023 Compliance Period'].astype(str).str.strip().str.lower().eq('yes')
    corsia_24 = iss['Eligible for CORSIA 2024-2026 Compliance Period'].astype(str).str.strip().str.lower().eq('yes')
    corsia_map = ((corsia_21 | corsia_24)
                  .groupby(iss_id).any().rename('corsia_eligible'))

    # Methodology: most common Protocol and Version per project
    proto_mode = (iss.groupby(iss_id)['Protocol and Version']
                  .agg(lambda x: x.dropna().mode().iloc[0] if len(x.dropna().mode()) > 0 else None)
                  .rename('methodology'))

    proj['_id'] = proj['Project ID'].astype(str).str.strip()
    proj = proj.set_index('_id')
    proj = proj.join(issued).join(retired).join(corsia_map).join(proto_mode)
    proj.index.name = 'project_id'
    proj = proj.reset_index()

    # SDG
    sdg_col = 'SDG Impact'
    proj['sdg_eligible'] = proj[sdg_col].notna() & \
                           (proj[sdg_col].astype(str).str.strip().str.lower() != 'nan') & \
                           (proj[sdg_col].astype(str).str.strip() != '')

    df = pd.DataFrame()
    df['project_id']            = proj['project_id']
    df['project_name']          = proj['Project Name']
    df['registry']              = 'CAR'
    df['country']               = proj['Project Site Country'].apply(normalize_country)
    df['project_type']          = proj['Project Type']
    df['methodology']           = proj['methodology']
    df['proponent']             = proj['Project Developer']
    df['status']                = proj['Status']
    df['registration_date']     = proj['Project Registered Date']
    df['credits_issued']        = proj['credits_issued'].fillna(0).round().astype(int)
    df['credits_retired']       = proj['credits_retired'].fillna(0).round().astype(int)
    df['corsia_eligible']       = proj['corsia_eligible'].fillna(False)
    df['sdg_eligible']          = proj['sdg_eligible']
    df['crediting_period_start'] = None
    df['crediting_period_end']   = None
    df['verification_body']     = proj['Verification Body']
    df['documents_url']         = proj['Documents']

    print(f"  CAR projects: {len(df)}")
    return df


# ---------------------------------------------------------------------------
# Gold Standard
# ---------------------------------------------------------------------------
def build_gold():
    print("Loading Gold Standard…")
    proj = pd.read_excel(RAW_EXCEL, sheet_name='Gold Projects', engine='openpyxl')
    iss  = pd.read_excel(RAW_EXCEL, sheet_name='Gold Issuances', engine='openpyxl')
    ret  = pd.read_excel(RAW_EXCEL, sheet_name='Gold Retirements', engine='openpyxl')

    iss['qty'] = coerce_credits(iss['Quantity'])
    ret['qty'] = coerce_credits(ret['Quantity'])

    # Credits issued: only rows with Credit Status == 'Issued'
    iss_gsid = iss['GSID'].astype(str).str.strip()
    issued_mask = iss['Credit Status'].astype(str).str.strip().str.lower() == 'issued'
    issued  = iss[issued_mask]['qty'].groupby(iss_gsid[issued_mask]).sum().rename('credits_issued')

    ret_gsid = ret['GSID'].astype(str).str.strip()
    retired = ret['qty'].groupby(ret_gsid).sum().rename('credits_retired')

    # CORSIA: Label column contains 'CORSIA' text (File B: replaces 'Eligible for CORSIA?' column)
    corsia_map = (
        iss['Label'].astype(str).str.contains('CORSIA', na=False)
        .groupby(iss_gsid)
        .any()
        .rename('corsia_eligible')
    )

    proj['_id'] = 'GS' + proj['GSID'].astype(str).str.strip()
    # Reindex the credit series to match prefixed IDs
    issued.index      = 'GS' + issued.index.astype(str)
    retired.index     = 'GS' + retired.index.astype(str)
    corsia_map.index  = 'GS' + corsia_map.index.astype(str)
    proj = proj.set_index('_id')
    proj = proj.join(issued).join(retired).join(corsia_map)
    proj.index.name = 'project_id'
    proj = proj.reset_index()

    df = pd.DataFrame()
    df['project_id']            = proj['project_id']
    df['project_name']          = proj['Project Name']
    df['registry']              = 'Gold Standard'
    df['country']               = proj['Country'].apply(normalize_country)
    df['project_type']          = proj['Project Type']
    df['methodology']           = proj['Methodology']
    df['proponent']             = proj['Project Developer Name']
    df['status']                = proj['Status']
    df['registration_date']     = None
    df['credits_issued']        = proj['credits_issued'].fillna(0).round().astype(int)
    df['credits_retired']       = proj['credits_retired'].fillna(0).round().astype(int)
    df['corsia_eligible']       = proj['corsia_eligible'].fillna(False)
    df['sdg_eligible']          = True  # GS always requires SDG assessment
    df['crediting_period_start'] = None
    df['crediting_period_end']   = None
    df['verification_body']     = None
    df['documents_url']         = None

    print(f"  Gold Standard projects: {len(df)}")
    return df


# ---------------------------------------------------------------------------
# Verra
# ---------------------------------------------------------------------------
def build_verra():
    print("Loading Verra…")
    proj = pd.read_excel(RAW_EXCEL, sheet_name='Verra Projects', engine='openpyxl')
    vcus = pd.read_excel(RAW_EXCEL, sheet_name='Verra VCUS', engine='openpyxl')

    vcus['qty']  = coerce_credits(vcus['Quantity Issued'])
    vcus_id      = vcus['ID'].astype(str).str.strip()

    issued  = vcus['qty'].groupby(vcus_id).sum().rename('credits_issued')

    # Retired: rows with a retirement date that are not cancellations
    ret_mask = vcus['Retirement/Cancellation Date'].notna()
    if 'Retirement Reason' in vcus.columns:
        cancelled_mask = vcus['Retirement Reason'].astype(str).str.strip().str.lower() == 'cancelled'
        ret_mask = ret_mask & ~cancelled_mask
    retired = vcus[ret_mask]['qty'].groupby(vcus_id[ret_mask]).sum().rename('credits_retired')

    # CORSIA: check Additional Certifications for 'CORSIA' text
    corsia_map = (
        vcus['Additional Certifications'].astype(str).str.lower()
        .str.contains('corsia', na=False)
        .groupby(vcus_id)
        .any()
        .rename('corsia_eligible')
    )

    # SDG: Sustainable Development Goals not empty in any VCUS row
    sdg_map = (
        vcus['Sustainable Development Goals'].astype(str).str.strip()
        .ne('nan').groupby(vcus_id).any()
        .rename('sdg_eligible')
    )

    proj['_id'] = 'VCS' + proj['ID'].astype(str).str.strip()
    # Reindex the credit series to match prefixed IDs
    issued.index     = 'VCS' + issued.index.astype(str)
    retired.index    = 'VCS' + retired.index.astype(str)
    corsia_map.index = 'VCS' + corsia_map.index.astype(str)
    sdg_map.index    = 'VCS' + sdg_map.index.astype(str)
    proj = proj.set_index('_id')
    proj = proj.join(issued).join(retired).join(corsia_map).join(sdg_map)
    proj.index.name = 'project_id'
    proj = proj.reset_index()

    df = pd.DataFrame()
    df['project_id']            = proj['project_id']
    df['project_name']          = proj['Name']
    df['registry']              = 'Verra'
    df['country']               = proj['Country/Area'].apply(normalize_country)
    df['project_type']          = proj['Project Type']
    df['methodology']           = proj['Methodology']
    df['proponent']             = proj['Proponent']
    df['status']                = proj['Status']
    df['registration_date']     = proj['Project Registration Date']
    df['credits_issued']        = proj['credits_issued'].fillna(0).round().astype(int)
    df['credits_retired']       = proj['credits_retired'].fillna(0).round().astype(int)
    df['corsia_eligible']       = proj['corsia_eligible'].fillna(False)
    df['sdg_eligible']          = proj['sdg_eligible'].fillna(False)
    df['crediting_period_start'] = proj['Crediting Period Start Date']
    df['crediting_period_end']   = proj['Crediting Period End Date']
    df['verification_body']     = None
    df['documents_url']         = None

    print(f"  Verra projects: {len(df)}")
    return df


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    acr_df  = build_acr()
    car_df  = build_car()
    gold_df = build_gold()
    verra_df = build_verra()

    all_df = pd.concat([acr_df, car_df, gold_df, verra_df], ignore_index=True)

    # Derived credit fields
    all_df['credits_remaining'] = all_df['credits_issued'] - all_df['credits_retired']
    all_df['retirement_rate'] = all_df.apply(
        lambda r: round(r['credits_retired'] / r['credits_issued'] * 100, 1)
                  if r['credits_issued'] > 0 else 0.0,
        axis=1
    )

    all_df = all_df[all_df['credits_issued'] > 0]

    # Resolve category via methodology_mapping.csv
    verra_by_code, name_lookup = build_category_lookup()
    all_df['category'] = all_df.apply(
        lambda r: lookup_category(r['registry'], r['methodology'], verra_by_code, name_lookup, r.get('project_type')),
        axis=1,
    )
    print(f"\nCategory coverage: {(all_df['category'] != 'Other').sum()} / {len(all_df)} projects resolved")

    all_df = all_df.reindex(columns=OUTPUT_COLS)
    all_df.to_csv(OUTPUT_CSV, index=False)
    print(f"\nWrote {len(all_df)} rows -> {OUTPUT_CSV}")

    # -----------------------------------------------------------------------
    # Quality checks
    # -----------------------------------------------------------------------
    print("\n=== QUALITY CHECKS ===")

    print("\n1. Rows per registry:")
    print(all_df.groupby('registry').size().to_string())

    total_issued = all_df['credits_issued'].sum()
    print(f"\n2. Total credits_issued: {total_issued:,.0f}  (expect ~2.55B)")

    n_retired = (all_df['credits_retired'] > 0).sum()
    print(f"\n3. Projects with credits_retired > 0: {n_retired}")

    n_corsia = all_df['corsia_eligible'].sum()
    print(f"\n4. CORSIA eligible projects: {n_corsia}")

    dupes = all_df[all_df.duplicated('project_id', keep=False)]
    if len(dupes):
        print(f"\n5. WARNING: {len(dupes)} rows with duplicate project_id:")
        print(dupes[['project_id', 'registry']].to_string())
    else:
        print("\n5. No duplicate project_ids.")


if __name__ == '__main__':
    main()
