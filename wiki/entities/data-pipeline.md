---
title: Data Pipeline — build_projects.py + fix_data.py
type: entity
tags: [pipeline, python, data, vrod, csv]
sources: [../sources/architecture-md.md]
updated: 2026-04-18
---

# Data Pipeline

Two Python scripts run sequentially. **`build_projects.py` must finish before `fix_data.py` starts** — `fix_data.py` reads `projects_data.csv` in Section G.

**Scripts:** `scripts/build_projects.py`, `scripts/fix_data.py`
**Triggered by:** GitHub Actions on push to `main` (if `data/*.xlsx` changes) or `workflow_dispatch`

---

## Stage 1: build_projects.py

**Input:** `data/VROD-registry-files--{YYYY-MM}.xlsx` (5 sheets)
**Output:** `public/data/projects_data.csv` (~9,600 rows, one per project)

**Key columns in output:** `registry, project_id, project_name, methodology, project_type_category, country, credits_issued, credits_retired, retirement_rate, vintage_year`

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

## Known Weaknesses

- No logging or warning for methodology codes that appear in Excel but are absent from `methodology_mapping.csv` — they silently fall through to 'Other'.
- If multiple `.xlsx` files exist in `data/`, only the first alphabetically is processed.
- No explicit error handling — pipeline fails silently on non-zero exit.

See also: [Tech Debt & Known Issues](../concepts/tech-debt.md)

---

## Related Pages

- [CSV Schemas](csv-schemas.md) — output file structures
- [Methodology Categorisation](../concepts/methodology-categorization.md) — how categories are assigned
- [Deployment](deployment.md) — how the pipeline is triggered in CI
