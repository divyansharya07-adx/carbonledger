# CarbonLedger — Architecture Reference

> Last updated: 19 May 2026 (Session 23 — Step 22h + 22h-b). Update this file whenever pipeline logic, CSV schemas, or React data connections change.

---

## 1. Overview

CarbonLedger is a **static single-page React application** with no backend server. All data is pre-processed by a Python pipeline and committed as static CSV files. The frontend loads these CSVs at runtime and performs all filtering client-side.

- **Deployed at:** carbonledger.pro (Vercel)
- **Data refresh:** GitHub Actions workflow triggered on push to `main` when `data/*.xlsx` changes, or via `workflow_dispatch`
- **Total credits covered:** ~2.54 billion credits across Verra, Gold Standard, ACR, and CAR registries
- **Data source:** Berkeley Voluntary Registry Offsets Database (VROD), updated periodically

---

## 2. Data Sources

### 2a. Primary Excel File

**Location (local):** `E:\Claude\Claude_trial\VROD-registry-files--{YYYY-MM}.xlsx`

The VROD Excel workbook contains ~10 sheets. The pipeline uses:

| Sheet | Used By | Purpose |
|-------|---------|---------|
| Verra VCUS | `build_projects.py` | Verra project issuances (methodology, credits, vintage year, country) |
| GS Issuances | `build_projects.py` | Gold Standard issuances (project type, credits, vintage year) |
| ACR | `build_projects.py` | American Carbon Registry projects |
| CAR | `build_projects.py` | Climate Action Reserve projects |
| GS Projects | `build_projects.py` | Gold Standard project metadata (project name, country) |

### 2b. Methodology Mapping

**File:** `public/methodology_mapping.csv`

- 445 rows, no header in file (read with explicit column names in pipeline)
- Columns: `Methodology Code, Registry, Methodology Name, Project Type Category`
- Registry breakdown: Verra 283 · Gold Standard 82 · ACR 46 · CAR 32 · ART 2
- 31 unique categories — no blank/null/Other entries
- **Manually curated static file** — no auto-generation script
- First committed 2026-03-20; Agriculture → Soil & Livestock rename 2026-03-21

> **Note:** ~5 Gold Standard rows have methodology names containing commas. These are correctly double-quoted and parsed safely by pandas. Plain-text grep of column 4 will produce spurious fragments — reporting artefact only.

### 2c. World Bank CO₂ API

**Endpoint:** `https://api.worldbank.org/v2/country/{ISO2}/indicator/EN.GHG.CO2.MT.CE.AR5?format=json&date=1990:2024&per_page=50`

- Called **live** per country selection in `CountryExplorer.js`
- Returns annual CO₂ emissions in MtCO₂e for the selected country
- No caching; refetched on every country change

---

## 3. Python Pipeline

Two scripts run sequentially. **`build_projects.py` must complete before `fix_data.py` runs** — `fix_data.py` reads `projects_data.csv` in Section G.

### 3a. `scripts/build_projects.py`

**Output:** `public/data/projects_data.csv` (one row per project, 20 columns)

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

### 3b. `scripts/fix_data.py`

**Inputs:** `projects_data.csv`, `public/methodology_mapping.csv`, VROD Excel (for retirement data)
**Outputs:** `public/aggregated_data.csv`, `public/country_aggregated_data.csv`, `public/project_counts.csv` (+ timestamped backups)

**Sections:**

| Section | Purpose |
|---------|---------|
| A | Load and validate `projects_data.csv` |
| B | Build `aggregated_data.csv` (vintage × category × registry) |
| C | Build `country_aggregated_data.csv` (vintage × category × registry × country) |
| D | Build `project_counts.csv` (category × registry summary) |
| E | Project counts derived from `projects_data.csv` (no separate re-categorisation) |
| G | Reads `projects_data.csv` for country-level retirement data |
| Addition 2 | Per-(Registry, Country, Category) lifetime stats: `total_credits_retired`, `total_credits_remaining`, `retirement_rate` + per-country `registry_breakdown` JSON |
| Addition 2b | Per-(Registry, Country, Category, Vintage Year) vintage retirement stats: `vintage_credits_retired`, `vintage_retirement_rate` |
| Addition 2c | Per-(Registry, Country, Category, Vintage Year) project IDs: `project_ids` JSON array |

> **Note (Step 22h fix):** Prior to Session 23, Additions 2, 2b, and 2c grouped without the Category dimension. This caused retirement stats and project IDs to repeat across all category rows for the same country — producing impossible retirement rates (>100%) when sector/activity filters were applied. Fixed in Session 23 by adding `'category'` to all three groupby operations.

