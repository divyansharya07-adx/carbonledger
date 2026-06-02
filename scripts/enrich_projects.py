"""
enrich_projects.py — CarbonLedger Step 23b-4 (Architecture A)

Runs AFTER build_projects.py and fix_data.py. Left-joins curated project-level
metadata from File 2 (the Berkeley "Voluntary Registry Offsets Database" PROJECTS
sheet) onto public/data/projects_data.csv by project_id, then writes the enriched
CSV back in place.

ADDITIVE ONLY. It appends new columns; it never modifies an existing column,
never adds/drops a row, and never touches vintage-level credit math (Step 22b
single-source-of-truth invariants). The script self-enforces these invariants and
exits non-zero — failing the pipeline — if any is violated.

  File 1 (VROD-registry-files…xlsx)  -> source of truth for credit math (build/fix)
  File 2 (Voluntary-Registry-Offsets…xlsx) -> source of truth for project metadata

Inputs:
  public/data/projects_data.csv     (left side; produced by build_projects.py)
  File 2 PROJECTS sheet             (right side; via VROD_DB_EXCEL_PATH)

Output:
  public/data/projects_data.csv     (overwritten: 25 original cols + 9 new)

Usage:
  python scripts/enrich_projects.py
Requires: pandas, openpyxl
"""

import glob
import os
import re
import sys

import pandas as pd

CSV = os.environ.get("OUTPUT_CSV", "public/data/projects_data.csv")

# Header row 4 in the workbook -> 0-indexed header=3.
F2_SHEET = "PROJECTS"
F2_HEADER = 3

# Whitespace-normalized File 2 header  ->  destination snake_case column.
# Normalization (collapse runs of whitespace, lower, strip) is what lets us match
# 'Total Buffer \nPool Deposits' (embedded newline) without hard-coding the "\n".
F2_TARGETS = {
    "reduction / removal":                  "reduction_removal",
    "total buffer pool deposits":           "total_buffer_pool_deposits",
    "buffer credits released to project":   "buffer_credits_released",
    "reversals covered by buffer pool":     "reversals_covered_buffer",
    "reversals not covered by buffer":      "reversals_not_covered",
    "registry documents":                   "registry_documents_url",
    "estimated annual emission reductions": "estimated_annual_reductions",
    "first year of project (vintage)":      "first_vintage_year_f2",
}
# Destination order (after the original CSV columns).
NEW_F2_COLS = [
    "reduction_removal", "total_buffer_pool_deposits", "buffer_credits_released",
    "reversals_covered_buffer", "reversals_not_covered", "registry_documents_url",
    "estimated_annual_reductions", "first_vintage_year_f2",
]
# Integer-valued joined columns (credit counts / a year) -> nullable Int64 so they
# serialise without a ".0" and missing stays an empty cell.
INT_COLS = [
    "total_buffer_pool_deposits", "buffer_credits_released",
    "reversals_covered_buffer", "reversals_not_covered",
    "estimated_annual_reductions", "first_vintage_year_f2",
]
STR_COLS = ["reduction_removal", "registry_documents_url"]

LAG_REGISTRIES = ("Verra", "CAR")  # only registries with a real registration_date


def _norm(s):
    return re.sub(r"\s+", " ", str(s)).strip().lower()


def resolve_file2():
    p = os.environ.get("VROD_DB_EXCEL_PATH")
    if p and os.path.exists(p):
        return p
    hits = sorted(glob.glob("data/Voluntary-Registry-Offsets*.xlsx"))
    if hits:
        return hits[0]
    fallback = r"E:\Claude\Claude_trial\Voluntary-Registry-Offsets-Database--v2026-02.xlsx"
    if os.path.exists(fallback):
        return fallback
    sys.exit("Error: File 2 not found. Set VROD_DB_EXCEL_PATH or place "
             "Voluntary-Registry-Offsets*.xlsx in data/.")


def fail(msg):
    print(f"\n[enrich] INVARIANT VIOLATION: {msg}")
    sys.exit(1)


