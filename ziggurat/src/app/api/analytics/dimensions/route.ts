import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enrichedProfiles, jobDescriptions } from "@/lib/db/schema";
import { ZIGGURAT_LAYERS, CATEGORY_NAMES } from "@/lib/ziggurat/enums";

interface DimensionInfo {
  key: string;
  label: string;
  group: string;
  type: "categorical" | "numeric" | "text";
  distinctValues?: string[];
  min?: number;
  max?: number;
}

export async function GET() {
  try {
    const profiles = db.select().from(enrichedProfiles).all();
    const valueSets: Record<string, Set<string>> = {};

    for (const profile of profiles) {
      let skillData: { skills?: Array<Record<string, unknown>>; meta?: Record<string, unknown> };
      let ejcpData: { layers?: Record<string, Record<string, unknown>> };
      try { skillData = JSON.parse(profile.skillData); } catch { continue; }
      try { ejcpData = JSON.parse(profile.ejcpData); } catch { ejcpData = {}; }

      const layers = ejcpData?.layers || {};
      const skills = skillData?.skills || [];

      for (const [key, val] of Object.entries(layers)) {
        const ld = val as Record<string, unknown>;
        const baseId = key.split("_")[0];
        const fieldKey = `ejcp_${baseId}_value`;
        if (!valueSets[fieldKey]) valueSets[fieldKey] = new Set();
        if (ld.value) valueSets[fieldKey].add(String(ld.value));
        if (Array.isArray(ld.values)) {
          for (const v of ld.values) valueSets[fieldKey].add(String(v));
        }
      }

      for (const skill of skills) {
        const categoricalFields = [
          "bgt_category", "label", "criticality", "seed_status",
          "knowledge_domain", "knowledge_level", "credential_level",
          "bloom_target", "refresh_cadence", "assessment_type",
        ];
        for (const f of categoricalFields) {
          const val = skill[f];
          if (val) {
            if (!valueSets[f]) valueSets[f] = new Set();
            valueSets[f].add(String(val));
          }
        }

        const prov = (skill.provenance || {}) as Record<string, unknown>;
        if (prov.state) {
          if (!valueSets["provenance_state"]) valueSets["provenance_state"] = new Set();
          valueSets["provenance_state"].add(String(prov.state));
        }

        const partnership = (skill.partnership || {}) as Record<string, unknown>;
        if (partnership.rating) {
          if (!valueSets["partnership_rating"]) valueSets["partnership_rating"] = new Set();
          valueSets["partnership_rating"].add(String(partnership.rating));
        }
      }
    }

    const jds = db.select().from(jobDescriptions).all();
    for (const jd of jds) {
      for (const [f, v] of Object.entries({ job_title: jd.jobTitle, company: jd.company, location: jd.location, onet_code: jd.onetCode })) {
        if (v) {
          if (!valueSets[f]) valueSets[f] = new Set();
          valueSets[f].add(v);
        }
      }
    }

    function sorted(s?: Set<string>): string[] {
      return s ? [...s].sort() : [];
    }

    const dimensions: DimensionInfo[] = [];

    dimensions.push(
      { key: "job_title", label: "Job Title", group: "Profile", type: "categorical", distinctValues: sorted(valueSets["job_title"]) },
      { key: "company", label: "Company", group: "Profile", type: "categorical", distinctValues: sorted(valueSets["company"]) },
      { key: "location", label: "Location", group: "Profile", type: "categorical", distinctValues: sorted(valueSets["location"]) },
      { key: "onet_code", label: "O*NET Code", group: "Profile", type: "categorical", distinctValues: sorted(valueSets["onet_code"]) },
      { key: "profile_status", label: "Profile Status", group: "Profile", type: "categorical", distinctValues: ["processing", "validated", "flagged", "exported"] },
      { key: "overall_confidence", label: "Overall Confidence", group: "Profile", type: "numeric", min: 0, max: 100 },
    );

    dimensions.push(
      { key: "skill_name", label: "Skill Name", group: "Skill Core", type: "categorical", distinctValues: sorted(valueSets["skill_name"]) },
      { key: "bgt_category", label: "BGT Category", group: "Skill Core", type: "categorical", distinctValues: sorted(valueSets["bgt_category"]) },
      { key: "label", label: "Skill Label", group: "Skill Core", type: "categorical", distinctValues: sorted(valueSets["label"]) },
      { key: "criticality", label: "Criticality", group: "Skill Core", type: "categorical", distinctValues: sorted(valueSets["criticality"]) },
      { key: "required_level", label: "Required Level (1-3)", group: "Skill Core", type: "numeric", min: 1, max: 3 },
      { key: "seed_status", label: "Seed Status", group: "Skill Core", type: "categorical", distinctValues: sorted(valueSets["seed_status"]) },
    );

    dimensions.push(
      { key: "knowledge_domain", label: "Knowledge Domain", group: "Knowledge & Abilities", type: "categorical", distinctValues: sorted(valueSets["knowledge_domain"]) },
      { key: "knowledge_level", label: "Knowledge Level (Bloom's)", group: "Knowledge & Abilities", type: "categorical", distinctValues: sorted(valueSets["knowledge_level"]) },
      { key: "bloom_target", label: "Bloom Target", group: "Knowledge & Abilities", type: "categorical", distinctValues: sorted(valueSets["bloom_target"]) },
    );

    dimensions.push(
      { key: "credential_level", label: "Credential Level", group: "Credentials & Education", type: "categorical", distinctValues: sorted(valueSets["credential_level"]) },
      { key: "assessment_type", label: "Assessment Type", group: "Credentials & Education", type: "categorical", distinctValues: sorted(valueSets["assessment_type"]) },
      { key: "refresh_cadence", label: "Refresh Cadence", group: "Credentials & Education", type: "categorical", distinctValues: sorted(valueSets["refresh_cadence"]) },
    );

    dimensions.push(
      { key: "partnership_rating", label: "Partnership Rating", group: "Partnership & Learning", type: "categorical", distinctValues: sorted(valueSets["partnership_rating"]) },
    );

    dimensions.push(
      { key: "provenance_state", label: "Provenance State", group: "Provenance", type: "categorical", distinctValues: sorted(valueSets["provenance_state"]) },
      { key: "provenance_confidence", label: "Provenance Confidence", group: "Provenance", type: "numeric", min: 0, max: 100 },
    );

    for (const layerDef of ZIGGURAT_LAYERS) {
      const catName = CATEGORY_NAMES[layerDef.category] || `Category ${layerDef.category}`;
      dimensions.push({
        key: `ejcp_${layerDef.id}_value`,
        label: `${layerDef.id}: ${layerDef.name}`,
        group: `EJCP: ${catName}`,
        type: "categorical",
        distinctValues: layerDef.enums.map((e) => e.value),
      });
    }

    return NextResponse.json({ dimensions, totalProfiles: profiles.length });
  } catch (error) {
    console.error("[dimensions] Error:", error);
    return NextResponse.json({ error: "Failed to load dimensions" }, { status: 500 });
  }
}
