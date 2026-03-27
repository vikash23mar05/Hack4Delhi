/**
 * Data.gov.in API Integration Service
 * Fetches real-time air quality data from the official Indian Government API for Delhi
 */

import { AQIDataPoint } from './openaqService';

const API_KEY = '579b464db66ec23bdd0000011b110078a7cd41824c3e6c669d56f65c';
const RESOURCE_ID = '3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69';
const BASE_URL = `https://api.data.gov.in/resource/${RESOURCE_ID}?api-key=${API_KEY}&format=json&filters[state]=Delhi&limit=500`;

interface DataGovRecord {
  country: string;
  state: string;
  city: string;
  station: string;
  last_update: string;
  latitude: string;
  longitude: string;
  pollutant_id: string;
  min_value: string;
  max_value: string;
  avg_value: string;
}

interface DataGovResponse {
  status: string;
  records: DataGovRecord[];
}

/**
 * Fetch latest air quality data from data.gov.in
 */
export async function fetchDelhiDataGovAQI(): Promise<AQIDataPoint[]> {
  try {
    console.log('📡 Fetching real-time AQI from data.gov.in...');
    const response = await fetch(BASE_URL);
    
    if (!response.ok) {
      throw new Error(`Data.gov.in API error: ${response.status}`);
    }

    const data: DataGovResponse = await response.json();
    if (!data.records || data.records.length === 0) {
      console.warn('⚠️ Data.gov.in returned 0 records');
      return [];
    }

    // Group records by station to find the max sub-index (AQI)
    const stationGroups: Record<string, {
      lat: number;
      lng: number;
      maxAqi: number;
      pm25: number;
      lastUpdate: string;
    }> = {};

    data.records.forEach(record => {
      const station = record.station;
      const lat = parseFloat(record.latitude);
      const lng = parseFloat(record.longitude);
      const val = parseInt(record.avg_value) || 0;
      
      if (isNaN(lat) || isNaN(lng)) return;

      if (!stationGroups[station]) {
        stationGroups[station] = {
          lat,
          lng,
          maxAqi: 0,
          pm25: 0,
          lastUpdate: record.last_update
        };
      }

      // Update max AQI for the station
      if (val > stationGroups[station].maxAqi) {
        stationGroups[station].maxAqi = val;
      }

      // Specifically track PM2.5 if available
      if (record.pollutant_id === 'PM2.5') {
        stationGroups[station].pm25 = val;
      }
    });

    const readings: AQIDataPoint[] = Object.entries(stationGroups).map(([name, data]) => ({
      location: name,
      lat: data.lat,
      lng: data.lng,
      pm25: data.pm25,
      aqi: data.maxAqi,
      timestamp: data.lastUpdate
    }));

    console.log(`✅ Collected ${readings.length} station readings from data.gov.in`);
    return readings;
  } catch (error) {
    console.error('❌ Error fetching data.gov.in data:', error);
    return [];
  }
}
