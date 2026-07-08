# CarbonLedger — Architecture Reference

> This file was last updated by chat-assisted review on 2026-05-31, capturing the Step 23b-4 changes from Session 29. Update this file whenever pipeline logic, CSV schemas, or React data connections change.

---

## 1. Overview

CarbonLedger is a **static single-page React application** with no backend server. All data is pre-processed by a Python pipeline and committed as static CSV files. The frontend loads these CSVs at runtime and performs all filtering client-side.

- **Deployed at:** carbonledger.pro (Vercel)
- **Data refresh:** GitHub Actions workflow triggered on push to `main` when `data/*.xlsx` changes, or via `workflow_dispatch`
- **Total credits covered:** ~2.54 billion credits across Verra, Gold Standard, ACR, and CAR registries
- **Data source:** Berkeley Voluntary Registry Offsets Database (VROD), February 2026 snapshot
- **Pipeline reads BOTH Berkeley VROD files** since Step 23b-4 (Session 29):
  - File 1 (`VROD-registry-files--YYYY-MM.xlsx`): per-registry issuance and retirement sheets — source of truth for credit math
  - File 2 (`Voluntary-Registry-Offsets-Database--vYYYY-MM.xlsx`): curated one-row-per-project unified database — source of truth for project metadata

---

## 2. Data Sources

### 2a. Primary Excel Files

**Location (local):** `E:\Claude\Claude_trial\` (both files)
**Location (repo):** `data/` directory, both committed via Git LFS

| File | Size | Sheets | Used By | Purpose |
|------|------|--------|---------|---------|
| `VROD-registry-files--YYYY-MM.xlsx` | ~50 MB | 26 | `build_projects.py`, `fix_data.py` | Per-registry transaction-level data (issuances + retirements). Source of truth for credit math. |
| `Voluntary-Registry-Offsets-Database--vYYYY-MM.xlsx` | ~16 MB | ~14 | `enrich_projects.py` (Session 29 addition) | Berkeley's curated unified database. One row per project. Source of truth for project metadata. |

**File 1 sheets used by pipeline:**

| Sheet | Used By | Purpose |
|-------|---------|---------|
| Verra VCUS | `build_projects.py` | Verra project issuances (methodology, credits, vintage year, country); reads `Issuance Date` column for `first_issuance_date` derivation |
| GS Issuances | `build_projects.py` | Gold Standard issuances (project type, credits, vintage year). Note: GS `Issuance Date` is a scrape timestamp; pipeline uses `{min_vintage_year}-01-01` as fallback for `first_issuance_date` |
| GS Projects | `build_projects.py` | Gold Standard project metadata (project name, country) |
| ACR | `build_projects.py` | ACR projects |
| ACR Issuances | `build_projects.py` | ACR issuances; reads `Date Issued (GMT)` for `first_issuance_date` |
| CAR | `build_projects.py` | CAR projects |
| CAR Issuances | `build_projects.py` | CAR issuances; reads `Date Issued` for `first_issuance_date` |

**File 2 sheet used by pipeline (NEW in Session 29):**

| Sheet | Used By | Purpose |
|-------|---------|---------|
| PROJECTS | `enrich_projects.py` | Unified one-row-per-project metadata; left-joined onto `projects_data.csv` via `project_id` to add 9 metadata columns |

### 2b. Methodology Mapping

**File:** `public/methodology_mapping.csv`

- 445 rows, no header in file (read with explicit column names in pipeline). Includes 1 row added in Session 28 (`gs_methodology_overrides.csv` rescue) for the Carbon Sequestration Through Accelerated Carbonation Of Concrete Aggregate → Engineered Removals mapping.
- Columns: `Methodology Code, Registry, Methodology Name, Project Type Category`
- Registry breakdown: Verra 283 · Gold Standard 82 · ACR 46 · CAR 32 · ART 2
- 31 unique categories — no blank/null/Other entries
- **Manually curated static file** — no auto-generation script
- First committed 2026-03-20; Agriculture → Soil & Livestock rename 2026-03-21

> **Note:** ~5 Gold Standard rows have methodology names containing commas. These are correctly double-quoted and parsed safely by pandas. Plain-text grep of column 4 will produce spurious fragments — reporting artefact only.

### 2c. GS Methodology Overrides (Session 28)

**File:** `scripts/gs_methodology_overrides.csv`

23 Gold Standard projects with originally blank methodology in File 1 had been rescued via manually verified methodology assignments from Gold Standard registry pages and PDDs. Eliminated 4.65M credits previously falling into "Other". Categories rescued: Landfill gas, Solar/Mixed renewables, Rice cultivation, Composting, Engineered Removals, Waste management.

### 2d. World Bank CO₂ API

**Endpoint:** `https://api.worldbank.org/v2/country/{ISO2}/indicator/EN.GHG.CO2.MT.CE.AR5?format=json&date=1990:2024&per_page=50`

