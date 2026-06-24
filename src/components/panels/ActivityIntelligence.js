import React, { useState, useRef } from 'react';
import { formatCredits, GROUP_COLORS, REGISTRY_COLORS } from '../../utils/formatters';

const ActivityIntelligence = ({ data }) => {
  const [showAll, setShowAll] = useState(false);
  const [tip, setTip] = useState(null);      // { name, rows:[{name,color,credits,share}], activeIdx, left, top, below }
  const [visible, setVisible] = useState(false);
  const panelRef = useRef(null);

  const { creditsByActivity } = data;

  const displayedActivities = showAll ? creditsByActivity : creditsByActivity.slice(0, 8);
  const filteredTotal = creditsByActivity.reduce((s, a) => s + a.credits, 0);

  const handleBarMove = (e, activity) => {
    const panelRect = panelRef.current?.getBoundingClientRect();
    if (!panelRect) return;
    const trackRect = e.currentTarget.getBoundingClientRect();
    const total = activity.credits || 0;
    const frac = trackRect.width > 0
      ? Math.min(Math.max((e.clientX - trackRect.left) / trackRect.width, 0), 0.9999)
      : 0;
    let cum = 0;
    let activeIdx = activity.registryBreakdown.length - 1;
    for (let i = 0; i < activity.registryBreakdown.length; i++) {
      cum += total > 0 ? activity.registryBreakdown[i].credits / total : 0;
      if (frac < cum) { activeIdx = i; break; }
    }
    const rows = activity.registryBreakdown.map(r => ({
      name: r.name,
      color: r.color,
      credits: r.credits,
      share: total > 0 ? ((r.credits / total) * 100).toFixed(1) : '0.0',
    }));
    const half = 85;
    const left = Math.min(Math.max(e.clientX - panelRect.left, half), panelRect.width - half);
    const top = e.clientY - panelRect.top;
    setTip({ name: activity.name, rows, activeIdx, left, top, below: top < 90 });
    setVisible(true);
  };

  const handleBarLeave = () => setVisible(false);

  return (
    <div className="activity-panel overview-activity" ref={panelRef} style={{ position: 'relative' }}>
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
          const isHovered = visible && tip && tip.name === activity.name;

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
              <div
                className="stacked-bar"
                style={{ marginRight: 8 }}
                onMouseMove={(e) => handleBarMove(e, activity)}
                onMouseLeave={handleBarLeave}
              >
                {activity.registryBreakdown.map((reg, i) => {
                  const pct = totalActivityCredits > 0
                    ? (reg.credits / totalActivityCredits) * 100
                    : 0;
                  return (
                    <div
                      key={reg.name}
                      className="stacked-segment"
                      style={{
                        width: `${pct}%`,
                        background: reg.color,
                        opacity: isHovered && tip.activeIdx !== i ? 0.45 : 1,
                        transition: 'width 0.3s ease, opacity 0.12s ease',
                      }}
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

      {tip && (
        <div
          className={`pai-tooltip${tip.below ? ' below' : ''}`}
          style={{ left: tip.left, top: tip.top, opacity: visible ? 1 : 0 }}
        >
          <div className="pai-tt-head">{tip.name}</div>
          {tip.rows.map((r, i) => (
            <div key={r.name} className={`pai-tt-row${i === tip.activeIdx ? ' active' : ''}`}>
              <span className="pai-tt-dot" style={{ background: r.color }} />
              <span className="pai-tt-name">{r.name}</span>
              <span className="pai-tt-val">{formatCredits(r.credits)} · {r.share}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityIntelligence;
