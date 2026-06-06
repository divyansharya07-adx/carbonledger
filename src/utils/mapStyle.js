// mapStyle.js — single source of truth for the Mapbox Standard basemap used by CarbonLedger maps.
//
// Indian geospatial law requires POK, Gilgit-Baltistan, Aksai Chin, and Arunachal Pradesh to be
// shown as part of India. We render the Mapbox Standard style with the IN worldview baked into the
// style import, so compliant boundaries/labels are correct on the FIRST rendered frame (no momentary
// non-compliant flash).
//
// Clause A (no sub-national admin lines): Standard's `showAdminBoundaries` is an all-or-nothing
// Boolean (no admin-0/1/2 granularity), so it is set OFF here. National (admin-0) borders are instead
// drawn by the consumer's own country-boundaries-v1 outline layer — that tileset contains ONLY admin-0
// data, so it structurally cannot render admin-1 (state) / admin-2 (district) lines.

export const WORLDVIEW = 'IN';

export const STANDARD_STYLE = {
  version: 8,
  imports: [
    {
      id: 'basemap',
      url: 'mapbox://styles/mapbox/standard',
      config: {
        worldview: WORLDVIEW,        // LEGAL: Survey of India boundaries
        theme: 'monochrome',         // closest analog to the flat editorial light/dark v11 look
        lightPreset: 'day',          // overridden at runtime per isDarkMode (setConfigProperty)
        showAdminBoundaries: false,  // Clause A — see header note
        show3dObjects: false,        // keep the map flat/editorial
        showPedestrianRoads: false,
        showTransitLabels: false,
        showPointOfInterestLabels: false,
        showRoadLabels: false,
        // showPlaceLabels: left default ON — country/city context is wanted on both maps
      },
    },
  ],
  sources: {},
  layers: [],
};

// Worldview filter for a separately-added `mapbox.country-boundaries-v1` source (NOT auto-filtered by
// the basemap worldview config). `extra` ANDs in a per-layer predicate (e.g. a name_en match).
export const worldviewFilter = (extra) => {
  const wv = [
    'all',
    ['==', ['get', 'disputed'], 'false'],
    ['any', ['==', 'all', ['get', 'worldview']], ['in', WORLDVIEW, ['get', 'worldview']]],
  ];
  return extra ? ['all', wv, extra] : wv;
};