---

## 4. CSV File Inventory

### `public/data/projects_data.csv`

- **Source:** `build_projects.py` output
- **Rows:** ~9,600 (one per project × vintage year)
- **Key columns:** `registry, project_id, project_name, methodology, project_type_category, country, credits_issued, credits_retired, retirement_rate, vintage_year`
- **Used by:** `src/hooks/useProjectsData.js` → `Projects.js` page; also the single source of truth for `fix_data.py`
- **Note:** Includes 'Other' rows; Projects page applies its own EXCLUDED_CATEGORIES filter

### `public/aggregated_data.csv`

- **Source:** `fix_data.py` output
- **Rows:** ~1,107
- **Granularity:** Registry × Category × Vintage Year
- **Key columns:** `Registry, Project Type Category, Vintage Year, Total Credits Issued, total_credits_retired, retirement_rate`
- **Used by:** `useData.js` → filteredAgg → Overview, ProjectActivity, RegistryIntelligence, CountryExplorer
- **Note:** 'Other' rows present but excluded by EXCLUDED_CATEGORIES in useData.js

### `public/country_aggregated_data.csv`

- **Source:** `fix_data.py` output
- **Rows:** ~4,200
- **Granularity:** Registry × Country × Category × Vintage Year
- **Key columns:** `Registry, Country, Project Type Category, Vintage Year, Total Credits Issued, total_credits_retired, total_credits_remaining, retirement_rate, registry_breakdown (JSON), vintage_credits_retired, vintage_retirement_rate, project_ids (JSON array)`
- **Used by:** `useData.js` → filteredCountry → CountryExplorer, ProjectActivity (country drill-down)
- **Note (Step 22h):** `total_credits_retired`, `total_credits_remaining`, `retirement_rate` are now per-(Registry, Country, Category) — not per-country repeated. `vintage_credits_retired` is per-(Registry, Country, Category, Vintage Year). `project_ids` is per-(Registry, Country, Category, Vintage Year). `registry_breakdown` remains per-country (summary JSON blob).

### `public/project_counts.csv`

- **Source:** `fix_data.py` output
- **Rows:** ~125 (category × registry summary)
- **Key columns:** `Registry, Project Type Category, Vintage Year, Project Count, project_ids, total_credits_issued, total_credits_retired, total_credits_remaining, retirement_rate`
- **Used by:** `useData.js` → projectCountByCategory, globalRetirementStats, registryStats

### `public/methodology_mapping.csv`

- See Section 2b above

### `public/data/country_iso_map.csv`

- Maps country names to ISO 3166-1 alpha-2 codes
- Used by CountryExplorer.js for World Bank API calls

### `public/aggregated_data_backup_*.csv`, `project_counts_backup_*.csv`

- Timestamped backups generated by `fix_data.py` before overwriting
- Not read by any React component

---

## 5. React Data Layer

### 5a. Global Filter State (`src/App.js`)

```javascript
const [selectedRegistry, setSelectedRegistry] = useState('all');   // 'all' | 'verra' | 'gold' | 'acr' | 'car'
const [selectedYearRange, setSelectedYearRange] = useState([1996, 2025]);
const [selectedActivity, setSelectedActivity] = useState('all');   // 'all' | exact category name
const [selectedGroup, setSelectedGroup] = useState('all');         // 'all' | 'Forest & Nature' | 'Energy' | 'Agriculture' | 'Waste & Industrial'
const [sectorSetBy, setSectorSetBy] = useState('manual');          // 'manual' | 'auto' — tracks whether sector was set by user or auto-set by activity selection
```

**Filter cascade:** All five state variables are passed to `useData()`. `selectedRegistry`, `selectedYearRange`, `selectedGroup`, and `selectedActivity` are applied as filters in `filteredAgg` and `filteredCountry`. `selectedGroup` and `selectedActivity` are also applied in `globalRetirementRate`, `registryStats`, and `projectCountByCategory`.

**Props per Page:**

