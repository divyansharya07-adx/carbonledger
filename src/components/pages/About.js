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
          <div className="about-section-title">Additional Data Sources</div>
          <p className="about-text">
            National CO₂ emissions data used in the VCM Contribution to Decarbonisation metric
            is retrieved at runtime from the World Bank Open Data API (indicator
            EN.GHG.CO2.MT.CE.AR5). This indicator reports total greenhouse gas emissions from
            fossil fuels and industry in megatonnes of CO₂ equivalent, derived using IPCC Fifth
            Assessment Report (AR5) Global Warming Potentials. Data is accessed under the World
            Bank's open data licence.
          </p>
        </div>

        <div className="about-section">
          <div className="about-section-title">Coverage</div>
          <p className="about-text">
            Covers voluntary carbon credit issuances across four major registries: Verra
            (VCS), Gold Standard, ACR (American Carbon Registry), and CAR (Climate Action
            Reserve). Retirement data is tracked at the project level — credits issued, retired, and
            remaining are available for each project on the Projects page, cross-matched by Project ID across
            all four registries. Data spans 1996–2025.
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
          <div className="about-section-title">Methodology</div>

          <p className="about-text" style={{ fontWeight: 500, marginBottom: 4 }}>Credit Aggregation</p>
          <p className="about-text">
            Raw issuance records from each registry sheet were grouped by vintage year and project type
            category. Project types were resolved via <code>methodology_mapping.csv</code>, which maps
            444 methodology mappings (283 Verra methodology codes, 81 Gold Standard protocols, 46 ACR
            protocols, 32 CAR protocols, and 2 ART protocols) to 30 project activity categories across
            all four registries. Match rate across all issuance rows is approximately 99.9%.
          </p>

          <p className="about-text" style={{ fontWeight: 500, marginBottom: 4, marginTop: 12 }}>Project Count</p>
          <p className="about-text">
            Unique project counts are derived from registry-specific ID columns: <code>ID</code> (Verra),
            <code> GSID</code> (Gold Standard), <code>Project ID</code> (ACR and CAR). Rows with null
            IDs are excluded. Each project is assigned its most frequent methodology code and looked up
            in <code>methodology_mapping.csv</code> to determine its category. Projects whose methodology
            string could not be resolved are counted under 'Other' and excluded from category breakdowns —
            these represent 562 projects (&lt;10% of total), primarily Gold Standard projects with blank
            methodology fields. Total across all four
            registries: 5,753 projects (Verra 2,093 · Gold Standard 2,088 · CAR 829 · ACR 743).
          </p>

          <p className="about-text" style={{ fontWeight: 500, marginBottom: 4, marginTop: 12 }}>Retirement Rate</p>
          <p className="about-text">
            The retirement rate for each country and registry is calculated as total credits
            retired divided by total credits issued, expressed as a percentage. These are
            all-time lifetime totals pre-computed in the data pipeline from registry retirement
            records — they are not filtered by the year range selector. A credit is counted
            as retired when a formal cancellation or retirement transaction is recorded in the
            source registry data, irrespective of when the underlying credit was originally issued.
          </p>

          <p className="about-text" style={{ fontWeight: 500, marginBottom: 4, marginTop: 12 }}>VCM Contribution to Decarbonisation</p>
          <p className="about-text">
            This metric estimates the share of a country's national CO₂ emissions that has been
            addressed through voluntary carbon market (VCM) retirement activity. It is computed
            as a weighted aggregate ratio:
          </p>
          <p className="about-text" style={{ fontStyle: 'italic' }}>
            (Sum of vintage-year credits retired) ÷ (Sum of national CO₂ emissions for matched
            vintage years) × 100
          </p>
          <p className="about-text">
            The numerator uses credits keyed to their vintage year — the year the underlying
            emissions reduction occurred — not the calendar year in which the retirement
            transaction was recorded. This vintage-year alignment methodology follows the
            activity-period attribution principle consistent with IPCC AR6 guidance, ensuring
            that abatement is compared against emissions from the same period in which the
            reduction activity took place.
          </p>
          <p className="about-text">
            National emissions data is sourced from the World Bank API (indicator
            EN.GHG.CO2.MT.CE.AR5, derived from IPCC AR5 Global Warming Potentials). Only
            vintage years where both registry retirement data and World Bank emissions data are
            available are included in the computation. The metric responds to the registry and
            year range filters on the Country Explorer page.
          </p>

          <p className="about-text" style={{ fontWeight: 500, marginBottom: 4, marginTop: 12 }}>Data Pipeline</p>
          <p className="about-text">
            Aggregation was performed using a Python/pandas script against the raw XLSX source. All
            figures are derived exclusively from public registry records — no proprietary data,
            modelling, or estimates were used.
          </p>

          <p className="about-text" style={{ fontWeight: 500, marginBottom: 4, marginTop: 12 }}>Known Limitations</p>
          <ul className="about-text" style={{ paddingLeft: '1.2em' }}>
            <li>
              Some Gold Standard projects lack methodology codes in the source registry. These have been
              categorised by project type name where possible (~141.5M credits). A small residual
              (~6M credits, &lt;0.3% of total) could not be categorised and are excluded from category
              breakdowns.
            </li>
            <li>
              Verra AFOLU projects are disaggregated using methodology codes; a small number of
              unmatched rows (primarily pre-2008) are excluded from category breakdowns.
            </li>
            <li>
              CAR protocol strings include version suffixes that are stripped during matching — a small
              number of protocols with ambiguous names may be misclassified.
            </li>
            <li>
              The grand total may vary by approximately 7,000 credits due to AMS-III.AK remapping
              (Cleaner cooking → Public transit) in Section B of the pipeline, where the source rows
              were not present in all pipeline runs.
            </li>
            <li>
              Gold Standard A/R (Afforestation/Reforestation) projects issue credits across their full
              monitoring window in a single batch. This results in 1,727,744 credits (~0.07% of total)
              carrying future vintage years (2026–2061), formally issued with serial numbers since
              2014–2016. These credits are included in the total count but fall outside the 1996–2025
              year-range filter.
            </li>
            <li>
              A small number of credits carry pre-2000 vintage years (1996–1999, ~249,854 credits across
              Verra, Gold Standard, and ACR). These are retrospective issuances — formally issued years
              after the reduction occurred — and are included in the total count and accessible via the
              year-range filter.
            </li>
            <li>
              One Gold Standard project (GSID 7511 — a CER-to-VER conversion record) appears in the
              issuances data but is absent from the Gold Standard Projects master list, likely because it
              was registered under its original CDM project number (GS3705) rather than as a standalone
              Gold Standard project. This project (500 credits issued) is counted in the Overview project
              total but does not appear on the Projects page. This is a source data characteristic of the
              Gold Standard registry, not a pipeline error.
            </li>
            <li>
              <strong>Retirement Rate is an all-time figure.</strong> The retirement rate
              displayed in the Country Explorer panel reflects lifetime totals across all years
              and does not update when the year range filter is changed. This is a structural
              constraint arising from how retirement records are aggregated across registries
              in the source data.
            </li>
            <li>
              <strong>World Bank emissions data lag.</strong> The EN.GHG.CO2.MT.CE.AR5
              indicator typically lags one to two years behind the current date. Vintage years
              for which World Bank data is not yet available are excluded from the VCM
              Contribution to Decarbonisation computation, which means the most recent vintage
              years may be underrepresented in this metric.
            </li>
            <li>
              <strong>Country name mapping for emissions data.</strong> The VCM Contribution
              metric requires matching country names in the registry data to ISO 3166-1 alpha-2
              codes used by the World Bank API. A small number of countries or territories may
              not resolve to a valid mapping, in which case the panel displays "Emissions data
              unavailable" for that country.
            </li>
          </ul>

          <p className="about-text" style={{ fontWeight: 500, marginBottom: 4, marginTop: 12 }}>Category Taxonomy</p>
          <p className="about-text">
            The 30 project activity categories used in this dashboard are adapted from the activity
            typology defined in the{' '}
            <a
              href="https://unepccc.org/article-6-pipeline/"
              target="_blank"
              rel="noopener noreferrer"
              className="about-link"
            >
              UNFCCC Article 6 Pipeline
            </a>
            {' '}dataset compiled by the UNEP Copenhagen Climate Centre (accessed 2025). That dataset
            enumerates 34 activity types spanning the full range of mitigation interventions tracked
            in international carbon markets; 29 of these are adopted verbatim. The taxonomy diverges
            in five cases:
          </p>
          <ul className="about-text" style={{ paddingLeft: '1.2em' }}>
            <li>
              <strong>Agriculture → Soil &amp; Livestock.</strong> The broad A6 "Agriculture" type
              was retitled to more precisely reflect the voluntary market activities it encompasses:
              soil carbon sequestration and livestock methane reduction. Rice cultivation retains its
              own category owing to its dedicated methodology family across all four registries.
            </li>
            <li>
              <strong>Tree plantation → merged into Afforestation/Reforestation.</strong> Plantation
              forestry projects in all four registries are classified under afforestation/reforestation
              methodology codes; no distinct tree plantation category exists in the four-registry
              methodology mapping.
            </li>
            <li>
              <strong>Green hydrogen, Green ammonia, Carbon capture → excluded.</strong> These types
              appear in the A6 forward pipeline but have no representation in the 2000–2025 voluntary
              registry dataset. No methodology codes or protocol names for these activities are present
              across Verra, Gold Standard, ACR, or CAR.
            </li>
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
