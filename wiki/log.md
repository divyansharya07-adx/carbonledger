# CarbonLedger Wiki — Operation Log

> Format: `## [YYYY-MM-DD] operation | Title`
> Append only — never edit past entries.

---

## [2026-05-19] update | Fix project_ids category scoping in fix_data.py

Bug: `project_ids` column in `country_aggregated_data.csv` was grouped by `(Registry, country, vintage_year)` only, causing all project IDs for a registry+country to appear on every category row. India+GS+Electric vehicles showed 112 IDs; after fix it correctly shows 1 (`GS4597`).

Fix: ADDITION 2c in `scripts/fix_data.py` — groupby changed to include `category` (4-tuple key). CSV regenerated. Pages updated: `wiki/concepts/tech-debt.md`.

---

## [2026-04-18] setup | Wiki system initialised

Created full wiki system from scratch. Schema written to `CLAUDE.md` at project root. First ingest of `ARCHITECTURE.md` produced 7 pages.

Pages created:
- `wiki/sources/architecture-md.md`
- `wiki/entities/data-pipeline.md`
- `wiki/entities/csv-schemas.md`
- `wiki/entities/react-data-layer.md`
- `wiki/entities/pages-overview.md`
- `wiki/entities/deployment.md`
- `wiki/concepts/methodology-categorization.md`
- `wiki/concepts/tech-debt.md`
