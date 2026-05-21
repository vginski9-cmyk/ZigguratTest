import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enrichedProfiles, jobDescriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ZIGGURAT_LAYERS } from "@/lib/ziggurat/enums";
import Papa from "papaparse";
import ExcelJS from "exceljs";

interface FlatRow {
  [key: string]: string | number | null;
}

function loadAllFlatRows(filterField?: string, filterValue?: string): FlatRow[] {
  const profiles = db.select().from(enrichedProfiles).all();
  const rows: FlatRow[] = [];

  for (const profile of profiles) {
    const jd = db.select().from(jobDescriptions).where(eq(jobDescriptions.id, profile.jdId)).get();

    let skillData: { skills?: Array<Record<string, unknown>>; meta?: Record<string, unknown> };
    let ejcpData: { layers?: Record<string, Record<string, unknown>> };
    try { skillData = JSON.parse(profile.skillData); } catch { continue; }
    try { ejcpData = JSON.parse(profile.ejcpData); } catch { ejcpData = {}; }

    const layers = ejcpData?.layers || {};
    const skills = skillData?.skills || [];
    const meta = skillData?.meta || {};

    const ejcpFlat: Record<string, string | number | null> = {};
    for (const layerDef of ZIGGURAT_LAYERS) {
      const altKey = Object.keys(layers).find((k) => k.startsWith(layerDef.id));
      const ld = layers[layerDef.id] || (altKey ? layers[altKey] : null);
      if (ld) {
        ejcpFlat[`ejcp_${layerDef.id}_value`] = ld.value != null ? String(ld.value) : (ld.values as string[])?.join(", ") || null;
        ejcpFlat[`ejcp_${layerDef.id}_confidence`] = typeof ld.confidence === "number" ? ld.confidence : null;
      } else {
        ejcpFlat[`ejcp_${layerDef.id}_value`] = null;
        ejcpFlat[`ejcp_${layerDef.id}_confidence`] = null;
      }
    }

    for (const [key, val] of Object.entries(layers)) {
      const baseId = key.split("_")[0];
      if (baseId !== key && ejcpFlat[`ejcp_${baseId}_value`] == null) {
        const ld = val as Record<string, unknown>;
        ejcpFlat[`ejcp_${baseId}_value`] = ld.value != null ? String(ld.value) : (ld.values as string[])?.join(", ") || null;
        ejcpFlat[`ejcp_${baseId}_confidence`] = typeof ld.confidence === "number" ? (ld.confidence as number) : null;
      }
    }

    for (const skill of skills) {
      const provenance = (skill.provenance || {}) as Record<string, unknown>;
      const partnership = (skill.partnership || {}) as Record<string, unknown>;
      const learningModes = (skill.learning_modes || []) as Array<Record<string, unknown>>;

      const row: FlatRow = {
        profile_id: profile.id,
        profile_status: profile.status,
        overall_confidence: profile.overallConfidence || 0,
        job_title: jd?.jobTitle || (meta.role_title as string) || "",
        company: jd?.company || (meta.employer as string) || "",
        location: jd?.location || (meta.location as string) || "",
        onet_code: jd?.onetCode || (meta.onet_code as string) || "",
        skill_name: (skill.skill_name as string) || "",
        bgt_category: (skill.bgt_category as string) || "",
        label: (skill.label as string) || "",
        criticality: (skill.criticality as string) || "",
        required_level: (skill.required_level as number) || 0,
        definition: (skill.definition as string) || "",
        how_utilized: (skill.how_utilized as string) || "",
        knowledge_domain: (skill.knowledge_domain as string) || "",
        knowledge_level: (skill.knowledge_level as string) || "",
        equivalent_coursework: (skill.equivalent_coursework as string) || "",
        assessment_indicator: (skill.assessment_indicator as string) || "",
        abilities_cognitive: (skill.abilities_cognitive as string) || "",
        abilities_communication: (skill.abilities_communication as string) || "",
        abilities_dispositional: (skill.abilities_dispositional as string) || "",
        credential_level: (skill.credential_level as string) || "",
        cip_primary: (skill.cip_primary as string) || "",
        credit_hours: (skill.credit_hours as string) || "",
        experiential_hours: (skill.experiential_hours as string) || "",
        assessment_type: (skill.assessment_type as string) || "",
        bloom_target: (skill.bloom_target as string) || "",
        refresh_cadence: (skill.refresh_cadence as string) || "",
        partnership_rating: (partnership.rating as string) || "",
        adjustment_rationale: (skill.adjustment_rationale as string) || "",
        proficiency_L1: (skill.proficiency_L1 as string) || "",
        proficiency_L2: (skill.proficiency_L2 as string) || "",
        proficiency_L3: (skill.proficiency_L3 as string) || "",
        seed_status: (skill.seed_status as string) || "",
        provenance_state: (provenance.state as string) || "",
        provenance_confidence: (provenance.confidence as number) || 0,
        provenance_sources: Array.isArray(provenance.sources) ? (provenance.sources as string[]).join(", ") : "",
        learning_mode_1: (learningModes[0]?.mode as string) || "",
        learning_mode_2: (learningModes[1]?.mode as string) || "",
        learning_mode_3: (learningModes[2]?.mode as string) || "",
        ...ejcpFlat,
      };

      if (filterField && filterValue) {
        const val = String(row[filterField] ?? "").toLowerCase();
        if (!val.includes(filterValue.toLowerCase())) continue;
      }

      rows.push(row);
    }
  }

  return rows;
}

export async function GET(req: NextRequest) {
  try {
    const format = req.nextUrl.searchParams.get("format") || "csv";
    const filterField = req.nextUrl.searchParams.get("filterField") || undefined;
    const filterValue = req.nextUrl.searchParams.get("filterValue") || undefined;

    const rows = loadAllFlatRows(filterField, filterValue);

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
          width: 22,
        }));

        sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
        sheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1a2744" },
        };

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

    const csv = Papa.unparse(rows as Record<string, unknown>[]);
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
