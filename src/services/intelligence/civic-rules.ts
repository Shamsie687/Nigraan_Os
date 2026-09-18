// ── Civic Intelligence Rules Engine (on-device) ────────────────────
//
// TypeScript port of the deterministic civic rules from the backend
// (backend/app/services/civic_rules.py). Runs entirely on-device so
// the Civic Assistant works without a backend connection.
//
// This is NOT an AI model. It produces transparent, deterministic
// assessments from keyword analysis and category-specific knowledge.

// ── Types ──────────────────────────────────────────────────────────

export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type ImpactLevel = 'low' | 'medium' | 'high';

export interface CivicAssessment {
  category: string;
  categoryLabel: string;
  severity: Severity;
  confidence: number;
  summary: string;
  potentialImpacts: string[];
  recommendedActions: string[];
  urgencyReason: string;
  rippleTrigger: string;
  rippleEffects: string[];
  rippleOverallImpact: string;
  rippleImpactLevel: ImpactLevel;
}

// ── Severity Signals ──────────────────────────────────────────────

const SEVERITY_SIGNALS: Record<string, number> = {
  emergency: 3, ambulance: 3, injured: 3, trapped: 3, fire: 3,
  electrocution: 3, electrocuted: 3, death: 3, collapsed: 3, explosion: 3,
  hospital: 2, school: 2, children: 2,
  'exposed wire': 2, 'exposed electrical': 2, 'electrical wire': 2,
  dangerous: 2, 'major flooding': 2, 'blocked main road': 2,
  'blocked road': 2, 'main road': 2, 'multiple people': 2,
  'gas leak': 2, contamination: 2, 'sewage overflow': 2,
  'power outage': 2, blackout: 2, landslide: 2, 'structural damage': 2,
  leaking: 1, leak: 1, broken: 1, damaged: 1, blocked: 1,
  overflow: 1, crack: 1, pothole: 1, garbage: 1, waste: 1,
  smell: 1, odor: 1, flooding: 1, flooded: 1,
  'no water': 1, 'no electricity': 1, 'no power': 1,
  unsafe: 1, hazardous: 1, disruption: 1,
};

// ── Category Detection ────────────────────────────────────────────

interface CategoryRule {
  label: string;
  keywords: string[];
  impacts: string[];
  actions: string[];
  rippleTrigger: string;
  rippleEffects: string[];
  rippleOverall: string;
}

