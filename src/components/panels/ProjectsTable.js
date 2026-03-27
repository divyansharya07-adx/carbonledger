import { useRef, useEffect } from 'react';
import { formatCredits, GROUP_COLORS, getGroup } from '../../utils/formatters';
import { COUNTRY_FLAGS } from '../pages/Projects';

const REGISTRY_BADGE_CLASS = {
  'Verra': 'verra',
  'Gold Standard': 'gold-standard',
  'ACR': 'acr',
  'CAR': 'car',
};

const retColor = (pct) => pct > 60 ? '#8cb73f' : pct > 30 ? '#e8a124' : '#e85724';

const SortIcon = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col) return <span style={{ color: 'var(--border)', marginLeft: 3 }}>↕</span>;
  return <span style={{ marginLeft: 3 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
};

const COLS = [
  { key: 'check', label: '', width: 32, noSort: true },
  { key: 'registry', label: 'Registry', width: 90 },
  { key: 'project_id', label: 'ID', width: 90 },
  { key: 'project_name', label: 'Project Name', width: 'auto' },
  { key: 'country', label: 'Country', width: 110 },
  { key: 'project_type', label: 'Category', width: 130 },
  { key: 'methodology', label: 'Methodology', width: 140 },
  { key: 'credits_issued', label: 'Issued', width: 80 },
  { key: 'credits_retired', label: 'Retired', width: 80 },
  { key: 'credits_remaining', label: 'Remaining', width: 90 },
  { key: 'retirement_rate', label: 'Ret. %', width: 90 },
];

const buildPages = (page, totalPages) => {
  const pages = new Set();
  pages.add(1);
  pages.add(totalPages);
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) pages.add(i);
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) result.push('...');
    result.push(p);
    prev = p;
  }
  return result;
};

const ProjectsTable = ({
  projects,
  allFiltered,
  sortCol,
  sortDir,
  onSort,
  selectedIds,
  onSelectIds,
  selectedProject,
  onSelectProject,
  page,
  totalPages,
  totalCount,
  onPage,
}) => {
  const selectAllRef = useRef(null);

  const allPageSelected = projects.length > 0 && projects.every(p => selectedIds.has(p.project_id));
  const someSelected = projects.some(p => selectedIds.has(p.project_id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allPageSelected;
    }
  }, [someSelected, allPageSelected]);

  const handleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allPageSelected) {
      projects.forEach(p => next.delete(p.project_id));
    } else {
      projects.forEach(p => next.add(p.project_id));
    }
    onSelectIds(next);
  };

  const handleRowCheck = (e, id) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectIds(next);
  };

  const pageButtons = buildPages(page, totalPages);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table className="projects-table">
          <colgroup>
            {COLS.map(c => (
              <col key={c.key} style={{ width: c.width === 'auto' ? undefined : c.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {COLS.map(c => (
                <th
                  key={c.key}
                  className={`${c.noSort ? 'no-sort' : ''} ${sortCol === c.key ? 'sort-active' : ''}`}
                  onClick={c.noSort ? undefined : () => onSort(c.key)}
                  style={{ textAlign: ['credits_issued','credits_retired','credits_remaining','retirement_rate'].includes(c.key) ? 'right' : 'left' }}
                >
                  {c.key === 'check' ? (
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  ) : (
                    <>
                      {c.label}
                      {!c.noSort && <SortIcon col={c.key} sortCol={sortCol} sortDir={sortDir} />}
                    </>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const isActive = selectedProject?.project_id === p.project_id;
              const isChecked = selectedIds.has(p.project_id);
              const group = getGroup(p.category || '');
              const groupColor = GROUP_COLORS[group] || '#e85724';
              const flag = p.country ? (COUNTRY_FLAGS[p.country] || '') : '';
              const ret = p.retirement_rate || 0;
              const rc = retColor(ret);

              return (
                <tr
                  key={p.project_id}
                  className={isActive ? 'active-row' : ''}
                  onClick={() => onSelectProject(isActive ? null : p)}
                  style={{ cursor: 'pointer' }}
                >
                  <td onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={e => handleRowCheck(e, p.project_id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td>
                    <span className={`reg-badge ${REGISTRY_BADGE_CLASS[p.registry] || ''}`}>
                      {p.registry === 'Gold Standard' ? 'GS' : p.registry}
                    </span>
                  </td>
                  <td style={{ fontSize: 10, color: 'var(--text-muted)' }} title={p.project_id}>
                    {p.project_id}
                  </td>
                  <td title={p.project_name} style={{ fontWeight: 500 }}>
                    {p.project_name || '—'}
                  </td>
                  <td title={p.country}>
                    {flag && <span style={{ marginRight: 4 }}>{flag}</span>}
                    {p.country || '—'}
                  </td>
                  <td>
                    {p.project_type ? (
                      <span
                        className="cat-pill"
                        style={{ background: groupColor + '22', color: groupColor }}
                      >
                        {group}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: 10, color: 'var(--text-muted)' }} title={p.methodology}>
                    {p.methodology || '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>{formatCredits(p.credits_issued)}</td>
                  <td style={{ textAlign: 'right' }}>{formatCredits(p.credits_retired)}</td>
                  <td style={{ textAlign: 'right' }}>{formatCredits(p.credits_remaining)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                      <div style={{ width: 32, height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden', flexShrink: 0 }}>
                        <div style={{ width: `${Math.min(ret, 100)}%`, height: '100%', background: rc }} />
                      </div>
                      <span style={{ fontSize: 10, color: rc, minWidth: 34, textAlign: 'right' }}>
                        {ret.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button className="page-btn" disabled={page === 1} onClick={() => onPage(page - 1)}>← Prev</button>
        {pageButtons.map((b, i) =>
          b === '...'
            ? <span key={`e${i}`} className="page-ellipsis">…</span>
            : <button
                key={b}
                className={`page-btn ${b === page ? 'active' : ''}`}
                onClick={() => onPage(b)}
              >{b}</button>
        )}
        <button className="page-btn" disabled={page === totalPages} onClick={() => onPage(page + 1)}>Next →</button>
        <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>
          {totalCount.toLocaleString()} projects
        </span>
      </div>
    </div>
  );
};

export default ProjectsTable;
