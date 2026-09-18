/**
 * Mock Incident Data for NigraanOS
 *
 * This file contains mock incident data used during the product-skeleton stage.
 * Replace with real Supabase queries when the backend integration is ready.
 *
 * All "AI intelligence" fields (whatHappened, likelyImpact, confidence, impactChain,
 * recommendedAction) are MOCK DATA for demonstration purposes only.
 */

import type { IconName } from '../design';
import type { IncidentStatus } from '../design/components/StatusBadge';

// ── Types ────────────────────────────────────────────────────────

export type IncidentCategory = 'roads' | 'flooding' | 'water' | 'electricity' | 'waste';
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface MockIncident {
  id: string;
  category: IncidentCategory;
  title: string;
  description: string;
  severity: Severity;
  status: IncidentStatus;
  area: string;
  reportedAgo: string;
  /** Position on map (0-100 percentage) */
  x: number;
  y: number;

  // ── Intelligence Fields (MOCK) ──────────────────────────────
  /** AI Understanding: What happened (mock) */
  whatHappened: string;
  /** AI Understanding: Likely impact (mock) */
  likelyImpact: string;
  /** AI Understanding: Confidence level (mock) */
  confidence: 'low' | 'medium' | 'high';
  /** Civic Impact: Chain of consequences (mock) */
  impactChain: string[];
  /** Recommended next action (mock AI recommendation) */
  recommendedAction: string;
}

// ── Category Config ──────────────────────────────────────────────

export interface CategoryConfig {
  label: string;
  icon: IconName;
  color: string;
}

export const CATEGORY_CONFIG: Record<IncidentCategory, CategoryConfig> = {
  roads: { label: 'Roads', icon: 'road', color: '#795548' },
  flooding: { label: 'Flooding', icon: 'water', color: '#1565C0' },
  water: { label: 'Water', icon: 'water', color: '#00838F' },
  electricity: { label: 'Power', icon: 'electricity', color: '#F57C00' },
  waste: { label: 'Waste', icon: 'building', color: '#5F6368' },
};

// ── Severity Config ──────────────────────────────────────────────

export const SEVERITY_CONFIG: Record<Severity, { color: string; label: string }> = {
  low: { color: '#5F6368', label: 'Low' },
  medium: { color: '#E65100', label: 'Medium' },
  high: { color: '#D32F2F', label: 'High' },
  critical: { color: '#B71C1C', label: 'Critical' },
};

// ── Mock Data ────────────────────────────────────────────────────