const CATEGORY_RULES: Record<string, CategoryRule> = {
  water: {
    label: 'Water supply issue',
    keywords: ['water', 'pipe', 'leak', 'tap', 'supply', 'sewage', 'drinking', 'hydrant', 'tanker'],
    impacts: [
      'Water supply disruption for nearby residents',
      'Water wastage and increased utility costs',
      'Potential road flooding from continuous leakage',
    ],
    actions: ['Inspect leakage or supply disruption', 'Assess affected area and population', 'Dispatch water utility team'],
    rippleTrigger: 'Water supply issue reported',
    rippleEffects: ['Nearby households may be affected', 'Sanitation and water access could be under pressure', 'Wider community disruption may occur'],
    rippleOverall: 'Potential impact on water access and community wellbeing',
  },
  flooding: {
    label: 'Flooding incident',
    keywords: ['flood', 'flooding', 'flooded', 'waterlogging', 'rain', 'drainage', 'submerged', 'storm drain'],
    impacts: [
      'Road inaccessibility for vehicles and pedestrians',
      'Property damage to nearby structures',
      'Health risks from stagnant water',
    ],
    actions: ['Inspect drainage systems', 'Assess road accessibility', 'Dispatch drainage response team'],
    rippleTrigger: 'Flooding reported',
    rippleEffects: ['Road access may be restricted', 'Emergency response times could increase', 'Nearby services may become harder to reach'],
    rippleOverall: 'Potential disruption to mobility and emergency access',
  },
  roads: {
    label: 'Road infrastructure issue',
    keywords: ['road', 'pothole', 'street', 'pavement', 'sidewalk', 'bridge', 'highway', 'lane', 'traffic', 'asphalt'],
    impacts: [
      'Traffic disruption and delays',
      'Vehicle damage and accident risk',
      'Pedestrian safety hazard',
    ],
    actions: ['Inspect road condition and extent of damage', 'Secure hazardous area if necessary', 'Dispatch road maintenance team'],
    rippleTrigger: 'Road issue reported',
    rippleEffects: ['Traffic movement may be disrupted', 'Emergency vehicle access could be delayed', 'Wider area mobility may be affected'],
    rippleOverall: 'Potential disruption to traffic flow and area accessibility',
  },
  waste: {
    label: 'Waste management issue',
    keywords: ['garbage', 'waste', 'trash', 'rubbish', 'dump', 'litter', 'sanitation', 'junk'],
    impacts: [
      'Environmental contamination of surrounding area',
      'Health risks from accumulated waste',
      'Attraction of disease-carrying pests',
    ],
    actions: ['Inspect waste accumulation and source', 'Assess environmental impact', 'Dispatch waste management team'],
    rippleTrigger: 'Waste management issue reported',
    rippleEffects: ['Sanitation conditions may deteriorate', 'Pests, odor, or environmental impact could develop', 'Neighborhood health concerns may arise'],
    rippleOverall: 'Potential impact on local sanitation and neighborhood health',
  },
  electricity: {
    label: 'Electrical infrastructure issue',
    keywords: ['electricity', 'electric', 'power', 'wire', 'cable', 'transformer', 'voltage', 'blackout', 'outage', 'pole', 'streetlight'],
    impacts: [
      'Power outage affecting households and businesses',
      'Electrical safety hazard for pedestrians',
      'Disruption to essential services',
    ],
    actions: ['Inspect electrical infrastructure', 'Isolate dangerous equipment if required', 'Dispatch utility response team'],
    rippleTrigger: 'Electrical issue reported',
    rippleEffects: ['Traffic signals and businesses may be affected', 'Essential services could face disruption', 'Safety or economic impact may arise'],
    rippleOverall: 'Potential disruption to electrical services and dependent infrastructure',
  },
  air_quality: {
    label: 'Air quality concern',
    keywords: ['air', 'smoke', 'pollution', 'smog', 'fumes', 'burning', 'dust', 'emission'],
    impacts: [
      'Respiratory health risks for nearby residents',
      'Reduced visibility affecting road safety',
      'Environmental impact on local area',
    ],
    actions: ['Identify pollution source', 'Assess affected area and population', 'Coordinate with environmental authorities'],
    rippleTrigger: 'Air quality concern reported',
    rippleEffects: ['Respiratory health risks may increase for nearby residents', 'Visibility could affect road safety', 'Environmental impact on the local area may occur'],
    rippleOverall: 'Potential impact on public health and environmental quality',
  },
  healthcare: {
    label: 'Healthcare access issue',
    keywords: ['hospital', 'clinic', 'doctor', 'medical', 'medicine', 'pharmacy', 'health', 'patient', 'ambulance'],
    impacts: [
      'Reduced access to medical services',
      'Delayed emergency response capability',
      'Impact on patients requiring regular treatment',
    ],
    actions: ['Assess impact on healthcare delivery', 'Coordinate with health authorities', 'Arrange interim medical provisions if needed'],
    rippleTrigger: 'Healthcare issue reported',
    rippleEffects: ['Patient waiting times may increase', 'Emergency treatment capacity could be reduced', 'Ongoing patient care may be affected'],
    rippleOverall: 'Potential impact on healthcare delivery and patient access',
  },
  education: {
    label: 'Education infrastructure issue',
    keywords: ['school', 'college', 'university', 'classroom', 'teacher', 'student', 'education'],
    impacts: [
      'Disruption to student learning',
      'Safety risk for children and staff',
      'Damage to educational infrastructure',
    ],
    actions: ['Assess damage to school infrastructure', 'Coordinate with education authorities', 'Arrange alternative learning spaces if needed'],
    rippleTrigger: 'Education issue reported',
    rippleEffects: ['Student attendance may be disrupted', 'Learning continuity could be affected', 'School infrastructure and safety may require attention'],
    rippleOverall: 'Potential impact on student learning and school operations',
  },
  public_safety: {
    label: 'Public safety concern',
    keywords: ['safety', 'crime', 'theft', 'assault', 'harassment', 'threat', 'danger', 'security', 'vandalism'],
    impacts: [
      'Risk to personal safety of residents',
      'Reduced community security',
      'Potential escalation without intervention',
    ],
    actions: ['Assess safety risk and affected area', 'Coordinate with local authorities', 'Implement interim safety measures'],
    rippleTrigger: 'Public safety concern reported',
    rippleEffects: ['Personal safety of residents may be at risk', 'Community security could be reduced', 'Issue may escalate without intervention'],
    rippleOverall: 'Potential impact on community safety and security',
  },
  emergency: {
    label: 'Emergency situation',
    keywords: ['emergency', 'collapse', 'explosion', 'trapped', 'death', 'injured', 'fire', 'earthquake', 'disaster'],
    impacts: [
      'Immediate threat to life and safety',
      'Infrastructure damage requiring urgent response',
      'Risk of escalation affecting wider area',
    ],
    actions: ['Dispatch emergency response team immediately', 'Secure affected area and evacuate if needed', 'Coordinate with rescue and medical services'],
    rippleTrigger: 'Emergency situation reported',
    rippleEffects: ['Immediate safety risk for people in the area', 'Emergency response resources may be diverted', 'Surrounding areas could be affected'],
    rippleOverall: 'Potential for significant impact on public safety and emergency services',
  },
};

