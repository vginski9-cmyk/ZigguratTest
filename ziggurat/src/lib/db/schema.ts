import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const jobDescriptions = sqliteTable("job_descriptions", {
  id: text("id").primaryKey(),
  rawText: text("raw_text").notNull(),
  sourceUrl: text("source_url"),
  textHash: text("text_hash").notNull(),
  jobTitle: text("job_title"),
  location: text("location"),
  onetCode: text("onet_code"),
  company: text("company"),
  seedSkills: text("seed_skills"), // JSON array of strings
  postingUrl: text("posting_url"),
  inputStatus: text("input_status"),
  submittedBy: text("submitted_by"),
  submittedAt: text("submitted_at").notNull(),
});

export const employers = sqliteTable("employers", {
  id: text("id").primaryKey(),
  legalName: text("legal_name").notNull(),
  tradeName: text("trade_name"),
  hqZip: text("hq_zip"),
  contextLayers: text("context_layers").notNull(), // JSON
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const enrichedProfiles = sqliteTable("enriched_profiles", {
  id: text("id").primaryKey(),
  jdId: text("jd_id")
    .notNull()
    .references(() => jobDescriptions.id),
  ejcpData: text("ejcp_data").notNull(), // JSON - full EJCP with provenance
  skillData: text("skill_data").notNull(), // JSON - full skill profile with provenance
  auditTrail: text("audit_trail"), // JSON - validator findings
  validatorOutput: text("validator_output"), // JSON - raw validator response
  status: text("status").notNull().default("processing"), // processing | validated | flagged | exported
  overallConfidence: integer("overall_confidence"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at"),
});

export const batchJobs = sqliteTable("batch_jobs", {
  id: text("id").primaryKey(),
  status: text("status").notNull().default("pending"), // pending | processing | completed | failed
  totalCount: integer("total_count").notNull(),
  completedCount: integer("completed_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  createdBy: text("created_by"),
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at"),
});

export const batchItems = sqliteTable("batch_items", {
  id: text("id").primaryKey(),
  batchId: text("batch_id")
    .notNull()
    .references(() => batchJobs.id),
  jdId: text("jd_id"),
  enrichedProfileId: text("enriched_profile_id"),
  status: text("status").notNull().default("pending"), // pending | researching | validating | completed | failed
  error: text("error"),
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at"),
});

export const savedQueries = sqliteTable("saved_queries", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  queryParams: text("query_params").notNull(), // JSON
  createdAt: text("created_at").notNull(),
});
