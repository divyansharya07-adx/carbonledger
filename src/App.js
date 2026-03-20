import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Overview from './components/pages/Overview';
import ProjectActivity from './components/pages/ProjectActivity';
import CountryExplorer from './components/pages/CountryExplorer';
import RegistryIntelligence from './components/pages/RegistryIntelligence';
import About from './components/pages/About';
import useData from './hooks/useData';

const LoadingSkeleton = () => (
  <div className="loading-shell">
    <div className="loading-sidebar" />
    <div className="loading-main">
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
  const [darkMode, setDarkMode] = useState(true);
  const [activePage, setActivePage] = useState('overview');
  const [selectedRegistry, setSelectedRegistry] = useState('all');
  const [yearRange, setYearRange] = useState([2000, 2025]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  const handleReset = useCallback(() => {
    setSelectedActivity(null);
    setSelectedRegistry('all');
    setYearRange([2000, 2025]);
    setActiveGroup(null);
  }, []);

  const data = useData(selectedRegistry, yearRange, selectedActivity);

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
      case 'activity':
        return <ProjectActivity data={data} />;
      case 'country':
        return <CountryExplorer data={data} />;
      case 'registry':
        return <RegistryIntelligence data={data} />;
      case 'about':
        return <About />;
      default:
        return (
          <Overview
            data={data}
            selectedActivity={selectedActivity}
            setSelectedActivity={setSelectedActivity}
            setActivePage={setActivePage}
            activeGroup={activeGroup}
            setActiveGroup={setActiveGroup}
            onReset={handleReset}
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
          onExport={handleExport}
          onReset={handleReset}
        />
        <div className="app-page">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

export default App;
