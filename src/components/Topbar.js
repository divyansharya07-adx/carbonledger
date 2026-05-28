import { useState, useRef, useEffect, useMemo } from 'react';
import { Menu, Download, Calendar } from 'lucide-react';
import { GROUP_COLORS, GROUP_MAP, getGroup } from '../utils/formatters';
import YearPickerWheel from './YearPickerWheel';

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
  selectedActivity = 'all',
  setSelectedActivity,
  sectorSetBy = 'manual',
  setSectorSetBy,
  setSidebarExpanded,
}) => {
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [brandHovered, setBrandHovered] = useState(false);
  const yearRef = useRef(null);
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const groupRef = useRef(null);
  const [activityDropdownOpen, setActivityDropdownOpen] = useState(false);
  const activityRef = useRef(null);

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

  useEffect(() => {
    const handler = (e) => {
      if (activityRef.current && !activityRef.current.contains(e.target)) {
        setActivityDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activityGroups = useMemo(() => {
    const entries = Object.entries(GROUP_MAP);
    if (selectedGroup === 'all') return entries;
    return entries.filter(([group]) => group === selectedGroup);
  }, [selectedGroup]);

  // ── Sector handlers ──────────────────────────────────────────────────────
  const handleSelectGroup = (value) => {
    setSelectedGroup(value);
    setSectorSetBy('manual');
    setSelectedActivity('all');
    setGroupDropdownOpen(false);
  };

  const handleClearGroup = () => {
    setSelectedGroup('all');
    setSelectedActivity('all');
    setSectorSetBy('manual');
  };

  // ── Activity handlers ────────────────────────────────────────────────────
  const handleSelectActivity = (activityName) => {
    setSelectedActivity(activityName);
    setSelectedGroup(getGroup(activityName));
    setSectorSetBy('auto');
    setActivityDropdownOpen(false);
  };

  const handleClearActivity = () => {
    setSelectedActivity('all');
    if (sectorSetBy === 'auto') {
      setSelectedGroup('all');
      setSectorSetBy('manual');
    }
  };

  const handleSelectAllActivities = () => {
    setSelectedActivity('all');
    if (sectorSetBy === 'auto') {
      setSelectedGroup('all');
      setSectorSetBy('manual');
    }
    setActivityDropdownOpen(false);
  };

  const pageName = PAGE_NAMES[activePage] || 'Overview';
  const activityColor = selectedActivity !== 'all' ? GROUP_COLORS[getGroup(selectedActivity)] : null;

  const clearBtnStyle = {
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
  };

  const divider = { width: 1, height: 24, background: 'var(--border)', flexShrink: 0, alignSelf: 'center' };

  return (
    <div className="topbar">

      {/* ── Row 1: identity + navigation ─────────────────────────────── */}
      <div className="topbar-row1">
        <button
          className="topbar-hamburger"
          onClick={() => setSidebarExpanded(prev => !prev)}
          title="Toggle sidebar"
        >
          <Menu size={18} />
        </button>

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

        <div style={{
          marginLeft: 'auto',
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

      {/* ── Row 2: filters ───────────────────────────────────────────── */}
      <div className="topbar-row2">

        {/* Registry pills */}
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

        {/* Divider: pills → sector */}
        <div style={divider} />

        {/* ── Sector dropdown ── */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div ref={groupRef} style={{ position: 'relative' }}>
            <button
              className="year-range-btn"
              onClick={() => {
                setGroupDropdownOpen(o => !o);
                setActivityDropdownOpen(false);
              }}
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
                      onClick={() => handleSelectGroup(g.value)}
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
            onClick={handleClearGroup}
            style={{
              ...clearBtnStyle,
              visibility: selectedGroup !== 'all' ? 'visible' : 'hidden',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            ✕
          </button>
        </div>

        {/* Divider: sector → activity */}
        <div style={divider} />

        {/* ── Activity dropdown ── */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div ref={activityRef} style={{ position: 'relative' }}>
            <button
              className="year-range-btn"
              onClick={() => {
                setActivityDropdownOpen(o => !o);
                setGroupDropdownOpen(false);
              }}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                minWidth: 170,
                ...(selectedActivity !== 'all' ? {
                  border: `1px solid ${hexToRgba(activityColor, 0.3)}`,
                  background: hexToRgba(activityColor, 0.08),
                  color: activityColor,
                  fontWeight: 500,
                } : {
                  border: '0.5px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                }),
              }}
            >
              {selectedActivity !== 'all' && (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: activityColor, flexShrink: 0, display: 'inline-block' }} />
              )}
              <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedActivity === 'all' ? 'All activities' : selectedActivity}
              </span>
              {' '}▾
            </button>

            {activityDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                minWidth: 220,
                maxHeight: 360,
                overflowY: 'auto',
                background: 'var(--bg-card)',
                border: '0.5px solid var(--border)',
                borderRadius: 12,
                padding: 6,
                zIndex: 50,
                boxShadow: isDarkMode ? '0 4px 16px rgba(0,0,0,0.24)' : '0 4px 16px rgba(0,0,0,0.08)',
              }}>
                <div
                  onClick={handleSelectAllActivities}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: selectedActivity === 'all' ? 500 : 400,
                    background: selectedActivity === 'all' ? 'var(--bg-elevated)' : 'transparent',
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => { if (selectedActivity !== 'all') e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={e => { if (selectedActivity !== 'all') e.currentTarget.style.background = 'transparent'; }}
                >
                  All activities
                </div>

                {activityGroups.map(([group, categories], gIdx) => {
                  const groupColor = GROUP_COLORS[group];
                  return (
                    <div key={group}>
                      <div style={{
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: 'var(--text-muted)',
                        fontWeight: 500,
                        padding: '8px 12px 4px',
                        marginTop: gIdx > 0 ? 4 : 0,
                      }}>
                        {group}
                      </div>

                      {categories.map(cat => {
                        const isSelected = selectedActivity === cat;
                        return (
                          <div
                            key={cat}
                            onClick={() => handleSelectActivity(cat)}
                            style={{
                              padding: '7px 12px',
                              borderRadius: 8,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              fontSize: 12,
                              fontWeight: isSelected ? 500 : 400,
                              background: isSelected ? hexToRgba(groupColor, 0.15) : 'transparent',
                              color: isSelected ? groupColor : 'var(--text-primary)',
                              whiteSpace: 'nowrap',
                              transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={e => {
                              if (!isSelected) {
                                e.currentTarget.style.background = hexToRgba(groupColor, 0.12);
                                e.currentTarget.style.color = groupColor;
                              }
                            }}
                            onMouseLeave={e => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'var(--text-primary)';
                              }
                            }}
                          >
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: groupColor, display: 'inline-block', flexShrink: 0 }} />
                            {cat}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={handleClearActivity}
            style={{
              ...clearBtnStyle,
              visibility: selectedActivity !== 'all' ? 'visible' : 'hidden',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            ✕
          </button>
        </div>

        {/* Divider: activity → year */}
        <div style={divider} />

        {/* ── Year picker ── */}
        <div ref={yearRef} style={{ position: 'relative' }}>
          <button
            className="year-picker-btn"
            onClick={() => setYearDropdownOpen(o => !o)}
          >
            <Calendar size={14} style={{ flexShrink: 0 }} />
            <span className="year-picker-label">{yearRange[0]}–{yearRange[1]}</span>
          </button>
          {yearDropdownOpen && (
            <YearPickerWheel
              yearRange={yearRange}
              setYearRange={setYearRange}
              dataMinYear={dataMinYear}
              dataMaxYear={dataMaxYear}
              isDarkMode={isDarkMode}
              onClose={() => setYearDropdownOpen(false)}
            />
          )}
        </div>

        {/* Flex spacer */}
        <div style={{ flex: 1 }} />

        {/* Export — icon only */}
        <button className="export-btn" onClick={onExport} title="Export to CSV">
          <Download size={16} />
        </button>

      </div>
    </div>
  );
};

export default Topbar;
