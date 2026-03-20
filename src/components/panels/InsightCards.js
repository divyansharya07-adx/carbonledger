import React, { useMemo } from 'react';
import { formatCredits, getGroup, GROUP_COLORS, GROUP_MAP } from '../../utils/formatters';

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

    const forestShare = creditsByGroup['Forest & Nature'] && totalCredits > 0
      ? ((creditsByGroup['Forest & Nature'] / totalCredits) * 100).toFixed(1)
      : '0';

    const energyCredits = creditsByGroup['Energy'] || 0;
    const energyShare = totalCredits > 0
      ? ((energyCredits / totalCredits) * 100).toFixed(1)
      : '0';

    const energyCategories = GROUP_MAP['Energy'] || [];
    const topEnergy = creditsByActivity?.find(a => energyCategories.includes(a.name));

    return [
      {
        color: '#8cb73f',
        text: (
          <>
            <strong>Forest & Nature</strong> dominates with <strong>{forestShare}%</strong> of all credits issued.
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
            <strong>Energy</strong> accounts for <strong>{energyShare}%</strong> of all credits.
            {topEnergy && <> <strong>{topEnergy.name}</strong> is the largest energy activity.</>}
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
          <div key={i} className="insight-card">
            <span className="insight-dot" style={{ background: insight.color }} />
            <div className="insight-text">{insight.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsightCards;
