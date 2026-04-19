# CarbonLedger Wiki — Index

> **LLM Agent:** Read this file at the start of every session to orient yourself.
> Format: `- [Title](path) — one-line hook (updated: YYYY-MM-DD)`

---

## Sources

Raw documents ingested into the wiki. These are read-only references.

- [ARCHITECTURE.md](sources/architecture-md.md) — full system architecture reference: pipeline, schemas, React layer, deployment (updated: 2026-04-18)

---

## Entities

Concrete project artifacts: files, scripts, hooks, components, APIs.

- [Data Pipeline](entities/data-pipeline.md) — build_projects.py + fix_data.py: inputs, outputs, lookup logic, known weaknesses (updated: 2026-04-18)
- [CSV Schemas](entities/csv-schemas.md) — all five CSV files: columns, row counts, producers, consumers (updated: 2026-04-18)
- [React Data Layer](entities/react-data-layer.md) — useData.js, useProjectsData.js, global filter state, World Bank API (updated: 2026-04-18)
- [Pages Overview](entities/pages-overview.md) — per-page data connections for all 5 pages + supporting panels (updated: 2026-04-18)
- [Deployment](entities/deployment.md) — Vercel config, GitHub Actions workflow, data refresh flow (updated: 2026-04-18)

---

## Concepts

Abstract ideas, algorithms, design decisions, patterns.

- [Methodology Categorisation](concepts/methodology-categorization.md) — how projects get their category: pipeline lookup, GROUP_MAP, dead categories, exclusions (updated: 2026-04-18)
- [Tech Debt & Known Issues](concepts/tech-debt.md) — hardcoded year values, filter bugs, About page drift, pipeline gaps (updated: 2026-04-18)

---

## Syntheses

Filed answers to queries, comparisons, analyses.

*(none yet — filed syntheses will appear here)*

---

## Quick Reference

| Topic | Go to |
|-------|-------|
| How does a project get its category? | [Methodology Categorisation](concepts/methodology-categorization.md) |
| What columns does aggregated_data.csv have? | [CSV Schemas](entities/csv-schemas.md#publicaggregated_datacsv) |
| Why is the Projects page ignoring my filter? | [Tech Debt](concepts/tech-debt.md#filter-inconsistencies) |
| How is data refreshed / deployed? | [Deployment](entities/deployment.md) |
| What does useData.js expose? | [React Data Layer](entities/react-data-layer.md#usedatajs--primary-hook) |
| What are the hardcoded year values? | [Tech Debt](concepts/tech-debt.md#hardcoded-year-values) |
