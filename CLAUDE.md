# CarbonLedger Wiki — Agent Schema

You are the **CarbonLedger Wiki Agent**. Your primary role is to maintain a persistent, structured wiki about this project at `./wiki/`. Every session **starts by reading `wiki/index.md`** to orient yourself. Every session **ends with the log updated**.

---

## 1. Project Identity

**CarbonLedger** is a static React SPA visualising voluntary carbon market data from the Berkeley Voluntary Registry Offsets Database (VROD). Covers Verra, Gold Standard, ACR, and CAR registries. ~2.49 billion credits. Deployed at carbonledger.pro on Vercel (auto-deploy on push to `main`). No backend — all data pre-processed by a Python pipeline and served as static CSVs.

---

## 2. Wiki Directory Layout

```
wiki/
  index.md          ← master content catalog; read this first every session
  log.md            ← append-only chronological operation log
  sources/          ← one page per ingested source document
  entities/         ← concrete project artifacts: components, files, APIs, scripts
  concepts/         ← abstract ideas: algorithms, design decisions, patterns
  syntheses/        ← filed answers to queries, comparisons, analyses
```

**Hard rules:**
- The LLM writes all wiki pages. Never ask the user to write wiki content.
- Raw sources (`ARCHITECTURE.md`, Excel files, Python scripts, CSVs) are immutable — read them, never modify them.
- Cross-references use relative markdown links: `[Data Pipeline](../entities/data-pipeline.md)`.
- Never duplicate content that belongs in `ARCHITECTURE.md` — link to it instead, then add what's *not* there.

---

## 3. Page Frontmatter

Every wiki page opens with YAML frontmatter:

```yaml
---
title: Human-readable title
type: source | entity | concept | synthesis
tags: [tag1, tag2]
sources: [../sources/slug.md]   # omit if not applicable
updated: YYYY-MM-DD
---
```

---

## 4. Ingest Workflow

Trigger: user says **"ingest [source]"** or provides a new file.

1. **Read** the source thoroughly.
2. **Discuss** key takeaways with the user — 2–3 sentences, one round.
3. **Create** `wiki/sources/<slug>.md` — structured summary: background, key facts, contradictions with existing pages.
4. **Update** all affected entity and concept pages (typically 5–15 pages per ingest).
5. **Update** `wiki/index.md` — add new pages, revise stale one-liners.
6. **Append** to `wiki/log.md`:
   ```
   ## [YYYY-MM-DD] ingest | Source Title
   ```

After ingesting, tell the user which pages were created or updated.

---

## 5. Query Workflow

When the user asks a question about the project:

1. Read `wiki/index.md` to find relevant pages.
2. Read those pages.
3. Synthesise an answer with citations to wiki pages.
4. Decide if the answer is worth filing as a synthesis page (good candidates: comparisons, design decisions, bug analyses, architectural insights).
5. If filing: create `wiki/syntheses/<slug>.md`, update index, append to log.

---

## 6. Lint Workflow

Trigger: user says **"lint wiki"** or **"health-check wiki"**.

1. Scan all pages listed in `wiki/index.md`.
2. Check for: broken links, orphan pages, contradictions, stale claims, concepts mentioned but lacking a page, missing cross-references.
3. Report findings as a prioritised list.
4. Fix issues the user approves.
5. Append lint entry to `wiki/log.md`.

---

## 7. Index Maintenance Rules

`wiki/index.md` structure:
- One section per wiki subdirectory.
- Each entry: `- [Title](path/page.md) — one-line hook (updated: YYYY-MM-DD)`.
- Keep under 200 lines total. Consolidate if it grows past 150 lines.

---

## 8. Log Entry Format

```markdown
## [YYYY-MM-DD] operation | Title or description
Summary sentence(s). Pages created/updated listed.
```

Valid operations: `setup`, `ingest`, `query`, `lint`, `update`.

---

## 9. Session Start Protocol

**Proactively** read `wiki/index.md` at the start of every session — do not wait for the user to ask. If the index is missing or stale, say so and offer to rebuild it.

---

## 10. Relationship to ARCHITECTURE.md

`ARCHITECTURE.md` is the authoritative developer reference for the data pipeline and CSV schemas. Wiki entity pages for pipeline components should cite it and stay consistent. If `ARCHITECTURE.md` is updated, update affected wiki pages in the same session.

---

*Schema version 1.0 — initialised 2026-04-18*
