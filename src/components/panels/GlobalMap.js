import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import { formatCredits } from '../../utils/formatters';

const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const COUNTRY_COORDS = {
  'United States': [-98, 38], 'India': [78, 22], 'China': [105, 35],
  'Brazil': [-53, -10], 'Indonesia': [120, -2], 'Turkey': [32, 39],
  'Kenya': [37, 0], 'Colombia': [-74, 4], 'Peru': [-75, -10],
  'Thailand': [101, 15], 'Mexico': [-102, 23], 'Chile': [-71, -33],
  'Argentina': [-64, -34], 'Vietnam': [106, 16], 'Cambodia': [105, 12],
  'Guatemala': [-90, 15], 'Uganda': [32, 1], 'Ethiopia': [39, 9],
  'Tanzania': [35, -6], 'Mozambique': [35, -18], 'Ghana': [-1, 7],
  'Nigeria': [8, 10], 'South Africa': [25, -30], 'Australia': [134, -25],
  'Canada': [-106, 56], 'Germany': [10, 51], 'United Kingdom': [-2, 54],
  'France': [2, 47], 'Spain': [-4, 40], 'Italy': [12, 42],
  'Japan': [138, 36], 'South Korea': [128, 36], 'Philippines': [122, 12],
  'Malaysia': [102, 4], 'Myanmar': [96, 19], 'Pakistan': [69, 30],
  'Bangladesh': [90, 24], 'Nepal': [84, 28], 'Sri Lanka': [81, 7],
  'Madagascar': [47, -19], 'DR Congo': [24, -3], 'Zambia': [28, -14],
  'Zimbabwe': [30, -19], 'Malawi': [34, -13], 'Rwanda': [30, -2],
  'Honduras': [-86, 14], 'Nicaragua': [-85, 13], 'Costa Rica': [-84, 10],
  'Panama': [-80, 9], 'Ecuador': [-78, -2], 'Bolivia': [-64, -17],
  'Paraguay': [-58, -23], 'Uruguay': [-56, -33], 'Guyana': [-59, 5],
  'Suriname': [-56, 4], 'Venezuela': [-66, 7], 'Senegal': [-14, 14],
  'Mali': [-8, 17], 'Niger': [8, 17], 'Cameroon': [12, 6],
  'Ivory Coast': [-5, 7], 'Burkina Faso': [-2, 12], 'Benin': [2, 9],
  'Togo': [1, 8], 'Sierra Leone': [-12, 8], 'Liberia': [-10, 6],
  'Guinea': [-12, 10], 'Morocco': [-8, 32], 'Tunisia': [10, 34],
  'Egypt': [30, 27], 'Algeria': [3, 28], 'Laos': [102, 18],
  'Papua New Guinea': [147, -6], 'Fiji': [178, -18], 'New Zealand': [174, -41],
  'Norway': [10, 62], 'Sweden': [16, 62], 'Finland': [26, 62],
  'Denmark': [10, 56], 'Netherlands': [5, 52], 'Belgium': [4, 51],
  'Switzerland': [8, 47], 'Austria': [14, 48], 'Poland': [20, 52],
  'Czech Republic': [15, 50], 'Romania': [25, 46], 'Hungary': [20, 47],
  'Ukraine': [32, 49], 'Russia': [100, 60], 'Georgia': [44, 42],
  'Armenia': [45, 40], 'Azerbaijan': [50, 41], 'Aruba': [-70, 12],
  'Angola': [17, -12],
};

const GlobalMap = ({ data, selectedActivity, onCountryClick }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [worldData, setWorldData] = useState(null);

  useEffect(() => {
    fetch(WORLD_TOPO_URL)
      .then(r => r.json())
      .then(d => setWorldData(d))
      .catch(err => console.error('Map data load error:', err));
  }, []);

  const countryCreditMap = useMemo(() => {
    if (!data) return {};
    const map = {};
    const records = selectedActivity
      ? data.filteredCountry.filter(d => d.category === selectedActivity)
      : data.filteredCountry;
    records.forEach(d => {
      if (!map[d.country]) map[d.country] = 0;
      map[d.country] += d.credits;
    });
    return map;
  }, [data, selectedActivity]);

  const maxCredits = useMemo(() => {
    const vals = Object.values(countryCreditMap);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }, [countryCreditMap]);

  useEffect(() => {
    if (!worldData || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = containerRef.current.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    svg.attr('width', width).attr('height', height);

    const projection = d3.geoNaturalEarth1()
      .fitSize([width, height], { type: 'Sphere' });

    const path = d3.geoPath().projection(projection);

    let features = [];
    try {
      features = feature(worldData, worldData.objects.countries).features;
    } catch (e) {
      console.error('Topojson parse error:', e);
    }

    const g = svg.append('g');

    g.selectAll('path')
      .data(features)
      .join('path')
      .attr('d', path)
      .attr('fill', selectedActivity ? '#1a1a24' : '#1e1e2a')
      .attr('stroke', '#0d0d12')
      .attr('stroke-width', 0.3);

    if (data && data.creditsByCountry) {
      const countriesToPlot = selectedActivity
        ? data.getActivityCountries(selectedActivity)
        : data.creditsByCountry;

      countriesToPlot.slice(0, 60).forEach(country => {
        const coords = COUNTRY_COORDS[country.name];
        if (!coords) return;
        const projected = projection(coords);
        if (!projected) return;
        const [x, y] = projected;

        const radius = Math.max(2.5, Math.min(12, Math.sqrt(country.credits / maxCredits) * 12));
        const opacity = selectedActivity ? 0.9 : Math.max(0.3, country.credits / maxCredits);

        g.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', radius)
          .attr('fill', '#e85724')
          .attr('fill-opacity', opacity)
          .attr('stroke', '#e85724')
          .attr('stroke-width', 0.5)
          .attr('stroke-opacity', 0.3)
          .style('cursor', 'pointer')
          .on('mouseover', function(event) {
            d3.select(this).transition().duration(100).attr('r', radius * 1.4);
            setTooltip({
              x: event.offsetX + 10,
              y: event.offsetY - 10,
              name: country.name,
              credits: country.credits,
            });
          })
          .on('mouseout', function() {
            d3.select(this).transition().duration(100).attr('r', radius);
            setTooltip(null);
          })
          .on('click', function() {
            if (onCountryClick) onCountryClick(country.name);
          });
      });
    }
  }, [worldData, data, selectedActivity, maxCredits, countryCreditMap, onCountryClick]);

  return (
    <div className="map-panel overview-map">
      <div className="map-header">
        <div className="panel-title">
          ◎ Global Distribution
          {selectedActivity && <span className="map-badge">{selectedActivity}</span>}
        </div>
        {!selectedActivity && <div className="map-hint">Click a country to explore</div>}
      </div>
      <div className="map-container" ref={containerRef}>
        <svg ref={svgRef} />
        {tooltip && (
          <div className="map-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
            <div className="mt-name">{tooltip.name}</div>
            <div className="mt-value">{formatCredits(tooltip.credits)} credits</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalMap;
