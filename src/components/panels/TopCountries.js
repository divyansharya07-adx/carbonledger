import { useMemo } from 'react';
import { formatCredits } from '../../utils/formatters';

const TopCountries = ({ data, selectedActivity, onNavigateCountry }) => {
  const countries = useMemo(() => {
    if (!data) return [];
    if (selectedActivity) return data.getActivityCountries(selectedActivity);
    return data.creditsByCountry;
  }, [data, selectedActivity]);

  const maxCredits = countries.length > 0 ? countries[0].credits : 1;
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
            <div key={country.name} className="country-row">
              <div className="country-name">{country.name}</div>
              <div className="country-bar-bg">
                <div className="country-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="country-credits">{formatCredits(country.credits)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TopCountries;
