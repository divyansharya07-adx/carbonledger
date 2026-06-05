# Mapbox Migration Plan — Standard + IN Worldview

**Date:** 2026-06-05 (rev. 2026-06-06) · **Status:** APPROVED; in implementation on `feat/mapbox-in-worldview-countryexplorer` · **Owner doc for CEEW handoff**
**Predecessor:** [.claude/plans/mapbox-worldview-diagnostic.md](../../.claude/plans/mapbox-worldview-diagnostic.md)
**This PR scope:** CountryExplorer ONLY — authoritative spec in the **LOCKED** section below. GlobalMap is handled separately via a data-file swap (Part B is superseded).
**Decision change (2026-06-06):** CountryExplorer projection **mercator → globe** — rationale in the LOCKED section's Decision-change note.

---

## Context

Indian geospatial law requires maps to depict POK, Gilgit-Baltistan, Aksai Chin, and Arunachal
Pradesh as part of India. CarbonLedger ships two maps on two different stacks (classic Mapbox v11;
D3+TopoJSON Natural Earth) — **neither is compliant today**. Decision (made in chat): consolidate
onto a **single mapping stack** — Mapbox GL + the **Mapbox Standard** style with **`worldview: 'IN'`** —
so disputed territories render per the Survey of India position from one boundary source of truth.

**Three driving constraints:**
1. **Lawful** — IN worldview, non-negotiable.
2. **Durable** — no runtime classic-style filter patches, no hand-edited GeoJSON. Worldview correct at first paint (no momentary non-compliant frame).
3. **Visual continuity** — CountryExplorer preserves the **current production look: a globe with atmosphere**, in the flat editorial monochrome palette, light/dark. (GlobalMap is no longer a Mapbox rewrite — see Part B supersession.)

---

## LOCKED — CountryExplorer implementation (this PR)

Decisions locked 2026-06-05. **This is the authoritative spec for the active PR**; the per-map detail in
Part A (below) is retained as background. **Scope: CountryExplorer only.**

**Locked decisions:** theme `monochrome` · place labels ON, all other layers OFF (roads, transit, POI, 3D, pedestrian) · live `setConfigProperty` theme toggle (drop the `key`-remount) · disputed-fill contingency pre-authorized (validated first — see below) · **`projection: 'globe'`** (see Visual continuity sub-decision).

**Visual continuity (sub-decision, rev. 2026-06-06):** CountryExplorer renders as a **globe**, with **atmosphere preserved as Standard renders it** (no explicit fog/atmosphere config — Standard draws atmosphere by default, tied to `lightPreset`), and **initial zoom unchanged at 1.5** to match current production framing.

> **Decision change — why (2026-06-06):** the original locked spec pinned `projection="mercator"` on a misread of the reference state ("preserve current visual" was taken to mean flat). The **current production CountryExplorer is already a globe** (sphere + atmosphere) at carbonledger.tools.ceew.in — its `<Map>` carries **no `projection` prop**, so it inherits the mapbox-gl v3 / Standard default (globe). The implementation faithfully executed the (wrong) plan; the plan is corrected here. Fix = flip one prop: `projection="mercator"` → `projection="globe"` (no other code change; `mapStyle.js` untouched).

**Clause A — no sub-national lines.** Standard's `showAdminBoundaries` is a single **all-or-nothing Boolean** (no admin-0/1/2 granularity — verified against the Standard API reference). Therefore:
- `showAdminBoundaries: false` → removes ALL Standard political linework (kills admin-1/admin-2; also drops the basemap admin-0).
- National (admin-0) borders are drawn by CarbonLedger's **existing** `country-outline` layer on `country-boundaries-v1`, filtered to IN. That tileset holds **only admin-0** data → it structurally cannot render admin-1/admin-2. Legal border compliance rests on this verified worldview-filter mechanism, not a Standard config flag.

