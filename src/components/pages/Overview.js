import KPIStrip from '../panels/KPIStrip';
import ActivityIntelligence from '../panels/ActivityIntelligence';
import GlobalMap from '../panels/GlobalMap';
import InsightCards from '../panels/InsightCards';
import TopCountries from '../panels/TopCountries';

const Overview = ({ data, selectedRegistry, selectedActivity, setSelectedActivity, setActivePage, selectedGroup, onReset, onCountryClick }) => {
  return (
    <div className="overview-grid">
      <KPIStrip data={data} selectedActivity={selectedActivity} selectedGroup={selectedGroup} />
      <ActivityIntelligence
        data={data}
        selectedActivity={selectedActivity}
        setSelectedActivity={setSelectedActivity}
      />
      <GlobalMap data={data} selectedRegistry={selectedRegistry} selectedActivity={selectedActivity} onCountryClick={onCountryClick} />
      <InsightCards data={data} selectedActivity={selectedActivity} selectedGroup={selectedGroup} />
      <TopCountries
        data={data}
        selectedActivity={selectedActivity}
        onNavigateCountry={() => setActivePage('country')}
      />
    </div>
  );
};

export default Overview;
