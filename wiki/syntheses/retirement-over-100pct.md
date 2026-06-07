---
title: Retirement Rate > 100% Anomaly
type: synthesis
tags: [retirement, anomaly, berkeley-methodology, pipeline, vrod]
updated: 2026-06-07
---

# Retirement Rate > 100% Anomaly

Ten projects display `retirement_rate > 100%` (more credits retired than issued). A read-only cross-check (Pass 3.5) against Berkeley's File 2 `PROJECTS` sheet found **all 10 match Berkeley's published issued at 0.00%, and 9 of 10 match retired at 0.00%** — the anomaly is faithful inheritance of three documented Berkeley methodology characteristics, **not** a pipeline defect. The one exception, **GS3007**, *under*-reports retirement by 5.21% due to a left-join artifact (below). Decision: no pipeline change; documented on the About page and here.

---

## The 10 projects

| Project | Registry | Berkeley ret% | Our ret% | Cluster |
|---|---|--:|--:|---|
| GS2913 | Gold | 331.1% | 331.1% | GS A/R assigned |
| GS2951 | Gold | 161.2% | 161.2% | GS A/R assigned |
| GS3007 | Gold | 134.3% | **127.3%** | GS A/R assigned + merge artifact |
| ACR212 | ACR | 110.3% | 110.3% | ACR buffer-net |
| GS3039 | Gold | 109.9% | 109.9% | GS A/R assigned |
| ACR272 | ACR | 109.5% | 109.5% | ACR buffer-net |
| VCS144 | Verra | 106.4% | 106.4% | Verra TVQ-dedup |
| VCS67 | Verra | 101.2% | 101.2% | Verra TVQ-dedup |
| GS440 | Gold | 100.0% | 100.0% | rounding (+595) |
| ACR1005 | ACR | 100.0% | 100.0% | rounding (0) |

---

## Three Berkeley mechanisms

**1. Gold Standard A/R "assigned" credits** — GS2913, GS2951, GS3007, GS3039.
Issued counts **VER/CER only** (Berkeley excludes ex-ante *PERs* — planned emission reductions); retired **includes "assigned" credits**, i.e. future-sequestration credits from afforestation/reforestation projects. All-product-type issuance is several times the VER/CER figure (e.g. GS2913: 214,903 vs 48,801), so VER/CER retirements outrun VER/CER issuances. Berkeley: *"we include assigned credits in the retirement tallies."*

**2. ACR buffer-net vs gross** — ACR212, ACR272 (Improved Forest Management).
Issued = `Credits Issued to Project` (Total − buffer-pool deposits); retired = gross (all retirements). ACR212: Total 1,710,013 = to-project 1,387,888 + to-buffer 322,125; retired 1,531,480 sits above the buffer-net issued figure but below total issuance. Berkeley: *"issuance figures do not include buffer pool credits."*

**3. Verra TVQ-dedup vs QI** — VCS144, VCS67.
Issued = `Total Vintage Quantity` deduplicated on `(ID, Vintage Start, Vintage End, TVQ)`; retired = Σ `Quantity Issued` of retired serials. Berkeley counts the full vintage TVQ if *any* credit of that vintage was issued, so serial-level retirements can exceed it (VCS144: issued 1,499,246 < total serial 1,611,746).

**Rounding / precision** — GS440 (+595, < 1,000) and ACR1005 (exactly 0): no mechanism, within tolerance.

---

## The GS3007 merge artifact {#gs3007}

The four registry builders in `scripts/build_projects.py` join retirements onto issuances with:

```
vint = issued.merge(retired, on=['project_id', 'vintage_year'], how='left')
```

(approx. lines 255 / 342 / 434 / 545). Because the join is `how='left'` on **issued**, any retirement in a vintage with **zero issuance** is silently dropped. GS3007's 2021 vintage has issued = 0, retired = 8,141 → dropped → our retired 148,035 vs Berkeley 156,176 (127.3% vs 134.3%). **GS3007 is the only project materially affected**; the other nine have no retirement-only vintages. The artifact *under*-states retirement, so it does not cause the >100% anomaly — it slightly masks it.

---

## Decision

**Faithful inheritance — no pipeline change.** The >100% rates are Berkeley's own published values; Berkeley explicitly allows *"negative remaining values due to small discrepancies between … registry issuance, buffer pool, and retirement data."* The limitation is documented on the About page; this entry preserves the diagnostic trail for future maintainers. The GS3007 left-join behaviour is recorded as a known, low-priority pipeline note (a fix would raise GS3007 to Berkeley's 134.3%).

---

## References

- **Master Plan v34 — Pass 3.5** (Retirement > 100% Anomaly Diagnostic): full forensic trail — Step A Berkeley cross-check, Step B verbatim definitions, Step C implementation side-by-side, Step D hypothesis tests (H1 GS-buffer-substitution and H2 ACR-ARB-gap rejected; H3 Verra TVQ-vs-QI confirmed).
- **Berkeley VROD File 2** — `data/Voluntary-Registry-Offsets-Database--v2026-02.xlsx`, sheets `Column Descriptions` (Total Credits Issued / Retired / Remaining; PERs) and `READ FIRST`. Berkeley Carbon Trading Project, Voluntary Registry Offsets Database v2026-02.

## Related Pages

- [Data Pipeline](../entities/data-pipeline.md) — the `build_projects.py` retirement join
- [Tech Debt & Known Issues](../concepts/tech-debt.md) — pipeline notes
- [CSV Schemas](../entities/csv-schemas.md) — `retirement_rate`, `credits_retired`
