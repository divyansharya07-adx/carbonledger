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
  const [exclusionsOpen, setExclusionsOpen] = useState(false);
  const [openExclusionGroups, setOpenExclusionGroups] = useState(new Set());
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [openCategoryGroups, setOpenCategoryGroups] = useState(new Set());

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
  const toggleExclusionGroup = (g) => setOpenExclusionGroups(p => { const n = new Set(p); n.has(g) ? n.delete(g) : n.add(g); return n; });
  const toggleCategoryGroup = (g) => setOpenCategoryGroups(p => { const n = new Set(p); n.has(g) ? n.delete(g) : n.add(g); return n; });

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
          <p className="about-text">Dataset: VROD Registry Files — February 2026</p>
          <a
            href="https://gspp.berkeley.edu/assets/uploads/page/VROD-registry-files--2026-02.xlsx"
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
            <li>Credit volumes for 2024 and 2025 are lower than prior years as this dataset is a February 2026 snapshot and recent vintages are still accumulating.</li>
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
            protocols, 32 CAR protocols, and 2 ART protocols) to 31 project activity categories across
            all four registries. Match rate across all issuance rows is approximately 99.9%.
          </p>

          <p className="about-text" style={{ fontWeight: 500, marginBottom: 4, marginTop: 12 }}>Project Count</p>
          <p className="about-text">
            Unique project counts are derived from registry-specific ID columns: <code>ID</code> (Verra),
            <code> GSID</code> (Gold Standard), <code>Project ID</code> (ACR and CAR). Rows with null
            IDs are excluded. Each project is assigned its most frequent methodology code and looked up
            in <code>methodology_mapping.csv</code> to determine its category. Projects whose methodology
            could not be resolved — either through methodology code or project type fallback — are
            excluded from all pages. These represent 42 projects (&lt;1% of total): 19 Verra coal-mine-methane projects and 23 Gold Standard projects
            with no usable metadata. Total across all four
            registries: 5,834 projects (Verra 2,104 · Gold Standard 2,113 · CAR 858 · ACR 759).
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
              categorised by project type name where possible (~158M credits). A small residual
              (~7.5M credits, &lt;0.3% of total) could not be categorised and are excluded from all pages.
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
            <li>
              <strong>Countries without VCM Contribution data.</strong> Of 112 countries in the dataset,
              30 do not display a VCM Contribution to Decarbonisation figure. Six are excluded due to
              data constraints — three are territories without World Bank sovereign membership (Taiwan,
              Aruba, New Caledonia) and three have incomplete or discontinued World Bank emissions series
              (Somalia, Eritrea, Central African Republic). The remaining 24 are sovereign states with
              valid World Bank data but below the credit volume threshold used when building the country
              mapping. See the full list below.
            </li>
          </ul>

          <p className="about-text" style={{ fontWeight: 500, marginBottom: 4, marginTop: 12 }}>Category Taxonomy</p>
          <p className="about-text">
            The 31 project activity categories used in this dashboard are adapted from the activity
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
            in five cases and adds one category beyond the A6 framework:
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
              appear in the A6 forward pipeline but have no representation in the 2000–Feb 2026 voluntary
              registry dataset. No methodology codes or protocol names for these activities are present
              across Verra, Gold Standard, ACR, or CAR.
            </li>
            <li>
              <strong>Engineered Removals added as a category beyond the A6 framework.</strong> The A6
              typology includes 'Carbon capture', which covers industrial point-source CCS (emissions
              prevention). Engineered Removals covers a distinct class — Carbon Dioxide Removal (CDR)
              as defined by IPCC AR6 — where projects actively remove CO₂ already in the atmosphere
              through engineered or geological processes. Currently mapped to VM0049 (Biochar Utilization
              with Geological Storage). Future subcategories may include DACCS, BECCS, and enhanced rock
              weathering as these methodologies mature in the voluntary carbon market.
            </li>
          </ul>
        </div>

        <div className="about-section">
          <button className="taxonomy-toggle" onClick={() => setCategoriesOpen(o => !o)}>
            <span className="about-section-title" style={{ margin: 0 }}>Project Activity Categories</span>
            <span className="taxonomy-chevron">{categoriesOpen ? '▼' : '▶'}</span>
          </button>

          {categoriesOpen && (
            <div style={{ marginTop: 12 }}>
              <p className="about-text">
                Each of the 31 project activity categories used in this dashboard is defined below, grouped by the four filter groups. Categories marked with ◦ currently have no credits in the dataset but are mapped and ready for future projects.
              </p>
              <div className="taxonomy-tree">

                <div className="taxonomy-group">
                  <button className="taxonomy-group-row" onClick={() => toggleCategoryGroup('forest')}>
                    <span className="taxonomy-group-name">Forest &amp; Nature (4)</span>
                    <span className="taxonomy-chevron-sm">{openCategoryGroups.has('forest') ? '▼' : '▶'}</span>
                  </button>
                  {openCategoryGroups.has('forest') && (
                    <div className="taxonomy-subs">
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Afforestation/Reforestation</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that establish new forests on previously unforested land (afforestation) or restore forests on land that was previously forested (reforestation). Includes avoided deforestation projects under REDD+ frameworks.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Forest management</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that improve the management of existing forests to increase carbon stocks or reduce emissions from degradation. Includes improved forest management (IFM) and conservation of existing high-carbon-stock forests.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Reforestation and ecosystem restoration</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that restore degraded ecosystems — including tropical forests, mangroves, and other natural habitats — through active replanting and natural regeneration.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Rewilding</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that restore natural ecological processes and biodiversity by removing human pressures, reintroducing species, and allowing natural succession. Includes sustainable grassland management.</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="taxonomy-group">
                  <button className="taxonomy-group-row" onClick={() => toggleCategoryGroup('energy')}>
                    <span className="taxonomy-group-name">Energy (12)</span>
                    <span className="taxonomy-chevron-sm">{openCategoryGroups.has('energy') ? '▼' : '▶'}</span>
                  </button>
                  {openCategoryGroups.has('energy') && (
                    <div className="taxonomy-subs">
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Bioenergy</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that generate energy from biomass, biogas, or other biological sources, displacing fossil fuel combustion. Includes agricultural waste, landfill biogas, and purpose-grown biomass for heat and power.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Cleaner cooking</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that replace traditional biomass cookstoves with cleaner, more efficient alternatives — reducing emissions from incomplete combustion and improving household air quality in developing countries.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Electric vehicles</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that deploy electric or hybrid vehicles and charging infrastructure, displacing petrol and diesel vehicle emissions across transport fleets.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Energy storage ◦</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that deploy battery or other storage technologies to enable higher penetration of variable renewable energy. No methodology currently maps to this category.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Efficient appliances</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that distribute efficient lighting, appliances, or equipment — primarily in residential settings — reducing electricity consumption and associated emissions.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Geothermal</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that generate electricity or heat from geothermal resources, displacing fossil fuel generation.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Grid efficiency ◦</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that reduce transmission and distribution losses in electricity grids, or improve grid management to reduce the need for fossil fuel peaking capacity.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Hydropower</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that generate electricity from water flow — including run-of-river and reservoir-based schemes — displacing fossil fuel generation.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Mixed renewables</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects deploying multiple renewable energy technologies at a single site, or portfolios of renewable projects where a single methodology category does not apply.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Public transit</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that expand or improve public transportation systems — including bus rapid transit, rail, and non-motorised transport — displacing private vehicle use.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Solar</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that generate electricity from solar photovoltaic or solar thermal systems, displacing fossil fuel generation.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Wind</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that generate electricity from wind turbines — onshore or offshore — displacing fossil fuel generation.</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="taxonomy-group">
                  <button className="taxonomy-group-row" onClick={() => toggleCategoryGroup('agriculture')}>
                    <span className="taxonomy-group-name">Agriculture (2)</span>
                    <span className="taxonomy-chevron-sm">{openCategoryGroups.has('agriculture') ? '▼' : '▶'}</span>
                  </button>
                  {openCategoryGroups.has('agriculture') && (
                    <div className="taxonomy-subs">
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Soil &amp; Livestock</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that reduce agricultural emissions or sequester carbon in soils through improved farming practices — including reduced tillage, cover cropping, improved grazing management, and livestock methane reduction.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Rice cultivation</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that modify water and nutrient management in flooded rice paddies to reduce methane emissions from anaerobic decomposition of organic matter.</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="taxonomy-group">
                  <button className="taxonomy-group-row" onClick={() => toggleCategoryGroup('waste')}>
                    <span className="taxonomy-group-name">Waste &amp; Industrial (13)</span>
                    <span className="taxonomy-chevron-sm">{openCategoryGroups.has('waste') ? '▼' : '▶'}</span>
                  </button>
                  {openCategoryGroups.has('waste') && (
                    <div className="taxonomy-subs">
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Biochar</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that produce biochar from biomass pyrolysis and apply it to soils, storing carbon in a stable form while improving soil health.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Composting</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that divert organic waste from landfill to aerobic composting, reducing methane emissions from anaerobic decomposition.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Engineered Removals ◦</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that actively remove CO₂ from the atmosphere through engineered or geological processes — including geological biochar storage. Represents the Carbon Dioxide Removal (CDR) category as defined by IPCC AR6, distinct from industrial point-source CCS. No credits in the current dataset; future methodologies include DACCS, BECCS, and enhanced rock weathering.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Fossil gas leaks</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that detect and repair methane leaks from oil and gas infrastructure — including pipelines, compressor stations, and abandoned wells — preventing fugitive emissions from reaching the atmosphere.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Heat recovery</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that capture waste heat from industrial processes or power generation for productive use, reducing the need for additional fuel combustion.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Industrial efficiency</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that reduce energy consumption or process emissions in manufacturing, mining, and other industrial sectors through equipment upgrades, process optimisation, or fuel switching.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Landfill gas</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that capture methane from decomposing waste in landfills — for electricity generation, flaring, or direct use — preventing its release into the atmosphere.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Nitric acid</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that reduce nitrous oxide (N₂O) emissions from nitric acid production, a key step in fertiliser manufacturing, through catalytic reduction.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Oil Field Gas Recovery</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that capture associated petroleum gas (APG) at oil production sites — gas that would otherwise be flared or vented — for productive use or safe disposal.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Waste management</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that improve the handling, collection, or disposal of solid waste to reduce methane and other greenhouse gas emissions.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Waste to energy</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that convert waste materials into energy through incineration, gasification, or pyrolysis, displacing fossil fuels while reducing landfill volumes.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Water purification</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that provide clean water access through efficient purification systems, reducing the need for boiling water with biomass or fossil fuels.</div>
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Wastewater treatment</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Projects that treat municipal or industrial wastewater to reduce methane and nitrous oxide emissions from untreated effluent.</div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>

        <div className="about-section">
          <button
            className="taxonomy-toggle"
            onClick={() => setExclusionsOpen(o => !o)}
          >
            <span className="about-section-title" style={{ margin: 0 }}>Countries Without Emissions Data</span>
            <span className="taxonomy-chevron">{exclusionsOpen ? '▼' : '▶'}</span>
          </button>

          {exclusionsOpen && (
            <div style={{ marginTop: 12 }}>
              <p className="about-text">
                30 countries are excluded from the VCM Contribution to Decarbonisation metric. Expand each group to see which countries and why.
              </p>
              <div className="taxonomy-tree">

                <div className="taxonomy-group">
                  <button className="taxonomy-group-row" onClick={() => toggleExclusionGroup('territories')}>
                    <span className="taxonomy-group-name">Territories — not WB sovereign members (3)</span>
                    <span className="taxonomy-chevron-sm">{openExclusionGroups.has('territories') ? '▼' : '▶'}</span>
                  </button>
                  {openExclusionGroups.has('territories') && (
                    <div className="taxonomy-subs">
                      <div className="about-text" style={{ padding: '8px 16px', fontSize: 12 }}>
                        <p style={{ marginBottom: 8, color: 'var(--text-muted)' }}>
                          These territories are not World Bank member states and have no emissions data in the WB Open Data API.
                        </p>
                        <ul style={{ paddingLeft: '1.2em', margin: 0 }}>
                          <li>Taiwan — 5,822,790 credits</li>
                          <li>Aruba — 1,075,844 credits</li>
                          <li>New Caledonia — 507,905 credits</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                <div className="taxonomy-group">
                  <button className="taxonomy-group-row" onClick={() => toggleExclusionGroup('wb-incomplete')}>
                    <span className="taxonomy-group-name">World Bank data absent or incomplete (3)</span>
                    <span className="taxonomy-chevron-sm">{openExclusionGroups.has('wb-incomplete') ? '▼' : '▶'}</span>
                  </button>
                  {openExclusionGroups.has('wb-incomplete') && (
                    <div className="taxonomy-subs">
                      <div className="about-text" style={{ padding: '8px 16px', fontSize: 12 }}>
                        <p style={{ marginBottom: 8, color: 'var(--text-muted)' }}>
                          These countries have WB API entries but the emissions series is too incomplete to compute a reliable VCM contribution metric.
                        </p>
                        <ul style={{ paddingLeft: '1.2em', margin: 0 }}>
                          <li>Somalia — 3,171,572 credits (large multi-year gaps)</li>
                          <li>Eritrea — 2,481,615 credits (no post-2011 data)</li>
                          <li>Central African Republic — 1,294,618 credits (series ends 2015)</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                <div className="taxonomy-group">
                  <button className="taxonomy-group-row" onClick={() => toggleExclusionGroup('below-threshold')}>
                    <span className="taxonomy-group-name">Below credit volume threshold (24)</span>
                    <span className="taxonomy-chevron-sm">{openExclusionGroups.has('below-threshold') ? '▼' : '▶'}</span>
                  </button>
                  {openExclusionGroups.has('below-threshold') && (
                    <div className="taxonomy-subs">
                      <div className="about-text" style={{ padding: '8px 16px', fontSize: 12 }}>
                        <p style={{ marginBottom: 8, color: 'var(--text-muted)' }}>
                          These countries have complete WB emissions data but their total VCM credit volume is below the minimum threshold for a meaningful contribution percentage.
                        </p>
                        <ul style={{ paddingLeft: '1.2em', margin: 0 }}>
                          <li>Sudan — 368,399 credits</li>
                          <li>Tajikistan — 315,553 credits</li>
                          <li>Guinea-Bissau — 302,043 credits</li>
                          <li>Lesotho — 273,332 credits</li>
                          <li>Haiti — 157,887 credits</li>
                          <li>Ecuador — 151,697 credits</li>
                          <li>Angola — 144,591 credits</li>
                          <li>Timor-Leste — 128,930 credits</li>
                          <li>Chad — 115,334 credits</li>
                          <li>Guinea — 66,779 credits</li>
                          <li>United Kingdom — 65,152 credits</li>
                          <li>United Arab Emirates — 47,452 credits</li>
                          <li>Switzerland — 43,670 credits</li>
                          <li>Niger — 38,769 credits</li>
                          <li>Fiji — 30,000 credits</li>
                          <li>Liberia — 22,906 credits</li>
                          <li>Comoros — 17,454 credits</li>
                          <li>Israel — 16,574 credits</li>
                          <li>Cyprus — 15,171 credits</li>
                          <li>Iceland — 12,514 credits</li>
                          <li>Iraq — 1,830 credits</li>
                          <li>Austria — 980 credits</li>
                          <li>Estonia — 230 credits</li>
                          <li>Netherlands — 1,241,840 credits (mapping added in this release)</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
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
