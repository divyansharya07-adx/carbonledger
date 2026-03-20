import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts';
import { formatCredits, formatPct, REGISTRY_COLORS } from '../../utils/formatters';

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

const SPECIALTIES = {
  'Verra': 'Nature-based leader',
  'Gold Standard': 'Clean energy specialist',
  'ACR': 'Industrial systems focus',
  'ARB': 'Compliance-grade registry',
};

const RegistryIntelligence = ({ data }) => {
  const { creditsByRegistry, creditsByActivity, totalCredits } = data;

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
      };
    });
  }, [creditsByRegistry, data, totalCredits]);

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

  return (
    <div className="registry-page">
      <div className="registry-grid">
        {registryDetails.map(reg => (
          <div key={reg.name} className="registry-card">
            <div className="registry-card-header">
              <div className="registry-color-dot" style={{ background: reg.color }} />
              <div className="registry-card-name">{reg.name}</div>
            </div>
            <div className="registry-card-credits">{formatCredits(reg.credits)}</div>
            <div className="registry-card-pct">{formatPct(reg.pct)} of global market</div>

            <div className="registry-card-section">Top Activities</div>
            {reg.topActivities.map(a => (
              <div key={a.name} className="registry-mini-row">
                <span className="registry-mini-name">{a.name}</span>
                <span className="registry-mini-value">{formatCredits(a.credits)}</span>
              </div>
            ))}

            <div className="registry-card-section">Top Countries</div>
            {reg.topCountries.map(c => (
              <div key={c.name} className="registry-mini-row">
                <span className="registry-mini-name">{c.name}</span>
                <span className="registry-mini-value">{formatCredits(c.credits)}</span>
              </div>
            ))}

            <div
              className="registry-specialty"
              style={{ background: reg.color + '22', color: reg.color }}
            >
              {reg.specialty}
            </div>
          </div>
        ))}
      </div>

      <div className="comparison-section">
        <div className="comparison-title">Registry Comparison — Top Activities</div>
        <ResponsiveContainer width="100%" height={320}>
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
  );
};

export default RegistryIntelligence;
