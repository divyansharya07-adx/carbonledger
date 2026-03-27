import { formatCredits } from '../../utils/formatters';
import { COUNTRY_FLAGS } from '../pages/Projects';

const REGISTRY_URLS = {
  'Verra': 'https://registry.verra.org',
  'Gold Standard': 'https://registry.goldstandard.org',
  'ACR': 'https://acr2.apx.com',
  'CAR': 'https://thereserve2.apx.com',
};

const REGISTRY_BADGE_CLASS = {
  'Verra': 'verra',
  'Gold Standard': 'gold-standard',
  'ACR': 'acr',
  'CAR': 'car',
};

const retColor = (pct) => pct > 60 ? '#8cb73f' : pct > 30 ? '#e8a124' : '#e85724';

const DetailRow = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="pdp-details-row">
      <span className="pdp-details-label">{label}</span>
      <span className="pdp-details-value" title={value}>{value}</span>
    </div>
  );
};

const ProjectDetailPanel = ({ project, onClose }) => {
  const isOpen = !!project;

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

          <div className="pdp-body">
            <div className="pdp-name">{project.project_name || '—'}</div>
            <div className="pdp-meta">
              {project.country && (COUNTRY_FLAGS[project.country] ? COUNTRY_FLAGS[project.country] + ' ' : '') + project.country}
              {project.project_type && ` · ${project.project_type}`}
              {project.methodology && ` · ${project.methodology}`}
            </div>

            {/* Mini KPI grid */}
            <div className="detail-kpi-grid">
              <div className="detail-kpi">
                <div className="dk-label">CREDITS ISSUED</div>
                <div className="dk-value">{formatCredits(project.credits_issued)}</div>
              </div>
              <div className="detail-kpi">
                <div className="dk-label">CREDITS RETIRED</div>
                <div className="dk-value">{formatCredits(project.credits_retired)}</div>
              </div>
              <div className="detail-kpi">
                <div className="dk-label">REMAINING</div>
                <div className="dk-value">{formatCredits(project.credits_remaining)}</div>
              </div>
              <div className="detail-kpi">
                <div className="dk-label">RETIREMENT RATE</div>
                <div className="dk-value" style={{ color: retColor(project.retirement_rate) }}>
                  {project.retirement_rate.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Retirement progress bar */}
            <div className="pdp-progress-label">
              <span>Retirement progress</span>
              <span style={{ color: retColor(project.retirement_rate) }}>{project.retirement_rate.toFixed(1)}% retired</span>
            </div>
            <div className="pdp-progress-bar">
              <div style={{
                width: `${Math.min(project.retirement_rate, 100)}%`,
                height: '100%',
                background: retColor(project.retirement_rate),
                borderRadius: 3,
              }} />
            </div>

            {/* Details list */}
            <div className="detail-section-title" style={{ marginTop: 0 }}>Details</div>
            <DetailRow label="Proponent" value={project.proponent} />
            <DetailRow label="Status" value={project.status} />
            <DetailRow label="Registration date" value={project.registration_date} />
            <DetailRow
              label="Crediting period"
              value={
                project.crediting_period_start && project.crediting_period_end
                  ? `${project.crediting_period_start} – ${project.crediting_period_end}`
                  : project.crediting_period_start || project.crediting_period_end || null
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
              {project.documents_url ? (
                <a href={project.documents_url} className="pdp-link" target="_blank" rel="noopener noreferrer">
                  ↗ View on registry
                </a>
              ) : (
                <span className="pdp-link unavailable">Documents not available</span>
              )}
              {REGISTRY_URLS[project.registry] && (
                <a href={REGISTRY_URLS[project.registry]} className="pdp-link" target="_blank" rel="noopener noreferrer">
                  ↗ View registry page
                </a>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectDetailPanel;
