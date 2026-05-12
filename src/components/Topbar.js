import { useState, useRef, useEffect, useMemo } from 'react';
import { GROUP_COLORS } from '../utils/formatters';

const PAGE_NAMES = {
  overview: 'Overview',
  projects: 'Projects',
  activity: 'Project Activity',
  explorer: 'Country Explorer',
  country: 'Country Explorer',
  intelligence: 'Market Intelligence',
  registry: 'Registry Intelligence',
  about: 'About',
};

const REGISTRIES = [
  { id: 'all', label: 'All' },
  { id: 'verra', label: 'Verra' },
  { id: 'gold', label: 'Gold Standard' },
  { id: 'acr', label: 'ACR' },
  { id: 'car', label: 'CAR' },
];

const GROUPS = [
  { value: 'all',                label: 'All sectors' },
  { value: 'Forest & Nature',    label: 'Forest & Nature' },
  { value: 'Energy',             label: 'Energy' },
  { value: 'Agriculture',        label: 'Agriculture' },
  { value: 'Waste & Industrial', label: 'Waste & Industrial' },
];

const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};


const Topbar = ({
  activePage,
  selectedRegistry,
  setSelectedRegistry,
  yearRange,
  setYearRange,
  onExport,
  onReset,
  isDarkMode,
  selectedGroup = 'all',
  setSelectedGroup,
  dataMinYear = 1996,
  dataMaxYear = 2025,
}) => {
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [brandHovered, setBrandHovered] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customFrom, setCustomFrom] = useState(yearRange[0]);
  const [customTo, setCustomTo] = useState(yearRange[1]);
  const yearRef = useRef(null);
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const groupRef = useRef(null);

  const yearPresets = useMemo(() => [
    { label: 'All time',  range: [dataMinYear, dataMaxYear] },
    { label: 'Last 5Y',   range: [dataMaxYear - 4, dataMaxYear] },
    { label: '2020–2025', range: [2020, 2025] },
    { label: '2015–2020', range: [2015, 2020] },
    { label: '2010–2015', range: [2010, 2015] },
  ], [dataMinYear, dataMaxYear]);

  useEffect(() => {
    const handler = (e) => {
      if (yearRef.current && !yearRef.current.contains(e.target)) {
        setYearDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (groupRef.current && !groupRef.current.contains(e.target)) {
        setGroupDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const applyCustomRange = () => {
    const from = Number(customFrom);
    const to = Number(customTo);
    if (from >= dataMinYear && to <= dataMaxYear && from < to) {
      setYearRange([from, to]);
    }
  };

  const pageName = PAGE_NAMES[activePage] || 'Overview';

  const isMatchingPreset = yearPresets.some(p => p.range[0] === yearRange[0] && p.range[1] === yearRange[1]);
  const yearLabel = isMatchingPreset
    ? `${yearRange[0]} – ${yearRange[1]}`
    : `${yearRange[0]} – ${yearRange[1]} ✎`;

  return (
    <div className="topbar">
      <div className="topbar-breadcrumb" style={{ cursor: 'default' }}>
        <span
          onClick={onReset}
          onMouseEnter={() => setBrandHovered(true)}
          onMouseLeave={() => setBrandHovered(false)}
          style={{ cursor: 'pointer', opacity: brandHovered ? 0.7 : 1, transition: 'opacity 0.15s' }}
        >
          <span className="brand-carbon">Carbon</span><span className="brand-ledger">Ledger</span>
        </span>
        <span className="topbar-sep">›</span>
        <span className="crumb-name">{pageName}</span>
      </div>

      <div className="topbar-right">
        <div className="pill-group">
          {REGISTRIES.map((reg) => (
            <button
              key={reg.id}
              className={`pill ${selectedRegistry === reg.id ? 'active' : ''}`}
              data-reg={reg.id}
              onClick={() => setSelectedRegistry(reg.id)}
            >
              {reg.label}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 24, background: 'var(--border)', marginLeft: 10, marginRight: 0, flexShrink: 0, alignSelf: 'center' }} />

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div ref={groupRef} style={{ position: 'relative' }}>
            <button
              className="year-range-btn"
              onClick={() => setGroupDropdownOpen(!groupDropdownOpen)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                minWidth: 170,
                ...(selectedGroup !== 'all' ? {
                  border: `1px solid ${hexToRgba(GROUP_COLORS[selectedGroup], 0.3)}`,
                  background: hexToRgba(GROUP_COLORS[selectedGroup], 0.08),
                  color: GROUP_COLORS[selectedGroup],
                  fontWeight: 500,
                } : {
                  border: '0.5px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                }),
              }}
            >
              {selectedGroup !== 'all' && (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: GROUP_COLORS[selectedGroup], flexShrink: 0, display: 'inline-block' }} />
              )}
              <span>
                {selectedGroup === 'all' ? 'All sectors' : selectedGroup}
              </span>
              {' '}▾
            </button>
            {groupDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                background: 'var(--bg-card)',
                border: '0.5px solid var(--border)',
                borderRadius: 12,
                padding: 6,
                zIndex: 50,
                boxShadow: isDarkMode ? '0 4px 16px rgba(0,0,0,0.24)' : '0 4px 16px rgba(0,0,0,0.08)',
              }}>
                {GROUPS.map(g => {
                  const isSelected = selectedGroup === g.value;
                  const color = g.value !== 'all' ? GROUP_COLORS[g.value] : null;
                  return (
                    <div
                      key={g.value}
                      onClick={() => { setSelectedGroup(g.value); setGroupDropdownOpen(false); }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: 13,
                        fontWeight: isSelected ? 500 : 400,
                        background: isSelected ? (color ? hexToRgba(color, 0.15) : 'var(--bg-elevated)') : 'transparent',
                        color: isSelected ? (color || 'var(--text-primary)') : 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) {
                          e.currentTarget.style.background = color ? hexToRgba(color, 0.12) : 'var(--bg-elevated)';
                          e.currentTarget.style.color = color || 'var(--text-primary)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }
                      }}
                    >
                      {g.value !== 'all' && (
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: GROUP_COLORS[g.value], display: 'inline-block', flexShrink: 0 }} />
                      )}
                      {g.label}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => setSelectedGroup('all')}
            style={{
              visibility: selectedGroup !== 'all' ? 'visible' : 'hidden',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 18,
              height: 18,
              fontSize: 12,
              padding: 0,
              marginLeft: 4,
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            ✕
          </button>
        </div>

        <div style={{ width: 1, height: 24, background: 'var(--border)', marginLeft: 0, marginRight: 10, flexShrink: 0, alignSelf: 'center' }} />

        <div ref={yearRef} style={{ position: 'relative' }}>

          {customMode ? (
            <div className="year-custom-inputs">
              <span>From</span>
              <input
                className="year-custom-input"
                type="number"
                min={dataMinYear}
                max={dataMaxYear}
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                onBlur={applyCustomRange}
                onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
              />
              <span>–</span>
              <input
                className="year-custom-input"
                type="number"
                min={dataMinYear}
                max={dataMaxYear}
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                onBlur={applyCustomRange}
                onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
              />
              <span
                style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 9, paddingLeft: 2 }}
                onClick={() => setCustomMode(false)}
              >✕</span>
            </div>
          ) : (
            <button
              className="year-range-btn"
              onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
            >
              {yearLabel} ▼
            </button>
          )}
          {yearDropdownOpen && !customMode && (
            <div className="year-dropdown">
              {yearPresets.map((preset) => (
                <div
                  key={preset.label}
                  className={`year-dropdown-item ${yearPresets.some(p => p.label === preset.label) && preset.range[0] === yearRange[0] && preset.range[1] === yearRange[1] ? 'active' : ''}`}
                  onClick={() => {
                    setYearRange(preset.range);
                    setYearDropdownOpen(false);
                  }}
                >
                  {preset.label}
                </div>
              ))}
              <div
                className="year-dropdown-item"
                style={{ borderTop: '0.5px solid var(--border)', marginTop: 2, paddingTop: 6, color: 'var(--text-muted)', fontStyle: 'italic' }}
                onClick={() => {
                  setCustomFrom(yearRange[0]);
                  setCustomTo(yearRange[1]);
                  setCustomMode(true);
                  setYearDropdownOpen(false);
                }}
              >
                Custom range...
              </div>
            </div>
          )}
        </div>

        <button className="export-btn" onClick={onExport}>
          ↓ Export
        </button>

        <div style={{ width: 1, height: 24, background: 'var(--border)', marginLeft: 12, marginRight: 12, flexShrink: 0, alignSelf: 'center' }} />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          ...(isDarkMode ? { background: '#ffffff', borderRadius: 6, padding: '4px 8px' } : {}),
        }}>
          <a
            href="https://www.ceew.in/publications?field_focus_area_tid=247&field_pub_type_tid=All&field_authors_target_id_selective=All&title="
            target="_blank"
            rel="noopener noreferrer"
            style={{ lineHeight: 0, textDecoration: 'none' }}
          >
            <img
              src={process.env.PUBLIC_URL + '/ceew_logo.webp'}
              alt="CEEW"
              style={{ height: 34, width: 'auto', display: 'block' }}
            />
          </a>
        </div>
      </div>
    </div>
  );
};

export default Topbar;
