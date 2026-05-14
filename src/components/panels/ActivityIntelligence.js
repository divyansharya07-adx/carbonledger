import React, { useState } from 'react';
import { formatCredits, GROUP_COLORS, REGISTRY_COLORS } from '../../utils/formatters';

const ActivityIntelligence = ({ data }) => {
  const [showAll, setShowAll] = useState(false);

  const { creditsByActivity } = data;

  const displayedActivities = showAll ? creditsByActivity : creditsByActivity.slice(0, 8);
  const filteredTotal = creditsByActivity.reduce((s, a) => s + a.credits, 0);

  return (
    <div className="activity-panel overview-activity">
      <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="panel-title"><span aria-hidden="true" title="Project Activity: credit distribution by activity type and registry">⬡</span> Project Activity Intelligence</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {Object.entries(REGISTRY_COLORS).slice(0, 4).map(([name, color]) => (
            <div key={name} className="legend-dot">
              <span style={{ background: color }} />
              {name === 'Gold Standard' ? 'GS' : name}
            </div>
          ))}
        </div>
      </div>

      <div className="activity-list" style={{ paddingRight: 16 }}>
        {displayedActivities.map((activity) => {
          const rank = creditsByActivity.indexOf(activity) + 1;
          const totalActivityCredits = activity.credits;
          const sharePct = filteredTotal > 0
            ? ((totalActivityCredits / filteredTotal) * 100).toFixed(1)
            : '0';
          const groupColor = GROUP_COLORS[activity.group] || '#e85724';

          return (
            <div
              key={activity.name}
              className="activity-row"
              style={{ paddingRight: 24 }}
            >
              <div className="activity-rank">{rank}</div>
              <div className="activity-name-col">
                <div className="activity-name">{activity.name}</div>
                <div className="activity-group-tag" style={{ color: groupColor }}>
                  {activity.group}
                </div>
              </div>
              <div className="stacked-bar" style={{ marginRight: 8 }}>
                {activity.registryBreakdown.map(reg => {
                  const pct = totalActivityCredits > 0
                    ? (reg.credits / totalActivityCredits) * 100
                    : 0;
                  return (
                    <div
                      key={reg.name}
                      className="stacked-segment"
                      style={{ width: `${pct}%`, background: reg.color }}
                    />
                  );
                })}
              </div>
              <div className="cl-tooltip-wrap">
                <div className="activity-credits" style={{ textAlign: 'right' }}>{formatCredits(totalActivityCredits)}</div>
                <span className="cl-tooltip">Credits issued</span>
              </div>
              <div className="cl-tooltip-wrap">
                <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--text-muted)' }}>{sharePct}%</div>
                <span className="cl-tooltip">Market share</span>
              </div>
            </div>
          );
        })}

        {!showAll && creditsByActivity.length > 8 && (
          <div className="show-all-link" onClick={() => setShowAll(true)}>
            Show all {creditsByActivity.length} →
          </div>
        )}
        {showAll && (
          <div className="show-all-link" onClick={() => setShowAll(false)}>
            Show less
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityIntelligence;
