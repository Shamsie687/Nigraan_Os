"""
Civic Intelligence Rules Engine — deterministic fallback for incident analysis.

When no external AI provider is configured, this module generates structured
civic intelligence assessments using transparent, category-aware rules.

This is NOT an AI model. It produces deterministic output based on keyword
analysis, description quality, and category-specific knowledge.
"""

from __future__ import annotations

from app.schemas.intelligence import IntelligenceRequest, IntelligenceResponse

# ── Severity Signals ──────────────────────────────────────────────
# Keywords found in title/description that signal urgency.
# Each carries a weight used to compute severity score.

SEVERITY_SIGNALS: dict[str, int] = {
    # Critical signals (weight 3)
    "emergency": 3,
    "ambulance": 3,
    "injured": 3,
    "trapped": 3,
    "fire": 3,
    "electrocution": 3,
    "electrocuted": 3,
    "death": 3,
    "collapsed": 3,
    "explosion": 3,
    # High signals (weight 2)
    "hospital": 2,
    "school": 2,
    "children": 2,
    "exposed wire": 2,
    "exposed electrical": 2,
    "electrical wire": 2,
    "dangerous": 2,
    "major flooding": 2,
    "blocked main road": 2,
    "blocked road": 2,
    "main road": 2,
    "multiple people": 2,
    "gas leak": 2,
    "contamination": 2,
    "sewage overflow": 2,
    "power outage": 2,
    "blackout": 2,
    "landslide": 2,
    "structural damage": 2,
    # Medium signals (weight 1)
    "leaking": 1,
    "leak": 1,
    "broken": 1,
    "damaged": 1,
    "blocked": 1,
    "overflow": 1,
    "crack": 1,
    "pothole": 1,
    "garbage": 1,
    "waste": 1,
    "smell": 1,
    "odor": 1,
    "flooding": 1,
    "flooded": 1,
    "no water": 1,
    "no electricity": 1,
    "no power": 1,
    "unsafe": 1,
    "hazardous": 1,
    "disruption": 1,
}

# ── Category Rules ────────────────────────────────────────────────

_CATEGORY_LABELS: dict[str, str] = {
    "water": "Water supply issue",
    "flooding": "Flooding incident",
    "roads": "Road infrastructure issue",
    "waste": "Waste management issue",
    "electricity": "Electrical infrastructure issue",
    "air_quality": "Air quality concern",
    "healthcare": "Healthcare access issue",
    "education": "Education infrastructure issue",
    "public_safety": "Public safety concern",
    "emergency": "Emergency situation",
    "other": "Civic infrastructure issue",
}

_CATEGORY_IMPACTS: dict[str, list[str]] = {
    "water": [
        "Water supply disruption for nearby residents",
        "Water wastage and increased utility costs",
        "Potential road flooding from continuous leakage",
    ],
    "flooding": [
        "Road inaccessibility for vehicles and pedestrians",
        "Property damage to nearby structures",
        "Health risks from stagnant water",
    ],
    "roads": [
        "Traffic disruption and delays",
        "Vehicle damage and accident risk",
        "Pedestrian safety hazard",
    ],
    "waste": [
        "Environmental contamination of surrounding area",
        "Health risks from accumulated waste",
        "Attraction of disease-carrying pests",
    ],
    "electricity": [
        "Power outage affecting households and businesses",
        "Electrical safety hazard for pedestrians",
        "Disruption to essential services",
    ],
    "air_quality": [
        "Respiratory health risks for nearby residents",
        "Reduced visibility affecting road safety",
        "Environmental impact on local area",
    ],
    "healthcare": [
        "Reduced access to medical services",
        "Delayed emergency response capability",
        "Impact on patients requiring regular treatment",
    ],
    "education": [
        "Disruption to student learning",
        "Safety risk for children and staff",
        "Damage to educational infrastructure",
    ],
    "public_safety": [
        "Risk to personal safety of residents",
        "Reduced community security",
        "Potential escalation without intervention",
    ],
    "emergency": [
        "Immediate threat to life and safety",
        "Infrastructure damage requiring urgent response",
        "Risk of escalation affecting wider area",
    ],
    "other": [
        "Disruption to local civic services",
        "Impact on community quality of life",
        "Potential for issue escalation without intervention",
    ],
}

