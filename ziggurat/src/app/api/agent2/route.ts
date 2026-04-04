import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ejcpVersions, skillProfiles, reviewQueue } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { invokeAgent, parseAgentJSON } from "@/lib/agents/invoke";
import { AGENT2_SYSTEM_PROMPT } from "@/lib/agents/agent2-prompt";

export const maxDuration = 300;

// Analyze EJCP complexity to determine dynamic skill targets
function computeComplexity(ejcpData: Record<string, unknown>): {
  level: "simple" | "moderate" | "complex";
  totalTarget: string;
  coreTarget: string;
  baselineTarget: string;
  foundationalTarget: string;
  specializationTarget: string;
  maxTokens: number;
} {
  const layers = (ejcpData.layers || {}) as Record<string, { value?: string; values?: string[]; confidence?: number }>;
  let activeLayers = 0;
  let seniorityScore = 0;
  let specializationDensity = 0;

  for (const [key, layer] of Object.entries(layers)) {
    if (!layer) continue;
    const hasValue = layer.value && layer.value !== "" && layer.value !== "unknown";
    const hasValues = Array.isArray(layer.values) && layer.values.length > 0;
    if (hasValue || hasValues) activeLayers++;

    // Seniority indicators
    if (key === "L7" && layer.value) {
      const senior = ["senior", "principal", "staff", "director", "executive", "lead"];
      if (senior.some((s) => (layer.value || "").toLowerCase().includes(s))) seniorityScore += 2;
      else seniorityScore += 1;
    }
    if (key === "L8" && layer.value) {
      const highAutonomy = ["high", "autonomous", "strategic"];
      if (highAutonomy.some((s) => (layer.value || "").toLowerCase().includes(s))) seniorityScore += 2;
    }

    // Specialization layers (L22-L27 range)
    const layerNum = parseInt(key.replace(/\D/g, ""), 10);
    if (layerNum >= 22 && (hasValue || hasValues)) specializationDensity++;
  }

  const complexityScore = activeLayers + seniorityScore + specializationDensity * 2;

  if (complexityScore >= 22) {
    return {
      level: "complex",
      totalTarget: "25-35",
      coreTarget: "7-10",
      baselineTarget: "3-5",
      foundationalTarget: "4-6",
      specializationTarget: "8-14",
      maxTokens: 64000,
    };
  } else if (complexityScore >= 14) {
    return {
      level: "moderate",
      totalTarget: "20-28",
      coreTarget: "6-8",
      baselineTarget: "3-5",
      foundationalTarget: "3-5",
      specializationTarget: "5-10",
      maxTokens: 64000,
    };
  } else {
    return {
      level: "simple",
      totalTarget: "15-20",
      coreTarget: "5-7",
      baselineTarget: "2-4",
      foundationalTarget: "3-5",
      specializationTarget: "4-6",
      maxTokens: 32000,
    };
  }
}

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
    const complexity = computeComplexity(ejcpData);
    console.log(`[Agent2] EJCP complexity: ${complexity.level}, target: ${complexity.totalTarget} skills`);

    const MAX_ATTEMPTS = 2;
    let rawText: string = "";
    let profileData: unknown = null;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      // First attempt uses dynamic targets; fallback reduces by ~30%
      const skillTarget = attempt === 1 ? complexity.totalTarget : (() => {
        const [lo, hi] = complexity.totalTarget.split("-").map(Number);
        return `${Math.max(12, Math.floor(lo * 0.7))}-${Math.floor(hi * 0.7)}`;
      })();
      const descLength = attempt === 1 ? "2-3 sentences" : "1-2 sentences";
      const tokenBudget = attempt === 1 ? complexity.maxTokens : Math.min(complexity.maxTokens, 48000);

      const userMessage = [
        "Here is the validated EJCP. Produce a Contextualized Skill Profile following the full Occupation Skills Taxonomy.",
        "",
        `COMPLEXITY ASSESSMENT: This role is "${complexity.level}" complexity. You MUST produce the full number of skills.`,
        "",
        "STRICT RULES:",
        `- Target ${skillTarget} ATOMIC skills (1-4 words each) distributed across ALL FOUR taxonomy categories.`,
        `- Distribution: ${attempt === 1 ? `${complexity.coreTarget} Core Role-Specific, ${complexity.baselineTarget} Baseline Applied, ${complexity.foundationalTarget} Foundational & Leadership, ${complexity.specializationTarget} Specialization` : "reduce proportionally from targets above"}.`,
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
          tokenBudget,
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
