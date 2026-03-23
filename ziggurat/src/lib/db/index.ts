import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const dbPath = path.join(process.cwd(), "ziggurat.db");
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent performance
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

// Initialize tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS job_descriptions (
    id TEXT PRIMARY KEY,
    raw_text TEXT NOT NULL,
    source_url TEXT,
    text_hash TEXT NOT NULL,
    submitted_by TEXT,
    submitted_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS employers (
    id TEXT PRIMARY KEY,
    legal_name TEXT NOT NULL,
    trade_name TEXT,
    hq_zip TEXT,
    context_layers TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS ejcp_versions (
    id TEXT PRIMARY KEY,
    jd_id TEXT NOT NULL REFERENCES job_descriptions(id),
    employer_id TEXT REFERENCES employers(id),
    version INTEGER NOT NULL DEFAULT 1,
    data TEXT NOT NULL,
    validation_status TEXT NOT NULL DEFAULT 'draft',
    agent_version TEXT,
    reviewer_id TEXT,
    reviewed_at TEXT,
    change_diff TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS skill_profiles (
    id TEXT PRIMARY KEY,
    ejcp_id TEXT NOT NULL REFERENCES ejcp_versions(id),
    version INTEGER NOT NULL DEFAULT 1,
    data TEXT NOT NULL,
    validation_status TEXT NOT NULL DEFAULT 'draft',
    agent_version TEXT,
    reviewer_id TEXT,
    reviewed_at TEXT,
    change_diff TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS skill_reviews (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES skill_profiles(id),
    skill_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewer_id TEXT,
    notes TEXT,
    reviewed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS review_queue (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    gate TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    assigned_to TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT
  );
`);
