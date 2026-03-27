
import { WardData, Complaint, ConstructionSite } from './types';

export const DELHI_WARDS: WardData[] = [
  {
    id: 'w44',
    name: 'ANAND VIHAR',
    aqi: 412,
    priorityScore: 98,
    populationDensity: 'High',
    status: 'CRITICAL',
    whyToday: "Peak congestion at ISBT and unauthorized biomass combustion in adjacent industrial zones.",
    sourceDistribution: { industrial: 20, vehicular: 48, construction: 12, biomass: 20 },
    complaints: 42,
    responseTime: '1.5h',
    outcomeTrend: 'Stable',
    sensorCoverage: 92,
    dataConfidence: 'High',
    lastUpdated: '2 min ago',
    dataSource: 'sensor',
    aqiDuration: '6 hours',
    recommendedActions: [
      'Restrict construction activities (48 hrs emergency ban)',
      'Deploy dust suppression trucks on Ring Road',
      'Traffic diversion during peak hours (7-10 AM)',
      'Coordinate with ISBT for vehicle staging area relocation'
    ],
    trendHistory: [
      { timestamp: '12 AM', aqi: 310 }, { timestamp: '3 AM', aqi: 295 },
      { timestamp: '6 AM', aqi: 380 }, { timestamp: '9 AM', aqi: 402 },
      { timestamp: '12 PM', aqi: 412 }, { timestamp: '3 PM', aqi: 408 },
      { timestamp: '6 PM', aqi: 425 }, { timestamp: '9 PM', aqi: 405 },
    ],
    weather: { windSpeed: 4, windDirection: 'SE', humidity: 68, temperature: 28, inversionLayer: true },
    priorityBreakdown: { aqiWeight: 55, populationWeight: 30, complaintsWeight: 15 },
  },
  {
    id: 'w08',
    name: 'DWARKA SEC-8',
    aqi: 308,
    priorityScore: 74,
    populationDensity: 'Medium',
    status: 'POOR',
    whyToday: "Localized dust from arterial road expansions and high vehicular idling at intersections.",
    sourceDistribution: { industrial: 10, vehicular: 55, construction: 25, biomass: 10 },
    complaints: 18,
    responseTime: '3.2h',
    outcomeTrend: 'Success',
    sensorCoverage: 78,
    dataConfidence: 'High',
    lastUpdated: '5 min ago',
    dataSource: 'sensor',
    aqiDuration: '4 hours',
    recommendedActions: [
      'Intensify metro construction dust management',
      'Deploy air quality monitors at metro pillar sites',
      'Schedule dust control on alternate Sundays'
    ],
    trendHistory: [
      { timestamp: '12 AM', aqi: 240 }, { timestamp: '3 AM', aqi: 225 },
      { timestamp: '6 AM', aqi: 280 }, { timestamp: '9 AM', aqi: 295 },
      { timestamp: '12 PM', aqi: 308 }, { timestamp: '3 PM', aqi: 302 },
      { timestamp: '6 PM', aqi: 315 }, { timestamp: '9 PM', aqi: 298 },
    ],
    weather: { windSpeed: 8, windDirection: 'W', humidity: 55, temperature: 30, inversionLayer: false },
    priorityBreakdown: { aqiWeight: 45, populationWeight: 25, complaintsWeight: 30 },
  },
  {
    id: 'w15',
    name: 'OKHLA PHASE III',
    aqi: 356,
    priorityScore: 89,
    populationDensity: 'High',
    status: 'SEVERE',
    whyToday: "Industrial emission bypass and heavy transport traffic during logistics windows.",
    sourceDistribution: { industrial: 65, vehicular: 20, construction: 5, biomass: 10 },
    complaints: 55,
    responseTime: '2.4h',
    outcomeTrend: 'Worsening',
    sensorCoverage: 88,
    dataConfidence: 'High',
    lastUpdated: '3 min ago',
    dataSource: 'sensor',
    aqiDuration: '8 hours',
    recommendedActions: [
      'Issue industrial emission violation notices (Plot 418 Zone B)',
      'Mandate chimney stack inspections this week',
      'Restrict heavy transport during 6-9 AM (peak hours)',
      'Initiate compliance audit with DPCC'
    ],
    trendHistory: [
      { timestamp: '12 AM', aqi: 290 }, { timestamp: '3 AM', aqi: 278 },
      { timestamp: '6 AM', aqi: 330 }, { timestamp: '9 AM', aqi: 348 },
      { timestamp: '12 PM', aqi: 356 }, { timestamp: '3 PM', aqi: 352 },
      { timestamp: '6 PM', aqi: 370 }, { timestamp: '9 PM', aqi: 358 },
    ],
    weather: { windSpeed: 3, windDirection: 'N', humidity: 72, temperature: 27, inversionLayer: true },
    priorityBreakdown: { aqiWeight: 50, populationWeight: 20, complaintsWeight: 30 },
  },
  {
    id: 'w12',
    name: 'Delhi Civic Center',
    aqi: 142,
    priorityScore: 12,
    populationDensity: 'Medium',
    status: 'MODERATE',
    whyToday: "Minimal industrial activity; background concentrations influenced by city-wide drift.",
    sourceDistribution: { industrial: 5, vehicular: 60, construction: 30, biomass: 5 },
    complaints: 4,
    responseTime: '4.8h',
    outcomeTrend: 'Success',
    sensorCoverage: 65,
    dataConfidence: 'Medium',
    lastUpdated: '12 min ago',
    dataSource: 'estimated',
    aqiDuration: '2 hours',
    recommendedActions: [
      'Continue routine monitoring',
      'Maintain traffic flow management'
    ],
    trendHistory: [
      { timestamp: '12 AM', aqi: 110 }, { timestamp: '3 AM', aqi: 105 },
      { timestamp: '6 AM', aqi: 125 }, { timestamp: '9 AM', aqi: 135 },
      { timestamp: '12 PM', aqi: 142 }, { timestamp: '3 PM', aqi: 138 },
      { timestamp: '6 PM', aqi: 145 }, { timestamp: '9 PM', aqi: 132 },
    ],
    weather: { windSpeed: 12, windDirection: 'NW', humidity: 45, temperature: 31, inversionLayer: false },
    priorityBreakdown: { aqiWeight: 40, populationWeight: 35, complaintsWeight: 25 },
  }
];

