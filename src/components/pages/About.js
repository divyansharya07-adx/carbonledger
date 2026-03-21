import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { GROUP_MAP } from '../../utils/formatters';

const REG_DISPLAY = { Gold: 'Gold Standard', Verra: 'Verra', ACR: 'ACR', CAR: 'CAR', ART: 'ART' };

const REG_COLORS = {
  'Verra':         '#029bd6',
  'Gold Standard': '#8cb73f',
  'ACR':           '#e85724',
  'CAR':           '#CCDF84',
  'ART':           '#aaaaaa',
};

const About = () => {
  const [taxonomy, setTaxonomy] = useState(null);
  const [taxonomyOpen, setTaxonomyOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState(new Set());
  const [openSubs, setOpenSubs] = useState(new Set());

  useEffect(() => {
    Papa.parse(process.env.PUBLIC_URL + '/methodology_mapping.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const tax = {};
        for (const [group, projectTypes] of Object.entries(GROUP_MAP)) {
          tax[group] = {};
          for (const pt of projectTypes) tax[group][pt] = {};
        }

        data.forEach(row => {
          const registry = (row['Registry'] || '').trim();
          const rawName  = (row['Methodology Name'] || '').trim();
          const category = (row['Project Type Category'] || '').trim();

          const group = Object.entries(GROUP_MAP).find(([, cats]) => cats.includes(category))?.[0];
          if (!group) return;

          const displayReg = REG_DISPLAY[registry] || registry;
          if (!tax[group][category][displayReg]) tax[group][category][displayReg] = [];

          const target = tax[group][category][displayReg];
          if (rawName === 'Not provided') {
            if (!target.includes('__no_code__')) target.push('__no_code__');
          } else if (rawName && !target.includes(rawName)) {
            target.push(rawName);
          }
        });

        setTaxonomy(tax);
      },
    });
  }, []);

  const toggleGroup = (g) => setOpenGroups(p => { const n = new Set(p); n.has(g) ? n.delete(g) : n.add(g); return n; });
  const toggleSub = (key) => setOpenSubs(p => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });

  return (
    <div className="about-page">
      <div className="about-content">
        <div className="about-title">About CarbonLedger</div>

        <div className="about-section">
          <div className="about-section-title">Data Source</div>
          <p className="about-text">
            This dashboard uses data from the Berkeley Carbon Trading Project (BCTP)
            Voluntary Registry Offsets Database, maintained by the Goldman School of
            Public Policy at UC Berkeley.
          </p>
          <a
            href="https://gspp.berkeley.edu/berkeley-carbon-trading-project/offsets-database"
            target="_blank"
            rel="noopener noreferrer"
            className="about-link"
          >
            Berkeley Carbon Trading Project →
          </a>
        </div>

        <div className="about-section">
          <div className="about-section-title">Dataset</div>
          <p className="about-text">Dataset: VROD Registry Files — December 2025</p>
          <a
            href="https://gspp.berkeley.edu/assets/uploads/page/VROD-registry-files--2025-12.xlsx"
            target="_blank"
            rel="noopener noreferrer"
            className="about-link"
          >
            Download Dataset (XLSX) →
          </a>
        </div>

        <div className="about-section">
          <div className="about-section-title">Coverage</div>
          <p className="about-text">
            Covers voluntary carbon credit issuances and retirements across four major
            registries: Verra, Gold Standard, ACR, and CAR/ARB. Data spans 2000–2025.
          </p>
        </div>

        <div className="about-section">
          <div className="about-section-title">Data Limitations</div>
          <ul className="about-text" style={{ paddingLeft: '1.2em' }}>
            <li>Credit volumes for 2024 and 2025 are lower than prior years as this dataset is a December 2025 snapshot and recent vintages are still accumulating.</li>
            <li>Several project types have sparse or discontinued data: Nitric acid (ends 2001), Wind (ends 2018), Electric vehicles (ends 2019), Rewilding (ends 2019), Rice cultivation (ends 2021 for Verra), and Wastewater treatment (ends 2021). This reflects actual market activity, not missing data.</li>
            <li>Some Gold Standard projects lack methodology codes in the source registry. These have been categorized by project type where possible.</li>
            <li>Verra projects labeled "Agriculture Forestry and Other Land Use" at the registry level are disaggregated into specific project types using methodology codes. A small number of unmatched rows (2000–2007) are excluded from category breakdowns.</li>
          </ul>
        </div>

        <div className="about-section">
          <button className="taxonomy-toggle" onClick={() => setTaxonomyOpen(o => !o)}>
            <span className="about-section-title" style={{ margin: 0 }}>Methodology Taxonomy</span>
            <span className="taxonomy-chevron">{taxonomyOpen ? '▼' : '▶'}</span>
          </button>

          {taxonomyOpen && (
            taxonomy === null
              ? <div className="about-text" style={{ marginTop: 10 }}>Loading taxonomy…</div>
              : <div className="taxonomy-tree">
                  {Object.entries(taxonomy).map(([group, projectTypes]) => (
                    <div key={group} className="taxonomy-group">

                      <button className="taxonomy-group-row" onClick={() => toggleGroup(group)}>
                        <span className="taxonomy-group-name">{group}</span>
                        <span className="taxonomy-chevron-sm">{openGroups.has(group) ? '▼' : '▶'}</span>
                      </button>

                      {openGroups.has(group) && (
                        <div className="taxonomy-subs">
                          {Object.entries(projectTypes).map(([pt, regs]) => {
                            const subKey  = `${group}|${pt}`;
                            const hasRegs = Object.keys(regs).length > 0;
                            return (
                              <div key={pt} className="taxonomy-sub">
                                <button
                                  className={`taxonomy-sub-row${hasRegs ? '' : ' no-expand'}`}
                                  onClick={() => hasRegs && toggleSub(subKey)}
                                >
                                  <span className="taxonomy-sub-name">{pt}</span>
                                  {hasRegs && (
                                    <span className="taxonomy-chevron-sm">
                                      {openSubs.has(subKey) ? '▼' : '▶'}
                                    </span>
                                  )}
                                </button>

                                {openSubs.has(subKey) && (
                                  <div className="taxonomy-methods">
                                    {Object.entries(regs).map(([regName, names]) => (
                                      <div key={regName} className="taxonomy-reg-group">
                                        <span
                                          className="taxonomy-reg-badge"
                                          style={{
                                            background: (REG_COLORS[regName] || '#999') + '33',
                                            color: REG_COLORS[regName] || '#999',
                                          }}
                                        >
                                          {regName}
                                        </span>
                                        <ul className="taxonomy-name-list">
                                          {names.map((n, i) => (
                                            <li key={i} className="taxonomy-name">
                                              {n === '__no_code__'
                                                ? <em className="taxonomy-no-code">Categorized by project type — no methodology code in source registry</em>
                                                : n}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                    </div>
                  ))}
                </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default About;
