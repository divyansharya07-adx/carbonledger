# CarbonLedger Wiki — Operation Log

> Format: `## [YYYY-MM-DD] operation | Title`
> Append only — never edit past entries.

---

## [2026-05-30] tooling | build:ci script

Added `npm run build:ci` script using `cross-env` to run the CRA build with `CI=true` cross-platform. Removes the `$env:CI = "true"; npm run build` PowerShell ceremony from local pre-push verification. Future CEEW engineer can run `npm run build:ci` on Windows, macOS, or Linux identically. Files: `package.json`, `package-lock.json` (cross-env install).

## [2026-05-30] update | Step 23b-3 — real registry URLs + fix hard-coded GS SDG + audit documents_url

Three fixes in one commit. (1) Replaced generic registry homepage links in `ProjectDetailPanel.js` with per-project URLs computed from `project_id` via new `src/utils/registryUrls.js` utility. Templates: Verra `/app/projectDetail/VCS/{id}`, GS `?q={id}`, CAR/ACR APX `prjView.asp?id1={id}`. (2) Fixed `build_projects.py` line 442: Gold Standard `sdg_eligible` was hard-coded `True` for all 4027 projects; now reads the real `Sustainable Development Goals` column (comma-separated SDG numbers). The 3 null-SDG projects have no issuances so the CSV output is identical — fix is correct but observable only via future GS projects added to the registry. (3) Removed the broken `documents_url`-based "View on registry" link: ACR/CAR `documents_url` = `"View"` (openpyxl reads hyperlink display text, not URL) → `href="View"` was a silent broken link. Verra/GS had `null`. Footer now shows only the computed per-project link. Files modified: `scripts/build_projects.py`, `src/components/panels/ProjectDetailPanel.js`, `src/utils/registryUrls.js` (new).

## [2026-05-30] update | Step 23b-2 — strip time component from dates in Projects side pane

Display-layer fix: date fields in the Projects page side pane (`ProjectDetailPanel.js`) rendered with `00:00:00` time suffix (source-origin from VROD Excel datetime-at-midnight cells). Added `formatDateOnly` utility to `src/utils/formatters.js` — strips time component, handles null/nan strings → `"—"`. Applied to `registration_date` and both `crediting_period` bounds; crediting period falls back to `"—"` if either bound is missing (per diagnostic: CAR/GS have no crediting period dates). No pipeline or CSV changes. Files: `src/utils/formatters.js`, `src/components/panels/ProjectDetailPanel.js`.

## [2026-05-30] query | Step 23b-1 pipeline data diagnostic (Projects deep-research)
Read-only inventory of the two VROD Excel files against the 14 deep-research field categories for the upcoming Projects-page expansion. Key findings: File 2 (`Voluntary-Registry-Offsets-Database--v2026-02.xlsx`) `PROJECTS` sheet is an **unused unified per-project superset** — `Reduction / Removal` and `Registry Documents` (real registry URLs) are 100% covered for all registries; registration date is absent for ACR/Gold; Gold `Issuance Date` is a scrape timestamp (not real issuance); pipeline hard-codes Gold `sdg_eligible=True` despite a real `Sustainable Development Goals` column existing. Recommended 23b architecture: left-join selected File 2 columns onto the File-1-derived pipeline by `project_id`. Report: `.claude/plans/23b-1-pipeline-diagnostic.md`. No source files modified.

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
