import React, { useState, useMemo } from 'react';
import { formatCredits, GROUP_COLORS, REGISTRY_COLORS } from '../../utils/formatters';

const GROUPS = ['All', 'Forest & Nature', 'Energy', 'Agriculture', 'Waste & Industrial'];

const ActivityIntelligence = ({ data, selectedActivity, setSelectedActivity, activeGroup, setActiveGroup, onReset }) => {
  const [showAll, setShowAll] = useState(false);

  const { creditsByActivity } = data;

  const filteredActivities = useMemo(() => {
    if (!activeGroup) return creditsByActivity;
    return creditsByActivity.filter(a => a.group === activeGroup);
  }, [creditsByActivity, activeGroup]);

  const filteredTotal = filteredActivities.reduce((s, a) => s + a.credits, 0);
  const displayedActivities = showAll ? filteredActivities : filteredActivities.slice(0, 8);

  return (
    <div className="activity-panel overview-activity">
      <div className="panel-header">
        <div className="panel-title">⬡ Project Activity Intelligence</div>
        <div className="group-chips">
          {GROUPS.map(g => {
            const isActive = (g === 'All' && !activeGroup) || (g !== 'All' && activeGroup === g);
            return (
              <button
                key={g}
                className={`group-chip ${isActive ? 'active' : ''}`}
                style={isActive && g !== 'All' ? { background: GROUP_COLORS[g], color: '#0d0d12' } : {}}
                onClick={() => setActiveGroup(g === 'All' ? null : g)}
              >
                {g}
              </button>
            );
          })}
        </div>
        <button className="reset-btn" onClick={onReset}>↺ Reset</button>
        <div className="registry-legend">
          {Object.entries(REGISTRY_COLORS).slice(0, 4).map(([name, color]) => (
            <div key={name} className="legend-dot">
              <span style={{ background: color }} />
              {name === 'Gold Standard' ? 'GS' : name}
            </div>
          ))}
        </div>
      </div>

      <div className="activity-list" style={{ paddingRight: 16 }}>
        {displayedActivities.map((activity, i) => {
          const rank = creditsByActivity.indexOf(activity) + 1;
          const totalActivityCredits = activity.credits;
          const sharePct = filteredTotal > 0
            ? ((totalActivityCredits / filteredTotal) * 100).toFixed(1)
            : '0';
          const groupColor = GROUP_COLORS[activity.group] || '#e85724';
          const isSelected = selectedActivity === activity.name;

          return (
            <div
              key={activity.name}
              className={`activity-row ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedActivity(isSelected ? null : activity.name)}
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
              <div className="activity-credits" style={{ textAlign: 'right' }}>{formatCredits(totalActivityCredits)}</div>
              <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--text-muted)' }}>{sharePct}%</div>
            </div>
          );
        })}

        {!showAll && filteredActivities.length > 8 && (
          <div className="show-all-link" onClick={() => setShowAll(true)}>
            Show all {filteredActivities.length} →
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
