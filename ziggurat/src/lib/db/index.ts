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
    job_title TEXT,
    location TEXT,
    onet_code TEXT,
    company TEXT,
    seed_skills TEXT,
    posting_url TEXT,
    input_status TEXT,
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
  CREATE TABLE IF NOT EXISTS enriched_profiles (
    id TEXT PRIMARY KEY,
    jd_id TEXT NOT NULL REFERENCES job_descriptions(id),
    ejcp_data TEXT NOT NULL,
    skill_data TEXT NOT NULL,
    audit_trail TEXT,
    validator_output TEXT,
    status TEXT NOT NULL DEFAULT 'processing',
    overall_confidence INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT
  );
  CREATE TABLE IF NOT EXISTS batch_jobs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'pending',
    total_count INTEGER NOT NULL,
    completed_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    created_by TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS batch_items (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batch_jobs(id),
    jd_id TEXT,
    enriched_profile_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS saved_queries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    query_params TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);
