import { useState, useEffect } from 'react';
import Papa from 'papaparse';

// Nullable numeric parse: preserves null (empty cell) instead of coercing to 0,
// so fields like operational_lag_years distinguish "0.0 years" from "N/A".
const numOrNull = (v) => {
  const s = (v ?? '').toString().trim();
  if (s === '' || s.toLowerCase() === 'nan') return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
};

const useProjectsData = () => {
  const [projectsData, setProjectsData] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState(null);

  useEffect(() => {
    Papa.parse(process.env.PUBLIC_URL + '/data/projects_data.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (r) => {
        const parsed = r.data.map((row) => ({
          project_id: (row['project_id'] || '').trim(),
          project_name: (row['project_name'] || '').trim(),
          registry: (row['registry'] || '').trim(),
          country: (row['country'] || '').trim() || null,
          project_type: (row['project_type'] || '').trim() || null,
          methodology: (row['methodology'] || '').trim() || null,
          category: (row['category'] || '').trim() || null,
          proponent: (row['proponent'] || '').trim() || null,
          status: (row['status'] || '').trim() || null,
          registration_date: (row['registration_date'] || '').trim() || null,
          credits_issued: parseInt(row['credits_issued'], 10) || 0,
          credits_retired: parseInt(row['credits_retired'], 10) || 0,
          credits_remaining: parseInt(row['credits_remaining'], 10) || 0,
          retirement_rate: parseFloat(row['retirement_rate']) || 0,
          corsia_eligible: row['corsia_eligible'] === 'True' || row['corsia_eligible'] === 'true' || row['corsia_eligible'] === '1',
          sdg_eligible: row['sdg_eligible'] === 'True' || row['sdg_eligible'] === 'true' || row['sdg_eligible'] === '1',
          article_six_authorized: row['article_six_authorized'] === 'True' || row['article_six_authorized'] === 'true' || row['article_six_authorized'] === '1',
          crediting_period_start: (row['crediting_period_start'] || '').trim() || null,
          crediting_period_end: (row['crediting_period_end'] || '').trim() || null,
          verification_body: (row['verification_body'] || '').trim() || null,
          documents_url: (row['documents_url'] || '').trim() || null,
          vintage_year: parseInt(row['vintage_year'], 10) || 0,
          lifetime_credits_issued: parseFloat(row['lifetime_credits_issued']) || 0,
          lifetime_credits_retired: parseFloat(row['lifetime_credits_retired']) || 0,
          // 23b-4 enrichment columns (project-level; broadcast across a project's vintage rows)
          first_issuance_date: (row['first_issuance_date'] || '').trim() || null,
          reduction_removal: (row['reduction_removal'] || '').trim() || null,
          total_buffer_pool_deposits: numOrNull(row['total_buffer_pool_deposits']),
          buffer_credits_released: numOrNull(row['buffer_credits_released']),
          reversals_covered_buffer: numOrNull(row['reversals_covered_buffer']),
          reversals_not_covered: numOrNull(row['reversals_not_covered']),
          registry_documents_url: (row['registry_documents_url'] || '').trim() || null,
          estimated_annual_reductions: numOrNull(row['estimated_annual_reductions']),
          first_vintage_year_f2: numOrNull(row['first_vintage_year_f2']),
          operational_lag_years: numOrNull(row['operational_lag_years']),
        }));
        setProjectsData(parsed);
        setProjectsLoading(false);
      },
      error: (e) => {
        setProjectsError(e);
        setProjectsLoading(false);
      },
    });
  }, []);

  return { projectsData, projectsLoading, projectsError };
};

export default useProjectsData;
