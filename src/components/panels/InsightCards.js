import { useMemo } from 'react';
import { formatCredits, getGroup, GROUP_COLORS } from '../../utils/formatters';

const InsightCards = ({ data, selectedActivity, activeGroup }) => {
  const insights = useMemo(() => {
    if (!data) return [];

    const { creditsByActivity, creditsByCountry, totalCredits, creditsByGroup, filteredAgg = [] } = data;

    // Market concentration — filter-aware
    const concAgg = selectedActivity
      ? filteredAgg.filter(d => d.category === selectedActivity)
      : activeGroup
        ? filteredAgg.filter(d => getGroup(d.category) === activeGroup)
        : filteredAgg;

    const regTotals = {};
    concAgg.forEach(d => { regTotals[d.registry] = (regTotals[d.registry] || 0) + d.credits; });
    const sortedRegs = Object.entries(regTotals).sort((a, b) => b[1] - a[1]);
    const concTotal = concAgg.reduce((s, d) => s + d.credits, 0);
    const top2Credits = (sortedRegs[0]?.[1] || 0) + (sortedRegs[1]?.[1] || 0);
    const top2Pct = concTotal > 0 ? (top2Credits / concTotal * 100) : 0;
    const top2Names = sortedRegs.length >= 2
      ? `${sortedRegs[0][0]} + ${sortedRegs[1][0]}`
      : sortedRegs[0]?.[0] || '';
    const topRegPctVal = concTotal > 0 && sortedRegs[0] ? (sortedRegs[0][1] / concTotal * 100) : 0;
    const topRegName = sortedRegs[0]?.[0] || '';

    const concentrationCard = {
      accentColor: '#029bd6',
      tag: 'CONCENTRATION',
      heroStat: `${top2Pct.toFixed(1)}%`,
      description: sortedRegs.length >= 2
        ? <>{top2Names} control <strong>{top2Pct.toFixed(0)}%</strong> of credits. {topRegName} alone holds <strong>{topRegPctVal.toFixed(0)}%</strong>.</>
        : topRegName
          ? <><strong>{topRegName}</strong> holds <strong>{topRegPctVal.toFixed(0)}%</strong> of credits in this segment.</>
          : <>No registry data available.</>,
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
        concentrationCard,
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
      concentrationCard,
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
  }, [data, selectedActivity, activeGroup]);

  return (
    <div className="insights-panel overview-insights">
      <div className="panel-header">
        <div className="panel-title">◈ Market Intelligence</div>
      </div>
      <div className="insights-grid">
        {insights.map((insight, i) => (
          <div key={i} className="insight-card">
            <div className="insight-accent-bar" style={{ background: insight.accentColor }} />
            <div className="insight-content">
              <span
                className="insight-tag"
                style={{ background: `${insight.accentColor}26`, color: insight.accentColor }}
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
