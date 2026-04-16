import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobDescriptions, batchJobs, batchItems } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { createHash } from "crypto";
import { parseCSVText, parseTabSeparated, parseSeedSkills } from "@/lib/parsers/csv-parser";
import { parseXLSXBuffer } from "@/lib/parsers/xlsx-parser";
import type { ParsedJDRow } from "@/lib/ziggurat/types";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let rows: ParsedJDRow[] = [];
    let parseErrors: { row: number; field: string; message: string }[] = [];

    if (contentType.includes("multipart/form-data")) {
      // File upload (CSV or XLSX)
      const formData = await req.formData();
      const file = formData.get("file") as File;
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const fileName = file.name.toLowerCase();
      if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await parseXLSXBuffer(buffer);
        rows = result.rows;
        parseErrors = result.errors;
      } else {
        const text = await file.text();
        const result = parseCSVText(text);
        rows = result.rows;
        parseErrors = result.errors;
      }
    } else {
      // JSON body with pasted text
      const body = await req.json();
      const { data, format } = body as { data: string; format: string };

      if (!data) {
        return NextResponse.json({ error: "No data provided" }, { status: 400 });
      }

      if (format === "csv") {
        const result = parseCSVText(data);
        rows = result.rows;
        parseErrors = result.errors;
      } else {
        const result = parseTabSeparated(data);
        rows = result.rows;
        parseErrors = result.errors;
      }
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found", parseErrors },
        { status: 400 }
      );
    }

    // Create batch job
    const batchId = uuid();
    const now = new Date().toISOString();

    db.insert(batchJobs).values({
      id: batchId,
      status: "pending",
      totalCount: rows.length,
      completedCount: 0,
      failedCount: 0,
      createdAt: now,
    }).run();

    // Create JD records and batch items
    const items: { jdId: string; itemId: string }[] = [];

    for (const row of rows) {
      const jdId = uuid();
      const itemId = uuid();
      const textHash = createHash("sha256")
        .update(row.jobDescription)
        .digest("hex");
      const seedSkills = parseSeedSkills(row.skills);

      db.insert(jobDescriptions).values({
        id: jdId,
        rawText: row.jobDescription,
        textHash,
        jobTitle: row.jobTitle || null,
        location: row.location || null,
        onetCode: row.onetCode || null,
        company: row.company || null,
        seedSkills: JSON.stringify(seedSkills),
        postingUrl: row.postingUrl || null,
        inputStatus: row.status || null,
        submittedAt: now,
      }).run();

      db.insert(batchItems).values({
        id: itemId,
        batchId,
        jdId,
        status: "pending",
        createdAt: now,
      }).run();

      items.push({ jdId, itemId });
    }

    return NextResponse.json({
      batchId,
      itemCount: rows.length,
      parseErrors: parseErrors.length > 0 ? parseErrors : undefined,
      items,
    });
  } catch (error) {
    console.error("[ingest] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ingestion failed" },
      { status: 500 }
    );
  }
}
