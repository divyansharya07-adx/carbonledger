import KPIStrip from '../panels/KPIStrip';
import ActivityIntelligence from '../panels/ActivityIntelligence';
import GlobalMap from '../panels/GlobalMap';
import InsightCards from '../panels/InsightCards';
import TopCountries from '../panels/TopCountries';

const Overview = ({ data, selectedActivity, setSelectedActivity, setActivePage, activeGroup, setActiveGroup, onReset, onCountryClick }) => {
  return (
    <div className="overview-grid">
      <KPIStrip data={data} selectedActivity={selectedActivity} activeGroup={activeGroup} />
      <ActivityIntelligence
        data={data}
        selectedActivity={selectedActivity}
        setSelectedActivity={setSelectedActivity}
        activeGroup={activeGroup}
        setActiveGroup={setActiveGroup}
        onReset={onReset}
      />
      <GlobalMap data={data} selectedActivity={selectedActivity} onCountryClick={onCountryClick} />
      <InsightCards data={data} selectedActivity={selectedActivity} />
      <TopCountries
        data={data}
        selectedActivity={selectedActivity}
        onNavigateCountry={() => setActivePage('country')}
      />
    </div>
  );
};

export default Overview;
