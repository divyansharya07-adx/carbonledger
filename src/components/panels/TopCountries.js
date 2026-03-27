import { useMemo } from 'react';
import { formatCredits } from '../../utils/formatters';

const TopCountries = ({ data, selectedActivity, onNavigateCountry }) => {
  const countries = useMemo(() => {
    if (!data) return [];
    if (selectedActivity) return data.getActivityCountries(selectedActivity);
    return data.creditsByCountry;
  }, [data, selectedActivity]);

  const maxCredits = countries.length > 0 ? countries[0].credits : 1;
  const totalForDenom = countries.reduce((s, c) => s + c.credits, 0);
  const contextLabel = selectedActivity || 'global';

  return (
    <div className="top-countries-panel overview-top-countries">
      <div className="top-countries-header">
        <div className="top-countries-title">
          ◎ Top Countries
          <span className="context-badge">{contextLabel}</span>
        </div>
        <span className="explorer-link" onClick={onNavigateCountry}>
          Explorer →
        </span>
      </div>
      <div className="country-list">
        {countries.map((country) => {
          const pct = maxCredits > 0 ? (country.credits / maxCredits) * 100 : 0;
          return (
            <div key={country.name} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 50px 55px', alignItems: 'center', gap: '8px', paddingTop: '6px', paddingBottom: '6px' }}>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 400 }}>{country.name}</div>
              <div className="country-bar-bg">
                <div className="country-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="cl-tooltip-wrap">
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 400 }}>
                  {formatCredits(country.credits)}
                </div>
                <span className="cl-tooltip">Credits issued</span>
              </div>
              <div className="cl-tooltip-wrap">
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap', fontSize: '11px', color: 'var(--text-muted)', marginRight: '8px' }}>
                  {totalForDenom > 0 ? ((country.credits / totalForDenom) * 100).toFixed(1) + '%' : '0.0%'}
                </div>
                <span className="cl-tooltip">Credit share</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TopCountries;
