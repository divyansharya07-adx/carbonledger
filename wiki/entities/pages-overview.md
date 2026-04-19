---
title: Pages Overview — Data Connections per Page
type: entity
tags: [react, pages, components, data]
sources: [../sources/architecture-md.md]
updated: 2026-04-18
---

# Pages Overview

Five main pages under `src/components/pages/`. All except Projects receive global filter state (`selectedRegistry`, `selectedYearRange`, `selectedActivity`) from App.js and consume `useData()`.

---

## Overview (`Overview.js`)

**Data consumed:**
- `totalCredits` — KPI card
- `creditsByRegistry` — pie/bar chart
- `creditsByGroup` — group-level breakdown
- `globalRetirementRate`, `globalCreditsRetired` — KPI cards
- `generatePulseSentence()` — dynamic headline text

---

## Project Activity (`ProjectActivity.js`)

**Data consumed:**
- `creditsByActivity` — primary bar chart, sorted by credits
- `getActivityTrend(name)` — sparkline for the selected activity
- `getActivityCountries(name)` — country drill-down map overlay
- `projectCountByCategory` — project count overlaid on bars

---

## Registry Intelligence (`RegistryIntelligence.js`)

**Data consumed:**
- `registryStats` — per-registry KPI cards (issued, retired, rate, project count)
- `creditsByRegistry` — comparison charts
- `creditsByActivity` with `registryBreakdown` — stacked charts

---

## Projects (`Projects.js`) {#projects}

**Data consumed:** `useProjectsData()` hook only — loads `public/data/projects_data.csv` directly.

**Isolation:** Completely disconnected from global filter state. Has its own internal controls:
- Search box
- Registry filter
- Activity filter
- Sort controls

Applies `EXCLUDED_CATEGORIES` filter internally (not via `useData.js`).

**Note:** This is a known inconsistency — changing the Topbar filters has no effect on what Projects displays. See [Tech Debt](../concepts/tech-debt.md#filter-inconsistencies).

---

## Country Explorer (`CountryExplorer.js`)

**Data consumed:**
- `creditsByCountry` — choropleth map data
- `getCountryData(name)` — selected country detail panel
- World Bank CO₂ API — live fetch on every country selection
- `filteredCountry` — country-level vintage trend

Has its own hardcoded year filter: `yr <= 2025` (same post-2025 passthrough bug as `useData.js`).

---

## About (`About.js`)

**Data consumed:** Loads `methodology_mapping.csv` live via Papa.parse on mount. Builds taxonomy accordion at runtime from `GROUP_MAP` + CSV rows — fully data-driven, no hardcoded category lists in JSX.

**Prose is hardcoded** and has drifted from actual data (category counts, year ranges). Must be updated manually when taxonomy or data range changes. See [Tech Debt](../concepts/tech-debt.md#about-page).

---

## Supporting Panels

Under `src/components/panels/`:

| Panel | Used by | Purpose |
|-------|---------|---------|
| `ActivityIntelligence.js` | ProjectActivity | Detailed activity breakdown |
| `GlobalMap.js` | CountryExplorer, ProjectActivity | Choropleth / bubble map |
| `InsightCards.js` | Overview | Contextual insight cards |
| `KPIStrip.js` | Overview | Top KPI strip |
| `ProjectDetailPanel.js` | Projects | Slide-out project detail |
| `ProjectsTable.js` | Projects | Sortable table |
| `TopCountries.js` | ProjectActivity | Country ranking list |

---

## Related Pages

- [React Data Layer](react-data-layer.md) — hooks and filter state
- [CSV Schemas](csv-schemas.md) — underlying data files
