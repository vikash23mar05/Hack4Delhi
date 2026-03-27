
import { getNearestAQI, fetchDelhiAirQuality, AQIDataPoint } from './openaqService';
import { fetchDelhiDataGovAQI } from './dataGovService';
import { WardData } from '../types';
import { supabase } from './supabaseClient';
import { getPolygonCentroid, isPointInPolygon, getAQICategory } from './aqiMapService';

export interface WardEstimationOptions {
  forceRefresh?: boolean;
}

export async function getAllDelhiWards(): Promise<WardData[]> {
  // 0. Primary Source: WAQI / OpenAQ (Bypassing Supabase to ensure accurate live maps)
  try {
    /* 
    const { data: supabaseWards, error } = await supabase
      .from('ward_aqi')
      .select('*');

    if (!error && supabaseWards && supabaseWards.length > 0) {
      console.log('🌐 Using live ward data from Supabase');
      // Map Supabase fields to the WardData interface if they differ slightly
      // The Python script upserts: ward_name, aqi, status, last_updated
      // We will enhance the response with our local logic for missing fields
      
      // But for a better experience, we should probably fetch the GeoJSON base and merge
      const geoResponse = await fetch('/delhi_wards.geojson');
      const geojson = await geoResponse.json();
      const features = geojson.features || [];

      const wards: WardData[] = features.map((feature: any, index: number) => {
        const props = feature.properties || {};
        const wardName = (props.Ward_Name || props.name || props.Ward || `Ward ${index}`).toUpperCase();
        const wardId = props.Ward_No || props.id || `w${index}`;
        
        // Find corresponding record in Supabase
        const dbRecord = supabaseWards.find(r => r.ward_name === wardName);
        
        // Calculate centroid or use first coordinate
        let lat = 28.6139;
        let lng = 77.2090;
        
        if (feature.geometry) {
          const coords = feature.geometry.coordinates;
          if (feature.geometry.type === 'Polygon' && coords[0] && coords[0][0]) {
            lng = coords[0][0][0];
            lat = coords[0][0][1];
          } else if (feature.geometry.type === 'MultiPolygon' && coords[0] && coords[0][0] && coords[0][0][0]) {
            lng = coords[0][0][0][0];
            lat = coords[0][0][0][1];
          }
        }

        const aqi = dbRecord ? dbRecord.aqi : 150;
        const status = dbRecord ? dbRecord.status : 'MODERATE';

        // Derive priority score
        const priorityScore = Math.min(100, Math.round((aqi / 500) * 100 + (Math.random() * 20)));

        return {
          id: wardId,
          name: wardName,
          aqi,
          status,
          priorityScore,
          populationDensity: Math.random() > 0.6 ? 'High' : Math.random() > 0.3 ? 'Medium' : 'Low',
          sourceDistribution: {
            industrial: wardName.includes('OKHLA') ? 60 : 15,
            vehicular: 45,
            construction: 15,
            biomass: 25
          },
          complaints: Math.floor(aqi / 10 + Math.random() * 5),
          responseTime: (1 + Math.random() * 4).toFixed(1) + 'h',
          outcomeTrend: Math.random() > 0.7 ? 'Worsening' : 'Stable',
          sensorCoverage: dbRecord ? 95 : 20,
          dataConfidence: dbRecord ? 'High' : 'Medium',
          dataSource: dbRecord ? 'sensor' : 'estimated',
          lastUpdated: dbRecord ? 'Supabase Live' : 'Just now',
          aqiDuration: Math.floor(Math.random() * 12 + 2) + ' hours',
          recommendedActions: getRecommendedActions(aqi, status, wardName),
          whyToday: getWhyToday(aqi, status, wardName),
          trendHistory: generateTrendHistory(aqi),
          lat,
          lng
        };
      });

      wards.sort((a, b) => b.priorityScore - a.priorityScore);
      return wards;
    }
    */
  } catch (err) {
    console.warn('Supabase fetch failed or table not ready, falling back to local processing.', err);
  }

  // Fallback to existing logic
  // Check if we have cached data in localStorage
  const cached = localStorage.getItem('delhi_ward_data');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      // Check if it's recent (e.g., last 15 mins)
      const lastSessionSync = localStorage.getItem('delhi_ward_data_timestamp');
      if (lastSessionSync && (Date.now() - parseInt(lastSessionSync) < 15 * 60 * 1000)) {
        console.log('📦 Using cached ward data from localStorage');
        return parsed;
      }
    } catch (e) {
      console.error('Error parsing cached data', e);
    }
  }

  console.log('🔄 Regenerating ward data from scratch...');
  
  // 1. Fetch GeoJSON
  const geoResponse = await fetch('/delhi_wards.geojson');
  const geojson = await geoResponse.json();
  const features = geojson.features || [];

  // 2. Fetch live station data using accurate WAQI / OpenAQ
  const stations = await fetchDelhiAirQuality();
  console.log(`📡 Fetched ${stations.length} stations from WAQI OpenAQ`);

  // 3. For each ward, calculate AQI and other metrics
  const wards: WardData[] = features.map((feature: any, index: number) => {
    const props = feature.properties || {};
    const wardName = (props.Ward_Name || props.name || props.Ward || `Ward ${index}`).toUpperCase();
    const wardId = props.Ward_No || props.id || `w${index}`;
    
    // Calculate centroid or use first coordinate
    let lat = 28.6139;
    let lng = 77.2090;
    
    if (feature.geometry?.coordinates) {
      const centroid = getPolygonCentroid(feature.geometry.coordinates);
      if (centroid) {
        lat = centroid.lat;
        lng = centroid.lng;
      }
    }

    // Use k-nearest interpolation
    const aqiResult = getNearestAQI(lat, lng, stations);
    const aqi = aqiResult.aqi;
    
    // Derive status labels that match internal UI enums but follow landing map color bands
    const category = getAQICategory(aqi);
    let status: WardData['status'] = 'MODERATE';
    if (category.label === 'Good') status = 'GOOD';
    else if (category.label === 'Satisfactory') status = 'MODERATE';
    else if (category.label === 'Moderately Polluted') status = 'POOR';
    else if (category.label === 'Poor') status = 'SEVERE';
    else status = 'CRITICAL';

    // Derive priority score (AQI + some randomness for demo variance)
    const priorityScore = Math.min(100, Math.round((aqi / 500) * 100 + (Math.random() * 20)));

    // Derive source distribution based on ward name (mocked but semi-believable)
    const industrial = wardName.includes('OKHLA') || wardName.includes('BAWANA') || wardName.includes('NARINA') ? 60 : 15;
    const vehicular = 40 + (Math.random() * 20);
    const construction = 10 + (Math.random() * 10);
    const biomass = 100 - industrial - vehicular - construction;

    return {
      id: wardId,
      name: wardName,
      aqi,
      status,
      priorityScore,
      populationDensity: Math.random() > 0.6 ? 'High' : Math.random() > 0.3 ? 'Medium' : 'Low',
      sourceDistribution: {
        industrial,
        vehicular,
        construction,
        biomass: Math.max(0, biomass)
      },
      complaints: Math.floor(aqi / 10 + Math.random() * 5),
      responseTime: (1 + Math.random() * 4).toFixed(1) + 'h',
      outcomeTrend: Math.random() > 0.7 ? 'Worsening' : Math.random() > 0.3 ? 'Stable' : 'Success',
      sensorCoverage: aqiResult.source === 'sensor' ? 90 : 20,
      dataConfidence: aqiResult.source === 'sensor' ? 'High' : 'Medium',
      dataSource: aqiResult.source,
      lastUpdated: 'Just now',
      aqiDuration: Math.floor(Math.random() * 12 + 2) + ' hours',
      recommendedActions: getRecommendedActions(aqi, status, wardName),
      whyToday: getWhyToday(aqi, status, wardName),
      trendHistory: generateTrendHistory(aqi),
      lat,
      lng
    };
  });

  // Sort by priority for the dashboard
  wards.sort((a, b) => b.priorityScore - a.priorityScore);

  // Save to localStorage
  localStorage.setItem('delhi_ward_data', JSON.stringify(wards));
  localStorage.setItem('shared_ward_data', JSON.stringify(wards));
  localStorage.setItem('delhi_ward_data_timestamp', Date.now().toString());

  return wards;
}

