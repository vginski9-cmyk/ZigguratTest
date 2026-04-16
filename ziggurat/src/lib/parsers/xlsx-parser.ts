import ExcelJS from "exceljs";
import type { ParsedJDRow, ParseError } from "../ziggurat/types";

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
  jobdescription: "jobDescription",
  description: "jobDescription",
  jd: "jobDescription",
};

function normalizeHeader(header: string): keyof ParsedJDRow | null {
  const cleaned = header.trim().toLowerCase().replace(/[_-]/g, " ");
  return COLUMN_MAP[cleaned] || null;
}

export async function parseXLSXBuffer(buffer: Buffer | ArrayBuffer): Promise<{
  rows: ParsedJDRow[];
  errors: ParseError[];
}> {
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return {
      rows: [],
      errors: [{ row: 0, field: "", message: "No worksheets found in file" }],
    };
  }

  const errors: ParseError[] = [];
  const headerRow = sheet.getRow(1);
  const headerMap: Record<number, keyof ParsedJDRow> = {};

  headerRow.eachCell((cell, colNumber) => {
    const headerText = String(cell.value || "").trim();
    const mapped = normalizeHeader(headerText);
    if (mapped) {
      headerMap[colNumber] = mapped;
    }
  });

  const mappedFields = new Set(Object.values(headerMap));
  if (!mappedFields.has("jobDescription")) {
    const headers: string[] = [];
    headerRow.eachCell((cell) => headers.push(String(cell.value || "")));
    errors.push({
      row: 0,
      field: "jobDescription",
      message:
        'Missing required column: "Job Description". Found: ' +
        headers.join(", "),
    });
  }

  const rows: ParsedJDRow[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const parsed: ParsedJDRow = {
      status: "",
      jobTitle: "",
      location: "",
      onetCode: "",
      company: "",
      skills: "",
      postingUrl: "",
      jobDescription: "",
    };

    row.eachCell((cell, colNumber) => {
      const field = headerMap[colNumber];
      if (field) {
        parsed[field] = String(cell.value || "").trim();
      }
    });

    if (!parsed.jobDescription || parsed.jobDescription.length < 20) {
      errors.push({
        row: rowNumber,
        field: "jobDescription",
        message: "Job description is missing or too short",
      });
      return;
    }

    rows.push(parsed);
  });

  return { rows, errors };
}
