import { useState, useMemo, useCallback, useEffect } from 'react';
import { Search } from 'lucide-react';
import { formatCredits, getGroup, EXCLUDED_CATEGORIES } from '../../utils/formatters';
import ProjectsTable from '../panels/ProjectsTable';
import ProjectDetailPanel from '../panels/ProjectDetailPanel';
import useProjectsData from '../../hooks/useProjectsData';

export const COUNTRY_FLAGS = {
  'Afghanistan': '🇦🇫', 'Albania': '🇦🇱', 'Algeria': '🇩🇿', 'Angola': '🇦🇴',
  'Argentina': '🇦🇷', 'Armenia': '🇦🇲', 'Australia': '🇦🇺', 'Austria': '🇦🇹',
  'Azerbaijan': '🇦🇿', 'Bangladesh': '🇧🇩', 'Belarus': '🇧🇾', 'Belgium': '🇧🇪',
  'Belize': '🇧🇿', 'Benin': '🇧🇯', 'Bhutan': '🇧🇹', 'Bolivia': '🇧🇴',
  'Bosnia and Herzegovina': '🇧🇦', 'Botswana': '🇧🇼', 'Brazil': '🇧🇷', 'Bulgaria': '🇧🇬',
  'Burkina Faso': '🇧🇫', 'Burundi': '🇧🇮', 'Cambodia': '🇰🇭', 'Cameroon': '🇨🇲',
  'Canada': '🇨🇦', 'Chad': '🇹🇩', 'Chile': '🇨🇱', 'China': '🇨🇳',
  'Colombia': '🇨🇴', 'Congo': '🇨🇬', 'Costa Rica': '🇨🇷', 'Croatia': '🇭🇷',
  'Cuba': '🇨🇺', 'Czech Republic': '🇨🇿', 'DR Congo': '🇨🇩', 'Denmark': '🇩🇰',
  'Dominican Republic': '🇩🇴', 'Ecuador': '🇪🇨', 'Egypt': '🇪🇬', 'El Salvador': '🇸🇻',
  'Ethiopia': '🇪🇹', 'Fiji': '🇫🇯', 'Finland': '🇫🇮', 'France': '🇫🇷',
  'Gabon': '🇬🇦', 'Georgia': '🇬🇪', 'Germany': '🇩🇪', 'Ghana': '🇬🇭',
  'Greece': '🇬🇷', 'Guatemala': '🇬🇹', 'Guinea': '🇬🇳', 'Guyana': '🇬🇾',
  'Haiti': '🇭🇹', 'Honduras': '🇭🇳', 'Hungary': '🇭🇺', 'India': '🇮🇳',
  'Indonesia': '🇮🇩', 'Iran': '🇮🇷', 'Iraq': '🇮🇶', 'Israel': '🇮🇱',
  'Italy': '🇮🇹', 'Ivory Coast': '🇨🇮', 'Jamaica': '🇯🇲', 'Japan': '🇯🇵',
  'Jordan': '🇯🇴', 'Kazakhstan': '🇰🇿', 'Kenya': '🇰🇪', 'Kyrgyzstan': '🇰🇬',
  'Laos': '🇱🇦', 'Latvia': '🇱🇻', 'Lebanon': '🇱🇧', 'Lesotho': '🇱🇸',
  'Liberia': '🇱🇷', 'Lithuania': '🇱🇹', 'Madagascar': '🇲🇬', 'Malawi': '🇲🇼',
  'Malaysia': '🇲🇾', 'Mali': '🇲🇱', 'Mauritania': '🇲🇷', 'Mexico': '🇲🇽',
  'Moldova': '🇲🇩', 'Mongolia': '🇲🇳', 'Morocco': '🇲🇦', 'Mozambique': '🇲🇿',
  'Myanmar': '🇲🇲', 'Namibia': '🇳🇦', 'Nepal': '🇳🇵', 'Netherlands': '🇳🇱',
  'New Zealand': '🇳🇿', 'Nicaragua': '🇳🇮', 'Niger': '🇳🇪', 'Nigeria': '🇳🇬',
  'North Macedonia': '🇲🇰', 'Norway': '🇳🇴', 'Pakistan': '🇵🇰', 'Panama': '🇵🇦',
  'Papua New Guinea': '🇵🇬', 'Paraguay': '🇵🇾', 'Peru': '🇵🇪', 'Philippines': '🇵🇭',
  'Poland': '🇵🇱', 'Portugal': '🇵🇹', 'Romania': '🇷🇴', 'Russia': '🇷🇺',
  'Rwanda': '🇷🇼', 'Senegal': '🇸🇳', 'Serbia': '🇷🇸', 'Sierra Leone': '🇸🇱',
  'Slovakia': '🇸🇰', 'Solomon Islands': '🇸🇧', 'Somalia': '🇸🇴', 'South Africa': '🇿🇦',
  'South Korea': '🇰🇷', 'South Sudan': '🇸🇸', 'Spain': '🇪🇸', 'Sri Lanka': '🇱🇰',
  'Sudan': '🇸🇩', 'Suriname': '🇸🇷', 'Sweden': '🇸🇪', 'Switzerland': '🇨🇭',
  'Syria': '🇸🇾', 'Taiwan': '🇹🇼', 'Tajikistan': '🇹🇯', 'Tanzania': '🇹🇿',
  'Thailand': '🇹🇭', 'Togo': '🇹🇬', 'Trinidad and Tobago': '🇹🇹', 'Tunisia': '🇹🇳',
  'Turkey': '🇹🇷', 'Turkmenistan': '🇹🇲', 'Uganda': '🇺🇬', 'Ukraine': '🇺🇦',
  'United Arab Emirates': '🇦🇪', 'United Kingdom': '🇬🇧', 'United States': '🇺🇸',
  'Uruguay': '🇺🇾', 'Uzbekistan': '🇺🇿', 'Venezuela': '🇻🇪', 'Vietnam': '🇻🇳',
  'Yemen': '🇾🇪', 'Zambia': '🇿🇲', 'Zimbabwe': '🇿🇼',
};

