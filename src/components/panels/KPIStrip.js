import { useMemo } from 'react';
import { formatCredits, formatPct, getGroup, GROUP_COLORS, REGISTRY_COLORS } from '../../utils/formatters';
import countryISO from '../../utils/countryISO';

const formatTrend = (t) => {
  if (!t) return null;
  const sign = t.pct >= 0 ? '+' : '';
  return `${sign}${t.pct}%`;
};

const Sparkline = ({ values, width = 48, height = 16 }) => {
  if (!values || values.length < 2) return null;
  const W = 200, H = height, PAD = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => [
    PAD + (i / (values.length - 1)) * (W - PAD * 2),
    H - PAD - ((v - min) / range) * (H - PAD * 2),
  ]);
  const linePoints = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const fillPoints = [
    ...pts,
    [pts[pts.length - 1][0], H],
    [pts[0][0], H],
  ].map(([x, y]) => `${x},${y}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <polygon points={fillPoints} fill="var(--orange)" fillOpacity="0.15" />
      <polyline
        points={linePoints}
        fill="none"
        stroke="var(--orange)"
        strokeOpacity="0.6"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

const DonutRing = ({ pct, color = '#029bd6' }) => {
  const r = 11;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(pct || 0, 100) / 100) * circ;
  return (
    <svg width="26" height="26" viewBox="0 0 26 26">
      <circle cx="13" cy="13" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
      <circle
        cx="13" cy="13" r={r} fill="none"
        stroke={color || '#029bd6'} strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 13 13)"
      />
    </svg>
  );
};

const SECTOR_ORDER = ['Forest & Nature', 'Energy', 'Agriculture', 'Waste & Industrial'];

const SectorBars = ({ sectors }) => {
  const max = Math.max(...sectors.map(s => s.credits), 1);
  const BAR_W = 6, GAP = 2, H = 22;
  const totalW = SECTOR_ORDER.length * (BAR_W + GAP) - GAP;
  return (
    <svg width={totalW} height={H}>
      {sectors.map((s, i) => {
        const bh = Math.max(2, (s.credits / max) * H);
        return (
          <rect
            key={s.name}
            x={i * (BAR_W + GAP)} y={H - bh}
            width={BAR_W} height={bh}
            fill={GROUP_COLORS[s.name] || '#888'} fillOpacity="0.85" rx="1"
          />
        );
      })}
    </svg>
  );
};

const RegistryBar = ({ segments, width = 48, height = 5 }) => {
  const total = segments.reduce((s, r) => s + r.projectCount, 0) || 1;
  let x = 0;
  return (
    <svg width={width} height={height} style={{ borderRadius: 2, overflow: 'hidden', display: 'block' }}>
      {segments.map(seg => {
        const w = (seg.projectCount / total) * width;
        const rect = (
          <rect
            key={seg.name}
            x={x} y="0" width={Math.max(w, 0)} height={height}
            fill={REGISTRY_COLORS[seg.name] || '#888'}
          />
        );
        x += w;
        return rect;
      })}
    </svg>
  );
};

const REGISTRY_SHORT = { 'Verra': 'VCS', 'Gold Standard': 'GS', 'ACR': 'ACR', 'CAR': 'CAR' };

const KPIStrip = ({ data, selectedActivity, activeGroup }) => {
  const {
    totalCredits = 0,
    creditsByRegistry,
    creditsByCountry,
    allActivities,
    creditsByGroup = {},
    creditsByActivity = [],
    filteredCountry = [],
    filteredAgg = [],
    projectCountByCategory = {},
    totalProjectCount = 0,
    registryStats = {},
  } = data || {};

  let topRegistry, topCountry, topRegPct;
  if (selectedActivity) {
    const actAgg = filteredAgg.filter(d => d.category === selectedActivity);
    const actTotal = actAgg.reduce((s, d) => s + d.credits, 0);
    const regMap = {};
    actAgg.forEach(d => { regMap[d.registry] = (regMap[d.registry] || 0) + d.credits; });
    topRegistry = Object.entries(regMap)
      .map(([name, credits]) => ({ name, credits }))
      .sort((a, b) => b.credits - a.credits)[0];
    topRegPct = topRegistry && actTotal > 0 ? (topRegistry.credits / actTotal) * 100 : 0;
    const actCountry = filteredCountry.filter(d => d.category === selectedActivity);
    const countryMap = {};
    actCountry.forEach(d => { countryMap[d.country] = (countryMap[d.country] || 0) + d.credits; });
    topCountry = Object.entries(countryMap)
      .map(([name, credits]) => ({ name, credits }))
      .sort((a, b) => b.credits - a.credits)[0];
  } else if (activeGroup) {
    const groupAgg = filteredAgg.filter(d => getGroup(d.category) === activeGroup);
    const groupTotal = groupAgg.reduce((s, d) => s + d.credits, 0);
    const regMap = {};
    groupAgg.forEach(d => { regMap[d.registry] = (regMap[d.registry] || 0) + d.credits; });
    topRegistry = Object.entries(regMap)
      .map(([name, credits]) => ({ name, credits }))
      .sort((a, b) => b.credits - a.credits)[0];
    topRegPct = topRegistry && groupTotal > 0 ? (topRegistry.credits / groupTotal) * 100 : 0;
    const groupCountry = filteredCountry.filter(d => getGroup(d.category) === activeGroup);
    const countryMap = {};
    groupCountry.forEach(d => { countryMap[d.country] = (countryMap[d.country] || 0) + d.credits; });
    topCountry = Object.entries(countryMap)
      .map(([name, credits]) => ({ name, credits }))
      .sort((a, b) => b.credits - a.credits)[0];
  } else {
    topRegistry = creditsByRegistry?.[0];
    topCountry = creditsByCountry?.[0];
    topRegPct = topRegistry && totalCredits > 0 ? (topRegistry.credits / totalCredits) * 100 : 0;
  }

  const topRegName = topRegistry?.name;
  const topCountryName = topCountry?.name;

  // Sparkline series — all hooks called unconditionally before any return
  const creditsByYearSeries = useMemo(() => {
    const map = {};
    filteredAgg.forEach(d => { map[d.year] = (map[d.year] || 0) + d.credits; });
    return Object.entries(map).sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  }, [filteredAgg]);

  const countriesByYearSeries = useMemo(() => {
    const map = {};
    filteredCountry.forEach(d => {
      if (!map[d.year]) map[d.year] = new Set();
      map[d.year].add(d.country);
    });
    return Object.entries(map).sort((a, b) => a[0] - b[0]).map(([, s]) => s.size);
  }, [filteredCountry]);

  const topRegShareByYearSeries = useMemo(() => {
    const totalMap = {};
    const regMap = {};
    filteredAgg.forEach(d => {
      totalMap[d.year] = (totalMap[d.year] || 0) + d.credits;
      if (d.registry === topRegName) regMap[d.year] = (regMap[d.year] || 0) + d.credits;
    });
    return Object.keys(totalMap).sort((a, b) => a - b)
      .map(yr => totalMap[yr] > 0 ? (regMap[yr] || 0) / totalMap[yr] * 100 : 0);
  }, [filteredAgg, topRegName]);

  const topCountryByYearSeries = useMemo(() => {
    if (!topCountryName) return [];
    const map = {};
    filteredCountry.forEach(d => {
      if (d.country === topCountryName) map[d.year] = (map[d.year] || 0) + d.credits;
    });
    return Object.entries(map).sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  }, [filteredCountry, topCountryName]);

  const creditsTrend = useMemo(() => {
    const entries = Object.entries(
      filteredAgg.reduce((m, d) => { m[d.year] = (m[d.year] || 0) + d.credits; return m; }, {})
    ).sort((a, b) => Number(a[0]) - Number(b[0]));
    if (entries.length < 2) return null;
    const base = entries[0][1];
    return base ? { pct: Math.round((entries[entries.length - 1][1] - base) / base * 100), year: Number(entries[0][0]) } : null;
  }, [filteredAgg]);

  const countriesTrend = useMemo(() => {
    const entries = Object.entries(
      filteredCountry.reduce((m, d) => {
        if (!m[d.year]) m[d.year] = new Set();
        m[d.year].add(d.country);
        return m;
      }, {})
    ).sort((a, b) => Number(a[0]) - Number(b[0]));
    if (entries.length < 2) return null;
    const firstCount = entries[0][1].size;
    const lastCount = entries[entries.length - 1][1].size;
    return firstCount ? { pct: Math.round((lastCount - firstCount) / firstCount * 100), count: lastCount - firstCount, year: Number(entries[0][0]) } : null;
  }, [filteredCountry]);

  const topRegShareTrend = useMemo(() => {
    if (!topRegName) return null;
    const totalMap = {}, regMap = {};
    filteredAgg.forEach(d => {
      totalMap[d.year] = (totalMap[d.year] || 0) + d.credits;
      if (d.registry === topRegName) regMap[d.year] = (regMap[d.year] || 0) + d.credits;
    });
    const yrs = Object.keys(totalMap).sort((a, b) => Number(a) - Number(b));
    if (yrs.length < 2) return null;
    const baseShare = totalMap[yrs[0]] > 0 ? (regMap[yrs[0]] || 0) / totalMap[yrs[0]] * 100 : 0;
    const lastShare = totalMap[yrs[yrs.length - 1]] > 0 ? (regMap[yrs[yrs.length - 1]] || 0) / totalMap[yrs[yrs.length - 1]] * 100 : 0;
    return baseShare ? { pct: Math.round((lastShare - baseShare) / baseShare * 100), year: Number(yrs[0]) } : null;
  }, [filteredAgg, topRegName]);

  const topCountryTrend = useMemo(() => {
    if (!topCountryName) return null;
    const entries = Object.entries(
      filteredCountry.reduce((m, d) => {
        if (d.country === topCountryName) m[d.year] = (m[d.year] || 0) + d.credits;
        return m;
      }, {})
    ).sort((a, b) => Number(a[0]) - Number(b[0]));
    if (entries.length < 2) return null;
    const base = entries[0][1];
    return base ? { pct: Math.round((entries[entries.length - 1][1] - base) / base * 100), year: Number(entries[0][0]) } : null;
  }, [filteredCountry, topCountryName]);

  const sectorCredits = useMemo(() => {
    const map = {};
    creditsByActivity.forEach(a => { if (a.group) map[a.group] = (map[a.group] || 0) + a.credits; });
    return SECTOR_ORDER.map(g => ({ name: g, credits: map[g] || 0 }));
  }, [creditsByActivity]);

  const registryProjectShare = useMemo(() => {
    return Object.entries(registryStats)
      .map(([name, stats]) => ({ name, projectCount: stats.projectCount || 0 }))
      .sort((a, b) => b.projectCount - a.projectCount);
  }, [registryStats]);

  // Early exit after all hooks
  if (!data) return null;

  const displayCredits = selectedActivity
    ? (creditsByActivity.find(a => a.name === selectedActivity)?.credits || 0)
    : activeGroup
      ? (creditsByGroup[activeGroup] || 0)
      : totalCredits;

  const displayActivityCount = activeGroup
    ? creditsByActivity.filter(a => a.group === activeGroup).length
    : (allActivities?.length || 0);

  const displayCountryCount = selectedActivity
    ? (() => {
        const s = new Set();
        filteredCountry.filter(d => d.category === selectedActivity).forEach(d => s.add(d.country));
        return s.size;
      })()
    : activeGroup
      ? (() => {
          const s = new Set();
          filteredCountry.forEach(d => {
            if (getGroup(d.category) === activeGroup) s.add(d.country);
          });
          return s.size;
        })()
      : (creditsByCountry?.length || 0);

  const displayProjectCount = selectedActivity
    ? (projectCountByCategory[selectedActivity] || 0)
    : activeGroup
      ? Object.entries(projectCountByCategory)
          .filter(([cat]) => getGroup(cat) === activeGroup)
          .reduce((s, [, c]) => s + c, 0)
      : totalProjectCount;

  const topSector = sectorCredits.reduce(
    (b, s) => s.credits > b.credits ? s : b,
    { name: '', credits: 0 }
  );
  const topProjectReg = registryProjectShare[0];

  return (
    <div className="kpi-strip overview-kpi-strip">
      <div className="kpi-item">
        <div className="kpi-label">Total credits</div>
        <div className="kpi-value-row">
          <div className="kpi-value">{formatCredits(displayCredits)}</div>
          <Sparkline values={creditsByYearSeries} width={60} height={22} />
        </div>
        <div className="kpi-bottom">
          <span className={`kpi-context ${(creditsTrend?.pct ?? 0) >= 0 ? 'pos' : 'neg'}`}>
            {creditsTrend ? `${creditsTrend.pct >= 0 ? '↗ +' : '↘ '}${Math.abs(creditsTrend.pct)}%` : '—'}
          </span>
        </div>
      </div>

      <div className="kpi-item">
        <div className="kpi-label">Countries</div>
        <div className="kpi-value-row">
          <div className="kpi-value">{displayCountryCount}</div>
          <Sparkline values={countriesByYearSeries} width={60} height={22} />
        </div>
        <div className="kpi-bottom">
          <span className={`kpi-context ${(countriesTrend?.count ?? 0) >= 0 ? 'pos' : 'neg'}`}>
            {countriesTrend ? `${countriesTrend.count >= 0 ? '↗ +' : '↘ '}${Math.abs(countriesTrend.count)}` : '—'}
          </span>
        </div>
      </div>

      <div className="kpi-item">
        <div className="kpi-label">Top registry</div>
        <div className="kpi-value-row">
          <div className="kpi-value">{topRegistry?.name || '—'}</div>
          <DonutRing pct={topRegPct} color={REGISTRY_COLORS[topRegistry?.name]} />
        </div>
        <div className="kpi-bottom">
          <span className="kpi-context muted">{formatPct(topRegPct)} share</span>
        </div>
      </div>

      <div className="kpi-item">
        <div className="kpi-label">Leading country</div>
        <div className="kpi-value-row">
          <div className="kpi-value" title={topCountry?.name || ''}>
            {topCountry ? (countryISO[topCountry.name] ?? topCountry.name.slice(0, 3).toUpperCase()) : '—'}
          </div>
          <Sparkline values={topCountryByYearSeries} width={60} height={22} />
        </div>
        <div className="kpi-bottom">
          <span className={`kpi-context ${(topCountryTrend?.pct ?? 0) >= 0 ? 'pos' : 'neg'}`}>
            {topCountryTrend ? `${topCountryTrend.pct >= 0 ? '↗ +' : '↘ '}${Math.abs(topCountryTrend.pct)}%` : '—'}
          </span>
        </div>
      </div>

      <div className="kpi-item">
        <div className="kpi-label">Activities</div>
        <div className="kpi-value-row">
          <div className="kpi-value">{displayActivityCount}</div>
          <SectorBars sectors={sectorCredits} />
        </div>
        <div className="kpi-bottom">
          <span className="kpi-context muted">
            {topSector.credits > 0
              ? `${topSector.name.split(' ')[0]} ${formatPct(topSector.credits / (totalCredits || 1) * 100)}`
              : '—'}
          </span>
        </div>
      </div>

      <div className="kpi-item">
        <div className="kpi-label">Projects</div>
        <div className="kpi-value-row">
          <div className="kpi-value">
            {displayProjectCount > 0 ? displayProjectCount.toLocaleString() : '—'}
          </div>
          <RegistryBar segments={registryProjectShare} width={60} height={7} />
        </div>
        <div className="kpi-bottom">
          <span className="kpi-context muted">
            {topProjectReg
              ? `${REGISTRY_SHORT[topProjectReg.name] ?? topProjectReg.name} ${formatPct(topProjectReg.projectCount / (totalProjectCount || 1) * 100)}`
              : '—'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default KPIStrip;
