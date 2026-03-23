import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ejcpVersions, skillProfiles, reviewQueue } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { invokeAgent, parseAgentJSON } from "@/lib/agents/invoke";
import { AGENT2_SYSTEM_PROMPT } from "@/lib/agents/agent2-prompt";

export const maxDuration = 180;

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
    const userMessage = `Here is the validated EJCP. Produce a Contextualized Skill Profile.\n\nRules:\n- Output ONLY the JSON object. No markdown fences, no explanation before or after.\n- Limit to the TOP 10 most critical skills.\n- Ensure the JSON is complete and properly closed.\n\n${JSON.stringify(ejcpData, null, 2)}`;

    const MAX_ATTEMPTS = 2;
    let rawResponse: string = "";
    let profileData: unknown = null;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const msg =
          attempt === 1
            ? userMessage
            : userMessage +
              "\n\nIMPORTANT: Limit to TOP 8 skills. Keep descriptions SHORT (1-2 sentences). Output ONLY valid JSON, no markdown fences. Ensure the JSON is COMPLETE.";

        rawResponse = await invokeAgent(AGENT2_SYSTEM_PROMPT, msg, 32000);
      } catch (agentError) {
        console.error(`Agent 2 invocation failed (attempt ${attempt}):`, agentError);
        lastError = agentError;
        continue;
      }

      try {
        profileData = parseAgentJSON(rawResponse);
        break; // success
      } catch (parseError) {
        console.error(`Agent 2 parse failed (attempt ${attempt}):`, parseError);
        console.error("Raw response length:", rawResponse.length);
        console.error("Raw response (first 500 chars):", rawResponse.slice(0, 500));
        lastError = parseError;
      }
    }

    if (!profileData) {
      return NextResponse.json(
        {
          error: "Failed to parse Agent 2 response after retries",
          details: String(lastError),
          rawResponseLength: rawResponse.length,
          rawResponsePreview: rawResponse.slice(0, 1000),
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
      agentVersion: "Skill_Profiler_v1",
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