export const MOCK_COMPLAINTS: Complaint[] = [
  {
    id: 'CMP-2026-0441',
    type: 'Waste Burning',
    ward: 'ANAND VIHAR',
    location: 'Backyard of ISBT, Gate 3',
    timestamp: '2026-03-27T10:30:00',
    status: 'Assigned',
    intensity: 'High',
    responsibleDept: 'Fire & Sanitation (MCD)',
    slaRemaining: '0.8h',
    reporter: {
      userId: 'U-9A1F3B',
      authMethod: 'Phone Verified + Google',
      trustScore: 0.91,
    },
    coordinates: { lat: 28.6467, lng: 77.3152 },
    evidence: ['img_20260327_103011.jpg', 'img_20260327_103045.jpg'],
    aqiAtSubmission: 387,
    integrityHash: 'sha256:3e7a9f1b2d4c8a0e6f5d3b1a9c7e2f4b8d0c6a2e4f8b0d2c6a8e0f2b4d6c8a0',
  },
  {
    id: 'CMP-2026-0398',
    type: 'Construction Dust',
    ward: 'DWARKA SEC-8',
    location: 'Metro Pillar 142, Sector 8',
    timestamp: '2026-03-27T09:45:00',
    status: 'Reported',
    intensity: 'Medium',
    responsibleDept: 'MCD Dust Squad',
    slaRemaining: '22h',
    reporter: {
      userId: 'U-4D8E2C',
      authMethod: 'Aadhaar OTP',
      trustScore: 0.78,
    },
    coordinates: { lat: 28.5921, lng: 77.0672 },
    evidence: ['construction_dust_evidence.jpg'],
    aqiAtSubmission: 312,
    integrityHash: 'sha256:abc123xyz9f1b2d4c8a0e6f5d3b1a9c7e2f4b8d0c6a2e4f8b0d2c6a8e0f2b4d6',
  },
  {
    id: 'CMP-2026-0312',
    type: 'Industrial Violation',
    ward: 'OKHLA PHASE III',
    location: 'Plot 418, Zone B, Okhla Industrial Area',
    timestamp: '2026-03-26T14:15:00',
    status: 'Resolved',
    intensity: 'High',
    responsibleDept: 'DPCC Taskforce',
    slaRemaining: 'Resolved',
    reporter: {
      userId: 'U-7C5A1D',
      authMethod: 'Phone Verified + Google',
      trustScore: 0.95,
    },
    coordinates: { lat: 28.5355, lng: 77.2747 },
    evidence: ['chimney_violation_1.jpg', 'chimney_violation_2.jpg', 'stack_reading.jpg'],
    aqiAtSubmission: 445,
    integrityHash: 'sha256:f8e2b4d6c0a8e2b4d6c0a8f2b4d6c0a8e2b4d6c0a8f2b4d6c0a8e2b4d6c0a8',
  },
];

export const CONSTRUCTION_SITES: ConstructionSite[] = [
  { id: 's1', name: 'Apex Residency', location: 'Dwarka Sec 12', compliance: 42, status: 'Penalized', lastInspection: '2h ago', responsibleAgency: 'DPCC', slaDeadline: '48h for remediation' },
  { id: 's2', name: 'NHAI Flyover', location: 'Mayur Vihar Ph 1', compliance: 88, status: 'Compliant', lastInspection: '1d ago', responsibleAgency: 'MCD', slaDeadline: 'Bi-weekly' },
];

export const TREND_DATA = [
  { name: '06:00', aqi: 310 }, { name: '09:00', aqi: 420 }, { name: '12:00', aqi: 380 },
  { name: '15:00', aqi: 340 }, { name: '18:00', aqi: 405 }, { name: '21:00', aqi: 450 },
];

export const NO_IDLING_HOTSPOTS = [
  { id: 'ni1', site: 'ISBT Anand Vihar', ward: 'ANAND VIHAR', violations: 42, sla: '15m Response', status: 'Active Enforcement', lastUpdate: '10 min ago' },
  { id: 'ni2', site: 'Sarai Kale Khan', ward: 'OKHLA PHASE III', violations: 28, sla: 'Immediate', status: 'High Priority', lastUpdate: '5 min ago' },
  { id: 'ni3', site: 'Dhaula Kuan Hub', ward: 'Delhi Civic Center', violations: 12, sla: 'Monitoring', status: 'Routine Check', lastUpdate: '15 min ago' }
];

export const WASTE_BURNING_INCIDENTS = MOCK_COMPLAINTS.filter(c => c.type === 'Waste Burning');