- Called **live** per country selection in `CountryExplorer.js`
- Returns annual CO₂ emissions in MtCO₂e for the selected country
- No caching; refetched on every country change

---

## 3. Python Pipeline (UPDATED Session 29)

**Three scripts run sequentially:** `build_projects.py` → `fix_data.py` → `enrich_projects.py`.

- `fix_data.py` reads `projects_data.csv` (Section G), so `build_projects.py` must complete first.
- `enrich_projects.py` (Step 23b-4) runs last — it left-joins File 2 project metadata onto `projects_data.csv` additively. `fix_data.py` does **not** consume the enrichment columns, so it does not need to re-run after enrich.

### 3a. `scripts/build_projects.py`

**Output:** `public/data/projects_data.csv` (vintage-level: one row per project × vintage year — 26,359 rows, 5,821 unique projects, **24 columns** as of Step 23b-4, which appends `first_issuance_date`).

**Key function — `lookup_category(registry, methodology, verra_by_code, name_lookup, project_type)`:**

```
1. If methodology is null/empty:
   - Gold Standard → _map_gold_project_type(project_type)
   - All others → 'Other'
2. If registry == 'Verra':
   - Split methodology string by ';'
   - For each code (stripped), check verra_by_code dict
   - Return category of FIRST MATCHING CODE (first-code-wins)
   - No match → 'Other'
3. If registry in {ACR, CAR, Gold Standard}:
   - Direct lookup in name_lookup[(registry, methodology)]
   - CAR has additional substring fallback
   - No match → 'Other'
```

**`build_category_lookup()` keying:**
- Verra rows → keyed by `Methodology Code` column (code-based)
- All others → keyed by `Methodology Name` column (name-based)

**`_map_gold_project_type(project_type)` fallback** (for GS null-methodology rows):
Maps Gold Standard `Project Type` strings to dashboard categories:
- `energy efficiency*` → Efficient appliances
- `wind` → Wind
- `biogas*`, `biomass*`, `biofuel*` → Bioenergy
- `a/r`, `afforestation*` → Afforestation/Reforestation
- `solar*` → Solar
- `hydro*` → Hydropower
- `geothermal` → Geothermal
- `cookstoves*`, `clean cooking*` → Cleaner cooking
- All others → None (falls through to 'Other')

**Berkeley methodology alignment (Session 17 + Session 19):**
- **Verra:** Issued credits = TVQ (Total Vintage Quantity) deduplicated per (project_id, Vintage Start, Vintage End, TVQ). Retired = Quantity Issued where Retirement/Cancellation Date is not null. Source: Design Calculations Row 71.
- **Gold Standard:** Issued = Quantity where Product Type ∈ {VER, CER}. Retired = same filter + Credit Status ∈ {Retired, Canceled}. Source: Design Calculations Row 64.
- **ACR:** Issued = `Credits Issued to Project` column. Source: Design Calculations Row 17.
- **CAR:** Issued = Total Offset Credits Issued − Reserve Buffer Pool − Compliance Buffer Pool. Source: Design Calculations Row 50.

**Session 29 addition — `first_issuance_date`:**
Per-registry derivation from File 1 issuance frames in `build_acr` / `build_car` / `build_verra`:
- Verra: `vcus.groupby('project_id')['Issuance Date'].min()` — real datetime
- ACR: `iss.groupby('project_id')['Date Issued (GMT)'].min()` — real datetime
- CAR: `iss.groupby('project_id')['Date Issued'].min()` — real datetime
- Gold Standard: `null` (GS Issuance Date is a scrape timestamp, not real)
- Universal fallback in `main()` after concat: fill null `first_issuance_date` with `{min_vintage_year}-01-01` for any project (all GS + rare stragglers)

