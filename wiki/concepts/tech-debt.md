---
title: Tech Debt & Known Issues
type: concept
tags: [tech-debt, bugs, hardcoded, known-issues]
sources: [../sources/architecture-md.md]
updated: 2026-04-18
---

# Tech Debt & Known Issues

Curated list of known problems, hardcoded values, and structural inconsistencies. Organised by category.

---

## Hardcoded Year Values

Year range `1996–2025` is hardcoded in multiple places. Must be updated manually every time a new VROD dataset extends the vintage range.

| File | Line(s) | Value | Issue |
|------|---------|-------|-------|
| `src/App.js` | 35, 45 | `[1996, 2025]` | Initial state + reset |
| `src/components/Topbar.js` | 23–27, 60, 108–120 | `1996`, `2025` | YEAR_PRESETS, validation bounds, HTML min/max |
| `src/hooks/useData.js` | 105, 125 | `d.year <= 2025` | Year filter passthrough bug |
| `src/components/pages/CountryExplorer.js` | 677 | `yr <= 2025` | Same passthrough bug |
| `src/components/pages/About.js` | 115 | `"1996–2025"` | Stale data coverage text |

---

## Filter Inconsistencies {#filter-inconsistencies}

### Projects page disconnected from global filters

`useProjectsData` loads `projects_data.csv` independently. Changing registry/year/activity in the Topbar has no effect on the Projects page. This is the intentional design (Projects has its own filter controls), but it's surprising to users who expect the Topbar to be global.

### Year filter post-2025 passthrough

Condition: `d.year > selectedYearRange[1] && d.year <= 2025`

This means any vintage year **after 2025** always passes through, regardless of the slider upper bound. Effect: if the VROD dataset ever includes 2026 vintages, they will appear in all charts regardless of the year filter. Affects both `useData.js` and `CountryExplorer.js`.

**Fix needed:** Change condition to `d.year > selectedYearRange[1]` (drop the `&& d.year <= 2025` guard) after confirming no current data has years > 2025.

---

## About Page Drift {#about-page}

The taxonomy accordion in About.js is **data-driven** (built from `methodology_mapping.csv` at runtime — correct). But surrounding prose is hardcoded and has drifted:

| Location | Hardcoded value | Actual value |
|----------|----------------|--------------|
| `About.js:137, 271` | "30 project activity categories" | 31 categories |
| `About.js:283` | "five cases" | Only 3 `<li>` elements exist — two are missing |

Last fixed: Step 22d (commit `ec730a9`). May drift again on future taxonomy changes.

---

## Duplicate Column

`project_counts.csv` has both `Project Count` and `project_count` columns with identical values. One is redundant. Harmless but confusing when inspecting the file.

---

## No Pipeline Validation

Neither `build_projects.py` nor `fix_data.py` warns when a methodology code appears in the VROD Excel but has no entry in `methodology_mapping.csv`. These silently fall through to 'Other'. A warning step would surface future unmapped methodologies before they reach production.

---

## Dead Categories

See [Methodology Categorisation](methodology-categorization.md#dead-categories) — three GROUP_MAP categories that receive zero credits.

---

## Multiple Excel Files

If `data/` contains more than one `.xlsx` file, only the first alphabetically is processed by GitHub Actions. No guard, no warning. See [Deployment](../entities/deployment.md#known-issues).

---

## Related Pages

- [Data Pipeline](../entities/data-pipeline.md) — pipeline weaknesses
- [React Data Layer](../entities/react-data-layer.md) — year filter quirk
- [Methodology Categorisation](methodology-categorization.md) — dead categories
