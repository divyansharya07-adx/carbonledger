import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { EXCLUDED_CATEGORIES, getGroup, REGISTRY_COLORS } from '../utils/formatters';

const COUNTRY_NAME_MAP = {
  'Congo, The Democratic Republic of The': 'DR Congo',
  'Congo, Republic of': 'Congo',
  'Korea, Republic of': 'South Korea',
  'Tanzania, United Republic of': 'Tanzania',
  "Lao People's Democratic Republic": 'Laos',
  'Bolivia, Plurinational State of': 'Bolivia',
  'Venezuela, Bolivarian Republic of': 'Venezuela',
  'Iran, Islamic Republic of': 'Iran',
  'Viet Nam': 'Vietnam',
  'Russian Federation': 'Russia',
  'Syrian Arab Republic': 'Syria',
  "Côte d'Ivoire": 'Ivory Coast',
  'Moldova, Republic of': 'Moldova',
  'US': 'United States',
  'MX': 'Mexico',
  'DE': 'Germany',
  'FR': 'France',
  'NI': 'Nicaragua',
  'SV': 'El Salvador',
  'Lao': 'Laos',
  'Bolivia Plurinational State of': 'Bolivia',
  "C\u221a\u00a5te d'Ivoire": 'Ivory Coast',
  'Tanzania United Republic of': 'Tanzania',
  'Tanzania, United Republic Of': 'Tanzania',
};

