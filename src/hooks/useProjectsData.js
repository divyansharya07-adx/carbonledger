import { useState, useEffect } from 'react';
import Papa from 'papaparse';

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
          crediting_period_start: (row['crediting_period_start'] || '').trim() || null,
          crediting_period_end: (row['crediting_period_end'] || '').trim() || null,
          verification_body: (row['verification_body'] || '').trim() || null,
          documents_url: (row['documents_url'] || '').trim() || null,
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
