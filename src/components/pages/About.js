const About = () => (
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
    </div>
  </div>
);

export default About;