_CATEGORY_ACTIONS: dict[str, list[str]] = {
    "water": [
        "Inspect leakage or supply disruption",
        "Assess affected area and population",
        "Dispatch water utility team",
    ],
    "flooding": [
        "Inspect drainage systems",
        "Assess road accessibility",
        "Dispatch drainage response team",
    ],
    "roads": [
        "Inspect road condition and extent of damage",
        "Secure hazardous area if necessary",
        "Dispatch road maintenance team",
    ],
    "waste": [
        "Inspect waste accumulation and source",
        "Assess environmental impact",
        "Dispatch waste management team",
    ],
    "electricity": [
        "Inspect electrical infrastructure",
        "Isolate dangerous equipment if required",
        "Dispatch utility response team",
    ],
    "air_quality": [
        "Identify pollution source",
        "Assess affected area and population",
        "Coordinate with environmental authorities",
    ],
    "healthcare": [
        "Assess impact on healthcare delivery",
        "Coordinate with health authorities",
        "Arrange interim medical provisions if needed",
    ],
    "education": [
        "Assess damage to school infrastructure",
        "Coordinate with education authorities",
        "Arrange alternative learning spaces if needed",
    ],
    "public_safety": [
        "Assess safety risk and affected area",
        "Coordinate with local authorities",
        "Implement interim safety measures",
    ],
    "emergency": [
        "Dispatch emergency response team immediately",
        "Secure affected area and evacuate if needed",
        "Coordinate with rescue and medical services",
    ],
    "other": [
        "Inspect reported issue on site",
        "Assess scope and severity",
        "Dispatch relevant civic team",
    ],
}

# ── Civic Ripple Chains ──────────────────────────────────────────
# Category-specific cascading consequence patterns.
# All effects use hedging language ("may", "could") to avoid stating
# inferred consequences as confirmed facts.

_RIPPLE_CHAINS: dict[str, dict] = {
    "roads": {
        "trigger": "Road issue reported",
        "effects": [
            "Traffic movement may be disrupted",
            "Emergency vehicle access could be delayed",
            "Wider area mobility may be affected",
        ],
        "overall": "Potential disruption to traffic flow and area accessibility",
    },
    "flooding": {
        "trigger": "Flooding reported",
        "effects": [
            "Road access may be restricted",
            "Emergency response times could increase",
            "Nearby services may become harder to reach",
        ],
        "overall": "Potential disruption to mobility and emergency access",
    },
    "water": {
        "trigger": "Water supply issue reported",
        "effects": [
            "Nearby households may be affected",
            "Sanitation and water access could be under pressure",
            "Wider community disruption may occur",
        ],
        "overall": "Potential impact on water access and community wellbeing",
    },
    "electricity": {
        "trigger": "Electrical issue reported",
        "effects": [
            "Traffic signals and businesses may be affected",
            "Essential services could face disruption",
            "Safety or economic impact may arise",
        ],
        "overall": "Potential disruption to electrical services and dependent infrastructure",
    },
    "waste": {
        "trigger": "Waste management issue reported",
        "effects": [
            "Sanitation conditions may deteriorate",
            "Pests, odor, or environmental impact could develop",
            "Neighborhood health concerns may arise",
        ],
        "overall": "Potential impact on local sanitation and neighborhood health",
    },
    "air_quality": {
        "trigger": "Air quality concern reported",
        "effects": [
            "Respiratory health risks may increase for nearby residents",
            "Visibility could affect road safety",
            "Environmental impact on the local area may occur",
        ],
        "overall": "Potential impact on public health and environmental quality",
    },
    "healthcare": {
        "trigger": "Healthcare issue reported",
        "effects": [
            "Patient waiting times may increase",
            "Emergency treatment capacity could be reduced",
            "Ongoing patient care may be affected",
        ],
        "overall": "Potential impact on healthcare delivery and patient access",
    },
    "education": {
        "trigger": "Education issue reported",
        "effects": [
            "Student attendance may be disrupted",
            "Learning continuity could be affected",
            "School infrastructure and safety may require attention",
        ],
        "overall": "Potential impact on student learning and school operations",
    },
    "public_safety": {
        "trigger": "Public safety concern reported",
        "effects": [
            "Personal safety of residents may be at risk",
            "Community security could be reduced",
            "Issue may escalate without intervention",
        ],
        "overall": "Potential impact on community safety and security",
    },
    "emergency": {
        "trigger": "Emergency situation reported",
        "effects": [
            "Immediate safety risk for people in the area",
            "Emergency response resources may be diverted",
            "Surrounding areas could be affected",
        ],
        "overall": "Potential for significant impact on public safety and emergency services",
    },
    "other": {
        "trigger": "Civic issue reported",
        "effects": [
            "Local services may experience disruption",
            "Community quality of life could be affected",
            "Issue may escalate without intervention",
        ],
        "overall": "Potential impact on local civic services and community wellbeing",
    },
}