export const MOCK_INCIDENTS: MockIncident[] = [
  {
    id: 'm1',
    category: 'roads',
    title: 'Road blockage near Gulberg signal',
    description:
      'Large pothole causing traffic slowdown during rush hours. Multiple vehicles affected daily.',
    severity: 'medium',
    status: 'IN_PROGRESS',
    area: 'Main Boulevard, Gulberg',
    reportedAgo: '2 hours ago',
    x: 35,
    y: 28,
    // Mock intelligence
    whatHappened:
      'A large pothole has formed on the main boulevard near the Gulberg signal, likely due to recent rain and heavy traffic wear. The road surface has deteriorated over the past 48 hours.',
    likelyImpact:
      'Traffic congestion during peak hours. Increased risk of vehicle damage. Potential for accidents if drivers swerve to avoid the pothole.',
    confidence: 'high',
    impactChain: [
      'Road surface damage',
      'Traffic slowdown',
      'Increased commute times',
      'Emergency vehicle delays',
    ],
    recommendedAction:
      'Temporary road patching within 24 hours. Schedule full resurfacing during low-traffic weekend.',
  },
  {
    id: 'm2',
    category: 'flooding',
    title: 'Street flooding after rain',
    description:
      'Low-lying area accumulates water after moderate rainfall. Pedestrians and vehicles affected.',
    severity: 'high',
    status: 'REPORTED',
    area: 'Shahrah-e-Faisal Service Lane',
    reportedAgo: '5 hours ago',
    x: 62,
    y: 45,
    // Mock intelligence
    whatHappened:
      'Storm drains along Shahrah-e-Faisal service lane appear to be blocked or undersized. Moderate rainfall is causing water to accumulate on the road surface, reaching depths of 6-8 inches.',
    likelyImpact:
      'Vehicle stalling in standing water. Pedestrian safety risk. Potential property damage to ground-floor shops. Mosquito breeding if water persists.',
    confidence: 'medium',
    impactChain: [
      'Drain blockage',
      'Water accumulation',
      'Traffic disruption',
      'Property damage risk',
    ],
    recommendedAction:
      'Dispatch drainage crew to clear blocked storm drains. Place temporary warning barriers. Monitor water levels.',
  },
  {
    id: 'm3',
    category: 'water',
    title: 'Water supply disruption',
    description:
      'No water supply since morning. K-IV pipeline maintenance affecting multiple blocks.',
    severity: 'medium',
    status: 'VERIFIED',
    area: 'PECHS Block 2',
    reportedAgo: 'Yesterday',
    x: 48,
    y: 62,
    // Mock intelligence
    whatHappened:
      'Scheduled maintenance on the K-IV water pipeline has temporarily disrupted supply to PECHS Block 2 and surrounding areas. The Karachi Water and Sewerage Corporation confirmed planned work.',
    likelyImpact:
      'Households without running water for 8-12 hours. Residents relying on water tankers. Potential health concerns if alternative water sources are contaminated.',
    confidence: 'high',
    impactChain: [
      'Pipeline maintenance',
      'Supply interruption',
      'Water tanker dependency',
      'Health risk from alternatives',
    ],
    recommendedAction:
      'Coordinate water tanker deployment to affected blocks. Communicate expected restoration time to residents.',
  },
  {
    id: 'm4',
    category: 'electricity',
    title: 'Power outage in residential area',
    description:
      'Transformer failure causing extended outage. K-Electric notified but no ETA.',
    severity: 'high',
    status: 'CORROBORATED',
    area: 'Gulshan-e-Iqbal Block 4',
    reportedAgo: '1 day ago',
    x: 75,
    y: 35,
    // Mock intelligence
    whatHappened:
      'A transformer failure in Gulshan-e-Iqbal Block 4 has caused a prolonged power outage. K-Electric has been notified but response has been delayed. Multiple similar reports from the area confirm the issue.',
    likelyImpact:
      'Extended blackout affecting 200+ households. Food spoilage in refrigerators. Heat-related health risks in summer. Disruption to home-based businesses and remote workers.',
    confidence: 'high',
    impactChain: [
      'Transformer failure',
      'Extended blackout',
      'Food spoilage',
      'Health and economic impact',
    ],
    recommendedAction:
      'Escalate to K-Electric priority response. Deploy mobile generator for critical loads. Communicate timeline to affected residents.',
  },
  {
    id: 'm5',
    category: 'waste',
    title: 'Garbage pile-up near park',
    description:
      'Uncollected waste accumulating near park entrance. Health hazard for children.',
    severity: 'low',
    status: 'RESOLVED',
    area: 'Jail Road Park Entrance',
    reportedAgo: '3 days ago',
    x: 22,
    y: 55,
    // Mock intelligence
    whatHappened:
      'Waste collection was skipped for 2 days near Jail Road Park entrance. Garbage bags have accumulated and begun attracting stray animals and insects. The issue was reported and resolved within 48 hours.',
    likelyImpact:
      'Health hazard for children playing in the park. Stray animal congregation. Unpleasant odor affecting nearby residents. Potential groundwater contamination if waste leaches.',
    confidence: 'high',
    impactChain: [
      'Missed collection',
      'Waste accumulation',
      'Health hazard',
      'Environmental concern',
    ],
    recommendedAction:
      'Issue resolved. Schedule more frequent collection during high-waste periods. Consider additional bins near park entrance.',
  },
  {
    id: 'm6',
    category: 'roads',
    title: 'Broken street lights',
    description:
      'Multiple street lights not working since Monday. Safety concern for evening commuters.',
    severity: 'medium',
    status: 'AI_ANALYZED',
    area: 'MA Jinnah Road',
    reportedAgo: '2 days ago',
    x: 55,
    y: 18,
    // Mock intelligence
    whatHappened:
      'A stretch of approximately 8 street lights along MA Jinnah Road has been non-functional for 2 days. Possible causes include electrical fault, bulb end-of-life, or vandalism. AI analysis suggests infrastructure aging based on similar historical patterns.',
    likelyImpact:
      'Reduced visibility for evening and night traffic. Increased accident risk for pedestrians and vehicles. Potential security concerns in poorly lit areas.',
    confidence: 'medium',
    impactChain: [
      'Light failure',
      'Reduced visibility',
      'Accident risk increase',
      'Security concerns',
    ],
    recommendedAction:
      'Dispatch maintenance crew to inspect and repair. Audit similar-age street lights in the area for preventive replacement.',
  },
];

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Find an incident by ID from the mock data.
 * Replace with Supabase query when backend is ready.
 */
export function findMockIncident(id: string): MockIncident | undefined {
  return MOCK_INCIDENTS.find((i) => i.id === id);
}
