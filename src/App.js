import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Overview from './components/pages/Overview';
import ProjectActivity from './components/pages/ProjectActivity';
import Projects from './components/pages/Projects';
import CountryExplorer from './components/pages/CountryExplorer';
import RegistryIntelligence from './components/pages/RegistryIntelligence';
import About from './components/pages/About';
import useData from './hooks/useData';

const LoadingSkeleton = () => (
  <div className="loading-shell">
    <div className="loading-sidebar" />
    <div className="loading-main" style={{ height: 'calc(100vh - 58px)', padding: '0', overflow: 'hidden' }}>
      <div className="skeleton-bar" style={{ height: 44, marginBottom: 1 }} />
      <div className="skeleton-bar" style={{ height: 68, marginBottom: 1 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, flex: 1 }}>
        <div className="skeleton-bar" style={{ height: 300 }} />
        <div className="skeleton-bar" style={{ height: 300 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, marginTop: 1 }}>
        <div className="skeleton-bar" style={{ height: 100 }} />
        <div className="skeleton-bar" style={{ height: 100 }} />
      </div>
    </div>
  </div>
);

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [activePage, setActivePage] = useState('overview');
  const [selectedRegistry, setSelectedRegistry] = useState('all');
  const [yearRange, setYearRange] = useState([1996, 2025]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [initialCountry, setInitialCountry] = useState(null);

  const handleNavigateToCountry = useCallback((countryName) => {
    setInitialCountry(countryName);
    setActivePage('country');
  }, []);

  useEffect(() => {
    if (activePage !== 'country') setInitialCountry(null);
  }, [activePage]);

  const data = useData(selectedRegistry, yearRange, selectedActivity);

  const yearRangeInitialized = useRef(false);
  useEffect(() => {
    if (!data.loading && data.dataMinYear && data.releaseYear && !yearRangeInitialized.current) {
      yearRangeInitialized.current = true;
      setYearRange([data.dataMinYear, data.releaseYear]);
    }
  }, [data.loading, data.dataMinYear, data.releaseYear]);

  const handleReset = useCallback(() => {
    setActivePage('overview');
    setSelectedActivity(null);
    setSelectedRegistry('all');
    setYearRange([data.dataMinYear || 1996, data.releaseYear || 2025]);
    setActiveGroup(null);
  }, [data.dataMinYear, data.releaseYear]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleExport = useCallback(() => {
    if (!data.filteredAgg || data.filteredAgg.length === 0) return;
    const headers = ['Registry', 'Category', 'Year', 'Credits'];
    const rows = data.filteredAgg.map(d =>
      [d.registry, d.category, d.year, d.credits].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carbonledger_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data.filteredAgg]);

  if (data.loading) return <LoadingSkeleton />;

  if (data.error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#e85724', fontFamily: 'Inter' }}>
        Failed to load data. Please check CSV files and refresh.
      </div>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case 'projects':
        return <Projects data={data} selectedRegistry={selectedRegistry} selectedYearRange={yearRange} />;
      case 'activity':
        return <ProjectActivity data={data} />;
      case 'country':
        return <CountryExplorer data={data} isDarkMode={darkMode} initialCountry={initialCountry} />;
      case 'registry':
        return <RegistryIntelligence data={data} />;
      case 'about':
        return <About />;
      default:
        return (
          <Overview
            data={data}
            selectedRegistry={selectedRegistry}
            selectedActivity={selectedActivity}
            setSelectedActivity={setSelectedActivity}
            setActivePage={setActivePage}
            activeGroup={activeGroup}
            setActiveGroup={setActiveGroup}
            onReset={handleReset}
            onCountryClick={handleNavigateToCountry}
          />
        );
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onExport={handleExport}
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
      />
      <div className="app-main">
        <Topbar
          activePage={activePage}
          selectedRegistry={selectedRegistry}
          setSelectedRegistry={setSelectedRegistry}
          yearRange={yearRange}
          setYearRange={setYearRange}
          dataMinYear={data.dataMinYear}
          dataMaxYear={data.releaseYear}
          onExport={handleExport}
          onReset={handleReset}
          isDarkMode={darkMode}
        />
        <div className="app-page">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

export default App;
