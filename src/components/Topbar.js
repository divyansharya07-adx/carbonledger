import { useState, useRef, useEffect } from 'react';

const PAGE_NAMES = {
  overview: 'Overview',
  activity: 'Project Activity',
  country: 'Country Explorer',
  registry: 'Registry Intelligence',
};

const REGISTRIES = [
  { id: 'all', label: 'All' },
  { id: 'verra', label: 'Verra' },
  { id: 'gold', label: 'Gold Standard' },
  { id: 'acr', label: 'ACR' },
  { id: 'car', label: 'CAR' },
];

const YEAR_PRESETS = [
  { label: 'All time', range: [1996, 2025] },
  { label: 'Last 5Y', range: [2020, 2025] },
  { label: '2020–2025', range: [2020, 2025] },
  { label: '2015–2020', range: [2015, 2020] },
  { label: '2010–2015', range: [2010, 2015] },
];

const Topbar = ({
  activePage,
  selectedRegistry,
  setSelectedRegistry,
  yearRange,
  setYearRange,
  onExport,
  onReset,
  isDarkMode,
}) => {
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [brandHovered, setBrandHovered] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customFrom, setCustomFrom] = useState(yearRange[0]);
  const [customTo, setCustomTo] = useState(yearRange[1]);
  const yearRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (yearRef.current && !yearRef.current.contains(e.target)) {
        setYearDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const applyCustomRange = () => {
    const from = Number(customFrom);
    const to = Number(customTo);
    if (from >= 1996 && to <= 2025 && from < to) {
      setYearRange([from, to]);
    }
  };

  const pageName = PAGE_NAMES[activePage] || 'Overview';

  const isMatchingPreset = YEAR_PRESETS.some(p => p.range[0] === yearRange[0] && p.range[1] === yearRange[1]);
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

        <div ref={yearRef} style={{ position: 'relative' }}>
          {customMode ? (
            <div className="year-custom-inputs">
              <span>From</span>
              <input
                className="year-custom-input"
                type="number"
                min="1996"
                max="2025"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                onBlur={applyCustomRange}
                onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
              />
              <span>–</span>
              <input
                className="year-custom-input"
                type="number"
                min="1996"
                max="2025"
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
              {YEAR_PRESETS.map((preset) => (
                <div
                  key={preset.label}
                  className={`year-dropdown-item ${YEAR_PRESETS.some(p => p.label === preset.label) && preset.range[0] === yearRange[0] && preset.range[1] === yearRange[1] ? 'active' : ''}`}
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
              src={process.env.PUBLIC_URL + '/ceew_logo.png'}
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
