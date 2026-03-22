import { formatCredits, formatPct, getGroup } from '../../utils/formatters';

const KPIStrip = ({ data, selectedActivity, activeGroup }) => {
  if (!data) return null;

  const { totalCredits, creditsByRegistry, creditsByCountry, allActivities, creditsByGroup, creditsByActivity, filteredCountry, filteredAgg, projectCountByCategory, totalProjectCount } = data;

  let topRegistry, topCountry, topRegPct;
  if (selectedActivity) {
    const actAgg = filteredAgg?.filter(d => d.category === selectedActivity) || [];
    const actTotal = actAgg.reduce((s, d) => s + d.credits, 0);
    const regMap = {};
    actAgg.forEach(d => { regMap[d.registry] = (regMap[d.registry] || 0) + d.credits; });
    topRegistry = Object.entries(regMap)
      .map(([name, credits]) => ({ name, credits }))
      .sort((a, b) => b.credits - a.credits)[0];
    topRegPct = topRegistry && actTotal > 0 ? (topRegistry.credits / actTotal) * 100 : 0;
    const actCountry = filteredCountry?.filter(d => d.category === selectedActivity) || [];
    const countryMap = {};
    actCountry.forEach(d => { countryMap[d.country] = (countryMap[d.country] || 0) + d.credits; });
    topCountry = Object.entries(countryMap)
      .map(([name, credits]) => ({ name, credits }))
      .sort((a, b) => b.credits - a.credits)[0];
  } else if (activeGroup) {
    const groupAgg = filteredAgg?.filter(d => getGroup(d.category) === activeGroup) || [];
    const groupTotal = groupAgg.reduce((s, d) => s + d.credits, 0);
    const regMap = {};
    groupAgg.forEach(d => { regMap[d.registry] = (regMap[d.registry] || 0) + d.credits; });
    topRegistry = Object.entries(regMap)
      .map(([name, credits]) => ({ name, credits }))
      .sort((a, b) => b.credits - a.credits)[0];
    topRegPct = topRegistry && groupTotal > 0 ? (topRegistry.credits / groupTotal) * 100 : 0;
    const groupCountry = filteredCountry?.filter(d => getGroup(d.category) === activeGroup) || [];
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
        filteredCountry?.filter(d => d.category === selectedActivity).forEach(d => s.add(d.country));
        return s.size;
      })()
    : activeGroup
      ? (() => {
          const s = new Set();
          filteredCountry?.forEach(d => {
            if (getGroup(d.category) === activeGroup) s.add(d.country);
          });
          return s.size;
        })()
      : (creditsByCountry?.length || 0);

  const displayProjectCount = selectedActivity
    ? (projectCountByCategory?.[selectedActivity] || 0)
    : activeGroup
      ? Object.entries(projectCountByCategory || {})
          .filter(([cat]) => getGroup(cat) === activeGroup)
          .reduce((s, [, c]) => s + c, 0)
      : (totalProjectCount || 0);

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
      </div>
      <div className="kpi-item">
        <div className="kpi-label">COUNTRIES ACTIVE</div>
        <div className="kpi-value">{displayCountryCount}</div>
      </div>
      <div className="kpi-item">
        <div className="kpi-label">TOP REGISTRY</div>
        <div className="kpi-value">{topRegistry?.name || '—'}</div>
        <div className="kpi-sub blue">{formatPct(topRegPct)} share</div>
      </div>
      <div className="kpi-item">
        <div className="kpi-label">LEADING COUNTRY</div>
        <div className="kpi-value">{topCountry?.name || '—'}</div>
        <div className="kpi-sub green">{formatCredits(topCountry?.credits || 0)}</div>
      </div>
      <div className="kpi-item">
        <div className="kpi-label">PROJECT ACTIVITIES</div>
        <div className="kpi-value">{displayActivityCount}</div>
      </div>
      <div className="kpi-item">
        <div className="kpi-label">PROJECT COUNT</div>
        <div className="kpi-value">
          {displayProjectCount > 0 ? displayProjectCount.toLocaleString() : '—'}
        </div>
      </div>
    </div>
  );
};

export default KPIStrip;