def main():
    if not os.path.exists(CSV):
        sys.exit(f"Error: {CSV} not found. Run build_projects.py first.")

    # --- Left side: the pipeline output. dtype=str keeps existing columns
    #     byte-for-byte on the round-trip (we never alter them). ---
    proj = pd.read_csv(CSV, dtype=str)
    ORIG_COLS = list(proj.columns)
    n_rows_in = len(proj)
    n_pids_in = proj["project_id"].nunique()
    issued_in = pd.to_numeric(proj["credits_issued"], errors="coerce")
    sums_in = issued_in.groupby(proj["registry"]).sum()
    print(f"[enrich] input: {n_rows_in} rows, {n_pids_in} unique project_id, "
          f"{len(ORIG_COLS)} columns")

    # --- Right side: File 2 PROJECTS ---
    f2_path = resolve_file2()
    print(f"[enrich] File 2: {f2_path}")
    f2 = pd.read_excel(f2_path, sheet_name=F2_SHEET, header=F2_HEADER, engine="openpyxl")

    norm_to_actual = {_norm(c): c for c in f2.columns}
    pid_actual = norm_to_actual.get("project id")
    if pid_actual is None:
        fail("File 2 PROJECTS has no 'Project ID' column.")

    missing = [n for n in F2_TARGETS if n not in norm_to_actual]
    if missing:
        fail(f"File 2 PROJECTS is missing expected columns: {missing}")

    rename = {norm_to_actual[n]: dest for n, dest in F2_TARGETS.items()}
    keep = [pid_actual] + list(rename)
    f2_sel = f2[keep].rename(columns={**rename, pid_actual: "project_id"})
    f2_sel["project_id"] = f2_sel["project_id"].astype(str).str.strip()
    f2_sel = f2_sel.dropna(subset=["project_id"])
    f2_sel = f2_sel[f2_sel["project_id"] != "nan"]
    f2_sel = f2_sel.drop_duplicates("project_id").set_index("project_id")

    # Coerce types of the joined columns.
    for c in INT_COLS:
        f2_sel[c] = pd.to_numeric(f2_sel[c], errors="coerce").round().astype("Int64")
    for c in STR_COLS:
        f2_sel[c] = f2_sel[c].astype("string")

    # --- Join-key coverage (tolerate at most the 1 known blank-registry straggler) ---
    unmatched = sorted(set(proj["project_id"]) - set(f2_sel.index))
    print(f"[enrich] join match: {n_pids_in - len(unmatched)}/{n_pids_in} pids "
          f"({100 * (n_pids_in - len(unmatched)) / n_pids_in:.2f}%)")
    if len(unmatched) > 1:
        fail(f"{len(unmatched)} pipeline project_ids absent from File 2 "
             f"(allowed: <=1). First few: {unmatched[:10]}")
    if unmatched:
        print(f"[enrich] tolerated unmatched pid(s): {unmatched}")

    # --- Left join (broadcasts File 2's one-row-per-project values onto vintage rows) ---
    out = proj.join(f2_sel, on="project_id")

    # ACR per-project deep links (acr2.apx.com/mymodule/reg/prjView.asp) now 301-redirect
    # to a dead greentrace.ice.com/acr/mymodule path (404) — ICE deprecated ACR per-project
    # URLs. Point ACR at the working projects listing instead. Verra/CAR/GS resolve fine.
    out.loc[out["registry"] == "ACR", "registry_documents_url"] = "https://greentrace.ice.com/acr/projects"

    # --- Derived: operational_lag_years (Verra/CAR only) ---
    reg = out["registry"]
    reg_date = pd.to_datetime(out["registration_date"], errors="coerce")
    first_iss = pd.to_datetime(out["first_issuance_date"], errors="coerce")
    lag = ((first_iss - reg_date).dt.days / 365.25).round(1)
    lag_mask = reg.isin(LAG_REGISTRIES) & reg_date.notna() & first_iss.notna() & (lag >= 0)
    out["operational_lag_years"] = lag.where(lag_mask)

    FINAL_COLS = ORIG_COLS + NEW_F2_COLS + ["operational_lag_years"]
    out = out.reindex(columns=FINAL_COLS)

    # --- Pre-write invariant gates (in-memory) ---
    if len(out) != n_rows_in:
        fail(f"row count changed {n_rows_in} -> {len(out)}")
    if out["project_id"].nunique() != n_pids_in:
        fail(f"unique project_id changed {n_pids_in} -> {out['project_id'].nunique()}")
    if list(out.columns[:len(ORIG_COLS)]) != ORIG_COLS:
        fail("original column set/order changed")
    if not out[ORIG_COLS].equals(proj[ORIG_COLS]):
        fail("an original column value changed (must be additive only)")
    sums_out = pd.to_numeric(out["credits_issued"], errors="coerce").groupby(out["registry"]).sum()
    if not sums_in.equals(sums_out):
        fail(f"per-registry credits_issued sums changed:\n{sums_in}\n vs \n{sums_out}")

    # --- Write ---
    out.to_csv(CSV, index=False)
    print(f"[enrich] wrote {len(out)} rows x {len(out.columns)} cols -> {CSV}")

    # --- Post-write verification (re-read; catches any serialisation drift) ---
    rt = pd.read_csv(CSV, dtype=str)
    if list(rt.columns) != FINAL_COLS:
        fail(f"written header mismatch: {list(rt.columns)}")
    if not rt[ORIG_COLS].equals(proj[ORIG_COLS]):
        fail("original columns differ after round-trip (serialisation drift)")
    rt_sums = pd.to_numeric(rt["credits_issued"], errors="coerce").groupby(rt["registry"]).sum()
    if not sums_in.equals(rt_sums):
        fail("per-registry sums differ after round-trip")

    # --- New-column sanity (coverage measured among File-2-matched rows, so the
    #     <=1 tolerated unmatched straggler does not trip the gate) ---
    matched = out["project_id"].isin(set(f2_sel.index))
    rr_cov = out.loc[matched, "reduction_removal"].notna().mean()
    url_cov = out.loc[matched, "registry_documents_url"].notna().mean()
    if rr_cov < 1.0:
        fail(f"reduction_removal coverage among matched {rr_cov:.4f} < 100%")
    if url_cov < 1.0:
        fail(f"registry_documents_url coverage among matched {url_cov:.4f} < 100%")
    lag_v = out.loc[out["registry"] == "Verra", "operational_lag_years"].notna().sum()
    lag_c = out.loc[out["registry"] == "CAR", "operational_lag_years"].notna().sum()
    if lag_v == 0 or lag_c == 0:
        fail(f"operational_lag_years empty for a target registry (Verra={lag_v}, CAR={lag_c})")

    # --- Summary ---
    print("\n=== ENRICH SUMMARY ===")
    print(f"  columns: {len(ORIG_COLS)} -> {len(FINAL_COLS)}")
    print("  per-registry credits_issued (unchanged):")
    for r, v in sums_in.items():
        print(f"    {r}: {v:,.0f}")
    print(f"  reduction_removal coverage (matched)     : {rr_cov*100:.1f}%")
    print(f"  registry_documents_url coverage (matched): {url_cov*100:.1f}%")
    print(f"  operational_lag_years populated: Verra={lag_v}, CAR={lag_c} "
          f"(ACR/GS intentionally null)")
    print("======================")


if __name__ == "__main__":
    main()