function getRecommendedActions(aqi: number, status: string, wardName: string): string[] {
  if (aqi > 300) {
    return [
      'Immediate ban on all construction activities',
      'Deploy smog guns at major intersections',
      'Odd-even traffic restrictions in this zone',
      'Mandatory work-from-home advisory'
    ];
  } else if (aqi > 200) {
    return [
      'Intensify water sprinkling on dusty roads',
      'Strict enforcement of no-idling in markets',
      'Increase frequency of mechanical sweeping'
    ];
  }
  return [
    'Monitor local emission hotspots',
    'Routine dust suppression measures'
  ];
}

function getWhyToday(aqi: number, status: string, wardName: string): string {
  if (aqi > 300) {
    return `Critical spike in PM2.5 likely due to low wind speed and localized industrial discharge in ${wardName}.`;
  }
  return `Background concentrations influenced by regional drift and typical morning traffic volume in ${wardName}.`;
}

function generateTrendHistory(currentAqi: number) {
  const history = [];
  const times = ['6 AM', '9 AM', '12 PM', '3 PM'];
  for (let i = 0; i < 4; i++) {
    const variance = (Math.random() - 0.5) * 40;
    history.push({
      timestamp: times[i],
      aqi: Math.round(currentAqi + variance)
    });
  }
  return history;
}

/**
 * Generates a text summary of the current ward data for LLM context.
 */
export function getSystemSummary(wards: WardData[]): string {
  const totalWards = wards.length;
  if (totalWards === 0) return "No ward data available.";

  const severeWards = wards.filter(w => w.aqi > 250).map(w => w.name);
  const poorWards = wards.filter(w => w.aqi > 150 && w.aqi <= 250).map(w => w.name);
  const highConfidence = wards.filter(w => w.dataConfidence === 'High').length;
  
  const avgAqi = Math.round(wards.reduce((acc, w) => acc + w.aqi, 0) / totalWards);
  
  return `
    PLATFORM CONTEXT: Ward-Wise IQ (Delhi AQI Platform)
    CITY-WIDE SNAPSHOT:
    - Average AQI: ${avgAqi}
    - Total Wards: ${totalWards}
    - Priority Hotspots (Severe): ${severeWards.length > 0 ? (severeWards.length > 5 ? severeWards.slice(0, 5).join(', ') + ' and others' : severeWards.join(', ')) : 'None'}
    - High Concern (Poor): ${poorWards.length > 0 ? (poorWards.length > 5 ? poorWards.slice(0, 5).join(', ') + ' and others' : poorWards.join(', ')) : 'None'}
    
    DATA QUALITY:
    - High Confidence Units: ${highConfidence}/${totalWards}
    - Estimation Logic: Hybrid spatial-temporal interpolation (Nearest-Neighbor + IDW)
    - Calibration: OpenAQ (Physical) synchronized with 200+ virtual points
    
    GUARDRAILS:
    - Never hallucinate ward names.
    - Always attribute data source (Sensor vs Estimated).
    - If confidence is Low for a ward, explicitly state: "Data quality is currently under validation for this sector."
  `.trim();
}