Result: every project gets a `first_issuance_date` value. Real datetime for ~80% of projects; min-vintage fallback for ~20%.

### 3b. `scripts/fix_data.py`

**Inputs:** `projects_data.csv` (single source of truth from Step 22b), `public/methodology_mapping.csv`
**Outputs:** `public/aggregated_data.csv`, `public/country_aggregated_data.csv`, `public/project_counts.csv` (+ timestamped backups)

Reduced to ~510 lines in Session 18 (Step 22b refactor). All aggregations derive from `projects_data.csv` via pandas groupby; no raw Excel reads.

| Section | Purpose |
|---------|---------|
| A | Load and validate `projects_data.csv` |
| B | Build `aggregated_data.csv` (vintage × category × registry) via groupby |
| C | Build `country_aggregated_data.csv` (vintage × category × registry × country) via groupby |
| D | Build `project_counts.csv` (category × registry summary) via groupby |
| E | Reads `projects_data.csv` for project-count category lookup (Step 22-pre fix) |
| G | Country-level retirement enrichment from `projects_data.csv` |

> **Important note (Session 29 verification):** `fix_data.py` reads only existing columns from `projects_data.csv` (`project_id, vintage_year, credits_*, category, registry, country`). It does NOT consume the enrichment columns added by `enrich_projects.py`. Pipeline order `build → fix → enrich` is safe — fix can run before enrich without seeing the new columns. Confirmed in 23b-4 pre-flight inspection.

### 3c. `scripts/enrich_projects.py` (NEW in Session 29)

**Inputs:** `projects_data.csv` (output of `build_projects.py`), File 2 PROJECTS sheet
**Output:** `projects_data.csv` (overwritten with 9 additional columns + 1 derived column appended)

Architecture A: File 2 metadata left-joins onto File 1 pipeline output via `project_id`.

**Reads:**
- `public/data/projects_data.csv` (left, dtype=str to preserve existing columns byte-for-byte)
- File 2 PROJECTS sheet (`header=3`, only the 9 needed columns + `Project ID`)
- File 2 path: env `VROD_DB_EXCEL_PATH`; local fallback = glob `data/Voluntary-Registry-Offsets*.xlsx`, else `E:\Claude\Claude_trial\...`

**Left-join key:** `projects_data.project_id == File2['Project ID']`. Confirmed in pre-flight: 5,820 of 5,821 pipeline pids match File 2 (100.0% join rate, the one outlier is a pre-existing blank-registry project).

**9 joined columns (source → destination):**

| File 2 source (exact string) | → destination | transform |
|------------------------------|---------------|-----------|
| `Reduction / Removal` | `reduction_removal` | passthrough str |
| `Total Buffer \nPool Deposits` (newline in header!) | `total_buffer_pool_deposits` | numeric |
| `Buffer Credits Released to Project` | `buffer_credits_released` | numeric |
| `Reversals Covered by Buffer Pool` | `reversals_covered_buffer` | numeric |
| `Reversals Not Covered by Buffer` (note: includes "by Buffer") | `reversals_not_covered` | numeric |
| `Registry Documents` | `registry_documents_url` | passthrough str (real URLs, verified 100% in pre-flight) |
| `Estimated Annual Emission Reductions` | `estimated_annual_reductions` | numeric (nullable; Verra+GS 100%, ACR/CAR 0% — asymmetric by design) |
| `First Year of Project (Vintage)` | `first_vintage_year_f2` | nullable int |

**1 derived column (computed in enrich):**

| Derived field | Definition | Restriction |
|---------------|------------|-------------|
| `operational_lag_years` | `(first_issuance_date − registration_date) / 365.25`, rounded to 1 decimal | **Verra + CAR only** (registry filter). Null for ACR/GS, null if either input date missing, null if negative. |

**Validation gates (script exits non-zero on any failure):**

