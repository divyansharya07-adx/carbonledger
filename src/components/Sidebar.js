import { useState } from 'react';
import { LayoutGrid, Hexagon, Globe, Diamond, TrendingUp, Download, Info, Sun, Moon, ChevronLeft, ChevronRight, Menu, LayoutList } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', icon: LayoutGrid, label: 'Overview' },
  { id: 'projects', icon: LayoutList, label: 'Projects' },
  { id: 'activity', icon: Hexagon, label: 'Project Activity' },
  { id: 'country', icon: Globe, label: 'Country Explorer' },
  { id: 'registry', icon: Diamond, label: 'Registry Intelligence' },
];

const Sidebar = ({ activePage, setActivePage, darkMode, setDarkMode, onExport, sidebarExpanded, setSidebarExpanded }) => {
  const [hovered, setHovered] = useState(null);

  return (
    <div className={`sidebar${!sidebarExpanded ? ' collapsed' : ''}`}>
      <div className="sidebar-logo" onClick={() => setActivePage('overview')}>
        <div className="sidebar-logo-mark"><Menu size={20} /></div>
        <button
          className="sidebar-collapse-btn"
          onClick={(e) => { e.stopPropagation(); setSidebarExpanded(!sidebarExpanded); }}
          title={sidebarExpanded ? 'Collapse' : 'Expand'}
        >
          {sidebarExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      <div className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`sidebar-btn ${activePage === item.id ? 'active' : ''}`}
            onClick={() => setActivePage(item.id)}
            onMouseEnter={() => setHovered(item.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <item.icon size={16} />
            <span>{item.label}</span>
            {!sidebarExpanded && hovered === item.id && (
              <div className="sidebar-tooltip">{item.label}</div>
            )}
          </button>
        ))}

        <div className="sidebar-divider" />

        <button
          className="sidebar-btn disabled"
          onMouseEnter={() => setHovered('trends')}
          onMouseLeave={() => setHovered(null)}
        >
          <TrendingUp size={16} />
          <span>Trends</span>
          {hovered === 'trends' && (
            <div className="sidebar-tooltip">Coming soon</div>
          )}
        </button>

        <button
          className="sidebar-btn"
          onClick={onExport}
          onMouseEnter={() => setHovered('export')}
          onMouseLeave={() => setHovered(null)}
        >
          <Download size={16} />
          <span>Export</span>
          {hovered === 'export' && (
            <div className="sidebar-tooltip">Export CSV</div>
          )}
        </button>
      </div>

      <div className="sidebar-bottom">
        <button
          className={`sidebar-btn ${activePage === 'about' ? 'active' : ''}`}
          onClick={() => setActivePage('about')}
          onMouseEnter={() => setHovered('about')}
          onMouseLeave={() => setHovered(null)}
        >
          <Info size={16} />
          <span>About</span>
          {hovered === 'about' && (
            <div className="sidebar-tooltip">About</div>
          )}
        </button>
        <button
          className="sidebar-btn"
          onClick={() => setDarkMode(!darkMode)}
          onMouseEnter={() => setHovered('theme')}
          onMouseLeave={() => setHovered(null)}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
          {hovered === 'theme' && (
            <div className="sidebar-tooltip">{darkMode ? 'Light mode' : 'Dark mode'}</div>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
