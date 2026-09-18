/**
 * Intelligence Service — Mobile client for the backend AI endpoint.
 *
 * Sends incident data to POST /api/v1/intelligence and returns
 * structured civic intelligence. No AI secrets are stored on-device.
 *
 * Fallback: when the backend is unreachable, the deterministic on-device
 * rules engine (civic-rules.ts) is used so the user always sees an
 * assessment — labelled "rules_engine" for full transparency.
 */

import { apiClient } from '../api';
import { analyzeCivicIssue } from './civic-rules';

// ── Types ─────────────────────────────────────────────────────────

export interface IntelligenceRequest {
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
}

export interface IntelligenceResponse {
  available: boolean;
  source: 'rules_engine' | 'ai_model' | null;
  summary: string | null;
  incident_type: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical' | null;
  confidence: number | null;
  potential_impacts: string[];
  recommended_actions: string[];
  urgency_reason: string | null;
  needs_verification: boolean;
  ripple_trigger: string | null;
  ripple_effects: string[];
  ripple_overall_impact: string | null;
  ripple_impact_level: 'low' | 'medium' | 'high' | null;
  status: 'success' | 'unavailable' | 'error';
  error_message: string | null;
}

// ── Service Function ──────────────────────────────────────────────

/**
 * Request civic intelligence analysis for an incident.
 *
 * Calls the backend intelligence endpoint. The backend handles the AI
 * provider call and returns structured results. If the backend is
 * unreachable, falls back to the on-device deterministic rules engine
 * (civic-rules.ts) — labelled source='rules_engine' for transparency.
 */
export async function analyzeIncident(
  request: IntelligenceRequest
): Promise<IntelligenceResponse> {
  try {
    const response = await apiClient.post<IntelligenceResponse>(
      '/intelligence',
      request
    );
    return response;
  } catch (e) {
    // Backend unreachable — fall back to on-device deterministic rules engine.
    // This ensures the user always sees an assessment, even offline.
    try {
      const text = `${request.title}. ${request.description}`;
      const assessment = analyzeCivicIssue(text);

      return {
        available: true,
        source: 'rules_engine' as const,
        summary: assessment.summary,
        incident_type: assessment.categoryLabel,
        severity: assessment.severity,
        confidence: assessment.confidence,
        potential_impacts: assessment.potentialImpacts,
        recommended_actions: assessment.recommendedActions,
        urgency_reason: assessment.urgencyReason,
        needs_verification: true,
        ripple_trigger: assessment.rippleTrigger,
        ripple_effects: assessment.rippleEffects,
        ripple_overall_impact: assessment.rippleOverallImpact,
        ripple_impact_level: assessment.rippleImpactLevel,
        status: 'success' as const,
        error_message: null,
      };
    } catch (fallbackError) {
      // Rules engine also failed — return error state.
      return {
        available: false,
        source: null,
        summary: null,
        incident_type: null,
        severity: null,
        confidence: null,
        potential_impacts: [],
        recommended_actions: [],
        urgency_reason: null,
        needs_verification: true,
        ripple_trigger: null,
        ripple_effects: [],
        ripple_overall_impact: null,
        ripple_impact_level: null,
        status: 'error' as const,
        error_message:
          fallbackError instanceof Error
            ? fallbackError.message
            : 'Failed to generate assessment',
      };
    }
  }
}