1. Output row count must equal input (26,359) → fail otherwise
2. Output unique project_id count must equal input (5,821) → fail otherwise
3. None of the 24 pre-enrich columns missing, reordered, or value-changed → fail otherwise (assert equality on original columns; new columns appended only)
4. Per-registry `credits_issued` sum unchanged vs build baselines (Verra 1,477M / GS 472M / ACR 342M / CAR 248M) → fail otherwise
5. Join match rate ≥ 100% of pipeline pids (the 1 blank-registry pid is the only tolerated miss)
6. New-column sanity (coverage measured among File-2-matched rows):
   - `reduction_removal` non-null 100% among matched
   - `registry_documents_url` non-null 100% among matched
   - ≥ 1 non-null `operational_lag_years` for Verra AND for CAR

**Prints column-count diff** (23 → 33) **and the 4 registry sums before/after** for log verification.

### 3d. Pipeline Order

```
1. build_projects.py   (File 1 → projects_data.csv vintage-level rows, 24 cols)
2. fix_data.py         (aggregated/country_aggregated/project_counts CSVs)
3. enrich_projects.py  (File 2 left-join → projects_data.csv extended to 33 cols)
```

Order matters: enrich must come AFTER fix because fix reads `projects_data.csv` and would not consume the enriched columns. If aggregations ever need enrichment columns in the future, the order changes; for now this ordering is correct.

---

## 4. CSV File Inventory

### `public/data/projects_data.csv` (UPDATED Session 29: 23 → 33 columns)

- **Source:** `build_projects.py` + `enrich_projects.py`
- **Rows:** 26,359 (one per project × vintage year, 5,821 unique projects)
- **Schema:** 33 columns total
  - 23 original columns from build (registry, project_id, project_name, methodology, project_type_category, country, credits_issued, credits_retired, retirement_rate, vintage_year, registration_date, status, proponent, methodology_name, sector, scope, project_type, sdg_eligible, corsia_eligible, ccb_standards, documents_url, vintage_start, vintage_end)
  - 1 column added by build in Session 29: `first_issuance_date`
  - 9 columns added by enrich in Session 29: `reduction_removal, total_buffer_pool_deposits, buffer_credits_released, reversals_covered_buffer, reversals_not_covered, registry_documents_url, estimated_annual_reductions, first_vintage_year_f2, operational_lag_years`
