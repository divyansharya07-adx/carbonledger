---
title: CSV File Schemas
type: entity
tags: [csv, schema, data, pipeline]
sources: [../sources/architecture-md.md]
updated: 2026-05-31
---

# CSV File Schemas

All CSVs in `public/` are static assets served directly by Vercel. The React app loads them via Papa.parse at mount time. No backend transforms them at request time.

---

## public/data/projects_data.csv

**Producer:** `build_projects.py` (24 cols) → `enrich_projects.py` (Step 23b-4; +9 cols = **33 total**)
**Consumer:** `useProjectsData.js` → Projects page only (independent of global filters)
**Rows:** 26,359 vintage-level rows (5,821 unique projects; one row per project × vintage year, project metadata broadcast across a project's rows)

Core columns:
| Column | Notes |
|--------|-------|
| `registry` | Verra \| Gold Standard \| ACR \| CAR |
| `project_id` | Registry-assigned ID (prefixed: VCS…/GS…/ACR…/CAR…) |
| `project_name` | Human-readable name |
| `methodology` | Raw methodology string (may be semicolon-delimited for Verra) |
| `category` | Derived category (31 possible values + 'Other') |
| `country` | Project host country |
| `credits_issued` | Credits issued (vintage-row level) |
| `credits_retired` | Credits retired (vintage-row level) |
| `retirement_rate` | `credits_retired / credits_issued` |
| `vintage_year` | Year of vintage |
| `first_issuance_date` | Min real issuance date per project (23b-4; GS falls back to `{min vintage}-01-01`) |

23b-4 metadata columns (File 2 left-join):
| Column | Notes |
|--------|-------|
| `reduction_removal` | Berkeley 4-class: Reduction / Mixed / Impermanent Removal / Long-Duration Removal |
| `total_buffer_pool_deposits`, `buffer_credits_released`, `reversals_covered_buffer`, `reversals_not_covered` | Buffer-pool integrity fields (credit counts; mostly 0 outside forestry) |
| `registry_documents_url` | Real registry project-page URL (100% coverage; supersedes legacy `documents_url` = "View") |
| `estimated_annual_reductions` | Verra + GS only |
| `first_vintage_year_f2` | Berkeley's first-vintage-year claim |
| `operational_lag_years` | First issuance − registration, in years. **Verra/CAR only**; null where negative (mainly Verra 2020 migration reg dates) |

Includes 'Other' rows; Projects page applies its own `EXCLUDED_CATEGORIES` filter internally.

---

## public/aggregated_data.csv

**Producer:** `fix_data.py`
**Consumer:** `useData.js` → filteredAgg → Overview, ProjectActivity, RegistryIntelligence, CountryExplorer
**Rows:** ~1,107

Key columns:
| Column | Notes |
|--------|-------|
| `Registry` | Same 4 registries |
| `Project Type Category` | One of 31 categories |
| `Vintage Year` | Year |
| `Total Credits Issued` | Aggregate for this (registry, category, year) combination |
| `total_credits_retired` | Aggregate retirements |
| `retirement_rate` | Fraction retired |

'Other' rows present but excluded by `EXCLUDED_CATEGORIES` in `useData.js`.

---

## public/country_aggregated_data.csv

**Producer:** `fix_data.py`
**Consumer:** `useData.js` → filteredCountry → CountryExplorer, ProjectActivity (country drill-down)
**Rows:** ~4,200

Key columns:
| Column | Notes |
|--------|-------|
| `Registry` | |
| `Country` | Project host country |
| `Project Type Category` | |
| `Vintage Year` | |
| `Total Credits Issued` | |
| `total_credits_retired` | |
| `total_credits_remaining` | |
| `retirement_rate` | |
| `registry_breakdown` | JSON string — per-registry credit breakdown |
| `vintage_credits_retired` | |
| `vintage_retirement_rate` | |
| `project_ids` | JSON array of project IDs |

**Caution:** `registry_breakdown` and `project_ids` are JSON-encoded strings embedded in CSV cells. Grep-based inspection will produce spurious fragments.

---

## public/project_counts.csv

**Producer:** `fix_data.py`
**Consumer:** `useData.js` → `projectCountByCategory`, `globalRetirementStats`, `registryStats`
**Rows:** ~125 (category × registry summary)

Key columns: `Registry`, `Project Type Category`, `Project Count`, `project_count` (duplicate of `Project Count` — redundant column, see [Tech Debt](../concepts/tech-debt.md)), `total_credits_issued`, `total_credits_retired`, `total_credits_remaining`, `retirement_rate`

---

## public/methodology_mapping.csv

**Producer:** Manually curated (no auto-generation script)
**Consumer:** `fix_data.py` (lookup), `About.js` (live Papa.parse for taxonomy accordion)
**Rows:** 444 (no header row — pipeline reads with explicit column names)

Columns: `Methodology Code`, `Registry`, `Methodology Name`, `Project Type Category`

Registry breakdown: Verra 283 · Gold Standard 81 · ACR 46 · CAR 32 · ART 2
Categories: 31 unique — no blank/null/Other entries

**Note:** ~5 Gold Standard rows have methodology names containing commas. Correctly double-quoted; safe for pandas. Plain-text grep of column 4 will produce spurious fragments.

First committed: 2026-03-20. Agriculture → Soil & Livestock rename: 2026-03-21.

---

## public/data/country_iso_map.csv

Maps country names → ISO 3166-1 alpha-2 codes. Used by CountryExplorer.js for World Bank API calls.

---

## Backup Files

`aggregated_data_backup_*.csv`, `project_counts_backup_*.csv` — timestamped backups generated by `fix_data.py` before overwriting. Not read by any React component.

---

## Related Pages

- [Data Pipeline](data-pipeline.md) — how these files are produced
- [React Data Layer](react-data-layer.md) — how these files are consumed
