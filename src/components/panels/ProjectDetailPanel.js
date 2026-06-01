import { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import { formatCredits, formatDateOnly } from '../../utils/formatters';
import { getRegistryProjectUrl } from '../../utils/registryUrls';
import { COUNTRY_FLAGS } from '../pages/Projects';

const REGISTRY_BADGE_CLASS = {
  'Verra': 'verra',
  'Gold Standard': 'gold-standard',
  'ACR': 'acr',
  'CAR': 'car',
};

const retColor = (pct) => pct > 60 ? '#8cb73f' : pct > 30 ? '#e8a124' : '#e85724';

// Berkeley reduction/removal taxonomy — one-line legend per class.
const RR_LEGEND = {
  'Reduction': 'Avoids or reduces emissions at the source.',
  'Mixed': 'Combines emission reductions and carbon removals.',
  'Impermanent Removal': 'Removes CO₂ but carries reversal risk (e.g. forestry).',
  'Long-Duration Removal': 'Durable CO₂ removal (e.g. geological or mineral storage).',
};

const REGISTRY_CHART_COLOR = {
  'Verra': '#029bd6',
  'Gold Standard': '#8cb73f',
  'ACR': '#e85724',
  'CAR': '#b9c95e', // deepened lime — badge #CCDF84 is too light to fill
};

const VintageTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="pdp-tooltip">
      <div className="pdp-tooltip-year">Vintage {d.year}</div>
      <div>Issued: {formatCredits(d.issued)}</div>
      <div>Retired: {formatCredits(d.retired)}</div>
      <div>Remaining: {formatCredits(d.remaining)}</div>
    </div>
  );
};

const DetailRow = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="pdp-details-row">
      <span className="pdp-details-label">{label}</span>
      <span className="pdp-details-value" title={value}>{value}</span>
    </div>
  );
};

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'credits', label: 'Credits' },
  { id: 'registry', label: 'Registry & Docs' },
];

