import { useMemo } from 'react';
import { formatCredits, getGroup, GROUP_COLORS } from '../../utils/formatters';

const InsightCards = ({ data, selectedActivity }) => {
  const insights = useMemo(() => {
    if (!data) return [];

    const { creditsByActivity, creditsByCountry, totalCredits, creditsByGroup, filteredAgg = [] } = data;

    // Retirement rate — authoritative from project_counts.csv (per-registry lifetime totals)
    const retirementRate = data.globalRetirementRate ?? 0;
    const totalRetired   = data.globalCreditsRetired ?? 0;

    // Top registry by retirement rate — computed from filteredAgg
    const regRetired = {};
    const retSeen = new Set();
    filteredAgg.forEach(d => {
      const key = `${d.registry}|${d.category}`;
      if (!retSeen.has(key)) {
        retSeen.add(key);
        regRetired[d.registry] = (regRetired[d.registry] || 0) + d.creditsRetired;
      }
    });
    const regIssued = {};
    filteredAgg.forEach(d => { regIssued[d.registry] = (regIssued[d.registry] || 0) + d.credits; });

    const topRetReg = Object.entries(regRetired)
      .map(([reg, ret]) => ({ reg, rate: regIssued[reg] > 0 ? ret / regIssued[reg] * 100 : 0 }))
      .sort((a, b) => b.rate - a.rate)[0];

    const retirementCard = {
      accentColor: '#CCDF84',
      tag: 'RETIREMENT RATE',
      heroStat: `${retirementRate.toFixed(1)}%`,
      description: (
        <>
          <strong>{formatCredits(totalRetired)}</strong> credits retired.
          {topRetReg && <> {topRetReg.reg} leads at <strong>{topRetReg.rate.toFixed(1)}%</strong>.</>}
        </>
      ),
    };

    if (selectedActivity) {
      const actData = creditsByActivity.find(a => a.name === selectedActivity);
      if (!actData) return [];
      const group = getGroup(selectedActivity);
      const actCountries = data.getActivityCountries(selectedActivity);
      const topCountry = actCountries?.[0];
      const pct = totalCredits > 0 ? ((actData.credits / totalCredits) * 100).toFixed(1) : '0';

      return [
        {
          accentColor: GROUP_COLORS[group] || '#8cb73f',
          tag: 'ACTIVITY SHARE',
          heroStat: `${pct}%`,
          description: (
            <>
              <strong>{selectedActivity}</strong> represents {pct}% of the total market.
              Part of the <strong>{group}</strong> group.
            </>
          ),
        },
        retirementCard,
        {
          accentColor: '#e85724',
          tag: 'COUNTRY #1',
          heroStat: topCountry ? formatCredits(topCountry.credits) : '—',
          description: topCountry
            ? <><strong>{topCountry.name}</strong> leads with {formatCredits(topCountry.credits)} credits. {actCountries.length} countries active in this category.</>
            : <>No country data for this activity.</>,
        },
        {
          accentColor: '#8cb73f',
          tag: 'COUNTRIES',
          heroStat: String(actCountries.length),
          description: (
            <>
              <strong>{actCountries.length}</strong> countries participate in this activity.
              {topCountry && <> Top market: <strong>{topCountry.name}</strong>.</>}
            </>
          ),
        },
      ];
    }

    // Default market insights — 4 cards
    const topActivity = creditsByActivity?.[0];
    const topCountry = creditsByCountry?.[0];

    const topGroup = Object.entries(creditsByGroup).sort((a, b) => b[1] - a[1])[0];
    const topGroupName = topGroup?.[0] || 'Forest & Nature';
    const topGroupShare = topGroup && totalCredits > 0
      ? ((topGroup[1] / totalCredits) * 100).toFixed(1)
      : '0';
    const topGroupColor = GROUP_COLORS[topGroupName] || '#8cb73f';

    const secondCountry = creditsByCountry?.[1];
    const secondCountryPct = secondCountry && totalCredits > 0
      ? ((secondCountry.credits / totalCredits) * 100).toFixed(1)
      : '0';
    const secondCountryTopAct = secondCountry
      ? Object.entries(data.creditsByCountryAndActivity?.[secondCountry.name] || {})
          .sort((a, b) => b[1] - a[1])[0]?.[0]
      : null;

    return [
      {
        accentColor: topGroupColor,
        tag: 'CATEGORY',
        heroStat: `${topGroupShare}%`,
        description: (
          <>
            <strong>{topGroupName}</strong> leads with {topGroupShare}% of all credits.
            {topActivity && <> {topActivity.name} is the largest activity at {formatCredits(topActivity.credits)}.</>}
          </>
        ),
      },
      retirementCard,
      {
        accentColor: '#e85724',
        tag: 'COUNTRY #1',
        heroStat: topCountry ? formatCredits(topCountry.credits) : '—',
        description: topCountry
          ? <><strong>{topCountry.name}</strong> leads with {formatCredits(topCountry.credits)} credits across {creditsByCountry?.length || 0} active markets.</>
          : <>No country data available.</>,
      },
      {
        accentColor: '#8cb73f',
        tag: 'COUNTRY #2',
        heroStat: secondCountry ? formatCredits(secondCountry.credits) : '—',
        description: secondCountry
          ? <><strong>{secondCountry.name}</strong> is 2nd at {formatCredits(secondCountry.credits)} ({secondCountryPct}% of global).{secondCountryTopAct && <> {secondCountryTopAct} is its top activity.</>}</>
          : <>No second country data.</>,
      },
    ];
  }, [data, selectedActivity]);

  return (
    <div className="insights-panel overview-insights">
      <div className="panel-header">
        <div className="panel-title"><span aria-hidden="true" title="Market Intelligence: key metrics and market insights">◈</span> Market Intelligence</div>
      </div>
      <div className="insights-grid">
        {insights.map((insight, i) => (
          <div key={i} className="insight-card">
            <div className="insight-accent-bar" style={{ background: insight.accentColor }} />
            <div className="insight-content">
              <span
                className="insight-tag"
                style={{ background: `${insight.accentColor}40`, color: insight.tagColor || insight.accentColor }}
              >
                {insight.tag}
              </span>
              <div className="insight-hero" style={{ color: insight.accentColor }}>
                {insight.heroStat}
              </div>
              <div className="insight-desc">{insight.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsightCards;
