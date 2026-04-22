import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, Cell,
} from 'recharts';
import { formatCredits, formatPct, REGISTRY_COLORS, getGroupColor } from '../../utils/formatters';

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="ct-name">{payload[0].payload.name || ''}</div>
      {payload.map((p, i) => (
        <div key={i} className="ct-value" style={{ color: p.color }}>
          {p.name}: {formatCredits(p.value)}
        </div>
      ))}
    </div>
  );
};

const StackedBarTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="ct-name">{payload[0].payload.name || ''}</div>
      {payload.map((p, i) => (
        <div key={i} className="ct-value" style={{ color: p.color }}>
          {p.name}: {p.value}m
        </div>
      ))}
    </div>
  );
};

const SPECIALTIES = {
  'Verra': 'Nature-based leader',
  'Gold Standard': 'Clean energy specialist',
  'ACR': 'Industrial systems focus',
  'CAR': 'Climate Action Reserve',
};

const VINTAGE_YEARS = {
  'Verra': '~2014',
  'Gold Standard': '~2019',
  'ACR': '~2019',
  'CAR': '~2017',
};

const RegistryIntelligence = ({ data, isDarkMode }) => {
  const { creditsByRegistry, creditsByActivity, totalCredits, registryStats } = data;

  const remainingFill = isDarkMode ? '#2a2a3a' : '#e8e2d8';

  const registryDetails = useMemo(() => {
    return creditsByRegistry.map(reg => {
      // Top 3 activities for this registry
      const actMap = {};
      const countryMap = {};
      data.filteredAgg.forEach(d => {
        if (d.registry === reg.name) {
          actMap[d.category] = (actMap[d.category] || 0) + d.credits;
        }
      });
      data.filteredCountry.forEach(d => {
        if (d.registry === reg.name) {
          countryMap[d.country] = (countryMap[d.country] || 0) + d.credits;
        }
      });

      const topActivities = Object.entries(actMap)
        .map(([name, credits]) => ({ name, credits }))
        .sort((a, b) => b.credits - a.credits)
        .slice(0, 3);

      const topCountries = Object.entries(countryMap)
        .map(([name, credits]) => ({ name, credits }))
        .sort((a, b) => b.credits - a.credits)
        .slice(0, 3);

      const pct = totalCredits > 0 ? (reg.credits / totalCredits) * 100 : 0;

      return {
        ...reg,
        pct,
        topActivities,
        topCountries,
        specialty: SPECIALTIES[reg.name] || 'Carbon market participant',
        stats: registryStats[reg.name] || null,
        vintageYear: VINTAGE_YEARS[reg.name] || null,
      };
    });
  }, [creditsByRegistry, data, totalCredits, registryStats]);

  // Comparison chart data: top 8 activities, grouped by registry
  const comparisonData = useMemo(() => {
    const topActs = creditsByActivity.slice(0, 8);
    return topActs.map(act => {
      const row = { name: act.name.length > 18 ? act.name.slice(0, 16) + '…' : act.name };
      act.registryBreakdown.forEach(reg => {
        row[reg.name] = reg.credits;
      });
      return row;
    });
  }, [creditsByActivity]);

  const registryNames = creditsByRegistry.map(r => r.name);

  const regMap = useMemo(() =>
    Object.fromEntries(registryDetails.map(r => [r.name, r])),
    [registryDetails]
  );

  const stackedBarData = useMemo(() =>
    creditsByRegistry.map(reg => ({
      name: reg.name === 'Gold Standard' ? 'Gold Std' : reg.name,
      retired: Math.round((registryStats[reg.name]?.retired || 0) / 1e6),
      remaining: Math.round((registryStats[reg.name]?.remaining || 0) / 1e6),
      color: reg.color,
    })),
    [creditsByRegistry, registryStats]
  );

  const renderCard = (reg) => {
    if (!reg) return null;
    return (
      <div key={reg.name} className="registry-card" style={{ borderTopColor: reg.color }}>
        <div className="registry-card-header-row">
          <div className="registry-pill" style={{ background: reg.color + '18' }}>
            <div className="registry-pill-dot" style={{ background: reg.color }} />
            <span className="registry-pill-name" style={{ color: reg.color }}>{reg.name}</span>
          </div>
          <span className="registry-specialty" style={{ background: reg.color + '18', color: reg.color, marginTop: 0 }}>
            {SPECIALTIES[reg.name]}
          </span>
        </div>
        <div className="registry-hero-row">
          <div className="registry-card-credits">{formatCredits(reg.credits)}</div>
          <div className="registry-card-pct">{formatPct(reg.pct)} of global market</div>
        </div>

        <div style={{ borderRadius: 8, padding: '6px 10px', borderLeft: '2px solid #e85724', marginBottom: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: 5 }}>
            Top Activities
          </div>
          {reg.topActivities.map(a => (
            <div key={a.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: getGroupColor(a.name) || 'var(--text-secondary)' }}>{a.name}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{formatCredits(a.credits)}</span>
            </div>
          ))}
        </div>

        <div style={{ borderRadius: 8, padding: '6px 10px', borderLeft: '2px solid #e85724', marginBottom: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: 5 }}>
            Top Countries
          </div>
          {reg.topCountries.map(c => (
            <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{c.name}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{formatCredits(c.credits)}</span>
            </div>
          ))}
        </div>

        {reg.stats && (
          <div style={{ borderRadius: 8, padding: '6px 10px', borderLeft: '2px solid #e85724', marginBottom: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: 5 }}>
              Market Stats
            </div>
            {[
              { label: 'RETIRED',     value: formatCredits(reg.stats.retired),          color: '#e85724' },
              { label: 'REMAINING',   value: formatCredits(reg.stats.remaining),        color: 'var(--text-primary)' },
              { label: 'RET. RATE',   value: reg.stats.retirementRate.toFixed(1) + '%', color: '#22a05a' },
              { label: 'PROJECTS',    value: reg.stats.projectCount.toLocaleString(),   color: 'var(--text-primary)' },
              ...(reg.vintageYear ? [{ label: 'AVG VINTAGE', value: reg.vintageYear, color: 'var(--text-primary)' }] : []),
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="registry-page">
      <div className="registry-grid">
        {renderCard(regMap['Verra'])}
        {renderCard(regMap['Gold Standard'])}

        <div className="registry-chart-panel">
          <div className="registry-chart-title">Retired vs Remaining — by registry</div>
          <div className="registry-chart-legend">
            {creditsByRegistry.map(reg => (
              <div key={reg.name} className="registry-chart-legend-item">
                <div className="registry-chart-legend-sq" style={{ background: reg.color }} />
                {reg.name}
              </div>
            ))}
            <div className="registry-chart-legend-item">
              <div className="registry-chart-legend-sq" style={{ background: remainingFill, border: '0.5px solid var(--border-hover)' }} />
              Remaining
            </div>
          </div>
          <div className="registry-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stackedBarData}>
                <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                <YAxis tickFormatter={v => v + 'm'} tick={{ fontSize: 8 }} />
                <Tooltip content={<StackedBarTooltip />} />
                <Bar dataKey="retired" stackId="s" name="Retired" radius={[0, 0, 0, 0]}>
                  {creditsByRegistry.map((reg, i) => (
                    <Cell key={i} fill={reg.color} />
                  ))}
                </Bar>
                <Bar dataKey="remaining" stackId="s" name="Remaining" fill={remainingFill} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {renderCard(regMap['ACR'])}
        {renderCard(regMap['CAR'])}

        <div className="registry-chart-panel">
          <div className="registry-chart-title">Registry Comparison — Top Activities</div>
          <div className="registry-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 5, right: 10, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={formatCredits} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                {registryNames.map(name => (
                  <Bar key={name} dataKey={name} fill={REGISTRY_COLORS[name] || '#999'} barSize={12} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistryIntelligence;