const GLOBAL_TO_REGISTRY = { all: 'all', verra: 'Verra', gold: 'Gold Standard', acr: 'ACR', car: 'CAR' };

const SORT_NUMERIC = new Set(['credits_issued','credits_retired','credits_remaining','retirement_rate','lifetime_credits_issued']);
const PAGE_SIZE = 50;

// Advanced-filter tabs (master-detail rail). Drives both the left rail and the right pane.
const FILTER_TABS = [
  { zone: 'Project attributes', tabs: [
    { id: 'registry',         label: 'Registry',             type: 'multi', key: 'registry',         search: false },
    { id: 'country',          label: 'Country',              type: 'multi', key: 'country',          search: true  },
    { id: 'status',           label: 'Status',               type: 'multi', key: 'status',           search: true  },
    { id: 'reductionRemoval', label: 'Reduction / removal',  type: 'multi', key: 'reductionRemoval', search: false },
    { id: 'verificationBody', label: 'Verification body',    type: 'multi', key: 'verificationBody', search: true  },
    { id: 'methodology',      label: 'Methodology',          type: 'multi', key: 'methodology',      search: true  },
    { id: 'proponent',        label: 'Proponent',            type: 'text',  key: 'proponent' },
    { id: 'hasBuffer',        label: 'Has buffer pool',      type: 'bool',  key: 'hasBuffer' },
  ] },
  { zone: 'Credit volumes', tabs: [
    { id: 'creditsIssued',  label: 'Credits issued',  type: 'range', minKey: 'creditsIssuedMin',  maxKey: 'creditsIssuedMax' },
    { id: 'creditsRetired', label: 'Credits retired', type: 'range', minKey: 'creditsRetiredMin', maxKey: 'creditsRetiredMax' },
  ] },
  { zone: 'Project lifecycle', tabs: [
    { id: 'regDate',   label: 'Registration date',    type: 'date',  startKey: 'regDateStart', endKey: 'regDateEnd', hint: 'Verra · CAR' },
    { id: 'opLag',     label: 'Operational lag, yrs', type: 'range', minKey: 'opLagMin',  maxKey: 'opLagMax',  hint: 'Verra · CAR' },
    { id: 'annualRed', label: 'Annual reductions',    type: 'range', minKey: 'annualRedMin', maxKey: 'annualRedMax', hint: 'Verra · GS' },
  ] },
];
const OPTIONS_BY_TAB = {
  registry: ['Verra', 'Gold Standard', 'ACR', 'CAR'],
  reductionRemoval: ['Reduction', 'Mixed', 'Impermanent Removal', 'Long-Duration Removal'],
};

