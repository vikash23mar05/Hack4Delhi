
export interface WardData {
  id: string;
  name: string;
  aqi: number;
  priorityScore: number; // 0-100 score for decision prioritization
  populationDensity: 'High' | 'Medium' | 'Low';
  status: 'GOOD' | 'MODERATE' | 'POOR' | 'SEVERE' | 'CRITICAL' | 'IMPROVING';
  whyToday?: string; // Explainable AI context
  sourceDistribution: {
    industrial: number;
    vehicular: number;
    construction: number;
    biomass: number;
  };
  complaints: number;
  responseTime: string;
  outcomeTrend: 'Success' | 'Stable' | 'Worsening'; // Tracking result of past actions
  // Data Confidence & Transparency
  sensorCoverage: number; // % of ward with sensor data (0-100)
  dataConfidence: 'Low' | 'Medium' | 'High'; // Based on sensor vs estimated
  lastUpdated?: string;
  dataSource: 'sensor' | 'estimated'; // sensor = solid border, estimated = dashed
  aqiDuration?: string; // How long AQI has been high (e.g., "6 hours")
  // Action Recommendations
  recommendedActions?: string[];
  trendHistory?: { timestamp: string; aqi: number }[];
  lat?: number;
  lng?: number;
  // Meteorological data (NEW)
  weather?: {
    windSpeed: number;    // km/h
    windDirection: string; // e.g. 'N', 'SW'
    humidity: number;     // percentage
    temperature: number;  // Celsius
    inversionLayer: boolean; // atmospheric inversion trapping pollutants
  };
  // Priority score breakdown (NEW)
  priorityBreakdown?: {
    aqiWeight: number;        // contribution from AQI severity
    populationWeight: number; // contribution from population density
    complaintsWeight: number; // contribution from active complaints
  };
}

export interface SimulationResult {
  policy: string;
  projectedAqiReduction: number;
  confidenceRange: string; // e.g., "+/- 12%" to avoid overclaiming
  feasibility: number;
  economicImpact: string;
  socialEquityImpact: string; // Judges love thinking about vulnerable populations
  detailedAnalysis: string;
  projectedTimeSeries?: { hour: string; aqi: number }[]; // NEW: for chart rendering
}

export enum ViewMode {
  LANDING = 'LANDING',
  LOGIN = 'LOGIN',
  CITIZEN_DASHBOARD = 'CITIZEN_DASHBOARD',
  AUTHORITY_DASHBOARD = 'AUTHORITY_DASHBOARD',
  AUTHORITY_ROLE_SELECT = 'AUTHORITY_ROLE_SELECT',
  AUTHORITY_ANALYTICS = 'AUTHORITY_ANALYTICS',
  AUTHORITY_EXECUTIVE = 'AUTHORITY_EXECUTIVE',
  AUTHORITY_FIELD = 'AUTHORITY_FIELD',
  AUTHORITY_OPERATIONAL = 'AUTHORITY_OPERATIONAL',
  MAP_VIEW = 'MAP_VIEW',
  CLEAN_AIR_CREDITS = 'CLEAN_AIR_CREDITS',
  OPEN_DATA = 'OPEN_DATA'
}

export enum AuthorityTool {
  OVERVIEW = 'OVERVIEW',
  NO_IDLING = 'NO_IDLING',
  CONSTRUCTION = 'CONSTRUCTION',
  WASTE_BURNING = 'WASTE_BURNING',
  CALENDAR = 'CALENDAR',
  SIMULATION = 'SIMULATION',
  OUTCOME_TRACKER = 'OUTCOME_TRACKER'
}

export type UserRole = 'CITIZEN' | 'AUTHORITY' | null;

export type AuthorityRole = 'ANALYTICS' | 'EXECUTIVE' | 'FIELD' | 'OPERATIONAL' | null;

export interface Complaint {
  id: string;
  type: 'Waste Burning' | 'Construction Dust' | 'Industrial Violation';
  location: string;
  ward: string;
  timestamp: string;
  status: 'Reported' | 'Assigned' | 'Actioned' | 'Resolved';
  intensity: 'Low' | 'Medium' | 'High';
  responsibleDept: string;
  slaRemaining: string;
  verificationPhoto?: string;
  // ── Credibility & Evidence Fields ──────────────────────────────────────────
  reporter?: {
    userId: string;
    authMethod: string;       // e.g. 'phone_verified + google'
    trustScore: number;       // 0–1 float
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
  evidence?: string[];        // image filenames / URLs
  aqiAtSubmission?: number;   // ambient AQI logged at time of report
  integrityHash?: string;     // SHA-256 / blockchain anchor proof
}

export interface ConstructionSite {
  id: string;
  name: string;
  location: string;
  compliance: number;
  status: 'Compliant' | 'Warning' | 'Penalized';
  lastInspection: string;
  responsibleAgency: string;
  slaDeadline: string;
}
