import Papa from "papaparse";
import type { ParsedJDRow, ParseError } from "../ziggurat/types";

// Expected column headers (case-insensitive, fuzzy matching)
const COLUMN_MAP: Record<string, keyof ParsedJDRow> = {
  status: "status",
  "job title": "jobTitle",
  jobtitle: "jobTitle",
  title: "jobTitle",
  location: "location",
  "o*net code": "onetCode",
  "onet code": "onetCode",
  onet: "onetCode",
  "o*net": "onetCode",
  company: "company",
  employer: "company",
  skills: "skills",
  "link to live job posting": "postingUrl",
  link: "postingUrl",
  url: "postingUrl",
  "posting url": "postingUrl",
  "job description": "jobDescription",
  "jobdescription": "jobDescription",
  description: "jobDescription",
  jd: "jobDescription",
};

function normalizeHeader(header: string): keyof ParsedJDRow | null {
  const cleaned = header.trim().toLowerCase().replace(/[_-]/g, " ");
  return COLUMN_MAP[cleaned] || null;
}

export function parseCSVText(text: string): {
  rows: ParsedJDRow[];
  errors: ParseError[];
} {
  // Auto-detect delimiter: tab, comma, or pipe
  const firstLine = text.split("\n")[0] || "";
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const pipeCount = (firstLine.match(/\|/g) || []).length;
  const delimiter = tabCount >= commaCount && tabCount >= pipeCount ? "\t"
    : pipeCount > commaCount ? "|" : ",";

  const result = Papa.parse(text, {
    header: true,
    delimiter,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  return processRows(result.data as Record<string, string>[], result.meta.fields || []);
}

export function parseTabSeparated(text: string): {
  rows: ParsedJDRow[];
  errors: ParseError[];
} {
  return parseCSVText(text);
}

function processRows(
  data: Record<string, string>[],
  fields: string[]
): { rows: ParsedJDRow[]; errors: ParseError[] } {
  const errors: ParseError[] = [];

  // Map headers to our schema
  const headerMap: Record<string, keyof ParsedJDRow> = {};
  for (const field of fields) {
    const mapped = normalizeHeader(field);
    if (mapped) {
      headerMap[field] = mapped;
    }
  }

  // Check required columns
  const mappedFields = new Set(Object.values(headerMap));
  if (!mappedFields.has("jobDescription")) {
    errors.push({
      row: 0,
      field: "jobDescription",
      message:
        'Missing required column: "Job Description". Found columns: ' +
        fields.join(", "),
    });
  }

  const rows: ParsedJDRow[] = [];

  for (let i = 0; i < data.length; i++) {
    const rawRow = data[i];
    const row: ParsedJDRow = {
      status: "",
      jobTitle: "",
      location: "",
      onetCode: "",
      company: "",
      skills: "",
      postingUrl: "",
      jobDescription: "",
    };

    for (const [origField, mappedField] of Object.entries(headerMap)) {
      const value = rawRow[origField]?.trim() || "";
      row[mappedField] = value;
    }

    // Validate required fields
    if (!row.jobDescription || row.jobDescription.length < 20) {
      errors.push({
        row: i + 1,
        field: "jobDescription",
        message: "Job description is missing or too short (< 20 chars)",
      });
      continue;
    }

    if (!row.jobTitle) {
      errors.push({
        row: i + 1,
        field: "jobTitle",
        message: "Job title is missing (non-fatal, will proceed)",
      });
    }

    rows.push(row);
  }

  return { rows, errors };
}

export function parseSeedSkills(skillsString: string): string[] {
  if (!skillsString) return [];
  return skillsString
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
