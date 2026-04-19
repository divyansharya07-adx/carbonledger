---
title: ARCHITECTURE.md — CarbonLedger Architecture Reference
type: source
tags: [architecture, pipeline, react, csv, deployment]
updated: 2026-04-18
---

# Source: ARCHITECTURE.md

**File:** `ARCHITECTURE.md` at project root
**Auto-generated:** 2026-04-04 by Claude Code from direct source inspection
**Scope:** Full system — data sources, Python pipeline, CSV schemas, React data layer, methodology categorisation, GitHub Actions, known issues, deployment

---

## Background

This document is the single most comprehensive technical reference in the repo. It was written by Claude Code after exhaustive source inspection in April 2026 and covers every layer of the system.

---

## Key Facts Extracted

### Data Sources
- **Primary:** VROD Excel workbook (`data/VROD-registry-files--{YYYY-MM}.xlsx`) — 5 sheets used: Verra VCUs, GS Issuances, ACR, CAR, GS Projects
- **Methodology map:** `public/methodology_mapping.csv` — 444 rows, manually curated, 31 categories, no auto-generation script
- **Live API:** World Bank CO₂ endpoint called per country selection in CountryExplorer; no caching

### Pipeline
- Two scripts run sequentially: `build_projects.py` → `fix_data.py`
- `build_projects.py` outputs `public/data/projects_data.csv` (~9,600 rows, one per project)
- `fix_data.py` reads `projects_data.csv` + VROD Excel for retirements, outputs three aggregated CSVs
- `fix_data.py` applies **surgical corrections** (Sections F, Addition 4) rather than a full rebuild — except Addition 4 which rebuilds Verra/GS rows entirely

### React Layer
- Global filter state lives in `App.js`: `selectedRegistry`, `selectedYearRange`, `selectedActivity`
- `useData.js` is the main hook — loads 3 CSVs, exposes 18+ memoised properties
- `useProjectsData.js` is a completely separate hook used only by the Projects page; it ignores global filters
- `EXCLUDED_CATEGORIES = ['No Methodology Provided', 'Unmatched', 'Other']` applied in `useData.js`

### Methodology Categorisation
- `GROUP_MAP` in `src/utils/formatters.js` organises 31 categories into 4 groups: Forest & Nature, Energy, Agriculture, Waste & Industrial
- `getGroup()` fallback: anything not in GROUP_MAP → `'Waste & Industrial'`

### Deployment
- Vercel, carbonledger.pro, auto-deploy on every push to `main`
- GitHub Actions pipeline: triggered on `data/*.xlsx` push or `workflow_dispatch`
- **[skip ci] does not suppress Vercel deploys** — Vercel ignores it

---

## Contradictions / Gaps Noted at Ingest

- None with existing wiki pages (first ingest).
- ARCHITECTURE.md Section 9 lists hardcoded year values (`1996`, `2025`) scattered across multiple files — these will drift as data refreshes.
- Three dead categories in GROUP_MAP (Energy storage, Engineered Removals, Grid efficiency) that receive zero credits from the Feb 2026 dataset.

---

## Pages Spawned From This Source

- [Data Pipeline](../entities/data-pipeline.md)
- [CSV Schemas](../entities/csv-schemas.md)
- [React Data Layer](../entities/react-data-layer.md)
- [Pages Overview](../entities/pages-overview.md)
- [Deployment](../entities/deployment.md)
- [Methodology Categorisation](../concepts/methodology-categorization.md)
- [Tech Debt & Known Issues](../concepts/tech-debt.md)
