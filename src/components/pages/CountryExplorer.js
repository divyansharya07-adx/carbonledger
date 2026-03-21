import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Globe, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import { formatCredits, getGroupColor } from '../../utils/formatters';

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="ct-name">{payload[0].payload.name || payload[0].payload.year}</div>
      <div className="ct-value">{formatCredits(payload[0].value)}</div>
    </div>
  );
};

const GLOBAL_OPTION = '🌍 Global';

const CountryExplorer = ({ data }) => {
  const [selectedCountry, setSelectedCountry] = useState('United States');
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isGlobal = selectedCountry === GLOBAL_OPTION;

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const options = useMemo(() => [GLOBAL_OPTION, ...data.allCountries], [data.allCountries]);
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm]);

  const { records, isGlobal: isGlobalView } = useMemo(() =>
    data.getCountryData(selectedCountry),
    [data, selectedCountry]
  );

  // Bar chart data
  const barData = useMemo(() => {
    if (isGlobalView) {
      const map = {};
      records.forEach(d => { map[d.country] = (map[d.country] || 0) + d.credits; });
      return Object.entries(map)
        .map(([name, credits]) => ({ name, credits, color: '#e85724' }))
        .sort((a, b) => b.credits - a.credits)
        .slice(0, 15);
    }
    const map = {};
    records.forEach(d => { map[d.category] = (map[d.category] || 0) + d.credits; });
    return Object.entries(map)
      .map(([name, credits]) => ({ name, credits, color: getGroupColor(name) }))
      .sort((a, b) => b.credits - a.credits)
      .slice(0, 15);
  }, [records, isGlobalView]);

  // Line chart data
  const lineData = useMemo(() => {
    const map = {};
    records.forEach(d => {
      const yr = Math.floor(d.year);
      if (yr >= 1996 && yr <= 2025) { map[yr] = (map[yr] || 0) + d.credits; }
    });
    return Object.entries(map)
      .map(([year, credits]) => ({ year: parseInt(year), credits }))
      .sort((a, b) => a.year - b.year);
  }, [records]);

  // KPIs
  const totalCredits = records.reduce((s, d) => s + d.credits, 0);
  const topActivity = (() => {
    const map = {};
    records.forEach(d => { map[d.category] = (map[d.category] || 0) + d.credits; });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : '—';
  })();
  const globalPct = data.totalCredits > 0 ? ((totalCredits / data.totalCredits) * 100).toFixed(1) : '0';
  const minYear = records.length > 0 ? Math.min(...records.map(d => d.year)) : '—';

  const barTitle = isGlobalView ? 'Top Countries by Credits' : `Credits by Activity — ${selectedCountry}`;
  const lineTitle = isGlobalView ? 'Global Credits Over Time' : `Credits Over Time — ${selectedCountry}`;

  return (
    <div className="two-col-page country-explorer-page">
      <div className="page-left">
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div className="search-input-wrapper">
            <Search size={14} />
            <input
              className="country-search-input"
              type="text"
              placeholder="Search countries..."
              value={dropdownOpen ? searchTerm : selectedCountry}
              onChange={e => { setSearchTerm(e.target.value); setDropdownOpen(true); }}
              onFocus={() => { setDropdownOpen(true); setSearchTerm(''); }}
            />
          </div>
          {dropdownOpen && (
            <div className="country-dropdown">
              {filteredOptions.map(c => (
                <div
                  key={c}
                  className={`country-dropdown-item ${c === selectedCountry ? 'selected' : ''}`}
                  onClick={() => { setSelectedCountry(c); setDropdownOpen(false); setSearchTerm(''); }}
                >
                  {c}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="country-kpi-grid">
          <div className="country-kpi">
            <div className="ckpi-label">TOTAL CREDITS</div>
            <div className="ckpi-value">{formatCredits(totalCredits)}</div>
          </div>
          <div className="country-kpi">
            <div className="ckpi-label">TOP ACTIVITY</div>
            <div className="ckpi-value" style={{ fontSize: 11 }}>{topActivity}</div>
          </div>
          <div className="country-kpi">
            <div className="ckpi-label">% OF GLOBAL</div>
            <div className="ckpi-value">{isGlobal ? '100' : globalPct}%</div>
          </div>
          <div className="country-kpi">
            <div className="ckpi-label">ACTIVE SINCE</div>
            <div className="ckpi-value">{isGlobal ? '2002' : Math.floor(minYear)}</div>
          </div>
        </div>
      </div>

      <div className="page-right">
        <div className="chart-card">
          <div className="chart-card-title"><Globe size={14} /> {barTitle}</div>
          <ResponsiveContainer width="100%" height={Math.max(barData.length * 28, 120)}>
            <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 5 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fontWeight: 500 }} />
              <Tooltip content={<ChartTooltip />} cursor={false} />
              <Bar dataKey="credits" radius={[0, 4, 4, 0]} barSize={16}>
                {barData.map(entry => <Cell key={entry.name} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card-title"><TrendingUp size={14} /> {lineTitle}</div>
          <div key={selectedCountry} style={{ width: '100%', height: 200, minHeight: 200 }}>
            <ResponsiveContainer width="100%" height={200} debounceMs={50}>
              <LineChart data={lineData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={formatCredits} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="credits" stroke="#029bd6" strokeWidth={2} dot={{ r: 2, fill: '#029bd6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountryExplorer;
