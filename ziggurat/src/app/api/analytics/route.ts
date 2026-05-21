import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enrichedProfiles, jobDescriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ZIGGURAT_LAYERS } from "@/lib/ziggurat/enums";

interface FlatRow {
  [key: string]: string | number | null;
}

function flattenProfileToRows(
  profile: { id: string; ejcpData: string; skillData: string; auditTrail: string | null; status: string; overallConfidence: number | null; jdId: string },
  jd: { jobTitle: string | null; company: string | null; location: string | null; onetCode: string | null } | undefined
): FlatRow[] {
  let skillData: { skills?: Array<Record<string, unknown>>; meta?: Record<string, unknown> };
  let ejcpData: { layers?: Record<string, Record<string, unknown>> };

  try { skillData = JSON.parse(profile.skillData); } catch { return []; }
  try { ejcpData = JSON.parse(profile.ejcpData); } catch { ejcpData = {}; }

  const layers = ejcpData?.layers || {};
  const skills = skillData?.skills || [];
  const meta = skillData?.meta || {};

  const ejcpFlat: Record<string, string | number | null> = {};
  for (const layerDef of ZIGGURAT_LAYERS) {
    const layerData = layers[layerDef.id] || null;
    const altKey = Object.keys(layers).find((k) => k.startsWith(layerDef.id));
    const ld = layerData || (altKey ? layers[altKey] : null);
    if (ld) {
      ejcpFlat[`ejcp_${layerDef.id}_value`] = ld.value != null ? String(ld.value) : (ld.values as string[])?.join(", ") || null;
      ejcpFlat[`ejcp_${layerDef.id}_confidence`] = typeof ld.confidence === "number" ? ld.confidence : null;
      ejcpFlat[`ejcp_${layerDef.id}_provenance`] = ld.provenance != null ? String(ld.provenance) : null;
    } else {
      ejcpFlat[`ejcp_${layerDef.id}_value`] = null;
      ejcpFlat[`ejcp_${layerDef.id}_confidence`] = null;
      ejcpFlat[`ejcp_${layerDef.id}_provenance`] = null;
    }
  }

  for (const [key, val] of Object.entries(layers)) {
    const baseId = key.split("_")[0];
    if (baseId !== key && ejcpFlat[`ejcp_${baseId}_value`] == null) {
      const ld = val as Record<string, unknown>;
      ejcpFlat[`ejcp_${baseId}_value`] = ld.value != null ? String(ld.value) : (ld.values as string[])?.join(", ") || null;
      ejcpFlat[`ejcp_${baseId}_confidence`] = typeof ld.confidence === "number" ? (ld.confidence as number) : null;
      ejcpFlat[`ejcp_${baseId}_provenance`] = ld.provenance != null ? String(ld.provenance) : null;
    }
  }

  const rows: FlatRow[] = [];

  for (const skill of skills) {
    const provenance = (skill.provenance || {}) as Record<string, unknown>;
    const partnership = (skill.partnership || {}) as Record<string, unknown>;
    const learningModes = (skill.learning_modes || []) as Array<Record<string, unknown>>;

    rows.push({
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
      cip_secondary: Array.isArray(skill.cip_secondary) ? (skill.cip_secondary as string[]).join(", ") : "",
      credit_hours: (skill.credit_hours as string) || "",
      experiential_hours: (skill.experiential_hours as string) || "",
      assessment_type: (skill.assessment_type as string) || "",
      bloom_target: (skill.bloom_target as string) || "",
      program_fit: Array.isArray(skill.program_fit) ? (skill.program_fit as string[]).join(", ") : "",
      refresh_cadence: (skill.refresh_cadence as string) || "",
      partnership_rating: (partnership.rating as string) || "",
      partnership_text: (partnership.text as string) || "",
      adjustment_rationale: (skill.adjustment_rationale as string) || "",
      proficiency_L1: (skill.proficiency_L1 as string) || "",
      proficiency_L2: (skill.proficiency_L2 as string) || "",
      proficiency_L3: (skill.proficiency_L3 as string) || "",
      seed_status: (skill.seed_status as string) || "",
      provenance_state: (provenance.state as string) || "",
      provenance_confidence: (provenance.confidence as number) || 0,
      provenance_sources: Array.isArray(provenance.sources) ? (provenance.sources as string[]).join(", ") : "",
      provenance_evidence: (provenance.evidence as string) || "",
      learning_mode_1: (learningModes[0]?.mode as string) || "",
      learning_mode_2: (learningModes[1]?.mode as string) || "",
      learning_mode_3: (learningModes[2]?.mode as string) || "",
      ...ejcpFlat,
    });
  }

  return rows;
}