**Label visibility — NO config change needed (verified 2026-06-06).** `showAdminBoundaries` toggles boundary **lines only**; place **labels** are governed independently by **`showPlaceLabels`** — which we leave default **ON**, and which covers **cities, towns, and state/province (admin-1) names**. Standard exposes **no** separate sub-national-label key (no `showAdminLabels` / `showSettlementSubdivisionLabels` etc.) — `showPlaceLabels` is the only lever. So the current config already produces the production-like result: **state + city labels visible, sub-national boundary *lines* hidden** (Clause A intact). Under **`worldview: 'IN'`** those labels are attributed per India (J&K / Ladakh as Indian states; Srinagar / Leh under Indian administration). **Residual preview check:** Standard's label density/zoom thresholds differ from classic v11 — confirm Indian state labels actually surface across CountryExplorer's zoom range (globe → ~z4 on country click). If any are missing, that's a density/zoom matter, **not** a missing config key.

**File 1 (NEW) `src/utils/mapStyle.js`** — exports `STANDARD_STYLE` (Standard import, IN worldview + config below, baked in for a flash-free first frame) and `worldviewFilter(extra)`:
```js
export const STANDARD_STYLE = {
  version: 8,
  imports: [{ id: 'basemap', url: 'mapbox://styles/mapbox/standard', config: {
    worldview: 'IN', theme: 'monochrome', lightPreset: 'day',   // lightPreset overridden at runtime
    showAdminBoundaries: false,                                 // Clause A
    show3dObjects: false, showPedestrianRoads: false, showTransitLabels: false,
    showPointOfInterestLabels: false, showRoadLabels: false,    // showPlaceLabels default ON → state/province + city labels
  }}],
  sources: {}, layers: [],
};
export const WORLDVIEW = 'IN';
export const worldviewFilter = (extra) => {
  const wv = ['all', ['==', ['get','disputed'], 'false'],
    ['any', ['==','all',['get','worldview']], ['in', WORLDVIEW, ['get','worldview']]]];
  return extra ? ['all', wv, extra] : wv;
};
```

**File 2 (EDIT) `src/components/pages/CountryExplorer.js`:**
- Import `{ STANDARD_STYLE, worldviewFilter }`.
- Mount-time style clone so dark-mode users get the right initial preset (no day→night flash):
  `const darkAtMount = useRef(isDarkMode); const mapStyleObj = useMemo(() => { const s = JSON.parse(JSON.stringify(STANDARD_STYLE)); s.imports[0].config.lightPreset = darkAtMount.current ? 'night':'day'; return s; }, []);`