- **Used by:** `src/hooks/useProjectsData.js` → `Projects.js` page only (as of Session 29; new columns not yet consumed by React — that's Step 23b-5)
- **Step 22b invariant:** All 23 original columns byte-for-byte unchanged. Aggregated CSVs derive from this file unchanged.
- **Note:** Includes 'Other' rows; Projects page applies its own EXCLUDED_CATEGORIES filter

### `public/aggregated_data.csv` (unchanged from Session 28)

- **Source:** `fix_data.py` output (rebuilt from `projects_data.csv` groupby; no raw Excel reads since Step 22b)
- **Rows:** ~1,107
- **Used by:** `useData.js` → filteredAgg → Overview, ProjectActivity, RegistryIntelligence, CountryExplorer

### `public/country_aggregated_data.csv` (unchanged from Session 28)

- **Source:** `fix_data.py` output
- **Rows:** ~4,200
- **Used by:** `useData.js` → filteredCountry → CountryExplorer, ProjectActivity (country drill-down)

### `public/project_counts.csv` (unchanged from Session 28)

- **Source:** `fix_data.py` output (Section E reads `projects_data.csv` directly; Step 22-pre eliminated `lookup_cat_e` divergence)
- **Rows:** ~125
- **Used by:** `useData.js` → projectCountByCategory, globalRetirementStats, registryStats

### `public/methodology_mapping.csv` (unchanged from Session 28)

- See Section 2b above

### `public/data/country_iso_map.csv` (unchanged)

- Maps country names to ISO 3166-1 alpha-2 codes
- Used by CountryExplorer.js for World Bank API calls

### `scripts/gs_methodology_overrides.csv` (added Session 28)

- 23-row CSV mapping blank-methodology GS projects to verified methodology codes
- Read by `build_projects.py` during GS build phase

---

## 5. React Data Layer (unchanged from Session 28, but consumes 23 of 33 columns)

### 5a. Global Filter State (`src/App.js`)

```javascript
const [selectedRegistry, setSelectedRegistry] = useState('all');   // 'all' | 'verra' | 'gold' | 'acr' | 'car'
const [selectedYearRange, setSelectedYearRange] = useState([1996, 2025]);
const [selectedActivity, setSelectedActivity] = useState('all');
```

All three are passed as props to every page component and to `useData()`.

### 5b. `src/hooks/useData.js`

Loads three CSVs on mount (`aggregated_data.csv`, `country_aggregated_data.csv`, `project_counts.csv`) via Papa.parse. All filtering is performed via `useMemo` hooks. Does NOT read `projects_data.csv` (that's `useProjectsData.js`).

**EXCLUDED_CATEGORIES filter:** Applied in filteredAgg, filteredCountry, and projectCountByCategory:
```javascript
export const EXCLUDED_CATEGORIES = ['No Methodology Provided', 'Unmatched', 'Other'];
```

### 5c. `src/hooks/useProjectsData.js`

**Loads `public/data/projects_data.csv`** independently from `useData.js`. As of Session 29, reads 23 of 33 columns (consumes original schema only; 10 new enrichment columns sit unused until Step 23b-5 surfaces them).

The Projects page has its own internal filter state and reads columns by name (not position), so the schema expansion in 23b-4 had no React-side impact.

### 5d. Client-Side Only

No backend API. All CSV data is loaded once at mount. All filtering, aggregation, and grouping is performed in the browser via `useMemo`. No server-side rendering.

---

## 6. Page-by-Page Data Connections

(Unchanged from Session 28 except as noted below — Step 23b-5 will modify ProjectDetailPanel to consume the new columns)

### Overview (`src/components/pages/Overview.js`)

- `totalCredits` — sum of all filteredAgg credits
- `creditsByRegistry` — pie/bar chart
- `creditsByGroup` — group-level breakdown
- `globalRetirementRate`, `globalCreditsRetired` — KPI cards
- `generatePulseSentence()` — dynamic headline text

### Project Activity (`src/components/pages/ProjectActivity.js`)

- `creditsByActivity` — primary bar chart
- `getActivityTrend(name)` — sparkline for selected activity
- `getActivityCountries(name)` — country drill-down map
- `projectCountByCategory` — project count overlaid on bars

### Registry Intelligence (`src/components/pages/RegistryIntelligence.js`)

- `registryStats` — per-registry KPI cards (issued, retired, rate, project count)
- `creditsByRegistry` — comparison charts
- `creditsByActivity` with `registryBreakdown` — stacked charts

### Projects (`src/components/pages/Projects.js`)

- Uses `useProjectsData` hook (independent of global filters)
- Loads `projects_data.csv` directly (33 columns post-23b-4, but reads only 23 currently)
- Has its own search, registry filter, activity filter, sort controls
- Applies EXCLUDED_CATEGORIES filter internally
- **Step 23b-5 will modify the side pane** (`ProjectDetailPanel.js`) to consume the new columns via tabbed UI

### Country Explorer (`src/components/pages/CountryExplorer.js`)

- `creditsByCountry` — choropleth map data
- `getCountryData(name)` — selected country detail
- World Bank CO₂ API — live fetch on country change
- `filteredCountry` — country-level vintage trend
- **Known issue:** Retirement Stats panel does NOT filter by `selectedRegistry` or `selectedYearRange` — Step 22h

### About (`src/components/pages/About.js`)

- Loads `methodology_mapping.csv` live via Papa.parse on mount
- Builds taxonomy accordion at runtime from GROUP_MAP + CSV rows
- No hardcoded category lists in JSX — fully data-driven
- **Updated Session 29:** New "Operational Lag" subsection under Methodology documenting the metric, registry coverage, the April 2020 Verra platform migration affecting ~40% of dated Verra registration_date values, and the "we don't adjust or impute" methodology stance.

---

## 7. Methodology Categorisation Logic (unchanged from Session 28)

### 7a. `GROUP_MAP` (`src/utils/formatters.js`)

```javascript
'Forest & Nature': [
  'Afforestation/Reforestation', 'Forest management',
  'Reforestation and ecosystem restoration', 'Rewilding'
],
'Energy': [
  'Bioenergy', 'Cleaner cooking', 'Electric vehicles', 'Energy storage',
  'Geothermal', 'Grid efficiency', 'Hydropower', 'Mixed renewables',
  'Public transit', 'Solar', 'Wind', 'Efficient appliances'
],
'Agriculture': ['Soil & Livestock', 'Rice cultivation'],
'Waste & Industrial': [
  'Biochar', 'Composting', 'Engineered Removals', 'Fossil gas leaks',
  'Heat recovery', 'Industrial efficiency', 'Landfill gas', 'Nitric acid',
  'Oil Field Gas Recovery', 'Waste management', 'Waste to energy',
  'Water purification', 'Wastewater treatment'
]
```

**Fallback:** `getGroup()` returns `'Waste & Industrial'` for any category not found in GROUP_MAP.

### 7b. `getGroup()` and `getGroupColor()` (unchanged)

---

## 8. GitHub Actions Pipeline (UPDATED Session 29)

**File:** `.github/workflows/update-data.yml`

**Triggers:**
- Push to `main` where `data/*.xlsx` changes
- `workflow_dispatch` (manual trigger)

**Note:** Workflow does NOT run on PRs or feature-branch pushes — to test pipeline changes on a branch, dispatch manually from the Actions UI after pushing.

**Steps:**

```
1. Checkout (with Git LFS enabled — lfs: true)
2. Set up Python 3.11
3. pip install -r requirements.txt
4. Find Excel files — explicit two-file detection (Session 29 change):
   f1=$(ls data/VROD-registry-files*.xlsx | head -1 | xargs basename)
   f2=$(ls data/Voluntary-Registry-Offsets*.xlsx | head -1 | xargs basename)
   echo "f1=$f1" >> $GITHUB_OUTPUT
   echo "f2=$f2" >> $GITHUB_OUTPUT
5. python scripts/build_projects.py --file "data/$f1"
6. python scripts/fix_data.py --file "data/$f1"
7. python scripts/enrich_projects.py (NEW Session 29) — reads VROD_DB_EXCEL_PATH env (= data/$f2)
8. git add public/*.csv public/data/*.csv
9. git commit -m "chore: update data pipeline outputs [skip ci]"
10. git push
```

**Important changes from Session 29:**
- Step 4 replaces the prior fragile `ls data/*.xlsx | head -1` with explicit per-file detection. Eliminates ambiguity now that `data/` holds two xlsx files.
- Step 7 is new: `enrich_projects.py` runs after `fix_data.py`.
- Both Excel files are LFS-tracked. The checkout step's `lfs: true` covers both.

**[skip ci] tag:** Prevents the auto-commit from triggering another GitHub Actions pipeline run.

**Failure handling:** Each script exits non-zero on validation gate failure; pipeline fails fast. No graceful degradation.

---

## 9. Known Issues & Tech Debt

### Hardcoded Values

| Location | Value | Issue |
|----------|-------|-------|
| `src/App.js:35,45` | `[1996, 2025]` | Year range initial state + reset — must update when new data added |
| `src/components/Topbar.js:23–27,60,108–120` | `1996`, `2025` | YEAR_PRESETS, validation bounds, HTML input min/max |
| `src/hooks/useData.js:105,125` | `d.year <= 2025` | Vintages after 2025 always pass through year filter |
| `src/components/pages/CountryExplorer.js:677` | `yr <= 2025` | Same year filter issue in country trend map |

### Data Quality Issues (Surfaced Session 29)

| Issue | Impact | Status |
|-------|--------|--------|
| **Verra registration_date contamination** | ~40% of dated Verra projects (816 of 2,017) carry `2020-04-06`, the registry's April 2020 platform migration sentinel rather than real registration dates. Smaller batches: 54 on 2020-06-04, 6 on 2020-04-07. Pre-existing data quirk in Berkeley VROD, not introduced by pipeline. | Documented in About page; refinement queued as Step 23b-4b |

### Dead Categories

Three categories in GROUP_MAP receive zero credits from the current dataset:

| Category | Group | Mapping rows | Credits (Feb 2026) | Notes |
|----------|-------|-------------|-------------------|-------|
| **Energy storage** | Energy | 0 | 0 | No methodology in `methodology_mapping.csv` maps to this category |
| **Engineered Removals** | Waste & Industrial | 1 (VM0049) + GS rescue (CO2-aggregate carbonation) | small but non-zero post-Session-28 | Active category after Session 28 GS methodology rescue |
| **Grid efficiency** | Energy | 2 | 0 | 2 mapping rows exist but no active projects |

### Filter Inconsistencies

- **Projects page disconnected from global filters.** `useProjectsData` loads `projects_data.csv` independently; changing registry/year/activity in Topbar has no effect on the Projects page.
- **Year filter post-2025 passthrough.** Condition `d.year > selectedYearRange[1] && d.year <= 2025` means any vintage year > 2025 ignores the slider upper bound.
- **Country Explorer Retirement Stats ignores registry/year filters.** Step 22h (narrowed) will fix.

### Unused or Deprecated Columns

- `project_counts.csv` has both `Project Count` and `project_count` columns — identical values, one is redundant.
- `country_aggregated_data.csv` `registry_breakdown` and `project_ids` are JSON strings embedded in CSV cells — fragile.
- **`documents_url` (in projects_data.csv)** — contains placeholder "View" strings for ACR/CAR rows. Superseded in Session 29 by `registry_documents_url` (real per-project URLs from File 2). React still reads neither column visually since the broken link was removed in Session 28 (23b-3). Step 23b-5 will consume `registry_documents_url`. The old `documents_url` column can be dropped in a future cleanup; not urgent.

### Pipeline Validation Gates Added (Session 29)

`scripts/enrich_projects.py` enforces 6 gates and exits non-zero on any failure. This is the first script in the pipeline to enforce explicit invariant checks; if it becomes a pattern, the discipline should extend to `build_projects.py` and `fix_data.py` in a future refactor.

### Tooling Notes

- **Fine-grained PAT needs `Workflows: Read and write` permission** to push changes to `.github/workflows/*.yml`. Classic PATs need `workflow` scope (a checkbox under the `repo` group). Worth noting in the CEEW handover SOP (Step 41).
- **Cross-env wrapper:** `npm run build:ci` runs `cross-env CI=true npm run build` for CI-strict React build verification on Windows/macOS/Linux. Added Session 28.

---

## 10. Deployment

- **Host:** Vercel
- **Domain:** carbonledger.pro
- **Build command:** `npm run build` (Create React App). Use `npm run build:ci` for CI-strict verification with warnings-as-errors.
- **Output directory:** `build/`
- **Environment variables:** None required for the React app. Pipeline scripts use `VROD_EXCEL_PATH` (File 1) and `VROD_DB_EXCEL_PATH` (File 2) when set; fall back to env-relative glob.
- **All CSV files** in `public/` and `public/data/` are served as static assets
- **No serverless functions** — pure static hosting
- **Continuous deployment:** Vercel auto-deploys on every push to `main` (except commits with `[skip ci]` — however Vercel does not honour `[skip ci]`; it deploys regardless. The `[skip ci]` tag only suppresses GitHub Actions re-runs.)
- **Branch previews:** Vercel auto-deploys every branch with a preview URL. Useful for verifying UI changes pre-merge.
- **Analytics live:** Vercel Web Analytics (country-level + page views) + Google Analytics GA4 (Measurement ID: G-V8ZBYHRBFW, city-level granularity). Tracking from 4 May 2026.

---

## Change Log

| Date | Updated By | Summary |
|------|------------|---------|
| 2026-04-04 | Claude Code | Initial auto-generated file (v22) |
| 2026-05-31 | Chat-assisted update (v24) | **Section 1:** total credits updated to 2.54B; pipeline now reads both VROD files. **Section 2:** File 2 path + sheet inventory added; methodology mapping row count updated to 445. **Section 3:** Three-script pipeline order documented; `enrich_projects.py` (NEW) full architecture; `first_issuance_date` derivation in build_projects.py; 6 validation gates. **Section 4:** projects_data.csv schema 23 → 33 columns documented column-by-column. **Section 6:** About page updated with Operational Lag subsection; Step 23b-5 noted as pending. **Section 8:** Workflow YAML two-file detection documented. **Section 9:** Verra April 2020 platform migration contamination documented; `documents_url` deprecation noted. **Section 10:** Vercel branch previews mentioned. |

*Update this file whenever pipeline logic, CSV schemas, or React data connections change.*
