import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  'Turkey':         [32.0,   39.0],
  'Guatemala':      [-90.0,  15.0],
  'South Africa':   [25.0,  -30.0],
  'Australia':      [134.0, -25.0],
  'Canada':         [-106.0, 56.0],
  'Germany':        [10.4,   51.2],
  'United Kingdom': [-2.0,   54.0],
  'France':         [2.0,    47.0],
  'Spain':          [-4.0,   40.0],
  'Italy':          [12.0,   42.0],
  'Japan':          [138.0,  36.0],
  'South Korea':    [128.0,  36.0],
  'Philippines':    [121.8,  12.9],
  'Malaysia':       [102.0,   4.0],
  'Myanmar':        [96.0,   19.0],
  'Pakistan':       [69.0,   30.0],
  'Bangladesh':     [90.0,   24.0],
  'Nepal':          [84.0,   28.0],
  'Sri Lanka':      [81.0,    7.0],
  'Madagascar':     [47.0,  -19.0],
  'Malawi':         [34.0,  -13.0],
  'Rwanda':         [30.0,   -2.0],
  'Honduras':       [-86.0,  14.0],
  'Nicaragua':      [-85.0,  13.0],
  'Costa Rica':     [-84.0,  10.0],
  'Panama':         [-80.0,   9.0],
  'Paraguay':       [-58.0, -23.0],
  'Uruguay':        [-56.0, -33.0],
  'Guyana':         [-59.0,   5.0],
  'Suriname':       [-56.0,   4.0],
  'Venezuela':      [-66.0,   7.0],
  'Senegal':        [-14.0,  14.0],
  'Mali':           [-8.0,   17.0],
  'Niger':          [8.0,    17.0],
  'Cameroon':       [12.0,    6.0],
  'Ivory Coast':    [-5.0,    7.0],
  'Burkina Faso':   [-2.0,   12.0],
  'Benin':          [2.0,     9.0],
  'Togo':           [1.0,     8.0],
  'Sierra Leone':   [-12.0,   8.0],
  'Liberia':        [-10.0,   6.0],
  'Guinea':         [-12.0,  10.0],
  'Morocco':        [-8.0,   32.0],
  'Tunisia':        [10.0,   34.0],
  'Egypt':          [30.0,   27.0],
  'Algeria':        [3.0,    28.0],
  'Laos':           [102.0,  18.0],
  'Papua New Guinea': [144.0, -6.3],
  'Fiji':           [178.0, -18.0],
  'New Zealand':    [174.0, -41.0],
  'Norway':         [10.0,   62.0],
  'Sweden':         [16.0,   62.0],
  'Finland':        [26.0,   62.0],
  'Denmark':        [10.0,   56.3],
  'Netherlands':    [5.0,    52.0],
  'Belgium':        [4.0,    51.0],
  'Switzerland':    [8.0,    47.0],
  'Austria':        [14.0,   48.0],
  'Poland':         [20.0,   52.0],
  'Czech Republic': [15.0,   50.0],
  'Romania':        [25.0,   46.0],
  'Hungary':        [20.0,   47.0],
  'Ukraine':        [32.0,   49.0],
  'Russia':         [100.0,  60.0],
  'Georgia':        [44.0,   42.0],
  'Armenia':        [45.0,   40.0],
  'Azerbaijan':     [50.0,   41.0],
  'Aruba':          [-70.0,  12.0],
  'Angola':         [17.0,  -12.0],
};

