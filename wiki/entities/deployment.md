---
title: Deployment — Vercel + GitHub Actions Pipeline
type: entity
tags: [deployment, vercel, github-actions, ci, pipeline]
sources: [../sources/architecture-md.md]
updated: 2026-04-18
---

# Deployment

CarbonLedger is a static React app deployed on Vercel. No server, no serverless functions.

---

## Vercel

- **URL:** carbonledger.pro
- **Build command:** `npm run build` (Create React App)
- **Output directory:** `build/`
- **Continuous deployment:** Auto-deploys on every push to `main`
- **[skip ci] note:** Vercel ignores `[skip ci]` tags — it deploys regardless. The `[skip ci]` tag only suppresses GitHub Actions re-runs, not Vercel deploys.
- **Environment variables:** None required — `process.env.PUBLIC_URL` is standard CRA behaviour.

---

## GitHub Actions — Data Pipeline

**File:** `.github/workflows/update-data.yml`

**Triggers:**
- Push to `main` where `data/*.xlsx` changes
- `workflow_dispatch` (manual trigger)

**Steps:**

```
1. Checkout (Git LFS enabled: lfs: true)
2. Set up Python 3.11
3. pip install -r requirements.txt
4. Detect Excel: filename=$(ls data/*.xlsx | head -1 | xargs basename)
5. python scripts/build_projects.py --file "data/$filename"
6. python scripts/fix_data.py --file "data/$filename"
7. git config user.name / user.email
8. git add public/*.csv public/data/*.csv
9. git commit -m "chore: update data pipeline outputs [skip ci]"
10. git push
```

The `[skip ci]` tag in the commit message prevents GitHub Actions from re-triggering when it pushes the CSV updates back to `main`.

---

## Data Refresh Flow

```
New VROD Excel committed to data/ on main
    ↓ (GitHub Actions trigger)
build_projects.py → projects_data.csv
    ↓
fix_data.py → aggregated_data.csv, country_aggregated_data.csv, project_counts.csv
    ↓
CSVs committed back to main [skip ci]
    ↓
Vercel auto-deploys updated build (serves new CSVs as static assets)
```

---

## Known Issues

- **Multiple Excel files:** If `data/` contains more than one `.xlsx`, only the first alphabetically is processed. No validation.
- **Silent failures:** No explicit error handling in workflow — pipeline fails silently on non-zero exit.
- **No validation step:** No warning emitted for unmapped methodology codes.

See also: [Tech Debt](../concepts/tech-debt.md)

---

## Related Pages

- [Data Pipeline](data-pipeline.md) — what the pipeline does
- [CSV Schemas](csv-schemas.md) — files staged in step 8
