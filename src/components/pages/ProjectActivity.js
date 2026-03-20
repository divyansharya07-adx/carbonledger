import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCredits, formatPct, GROUP_COLORS } from '../../utils/formatters';

const GROUPS = ['All', 'Forest & Nature', 'Energy', 'Agriculture', 'Waste & Industrial'];

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="ct-name">{payload[0].payload.year || payload[0].payload.name}</div>
      <div className="ct-value">{formatCredits(payload[0].value)}</div>
    </div>
  );
};

const ProjectActivity = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState('All');
  const [selectedActivity, setSelectedActivity] = useState(null);

  const { creditsByActivity, totalCredits } = data;

  const filteredActivities = useMemo(() => {
    let list = creditsByActivity;
    if (groupFilter !== 'All') {
      list = list.filter(a => a.group === groupFilter);
    }
    if (searchTerm) {
      list = list.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return list;
  }, [creditsByActivity, groupFilter, searchTerm]);

  const selectedData = useMemo(() => {
    if (!selectedActivity) return null;
    return creditsByActivity.find(a => a.name === selectedActivity);
  }, [creditsByActivity, selectedActivity]);

  const trendData = useMemo(() => {
    if (!selectedActivity) return [];
    return data.getActivityTrend(selectedActivity);
  }, [data, selectedActivity]);

  const activityCountries = useMemo(() => {
    if (!selectedActivity) return [];
    return data.getActivityCountries(selectedActivity).slice(0, 5);
  }, [data, selectedActivity]);

  return (
    <div className="two-col-page proj-activity-page">
      <div className="page-left">
        <div className="search-input-wrapper">
          <Search size={14} />
          <input
            className="search-input"
            type="text"
            placeholder="Search activities..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="group-chips" style={{ marginBottom: 10 }}>
          {GROUPS.map(g => (
            <button
              key={g}
              className={`group-chip ${groupFilter === g ? 'active' : ''}`}
              style={groupFilter === g && g !== 'All' ? { background: GROUP_COLORS[g], color: '#0d0d12' } : {}}
              onClick={() => setGroupFilter(g)}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="activity-list">
          {filteredActivities.map((activity, i) => {
            const rank = creditsByActivity.indexOf(activity) + 1;
            const groupColor = GROUP_COLORS[activity.group] || '#e85724';
            const isSelected = selectedActivity === activity.name;

            return (
              <div
                key={activity.name}
                className={`activity-row ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedActivity(isSelected ? null : activity.name)}
              >
                <div className="activity-rank">{rank}</div>
                <div className="activity-name-col">
                  <div className="activity-name">{activity.name}</div>
                  <div className="activity-group-tag" style={{ color: groupColor }}>{activity.group}</div>
                </div>
                <div className="stacked-bar">
                  {activity.registryBreakdown.map(reg => {
                    const pct = activity.credits > 0 ? (reg.credits / activity.credits) * 100 : 0;
                    return <div key={reg.name} className="stacked-segment" style={{ width: `${pct}%`, background: reg.color }} />;
                  })}
                </div>
                <div className="activity-credits">{formatCredits(activity.credits)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="page-right">
        {!selectedData ? (
          <div className="detail-placeholder">Select an activity to explore its intelligence</div>
        ) : (
          <div>
            <div className="detail-header">
              <div className="detail-name">{selectedData.name}</div>
              <span
                className="detail-group-badge"
                style={{ background: GROUP_COLORS[selectedData.group] + '22', color: GROUP_COLORS[selectedData.group] }}
              >
                {selectedData.group}
              </span>
              <div className="detail-pulse">
                {selectedData.name} has generated {formatCredits(selectedData.credits)} credits,
                representing {formatPct(totalCredits > 0 ? (selectedData.credits / totalCredits) * 100 : 0)} of the total market.
              </div>
            </div>

            <div className="detail-kpi-grid">
              <div className="detail-kpi">
                <div className="dk-label">TOTAL CREDITS</div>
                <div className="dk-value">{formatCredits(selectedData.credits)}</div>
              </div>
              <div className="detail-kpi">
                <div className="dk-label">% OF MARKET</div>
                <div className="dk-value">{formatPct(totalCredits > 0 ? (selectedData.credits / totalCredits) * 100 : 0)}</div>
              </div>
              <div className="detail-kpi">
                <div className="dk-label">TOP COUNTRY</div>
                <div className="dk-value">{activityCountries[0]?.name || '—'}</div>
                <div className="dk-sub">{formatCredits(activityCountries[0]?.credits || 0)}</div>
              </div>
              <div className="detail-kpi">
                <div className="dk-label">TOP REGISTRY</div>
                <div className="dk-value">{selectedData.registryBreakdown[0]?.name || '—'}</div>
                <div className="dk-sub">{formatCredits(selectedData.registryBreakdown[0]?.credits || 0)}</div>
              </div>
            </div>

            <div className="detail-section-title">Registry Breakdown</div>
            {selectedData.registryBreakdown.map(reg => {
              const pct = selectedData.credits > 0 ? (reg.credits / selectedData.credits) * 100 : 0;
              return (
                <div key={reg.name} className="reg-breakdown-row">
                  <div className="reg-breakdown-name">{reg.name}</div>
                  <div className="reg-breakdown-bar-bg">
                    <div className="reg-breakdown-bar-fill" style={{ width: `${pct}%`, background: reg.color }} />
                  </div>
                  <div className="reg-breakdown-value">{formatPct(pct)}</div>
                </div>
              );
            })}

            {trendData.length > 0 && (
              <>
                <div className="detail-section-title">Credits Over Time</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="year" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={formatCredits} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="credits" stroke="#029bd6" strokeWidth={2} dot={{ r: 2, fill: '#029bd6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}

            <div className="detail-section-title">Top Countries</div>
            {activityCountries.map(c => (
              <div key={c.name} className="country-row">
                <div className="country-flag">🌐</div>
                <div className="country-name">{c.name}</div>
                <div className="country-bar-bg">
                  <div className="country-bar-fill" style={{ width: `${activityCountries[0]?.credits > 0 ? (c.credits / activityCountries[0].credits) * 100 : 0}%` }} />
                </div>
                <div className="country-credits">{formatCredits(c.credits)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectActivity;