# Context keywords that escalate ripple severity
_CONTEXT_ESCALATORS: list[str] = [
    "hospital",
    "emergency",
    "ambulance",
    "school",
    "children",
    "main road",
    "elderly",
]

# ── Helpers ────────────────────────────────────────────────────────


def _detect_signals(title: str, description: str) -> list[tuple[str, int]]:
    """Find severity signal keywords in title and description."""
    text = f"{title} {description}".lower()
    found: list[tuple[str, int]] = []
    for keyword, weight in SEVERITY_SIGNALS.items():
        if keyword in text:
            found.append((keyword, weight))
    return found


def _severity_from_score(total_score: int) -> str:
    """Map severity signal score to severity level."""
    if total_score >= 6:
        return "critical"
    if total_score >= 3:
        return "high"
    if total_score >= 1:
        return "medium"
    return "low"


def _urgency_reason(severity: str, signals: list[tuple[str, int]]) -> str:
    """Generate a human-readable urgency reason."""
    if not signals:
        return "No immediate danger indicators detected in the report"

    top_signals = sorted(signals, key=lambda s: s[1], reverse=True)[:3]
    keywords = [s[0].replace("_", " ") for s in top_signals]

    if severity == "critical":
        return (
            f"Critical indicators detected: {', '.join(keywords)}. "
            "Immediate attention required."
        )
    if severity == "high":
        return (
            f"Elevated risk indicators: {', '.join(keywords)}. "
            "Prompt response recommended."
        )
    if severity == "medium":
        return (
            f"Moderate concern indicators: {', '.join(keywords)}. "
            "Standard response timeline."
        )
    return (
        f"Low-level concern indicators: {', '.join(keywords)}. "
        "Routine response appropriate."
    )


def _calculate_confidence(
    description: str,
    signals: list[tuple[str, int]],
    latitude: float,
    longitude: float,
) -> int:
    """Calculate deterministic confidence from information quality.

    Factors:
    - Description length: more detail = more confident (up to 40 points)
    - Signal detection: signals found = more confident (up to 20 points)
    - Location availability: valid coords = +15 points
    - Description structure: multiple sentences = +10 points
    - Base confidence: 15 points
    """
    score = 15  # base

    # Description length (0-40)
    desc_len = len(description.strip())
    if desc_len > 200:
        score += 40
    elif desc_len > 100:
        score += 30
    elif desc_len > 50:
        score += 20
    elif desc_len > 20:
        score += 10

    # Signals detected (0-20)
    signal_count = len(signals)
    score += min(signal_count * 5, 20)

    # Location available (0-15)
    if latitude != 0 and longitude != 0:
        score += 15

    # Description structure (0-10)
    sentences = [s.strip() for s in description.replace(";", ".").split(".") if s.strip()]
    if len(sentences) >= 3:
        score += 10
    elif len(sentences) >= 2:
        score += 5

    return min(score, 95)  # Cap at 95 — rules engine is never 100% certain


def _generate_summary(
    title: str, description: str, category: str, severity: str
) -> str:
    """Generate a concise summary from the report data."""
    cat_label = _CATEGORY_LABELS.get(category, "Civic issue")

    # Build summary based on severity
    if severity == "critical":
        prefix = "Critical situation reported"
    elif severity == "high":
        prefix = "Significant issue detected"
    elif severity == "medium":
        prefix = f"{cat_label} identified"
    else:
        prefix = f"{cat_label} reported"

    # Use first meaningful sentence from description
    sentences = [
        s.strip()
        for s in description.replace(";", ".").split(".")
        if len(s.strip()) > 10
    ]

    if sentences:
        detail = sentences[0]
        # Capitalize first letter
        detail = detail[0].upper() + detail[1:] if detail else ""
        if not detail.endswith("."):
            detail += "."
        return f"{prefix}. {detail}"

    # Fallback: use title
    return f"{prefix}. {title}."


def _refine_impacts(
    category: str, signals: list[tuple[str, int]], severity: str
) -> list[str]:
    """Select and refine impacts based on category and detected signals."""
    base_impacts = _CATEGORY_IMPACTS.get(category, _CATEGORY_IMPACTS["other"])
    text_signals = {s[0] for s in signals}

    # If school-related context (school keyword or education category)
    has_school_context = (
        "school" in text_signals or category == "education"
    )
    if has_school_context:
        school_impact = "Safety risk for students and school operations"
        return [base_impacts[0], school_impact, base_impacts[2]]

    # If main road signal, prioritize traffic impact
    if any(s in text_signals for s in ("blocked main road", "blocked road", "main road")):
        return [
            "Traffic disruption on affected road",
            base_impacts[1] if len(base_impacts) > 1 else base_impacts[0],
            base_impacts[2] if len(base_impacts) > 2 else base_impacts[0],
        ]

    return base_impacts[:3]


