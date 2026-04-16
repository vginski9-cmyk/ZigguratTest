import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enrichedProfiles, jobDescriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface SkillRow {
  profileId: string;
  jobTitle: string;
  company: string;
  location: string;
  onetCode: string;
  overallConfidence: number;
  status: string;
  skillName: string;
  bgtCategory: string;
  criticality: string;
  requiredLevel: number;
  label: string;
  seedStatus: string;
  provenanceState: string;
  provenanceConfidence: number;
  // EJCP layer values for filtering
  roleLevel: string;
  regulatory: string;
  digital: string;
  geography: string;
  scale: string;
}

function loadAllSkillRows(): SkillRow[] {
  const profiles = db.select().from(enrichedProfiles).all();
  const rows: SkillRow[] = [];

  for (const profile of profiles) {
    const jd = db
      .select()
      .from(jobDescriptions)
      .where(eq(jobDescriptions.id, profile.jdId))
      .get();

    let skillData: { skills?: Array<Record<string, unknown>>; meta?: Record<string, unknown> };
    let ejcpData: { layers?: Record<string, Record<string, unknown>> };

    try {
      skillData = JSON.parse(profile.skillData);
    } catch {
      continue;
    }
    try {
      ejcpData = JSON.parse(profile.ejcpData);
    } catch {
      ejcpData = { layers: {} };
    }

    const layers = ejcpData?.layers || {};
    const skills = skillData?.skills || [];

    for (const skill of skills) {
      rows.push({
        profileId: profile.id,
        jobTitle: jd?.jobTitle || (skillData?.meta?.role_title as string) || "",
        company: jd?.company || (skillData?.meta?.employer as string) || "",
        location: jd?.location || (skillData?.meta?.location as string) || "",
        onetCode: jd?.onetCode || (skillData?.meta?.onet_code as string) || "",
        overallConfidence: profile.overallConfidence || 0,
        status: profile.status,
        skillName: (skill.skill_name as string) || "",
        bgtCategory: (skill.bgt_category as string) || "",
        criticality: (skill.criticality as string) || "",
        requiredLevel: (skill.required_level as number) || 0,
        label: (skill.label as string) || "",
        seedStatus: (skill.seed_status as string) || "",
        provenanceState: (skill.provenance as Record<string, unknown>)?.state as string || "",
        provenanceConfidence: (skill.provenance as Record<string, unknown>)?.confidence as number || 0,
        roleLevel: (layers.L9_role_definition as Record<string, unknown>)?.role_level as string || "",
        regulatory: (layers.L8_regulatory as Record<string, unknown>)?.value as string || "",
        digital: (layers.L6_digital_maturity as Record<string, unknown>)?.value as string || "",
        geography: (layers.L7_geography as Record<string, unknown>)?.value as string || "",
        scale: (layers.L4_scale as Record<string, unknown>)?.value as string || "",
      });
    }
  }

  return rows;
}

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const groupBy = params.get("groupBy") || "bgtCategory";
    const filterField = params.get("filterField");
    const filterValue = params.get("filterValue");

    let rows = loadAllSkillRows();

    // Apply filter
    if (filterField && filterValue) {
      rows = rows.filter((r) => {
        const val = r[filterField as keyof SkillRow];
        return String(val).toLowerCase().includes(filterValue.toLowerCase());
      });
    }

    // Group by
    const groups: Record<string, SkillRow[]> = {};
    for (const row of rows) {
      const key = String(row[groupBy as keyof SkillRow] || "Unknown");
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    }

    // Aggregate
    const aggregated = Object.entries(groups).map(([key, items]) => ({
      group: key,
      count: items.length,
      avgConfidence: Math.round(
        items.reduce((sum, r) => sum + r.provenanceConfidence, 0) / items.length
      ),
      profiles: [...new Set(items.map((r) => r.profileId))].length,
      criticalityBreakdown: {
        must_have: items.filter((r) => r.criticality === "must_have").length,
        important: items.filter((r) => r.criticality === "important").length,
        nice_to_have: items.filter((r) => r.criticality === "nice_to_have").length,
        contextual: items.filter((r) => r.criticality === "contextual").length,
      },
    }));

    aggregated.sort((a, b) => b.count - a.count);

    return NextResponse.json({
      totalSkills: rows.length,
      totalProfiles: [...new Set(rows.map((r) => r.profileId))].length,
      groupBy,
      groups: aggregated,
      rawRows: rows.slice(0, 500), // Limit raw data for client
    });
  } catch (error) {
    console.error("[analytics] Error:", error);
    return NextResponse.json({ error: "Analytics query failed" }, { status: 500 });
  }
}
