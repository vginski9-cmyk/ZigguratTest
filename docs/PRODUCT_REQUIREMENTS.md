# Ziggurat: Job-to-Skill Profile Pipeline
## Product Requirements Document

---

## 1. Vision

Ziggurat is a three-agent pipeline that transforms raw job descriptions into
deeply contextualized, standardized skill profiles that map 1:1 to education
programs. The system produces "absurdly actionable" outputs — not vague skill
lists, but enriched profiles with half-life, learning curves, proficiency
timelines, volatility scores, and direct education program mappings.

The name reflects the architecture: each layer builds on the one below it,
producing progressively richer and more structured output.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ZIGGURAT PIPELINE                            │
│                                                                     │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐       │
│  │   AGENT 1     │    │   AGENT 2     │    │   AGENT 3     │       │
│  │   Context     │───▶│   Skill       │───▶│   Education   │       │
│  │   Enricher    │    │   Profiler    │    │   Mapper      │       │
│  └───────┬───────┘    └───────┬───────┘    └───────┬───────┘       │
│          │                    │                    │                │
│     ┌────▼────┐          ┌────▼────┐          ┌────▼────┐          │
│     │ HUMAN   │          │ HUMAN   │          │ HUMAN   │          │
│     │ REVIEW  │          │ REVIEW  │          │ REVIEW  │          │
│     └─────────┘          └─────────┘          └─────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Agent 1: Context Enricher
**Input:** Raw job description (text)
**Process:**
- Parses job description into structured components
- Asks clarifying questions to fill gaps
- Maps role to context layers (industry, company maturity, team structure, etc.)
- Identifies implicit skills not stated in the JD
- Flags ambiguities and assumptions

**Output:** Enriched Job Context Document (validated by human)

### Agent 2: Standardized Skill Profiler
**Input:** Validated Enriched Job Context Document
**Process:**
- Maps skills to BGI (Bureau of Global Intelligence) taxonomy rubric
- Pulls supplementary data from O*NET, ESCO, labor market signals
- Generates structured SKILL profiles per competency
- Tags each skill with metadata: half-life, learning curve, volatility,
  proficiency standards, time-to-proficiency
- Cross-references against industry benchmarks

**Output:** Tagged Skill Profile (validated by human)

### Agent 3: Education & Development Mapper
**Input:** Validated Tagged Skill Profile
**Process:**
- Maps each skill to baseline knowledge and ability requirements
- Recommends work-based learning modalities
- Generates education program alignment codes
- Produces 1:1 mapping between "what is needed" and "what is taught"
- Suggests talent development pathways and sequencing

**Output:** Education-Aligned Development Profile (validated by human)

---

## 3. Context Layers (Agent 1)

These are the dimensions along which every job description is contextualized:

| Layer | Description | Example Values |
|-------|-------------|----------------|
| **Industry Vertical** | Primary industry classification | Healthcare, FinTech, Manufacturing, EdTech |
| **Company Maturity** | Organizational lifecycle stage | Startup (<50), Scaleup (50-500), Enterprise (500+), Public Sector |
| **Team Structure** | How the role fits into org design | Solo contributor, Pod/squad, Matrix, Hierarchical |
| **Role Level** | Seniority and scope | Entry, Mid, Senior, Lead, Principal, Executive |
| **Geographic Context** | Location-driven factors | Remote-first, Hybrid, On-site, Multi-region |
| **Regulatory Environment** | Compliance requirements | HIPAA, SOX, GDPR, FERPA, FedRAMP, None |
| **Technology Ecosystem** | Core tech stack and tooling | Cloud-native, Legacy, Hybrid, Emerging |
| **Market Dynamics** | Competitive/talent landscape | Talent-scarce, Saturated, Emerging, Declining |
| **Budget/Resource Tier** | Resource constraints | Bootstrap, Growth-funded, Enterprise-budget |
| **Cultural Archetype** | Work culture signals | Move-fast, Process-heavy, Research-oriented, Mission-driven |
| **Role Criticality** | Business impact classification | Revenue-critical, Cost-center, Innovation, Compliance |
| **Automation Exposure** | AI/automation displacement risk | High, Medium, Low, Augmented |