const ProjectDetailPanel = ({ project, onClose, allRows, setActivePage }) => {
  const isOpen = !!project;
  const [activeTab, setActiveTab] = useState('overview');

  // Reset to the first tab whenever a different project is opened.
  useEffect(() => { setActiveTab('overview'); }, [project?.project_id]);

  // Per-vintage issued/retired for this project (defensive aggregate by year).
  const vintages = useMemo(() => {
    const m = new Map();
    (allRows || []).forEach((r) => {
      if (r.project_id !== project?.project_id) return;
      const y = r.vintage_year;
      if (!y) return;
      const e = m.get(y) || { year: y, issued: 0, retired: 0 };
      e.issued += r.credits_issued;
      e.retired += r.credits_retired;
      m.set(y, e);
    });
    return [...m.values()]
      .map((e) => ({ ...e, remaining: Math.max(e.issued - e.retired, 0) }))
      .sort((a, b) => a.year - b.year);
  }, [allRows, project?.project_id]);

  const openLagHelp = () => {
    if (typeof window !== 'undefined') window.location.hash = 'operational-lag';
    if (setActivePage) setActivePage('about');
  };

  return (
    <div className={`project-detail-panel${isOpen ? ' open' : ''}`}>
      {project && (
        <>
          <div className="pdp-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span className={`reg-badge ${REGISTRY_BADGE_CLASS[project.registry] || ''}`}>
                {project.registry}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {project.project_id}
              </span>
            </div>
            <button className="pdp-close" onClick={onClose} aria-label="Close">×</button>
          </div>

          <div className="pdp-tabs" role="tablist">
            {TABS.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={activeTab === t.id}
                className={`pdp-tab${activeTab === t.id ? ' active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="pdp-tabpanel">
            {/* ---- Overview (Pass 1: existing content; redistributed in Pass 2) ---- */}
            {activeTab === 'overview' && (
              <>
                <div className="pdp-name">{project.project_name || '—'}</div>
                <div className="pdp-meta">
                  {project.country && (COUNTRY_FLAGS[project.country] ? COUNTRY_FLAGS[project.country] + ' ' : '') + project.country}
                  {project.project_type && ` · ${project.project_type}`}
                  {project.methodology && ` · ${project.methodology}`}
                </div>

                {/* Hero credit numbers — lean editorial */}
                <div className="pdp-hero">
                  <div className="pdp-hero-cap">Credits issued</div>
                  <div className="pdp-hero-num">{formatCredits(project.credits_issued)}</div>
                  <div className="pdp-hero-stats">
                    <div>
                      <div className="pdp-stat-cap">Retired</div>
                      <div className="pdp-stat-val">{formatCredits(project.credits_retired)}</div>
                    </div>
                    <div>
                      <div className="pdp-stat-cap">Remaining</div>
                      <div className="pdp-stat-val">{formatCredits(project.credits_remaining)}</div>
                    </div>
                    <div>
                      <div className="pdp-stat-cap">Retirement</div>
                      <div className="pdp-stat-val" style={{ color: retColor(project.retirement_rate) }}>
                        {project.retirement_rate.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Retirement progress bar */}
                <div className="pdp-progress-bar">
                  <div style={{
                    width: `${Math.min(project.retirement_rate, 100)}%`,
                    height: '100%',
                    background: retColor(project.retirement_rate),
                    borderRadius: 3,
                  }} />
                </div>

                {/* Credit type — reduction / removal class + legend */}
                {project.reduction_removal && (
                  <>
                    <div className="pdp-section-label">Credit type</div>
                    <div className="pdp-rr-class">{project.reduction_removal}</div>
                    {RR_LEGEND[project.reduction_removal] && (
                      <div className="pdp-rr-legend">{RR_LEGEND[project.reduction_removal]}</div>
                    )}
                  </>
                )}

                {/* Details list */}
                <div className="detail-section-title" style={{ marginTop: 0 }}>Details</div>
                <DetailRow label="Proponent" value={project.proponent} />
                <DetailRow label="Status" value={project.status} />
                <DetailRow label="Registration date" value={formatDateOnly(project.registration_date)} />
                <DetailRow
                  label="Crediting period"
                  value={
                    project.crediting_period_start && project.crediting_period_end
                      ? `${formatDateOnly(project.crediting_period_start)} – ${formatDateOnly(project.crediting_period_end)}`
                      : '—'
                  }
                />
                <DetailRow label="Verification body" value={project.verification_body} />

                {/* Badges */}
                {(project.corsia_eligible || project.sdg_eligible) && (
                  <div className="pdp-badges">
                    {project.corsia_eligible && (
                      <span className="pdp-badge" style={{ background: '#029bd622', color: '#029bd6' }}>
                        CORSIA eligible
                      </span>
                    )}
                    {project.sdg_eligible && (
                      <span className="pdp-badge" style={{ background: '#8cb73f22', color: '#8cb73f' }}>
                        SDG co-benefits
                      </span>
                    )}
                  </div>
                )}

                {/* Footer links */}
                <div className="pdp-footer">
                  {getRegistryProjectUrl(project.registry, project.project_id) && (
                    <a href={getRegistryProjectUrl(project.registry, project.project_id)} className="pdp-link" target="_blank" rel="noopener noreferrer">
                      ↗ View project page
                    </a>
                  )}
                </div>
              </>
            )}

            {/* ---- Credits (Pass 2b Tier 1) ---- */}
            {activeTab === 'credits' && (
              <>
                <div className="pdp-section-label">Issuance by vintage</div>
                {vintages.length > 0 ? (
                  <>
                    <div className="pdp-chart">
                      <ResponsiveContainer width="100%" height={170}>
                        <BarChart data={vintages} margin={{ top: 4, right: 4, bottom: 0, left: 4 }} barCategoryGap="20%">
                          <XAxis dataKey="year" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} minTickGap={8} />
                          <Tooltip cursor={{ fill: 'var(--border)', opacity: 0.3 }} content={<VintageTooltip />} />
                          <Bar dataKey="retired" stackId="v" fill={REGISTRY_CHART_COLOR[project.registry] || '#8a8a8a'} />
                          <Bar dataKey="remaining" stackId="v" fill={REGISTRY_CHART_COLOR[project.registry] || '#8a8a8a'} fillOpacity={0.22} radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="pdp-chart-caption">Retired (solid) vs remaining by vintage year</div>
                  </>
                ) : (
                  <div className="pdp-tabpanel-empty">Vintage data unavailable.</div>
                )}

                <div className="pdp-section-label">Timeline</div>
                <DetailRow label="First issuance" value={formatDateOnly(project.first_issuance_date)} />
                <div className="pdp-details-row">
                  <span className="pdp-details-label">
                    Operational lag
                    <button type="button" className="pdp-info" onClick={openLagHelp} aria-label="About operational lag">ⓘ</button>
                  </span>
                  <span className="pdp-details-value">
                    {project.operational_lag_years != null ? `${project.operational_lag_years.toFixed(1)} yrs` : '—'}
                  </span>
                </div>
              </>
            )}

            {/* ---- Registry & Docs (Pass 2c) ---- */}
            {activeTab === 'registry' && (
              <div className="pdp-tabpanel-empty">Registry &amp; documentation detail arrives in the next pass.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectDetailPanel;