| Page | Props received |
|------|---------------|
| Overview | `data`, `selectedRegistry`, `setActivePage`, `selectedGroup`, `onReset`, `onCountryClick` |
| ProjectActivity | `data` (no filter props — inherits via pre-filtered `data.filteredAgg`) |
| RegistryIntelligence | `data`, `isDarkMode` (no filter props — inherits via pre-filtered `data.filteredAgg`) |
| Projects | `data`, `selectedRegistry`, `selectedYearRange`, `selectedGroup`, `selectedActivity` |
| CountryExplorer | `data`, `isDarkMode`, `initialCountry` (no filter props — inherits via pre-filtered `data.filteredCountry`) |
| Topbar | `selectedRegistry`, `setSelectedRegistry`, `yearRange`, `setYearRange`, `selectedGroup`, `setSelectedGroup`, `selectedActivity`, `setSelectedActivity`, `sectorSetBy`, `setSectorSetBy`, + export/reset/display props |

### 5b. `src/hooks/useData.js`

Loads three CSVs on mount (`aggregated_data.csv`, `country_aggregated_data.csv`, `project_counts.csv`) via Papa.parse. All filtering is performed via `useMemo` hooks.

**Hook signature:**
```javascript
const useData = (selectedRegistry, selectedYearRange, selectedActivity, selectedGroup) => { ... }
```

**filteredAgg filter chain:**
```
rawAgg (EXCLUDED_CATEGORIES already removed at parse time)
  → filter 1: year range
  → filter 2: registry
  → filter 3: group (getGroup(d.category) === selectedGroup)
  → filter 4: activity (d.category === selectedActivity)
  = filteredAgg
```

**filteredCountry filter chain:** Identical to filteredAgg.

**Returned properties:**

| Property | Type | Source |
|----------|------|--------|
| `loading` | bool | mount state |
| `error` | Error\|null | mount state |
| `dataMinYear`, `releaseYear` | number | from rawAgg |
| `totalCredits` | number | sum of filteredAgg.credits |
| `creditsByActivity` | array | filteredAgg grouped by category |
| `creditsByRegistry` | array | filteredAgg grouped by registry |
| `creditsByCountry` | array | filteredCountry grouped by country |
| `creditsByActivityAndRegistry` | array | alias for creditsByActivity |
| `creditsByCountryAndActivity` | object | map[country][category] = credits |
| `allActivities` | string[] | unique categories in filteredAgg |
| `allCountries` | string[] | unique countries in filteredCountry |
| `creditsByGroup` | object | map[group] = total credits |
| `filteredAgg` | array | rawAgg with all 4 filters applied |
| `filteredCountry` | array | rawCountry with all 4 filters applied |
| `getCountryData(name)` | function | returns { records, isGlobal } from filteredCountry |
| `getActivityCountries(name)` | function | returns array sorted by credits |
| `getActivityTrend(name)` | function | returns [{ year, credits }] sorted by year |
| `projectCountByCategory` | object | from project_counts.csv, filtered by registry + group + activity |
| `totalProjectCount` | number | sum of projectCountByCategory |
| `globalRetirementRate` | number | from project_counts.csv, filtered by registry + year + group + activity |
| `globalCreditsRetired` | number | from project_counts.csv |
| `registryStats` | object | map[registry] = { issued, retired, remaining, retirementRate, projectCount }, filtered by year + group + activity |

**EXCLUDED_CATEGORIES filter:** Applied at CSV parse time (before any useMemo runs).
```javascript
export const EXCLUDED_CATEGORIES = ['No Methodology Provided', 'Unmatched', 'Other'];
// defined in src/utils/formatters.js
```

### 5c. `src/hooks/useProjectsData.js`

**Separate hook** — loads `public/data/projects_data.csv` independently. The Projects page receives `selectedRegistry`, `selectedYearRange`, `selectedGroup`, and `selectedActivity` as props from App.js and applies them in its own `filteredProjects` useMemo.

### 5d. Client-Side Only

There is no backend API. All CSV data is loaded once at mount. All filtering, aggregation, and grouping is performed in the browser via `useMemo`. No server-side rendering.

---

## 6. Page-by-Page Data Connections

### Overview (`src/components/pages/Overview.js`)

- `totalCredits` — sum of all filteredAgg credits
- `creditsByRegistry` — pie/bar chart
- `creditsByGroup` — group-level breakdown
- `globalRetirementRate`, `globalCreditsRetired` — KPI cards
- `generatePulseSentence()` — dynamic headline text
- **Project Activity Intelligence panel:** registry legend in header row (right-aligned). No local group/activity filter chips — reads from globally-filtered `data.creditsByActivity`.

### Project Activity (`src/components/pages/ProjectActivity.js`)

- `creditsByActivity` — primary bar chart (sorted by credits) — already filtered by global group + activity
- `getActivityTrend(name)` — sparkline for selected activity
- `getActivityCountries(name)` — country drill-down map
- `projectCountByCategory` — project count overlaid on bars
- **No local filter state** — all filtering comes from Topbar via useData

