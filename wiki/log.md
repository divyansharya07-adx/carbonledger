# CarbonLedger Wiki — Operation Log

> Format: `## [YYYY-MM-DD] operation | Title`
> Append only — never edit past entries.

---

## [2026-06-07] query | Pass 3.5 — Retirement rate > 100% anomaly (filed as synthesis)

Read-only forensic on 10 projects with `retirement_rate > 100%`. Cross-checked all 10 against Berkeley File 2 `PROJECTS`: 10/10 match published issued at 0.00%, 9/10 match retired at 0.00% — the >100% is faithful inheritance of three Berkeley methodology characteristics: GS 'assigned'/ex-ante-PER credits counted in retirement tallies (GS2913/2951/3007/3039); ACR buffer-net issued vs gross retired (ACR212/272); Verra TVQ-dedup issued vs QI-summed retired (VCS144/67); GS440/ACR1005 within rounding tolerance. Hypotheses H1 (GS buffer substitution) and H2 (ACR ARB-transfer gap) rejected by data; H3 (Verra TVQ-vs-QI) confirmed. Lone divergence: GS3007 under-reports retired by 8,141 (5.21%) — `issued.merge(retired, how='left')` in build_projects.py drops retirement rows for vintages with zero issuance. Decision: faithful inheritance, no pipeline change; documented on About page + this synthesis. Note: the cited `VROD-Design-Calculations--2026-02.xlsx` is absent from the repo — formulas sourced from File 2 `Column Descriptions`/`READ FIRST` instead. Pages: `wiki/syntheses/retirement-over-100pct.md` (new), `wiki/index.md`.

## [2026-05-31] update | Step 23b-4 — pipeline enrichments via File 2 left-join (Architecture A)

Added `scripts/enrich_projects.py`, run after `build_projects.py` → `fix_data.py`. It left-joins 8 curated metadata columns from File 2 (`Voluntary-Registry-Offsets-Database--2026-02.xlsx` `PROJECTS` sheet) onto `projects_data.csv` by `project_id` (File 2 `Project ID` already prefixed → 100% match; 1 tolerated straggler `GS7511`). Also added `first_issuance_date` in `build_projects.py` (min real issuance date per project from File 1 issuance sheets; GS → `{min vintage}-01-01`) and derived `operational_lag_years` (first issuance − registration, **Verra/CAR only**, null where negative). Schema **23 → 33 columns**; original columns byte-for-byte unchanged. File 2 committed to `data/` via Git LFS; the GitHub Actions workflow now detects both xlsx by filename pattern and runs the enrich step (`build → fix → enrich`). The script enforces additive-only invariants (row count 26,359, unique pids 5,821, the 4 per-registry `credits_issued` sums, all original columns identical) and aborts the pipeline on any violation.

**Diagnostic finding (registration-date artifact):** `first_issuance_date` is genuine issuance data — cross-validated against File 2's "Credits issued by issuance year" block (e.g. VCS1477 → 2017, matching). The negative operational lags trace to a **pre-existing** Verra source-data artifact: 816 Verra projects (40.5% of dated) share `registration_date = 2020-04-06`, the registry's April-2020 platform-migration date, not the real registration. CAR registration dates are clean. Per decision, `operational_lag_years` is kept as-designed (null negatives) and the limitation is documented on the About page; we show the dates the registries publish and don't impute. **Deferred** to a follow-up (File 1 issuance-level, not a File 2 join): Article 6 Authorization, Corresponding Adjustment, `is_article_6_eligible`.

Files: `scripts/enrich_projects.py` (new), `scripts/build_projects.py`, `.github/workflows/update-data.yml`, `data/Voluntary-Registry-Offsets-Database--v2026-02.xlsx` (new, LFS), `public/data/projects_data.csv` (regenerated, 33 cols), `ARCHITECTURE.md`, `src/components/pages/About.js`, `wiki/entities/data-pipeline.md`, `wiki/entities/csv-schemas.md`, `wiki/index.md`. Plan: `.claude/plans/23b-4-pipeline-enrichments.md`.

## [2026-05-30] query | Step 23b-1b — openpyxl hyperlink-display-text audit

Read-only diagnostic across both VROD Excel files (36 sheets total). Method: `cell.hyperlink` scan + `data_only=False` formula detection + ZIP/XML rels-file inspection. Key findings: (1) Zero hyperlink-reading bugs in any pipeline-relevant column. (2) File 1 `Documents` column (ACR/CAR Projects) = plain text `"View"` — not a hyperlink at all; the original 23b-3 diagnosis of "openpyxl reads hyperlink display text" was incorrect in mechanism, but the fix (removing `href="View"`) was correct in effect. (3) File 1 `ARB Issuances & Retirements` → `Project Documentation`: real relationship hyperlinks at 97.4% (APX URLs), not used by pipeline; incidentally validates the ACR URL template in `registryUrls.js`. (4) File 2 PROJECTS: 2 isolated Verra relationship hyperlinks (~0.02% coverage), zero HYPERLINK formulas — standard `pd.read_excel` works for all 23b-4 target columns. (5) `Registry Documents` column header confirmed present in File 2 PROJECTS shared strings; value format (URL string vs. placeholder) needs verification before 23b-4. Net new silent bugs: 0. Report: `.claude/plans/step-23b-1-pipeline-temporal-charm.md`.

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
