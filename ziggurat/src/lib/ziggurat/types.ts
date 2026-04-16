// ─── Provenance & Auditability ───

export type ProvenanceSource =
  | "JD_text"
  | "web_search"
  | "url_scrape"
  | "seed_input"
  | "inferred"
  | "onet_data"
  | "bls_data";

export type ProvenanceState = "confirmed" | "inferred" | "unknown";

export interface ProvenanceTag {
  state: ProvenanceState;
  confidence: number; // 0-100
  sources: ProvenanceSource[];
  evidence: string;
}

export interface ProvenancedField<T> {
  value: T;
  provenance: ProvenanceTag;
}

// ─── EJCP Types ───

export interface LayerClassification {
  values?: string[];
  value?: string;
  confidence: number;
  provenance: "extracted" | "inferred" | "unknown";
  evidence: string;
  narrative: string;
  sources?: ProvenanceSource[];
  [key: string]: unknown;
}

export interface CategoryNarrative {
  category: number;
  title: string;
  summary: string;
  analysis: string;
}

export interface EJCPData {
  ziggurat_id: string;
  source_jd_text: string;
  source_jd_hash: string;
  source_url?: string;
  processing_agent: string;
  processing_timestamp: string;
  validation_status: string;
  category_narratives: CategoryNarrative[];
  layers: Record<string, LayerClassification>;
  extracted_skills_raw: string[];
  inferred_skills: InferredSkill[];
  clarifying_questions: ClarifyingQuestion[];
  enrichment_notes: string;
}

export interface InferredSkill {
  skill: string;
  confidence: number;
  reason: string;
}

export interface ClarifyingQuestion {
  layer: string;
  priority: "high" | "medium" | "low";
  question: string;
  impact: string;
}

// ─── Skill Types ───

export interface SkillEntry {
  skill_id: string;
  skill_name: string;
  bgt_category: string;
  label: string;
  criticality: "must_have" | "important" | "nice_to_have" | "contextual";
  required_level: 1 | 2 | 3;
  definition: string;
  how_utilized: string;
  proficiency_L1: string;
  proficiency_L2: string;
  proficiency_L3: string;
  knowledge_domain: string;
  knowledge_level: string;
  equivalent_coursework: string;
  assessment_indicator: string;
  abilities_cognitive: string;
  abilities_communication: string;
  abilities_dispositional: string;
  learning_modes: LearningMode[];
  cip_primary: string;
  cip_secondary: string[];
  credential_level: string;
  credit_hours: string;
  experiential_hours: string;
  assessment_type: string;
  bloom_target: string;
  program_fit: string[];
  refresh_cadence: string;
  partnership: {
    rating: "high" | "moderate" | "low" | "not_viable";
    text: string;
  };
  adjustment_rationale: string;
  source_evidence: string[];
  // Provenance fields for the new pipeline
  seed_status?: "confirmed" | "expanded" | "rejected" | "new";
  provenance?: ProvenanceTag;
}

export interface LearningMode {
  mode: string;
  rank: number;
  why: string;
}

export interface SkillProfileData {
  meta: {
    source_ejcp_id: string;
    role_title: string;
    employer: string;
    location: string;
    soc_code: string;
    onet_code: string;
    processing_agent: string;
    processing_timestamp: string;
    validation_status: string;
    total_skills: number;
  };
  ziggurat_context_summary: {
    key_layers: { layer: string; value: string; note: string }[];
  };
  skills: SkillEntry[];
  brief: {
    for_business: string;
    for_learner: string;
    for_educator: string;
  };
}

// ─── Enriched Profile (new unified output) ───

export interface EnrichedProfile {
  ejcp: EJCPData;
  skills: SkillProfileData;
  seed_skill_results: SeedSkillResult[];
}

export interface SeedSkillResult {
  original_name: string;
  normalized_name: string | null;
  status: "confirmed" | "expanded" | "rejected";
  reason: string;
  matched_skill_id: string | null;
}

// ─── Audit Trail ───

export interface AuditTrail {
  confirmed_items: AuditItem[];
  inferred_fixes: InferredFix[];
  flagged_for_review: FlaggedItem[];
  overall_confidence: number;
  summary: string;
}

export interface AuditItem {
  field: string;
  value: string;
  source: string;
}

export interface InferredFix {
  field: string;
  old_value: string;
  new_value: string;
  reason: string;
  confidence: number;
}

export interface FlaggedItem {
  field: string;
  issue: string;
  severity: "high" | "medium" | "low";
  suggestion: string;
}

// ─── Ingestion ───

export interface ParsedJDRow {
  status: string;
  jobTitle: string;
  location: string;
  onetCode: string;
  company: string;
  skills: string;
  postingUrl: string;
  jobDescription: string;
}

export interface ParseError {
  row: number;
  field: string;
  message: string;
}

// ─── Analytics / Query ───

export interface QueryParams {
  filters: Record<string, string | string[] | number>;
  groupBy: string[];
  aggregation: "count" | "avg_confidence" | "list";
  sortBy?: string;
  sortDir?: "asc" | "desc";
  limit?: number;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  totalCount: number;
  groupCounts?: Record<string, number>;
}