### Registry Intelligence (`src/components/pages/RegistryIntelligence.js`)

- `registryStats` — per-registry KPI cards (issued, retired, rate, project count) — filtered by group + activity
- `creditsByRegistry` — comparison charts
- `creditsByActivity` with `registryBreakdown` — stacked charts

### Projects (`src/components/pages/Projects.js`)

- Uses `useProjectsData` hook to load `projects_data.csv`
- Receives `selectedRegistry`, `selectedYearRange`, `selectedGroup`, `selectedActivity` from App.js
- Applies all four global filters in `filteredProjects` useMemo
- Has additional local filters: search, CORSIA, SDG, sort controls
- Applies EXCLUDED_CATEGORIES filter internally

### Country Explorer (`src/components/pages/CountryExplorer.js`)

- `creditsByCountry` — choropleth map data (globally filtered)
- `getCountryData(name)` — selected country detail from filteredCountry
- World Bank CO₂ API — live fetch on country change
- `filteredCountry` — country-level vintage trend
- **Retirement Stats panel:** Computes RETIRED, REMAINING, RET. RATE by summing from filtered records (respects registry, year, group, and activity filters). Uses `vintageCreditsRetired` which is now per-(Registry, Country, Category, Vintage Year).
- **BY REGISTRY panel:** Project counts from `project_ids` JSON column — now per-category after pipeline fix.

### About (`src/components/pages/About.js`)

- Loads `methodology_mapping.csv` live via Papa.parse on mount
- Builds taxonomy accordion at runtime from GROUP_MAP + CSV rows
- No hardcoded category lists in JSX — fully data-driven

---

