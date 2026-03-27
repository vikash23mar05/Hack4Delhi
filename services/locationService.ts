import { DELHI_WARDS } from '../constants';
import { WardData } from '../types';

interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Check if a point is inside a polygon using ray-casting algorithm
 */
function isPointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > lat) !== (yj > lat))
      && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Calculate distance between two points using Haversine formula (km)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find ward from coordinates by checking GeoJSON data
 */
async function findWardFromGeoJSON(lat: number, lng: number): Promise<WardData | null> {
  try {
    const response = await fetch('/delhi_wards.geojson');
    const geojson = await response.json();

    const features = geojson.type === 'FeatureCollection' ? geojson.features : [geojson];

    // Get the full dynamic ward data from localStorage if available
    const dynamicWardsJson = localStorage.getItem('delhi_ward_data');
    const dynamicWards: WardData[] = dynamicWardsJson ? JSON.parse(dynamicWardsJson) : [];

    for (const feature of features) {
      const coords = feature.geometry?.coordinates;
      if (!coords) continue;

      // Handle both Polygon and MultiPolygon
      const polygons = feature.geometry.type === 'Polygon' ? [coords] : coords;

      for (const polygon of polygons) {
        // In MultiPolygon, the coordinates are grouped by polygon
        const rings = feature.geometry.type === 'Polygon' ? polygon : polygon[0];
        const ring = Array.isArray(rings[0][0]) ? rings[0] : rings;

        if (isPointInPolygon(lat, lng, ring)) {
          const wardName = (feature.properties?.Ward_Name || feature.properties?.name || '').toUpperCase();
          
          // Try to find in dynamic wards first
          let matchedWard = dynamicWards.find(w => w.name.toUpperCase() === wardName);
          
          // Fallback to constants if not in dynamic list yet
          if (!matchedWard) {
            matchedWard = DELHI_WARDS.find(w => w.name.toUpperCase() === wardName);
          }
          
          if (matchedWard) return matchedWard;
          
          // If still no match, create a basic WardData object from feature properties
          return {
            id: feature.properties?.Ward_No || `w-${wardName}`,
            name: wardName,
            aqi: 150, // Default fallback
            status: 'MODERATE',
            priorityScore: 50,
            populationDensity: 'Medium',
            sourceDistribution: { industrial: 25, vehicular: 25, construction: 25, biomass: 25 },
            complaints: 0,
            responseTime: '4h',
            outcomeTrend: 'Stable',
            sensorCoverage: 50,
            dataConfidence: 'Medium',
            dataSource: 'estimated',
            lastUpdated: 'Just now',
          } as WardData;
        }
      }
    }
  } catch (error) {
    console.error('Error loading GeoJSON:', error);
  }

  return null;
}

/**
 * Find nearest ward by distance if point-in-polygon fails
 */
function findNearestWard(lat: number, lng: number): WardData {
  const dynamicWardsJson = localStorage.getItem('delhi_ward_data');
  const allWards: WardData[] = dynamicWardsJson ? JSON.parse(dynamicWardsJson) : DELHI_WARDS;
  
  if (allWards.length === 0) return DELHI_WARDS[0];

  let nearest = allWards[0];
  let minDistance = Infinity;

  for (const ward of allWards) {
    if (ward.lat && ward.lng) {
      const distance = calculateDistance(lat, lng, ward.lat, ward.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = ward;
      }
    } else {
      // Fallback for wards missing coordinates
      const center = { lat: 28.6139, lng: 77.209 }; 
      const distance = calculateDistance(lat, lng, center.lat, center.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = ward;
      }
    }
  }

  return nearest;
}

/**
 * Get user's current location and detect their ward using actual geolocation and GeoJSON lookup
 */
export async function detectUserWard(): Promise<WardData | null> {
  console.log('📡 Attempting to detect user location...');
  
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser.');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log(`📍 Detected coordinates: ${latitude}, ${longitude}`);
        
        try {
          const ward = await findWardFromGeoJSON(latitude, longitude);
          if (ward) {
            console.log(`🏘️ Detected ward: ${ward.name}`);
            storeUserWard(ward);
            resolve(ward);
          } else {
            console.log('🏘️ No ward found in GeoJSON, finding nearest...');
            const nearest = findNearestWard(latitude, longitude);
            storeUserWard(nearest);
            resolve(nearest);
          }
        } catch (e) {
          console.error('Error finding ward:', e);
          resolve(DELHI_WARDS[0]);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        resolve(null);
      },
      { timeout: 15000, enableHighAccuracy: true }
    );
  });
}

/**
 * Store detected ward in localStorage
 */
export function storeUserWard(ward: WardData): void {
  try {
    localStorage.setItem('user_ward', JSON.stringify(ward));
  } catch (e) {
    console.error('Failed to store ward:', e);
  }
}

/**
 * Retrieve stored ward from localStorage
 */
export function getStoredWard(): WardData | null {
  try {
    const stored = localStorage.getItem('user_ward');
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.error('Failed to retrieve ward:', e);
    return null;
  }
}
