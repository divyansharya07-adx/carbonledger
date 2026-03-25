import { useMemo } from 'react';
import { formatCredits, formatPct, getGroup } from '../../utils/formatters';

const Sparkline = ({ values }) => {
  if (!values || values.length < 2) return null;
  const W = 200, H = 20, PAD = 4;
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
    <div className="kpi-sparkline">
      <svg width="100%" height="20" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
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
    </div>
  );
};

const KPIStrip = ({ data, selectedActivity, activeGroup }) => {
  // Destructure with safe fallbacks so hooks below always run unconditionally
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

  const activityLabel = !activeGroup && selectedActivity && selectedActivity !== 'all'
    ? selectedActivity
    : null;

  return (
    <div className="kpi-strip overview-kpi-strip">
      <div className="kpi-item">
        <div className="kpi-label">TOTAL CREDITS</div>
        <div className="kpi-value">{formatCredits(displayCredits)}</div>
        {activeGroup && <div className="kpi-sub orange">{activeGroup}</div>}
        {activityLabel && <div className="kpi-sub orange">{activityLabel}</div>}
        {!activeGroup && !activityLabel && <div className="kpi-sub muted">across all registries</div>}
        <Sparkline values={creditsByYearSeries} />
      </div>
      <div className="kpi-item">
        <div className="kpi-label">COUNTRIES ACTIVE</div>
        <div className="kpi-value">{displayCountryCount}</div>
        <div className="kpi-sub muted">with active projects</div>
        <Sparkline values={countriesByYearSeries} />
      </div>
      <div className="kpi-item">
        <div className="kpi-label">TOP REGISTRY</div>
        <div className="kpi-value">{topRegistry?.name || '—'}</div>
        <div className="kpi-sub blue">{formatPct(topRegPct)} share</div>
        <Sparkline values={topRegShareByYearSeries} />
      </div>
      <div className="kpi-item">
        <div className="kpi-label">LEADING COUNTRY</div>
        <div className="kpi-value">{topCountry?.name || '—'}</div>
        <div className="kpi-sub green">{formatCredits(topCountry?.credits || 0)}</div>
        <Sparkline values={topCountryByYearSeries} />
      </div>
      <div className="kpi-item">
        <div className="kpi-label">PROJECT ACTIVITIES</div>
        <div className="kpi-value">{displayActivityCount}</div>
        <div className="kpi-sub muted">unique categories</div>
      </div>
      <div className="kpi-item">
        <div className="kpi-label">PROJECT COUNT</div>
        <div className="kpi-value">
          {displayProjectCount > 0 ? displayProjectCount.toLocaleString() : '—'}
        </div>
        <div className="kpi-sub muted">verified projects</div>
      </div>
    </div>
  );
};

export default KPIStrip;