const CONTEXT_ESCALATORS = ['hospital', 'emergency', 'ambulance', 'school', 'children', 'main road', 'elderly'];

// ── Detection ─────────────────────────────────────────────────────

function detectCategory(text: string): string {
  const lower = text.toLowerCase();
  let bestCategory = 'other';
  let bestScore = 0;

  for (const [category, rule] of Object.entries(CATEGORY_RULES)) {
    const score = rule.keywords.reduce(
      (acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0
    );
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }
  return bestCategory;
}

function detectSignals(text: string): Array<[string, number]> {
  const lower = text.toLowerCase();
  const found: Array<[string, number]> = [];
  for (const [keyword, weight] of Object.entries(SEVERITY_SIGNALS)) {
    if (lower.includes(keyword)) {
      found.push([keyword, weight]);
    }
  }
  return found;
}

function severityFromScore(totalScore: number): Severity {
  if (totalScore >= 6) return 'critical';
  if (totalScore >= 3) return 'high';
  if (totalScore >= 1) return 'medium';
  return 'low';
}

function calculateConfidence(text: string, signalCount: number): number {
  let score = 15;
  const len = text.trim().length;
  if (len > 200) score += 40;
  else if (len > 100) score += 30;
  else if (len > 50) score += 20;
  else if (len > 20) score += 10;

  score += Math.min(signalCount * 5, 20);

  const sentences = text.replace(/;/g, '.').split('.').filter((s) => s.trim().length > 0);
  if (sentences.length >= 3) score += 10;
  else if (sentences.length >= 2) score += 5;

  return Math.min(score, 95);
}

function urgencyReason(severity: Severity, signals: Array<[string, number]>): string {
  if (signals.length === 0) {
    return 'No immediate danger indicators detected in your description.';
  }
  const top = [...signals].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const keywords = top.map(([kw]) => kw.replace(/_/g, ' '));

  if (severity === 'critical') {
    return `Critical indicators detected: ${keywords.join(', ')}. Immediate attention required.`;
  }
  if (severity === 'high') {
    return `Elevated risk indicators: ${keywords.join(', ')}. Prompt response recommended.`;
  }
  if (severity === 'medium') {
    return `Moderate concern indicators: ${keywords.join(', ')}. Standard response timeline.`;
  }
  return `Low-level indicators: ${keywords.join(', ')}. Routine response appropriate.`;
}

function generateSummary(text: string, category: string, severity: Severity): string {
  const rule = CATEGORY_RULES[category];
  const catLabel = rule?.label ?? 'Civic issue';

  let prefix: string;
  if (severity === 'critical') prefix = 'Critical situation detected';
  else if (severity === 'high') prefix = 'Significant issue identified';
  else if (severity === 'medium') prefix = `${catLabel} identified`;
  else prefix = `${catLabel} noted`;

  const sentences = text.replace(/;/g, '.').split('.').filter((s) => s.trim().length > 10);
  if (sentences.length > 0) {
    let detail = sentences[0].trim();
    detail = detail.charAt(0).toUpperCase() + detail.slice(1);
    if (!detail.endsWith('.')) detail += '.';
    return `${prefix}. ${detail}`;
  }
  return `${prefix}. Based on your description.`;
}

// ── Main Engine ───────────────────────────────────────────────────

/**
 * Analyze a civic issue description using deterministic rules.
 * Returns a structured civic assessment — no AI model involved.
 */
export function analyzeCivicIssue(text: string): CivicAssessment {
  const category = detectCategory(text);
  const rule = CATEGORY_RULES[category];

  const signals = detectSignals(text);
  const totalScore = signals.reduce((acc, [, w]) => acc + w, 0);
  const severity = severityFromScore(totalScore);
  const confidence = calculateConfidence(text, signals.length);

  const summary = generateSummary(text, category, severity);
  const urgency = urgencyReason(severity, signals);

  const impacts = rule?.impacts ?? [
    'Disruption to local civic services',
    'Impact on community quality of life',
    'Potential for issue escalation without intervention',
  ];

  const actions = rule?.actions ?? [
    'Inspect reported issue on site',
    'Assess scope and severity',
    'Dispatch relevant civic team',
  ];

  // Context-sensitive impact refinement
  const lower = text.toLowerCase();
  const refinedImpacts = [...impacts];
  if (lower.includes('school') || category === 'education') {
    refinedImpacts[1] = 'Safety risk for students and school operations';
  }
  if (lower.includes('main road') || lower.includes('highway')) {
    refinedImpacts[0] = 'Traffic disruption on affected road';
  }

  // Ripple effects
  const rippleEffects = [...(rule?.rippleEffects ?? ['Local services may experience disruption', 'Community quality of life could be affected', 'Issue may escalate without intervention'])];
  const hasEscalator = CONTEXT_ESCALATORS.some((kw) => lower.includes(kw));

  // Severity-based language adjustment for low severity
  if (severity === 'low') {
    for (let i = 0; i < rippleEffects.length; i++) {
      rippleEffects[i] = rippleEffects[i]
        .replace('may be disrupted', 'may be briefly affected')
        .replace('could be delayed', 'could see minor delays')
        .replace('may be affected', 'may see minor impact');
    }
  }

  let impactLevel: ImpactLevel;
  const highWeightCount = signals.filter(([, w]) => w >= 2).length;
  if (severity === 'critical') impactLevel = 'high';
  else if (severity === 'high' || highWeightCount >= 2 || hasEscalator) impactLevel = 'high';
  else if (severity === 'medium') impactLevel = 'medium';
  else impactLevel = 'low';

  return {
    category,
    categoryLabel: rule?.label ?? 'Civic infrastructure issue',
    severity,
    confidence,
    summary,
    potentialImpacts: refinedImpacts.slice(0, 3),
    recommendedActions: actions.slice(0, 3),
    urgencyReason: urgency,
    rippleTrigger: rule?.rippleTrigger ?? 'Civic issue reported',
    rippleEffects: rippleEffects.slice(0, 3),
    rippleOverallImpact: rule?.rippleOverall ?? 'Potential impact on local civic services and community wellbeing',
    rippleImpactLevel: impactLevel,
  };
}
