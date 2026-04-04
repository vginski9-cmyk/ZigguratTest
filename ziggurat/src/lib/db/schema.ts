import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const jobDescriptions = sqliteTable("job_descriptions", {
  id: text("id").primaryKey(),
  rawText: text("raw_text").notNull(),
  sourceUrl: text("source_url"),
  textHash: text("text_hash").notNull(),
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

export const ejcpVersions = sqliteTable("ejcp_versions", {
  id: text("id").primaryKey(),
  jdId: text("jd_id")
    .notNull()
    .references(() => jobDescriptions.id),
  employerId: text("employer_id").references(() => employers.id),
  version: integer("version").notNull().default(1),
  data: text("data").notNull(), // JSON
  validationStatus: text("validation_status").notNull().default("draft"),
  agentVersion: text("agent_version"),
  reviewerId: text("reviewer_id"),
  reviewedAt: text("reviewed_at"),
  changeDiff: text("change_diff"), // JSON
  createdAt: text("created_at").notNull(),
});

export const skillProfiles = sqliteTable("skill_profiles", {
  id: text("id").primaryKey(),
  ejcpId: text("ejcp_id")
    .notNull()
    .references(() => ejcpVersions.id),
  version: integer("version").notNull().default(1),
  data: text("data").notNull(), // JSON
  validationStatus: text("validation_status").notNull().default("draft"),
  agentVersion: text("agent_version"),
  reviewerId: text("reviewer_id"),
  reviewedAt: text("reviewed_at"),
  changeDiff: text("change_diff"), // JSON
  createdAt: text("created_at").notNull(),
});

export const skillReviews = sqliteTable("skill_reviews", {
  id: text("id").primaryKey(),
  profileId: text("profile_id")
    .notNull()
    .references(() => skillProfiles.id),
  skillId: text("skill_id").notNull(),
  status: text("status").notNull().default("pending"),
  reviewerId: text("reviewer_id"),
  notes: text("notes"),
  reviewedAt: text("reviewed_at"),
});

export const reviewQueue = sqliteTable("review_queue", {
  id: text("id").primaryKey(),
  entityType: text("entity_type").notNull(), // 'ejcp' | 'profile'
  entityId: text("entity_id").notNull(),
  gate: text("gate").notNull(), // 'gate1' | 'gate2'
  status: text("status").notNull().default("pending"),
  assignedTo: text("assigned_to"),
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at"),
});

export const reviewDrafts = sqliteTable("review_drafts", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull(),
  data: text("data").notNull(), // JSON
  skillReviews: text("skill_reviews").notNull(), // JSON
  savedAt: text("saved_at").notNull(),
});

export const batchJobs = sqliteTable("batch_jobs", {
  id: text("id").primaryKey(),
  status: text("status").notNull().default("pending"), // pending | processing | completed | failed
  totalCount: integer("total_count").notNull(),
  completedCount: integer("completed_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  mode: text("mode").notNull().default("auto"), // auto | reviewed
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
  ejcpId: text("ejcp_id"),
  profileId: text("profile_id"),
  status: text("status").notNull().default("pending"), // pending | agent1 | agent2 | completed | failed
  error: text("error"),
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at"),
});
