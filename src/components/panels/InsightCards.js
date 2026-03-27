import React, { useMemo } from 'react';
import { formatCredits, getGroup, GROUP_COLORS } from '../../utils/formatters';

const InsightCards = ({ data, selectedActivity }) => {
  const insights = useMemo(() => {
    if (!data) return [];

    const { creditsByActivity, creditsByRegistry, creditsByCountry, totalCredits, creditsByGroup } = data;

    if (selectedActivity) {
      const actData = creditsByActivity.find(a => a.name === selectedActivity);
      if (!actData) return [];
      const group = getGroup(selectedActivity);
      const topReg = actData.registryBreakdown?.[0];
      const actCountries = data.getActivityCountries(selectedActivity);
      const topCountry = actCountries?.[0];
      const pct = totalCredits > 0 ? ((actData.credits / totalCredits) * 100).toFixed(1) : '0';

      return [
        {
          color: GROUP_COLORS[group] || '#e85724',
          text: (
            <>
              <strong>{selectedActivity}</strong> represents <strong>{pct}%</strong> of the total market.
            </>
          ),
        },
        {
          color: '#029bd6',
          text: (
            <>
              {topReg
                ? <><strong>{topReg.name}</strong> is the dominant registry with <strong>{formatCredits(topReg.credits)}</strong> credits.</>
                : <>No registry data available for this activity.</>
              }
            </>
          ),
        },
        {
          color: '#e85724',
          text: (
            <>
              {topCountry
                ? <><strong>{topCountry.name}</strong> leads with <strong>{formatCredits(topCountry.credits)}</strong> credits in this category.</>
                : <>No country data available for this activity.</>
              }
            </>
          ),
        },
        {
          color: '#CCDF84',
          text: (
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
    const topReg = creditsByRegistry?.[0];
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
        color: topGroupColor,
        text: (
          <>
            <strong>{topGroupName}</strong> dominates with <strong>{topGroupShare}%</strong> of all credits issued.
            {topActivity && <> <strong>{topActivity.name}</strong> is the largest single activity at <strong>{formatCredits(topActivity.credits)}</strong>.</>}
          </>
        ),
      },
      {
        color: '#029bd6',
        text: (
          <>
            {topReg && (
              <>
                <strong>{topReg.name}</strong> holds <strong>{formatCredits(topReg.credits)}</strong> credits across <strong>{creditsByCountry?.length || 0}</strong> countries, making it the market's dominant registry.
              </>
            )}
          </>
        ),
      },
      {
        color: '#e85724',
        text: (
          <>
            {topCountry && (
              <>
                <strong>{topCountry.name}</strong> leads all countries with <strong>{formatCredits(topCountry.credits)}</strong> credits across <strong>{creditsByCountry?.length || 0}</strong> active markets.
              </>
            )}
          </>
        ),
      },
      {
        color: '#CCDF84',
        text: (
          <>
            {secondCountry
              ? <><strong>{secondCountry.name}</strong> is the second-largest market with <strong>{formatCredits(secondCountry.credits)}</strong> (<strong>{secondCountryPct}%</strong> of global).{secondCountryTopAct && <> <strong>{secondCountryTopAct}</strong> is its largest activity.</>}</>
              : <>No second country data available.</>
            }
          </>
        ),
      },
    ];
  }, [data, selectedActivity]);

  return (
    <div className="insights-panel overview-insights">
      <div className="panel-header">
        <div className="panel-title">◈ Market Intelligence</div>
      </div>
      <div className="insights-grid">
        {insights.map((insight, i) => (
          <div key={i} className={`insight-card${i % 2 === 0 ? ' primary' : ''}`}>
            <span className="insight-dot" style={{ background: insight.color }} />
            <div className="insight-text">{insight.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsightCards;