/* ─── World Bank ISO2 codes for CO₂ emissions lookup ─── */
const COUNTRY_ISO2_MAP = {
  'India': 'IN', 'United States': 'US', 'China': 'CN', 'Brazil': 'BR',
  'Indonesia': 'ID', 'Kenya': 'KE', 'Cambodia': 'KH', 'Peru': 'PE',
  'Colombia': 'CO', 'Vietnam': 'VN', 'Turkey': 'TR', 'Chile': 'CL',
  'Mexico': 'MX', 'Uganda': 'UG', 'Tanzania': 'TZ', 'Philippines': 'PH',
  'Thailand': 'TH', 'Ethiopia': 'ET', 'Myanmar': 'MM', 'Nigeria': 'NG',
  'DR Congo': 'CD', 'Bangladesh': 'BD', 'Zimbabwe': 'ZW', 'Zambia': 'ZM',
  'South Korea': 'KR', 'Malawi': 'MW', 'Uruguay': 'UY', 'Rwanda': 'RW',
  'South Africa': 'ZA', 'Ghana': 'GH', 'Guatemala': 'GT', 'Germany': 'DE',
  'Madagascar': 'MG', 'Pakistan': 'PK', 'Canada': 'CA', 'Nepal': 'NP',
  'Malaysia': 'MY', 'Honduras': 'HN', 'Ivory Coast': 'CI', 'Egypt': 'EG',
  'Panama': 'PA', 'Burundi': 'BI', 'Argentina': 'AR', 'Mozambique': 'MZ',
  'Laos': 'LA', 'Sierra Leone': 'SL', 'Belize': 'BZ', 'Bulgaria': 'BG',
  'Paraguay': 'PY', 'Papua New Guinea': 'PG', 'Senegal': 'SN',
  'Mongolia': 'MN', 'Nicaragua': 'NI', 'Mali': 'ML', 'Uzbekistan': 'UZ',
  'Denmark': 'DK', 'Dominican Republic': 'DO', 'Singapore': 'SG',
  'Oman': 'OM', 'Burkina Faso': 'BF', 'Morocco': 'MA', 'Australia': 'AU',
  'Kazakhstan': 'KZ', 'Cameroon': 'CM', 'Mauritania': 'MR', 'Georgia': 'GE',
  'Benin': 'BJ', 'Togo': 'TG', 'Russia': 'RU', 'Costa Rica': 'CR',
  'New Zealand': 'NZ', 'Bolivia': 'BO', 'Congo': 'CG', 'France': 'FR',
  'Mauritius': 'MU', 'Gambia': 'GM', 'El Salvador': 'SV', 'Namibia': 'NA',
  'Romania': 'RO', 'Sri Lanka': 'LK', 'Netherlands': 'NL',
};

