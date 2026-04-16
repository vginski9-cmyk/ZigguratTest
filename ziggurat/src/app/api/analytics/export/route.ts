import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enrichedProfiles, jobDescriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Papa from "papaparse";
import ExcelJS from "exceljs";

export async function GET(req: NextRequest) {
  try {
    const format = req.nextUrl.searchParams.get("format") || "csv";
    const filterField = req.nextUrl.searchParams.get("filterField");
    const filterValue = req.nextUrl.searchParams.get("filterValue");

    // Load and flatten all data
    const profiles = db.select().from(enrichedProfiles).all();
    const rows: Record<string, unknown>[] = [];

    for (const profile of profiles) {
      const jd = db
        .select()
        .from(jobDescriptions)
        .where(eq(jobDescriptions.id, profile.jdId))
        .get();

      let skillData: { skills?: Array<Record<string, unknown>>; meta?: Record<string, unknown> };
      try {
        skillData = JSON.parse(profile.skillData);
      } catch {
        continue;
      }

      const skills = skillData?.skills || [];

      for (const skill of skills) {
        const row: Record<string, unknown> = {
          profile_id: profile.id,
          job_title: jd?.jobTitle || (skillData?.meta?.role_title as string) || "",
          company: jd?.company || (skillData?.meta?.employer as string) || "",
          location: jd?.location || "",
          onet_code: jd?.onetCode || "",
          overall_confidence: profile.overallConfidence,
          profile_status: profile.status,
          skill_name: skill.skill_name,
          category: skill.bgt_category,
          criticality: skill.criticality,
          required_level: skill.required_level,
          label: skill.label,
          seed_status: skill.seed_status || "",
          provenance_state: (skill.provenance as Record<string, unknown>)?.state || "",
          provenance_confidence: (skill.provenance as Record<string, unknown>)?.confidence || "",
          definition: skill.definition,
          how_utilized: skill.how_utilized,
          knowledge_domain: skill.knowledge_domain,
          credential_level: skill.credential_level,
          partnership_rating: (skill.partnership as Record<string, unknown>)?.rating || "",
        };

        // Apply filter if specified
        if (filterField && filterValue) {
          const val = String(row[filterField] || "").toLowerCase();
          if (!val.includes(filterValue.toLowerCase())) continue;
        }

        rows.push(row);
      }
    }

    if (format === "json") {
      return NextResponse.json(rows, {
        headers: {
          "Content-Disposition": `attachment; filename="ziggurat-export-${Date.now()}.json"`,
        },
      });
    }

    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Skills Data");

      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        sheet.columns = columns.map((key) => ({
          header: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          key,
          width: 20,
        }));

        // Style header row
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1a2744" },
        };
        sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

        for (const row of rows) {
          sheet.addRow(row);
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(buffer as ArrayBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="ziggurat-export-${Date.now()}.xlsx"`,
        },
      });
    }

    // Default: CSV
    const csv = Papa.unparse(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="ziggurat-export-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error("[export] Error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