const useData = (selectedRegistry, selectedYearRange, selectedActivity) => {
  const [rawAgg, setRawAgg] = useState(null);
  const [rawCountry, setRawCountry] = useState(null);
  const [rawProjCounts, setRawProjCounts] = useState(null);
  const [rawProjectsData, setRawProjectsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load CSVs on mount
  useEffect(() => {
    const loadCSV = (url) =>
      new Promise((resolve, reject) => {
        Papa.parse(url, {
          download: true,
          header: true,
          skipEmptyLines: true,
          complete: (r) => resolve(r.data),
          error: (e) => reject(e),
        });
      });

    Promise.all([
      loadCSV(process.env.PUBLIC_URL + '/aggregated_data.csv'),
      loadCSV(process.env.PUBLIC_URL + '/country_aggregated_data.csv'),
      loadCSV(process.env.PUBLIC_URL + '/project_counts.csv'),
      loadCSV(process.env.PUBLIC_URL + '/data/projects_data.csv'),
    ])
      .then(([agg, country, projCounts, projects]) => {
        const normalizeAgg = agg
          .map((r) => ({
            registry: (r['Registry'] || '').trim(),
            category: (r['Project Type Category'] || '').trim(),
            year: parseFloat(r['Vintage Year']) || 0,
            credits: parseInt(r['Total Credits Issued']) || 0,
          }))
          .filter((d) => d.registry && d.category && d.year > 0 && !EXCLUDED_CATEGORIES.includes(d.category));

        const normalizeCountry = country
          .map((r) => ({
            registry: (r['Registry'] || '').trim(),
            country: (() => { const raw = (r['Country'] || '').trim(); return COUNTRY_NAME_MAP[raw] || raw; })(),
            category: (r['Project Type Category'] || '').trim(),
            year: parseFloat(r['Vintage Year']) || 0,
            credits: parseInt(r['Total Credits Issued']) || 0,
          }))
          .filter((d) => d.registry && d.country && d.country !== 'International' && d.category && d.year > 0 && !EXCLUDED_CATEGORIES.includes(d.category));

        const projectsData = projects.map((r) => ({
          project_id: (r['project_id'] || '').trim(),
          project_name: (r['project_name'] || '').trim(),
          registry: (r['registry'] || '').trim(),
          country: (r['country'] || '').trim() || null,
          project_type: (r['project_type'] || '').trim() || null,
          methodology: (r['methodology'] || '').trim() || null,
          category: (r['category'] || '').trim() || null,
          proponent: (r['proponent'] || '').trim() || null,
          status: (r['status'] || '').trim() || null,
          registration_date: (r['registration_date'] || '').trim() || null,
          credits_issued: parseInt(r['credits_issued'], 10) || 0,
          credits_retired: parseInt(r['credits_retired'], 10) || 0,
          credits_remaining: parseInt(r['credits_remaining'], 10) || 0,
          retirement_rate: parseFloat(r['retirement_rate']) || 0,
          corsia_eligible: r['corsia_eligible'] === 'True' || r['corsia_eligible'] === 'true' || r['corsia_eligible'] === '1',
          sdg_eligible: r['sdg_eligible'] === 'True' || r['sdg_eligible'] === 'true' || r['sdg_eligible'] === '1',
          crediting_period_start: (r['crediting_period_start'] || '').trim() || null,
          crediting_period_end: (r['crediting_period_end'] || '').trim() || null,
          verification_body: (r['verification_body'] || '').trim() || null,
          documents_url: (r['documents_url'] || '').trim() || null,
        }));

        setRawAgg(normalizeAgg);
        setRawCountry(normalizeCountry);
        setRawProjCounts(projCounts);
        setRawProjectsData(projectsData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('CSV load error:', err);
        setError(err);
        setLoading(false);
      });
  }, []);

  // Apply global filters
  const filteredAgg = useMemo(() => {
    if (!rawAgg) return [];
    return rawAgg.filter((d) => {
      if (selectedYearRange) {
        if (d.year < selectedYearRange[0] || (d.year > selectedYearRange[1] && d.year <= 2025)) return false;
      }
      if (selectedRegistry && selectedRegistry !== 'all') {
        const regLower = selectedRegistry.toLowerCase();
        if (regLower === 'gold') {
          if (d.registry !== 'Gold Standard') return false;
        } else if (regLower === 'car') {
          if (d.registry !== 'CAR') return false;
        } else {
          if (d.registry.toLowerCase() !== regLower) return false;
        }
      }
      return true;
    });
  }, [rawAgg, selectedRegistry, selectedYearRange]);

  const filteredCountry = useMemo(() => {
    if (!rawCountry) return [];
    return rawCountry.filter((d) => {
      if (selectedYearRange) {
        if (d.year < selectedYearRange[0] || (d.year > selectedYearRange[1] && d.year <= 2025)) return false;
      }
      if (selectedRegistry && selectedRegistry !== 'all') {
        const regLower = selectedRegistry.toLowerCase();
        if (regLower === 'gold') {
          if (d.registry !== 'Gold Standard') return false;
        } else if (regLower === 'car') {
          if (d.registry !== 'CAR') return false;
        } else {
          if (d.registry.toLowerCase() !== regLower) return false;
        }
      }
      return true;
    });
  }, [rawCountry, selectedRegistry, selectedYearRange]);

  // Computed values
  const totalCredits = useMemo(() => filteredAgg.reduce((s, d) => s + d.credits, 0), [filteredAgg]);

  const creditsByActivity = useMemo(() => {
    const map = {};
    filteredAgg.forEach((d) => {
      if (!map[d.category]) map[d.category] = { credits: 0, registries: {} };
      map[d.category].credits += d.credits;
      if (!map[d.category].registries[d.registry]) map[d.category].registries[d.registry] = 0;
      map[d.category].registries[d.registry] += d.credits;
    });
    return Object.entries(map)
      .map(([name, info]) => ({
        name,
        credits: info.credits,
        group: getGroup(name),
        registryBreakdown: Object.entries(info.registries)
          .map(([rName, rCredits]) => ({ name: rName, credits: rCredits, color: REGISTRY_COLORS[rName] || '#999' }))
          .sort((a, b) => b.credits - a.credits),
      }))
      .sort((a, b) => b.credits - a.credits);
  }, [filteredAgg]);

  const creditsByRegistry = useMemo(() => {
    const map = {};
    filteredAgg.forEach((d) => {
      if (!map[d.registry]) map[d.registry] = 0;
      map[d.registry] += d.credits;
    });
    return Object.entries(map)
      .map(([name, credits]) => ({ name, credits, color: REGISTRY_COLORS[name] || '#999' }))
      .sort((a, b) => b.credits - a.credits);
  }, [filteredAgg]);

  const creditsByCountry = useMemo(() => {
    const map = {};
    filteredCountry.forEach((d) => {
      if (!map[d.country]) map[d.country] = { credits: 0, activities: new Set() };
      map[d.country].credits += d.credits;
      map[d.country].activities.add(d.category);
    });
    return Object.entries(map)
      .map(([name, info]) => ({ name, credits: info.credits, activityCount: info.activities.size }))
      .sort((a, b) => b.credits - a.credits);
  }, [filteredCountry]);

  const creditsByActivityAndRegistry = useMemo(() => {
    // For each activity, registry breakdown
    return creditsByActivity;
  }, [creditsByActivity]);

  const creditsByCountryAndActivity = useMemo(() => {
    const map = {};
    filteredCountry.forEach((d) => {
      const key = d.country;
      if (!map[key]) map[key] = {};
      if (!map[key][d.category]) map[key][d.category] = 0;
      map[key][d.category] += d.credits;
    });
    return map;
  }, [filteredCountry]);

  const allActivities = useMemo(() => {
    const set = new Set(filteredAgg.map((d) => d.category));
    return Array.from(set).sort();
  }, [filteredAgg]);

  const allCountries = useMemo(() => {
    const set = new Set(filteredCountry.map((d) => d.country));
    return Array.from(set).sort();
  }, [filteredCountry]);

  const creditsByGroup = useMemo(() => {
    const map = {};
    creditsByActivity.forEach((a) => {
      if (!map[a.group]) map[a.group] = 0;
      map[a.group] += a.credits;
    });
    return map;
  }, [creditsByActivity]);

  const projectCountByCategory = useMemo(() => {
    if (!rawProjCounts) return {};
    const map = {};
    rawProjCounts.forEach((row) => {
      const reg = (row['Registry'] || '').trim();
      const cat = (row['Project Type Category'] || '').trim();
      const cnt = parseInt(row['Project Count'], 10) || 0;
      if (!cat) return;
      if (selectedRegistry && selectedRegistry !== 'all') {
        const regLower = selectedRegistry.toLowerCase();
        if (regLower === 'gold') {
          if (reg !== 'Gold Standard') return;
        } else if (regLower === 'car') {
          if (reg !== 'CAR') return;
        } else {
          if (reg.toLowerCase() !== regLower) return;
        }
      }
      map[cat] = (map[cat] || 0) + cnt;
    });
    return map;
  }, [rawProjCounts, selectedRegistry]);

  const totalProjectCount = useMemo(
    () => Object.values(projectCountByCategory).reduce((s, v) => s + v, 0),
    [projectCountByCategory]
  );

  // Country-specific data for country explorer
  const getCountryData = (countryName) => {
    if (!countryName || countryName === '🌍 Global') {
      return {
        records: filteredCountry,
        isGlobal: true,
      };
    }
    return {
      records: filteredCountry.filter((d) => d.country === countryName),
      isGlobal: false,
    };
  };

  // Activity-specific country data
  const getActivityCountries = (activityName) => {
    if (!activityName) return [];
    const map = {};
    filteredCountry.forEach((d) => {
      if (d.category === activityName) {
        if (!map[d.country]) map[d.country] = 0;
        map[d.country] += d.credits;
      }
    });
    return Object.entries(map)
      .map(([name, credits]) => ({ name, credits }))
      .sort((a, b) => b.credits - a.credits);
  };

  // Trend data for an activity
  const getActivityTrend = (activityName) => {
    const map = {};
    filteredAgg.forEach((d) => {
      if (d.category === activityName) {
        const yr = Math.floor(d.year);
        if (!map[yr]) map[yr] = 0;
        map[yr] += d.credits;
      }
    });
    return Object.entries(map)
      .map(([year, credits]) => ({ year: parseInt(year), credits }))
      .sort((a, b) => a.year - b.year);
  };

  return {
    loading,
    error,
    totalCredits,
    creditsByActivity,
    creditsByRegistry,
    creditsByCountry,
    creditsByActivityAndRegistry,
    creditsByCountryAndActivity,
    allActivities,
    allCountries,
    creditsByGroup,
    filteredAgg,
    filteredCountry,
    getCountryData,
    getActivityCountries,
    getActivityTrend,
    projectCountByCategory,
    totalProjectCount,
    projectsData: rawProjectsData || [],
  };
};

export default useData;