/* ─── CountryPanel sub-component ─── */
const CountryPanel = ({ data: pd, onClose, isDarkMode }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const maxAct = pd.actBreakdown[0]?.credits || 1;

  /* Theme tokens */
  const t = {
    titleColor:      isDarkMode ? '#ffffff'                   : '#333232',
    closeColor:      isDarkMode ? '#aaaaaa'                   : '#777777',
    labelColor:      isDarkMode ? '#888888'                   : '#777777',
    dividerColor:    isDarkMode ? 'rgba(255,255,255,0.08)'    : 'rgba(0,0,0,0.08)',
    actNameColor:    isDarkMode ? '#cccccc'                   : '#555555',
    actCredColor:    isDarkMode ? '#888888'                   : '#666666',
    actBarBg:        isDarkMode ? 'rgba(255,255,255,0.08)'    : '#f0e8dc',
    insightBg:       isDarkMode ? 'rgba(243,126,81,0.08)'     : '#f5f0e7',
    insightColor:    isDarkMode ? '#cccccc'                   : '#555555',
    chartLabelColor: isDarkMode ? '#555555'                   : '#aaaaaa',
    gridColor:       isDarkMode ? 'rgba(255,255,255,0.08)'    : '#e8e0d0',
    dotStroke:       isDarkMode ? '#1a1a1a'                   : '#ffffff',
    sectionBg:       isDarkMode ? 'rgba(255,255,255,0.04)'    : 'rgba(0,0,0,0.03)',
  };

  /* Chart geometry */
  const sparkData = pd.yearlyTrend || [];
  const VW = 300, VH = 140;
  const padT = 12, padB = 24, padL = 36, padR = 8;
  const cW = VW - padL - padR;
  const cH = VH - padT - padB;

  const fmtY = (v) => {
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}b`;
    if (v >= 1e6) return `${Math.round(v / 1e6)}m`;
    if (v >= 1e3) return `${Math.round(v / 1e3)}k`;
    return String(v);
  };

  let pts = [], gridLines = [], xLabelIndices = [], smoothLinePath = '';
  if (sparkData.length >= 2) {
    const minYr = sparkData[0].year;
    const maxYr = sparkData[sparkData.length - 1].year;
    const maxCr = Math.max(...sparkData.map(d => d.credits));
    pts = sparkData.map(d => [
      padL + ((d.year - minYr) / Math.max(maxYr - minYr, 1)) * cW,
      padT + cH - (d.credits / maxCr) * cH,
    ]);
    smoothLinePath = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];
      const cp1x = (p1[0] + (p2[0] - p0[0]) / 6).toFixed(2);
      const cp1y = (p1[1] + (p2[1] - p0[1]) / 6).toFixed(2);
      const cp2x = (p2[0] - (p3[0] - p1[0]) / 6).toFixed(2);
      const cp2y = (p2[1] - (p3[1] - p1[1]) / 6).toFixed(2);
      smoothLinePath += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
    }
    gridLines = [0.25, 0.5, 0.75].map(pct => ({
      yCoord: padT + cH - pct * cH,
      label: fmtY(maxCr * pct),
    }));
    xLabelIndices = sparkData
      .map((d, i) => ({ year: Math.floor(d.year), i }))
      .filter(({ year }) => year % 5 === 0)
      .map(({ i }) => i);
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: t.titleColor, lineHeight: 1.2 }}>
          {pd.name}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: t.closeColor,
            fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 0 0 12px', flexShrink: 0,
          }}
        >×</button>
      </div>

      {/* KPI grid — Total Credits + % of Global */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        {[
          { label: 'TOTAL CREDITS', value: formatCredits(pd.totalCred) },
          { label: '% OF GLOBAL',   value: `${pd.globalPct}%` },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: t.sectionBg, borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.labelColor, marginBottom: 3 }}>
              {label}
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#e85724' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Retirement stats */}
      {pd.creditsRetired > 0 && (
        <div style={{
          background: t.sectionBg, borderRadius: 8, padding: '10px 12px',
          borderLeft: '2px solid #e85724', marginBottom: 8,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.titleColor }}>
              Retirement Stats
            </span>
            <span style={{ fontSize: 8, color: t.labelColor, fontStyle: 'italic' }}>all-time totals</span>
          </div>
          {[
            { label: 'RETIRED',   value: formatCredits(pd.creditsRetired),   color: '#e85724'      },
            { label: 'REMAINING', value: formatCredits(pd.creditsRemaining), color: t.actNameColor },
            { label: 'RET. RATE', value: `${pd.retirementRate.toFixed(1)}%`, color: '#22a05a'      },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.labelColor }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Project Profile */}
      <div style={{
        background: t.sectionBg, borderRadius: 8, padding: '10px 12px',
        borderLeft: '2px solid #e85724', marginBottom: 8,
      }}>
        <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.titleColor, marginBottom: 8 }}>
          Project Profile
        </div>
        {[
          { label: 'TOP ACTIVITY', value: pd.topActivity },
          { label: 'ACTIVE SINCE', value: pd.minYear !== Infinity ? Math.floor(pd.minYear) : '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.labelColor }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: t.actNameColor }}>{value}</span>
          </div>
        ))}
      </div>

      {/* By Registry breakdown */}
      {pd.dynamicRegistryBreakdown && Object.keys(pd.dynamicRegistryBreakdown).length > 0 && (
        <div style={{
          background: t.sectionBg, borderRadius: 8, padding: '10px 12px',
          borderLeft: '2px solid #e85724', marginBottom: 8,
        }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.titleColor, marginBottom: 8 }}>
            By Registry
          </div>
          {Object.entries(pd.dynamicRegistryBreakdown).map(([regName, stats], idx, arr) => {
            const regRate = stats.allTimeIssued > 0
              ? ((stats.retired / stats.allTimeIssued) * 100).toFixed(1)
              : '0.0';
            const color = REGISTRY_COLORS[regName] || '#999999';
            return (
              <div key={regName}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: color + '33', color }}>
                    {regName === 'Gold Standard' ? 'GS' : regName}
                  </span>
                  {stats.projects != null && (
                    <span style={{ fontSize: 8, color: t.labelColor, fontStyle: 'italic' }}>{stats.projects} projects</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
                  {[
                    { label: 'ISSUED',  value: formatCredits(stats.issued),  color: t.actNameColor },
                    { label: 'RETIRED', value: formatCredits(stats.retired), color: '#e85724'      },
                    { label: 'RET. RATE', value: `${regRate}%`,              color: '#22a05a'      },
                  ].map(({ label, value, color: vc }) => (
                    <div key={label} style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: t.labelColor, marginBottom: 1 }}>{label}</div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: vc }}>{value}</div>
                    </div>
                  ))}
                </div>
                {idx < arr.length - 1 && (
                  <div style={{ borderTop: `0.5px solid ${t.dividerColor}`, margin: '6px 0' }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Insights */}
      {pd.insights?.length > 0 && (
        <div style={{
          background: t.sectionBg, borderRadius: 8, padding: '10px 12px',
          borderLeft: '2px solid #e85724', marginBottom: 8,
        }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.titleColor, marginBottom: 8 }}>
            Insights
          </div>
          {pd.insights.map((insight, i) => (
            <div key={i} style={{
              fontSize: 10,
              color: t.insightColor,
              background: t.insightBg,
              borderLeft: '2px solid #F37E51',
              padding: '6px 8px',
              borderRadius: '0 3px 3px 0',
              lineHeight: 1.5,
              marginBottom: 6,
            }}>
              {insight}
            </div>
          ))}
        </div>
      )}

      {/* VCM Contribution to Decarbonisation */}
      {pd.co2HasMapping && (
        <div style={{
          background: t.sectionBg, borderRadius: 8, padding: '10px 12px',
          borderLeft: '2px solid #22a05a', marginBottom: 8,
        }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.titleColor, marginBottom: 4 }}>
            VCM Contribution to Decarbonisation
          </div>
          <div style={{ fontSize: 9, color: t.labelColor, marginBottom: 8 }}>
            Credits abated as % of national CO₂ emissions
          </div>
          {pd.co2Loading ? (
            <div style={{ fontSize: 10, color: t.labelColor, fontStyle: 'italic' }}>Fetching emissions data…</div>
          ) : pd.co2Contribution != null ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#22a05a', marginBottom: 4 }}>
                {pd.co2Contribution.toFixed(2)}%
              </div>
              <div style={{ fontSize: 8, color: t.labelColor, fontStyle: 'italic' }}>
                Based on World Bank CO₂ data (EN.GHG.CO2.MT.CE.AR5)
              </div>
            </>
          ) : (
            <div style={{ fontSize: 10, color: t.labelColor, fontStyle: 'italic' }}>Emissions data unavailable</div>
          )}
        </div>
      )}

      {/* Credits Over Time chart */}
      {sparkData.length >= 2 && (
        <>
          <div style={{ borderTop: `1px solid ${t.dividerColor}`, margin: '14px 0 10px' }} />
          <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.labelColor, marginBottom: 8 }}>
            Credits over time
          </div>
          <div style={{ position: 'relative', width: '100%', flexShrink: 0 }}>
            <svg
              viewBox={`0 0 ${VW} ${VH}`}
              width="100%"
              height="160"
              preserveAspectRatio="none"
              overflow="visible"
              style={{ display: 'block', overflow: 'visible' }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const mouseXPct = (e.clientX - rect.left) / rect.width;
                let bestIdx = 0, bestDist = Infinity;
                pts.forEach(([x], i) => {
                  const dist = Math.abs(x / VW - mouseXPct);
                  if (dist < bestDist) { bestDist = dist; bestIdx = i; }
                });
                setHoveredPoint(bestIdx);
              }}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              {/* Grid lines */}
              {gridLines.map(({ yCoord, label }, i) => (
                <g key={i}>
                  <line
                    x1={padL} y1={yCoord} x2={VW - padR} y2={yCoord}
                    stroke={t.gridColor}
                    strokeWidth="0.5"
                    strokeDasharray="3,3"
                  />
                  <text x={padL - 3} y={yCoord + 3} fontSize="7" fill={t.chartLabelColor} textAnchor="end">
                    {label}
                  </text>
                </g>
              ))}

              {/* Line */}
              <path
                d={smoothLinePath}
                fill="none"
                stroke="#e85724"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* Data points */}
              {pts.map(([x, y], i) => (
                <circle
                  key={i}
                  cx={x} cy={y}
                  r={hoveredPoint === i ? 4 : 2.5}
                  fill="#e85724"
                  stroke={t.dotStroke}
                  strokeWidth="1.5"
                />
              ))}

              {/* X-axis labels */}
              {xLabelIndices.map((idx, pos) => (
                <text
                  key={idx}
                  x={pts[idx][0]}
                  y={VH - 5}
                  fontSize="7"
                  fill={t.chartLabelColor}
                  textAnchor={pos === 0 ? 'start' : pos === xLabelIndices.length - 1 ? 'end' : 'middle'}
                >
                  {sparkData[idx].year}
                </text>
              ))}
            </svg>

            {/* Hover tooltip */}
            {hoveredPoint !== null && (
              <div style={{
                position: 'absolute',
                left: `${(pts[hoveredPoint][0] / VW) * 100}%`,
                top: `${(pts[hoveredPoint][1] / VH) * 160}px`,
                transform: 'translate(-50%, -140%)',
                background: 'rgba(20,20,20,0.92)',
                color: '#ffffff',
                fontSize: 9,
                fontWeight: 600,
                padding: '3px 7px',
                borderRadius: 3,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                zIndex: 10,
                letterSpacing: '0.05em',
              }}>
                {sparkData[hoveredPoint].year}: {fmtY(sparkData[hoveredPoint].credits)}
              </div>
            )}
          </div>
        </>
      )}

      {/* Credits by Activity */}
      <div style={{
        background: t.sectionBg, borderRadius: 8, padding: '10px 12px',
        borderLeft: '2px solid #e85724', marginBottom: 8,
      }}>
        <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.titleColor, marginBottom: 10 }}>
          Credits by Activity
        </div>
        {pd.actBreakdown.slice(0, 8).map(({ name, credits }) => (
          <div key={name} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: t.actNameColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                {name}
              </span>
              <span style={{ fontSize: 10, color: t.actCredColor, flexShrink: 0, marginLeft: 6 }}>
                {formatCredits(credits)}
              </span>
            </div>
            <div style={{ height: 4, background: t.actBarBg, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(credits / maxAct) * 100}%`, background: '#e85724', borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

/* ─── Main component ─── */
const CountryExplorer = ({ data, isDarkMode, initialCountry }) => {
  const mapRef = useRef(null);
  const hasLoggedRef = useRef(false);
  const initialCountryRef = useRef(initialCountry);
  const [hoveredCountry,  setHoveredCountry]  = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [panelOpen,       setPanelOpen]       = useState(false);
  const [cursor,          setCursor]          = useState('');
  const [mapLoaded,       setMapLoaded]       = useState(false);
  const [co2Data,         setCo2Data]         = useState({});
  const [co2Loading,      setCo2Loading]      = useState(false);

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

  const fillLayer = useMemo(() => ({
    id: 'country-fill',
    type: 'fill',
    source: 'country-boundaries',
    'source-layer': 'country_boundaries',
    filter: ['==', ['get', 'disputed'], 'false'],
    paint: {
      'fill-color': '#e85724',
      'fill-opacity': fillOpacityExpression,
    },
  }), [fillOpacityExpression]);

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
    const registryMap = {};
    const seenVintage = new Set();
    const perYearAbated = {};
    records.forEach(r => {
      const reg = r.registry;
      if (!registryMap[reg]) registryMap[reg] = { issued: 0, retired: 0, projectIds: new Set() };
      registryMap[reg].issued += r.credits || 0;
      // vintage_credits_retired repeats across all category rows for same (reg, year)
      // — de-duplicate by (registry, year) before summing
      const vintageKey = `${reg}|${r.year}`;
      if (!seenVintage.has(vintageKey)) {
        seenVintage.add(vintageKey);
        registryMap[reg].retired += r.vintageCreditsRetired || 0;
        perYearAbated[Math.floor(r.year)] = (perYearAbated[Math.floor(r.year)] || 0) + (r.vintageCreditsRetired || 0);
      }
      // projectIds: Set union — idempotent, handles category-row repetition automatically
      (r.projectIds || []).forEach(id => registryMap[reg].projectIds.add(id));
    });
    const co2HasMapping = !!COUNTRY_ISO2_MAP[selectedCountry.dataName];
    const countryEmissions = co2Data[selectedCountry.dataName] || null;
    let co2Contribution = null;
    if (countryEmissions) {
      let totalAbated = 0, totalEmissions = 0;
      Object.entries(perYearAbated).forEach(([yr, abated]) => {
        const emissions = countryEmissions[parseInt(yr)];
        if (emissions > 0) { totalAbated += abated; totalEmissions += emissions; }
      });
      if (totalEmissions > 0) co2Contribution = (totalAbated / totalEmissions) * 100;
    }
    const dynamicRegistryBreakdown = Object.keys(registryMap).length > 0
      ? Object.fromEntries(
          Object.keys(registryMap).map(reg => [
            reg, {
              issued: registryMap[reg].issued,
              retired: registryMap[reg].retired,
              allTimeIssued: registryMap[reg].issued,
              projects: registryMap[reg].projectIds.size || null,
            }
          ])
        )
      : null;
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
    const yearMap = {};
    records.forEach(r => {
      const yr = Math.floor(r.year);
      if (yr > 0 && yr <= 2025) yearMap[yr] = (yearMap[yr] || 0) + r.credits;
    });
    const yearlyTrend = Object.entries(yearMap)
      .map(([y, c]) => ({ year: parseInt(y), credits: c }))
      .sort((a, b) => a.year - b.year);
    // Per-country lifetime totals — take from first record (values are identical across all rows)
    const creditsRetired    = records[0]?.creditsRetired   ?? 0;
    const creditsRemaining  = records[0]?.creditsRemaining ?? 0;
    const retirementRate    = records[0]?.retirementRate   ?? 0;
    return { name: selectedCountry.dataName, totalCred, globalPct, topActivity, minYear, actBreakdown, registries, insights, yearlyTrend, creditsRetired, creditsRemaining, retirementRate, dynamicRegistryBreakdown, co2HasMapping, co2Loading, co2Contribution };
  }, [selectedCountry, data, co2Data, co2Loading]);

  /* ─── Event handlers ─── */
  const handleMouseMove = useCallback((e) => {
    if (!e.lngLat) return;
    try {
      const features = e.target.queryRenderedFeatures(e.point, { layers: ['country-fill'] });
      if (features[0] && !hasLoggedRef.current) {
        console.log('[CountryExplorer] feature props sample:', features[0].properties);
        hasLoggedRef.current = true;
      }
      const name = features[0]?.properties?.name_en ?? null;
      setHoveredCountry(name);
      setCursor(name ? 'pointer' : '');
    } catch (err) {
      // Silently ignore Mapbox internal errors during mousemove
    }
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
    if (!e.lngLat) return;
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

  /* ─── Auto-open from Overview map click ─── */
  useEffect(() => {
    if (!mapLoaded || !initialCountryRef.current) return;
    const ic = initialCountryRef.current;
    initialCountryRef.current = null;
    const mapboxName = DATA_TO_MAPBOX[ic] || ic;
    const credits = data.creditsByCountry?.find(c => c.name === ic)?.credits || 0;
    openCountry(ic, mapboxName, credits);
  }, [mapLoaded, data, openCountry]);

  /* ─── Fetch World Bank CO₂ data for selected country ─── */
  useEffect(() => {
    if (!selectedCountry) return;
    const name = selectedCountry.dataName;
    const iso2 = COUNTRY_ISO2_MAP[name];
    if (!iso2 || co2Data[name]) return;
    setCo2Loading(true);
    fetch(
      `https://api.worldbank.org/v2/country/${iso2}/indicator/EN.GHG.CO2.MT.CE.AR5?format=json&date=1990:2024&per_page=50`
    )
      .then(r => r.json())
      .then(response => {
        const yearMap = {};
        const records = (Array.isArray(response) && response.length > 1)
          ? response[1]
          : null;
        (records || []).forEach(rec => {
          if (rec.value != null) yearMap[parseInt(rec.date)] = rec.value * 1e6;
        });
        setCo2Data(prev => ({ ...prev, [name]: yearMap }));
      })
      .catch(() => {})
      .finally(() => setCo2Loading(false));
  }, [selectedCountry, co2Data]);

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
        interactiveLayerIds={mapLoaded ? ['country-fill'] : []}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleCountryClick}
        onLoad={() => setMapLoaded(true)}
        onError={(e) => { if (e.error?.message?.includes("reading '0'")) return; console.error(e); }}
      >
        {mapLoaded && data?.creditsByCountry?.length > 0 && (
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

      <div className={`country-detail-panel${panelOpen ? ' open' : ''}${!isDarkMode ? ' light' : ''}`}>
        {countryPanelInfo && (
          <CountryPanel data={countryPanelInfo} onClose={handleReset} isDarkMode={isDarkMode} />
        )}
      </div>
    </div>
  );
};

export default CountryExplorer;
