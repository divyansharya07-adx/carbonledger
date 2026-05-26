// ISO-3 map for all 119 unique country names in country_aggregated_data.csv.
// Includes 4 ISO-2 aliases (BO, BR, CA, TH) and alternate spellings (DRC, Ivory Coast).
const countryISO = {
  // Africa
  'Angola': 'AGO', 'Benin': 'BEN', 'Burkina Faso': 'BFA', 'Burundi': 'BDI',
  'Cameroon': 'CMR', 'Central African Republic': 'CAF', 'Chad': 'TCD',
  'Comoros': 'COM', 'Congo': 'COG',
  'Congo the Democratic Republic of the': 'COD', 'DR Congo': 'COD',
  "Cote D'Ivoire": 'CIV', 'Ivory Coast': 'CIV',
  'Egypt': 'EGY', 'Eritrea': 'ERI', 'Ethiopia': 'ETH',
  'Gambia': 'GMB', 'Ghana': 'GHA', 'Guinea': 'GIN', 'Guinea-Bissau': 'GNB',
  'Kenya': 'KEN', 'Lesotho': 'LSO', 'Liberia': 'LBR', 'Madagascar': 'MDG',
  'Malawi': 'MWI', 'Mali': 'MLI', 'Mauritania': 'MRT', 'Mauritius': 'MUS',
  'Morocco': 'MAR', 'Mozambique': 'MOZ', 'Namibia': 'NAM', 'Niger': 'NER',
  'Nigeria': 'NGA', 'Rwanda': 'RWA', 'Senegal': 'SEN', 'Sierra Leone': 'SLE',
  'Somalia': 'SOM', 'South Africa': 'ZAF', 'Sudan': 'SDN', 'Tanzania': 'TZA',
  'Togo': 'TGO', 'Uganda': 'UGA', 'Zambia': 'ZMB', 'Zimbabwe': 'ZWE',
  // Americas
  'Argentina': 'ARG', 'Aruba': 'ABW', 'Belize': 'BLZ', 'Bolivia': 'BOL',
  'Brazil': 'BRA', 'Canada': 'CAN', 'Chile': 'CHL', 'Colombia': 'COL',
  'Costa Rica': 'CRI', 'Dominican Republic': 'DOM', 'Ecuador': 'ECU',
  'El Salvador': 'SLV', 'Guatemala': 'GTM', 'Haiti': 'HTI', 'Honduras': 'HND',
  'Mexico': 'MEX', 'Nicaragua': 'NIC', 'Panama': 'PAN', 'Paraguay': 'PRY',
  'Peru': 'PER', 'United States': 'USA', 'Uruguay': 'URY',
  // Asia-Pacific
  'Australia': 'AUS', 'Azerbaijan': 'AZE', 'Bangladesh': 'BGD',
  'Cambodia': 'KHM', 'China': 'CHN', 'Fiji': 'FJI', 'Georgia': 'GEO',
  'India': 'IND', 'Indonesia': 'IDN', 'Iraq': 'IRQ', 'Israel': 'ISR',
  'Kazakhstan': 'KAZ', 'Laos': 'LAO', 'Malaysia': 'MYS', 'Mongolia': 'MNG',
  'Myanmar': 'MMR', 'Nepal': 'NPL', 'New Caledonia': 'NCL',
  'New Zealand': 'NZL', 'Oman': 'OMN', 'Pakistan': 'PAK',
  'Papua New Guinea': 'PNG', 'Philippines': 'PHL', 'Singapore': 'SGP',
  'South Korea': 'KOR', 'Sri Lanka': 'LKA', 'Taiwan': 'TWN',
  'Tajikistan': 'TJK', 'Thailand': 'THA', 'Timor-Leste': 'TLS',
  'Turkey': 'TUR', 'United Arab Emirates': 'ARE', 'Uzbekistan': 'UZB',
  'Vietnam': 'VNM',
  // Europe
  'Austria': 'AUT', 'Bulgaria': 'BGR', 'Cyprus': 'CYP', 'Denmark': 'DNK',
  'Estonia': 'EST', 'France': 'FRA', 'Germany': 'DEU', 'Iceland': 'ISL',
  'Netherlands': 'NLD', 'North Macedonia Republic of': 'MKD',
  'Poland': 'POL', 'Romania': 'ROU', 'Russia': 'RUS', 'Switzerland': 'CHE',
  'United Kingdom': 'GBR',
  // ISO-2 codes appearing as country names (data quality entries in source CSV)
  'BO': 'BOL', 'BR': 'BRA', 'CA': 'CAN', 'TH': 'THA',
};

export default countryISO;