---

## 4. Skill Profile Schema (Agent 2)

Each skill in the profile carries the following metadata:

| Field | Type | Description |
|-------|------|-------------|
| `skill_id` | string | Unique identifier (BGI taxonomy code) |
| `skill_name` | string | Human-readable skill name |
| `skill_category` | enum | Technical, Interpersonal, Cognitive, Domain-Specific |
| `bgi_taxonomy_code` | string | BGI classification code |
| `onet_crosswalk` | string | O*NET SOC code mapping |
| `esco_crosswalk` | string | ESCO skill URI mapping |
| `proficiency_level_required` | 1-5 | Target proficiency (Novice to Expert) |
| `proficiency_standard` | string | Observable behavior at target level |
| `skill_half_life` | string | Estimated time before skill needs refresh (e.g., "18 months") |
| `learning_curve` | enum | Steep, Moderate, Gradual, Plateau-then-steep |
| `time_to_proficiency` | string | Estimated hours/months to reach target level |
| `volatility` | enum | Stable, Evolving, Volatile, Emerging |
| `volatility_drivers` | string[] | What drives change in this skill |
| `criticality_weight` | float | How critical to role success (0.0-1.0) |
| `dependency_skills` | string[] | Prerequisite skill_ids |
| `complementary_skills` | string[] | Skills that amplify this one |
| `assessment_methods` | string[] | How to evaluate this skill |
| `market_signal` | object | Demand trend, salary premium, posting frequency |

---

## 5. Education Mapping Schema (Agent 3)

| Field | Type | Description |
|-------|------|-------------|
| `skill_id` | string | Links back to skill profile |
| `baseline_knowledge` | object[] | Required foundational knowledge areas |
| `baseline_abilities` | object[] | Cognitive/physical abilities needed |
| `preferred_learning_modes` | enum[] | Lecture, Lab, Project, Mentorship, Simulation, Self-directed |
| `work_based_learning` | object | Apprenticeship, Internship, OJT, Rotation |
| `education_program_code` | string | CIP code or institution-specific mapping |
| `curriculum_alignment` | object | Course → skill mapping with coverage % |
| `gap_analysis` | object | What the program teaches vs. what's needed |
| `development_sequence` | object | Recommended order of skill acquisition |
| `time_investment` | object | Hours by learning mode to reach proficiency |
| `certification_paths` | string[] | Relevant certifications |
| `continuing_ed_triggers` | string[] | When to refresh/upskill |

---

## 6. Human Validation Touchpoints

Each agent output passes through human review before proceeding:

### Validation 1 (Post-Agent 1)
- Confirm context layer assignments
- Answer clarifying questions the agent raised
- Add missing context the JD didn't capture
- Adjust implicit skill inferences

### Validation 2 (Post-Agent 2)
- Verify BGI taxonomy mappings
- Adjust proficiency levels and standards
- Confirm skill metadata (half-life, volatility, etc.)
- Add/remove skills the agent missed or hallucinated

### Validation 3 (Post-Agent 3)
- Verify education program mappings
- Adjust learning mode recommendations
- Confirm development sequencing
- Validate gap analysis accuracy

---

## 7. Key Design Principles

1. **Transparency over magic** — Every inference is explained and source-attributed
2. **Human-in-the-loop always** — AI proposes, humans validate
3. **Taxonomy-first** — Everything maps to established frameworks (BGI, O*NET, ESCO, CIP)
4. **Actionability over comprehensiveness** — Better to have 12 deeply tagged skills than 40 shallow ones
5. **Education-outcome alignment** — The final output must directly answer: "What should we teach, how, and in what order?"
6. **Versioned and auditable** — Every profile carries its provenance chain

---

## 8. Output Consumers

| Consumer | What They Need | Format |
|----------|---------------|--------|
| **Educators** | Curriculum alignment, gap analysis | Education-Aligned Profile |
| **Employers** | Validated skill requirements | Tagged Skill Profile |
| **Workforce Boards** | Labor market alignment | Aggregated profiles + market signals |
| **Learners** | Development pathways | Sequenced learning plans |
| **HR/Talent** | Job architecture alignment | Contextualized skill profiles |
