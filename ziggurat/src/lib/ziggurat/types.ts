export interface LayerClassification {
  values?: string[];
  value?: string;
  confidence: number;
  provenance: "extracted" | "inferred" | "unknown";
  evidence: string;
  narrative: string;
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

export interface ReviewQueueItem {
  id: string;
  entityType: string;
  entityId: string;
  gate: string;
  status: string;
  assignedTo: string | null;
  createdAt: string;
  completedAt: string | null;
}
