---
title: Data Pipeline — build_projects.py + fix_data.py + enrich_projects.py
type: entity
tags: [pipeline, python, data, vrod, csv]
sources: [../sources/architecture-md.md]
updated: 2026-05-31
---

# Data Pipeline

Three Python scripts run sequentially: **`build_projects.py` → `fix_data.py` → `enrich_projects.py`**. `build_projects.py` must finish before `fix_data.py` starts (`fix_data.py` reads `projects_data.csv` in Section G). `enrich_projects.py` (Step 23b-4) runs last, left-joining File 2 metadata onto `projects_data.csv` additively.

**Scripts:** `scripts/build_projects.py`, `scripts/fix_data.py`, `scripts/enrich_projects.py`
**Triggered by:** GitHub Actions on push to `main` (if `data/*.xlsx` changes) or `workflow_dispatch`

---

## Stage 1: build_projects.py

**Input:** `data/VROD-registry-files--{YYYY-MM}.xlsx` (File 1; via `VROD_EXCEL_PATH`)
**Output:** `public/data/projects_data.csv` (vintage-level: 26,359 rows / 5,821 projects; **24 columns** incl. `first_issuance_date` added in 23b-4)

**Key columns in output:** `registry, project_id, project_name, methodology, category, country, credits_issued, credits_retired, retirement_rate, vintage_year, first_issuance_date`

### Methodology → Category lookup

The core function is `lookup_category(registry, methodology, verra_by_code, name_lookup, project_type)`:

```
1. Null/empty methodology:
   - Gold Standard → _map_gold_project_type(project_type)
   - Others → 'Other'
2. Verra:
   - Split methodology by ';', check each code against verra_by_code dict
   - First matching code wins
   - No match → 'Other'
3. ACR / CAR / Gold Standard:
   - Direct name lookup in name_lookup[(registry, methodology)]
   - CAR has additional substring fallback
   - No match → 'Other'
```

`build_category_lookup()` keys:
- Verra rows → keyed by `Methodology Code` (code-based)
- All others → keyed by `Methodology Name` (name-based)

### Gold Standard null-methodology fallback

`_map_gold_project_type(project_type)` maps GS `Project Type` strings to categories when methodology is absent:

| Pattern | Category |
|---------|----------|
| `energy efficiency*` | Efficient appliances |
| `wind` | Wind |
| `biogas*`, `biomass*`, `biofuel*` | Bioenergy |
| `a/r`, `afforestation*` | Afforestation/Reforestation |
| `solar*` | Solar |
| `hydro*` | Hydropower |
| `geothermal` | Geothermal |
| `cookstoves*`, `clean cooking*` | Cleaner cooking |
| all others | None → 'Other' |

---

## Stage 2: fix_data.py

**Inputs:** `projects_data.csv`, `public/methodology_mapping.csv`, VROD Excel (for retirement data)
**Outputs:** `public/aggregated_data.csv`, `public/country_aggregated_data.csv`, `public/project_counts.csv` (+ timestamped backups)

### Sections

| Section | Purpose |
|---------|---------|
| A | Load and validate `projects_data.csv` |
| B | Build `aggregated_data.csv` (vintage × category × registry) |
| C | Build `country_aggregated_data.csv` (vintage × category × registry × country) |
| D | Build `project_counts.csv` (category × registry summary) |
| E | `lookup_cat_e()` — re-categorisation returning `None` on failure (not 'Other') |
| F | Surgical corrections to edge cases in existing CSVs |
| G | Reads `projects_data.csv` for country-level retirement data |
| Addition 4 | **Full rebuild** of Verra/GS rows in all three CSVs using methodology-first logic |

**Design note:** `fix_data.py` applies surgical corrections to existing aggregated CSVs — it does not re-categorise from scratch. Only Addition 4 fully rebuilds Verra/GS rows. This is deliberate: registry-specific edge cases are handled in targeted sections rather than a general pipeline.

---

## Stage 3: enrich_projects.py (Step 23b-4)

**Input:** `projects_data.csv` (build output) + File 2 `Voluntary-Registry-Offsets-Database--{YYYY-MM}.xlsx` `PROJECTS` sheet (via `VROD_DB_EXCEL_PATH`)
**Output:** `public/data/projects_data.csv` overwritten — original columns unchanged, **9 columns appended** (→ 33 total)

Left-joins curated File 2 metadata onto the pipeline by `project_id` (File 2 `Project ID` is already prefixed `VCS…/GS…/ACR…/CAR…`; 100% match against pipeline pids, 1 tolerated straggler `GS7511`).

**Appended columns:** `reduction_removal`, `total_buffer_pool_deposits`, `buffer_credits_released`, `reversals_covered_buffer`, `reversals_not_covered`, `registry_documents_url`, `estimated_annual_reductions`, `first_vintage_year_f2`, and derived `operational_lag_years` (first issuance − registration, in years; **Verra/CAR only**; null where negative — mainly Verra projects whose `registration_date` is the registry's April-2020 platform-migration date, 816 of them sharing `2020-04-06`).

**Additive-only invariant gates** abort the pipeline (`sys.exit(1)`) on any violation: row count (26,359), unique `project_id` (5,821), all original columns byte-identical, and the 4 per-registry `credits_issued` sums unchanged. **Deferred** to a follow-up (File 1 issuance-level, not a File 2 join): Article 6 Authorization, Corresponding Adjustment, `is_article_6_eligible`.

---

## Known Weaknesses

- No logging or warning for methodology codes that appear in Excel but are absent from `methodology_mapping.csv` — they silently fall through to 'Other'.
- Two source xlsx now live in `data/`; the workflow disambiguates them by filename pattern (`VROD-registry-files*` = File 1, `Voluntary-Registry-Offsets*` = File 2) rather than `ls | head -1`.
- No explicit error handling — pipeline fails silently on non-zero exit.

See also: [Tech Debt & Known Issues](../concepts/tech-debt.md)

---

## Related Pages

- [CSV Schemas](csv-schemas.md) — output file structures
- [Methodology Categorisation](../concepts/methodology-categorization.md) — how categories are assigned
- [Deployment](deployment.md) — how the pipeline is triggered in CI
