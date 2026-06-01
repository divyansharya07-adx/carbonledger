import { useState, useEffect } from 'react';
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

const ProjectDetailPanel = ({ project, onClose }) => {
  const isOpen = !!project;
  const [activeTab, setActiveTab] = useState('overview');

  // Reset to the first tab whenever a different project is opened.
  useEffect(() => { setActiveTab('overview'); }, [project?.project_id]);

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

            {/* ---- Credits (Pass 2b) ---- */}
            {activeTab === 'credits' && (
              <div className="pdp-tabpanel-empty">Credits detail arrives in the next pass.</div>
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
