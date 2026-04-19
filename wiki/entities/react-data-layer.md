---
title: React Data Layer — Hooks, Filters, State
type: entity
tags: [react, hooks, state, filters, useData, useProjectsData]
sources: [../sources/architecture-md.md]
updated: 2026-04-18
---

# React Data Layer

CarbonLedger is a client-side-only React app. All data loading, filtering, and aggregation happens in the browser. No SSR, no API server.

---

## Global Filter State (App.js)

Three filters defined in `src/App.js` and passed as props to every page component and to `useData()`:

```javascript
const [selectedRegistry, setSelectedRegistry] = useState('all');
// values: 'all' | 'verra' | 'gold' | 'acr' | 'car'

const [selectedYearRange, setSelectedYearRange] = useState([1996, 2025]);
// [minYear, maxYear] — hardcoded initial values

const [selectedActivity, setSelectedActivity] = useState('all');
// 'all' | any category string from EXCLUDED_CATEGORIES-filtered data
```

**Important:** These filters do **not** affect the Projects page — `useProjectsData` is independent. See [Pages Overview](pages-overview.md#projects).

---

## useData.js — Primary Hook

**File:** `src/hooks/useData.js`
**Loads:** `aggregated_data.csv`, `country_aggregated_data.csv`, `project_counts.csv` via Papa.parse on mount.
**All filtering** is performed in `useMemo` hooks — re-runs on filter state changes.

### Exclusion Filter

```javascript
export const EXCLUDED_CATEGORIES = ['No Methodology Provided', 'Unmatched', 'Other'];
// defined in src/utils/formatters.js
```

Applied in: `filteredAgg`, `filteredCountry`, `projectCountByCategory`.

### Year Filter Quirk

Condition: `d.year > selectedYearRange[1] && d.year <= 2025`
Effect: any vintage year **after 2025** always passes through regardless of slider position. This is a bug — see [Tech Debt](../concepts/tech-debt.md#filter-inconsistencies).

### Exposed Properties

| Property | Type | Description |
|----------|------|-------------|
| `loading` | bool | True while CSVs are loading |
| `error` | Error\|null | Loading error state |
| `totalCredits` | number | Sum of filteredAgg credits |
| `creditsByActivity` | array | filteredAgg grouped by category |
| `creditsByRegistry` | array | filteredAgg grouped by registry |
| `creditsByCountry` | array | filteredCountry grouped by country |
| `creditsByActivityAndRegistry` | array | Alias for creditsByActivity |
| `creditsByCountryAndActivity` | object | map[country][category] = credits |
| `allActivities` | string[] | Unique categories in filteredAgg |
| `allCountries` | string[] | Unique countries in filteredCountry |
| `creditsByGroup` | object | map[group] = total credits |
| `filteredAgg` | array | rawAgg after all filters + exclusions |
| `filteredCountry` | array | rawCountry after all filters + exclusions |
| `getCountryData(name)` | function | Returns `{ records, isGlobal }` |
| `getActivityCountries(name)` | function | Array sorted by credits |
| `getActivityTrend(name)` | function | `[{ year, credits }]` sorted by year |
| `projectCountByCategory` | object | From project_counts.csv, filtered by selectedRegistry |
| `totalProjectCount` | number | Sum of projectCountByCategory values |
| `globalRetirementRate` | number | De-duped by registry from project_counts.csv |
| `globalCreditsRetired` | number | From project_counts.csv |
| `registryStats` | object | map[registry] = { issued, retired, remaining, retirementRate, projectCount } |

---

## useProjectsData.js — Projects-Only Hook

**File:** `src/hooks/useProjectsData.js`
**Loads:** `public/data/projects_data.csv` independently.
**Completely separate** from `useData.js` — ignores `selectedRegistry`, `selectedYearRange`, `selectedActivity` from App.js.
The Projects page manages its own internal filter state (search, registry, activity, sort).

---

## Component Tree (data flow summary)

```
App.js
  ├── Topbar.js          ← sets selectedRegistry, selectedYearRange, selectedActivity
  ├── Sidebar.js         ← navigation only
  └── [active page]
        ├── Overview.js          ← useData() output
        ├── ProjectActivity.js   ← useData() output
        ├── RegistryIntelligence.js ← useData() output
        ├── CountryExplorer.js   ← useData() + live World Bank CO₂ API
        ├── Projects.js          ← useProjectsData() (independent)
        └── About.js             ← loads methodology_mapping.csv independently
```

---

## Live API — World Bank CO₂

Called per country selection in CountryExplorer.js:
```
https://api.worldbank.org/v2/country/{ISO2}/indicator/EN.GHG.CO2.MT.CE.AR5?format=json&date=1990:2024&per_page=50
```
Returns annual CO₂ in MtCO₂e. No caching — refetched on every country change.

---

## Related Pages

- [CSV Schemas](csv-schemas.md) — what's loaded
- [Pages Overview](pages-overview.md) — which page uses which data
- [Methodology Categorisation](../concepts/methodology-categorization.md) — formatters.js