const retRateColor = (pct) => pct > 60 ? '#8cb73f' : pct > 30 ? '#e8a124' : '#e85724';

const Projects = ({ data, selectedRegistry = 'all', selectedYearRange, selectedGroup = 'all', selectedActivity = 'all', setActivePage }) => {
  const { projectsData, projectsLoading } = useProjectsData();

  const [search, setSearch] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState({
    corsia: false, sdg: false, article6: false,
    registry: [], country: [], status: [], reductionRemoval: [],
    verificationBody: [], methodology: [], proponent: '', hasBuffer: false,
    creditsIssuedMin: null, creditsIssuedMax: null,
    creditsRetiredMin: null, creditsRetiredMax: null,
    regDateStart: '', regDateEnd: '',
    opLagMin: null, opLagMax: null, annualRedMin: null, annualRedMax: null,
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('registry');
  const [tabSearchTerms, setTabSearchTerms] = useState({ status: '', country: '', verificationBody: '', methodology: '' });
  const [sortCol, setSortCol] = useState('credits_issued');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => { setPage(1); }, [selectedRegistry, selectedGroup, selectedActivity]);

  const { dataMinYear, releaseYear } = data;
  const isFullRange = !selectedYearRange ||
    (selectedYearRange[0] === dataMinYear && selectedYearRange[1] === releaseYear);
  const rangeLabel = isFullRange ? 'all time' : `in ${selectedYearRange[0]}–${selectedYearRange[1]}`;

  const handleSort = useCallback((col) => {
    setSortCol(prev => {
      setSortDir(d => prev === col ? (d === 'desc' ? 'asc' : 'desc') : 'desc');
      return col;
    });
    setPage(1);
  }, []);

  const toggleAdvFlag = useCallback((key) => {
    setAdvancedFilters(f => ({ ...f, [key]: !f[key] }));
    setPage(1);
  }, []);

  const toggleAdvArray = useCallback((key, val) => {
    setAdvancedFilters(f => {
      const arr = f[key];
      return { ...f, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
    });
    setPage(1);
  }, []);

  const setAdvNum = useCallback((key, raw) => {
    const t = String(raw).trim();
    const v = t === '' ? null : Number(t);
    setAdvancedFilters(f => ({ ...f, [key]: (v === null || Number.isNaN(v)) ? null : v }));
    setPage(1);
  }, []);

  const setAdvField = useCallback((key, val) => {
    setAdvancedFilters(f => ({ ...f, [key]: val }));
    setPage(1);
  }, []);

  const clearAdvanced = useCallback(() => {
    setAdvancedFilters({
      corsia: false, sdg: false, article6: false,
      registry: [], country: [], status: [], reductionRemoval: [],
      verificationBody: [], methodology: [], proponent: '', hasBuffer: false,
      creditsIssuedMin: null, creditsIssuedMax: null,
      creditsRetiredMin: null, creditsRetiredMax: null,
      regDateStart: '', regDateEnd: '',
      opLagMin: null, opLagMax: null, annualRedMin: null, annualRedMax: null,
    });
    setPage(1);
  }, []);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    const effectiveRegistry = GLOBAL_TO_REGISTRY[selectedRegistry] ?? 'all';
    return projectsData.filter(p => {
      if (q) {
        const haystack = `${p.project_name} ${p.project_id} ${p.proponent || ''} ${p.country || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (effectiveRegistry !== 'all' && p.registry !== effectiveRegistry) return false;
      if (selectedGroup && selectedGroup !== 'all' && getGroup(p.category || '') !== selectedGroup) return false;
      if (selectedActivity && selectedActivity !== 'all' && p.category !== selectedActivity) return false;
      const af = advancedFilters;
      if (af.corsia && !p.corsia_eligible) return false;
      if (af.sdg && !p.sdg_eligible) return false;
      if (af.article6 && !p.article_six_authorized) return false;
      if (af.registry.length && !af.registry.includes(p.registry)) return false;
      if (af.country.length && !af.country.includes(p.country)) return false;
      if (af.creditsIssuedMin != null && p.lifetime_credits_issued < af.creditsIssuedMin) return false;
      if (af.creditsIssuedMax != null && p.lifetime_credits_issued > af.creditsIssuedMax) return false;
      if (af.status.length && !af.status.includes(p.status)) return false;
      if (af.reductionRemoval.length && !af.reductionRemoval.includes(p.reduction_removal)) return false;
      if (af.verificationBody.length && !af.verificationBody.includes(p.verification_body)) return false;
      if (af.methodology.length && !af.methodology.includes(p.methodology)) return false;
      if (af.proponent && !(p.proponent || '').toLowerCase().includes(af.proponent.toLowerCase())) return false;
      if (af.hasBuffer && !(p.total_buffer_pool_deposits > 0)) return false;
      if (af.creditsRetiredMin != null && p.lifetime_credits_retired < af.creditsRetiredMin) return false;
      if (af.creditsRetiredMax != null && p.lifetime_credits_retired > af.creditsRetiredMax) return false;
      if (af.regDateStart) { if (!p.registration_date) return false; if (p.registration_date.slice(0, 10) < af.regDateStart) return false; }
      if (af.regDateEnd) { if (!p.registration_date) return false; if (p.registration_date.slice(0, 10) > af.regDateEnd) return false; }
      if (af.opLagMin != null) { if (p.operational_lag_years == null) return false; if (p.operational_lag_years < af.opLagMin) return false; }
      if (af.opLagMax != null) { if (p.operational_lag_years == null) return false; if (p.operational_lag_years > af.opLagMax) return false; }
      if (af.annualRedMin != null) { if (p.estimated_annual_reductions == null) return false; if (p.estimated_annual_reductions < af.annualRedMin) return false; }
      if (af.annualRedMax != null) { if (p.estimated_annual_reductions == null) return false; if (p.estimated_annual_reductions > af.annualRedMax) return false; }
      if (EXCLUDED_CATEGORIES.includes(p.category)) return false;
      return true;
    });
  }, [projectsData, search, selectedRegistry, selectedGroup, selectedActivity, advancedFilters]);

  const periodProjects = useMemo(() => {
    if (!filteredProjects.length) return [];
    const [startYear, endYear] = selectedYearRange ?? [0, Infinity];
    const projectMap = new Map();
    filteredProjects.forEach(row => {
      const pid = row.project_id;
      if (!projectMap.has(pid)) {
        projectMap.set(pid, { ...row, credits_issued: 0, credits_retired: 0, credits_remaining: 0, _hasActivity: false });
      }
      const proj = projectMap.get(pid);
      const yr = row.vintage_year;
      if (yr >= startYear && yr <= endYear) {
        proj.credits_issued += row.credits_issued;
        proj.credits_retired += row.credits_retired;
        proj._hasActivity = true;
      }
    });
    const result = [];
    projectMap.forEach(proj => {
      if (proj._hasActivity) {
        proj.credits_remaining = proj.credits_issued - proj.credits_retired;
        proj.retirement_rate = proj.credits_issued > 0 ? (proj.credits_retired / proj.credits_issued * 100) : 0;
        result.push(proj);
      }
    });
    return result;
  }, [filteredProjects, selectedYearRange]);

  const totalUniqueProjects = useMemo(
    () => new Set(filteredProjects.map(r => r.project_id)).size,
    [filteredProjects]
  );

  const sortedProjects = useMemo(() => {
    const arr = [...periodProjects];
    arr.sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      if (SORT_NUMERIC.has(sortCol)) {
        return sortDir === 'desc' ? (bv || 0) - (av || 0) : (av || 0) - (bv || 0);
      }
      const as = String(av || ''), bs = String(bv || '');
      return sortDir === 'desc' ? bs.localeCompare(as) : as.localeCompare(bs);
    });
    return arr;
  }, [periodProjects, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedProjects.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedProjects = sortedProjects.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const kpiSource = useMemo(() => {
    if (selectedIds.size > 0) return periodProjects.filter(p => selectedIds.has(p.project_id));
    return periodProjects;
  }, [selectedIds, periodProjects]);

  const kpi = useMemo(() => {
    const totalIssued = kpiSource.reduce((s, p) => s + p.credits_issued, 0);
    const totalRetired = kpiSource.reduce((s, p) => s + p.credits_retired, 0);
    const totalRemaining = kpiSource.reduce((s, p) => s + p.credits_remaining, 0);
    const retRate = totalIssued > 0 ? (totalRetired / totalIssued) * 100 : 0;
    const corsiaCount = kpiSource.filter(p => p.corsia_eligible).length;
    const sdgCount = kpiSource.filter(p => p.sdg_eligible).length;
    return { totalIssued, totalRetired, totalRemaining, retRate, corsiaCount, sdgCount };
  }, [kpiSource]);

  const handleExport = () => {
    const rows = periodProjects.filter(p => selectedIds.has(p.project_id));
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csvRows = [
      headers.join(','),
      ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carbonledger_projects_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectionActive = selectedIds.size > 0;
  const retRateC = retRateColor(kpi.retRate);

  const countryOptions = useMemo(
    () => [...new Set(projectsData.map(p => p.country).filter(Boolean))].sort(),
    [projectsData]
  );
  const statusOptions = useMemo(
    () => [...new Set(projectsData.map(p => p.status).filter(Boolean))].sort(),
    [projectsData]
  );
  const verificationBodyOptions = useMemo(
    () => [...new Set(projectsData.map(p => p.verification_body).filter(Boolean))].sort(),
    [projectsData]
  );
  const methodologyOptions = useMemo(
    () => [...new Set(projectsData.map(p => p.methodology).filter(Boolean))].sort(),
    [projectsData]
  );
  const activePanelCount =
    (advancedFilters.registry.length ? 1 : 0) +
    (advancedFilters.country.length ? 1 : 0) +
    (advancedFilters.status.length ? 1 : 0) +
    (advancedFilters.reductionRemoval.length ? 1 : 0) +
    (advancedFilters.verificationBody.length ? 1 : 0) +
    (advancedFilters.methodology.length ? 1 : 0) +
    (advancedFilters.proponent ? 1 : 0) +
    (advancedFilters.hasBuffer ? 1 : 0) +
    ((advancedFilters.creditsIssuedMin != null || advancedFilters.creditsIssuedMax != null) ? 1 : 0) +
    ((advancedFilters.creditsRetiredMin != null || advancedFilters.creditsRetiredMax != null) ? 1 : 0) +
    ((advancedFilters.regDateStart || advancedFilters.regDateEnd) ? 1 : 0) +
    ((advancedFilters.opLagMin != null || advancedFilters.opLagMax != null) ? 1 : 0) +
    ((advancedFilters.annualRedMin != null || advancedFilters.annualRedMax != null) ? 1 : 0);

  const tabIndicator = (tab) => {
    const af = advancedFilters;
    if (tab.type === 'multi') return af[tab.key].length > 0 ? { count: af[tab.key].length } : null;
    if (tab.type === 'bool' || tab.type === 'text') return af[tab.key] ? { dot: true } : null;
    if (tab.type === 'range') return (af[tab.minKey] != null || af[tab.maxKey] != null) ? { dot: true } : null;
    if (tab.type === 'date') return (af[tab.startKey] || af[tab.endKey]) ? { dot: true } : null;
    return null;
  };
  const optionsForTab = (id) => (
    id === 'country' ? countryOptions :
    id === 'status' ? statusOptions :
    id === 'verificationBody' ? verificationBodyOptions :
    id === 'methodology' ? methodologyOptions :
    (OPTIONS_BY_TAB[id] || [])
  );

  if (projectsLoading) {
    return <div className="projects-loading">Loading projects...</div>;
  }

  return (
    <div className="projects-page">
      {/* KPI Strip */}
      <div className="projects-kpi-strip">
        <div className="kpi-item">
          <div className="kpi-label">TOTAL PROJECTS</div>
          <div className="kpi-value">{kpiSource.length.toLocaleString()}</div>
          {selectionActive
            ? <div className="kpi-sub orange selection-tag">{selectedIds.size} selected</div>
            : <div className="kpi-sub muted">across all registries</div>}
        </div>
        <div className="kpi-item">
          <div className="kpi-label">CREDITS ISSUED</div>
          <div className="kpi-value">{formatCredits(kpi.totalIssued)}</div>
          <div className="kpi-sub muted">{rangeLabel}</div>
        </div>
        <div className="kpi-item">
          <div className="kpi-label">CREDITS RETIRED</div>
          <div className="kpi-value">{formatCredits(kpi.totalRetired)}</div>
          <div className="kpi-sub muted">{rangeLabel}</div>
        </div>
        <div className="kpi-item">
          <div className="kpi-label">CREDITS REMAINING</div>
          <div className="kpi-value">{formatCredits(kpi.totalRemaining)}</div>
          <div className="kpi-sub muted">available</div>
        </div>
        <div className="kpi-item">
          <div className="kpi-label">RETIREMENT RATE</div>
          <div className="kpi-value" style={{ color: retRateC }}>{kpi.retRate.toFixed(1)}%</div>
          <div className="kpi-sub" style={{ background: retRateC + '22', color: retRateC }}>
            {kpi.retRate > 60 ? 'high demand' : kpi.retRate > 30 ? 'moderate' : 'low demand'}
          </div>
        </div>
        <div className="kpi-item">
          <div className="kpi-label">CORSIA ELIGIBLE</div>
          <div className="kpi-value">{kpi.corsiaCount.toLocaleString()}</div>
          <div className="kpi-sub blue">aviation compliance</div>
        </div>
        <div className="kpi-item">
          <div className="kpi-label">SDG PROJECTS</div>
          <div className="kpi-value">{kpi.sdgCount.toLocaleString()}</div>
          <div className="kpi-sub green">co-benefits</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="projects-toolbar">
        <div className="search-input-wrapper" style={{ flex: '0 0 200px' }}>
          <Search size={14} />
          <input
            className="search-input"
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <div className="filters-wrap">
          <button
            className={`group-chip ${activePanelCount ? 'active' : ''}`}
            onClick={() => setFiltersOpen(o => !o)}
          >
            ⚙ Filters{activePanelCount ? ` (${activePanelCount})` : ''}
          </button>
          {filtersOpen && (
            <div className="filters-popover">
              <div className="filters-popover-header">
                <span style={{ fontWeight: 600 }}>Filters</span>
                {activePanelCount > 0 && <span className="filters-hint">{activePanelCount} active</span>}
              </div>
              <div className="filters-master-detail">
                <div className="filters-rail">
                  {FILTER_TABS.map(zone => (
                    <div key={zone.zone} className="filters-rail-zone">
                      <div className="filters-rail-zone-label">{zone.zone}</div>
                      {zone.tabs.map(tab => {
                        const ind = tabIndicator(tab);
                        return (
                          <div
                            key={tab.id}
                            className={`filters-rail-tab${activeTab === tab.id ? ' active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                          >
                            <span>{tab.label}</span>
                            {ind?.count != null && <span className="filters-rail-tab-indicator">({ind.count})</span>}
                            {ind?.dot && <span className="filters-rail-tab-dot" />}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="filters-pane">
                  {(() => {
                    const tab = FILTER_TABS.flatMap(z => z.tabs).find(t => t.id === activeTab);
                    if (!tab) return null;
                    if (tab.type === 'multi') {
                      const opts = optionsForTab(tab.id);
                      const term = (tabSearchTerms[tab.id] || '').toLowerCase();
                      const visible = tab.search && term ? opts.filter(o => o.toLowerCase().includes(term)) : opts;
                      return (
                        <>
                          {tab.search && (
                            <input
                              className="filters-pane-search"
                              type="text"
                              placeholder={`Search ${tab.label.toLowerCase()}…`}
                              value={tabSearchTerms[tab.id] || ''}
                              onChange={e => setTabSearchTerms(s => ({ ...s, [tab.id]: e.target.value }))}
                            />
                          )}
                          <div className="filters-pane-list">
                            {visible.map(o => (
                              <label key={o} className="filters-check">
                                <input type="checkbox" checked={advancedFilters[tab.key].includes(o)} onChange={() => toggleAdvArray(tab.key, o)} />
                                {o}
                              </label>
                            ))}
                            {visible.length === 0 && <div className="filters-hint">No matches.</div>}
                          </div>
                        </>
                      );
                    }
                    if (tab.type === 'text') {
                      return (
                        <>
                          <div className="filters-popover-label">Proponent contains</div>
                          <input className="filters-text" type="text" placeholder="e.g. Rimba Makmur" value={advancedFilters[tab.key]} onChange={e => setAdvField(tab.key, e.target.value)} />
                        </>
                      );
                    }
                    if (tab.type === 'bool') {
                      return (
                        <label className="filters-check">
                          <input type="checkbox" checked={advancedFilters[tab.key]} onChange={() => toggleAdvFlag(tab.key)} />
                          Has buffer pool
                        </label>
                      );
                    }
                    if (tab.type === 'range') {
                      return (
                        <>
                          <div className="filters-popover-label">{tab.label}{tab.hint && <span className="filters-hint"> · {tab.hint}</span>}</div>
                          <div className="filters-range">
                            <input type="number" placeholder="Min" value={advancedFilters[tab.minKey] ?? ''} onChange={e => setAdvNum(tab.minKey, e.target.value)} />
                            <span>–</span>
                            <input type="number" placeholder="Max" value={advancedFilters[tab.maxKey] ?? ''} onChange={e => setAdvNum(tab.maxKey, e.target.value)} />
                          </div>
                        </>
                      );
                    }
                    if (tab.type === 'date') {
                      return (
                        <>
                          <div className="filters-popover-label">{tab.label}{tab.hint && <span className="filters-hint"> · {tab.hint}</span>}</div>
                          <div className="filters-date-range">
                            <input type="date" value={advancedFilters[tab.startKey]} onChange={e => setAdvField(tab.startKey, e.target.value)} />
                            <span>–</span>
                            <input type="date" value={advancedFilters[tab.endKey]} onChange={e => setAdvField(tab.endKey, e.target.value)} />
                          </div>
                        </>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
              <div className="filters-popover-footer">
                <button className="filters-clear" onClick={clearAdvanced}>Clear</button>
                <button className="filters-done" onClick={() => setFiltersOpen(false)}>Done</button>
              </div>
            </div>
          )}
        </div>

        <button
          className={`group-chip ${advancedFilters.corsia ? 'active' : ''}`}
          style={advancedFilters.corsia ? { background: '#029bd6', color: '#fff' } : {}}
          onClick={() => toggleAdvFlag('corsia')}
        >
          CORSIA
        </button>

        <button
          className={`group-chip ${advancedFilters.sdg ? 'active' : ''}`}
          style={advancedFilters.sdg ? { background: '#8cb73f', color: '#0d0d12' } : {}}
          onClick={() => toggleAdvFlag('sdg')}
        >
          SDG
        </button>

        <button
          className={`group-chip ${advancedFilters.article6 ? 'active' : ''}`}
          style={advancedFilters.article6 ? { background: '#e85724', color: '#fff' } : {}}
          onClick={() => toggleAdvFlag('article6')}
        >
          Article 6
        </button>

        <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
          {isFullRange
            ? `Showing ${sortedProjects.length.toLocaleString()} of ${totalUniqueProjects.toLocaleString()} projects`
            : `Showing ${sortedProjects.length.toLocaleString()} projects with activity in ${selectedYearRange[0]}–${selectedYearRange[1]}`
          }
        </span>

        <button className="export-btn" onClick={handleExport} disabled={selectedIds.size === 0} style={{ fontSize: 11, padding: '5px 14px' }}>
          ↓ Export ({selectedIds.size})
        </button>
      </div>

      {/* Main: table + detail panel */}
      <div className="projects-main">
        <div className="projects-table-wrap">
          <ProjectsTable
            projects={pagedProjects}
            allFiltered={sortedProjects}
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={handleSort}
            selectedIds={selectedIds}
            onSelectIds={setSelectedIds}
            selectedProject={selectedProject}
            onSelectProject={setSelectedProject}
            page={safePage}
            totalPages={totalPages}
            totalCount={sortedProjects.length}
            onPage={(p) => { setPage(p); setSelectedIds(new Set()); }}
          />
        </div>

        <ProjectDetailPanel
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          allRows={filteredProjects}
          setActivePage={setActivePage}
        />
      </div>
    </div>
  );
};

export default Projects;