## 7. Methodology Categorisation Logic

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
'Agriculture': [
  'Soil & Livestock', 'Rice cultivation'
],
'Waste & Industrial': [
  'Biochar', 'Composting', 'Engineered Removals', 'Fossil gas leaks',
  'Heat recovery', 'Industrial efficiency', 'Landfill gas', 'Nitric acid',
  'Oil Field Gas Recovery', 'Waste management', 'Waste to energy',
  'Water purification', 'Wastewater treatment'
]
```

**GROUP_COLORS:**
```javascript
{
  'Forest & Nature': '#8cb73f',   // olive green
  'Energy':          '#029bd6',   // blue
  'Agriculture':     '#CCDF84',   // light yellow-green
  'Waste & Industrial': '#e85724' // orange-red
}
```

**Fallback:** `getGroup()` returns `'Waste & Industrial'` for any category not found in GROUP_MAP.

### 7b. `getGroup()` and `getGroupColor()`

```javascript
export const getGroup = (category) => {
  for (const [group, cats] of Object.entries(GROUP_MAP)) {
    if (cats.includes(category)) return group;
  }
  return 'Waste & Industrial';
};
export const getGroupColor = (category) => GROUP_COLORS[getGroup(category)] || '#e85724';
```

---

## 8. Topbar Filter Architecture (Step 22h + 22h-b)

### 8a. Registry Pills
5 pills (All, Verra, Gold Standard, ACR, CAR). Click sets `selectedRegistry`.

### 8b. Sector Dropdown
Dropdown pill with 5 options: All sectors, Forest & Nature, Energy, Agriculture, Waste & Industrial. Active state shows color dot + group color tint. Reset × button visible when active.

### 8c. Activity Dropdown
Dropdown pill with "All activities" + 31 categories grouped by sector with non-clickable section headers. Active state shows color dot matching parent sector color. Reset × button visible when active. When a sector is selected, only that sector's activities appear in the list.

### 8d. Sector ↔ Activity Smart Sync
The `sectorSetBy` state tracks whether the sector was set manually by the user or auto-set by an activity selection:

| Action | Sector | Activity | sectorSetBy |
|--------|--------|----------|-------------|
| User selects activity "Mixed renewables" | Auto-set to "Energy" | "Mixed renewables" | `'auto'` |
| User clears activity (was auto-set) | Resets to "All sectors" | "All activities" | `'manual'` |
| User clears activity (sector was manual) | Stays as-is | "All activities" | unchanged |
| User selects sector "Energy" | "Energy" | Resets to "All activities" | `'manual'` |
| User clears sector | "All sectors" | "All activities" | `'manual'` |
| User switches activity | Auto-set to new parent | New activity | `'auto'` |
| Global reset | "All sectors" | "All activities" | `'manual'` |

### 8e. Year Range
Dropdown with presets + custom inputs. Sets `selectedYearRange`.

### 8f. Only One Dropdown Open at a Time
Opening the sector dropdown closes the activity dropdown, and vice versa.

---

## 9. GitHub Actions Pipeline

**File:** `.github/workflows/update-data.yml`

**Triggers:**
- Push to `main` where `data/*.xlsx` changes
- `workflow_dispatch` (manual trigger)

**Steps:**

```
1. Checkout (with Git LFS enabled — lfs: true)
2. Set up Python 3.11
3. pip install -r requirements.txt
4. Detect Excel file: filename=$(ls data/*.xlsx | head -1 | xargs basename)
5. python scripts/build_projects.py --file "data/$filename"
6. python scripts/fix_data.py --file "data/$filename"
7. git config user.name / user.email
8. git add public/*.csv public/data/*.csv
9. git commit -m "chore: update data pipeline outputs [skip ci]"
10. git push
```

**[skip ci] tag:** Prevents the commit from triggering another GitHub Actions pipeline run.

**Excel detection note:** `ls data/*.xlsx | head -1` — if multiple Excel files exist in `data/`, only the first (alphabetically) is processed. The workflow does not validate that only one file exists.

**Failure handling:** No explicit error handling; pipeline fails silently if scripts exit non-zero. No validation/warning step for unmapped methodology codes.

---

## 10. Known Issues & Tech Debt

### Hardcoded Values

| Location | Value | Issue |
|----------|-------|-------|
| `src/App.js` | `[1996, 2025]` | Year range initial state + reset — must update when new data added |
| `src/components/Topbar.js` | `1996`, `2025` | YEAR_PRESETS, validation bounds, HTML input min/max |
| `src/hooks/useData.js` | `d.year <= 2025` | Vintages after 2025 always pass through year filter |
| `src/components/pages/CountryExplorer.js` | `yr <= 2025` | Same year filter issue in country trend map |
| `src/components/pages/About.js` | `"1996–2025"` | Stale date range in data coverage text |

### Dead Categories

Three categories in GROUP_MAP receive zero credits from the current dataset:

| Category | Group | Mapping rows | Credits (Feb 2026) | Notes |
|----------|-------|-------------|-------------------|-------|
| **Energy storage** | Energy | **0** | 0 | No methodology in `methodology_mapping.csv` maps to this category |
| **Engineered Removals** | Waste & Industrial | 1 (VM0049) + GS concrete carbonation | Active (GS rescue, Session 18) | |
| **Grid efficiency** | Energy | 2 | 0 | 2 mapping rows exist but no active projects generate credits |

### Year filter post-2025 passthrough
Condition `d.year > selectedYearRange[1] && d.year <= 2025` means any vintage year > 2025 ignores the slider upper bound.

### Unused or Duplicate Columns

- `project_counts.csv` has both `Project Count` and `project_count` columns — identical values, one is redundant.
- `country_aggregated_data.csv` `registry_breakdown` and `project_ids` are JSON strings embedded in CSV cells — fragile; grep-based inspection of these columns is unreliable.

### Residual `selectedActivity` in child components
KPIStrip, InsightCards, GlobalMap, and TopCountries still have `selectedActivity` in their function signatures but now receive `undefined` (props removed in Step 22h-b). They don't crash (fallback logic handles it) but the dead parameter should be cleaned up in Step 22g.

### No Pipeline Validation

Neither `build_projects.py` nor `fix_data.py` logs or flags methodology codes that appear in the raw Excel data but have no entry in `methodology_mapping.csv`. These silently fall through to 'Other'.

---

## 11. Deployment

- **Host:** Vercel
- **Domain:** carbonledger.pro
- **Build command:** `npm run build` (Create React App)
- **Output directory:** `build/`
- **Environment variables:** None required — `process.env.PUBLIC_URL` is standard CRA
- **All CSV files** in `public/` and `public/data/` are served as static assets
- **No serverless functions** — pure static hosting
- **Analytics:** Google Analytics GA4 (G-V8ZBYHRBFW) + Vercel Web Analytics — both installed and live since 4 May 2026
- **Continuous deployment:** Vercel auto-deploys on every push to `main` (except commits with `[skip ci]` — however Vercel does not honour `[skip ci]`; it deploys regardless. The `[skip ci]` tag only suppresses GitHub Actions re-runs.)

---

*Last updated: 19 May 2026 (Session 23). Update this file whenever pipeline logic, CSV schemas, or React data connections change.*
