import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { batchJobs, batchItems, jobDescriptions, enrichedProfiles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { invokeAgentWithTools, parseResearcherJSON } from "@/lib/agents/invoke-with-tools";
import { invokeAgent, parseAgentJSON } from "@/lib/agents/invoke";
import { RESEARCHER_SYSTEM_PROMPT } from "@/lib/agents/researcher-prompt";
import { VALIDATOR_SYSTEM_PROMPT } from "@/lib/agents/validator-prompt";
import { RESEARCHER_TOOLS } from "@/lib/agents/tools";

const CONCURRENCY = 2;

export async function POST(req: NextRequest) {
  const { batchId } = await req.json();

  if (!batchId) {
    return NextResponse.json({ error: "batchId required" }, { status: 400 });
  }

  // Update batch status
  db.update(batchJobs)
    .set({ status: "processing" })
    .where(eq(batchJobs.id, batchId))
    .run();

  // Fire and forget — process in background
  processItems(batchId).catch((err) => {
    console.error("[process] Fatal error:", err);
    db.update(batchJobs)
      .set({ status: "failed", completedAt: new Date().toISOString() })
      .where(eq(batchJobs.id, batchId))
      .run();
  });

  return NextResponse.json({ status: "processing", batchId });
}

async function processItems(batchId: string) {
  const items = db
    .select()
    .from(batchItems)
    .where(and(eq(batchItems.batchId, batchId), eq(batchItems.status, "pending")))
    .all();

  // Process in batches of CONCURRENCY
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const chunk = items.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map((item) => processOneItem(item, batchId)));
  }

  // Finalize batch
  const batch = db.select().from(batchJobs).where(eq(batchJobs.id, batchId)).get();
  if (batch) {
    const finalStatus =
      batch.failedCount === batch.totalCount
        ? "failed"
        : "completed";
    db.update(batchJobs)
      .set({ status: finalStatus, completedAt: new Date().toISOString() })
      .where(eq(batchJobs.id, batchId))
      .run();
  }
}

async function processOneItem(
  item: typeof batchItems.$inferSelect,
  batchId: string
) {
  const jdId = item.jdId;
  if (!jdId) return;

  try {
    // Mark as researching
    db.update(batchItems)
      .set({ status: "researching" })
      .where(eq(batchItems.id, item.id))
      .run();

    // Load JD data
    const jd = db
      .select()
      .from(jobDescriptions)
      .where(eq(jobDescriptions.id, jdId))
      .get();

    if (!jd) throw new Error(`JD ${jdId} not found`);

    const seedSkills: string[] = jd.seedSkills
      ? JSON.parse(jd.seedSkills)
      : [];

    // Build researcher input
    const userMessage = buildResearcherMessage(jd, seedSkills);

    // Run Researcher Agent
    console.log(`[process] Researching: ${jd.jobTitle || jdId}`);
    const researchResult = await invokeAgentWithTools(
      RESEARCHER_SYSTEM_PROMPT,
      userMessage,
      RESEARCHER_TOOLS,
      { maxIterations: 15, maxTokens: 64000 }
    );

    const researchData = parseResearcherJSON(researchResult.text);

    // Mark as validating
    db.update(batchItems)
      .set({ status: "validating" })
      .where(eq(batchItems.id, item.id))
      .run();

    // Run Validator Agent
    console.log(`[process] Validating: ${jd.jobTitle || jdId}`);
    const validatorInput = JSON.stringify(researchData, null, 2);
    const { text: validatorText } = await invokeAgent(
      VALIDATOR_SYSTEM_PROMPT,
      `Validate and audit this Ziggurat profile:\n\n${validatorInput}`,
      64000
    );

    const validatorData = parseAgentJSON(validatorText) as {
      validated_profile: unknown;
      audit_trail: { overall_confidence?: number };
    };

    // Save enriched profile
    const profileId = uuid();
    const now = new Date().toISOString();
    const validatedProfile = validatorData.validated_profile as {
      ejcp?: unknown;
      skills?: unknown;
      seed_skill_results?: unknown;
    };

    db.insert(enrichedProfiles)
      .values({
        id: profileId,
        jdId,
        ejcpData: JSON.stringify(validatedProfile?.ejcp || (researchData as { ejcp?: unknown })?.ejcp || {}),
        skillData: JSON.stringify(validatedProfile?.skills || (researchData as { skills?: unknown })?.skills || {}),
        auditTrail: JSON.stringify(validatorData.audit_trail || {}),
        validatorOutput: JSON.stringify(validatorData),
        status: validatorData.audit_trail?.overall_confidence &&
          validatorData.audit_trail.overall_confidence >= 70
          ? "validated"
          : "flagged",
        overallConfidence: validatorData.audit_trail?.overall_confidence || 0,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // Mark batch item complete
    db.update(batchItems)
      .set({
        status: "completed",
        enrichedProfileId: profileId,
        completedAt: now,
      })
      .where(eq(batchItems.id, item.id))
      .run();

    db.update(batchJobs)
      .set({ completedCount: (db.select().from(batchItems).where(and(eq(batchItems.batchId, batchId), eq(batchItems.status, "completed"))).all().length) })
      .where(eq(batchJobs.id, batchId))
      .run();

  } catch (error) {
    console.error(`[process] Error for item ${item.id}:`, error);
    const errorMsg = error instanceof Error ? error.message : String(error);

    db.update(batchItems)
      .set({ status: "failed", error: errorMsg.slice(0, 500) })
      .where(eq(batchItems.id, item.id))
      .run();

    db.update(batchJobs)
      .set({ failedCount: (db.select().from(batchItems).where(and(eq(batchItems.batchId, batchId), eq(batchItems.status, "failed"))).all().length) })
      .where(eq(batchJobs.id, batchId))
      .run();
  }
}

function buildResearcherMessage(
  jd: typeof jobDescriptions.$inferSelect,
  seedSkills: string[]
): string {
  const parts: string[] = [];

  parts.push("## JOB DESCRIPTION INPUT");
  parts.push("");

  if (jd.jobTitle) parts.push(`**Job Title:** ${jd.jobTitle}`);
  if (jd.company) parts.push(`**Company:** ${jd.company}`);
  if (jd.location) parts.push(`**Location:** ${jd.location}`);
  if (jd.onetCode) parts.push(`**O*NET Code:** ${jd.onetCode}`);
  if (jd.postingUrl) parts.push(`**Job Posting URL:** ${jd.postingUrl}`);
  if (jd.inputStatus) parts.push(`**Status:** ${jd.inputStatus}`);

  parts.push("");
  parts.push("### Seed Skills (from job board tagging — validate, expand, or reject each):");
  if (seedSkills.length > 0) {
    parts.push(seedSkills.map((s) => `- ${s}`).join("\n"));
  } else {
    parts.push("(none provided)");
  }

  parts.push("");
  parts.push("### Full Job Description Text:");
  parts.push(jd.rawText);

  parts.push("");
  parts.push("---");
  parts.push("INSTRUCTIONS: Research this role using web_search and fetch_url, then produce the complete EJCP + Skill Profile JSON as specified in your system prompt.");

  return parts.join("\n");
}
