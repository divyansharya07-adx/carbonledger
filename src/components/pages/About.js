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
    </div>
  </div>
);

export default About;