function loadAllFlatRows(): FlatRow[] {
  const profiles = db.select().from(enrichedProfiles).all();
  const rows: FlatRow[] = [];
  for (const profile of profiles) {
    const jd = db.select().from(jobDescriptions).where(eq(jobDescriptions.id, profile.jdId)).get();
    rows.push(...flattenProfileToRows(profile, jd ?? undefined));
  }
  return rows;
}

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const groupBy = params.get("groupBy") || "bgt_category";
    const groupByFields = groupBy.split(",").filter(Boolean);
    const sortBy = params.get("sortBy") || "count";
    const sortDir = (params.get("sortDir") || "desc") as "asc" | "desc";
    const limitParam = params.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    let rows = loadAllFlatRows();

    // Multi-filter support
    for (let i = 0; i < 20; i++) {
      const field = params.get(`filter_${i}_field`);
      const value = params.get(`filter_${i}_value`);
      const op = params.get(`filter_${i}_op`) || "contains";
      if (!field || !value) break;
      rows = rows.filter((r) => {
        const cellVal = String(r[field] ?? "").toLowerCase();
        const filterVal = value.toLowerCase();
        switch (op) {
          case "equals": return cellVal === filterVal;
          case "not_equals": return cellVal !== filterVal;
          case "contains": return cellVal.includes(filterVal);
          case "starts_with": return cellVal.startsWith(filterVal);
          case "gt": return Number(r[field]) > Number(value);
          case "gte": return Number(r[field]) >= Number(value);
          case "lt": return Number(r[field]) < Number(value);
          case "lte": return Number(r[field]) <= Number(value);
          case "in": return filterVal.split("|").some((v) => cellVal === v.trim());
          default: return cellVal.includes(filterVal);
        }
      });
    }

    // Legacy single filter
    const filterField = params.get("filterField");
    const filterValue = params.get("filterValue");
    if (filterField && filterValue) {
      rows = rows.filter((r) =>
        String(r[filterField] ?? "").toLowerCase().includes(filterValue.toLowerCase())
      );
    }

    // Group
    const groups: Record<string, FlatRow[]> = {};
    for (const row of rows) {
      const keyParts = groupByFields.map((f) => String(row[f] ?? "Unknown"));
      const key = keyParts.join(" | ");
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    }

    // Aggregate
    const aggregated = Object.entries(groups).map(([key, items]) => {
      const keyParts = key.split(" | ");
      const confidences = items.map((r) => Number(r.provenance_confidence || 0));
      const overalls = items.map((r) => Number(r.overall_confidence || 0));

      const base: Record<string, unknown> = {
        group: key,
        count: items.length,
        profiles: [...new Set(items.map((r) => r.profile_id))].length,
        avg_confidence: Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length),
        min_confidence: Math.min(...confidences),
        max_confidence: Math.max(...confidences),
        avg_overall_confidence: Math.round(overalls.reduce((a, b) => a + b, 0) / overalls.length),
        avg_required_level: +(items.reduce((a, r) => a + Number(r.required_level || 0), 0) / items.length).toFixed(1),
        must_have: items.filter((r) => r.criticality === "must_have").length,
        important: items.filter((r) => r.criticality === "important").length,
        nice_to_have: items.filter((r) => r.criticality === "nice_to_have").length,
        contextual: items.filter((r) => r.criticality === "contextual").length,
        confirmed: items.filter((r) => r.provenance_state === "confirmed").length,
        inferred: items.filter((r) => r.provenance_state === "inferred").length,
        unknown_prov: items.filter((r) => r.provenance_state === "unknown" || !r.provenance_state).length,
        seed_confirmed: items.filter((r) => r.seed_status === "confirmed").length,
        seed_expanded: items.filter((r) => r.seed_status === "expanded").length,
        seed_new: items.filter((r) => r.seed_status === "new" || !r.seed_status).length,
        core_skills: items.filter((r) => String(r.bgt_category || "").toLowerCase().includes("core")).length,
        baseline_skills: items.filter((r) => String(r.bgt_category || "").toLowerCase().includes("baseline")).length,
        foundational_skills: items.filter((r) => String(r.bgt_category || "").toLowerCase().includes("foundational")).length,
        specialization_skills: items.filter((r) => String(r.bgt_category || "").toLowerCase().includes("specialization")).length,
        durable: items.filter((r) => String(r.label || "").toLowerCase().includes("durable")).length,
        high_growth: items.filter((r) => String(r.label || "").toLowerCase().includes("growth")).length,
        high_value: items.filter((r) => String(r.label || "").toLowerCase().includes("value")).length,
        declining: items.filter((r) => String(r.label || "").toLowerCase().includes("declining")).length,
      };

      groupByFields.forEach((f, i) => { base[`group_${f}`] = keyParts[i] || ""; });
      return base;
    });

    aggregated.sort((a, b) => {
      const av = a[sortBy] ?? 0;
      const bv = b[sortBy] ?? 0;
      if (typeof av === "number" && typeof bv === "number") return sortDir === "desc" ? bv - av : av - bv;
      return sortDir === "desc" ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
    });

    const limited = limit ? aggregated.slice(0, limit) : aggregated;

    return NextResponse.json({
      totalSkills: rows.length,
      totalProfiles: [...new Set(rows.map((r) => r.profile_id))].length,
      groupBy: groupByFields,
      groups: limited,
      rawRows: rows.slice(0, 1000),
      availableFields: rows.length > 0 ? Object.keys(rows[0]) : [],
    });
  } catch (error) {
    console.error("[analytics] Error:", error);
    return NextResponse.json({ error: "Analytics query failed" }, { status: 500 });
  }
}
