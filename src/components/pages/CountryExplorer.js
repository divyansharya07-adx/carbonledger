import { useState, useCallback, useMemo, useRef } from 'react';
import Map, { Source, Layer, Marker, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { formatCredits, REGISTRY_COLORS } from '../../utils/formatters';

/* ─── Name translation: data → Mapbox name_en ─── */
const DATA_TO_MAPBOX = {
  'United States':  'United States of America',
  'DR Congo':       'Democratic Republic of the Congo',
  'Congo':          'Republic of the Congo',
  'Ivory Coast':    "Côte d'Ivoire",
  'Tanzania':       'United Republic of Tanzania',
  'Syria':          'Syrian Arab Republic',
  'Iran':           'Iran (Islamic Republic of)',
  'Bolivia':        'Bolivia (Plurinational State of)',
  'Venezuela':      'Venezuela (Bolivarian Republic of)',
};
const MAPBOX_TO_DATA = Object.fromEntries(
  Object.entries(DATA_TO_MAPBOX).map(([d, m]) => [m, d])
);

/* ─── Hardcoded centroids for top credit-producing countries ─── */
const COUNTRY_CENTROIDS = {
  'India':          [78.9,   20.6],
  'Brazil':         [-51.9, -14.2],
  'China':          [104.2,  35.9],
  'Kenya':          [37.9,    0.0],
  'United States':  [-95.7,  37.1],
  'Indonesia':      [113.9,  -0.8],
  'Colombia':       [-74.3,   4.6],
  'Mexico':         [-102.6, 23.6],
  'Peru':           [-75.0,  -9.2],
  'Zimbabwe':       [29.2,  -20.0],
  'Chile':          [-71.5, -35.7],
  'Vietnam':        [108.3,  14.1],
  'Cambodia':       [104.9,  12.6],
  'Tanzania':       [34.9,   -6.4],
  'Ethiopia':       [40.5,    9.1],
  'DR Congo':       [23.7,   -2.9],
  'Thailand':       [100.9,  15.9],
  'Bolivia':        [-64.7, -16.3],
  'Uganda':         [32.3,    1.4],
  'Mozambique':     [35.0,  -18.7],
  'Argentina':      [-63.6, -38.4],
  'Ghana':          [-1.0,    7.9],
  'Nigeria':        [8.7,     9.1],
  'Ecuador':        [-78.1,  -1.8],
  'Zambia':         [27.8,  -13.1],
};

/* ─── CountryPanel sub-component ─── */
const CountryPanel = ({ data: pd, onClose }) => {
  const maxAct = pd.actBreakdown[0]?.credits || 1;
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
          {pd.name}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: '#aaaaaa',
            fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 0 0 12px', flexShrink: 0,
          }}
        >×</button>
      </div>

      {/* KPI rows */}
      {[
        { label: 'TOTAL CREDITS',  value: formatCredits(pd.totalCred) },
        { label: '% OF GLOBAL',    value: `${pd.globalPct}%` },
        { label: 'TOP ACTIVITY',   value: pd.topActivity },
        { label: 'ACTIVE SINCE',   value: pd.minYear !== Infinity ? Math.floor(pd.minYear) : '—' },
      ].map(({ label, value }) => (
        <div key={label} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888888', marginBottom: 3 }}>
            {label}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#e85724' }}>{value}</div>
        </div>
      ))}

      {/* Divider */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '8px 0 14px' }} />

      {/* Credits by Activity bars */}
      <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888888', marginBottom: 10 }}>
        Credits by Activity
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {pd.actBreakdown.slice(0, 8).map(({ name, credits }) => (
          <div key={name} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: '#cccccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                {name}
              </span>
              <span style={{ fontSize: 10, color: '#888888', flexShrink: 0, marginLeft: 6 }}>
                {formatCredits(credits)}
              </span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(credits / maxAct) * 100}%`,
                background: '#e85724',
                borderRadius: 2,
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Insights */}
      {pd.insights?.length > 0 && (
        <>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '14px 0 10px' }} />
          <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888888', marginBottom: 8 }}>
            Insights
          </div>
          {pd.insights.map((insight, i) => (
            <div key={i} style={{
              fontSize: 10,
              color: '#cccccc',
              background: 'rgba(243, 126, 81, 0.08)',
              borderLeft: '2px solid #F37E51',
              padding: '6px 8px',
              borderRadius: '0 3px 3px 0',
              lineHeight: 1.5,
              marginBottom: 6,
            }}>
              {insight}
            </div>
          ))}
        </>
      )}

      {/* Registry pills */}
      {pd.registries.length > 0 && (
        <>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '14px 0 10px' }} />
          <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888888', marginBottom: 8 }}>
            Registries
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {pd.registries.map(({ name }) => (
              <span
                key={name}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: ((REGISTRY_COLORS[name] || '#999999') + '33'),
                  color: REGISTRY_COLORS[name] || '#999999',
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* ─── Main component ─── */
const CountryExplorer = ({ data, isDarkMode }) => {
  const mapRef = useRef(null);
  const hasLoggedRef = useRef(false);
  const [hoveredCountry,  setHoveredCountry]  = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [panelOpen,       setPanelOpen]       = useState(false);
  const [cursor,          setCursor]          = useState('');
  const [mapLoaded,       setMapLoaded]       = useState(false);

  /* ─── Choropleth opacity match expression ─── */
  const fillOpacityExpression = useMemo(() => {
    if (!data?.creditsByCountry?.length) return 0;
    const max = data.creditsByCountry[0].credits;
    const entries = [];
    data.creditsByCountry.forEach(c => {
      const mapboxName = DATA_TO_MAPBOX[c.name] || c.name;
      const opacity = 0.12 + (c.credits / max) * 0.38;
      // Use array form to match both the data name and the Mapbox name_en value
      if (DATA_TO_MAPBOX[c.name] && DATA_TO_MAPBOX[c.name] !== c.name) {
        entries.push([c.name, mapboxName], opacity);
      } else {
        entries.push(mapboxName, opacity);
      }
    });
    return ['match', ['get', 'name_en'], ...entries, 0];
  }, [data?.creditsByCountry]);

  /* ─── Layer definitions ─── */
  const selectedMapboxName = selectedCountry
    ? (DATA_TO_MAPBOX[selectedCountry.dataName] || selectedCountry.dataName)
    : '';

  const fillLayer = {
    id: 'country-fill',
    type: 'fill',
    'source-layer': 'country_boundaries',
    filter: ['==', ['get', 'disputed'], 'false'],
    paint: {
      'fill-color': '#F37E51',
      'fill-opacity': fillOpacityExpression,
    },
  };

  const hoverLayer = {
    id: 'country-fill-hover',
    type: 'fill',
    'source-layer': 'country_boundaries',
    filter: ['==', ['get', 'name_en'], hoveredCountry ?? ''],
    paint: { 'fill-color': '#ff7a4d', 'fill-opacity': 0.70 },
  };

  const selectedLayer = {
    id: 'country-fill-selected',
    type: 'fill',
    'source-layer': 'country_boundaries',
    filter: ['==', ['get', 'name_en'], selectedMapboxName],
    paint: { 'fill-color': '#e85724', 'fill-opacity': 0.9 },
  };

  const outlineLayer = {
    id: 'country-outline',
    type: 'line',
    'source-layer': 'country_boundaries',
    paint: {
      'line-color': isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)',
      'line-width': 0.4,
    },
  };

  /* ─── Panel data ─── */
  const countryPanelInfo = useMemo(() => {
    if (!selectedCountry) return null;
    const { records } = data.getCountryData(selectedCountry.dataName);
    const totalCred = records.reduce((s, r) => s + r.credits, 0);
    const globalPct = data.totalCredits > 0
      ? ((totalCred / data.totalCredits) * 100).toFixed(1) : '0.0';
    const actMap = {};
    records.forEach(r => { actMap[r.category] = (actMap[r.category] || 0) + r.credits; });
    const actBreakdown = Object.entries(actMap)
      .map(([name, credits]) => ({ name, credits }))
      .sort((a, b) => b.credits - a.credits);
    const topActivity = actBreakdown[0]?.name ?? '—';
    const minYear = records.length > 0 ? Math.min(...records.map(r => r.year)) : Infinity;
    const regMap = {};
    records.forEach(r => { regMap[r.registry] = (regMap[r.registry] || 0) + r.credits; });
    const registries = Object.entries(regMap)
      .map(([name, credits]) => ({ name, credits }))
      .sort((a, b) => b.credits - a.credits);
    const insights = [];
    const globalPctNum = parseFloat(globalPct);
    if (globalPctNum > 15) {
      insights.push(`${selectedCountry.dataName} is one of the top carbon credit markets globally, accounting for ${globalPct}% of all verified credits.`);
    }
    if (insights.length < 2 && totalCred > 0 && actBreakdown[0]) {
      const topActPct = (actBreakdown[0].credits / totalCred) * 100;
      if (topActPct > 60) {
        insights.push(`${actBreakdown[0].name} dominates ${selectedCountry.dataName}'s portfolio, representing over ${Math.round(topActPct)}% of its total credits.`);
      }
    }
    if (insights.length < 2 && totalCred > 0 && registries[0]) {
      const topRegPct = (registries[0].credits / totalCred) * 100;
      if (topRegPct > 85) {
        insights.push(`${selectedCountry.dataName}'s credits are highly concentrated in ${registries[0].name}, which accounts for ${Math.round(topRegPct)}% of its output.`);
      }
    }
    if (insights.length < 2 && actBreakdown.length >= 5) {
      insights.push(`${selectedCountry.dataName} has a diversified portfolio spanning ${actBreakdown.length} activity types.`);
    }
    return { name: selectedCountry.dataName, totalCred, globalPct, topActivity, minYear, actBreakdown, registries, insights };
  }, [selectedCountry, data]);

  /* ─── Event handlers ─── */
  const handleMouseMove = useCallback((e) => {
    const features = e.target.queryRenderedFeatures(e.point, { layers: ['country-fill'] });
    if (features[0] && !hasLoggedRef.current) {
      console.log('[CountryExplorer] feature props sample:', features[0].properties);
      hasLoggedRef.current = true;
    }
    const name = features[0]?.properties?.name_en ?? null;
    setHoveredCountry(name);
    setCursor(name ? 'pointer' : '');
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredCountry(null);
    setCursor('');
  }, []);

  const openCountry = useCallback((dataName, mapboxName, credits) => {
    setSelectedCountry({ dataName, mapboxName, credits });
    setPanelOpen(true);
    const centroid = COUNTRY_CENTROIDS[dataName];
    if (centroid && mapRef.current) {
      mapRef.current.flyTo({ center: centroid, zoom: 4, duration: 1200 });
    }
  }, []);

  const handleCountryClick = useCallback((e) => {
    const features = e.target.queryRenderedFeatures(e.point, { layers: ['country-fill'] });
    if (!features.length) return;
    const mapboxName = features[0].properties.name_en;
    const dataName = MAPBOX_TO_DATA[mapboxName] || mapboxName;
    const entry = data.creditsByCountry.find(c => c.name === dataName);
    if (!entry) return;
    openCountry(dataName, mapboxName, entry.credits);
  }, [data.creditsByCountry, openCountry]);

  const handleMarkerClick = useCallback((country) => {
    openCountry(
      country.name,
      DATA_TO_MAPBOX[country.name] || country.name,
      country.credits
    );
  }, [openCountry]);

  const handleReset = useCallback(() => {
    setSelectedCountry(null);
    setPanelOpen(false);
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [0, 20], zoom: 1.5, duration: 1000 });
    }
  }, []);

  /* ─── Top 10 markers (exclude selected) ─── */
  const top10Markers = useMemo(() =>
    data.creditsByCountry
      .slice(0, 10)
      .filter(c => COUNTRY_CENTROIDS[c.name] && c.name !== selectedCountry?.dataName),
    [data.creditsByCountry, selectedCountry]
  );

  return (
    <div className="country-explorer-map-page">
      <Map
        ref={mapRef}
        key={isDarkMode ? 'dark' : 'light'}
        mapboxAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
        initialViewState={{ longitude: 0, latitude: 20, zoom: 1.5 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={isDarkMode
          ? 'mapbox://styles/mapbox/dark-v11'
          : 'mapbox://styles/mapbox/light-v11'}
        cursor={cursor}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleCountryClick}
        onLoad={() => setMapLoaded(true)}
      >
        {mapLoaded && (
          <Source
            id="country-boundaries"
            type="vector"
            url="mapbox://mapbox.country-boundaries-v1"
          >
            <Layer {...fillLayer} />
            <Layer {...hoverLayer} />
            <Layer {...selectedLayer} />
            <Layer {...outlineLayer} />
          </Source>
        )}

        {mapLoaded && top10Markers.map(c => (
          <Marker
            key={c.name}
            longitude={COUNTRY_CENTROIDS[c.name][0]}
            latitude={COUNTRY_CENTROIDS[c.name][1]}
            onClick={(e) => { e.originalEvent.stopPropagation(); handleMarkerClick(c); }}
          >
            <div className="pulse-dot" />
          </Marker>
        ))}

        <NavigationControl position="top-right" />
      </Map>

      <button className="map-reset-btn" onClick={handleReset}>
        ↺ Reset View
      </button>

      <div className={`country-detail-panel${panelOpen ? ' open' : ''}`}>
        {countryPanelInfo && (
          <CountryPanel data={countryPanelInfo} onClose={handleReset} />
        )}
      </div>
    </div>
  );
};

export default CountryExplorer;
