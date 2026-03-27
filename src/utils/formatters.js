/**
 * Formatting utilities for CarbonLedger
 */

export const formatCredits = (value) => {
  if (value == null || isNaN(value)) return '0';
  if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
  if (value >= 1e6) return Math.round(value / 1e6) + 'm';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
  return value.toLocaleString();
};

export const formatPct = (value) => {
  if (value == null || isNaN(value)) return '0.0%';
  return value.toFixed(1) + '%';
};

export const GROUP_MAP = {
  'Forest & Nature': [
    'Afforestation/Reforestation',
    'Forest management',
    'Reforestation and ecosystem restoration',
    'Rewilding',
  ],
  'Energy': [
    'Bioenergy',
    'Cleaner cooking',
    'Electric vehicles',
    'Energy storage',
    'Geothermal',
    'Grid efficiency',
    'Hydropower',
    'Mixed renewables',
    'Solar',
    'Wind',
    'Efficient appliances',
  ],
  'Agriculture': [
    'Soil & Livestock',
    'Biochar',
    'Composting',
    'Rice cultivation',
    'Water purification',
    'Wastewater treatment',
  ],
  'Waste & Industrial': [
    'Fossil gas leaks',
    'Heat recovery',
    'Industrial efficiency',
    'Landfill gas',
    'Nitric acid',
    'Oil Field Gas Recovery',
    'Public transit',
    'Waste management',
    'Waste to energy',
  ],
};

export const GROUP_COLORS = {
  'Forest & Nature': '#8cb73f',
  'Energy': '#029bd6',
  'Agriculture': '#CCDF84',
  'Waste & Industrial': '#e85724',
};

export const REGISTRY_COLORS = {
  'Verra': '#029bd6',
  'Gold Standard': '#8cb73f',
  'ACR': '#e85724',
  'ARB': '#CCDF84',
  'CAR': '#CCDF84',
};

export const EXCLUDED_CATEGORIES = ['No Methodology Provided', 'Unmatched', 'Other'];

export const getGroup = (category) => {
  for (const [group, cats] of Object.entries(GROUP_MAP)) {
    if (cats.includes(category)) return group;
  }
  return 'Waste & Industrial';
};

export const getGroupColor = (category) => {
  return GROUP_COLORS[getGroup(category)] || '#e85724';
};

export const generatePulseSentence = ({ totalCredits, activityCount, countryCount, selectedActivity, selectedRegistry, creditsByRegistry, creditsByActivity }) => {
  if (selectedActivity && selectedActivity !== 'all') {
    const actData = creditsByActivity?.find(a => a.name === selectedActivity);
    if (actData) {
      const topReg = actData.registryBreakdown?.[0];
      const regPct = topReg && actData.credits > 0 ? ((topReg.credits / actData.credits) * 100).toFixed(0) : 0;
      return `${selectedActivity} accounts for ${formatCredits(actData.credits)} credits, with ${topReg?.name || 'Verra'} holding ${regPct}% of all credits issued.`;
    }
  }
  if (selectedRegistry && selectedRegistry !== 'all') {
    const regData = creditsByRegistry?.find(r => r.name.toLowerCase().startsWith(selectedRegistry.toLowerCase()));
    if (regData) {
      const pct = totalCredits > 0 ? ((regData.credits / totalCredits) * 100).toFixed(1) : 0;
      return `${regData.name} has issued ${formatCredits(regData.credits)} credits — ${pct}% of the entire voluntary carbon market.`;
    }
  }
  return `The voluntary carbon market has issued ${formatCredits(totalCredits)} credits across ${activityCount} project types and ${countryCount} countries.`;
};