- `<Map>`: `mapStyle={mapStyleObj}`, add `projection="globe"` (current-production look; also the Standard default — no fog/atmosphere config needed; `initialViewState` zoom stays 1.5), **remove** `key={isDarkMode?…}`.
- Live theme toggle (replaces remount): `useEffect(() => { const m = mapRef.current?.getMap?.(); if (mapLoaded && m) m.setConfigProperty('basemap','lightPreset', isDarkMode ? 'night':'day'); }, [isDarkMode, mapLoaded]);`
- **All four layers already exist today** (`country-fill`, `country-fill-hover`, `country-fill-selected`, `country-outline` — [CountryExplorer.js:556-592](../../src/components/pages/CountryExplorer.js#L556)). **Edits only — no new layer added:**
  - add `slot: 'middle'` to each;
  - `country-fill` → `filter: worldviewFilter()`; `country-fill-hover` → `filter: worldviewFilter(['==',['get','name_en'], hoveredCountry ?? ''])`; `country-fill-selected` → `filter: worldviewFilter(['==',['get','name_en'], selectedMapboxName])`; `country-outline` → `filter: worldviewFilter()`;
  - **emissive-strength = `1.0`** on every layer (`fill-emissive-strength: 1` on the three fills; `line-emissive-strength: 1` on the outline). Rationale: 1.0 = full emission, so the flat editorial colors render at their true value regardless of Standard's day/night lighting — matching the unlit v11 look. Verify on preview; lower only if the fills read too hot.
  - `country-outline` becomes the **sole** national border → bump from `width 0.4 / rgba .06–.1` to ≈ `width 0.6 / rgba(255,255,255,0.15) dark · rgba(0,0,0,0.22) light` (tunable on preview).

**Clause B — preserved verbatim:** `fillOpacityExpression` choropleth, selected highlight, hover + `name_en` click, `CountryPanel`, World Bank CO₂ fetch, `DATA_TO_MAPBOX`/markers/reset — logic untouched.

**Contingency (decision 4) — disputed-fill, VALIDATE BEFORE SHIPPING.** If the preview shows Aksai Chin / Arunachal rendered but **unfilled**, broaden the **fill layer only** to:
`['any', worldviewFilter(), ['all', ['==',['get','disputed'],'true'], ['in','IN',['get','worldview']]]]`.
This expression is **untested**. Before applying it to production code, **validate in Mapbox Studio** (or a scratch GL JS page) against the IN worldview to confirm (a) the disputed Indian polygons carry `worldview` containing `IN`, and (b) their `name_en` resolves so `fillOpacityExpression` colors them as India (if not, the opacity `match` must also be extended). Do **not** ship the contingency unvalidated.

**Verification (before push):**
1. `npm run build:ci` → exit 0.
2. Show diff + new file; **do not push** — await review.
3. Vercel-preview checklist: **renders as a globe with atmosphere (not flat)** · globe at zoom 1.5 frames comfortably (not too much space) · India incl. POK/Gilgit-Baltistan/Aksai Chin/Arunachal · click-India = single contiguous orange fill · Pakistan excl. POK/GB · China excl. Aksai Chin/Arunachal · Srinagar/Leh labels under Indian admin · **Indian state labels (J&K, Himachal Pradesh, …) visible & under Indian administration; major cities (New Delhi, Mumbai, …) visible** · disputed borders solid (not dashed) · light+dark acceptable vs v11 · **emissive-strength reads right (tune from 1.0 if too hot)** · hover/tooltip/CO₂ all work · mobile ~380px OK · **no admin-1/admin-2 lines anywhere**.

---

## Verified technical foundation (confirmed against live Mapbox / react-map-gl docs, 2026-06-05)

- **Versions in repo** (package.json): `mapbox-gl@^3.20.0`, `react-map-gl@^8.1.0`. Standard + config API + globe all supported. No version bump needed.
- **Set Standard config at creation (flash-free):** the map style may be a **style-import JSON object** that imports Standard with config baked in:
  ```jsonc
  { "version": 8, "imports": [{ "id": "basemap", "url": "mapbox://styles/mapbox/standard",
      "config": { "lightPreset": "day", "worldview": "IN", "theme": "monochrome" } }],
    "sources": {}, "layers": [] }
  ```
  react-map-gl accepts a **style object** for `mapStyle`. This makes `worldview: 'IN'` correct on the **first rendered frame** — satisfies constraint 2.
- **Update config at runtime:** `map.setConfigProperty('basemap', <key>, <value>)` (`'basemap'` = the import id). Used for live light/dark toggling.
- **Confirmed config keys + values:** `lightPreset` ∈ `dawn|day|dusk|night`; `theme` ∈ `default|faded|monochrome|custom`; booleans `show3dObjects`, `showPlaceLabels`, `showPointOfInterestLabels`, `showRoadLabels`, `showTransitLabels`, `showPedestrianRoads`; `worldview` (supported values include **`IN`** — "boundaries conforming to cartographic requirements for use in India").
- **`showAdminBoundaries` is all-or-nothing** (single Boolean; no admin-0/1/2 granularity, verified against the Standard API reference). This is why Clause A sets it `false` and routes national borders through the `country-boundaries-v1` outline (an admin-0-only tileset) instead.
- **Custom layers under Standard need two things:** (1) a **slot** (`bottom|middle|top`) to position them in the basemap stack; (2) an **`*-emissive-strength`** paint property (e.g. `fill-emissive-strength: 1`) so the 3D lighting doesn't dim them — required for the flat editorial fill to read correctly.
- **A separately-added vector source (`mapbox.country-boundaries-v1`) is NOT auto-filtered by the basemap `worldview` config.** It needs its **own** worldview filter expression on each layer (below).
- **`projection` prop** (react-map-gl): `'globe'` and `'mercator'` are valid. **mapbox-gl v3 / the Standard style default to globe**; classic styles with no `projection` set default to mercator. Current production (classic v11, **no `projection` prop**) renders globe via this default → CountryExplorer sets `projection="globe"` **explicitly** to lock that intent on Standard.

---

## Reconciliations — three brief assumptions corrected by code inspection

1. **Click/hover key is `name_en`, not ISO 3166.** CountryExplorer's choropleth opacity (`fillOpacityExpression`), hover, selected, and click (`queryRenderedFeatures(...).properties.name_en`) all match on the English **country name**. (A4's ISO-code premise is moot — but the worldview note still holds: IN worldview changes India's polygon *geometry*, not its `name_en`.)
2. **GlobalMap is currently FLAT, not a globe.** It uses `d3.geoNaturalEarth1()` (a pseudo-cylindrical flat projection). `projection: 'globe'` is therefore a deliberate **flat→globe upgrade**, not strict continuity. (Confirm desired — the decision says globe, so proceeding.)
3. **GlobalMap has no `isDarkMode` and is hardcoded dark** (`#1e1e2a` land, `#0d0d12` strokes), regardless of app theme. "light/dark parity" (B5) means **introducing** theme awareness it never had — requires threading `isDarkMode` (App → Overview → GlobalMap). Also: bubbles already use a **static centroid table** (`COUNTRY_COORDS`), not TopoJSON centroids — so B4 is largely already solved; reuse that table.

---

## Shared asset — `src/utils/mapStyle.js` (new file, used by BOTH maps)

```js
// Single source of truth for the Mapbox Standard basemap + IN worldview.
// worldview baked into the style import => correct on first paint (no non-compliant flash).
export const STANDARD_STYLE = {
  version: 8,
  imports: [{
    id: 'basemap',
    url: 'mapbox://styles/mapbox/standard',
    config: {
      worldview: 'IN',            // LEGAL: Survey of India boundaries
      theme: 'monochrome',        // closest analog to flat editorial light/dark v11
      lightPreset: 'day',         // overridden at runtime per isDarkMode
      show3dObjects: false,       // keep flat editorial look
      showPedestrianRoads: false,
      showTransitLabels: false,
      showPointOfInterestLabels: false,
      showRoadLabels: false,
      // showPlaceLabels: left default ON (country/city context is useful on both maps)
    },
  }],
  sources: {},
  layers: [],
};

export const WORLDVIEW = 'IN';

// Worldview filter for the separately-added country-boundaries-v1 source.
// `extra` lets callers AND-in a per-layer predicate (e.g. name_en match).
export const worldviewFilter = (extra) => {
  const wv = ['all',
    ['==', ['get', 'disputed'], 'false'],
    ['any', ['==', 'all', ['get', 'worldview']], ['in', WORLDVIEW, ['get', 'worldview']]],
  ];
  return extra ? ['all', wv, extra] : wv;
};
```

**Runtime light/dark helper pattern** (used in both components, replaces the current `key`-remount theme swap):
```js
useEffect(() => {
  const m = mapRef.current?.getMap?.();
  if (!mapLoaded || !m) return;
  m.setConfigProperty('basemap', 'lightPreset', isDarkMode ? 'night' : 'day');
}, [isDarkMode, mapLoaded]);
```

==========================================================================
## PART A — CountryExplorer.js (classic v11 → Standard + IN)
==========================================================================

### A1 · Current-state inventory (read-only, confirmed)
- **mapStyle** ([CountryExplorer.js:791-793](../../src/components/pages/CountryExplorer.js#L791)): ternary `mapbox://styles/mapbox/dark-v11` / `light-v11`; `<Map key={isDarkMode?'dark':'light'}>` remounts on theme change.
- **Sources/Layers** ([:803-812](../../src/components/pages/CountryExplorer.js#L803)): one `<Source type="vector" url="mapbox://mapbox.country-boundaries-v1">` (source-layer `country_boundaries`) with four `<Layer>`s:
  | Layer | id | role | filter today |
  |---|---|---|---|
  | fill | `country-fill` | orange choropleth (opacity = credits) | `['==',['get','disputed'],'false']` |
  | fill | `country-fill-hover` | hover highlight | `['==',['get','name_en'], hoveredCountry]` |
  | fill | `country-fill-selected` | selected-country fill | `['==',['get','name_en'], selectedMapboxName]` |
  | line | `country-outline` | hairline borders | none |
- **Paint overrides:** fill `#e85724` + `fillOpacityExpression` (a `['match',['get','name_en'],…]` per-country opacity, [:534-549](../../src/components/pages/CountryExplorer.js#L534)); outline color theme-aware.
- **Hover** ([:680-702](../../src/components/pages/CountryExplorer.js#L680)): `onMouseMove` → `queryRenderedFeatures` → `setHoveredCountry(name_en)`. **No feature-state used** — highlight is filter-driven re-render.
- **Click** ([:713-722](../../src/components/pages/CountryExplorer.js#L713)): `queryRenderedFeatures({layers:['country-fill']})` → `properties.name_en` → map to data name → open panel.
- **Independent of layers:** `CountryPanel`, World Bank CO₂ fetch (keys off `selectedCountry.dataName` → `COUNTRY_ISO2_MAP`). Untouched by this migration.

### A2 · Target Standard configuration
Use `STANDARD_STYLE` (above) for `mapStyle`. **Pin `projection="mercator"`** so the zoom-1.5 initial view stays the flat editorial world (Standard would otherwise auto-globe at low zoom). Light/dark via the runtime `setConfigProperty('basemap','lightPreset',…)` effect. Theme `monochrome`, labels minimal (place labels on).

### A3 · Layer migration table
| Current | Action | Notes |
|---|---|---|
| `<Source country-boundaries>` (country-boundaries-v1) | **Keep as-is** | Standard does not expose its internal admin source for custom layers; a separate source is correct and supported. |
| `country-fill` | **Keep; edit filter + paint** | filter → `worldviewFilter()`; add `'fill-emissive-strength': 1`. Keep `#e85724` + `fillOpacityExpression`. Add `slot: 'middle'`. |
| `country-fill-hover` | **Keep; edit filter** | filter → `worldviewFilter(['==',['get','name_en'], hoveredCountry ?? ''])`; `slot:'middle'`; `fill-emissive-strength:1`. |
| `country-fill-selected` | **Keep; edit filter** | filter → `worldviewFilter(['==',['get','name_en'], selectedMapboxName])`; `slot:'middle'`; `fill-emissive-strength:1`. |
| `country-outline` | **Keep; edit filter** | add `worldviewFilter()`; `slot:'middle'`; `'line-emissive-strength':1`. |

> **Why the worldview filter on all four (not just fill):** country-boundaries-v1 carries one polygon **per worldview** for contested countries. Without the filter, both the US-worldview and IN-worldview India polygons are present → overlapping fills and ambiguous `queryRenderedFeatures` hits. Filtering every layer to IN guarantees one India polygon drives fill, hover, selection, and click identically.

### A4 · Hover / click parity
- `name_en`-based matching is **unchanged** and works under Standard (same source/source-layer). No feature-state migration needed.
- Under IN worldview, India's `name_en` is still `"India"`; `iso_3166_1` is unchanged — only geometry differs. The `DATA_TO_MAPBOX`/`MAPBOX_TO_DATA` tables need no edits.
- **Contingency (fill only):** if visual check (A5) shows Aksai Chin / Arunachal / POK rendered but **unfilled** (i.e. those areas are disputed=true overlays even in IN worldview), broaden the **fill** layer to also paint IN-assigned disputed polygons:
  ```js
  filter: ['any', worldviewFilter(), ['all', ['==',['get','disputed'],'true'], ['in','IN',['get','worldview']]]]
  ```
  Apply to `country-fill` only (not hover/selected/outline) to avoid global double-fills. The **legal borders themselves come from the Standard basemap (worldview=IN)** regardless — this contingency only affects whether the orange overlay covers those areas.

### A5 · Visual verification checklist — CountryExplorer
- [ ] India polygon includes POK, Gilgit-Baltistan, Aksai Chin, **Arunachal Pradesh**
- [ ] Click India → single contiguous orange fill over the **full** Indian territory
- [ ] Click Pakistan → does **not** include POK / Gilgit-Baltistan
- [ ] Click China → does **not** include Aksai Chin / Arunachal Pradesh
- [ ] Srinagar / Leh labels (if visible) under Indian administration
- [ ] Disputed borders render as **solid** admin lines, not dashed
- [ ] Light + dark both acceptable vs current v11 flat look (note aesthetic deltas)
- [ ] Hover still highlights + cursor change; selected-country fill works
- [ ] World Bank CO₂ panel still fires on country change (independent of layers — should be unaffected)
- [ ] Map stays **flat** (mercator), not globe, at the default zoom

==========================================================================
## PART B — GlobalMap.js  ⚠️ SUPERSEDED (2026-06-05)

> **Decision changed:** GlobalMap will NOT migrate to Mapbox. It stays D3+TopoJSON and is fixed by a
> **data-file swap** — replacing the Natural Earth `countries-110m.json` with an India-compliant
> equivalent in `/public`. No code changes to `GlobalMap.js`. The Mapbox-globe rewrite below is retained
> only as historical context and is **out of scope** for this PR.

### (historical) GlobalMap.js → Mapbox globe + Standard + IN
==========================================================================

### B1 · Current-state inventory (read-only, confirmed)
- Renders inside `.map-panel.overview-map` → `.map-header` (title "◎ Global Distribution" + hint) + `.map-container` (sized; `ResizeObserver` redraws an SVG).
- **Flat** `d3.geoNaturalEarth1().fitSize(...)`; country paths filled hardcoded dark; thin strokes. Topo from CDN `world-atlas@2/countries-110m.json`.
- **Bubbles:** `(selectedActivity ? data.getActivityCountries(selectedActivity) : data.creditsByCountry).slice(0,60)`, positioned via **`COUNTRY_COORDS[name]`** (static lat/lng), `r = max(2.5, min(12, sqrt(credits/maxCredits)*12))`, `opacity = max(0.3, credits/maxCredits)`, color `REGISTRY_COLORS[REGISTRY_ID_MAP[selectedRegistry]] || '#e85724'`.
- **Hover:** d3 mouseover → grow 1.4×, custom tooltip div (`name`, `credits`). **Click:** `onCountryClick(country.name)` → App navigates to CountryExplorer. Non-interactive otherwise (no zoom/pan). Props today: `{ data, selectedRegistry, selectedActivity, onCountryClick }` (Overview passes only `data, selectedRegistry, onCountryClick`).

### B2 · Target Mapbox implementation
- `<Map ref={mapRef} mapboxAccessToken={process.env.REACT_APP_MAPBOX_TOKEN} mapStyle={STANDARD_STYLE} projection="globe" initialViewState={{ longitude: 20, latitude: 15, zoom: 1.4, pitch: 0 }} />` inside the existing `.map-container`.
- **Light/dark:** add `isDarkMode` prop; same runtime `setConfigProperty('basemap','lightPreset',…)` effect. (New capability — see reconciliation 3.)
- **Atmosphere:** Standard renders globe atmosphere by default — keep (reads as an editorial globe). No `<Fog>` customization for v1; revisit in review.
- **Interactivity (recommendation):** this is a dashboard at-a-glance panel → **disable scroll/pan zoom** to avoid hijacking page scroll: `scrollZoom={false}`, `dragPan={false}`, `doubleClickZoom={false}`, `touchZoomRotate={false}`. **Allow `dragRotate`** (optional globe spin) — default **off** for v1 stability; flag as an easy enable. No `NavigationControl` (keep editorial).

### B3 · Bubble overlay — GeoJSON circle layer (approach **a**, recommended)
Rationale: one source + one layer for ≤60 points is faster and cleaner than 60 `<Marker>` DOM nodes, and gives native `queryRenderedFeatures` hover/click.
```js
const bubbleData = useMemo(() => {
  const list = (selectedActivity ? data.getActivityCountries(selectedActivity) : data.creditsByCountry) || [];
  const top = list.slice(0, 60).filter(c => COUNTRY_COORDS[c.name]);
  const maxCredits = top.length ? Math.max(...top.map(c => c.credits)) : 1;
  return {
    type: 'FeatureCollection',
    features: top.map(c => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: COUNTRY_COORDS[c.name] },
      properties: {
        name: c.name,
        credits: c.credits,
        radius: Math.max(2.5, Math.min(12, Math.sqrt(c.credits / maxCredits) * 12)),
        opacity: selectedActivity ? 0.9 : Math.max(0.3, c.credits / maxCredits),
      },
    })),
  };
}, [data, selectedActivity]);
```
```jsx
<Source id="bubbles" type="geojson" data={bubbleData}>
  <Layer id="credit-bubbles" type="circle" slot="top" paint={{
    'circle-radius': ['get', 'radius'],
    'circle-color': bubbleColor,
    'circle-opacity': ['get', 'opacity'],
    'circle-emissive-strength': 1,                 // full glow over Standard lighting
    'circle-stroke-color': bubbleColor,
    'circle-stroke-width': 0.5,
    'circle-stroke-opacity': 0.3,
  }} />
</Source>
```
- `bubbleColor` = existing `REGISTRY_COLORS[REGISTRY_ID_MAP[selectedRegistry]] || '#e85724'` — **transfers unchanged**.
- Hover grow-1.4×: optional via a `circle-radius` `['*', ['get','radius'], feature-state]`; simplest v1 = skip the grow, keep tooltip. (Note as minor deferred polish.)
- **Hover/click:** `interactiveLayerIds={['credit-bubbles']}`; `onMouseMove` → `queryRenderedFeatures` → set hovered `{name,credits,x,y}` → render the existing `.map-tooltip` div (reuse current markup/CSS) or a `<Popup>`; `onClick` → `onCountryClick(feature.properties.name)`; set cursor pointer on enter/leave.

### B4 · Country centroid source
- **Reuse the existing static `COUNTRY_COORDS` table** (option b — already implemented). India `[78, 22]` is interior to Indian territory → valid under IN worldview. Runtime centroid computation from boundaries (option a) is unnecessary complexity here; do **not** add it.

### B5 · Light/dark parity
- Thread `isDarkMode`: App.js `<Overview … isDarkMode={darkMode} />` ([App.js:115-122](../../src/App.js#L115)); Overview.js add `isDarkMode` to props + `<GlobalMap … isDarkMode={isDarkMode} />` ([Overview.js:12](../../src/components/pages/Overview.js#L12)).
- Drives the `lightPreset` effect. (Replaces the current always-dark hardcode.)

### B6 · Visual verification checklist — GlobalMap
- [ ] Renders as a **globe**, not flat
- [ ] India landmass includes POK / Gilgit-Baltistan / Aksai Chin / Arunachal Pradesh
- [ ] India credit bubble sits within the India polygon; Pakistan/China bubbles within their IN-worldview-reduced polygons
- [ ] Hover tooltip (name + credits) + click-to-navigate match current behavior
- [ ] Light + dark both acceptable
- [ ] First-paint performance acceptable (now fetches Mapbox tiles vs inline SVG — see C3)
- [ ] Page scroll not hijacked by the map (scrollZoom disabled)
- [ ] Mobile/narrow-viewport behavior preserved (panel resizes; globe reframes)

==========================================================================
## PART C — Cross-cutting
==========================================================================

- **C1 · react-map-gl version:** confirmed `^8.1.0` + `mapbox-gl@^3.20.0` — config object + `setConfigProperty` + `projection` all supported. No bump. Both maps import from `react-map-gl/mapbox` (already CountryExplorer's import path).
- **C2 · Token:** both maps use `process.env.REACT_APP_MAPBOX_TOKEN`. CountryExplorer already runs on carbonledger.pro, so the token serves that domain today; GlobalMap reuses it. **Manual check:** confirm the token has Standard access (default-yes for public tokens) and its URL restrictions are not so tight they'd block Standard. (Restriction to tools.ceew.co.in is the separate URL-migration concern — out of scope.)
- **C3 · Bundle / first-paint:** `mapbox-gl` is **already** bundled (CountryExplorer). Moving GlobalMap onto it adds **no new library** — net bundle impact ≈ neutral (and frees `topojson-client`, only used by GlobalMap, for later removal). Runtime: the Overview page now fetches Standard vector tiles instead of a ~100 KB inline TopoJSON → **flag a small first-paint regression** on Overview; both maps share the Standard tile/style cache after first load. Acceptable; verify in preview.
- **C4 · Sequencing (confirmed):** **CountryExplorer first** (smaller, contained; validates `STANDARD_STYLE` + worldview + overlay filter + emissive-strength), **GlobalMap second** (rewrite; reuses the proven helper). Land A, visually verify, then B.
- **C5 · Rollback:** `git revert` the merge commit → restores classic v11 + the D3 globe. Accepting temporary non-compliance is a **CEEW-leadership decision, not a developer revert call** — escalate rather than self-serve. (Keeping `STANDARD_STYLE` isolated in one util + additive layer edits keeps the revert clean.)
- **C6 · Verification env:** Vercel branch previews suffice for visual review of both maps. **Manual check:** ensure the Mapbox token's URL allowlist includes the preview subdomain (`*.vercel.app` or the specific `preview-*` host) or is unrestricted — otherwise tiles 401 on previews only.

==========================================================================
## PART D — Out of scope (do NOT touch)
==========================================================================

- Pipeline scripts: `build_projects.py`, `fix_data.py`, `enrich_projects.py`
- Any CSV under `public/` or `public/data/`
- Step 22b SSoT invariants
- Pass 3.5 retirement-anomaly diagnostic
- URL migration to tools.ceew.co.in
- Unrelated React refactors; `package.json` dependency removals (e.g. dropping `topojson-client`) — defer to post-merge cleanup
- `ARCHITECTURE.md` / wiki / master-plan updates — post-merge, not part of implementation

==========================================================================
## Decisions to confirm before implementation
==========================================================================

1. **Standard theme:** `monochrome` (recommended, closest to flat v11) vs `faded` vs `default`?
2. **Label density:** proposal keeps **place labels on**, everything else off (roads/POI/transit/pedestrian). OK, or keep road labels?
3. **GlobalMap flat→globe** is a real visual change (current is flat Natural Earth). Confirm globe is wanted (the decision says yes).
4. **GlobalMap interactivity:** static (scroll/pan/zoom disabled) with optional drag-to-spin **off** for v1 — OK?
5. **CountryExplorer theme toggle:** replace the `key`-remount with live `setConfigProperty` (smoother; minor behavior change — view no longer resets on theme flip). OK?
6. **Disputed-fill contingency (A4):** pre-authorize the fill-only broadened filter if Indian disputed territories render unfilled, or stop-and-review if that case appears?

## Sources
- [Mapbox Standard style guide](https://docs.mapbox.com/map-styles/standard/guides/) — config at creation/runtime, slots, themes, label toggles
- [Change a style config property (GL JS v3, React)](https://docs.mapbox.com/mapbox-gl-js/example/set-config-property/) — `setConfigProperty('basemap', …)`, exact key names
- [worldview glossary](https://docs.mapbox.com/help/glossary/worldview/) + [Mapbox Countries v1](https://docs.mapbox.com/data/tilesets/reference/mapbox-countries-v1/) — `IN` worldview, `disputed`/`worldview` properties
- [Toggle worldviews example](https://docs.mapbox.com/mapbox-gl-js/example/toggle-worldviews/) — the worldview filter expression
- [react-map-gl Map API](https://visgl.github.io/react-map-gl/docs/api-reference/mapbox/map) — `projection` prop, style-object `mapStyle`
