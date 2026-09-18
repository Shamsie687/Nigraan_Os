# NigraanOS — Product Architecture

## Vision

NigraanOS is an AI-powered civic intelligence platform that transforms how civic problems in Pakistan are reported, understood, prioritized, and resolved. It turns individual citizen reports into actionable, verified civic intelligence.

## Core Lifecycle

The platform processes civic incidents through seven stages:

```
Sense → Understand → Connect → Predict → Prioritize → Act → Verify
```

### 1. Sense

**Capture civic problems from citizens through multiple input channels.**

- Voice reports (Urdu, regional languages)
- Photo and video evidence
- Text descriptions
- GPS location (automatic with consent)
- Structured categories (water, roads, electricity, sanitation, etc.)

The goal is to make reporting as accessible as possible — a citizen should be able to report a problem in under 30 seconds, in their preferred language, using whatever medium is available.

### 2. Understand

**Use AI to analyze and classify each report.**

- Extract structured information from unstructured input (text from voice, objects from photos, damage severity from video).
- Classify the incident category (water supply, road damage, sewage overflow, etc.).
- Assess initial severity (LOW, MEDIUM, HIGH, CRITICAL).
- Identify affected population estimate.
- Flag potential duplicates.

AI understanding is always treated as a preliminary assessment — never as a final determination.

### 3. Connect

**Link related incidents to reveal patterns and systemic issues.**

- Cluster incidents by geographic proximity and category.
- Identify recurring problems in the same area.
- Connect upstream causes to downstream effects (e.g., broken water main → multiple flooding reports).
- Build a graph of related incidents over time.

Connecting incidents transforms isolated reports into systemic intelligence.

### 4. Predict

**Use historical patterns to anticipate emerging problems.**

- Identify areas at risk based on incident history and seasonal patterns.
- Detect escalation trends (a small leak becoming a major break).
- Forecast resource needs based on incident clusters.
- Alert authorities to emerging hotspots before they become crises.

Prediction outputs are advisory signals, not automated actions.

### 5. Prioritize

**Rank incidents by impact, urgency, and feasibility of resolution.**

Factors in prioritization:
- Severity and risk to human safety
- Number of affected citizens
- Duration of the problem
- Availability of resources to fix it
- Dependency on other unresolved incidents

Prioritization is transparent: the factors and weights are documented and reviewable.

### 6. Act

**Route prioritized incidents to responsible authorities and track response.**

- Assign incidents to the appropriate government department or utility.
- Provide structured briefs with all evidence and AI analysis.
- Track acknowledgment, assignment, and work progress.
- Enable communication between citizens and responders.
- Escalate overdue incidents automatically.

The platform facilitates action — it does not replace the responsible authorities.

### 7. Verify

**Confirm that problems are actually resolved, not just marked as resolved.**

- Citizens can verify or dispute resolution.
- Photo/video evidence of the fix is requested.
- AI can compare before/after media.
- Community verification: multiple citizens confirming resolution increases confidence.
- Unverified resolutions are flagged for follow-up.

Verification closes the loop and builds trust in the system.

---

## Status Distinctions

A fundamental principle of NigraanOS is that each stage of the incident lifecycle represents a distinct level of confidence and authority. These are NOT interchangeable:

| Status         | Meaning                                                        | Who sets it          |
|----------------|----------------------------------------------------------------|----------------------|
| **Reported**   | A citizen submitted a report. No validation has occurred.      | Citizen              |
| **AI Analyzed**| AI processed the report and assigned classification/severity.  | System (AI)          |
| **Corroborated**| Multiple independent reports or evidence support this issue.  | System (automatic)   |
| **Verified**   | A human authority or trusted agent confirmed the incident.     | Verifier / Authority |
| **In Progress**| A responsible body acknowledged and is actively working on it. | Authority            |
| **Resolved**   | The responsible body declares the issue fixed.                 | Authority            |
| **Verified Resolved** | Citizens or agents confirmed the fix on the ground.    | Citizen / Verifier   |
| **Rejected**   | The report was determined to be invalid, spam, or duplicate.   | Moderator / System   |

**Reported ≠ AI Analyzed ≠ Corroborated ≠ Verified ≠ Resolved.**

This distinction ensures that:
- Citizens always feel heard (their report is accepted regardless of AI opinion).
- AI outputs are advisory, not authoritative.
- Human verification is required for critical state transitions.
- The public can see the confidence level of each incident.
- Accountability is clear at every stage.

## Data Model (Conceptual)

```
Citizen ──reports──► Incident ──has──► Evidence (media)
                         │
                         ├── AI Analysis (classification, severity, risk)
                         ├── Related Incidents (connections)
                         ├── Status History (audit trail)
                         └── Response (authority assignment, progress, resolution)
```

## Platform Principles

1. **Accessibility first**: Voice and local language support are not afterthoughts.
2. **AI assists, humans decide**: No automated authority action without human oversight.
3. **Transparency**: Citizens see the status of their reports and the system's reasoning.
4. **Privacy by design**: Minimal data collection, protected identity, location fuzzing in public views.
5. **Accountability**: Every status change is auditable. Every AI output is logged.
6. **Offline resilience**: Reports can be drafted offline and submitted when connectivity returns.
7. **Incremental trust**: New users start with basic reporting. Verified contributors gain additional capabilities.
