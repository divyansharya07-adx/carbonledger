---
title: Methodology Categorisation — How Projects Get Their Category
type: concept
tags: [methodology, categories, pipeline, formatters, group-map]
sources: [../sources/architecture-md.md]
updated: 2026-04-18
---

# Methodology Categorisation

Every project in CarbonLedger is assigned a **Project Type Category** (one of 31 values, or 'Other'). These categories are grouped into 4 top-level groups for display. The categorisation happens in two layers: the Python pipeline (assignment) and the React frontend (grouping).

---

## Layer 1 — Pipeline Assignment (build_projects.py)

### How lookup works

See [Data Pipeline](../entities/data-pipeline.md#methodology--category-lookup) for the full decision tree. Short summary:

- **Verra:** code-based lookup (first matching semicolon-delimited code wins)
- **ACR/CAR/GS:** name-based lookup
- **GS null methodology:** mapped via `_map_gold_project_type()` from Project Type string
- **No match anywhere:** → `'Other'`

### The lookup table

`public/methodology_mapping.csv` — 444 rows, manually curated. Maps (Registry, Methodology Code or Name) → Category. No auto-generation; changes require a human edit.

Registry breakdown: Verra 283 · GS 81 · ACR 46 · CAR 32 · ART 2

### Surgical overrides

`fix_data.py` Section F and Addition 4 apply hard-coded corrections for known lookup failures after the initial pipeline run. These exist because some methodology codes appear in the VROD Excel but have no entry in `methodology_mapping.csv`.

---

## Layer 2 — Frontend Grouping (formatters.js)

### GROUP_MAP

Defined in `src/utils/formatters.js`. Groups 31 categories into 4 display groups:

| Group | Categories |
|-------|-----------|
| **Forest & Nature** | Afforestation/Reforestation, Forest management, Reforestation and ecosystem restoration, Rewilding |
| **Energy** | Bioenergy, Cleaner cooking, Electric vehicles, Energy storage, Geothermal, Grid efficiency, Hydropower, Mixed renewables, Public transit, Solar, Wind, Efficient appliances |
| **Agriculture** | Soil & Livestock, Rice cultivation |
| **Waste & Industrial** | Biochar, Composting, Engineered Removals, Fossil gas leaks, Heat recovery, Industrial efficiency, Landfill gas, Nitric acid, Oil Field Gas Recovery, Waste management, Waste to energy, Water purification, Wastewater treatment |

**Fallback:** Any category not found in GROUP_MAP → `'Waste & Industrial'`.

### Helper functions

```javascript
getGroup(category)      // returns group name or 'Waste & Industrial'
getGroupColor(category) // returns hex colour for the group
```

---

## Dead Categories

Three categories in GROUP_MAP receive **zero credits** from the Feb 2026 dataset:

| Category | Group | Reason |
|----------|-------|--------|
| **Energy storage** | Energy | No row in `methodology_mapping.csv` maps to it — impossible to assign |
| **Engineered Removals** | Waste & Industrial | VM0049 mapped but no credit records exist yet |
| **Grid efficiency** | Energy | 2 mapping rows exist but no active projects |

Energy storage is permanently dead until the mapping CSV gains an entry. The others may activate with future data refreshes.

---

## Exclusion at Query Time

The frontend excludes these categories everywhere:
```javascript
EXCLUDED_CATEGORIES = ['No Methodology Provided', 'Unmatched', 'Other']
```
These are filtered out in `filteredAgg`, `filteredCountry`, and `projectCountByCategory` in `useData.js`. Projects page applies the same filter independently.

---

## Related Pages

- [Data Pipeline](../entities/data-pipeline.md) — how lookup_category() works
- [CSV Schemas](../entities/csv-schemas.md#publicmethodology_mappingcsv) — the mapping file
- [React Data Layer](../entities/react-data-layer.md) — EXCLUDED_CATEGORIES usage
