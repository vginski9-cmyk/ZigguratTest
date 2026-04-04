import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  jobDescriptions,
  ejcpVersions,
  skillProfiles,
  reviewQueue,
  batchJobs,
  batchItems,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { hashText } from "@/lib/utils";
import { invokeAgent, parseAgentJSON } from "@/lib/agents/invoke";
import { AGENT1_SYSTEM_PROMPT } from "@/lib/agents/agent1-prompt";
import { AGENT2_SYSTEM_PROMPT } from "@/lib/agents/agent2-prompt";

export const maxDuration = 300;

// Process a single JD through the full pipeline
async function processItem(
  itemId: string,
  rawText: string,
  mode: string
) {
  const now = () => new Date().toISOString();

  try {
    // Step 1: Submit JD
    const jdId = uuidv4();
    await db.insert(jobDescriptions).values({
      id: jdId,
      rawText: rawText.trim(),
      sourceUrl: null,
      textHash: hashText(rawText),
      submittedBy: "batch",
      submittedAt: now(),
    });

    await db
      .update(batchItems)
      .set({ jdId, status: "agent1" })
      .where(eq(batchItems.id, itemId));

    // Step 2: Agent 1
    const userMessage = `Please classify the following job description against all 27 Ziggurat layers. Include rich category narratives and per-layer narrative analysis. Output valid JSON only.\n\n---\n\n${rawText}`;
    const a1Result = await invokeAgent(AGENT1_SYSTEM_PROMPT, userMessage, 32000);
    const ejcpData = parseAgentJSON(a1Result.text);

    const ejcpId = uuidv4();
    const ejcpStatus = mode === "auto" ? "human_verified" : "ai_enriched";
    await db.insert(ejcpVersions).values({
      id: ejcpId,
      jdId,
      version: 1,
      data: JSON.stringify(ejcpData),
      validationStatus: ejcpStatus,
      agentVersion: "Ziggurat_Classifier_v2",
      createdAt: now(),
    });

    if (mode === "reviewed") {
      await db.insert(reviewQueue).values({
        id: uuidv4(),
        entityType: "ejcp",
        entityId: ejcpId,
        gate: "gate1",
        status: "pending",
        createdAt: now(),
      });
      await db
        .update(batchItems)
        .set({ ejcpId, status: "completed", completedAt: now() })
        .where(eq(batchItems.id, itemId));
      return;
    }

    // Step 3: Agent 2 (auto mode)
    await db
      .update(batchItems)
      .set({ ejcpId, status: "agent2" })
      .where(eq(batchItems.id, itemId));

    const a2UserMessage = [
      "Here is the validated EJCP. Produce a Contextualized Skill Profile following the full Occupation Skills Taxonomy.",
      "",
      "STRICT RULES:",
      "- Target 20-28 ATOMIC skills (1-4 words each) distributed across ALL FOUR taxonomy categories.",
      "- Distribution: 6-8 Core Role-Specific, 3-5 Baseline Applied, 3-5 Foundational & Leadership, 5-10 Specialization.",
      "- NEVER combine two skills into one name.",
      "- Apply Category Decision Rules (T1-T4) for every skill.",
      "- VARY required_level (mix of L1, L2, L3). VARY criticality (mix of must_have, important, nice_to_have).",
      "- Keep proficiency descriptions to 2-3 sentences. Keep ability fields to 1-2 sentences.",
      "- Every definition starts with the skill name. Every how_utilized starts with the role title.",
      '- Every proficiency level starts with "At Level [N] Proficiency, a worker can..."',
      "- Keep brief sections to 2-3 short paragraphs each.",
      "- Your response must be ONLY the JSON object. No markdown, no explanation.",
      "",
      JSON.stringify(ejcpData, null, 2),
    ].join("\n");

    const a2Result = await invokeAgent(
      AGENT2_SYSTEM_PROMPT,
      a2UserMessage,
      64000,
      { prefill: '{\n  "meta":' }
    );
    const profileData = parseAgentJSON(a2Result.text);

    const profileId = uuidv4();
    await db.insert(skillProfiles).values({
      id: profileId,
      ejcpId,
      version: 1,
      data: JSON.stringify(profileData),
      validationStatus: "published",
      agentVersion: "Skill_Profiler_v3",
      createdAt: now(),
    });

    await db
      .update(batchItems)
      .set({ profileId, status: "completed", completedAt: now() })
      .where(eq(batchItems.id, itemId));
  } catch (err) {
    await db
      .update(batchItems)
      .set({ status: "failed", error: String(err), completedAt: now() })
      .where(eq(batchItems.id, itemId));
  }
}

export async function POST(request: NextRequest) {
  try {
    const { jobDescriptionTexts, mode = "auto", createdBy } = await request.json();

    if (!Array.isArray(jobDescriptionTexts) || jobDescriptionTexts.length === 0) {
      return NextResponse.json(
        { error: "jobDescriptionTexts array is required" },
        { status: 400 }
      );
    }

    const batchId = uuidv4();
    const now = new Date().toISOString();

    await db.insert(batchJobs).values({
      id: batchId,
      status: "processing",
      totalCount: jobDescriptionTexts.length,
      completedCount: 0,
      failedCount: 0,
      mode,
      createdBy: createdBy || null,
      createdAt: now,
    });

    const items: { id: string; text: string }[] = [];
    for (const text of jobDescriptionTexts) {
      const itemId = uuidv4();
      await db.insert(batchItems).values({
        id: itemId,
        batchId,
        status: "pending",
        createdAt: now,
      });
      items.push({ id: itemId, text });
    }

    // Process items sequentially (to avoid rate limits), but don't await — fire and forget
    // The client polls /api/batch/[id] for status
    (async () => {
      // Process up to 2 concurrently
      const concurrency = 2;
      for (let i = 0; i < items.length; i += concurrency) {
        const batch = items.slice(i, i + concurrency);
        await Promise.allSettled(
          batch.map((item) => processItem(item.id, item.text, mode))
        );

        // Update batch counts
        const allItems = await db
          .select()
          .from(batchItems)
          .where(eq(batchItems.batchId, batchId))
          .all();

        const completed = allItems.filter((i) => i.status === "completed").length;
        const failed = allItems.filter((i) => i.status === "failed").length;

        await db
          .update(batchJobs)
          .set({
            completedCount: completed,
            failedCount: failed,
            ...(completed + failed === allItems.length
              ? { status: "completed", completedAt: new Date().toISOString() }
              : {}),
          })
          .where(eq(batchJobs.id, batchId));
      }
    })();

    return NextResponse.json({ batchId, totalCount: items.length });
  } catch (error) {
    console.error("Batch route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const batchId = request.nextUrl.searchParams.get("batchId");

  if (batchId) {
    const job = await db.select().from(batchJobs).where(eq(batchJobs.id, batchId)).get();
    const items = await db.select().from(batchItems).where(eq(batchItems.batchId, batchId)).all();

    if (!job) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    return NextResponse.json({ job, items });
  }

  // List all batches
  const jobs = await db.select().from(batchJobs).all();
  return NextResponse.json({ jobs });
}
