import { useState, useMemo, useCallback } from 'react';
import { Search } from 'lucide-react';
import { formatCredits, getGroup, GROUP_COLORS } from '../../utils/formatters';
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

const REGISTRIES = ['all', 'Verra', 'Gold Standard', 'ACR', 'CAR'];
const REG_LABEL = { all: 'All', 'Verra': 'Verra', 'Gold Standard': 'Gold Standard', 'ACR': 'ACR', 'CAR': 'CAR' };
const REG_DATA_ATTR = { all: 'all', 'Verra': 'verra', 'Gold Standard': 'gold', 'ACR': 'acr', 'CAR': 'car' };
const GROUPS = ['Forest & Nature', 'Energy', 'Agriculture', 'Waste & Industrial'];

const SORT_NUMERIC = new Set(['credits_issued','credits_retired','credits_remaining','retirement_rate']);
const PAGE_SIZE = 50;

const retRateColor = (pct) => pct > 60 ? '#8cb73f' : pct > 30 ? '#e8a124' : '#e85724';

const Projects = ({ data }) => {
  const { projectsData, projectsLoading } = useProjectsData();

  const [search, setSearch] = useState('');
  const [registryFilter, setRegistryFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState(null);
  const [corsiaFilter, setCorsiaFilter] = useState(false);
  const [sdgFilter, setSdgFilter] = useState(false);
  const [sortCol, setSortCol] = useState('credits_issued');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const handleSort = useCallback((col) => {
    setSortCol(prev => {
      setSortDir(d => prev === col ? (d === 'desc' ? 'asc' : 'desc') : 'desc');
      return col;
    });
    setPage(1);
  }, []);

  const handleFilter = useCallback((setter) => (val) => {
    setter(val);
    setPage(1);
  }, []);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projectsData.filter(p => {
      if (q) {
        const haystack = `${p.project_name} ${p.project_id} ${p.proponent || ''} ${p.country || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (registryFilter !== 'all' && p.registry !== registryFilter) return false;
      if (groupFilter && getGroup(p.category || '') !== groupFilter) return false;
      if (corsiaFilter && !p.corsia_eligible) return false;
      if (sdgFilter && !p.sdg_eligible) return false;
      return true;
    });
  }, [projectsData, search, registryFilter, groupFilter, corsiaFilter, sdgFilter]);

  const sortedProjects = useMemo(() => {
    const arr = [...filteredProjects];
    arr.sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      if (SORT_NUMERIC.has(sortCol)) {
        return sortDir === 'desc' ? (bv || 0) - (av || 0) : (av || 0) - (bv || 0);
      }
      const as = String(av || ''), bs = String(bv || '');
      return sortDir === 'desc' ? bs.localeCompare(as) : as.localeCompare(bs);
    });
    return arr;
  }, [filteredProjects, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedProjects.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedProjects = sortedProjects.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const kpiSource = useMemo(() => {
    if (selectedIds.size > 0) return projectsData.filter(p => selectedIds.has(p.project_id));
    return filteredProjects;
  }, [selectedIds, projectsData, filteredProjects]);

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
    const rows = selectedIds.size > 0
      ? projectsData.filter(p => selectedIds.has(p.project_id))
      : sortedProjects;
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
          <div className="kpi-sub muted">total issued</div>
        </div>
        <div className="kpi-item">
          <div className="kpi-label">CREDITS RETIRED</div>
          <div className="kpi-value">{formatCredits(kpi.totalRetired)}</div>
          <div className="kpi-sub muted">total retired</div>
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

        <div style={{ display: 'flex', gap: 4 }}>
          {REGISTRIES.map(reg => (
            <button
              key={reg}
              className={`pill ${registryFilter === reg ? 'active' : ''}`}
              data-reg={REG_DATA_ATTR[reg]}
              onClick={() => handleFilter(setRegistryFilter)(reg)}
              style={{ padding: '4px 10px', fontSize: 11 }}
            >
              {REG_LABEL[reg]}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {GROUPS.map(g => (
            <button
              key={g}
              className={`group-chip ${groupFilter === g ? 'active' : ''}`}
              style={groupFilter === g ? { background: GROUP_COLORS[g], color: '#0d0d12' } : {}}
              onClick={() => handleFilter(setGroupFilter)(groupFilter === g ? null : g)}
            >
              {g}
            </button>
          ))}
        </div>

        <button
          className={`group-chip ${corsiaFilter ? 'active' : ''}`}
          style={corsiaFilter ? { background: '#029bd6', color: '#fff' } : {}}
          onClick={() => handleFilter(setCorsiaFilter)(!corsiaFilter)}
        >
          CORSIA
        </button>

        <button
          className={`group-chip ${sdgFilter ? 'active' : ''}`}
          style={sdgFilter ? { background: '#8cb73f', color: '#0d0d12' } : {}}
          onClick={() => handleFilter(setSdgFilter)(!sdgFilter)}
        >
          SDG
        </button>

        <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
          Showing {sortedProjects.length.toLocaleString()} of {projectsData.length.toLocaleString()} projects
        </span>

        <button className="export-btn" onClick={handleExport} style={{ fontSize: 11, padding: '5px 14px' }}>
          ↓ Export {selectionActive ? `selected (${selectedIds.size})` : `(${sortedProjects.length.toLocaleString()})`}
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
            onPage={setPage}
          />
        </div>

        <ProjectDetailPanel
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      </div>
    </div>
  );
};

export default Projects;