# ── Ripple Engine ────────────────────────────────────────────


def _generate_ripple(
    category: str,
    title: str,
    description: str,
    severity: str,
    signals: list[tuple[str, int]],
) -> dict:
    """Generate a civic ripple chain from the incident context.

    Returns a dict with:
    - trigger: the reported issue
    - effects: max 3 sequential potential consequences
    - overall_impact: summary of wider civic impact
    - impact_level: low / medium / high
    """
    text = f"{title} {description}".lower()
    chain = _RIPPLE_CHAINS.get(category, _RIPPLE_CHAINS["other"])

    trigger = chain["trigger"]
    effects = list(chain["effects"])
    overall = chain["overall"]

    # ── Context-sensitive refinements ─────────────────────

    # Hospital / emergency entrance context → strengthen accessibility effect
    if any(kw in text for kw in ("hospital", "emergency entrance", "clinic")):
        effects[0] = "Access to medical and emergency services may be affected"

    # School context → add education-specific ripple
    if "school" in text or category == "education":
        if category not in ("education", "emergency"):
            effects[1] = "Nearby schools and children could be at risk"

    # Main road / heavy traffic context → strengthen traffic effect
    if any(kw in text for kw in ("main road", "highway", "major road", "busy road")):
        effects[0] = "Traffic on a major route may be significantly disrupted"

    # ── Severity-based language adjustment ────────────────
    if severity == "low":
        # Soften language for minor incidents
        effects = [
            e.replace("may be disrupted", "may be briefly affected")
            .replace("could be delayed", "could see minor delays")
            .replace("may be affected", "may see minor impact")
            .replace("could be reduced", "could be slightly affected")
            for e in effects
        ]

    # ── Determine impact level ────────────────────────────
    high_weight_count = sum(1 for _, w in signals if w >= 2)
    has_escalator = any(kw in text for kw in _CONTEXT_ESCALATORS)

    if severity == "critical":
        impact_level = "high"
    elif severity == "high" or high_weight_count >= 2 or has_escalator:
        impact_level = "high"
    elif severity == "medium":
        impact_level = "medium"
    else:
        impact_level = "low"

    return {
        "trigger": trigger,
        "effects": effects[:3],
        "overall_impact": overall,
        "impact_level": impact_level,
    }


# ── Main Engine ────────────────────────────────────────────────────


def analyze_with_rules(request: IntelligenceRequest) -> IntelligenceResponse:
    """Generate structured civic assessment using deterministic rules.

    This is a transparent, category-aware rules engine that produces
    useful civic intelligence without requiring an external AI provider.
    """
    title = request.title
    description = request.description
    category = request.category

    # 1. Detect severity signals
    signals = _detect_signals(title, description)
    total_score = sum(weight for _, weight in signals)

    # 2. Determine severity
    severity = _severity_from_score(total_score)

    # 3. Calculate confidence from information quality
    confidence = _calculate_confidence(
        description, signals, request.latitude, request.longitude
    )

    # 4. Generate summary
    summary = _generate_summary(title, description, category, severity)

    # 5. Get incident type
    incident_type = _CATEGORY_LABELS.get(category, "Civic infrastructure issue")

    # 6. Get impacts (refined by signals)
    impacts = _refine_impacts(category, signals, severity)

    # 7. Get recommended actions
    actions = _CATEGORY_ACTIONS.get(category, _CATEGORY_ACTIONS["other"])[:3]

    # 8. Generate urgency reason
    urgency = _urgency_reason(severity, signals)

    # 9. Generate civic ripple chain
    ripple = _generate_ripple(category, title, description, severity, signals)

    return IntelligenceResponse(
        available=True,
        source="rules_engine",
        summary=summary,
        incident_type=incident_type,
        severity=severity,
        confidence=confidence,
        potential_impacts=impacts,
        recommended_actions=actions,
        urgency_reason=urgency,
        needs_verification=True,
        ripple_trigger=ripple["trigger"],
        ripple_effects=ripple["effects"],
        ripple_overall_impact=ripple["overall_impact"],
        ripple_impact_level=ripple["impact_level"],
        status="success",
    )
