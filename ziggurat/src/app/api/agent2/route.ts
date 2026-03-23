import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ejcpVersions, skillProfiles, reviewQueue } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { invokeAgent, parseAgentJSON } from "@/lib/agents/invoke";
import { AGENT2_SYSTEM_PROMPT } from "@/lib/agents/agent2-prompt";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const { ejcpId } = await request.json();

    if (!ejcpId) {
      return NextResponse.json(
        { error: "ejcpId is required" },
        { status: 400 }
      );
    }

    const ejcp = await db
      .select()
      .from(ejcpVersions)
      .where(eq(ejcpVersions.id, ejcpId))
      .get();

    if (!ejcp) {
      return NextResponse.json(
        { error: "EJCP not found" },
        { status: 404 }
      );
    }

    const ejcpData = JSON.parse(ejcp.data);

    const MAX_ATTEMPTS = 2;
    let rawText: string = "";
    let profileData: unknown = null;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const skillTarget = attempt === 1 ? "15-25" : "12-18";
      const descLength = attempt === 1 ? "2-3 sentences" : "1-2 sentences";

      const userMessage = [
        "Here is the validated EJCP. Produce a Contextualized Skill Profile following the full Occupation Skills Taxonomy.",
        "",
        "STRICT RULES:",
        `- Target ${skillTarget} ATOMIC skills (1-4 words each) distributed across ALL FOUR taxonomy categories.`,
        "- Distribution: 5-7 Core Role-Specific, 2-4 Baseline Applied, 3-5 Foundational & Leadership, 4-8 Specialization.",
        "- NEVER combine two skills into one name (e.g., 'Python Data Engineering' → separate 'Python' + 'Data Engineering').",
        "- Apply Category Decision Rules (T1-T4) for every skill.",
        "- VARY required_level (mix of L1, L2, L3). VARY criticality (mix of must_have, important, nice_to_have).",
        `- Keep proficiency descriptions to ${descLength}. Keep ability fields to 1-2 sentences.`,
        "- Every definition starts with the skill name. Every how_utilized starts with the role title.",
        '- Every proficiency level starts with "At Level [N] Proficiency, a worker can..."',
        "- Keep brief sections to 2-3 short paragraphs each.",
        "- Your response must be ONLY the JSON object. No markdown, no explanation.",
        "",
        JSON.stringify(ejcpData, null, 2),
      ].join("\n");

      try {
        // Use assistant prefill to force raw JSON output (no markdown fences)
        const result = await invokeAgent(
          AGENT2_SYSTEM_PROMPT,
          userMessage,
          64000,
          { prefill: '{\n  "meta":' }
        );
        rawText = result.text;

        console.log(
          `[Agent2] Attempt ${attempt}: ${rawText.length} chars, truncated=${result.truncated}`
        );
      } catch (agentError) {
        console.error(`Agent 2 invocation failed (attempt ${attempt}):`, agentError);
        lastError = agentError;
        continue;
      }

      try {
        profileData = parseAgentJSON(rawText);
        console.log(`[Agent2] Parse succeeded on attempt ${attempt}`);
        break;
      } catch (parseError) {
        console.error(`Agent 2 parse failed (attempt ${attempt}):`, parseError);
        console.error("Raw response length:", rawText.length);
        console.error("First 500 chars:", rawText.slice(0, 500));
        console.error("Last 500 chars:", rawText.slice(-500));
        lastError = parseError;
      }
    }

    if (!profileData) {
      return NextResponse.json(
        {
          error: "Failed to parse Agent 2 response after retries",
          details: String(lastError),
          rawResponseLength: rawText.length,
          rawResponsePreview: rawText.slice(0, 1000),
        },
        { status: 422 }
      );
    }

    const profileId = uuidv4();
    const now = new Date().toISOString();

    await db.insert(skillProfiles).values({
      id: profileId,
      ejcpId,
      version: 1,
      data: JSON.stringify(profileData),
      validationStatus: "ai_enriched",
      agentVersion: "Skill_Profiler_v3",
      createdAt: now,
    });

    const queueId = uuidv4();
    await db.insert(reviewQueue).values({
      id: queueId,
      entityType: "profile",
      entityId: profileId,
      gate: "gate2",
      status: "pending",
      createdAt: now,
    });

    return NextResponse.json({
      profileId,
      queueId,
      data: profileData,
    });
  } catch (error) {
    console.error("Agent 2 route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
