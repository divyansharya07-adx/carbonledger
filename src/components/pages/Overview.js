import KPIStrip from '../panels/KPIStrip';
import ActivityIntelligence from '../panels/ActivityIntelligence';
import GlobalMap from '../panels/GlobalMap';
import InsightCards from '../panels/InsightCards';
import TopCountries from '../panels/TopCountries';

const Overview = ({ data, selectedRegistry, setActivePage, selectedGroup, onReset, onCountryClick }) => {
  return (
    <div className="overview-grid">
      <KPIStrip data={data} selectedGroup={selectedGroup} />
      <ActivityIntelligence data={data} />
      <GlobalMap data={data} selectedRegistry={selectedRegistry} onCountryClick={onCountryClick} />
      <InsightCards data={data} selectedGroup={selectedGroup} />
      <TopCountries
        data={data}
        onNavigateCountry={() => setActivePage('country')}
      />
    </div>
  );
};

export default Overview;
