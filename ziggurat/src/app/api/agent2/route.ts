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
    const userMessage = `Here is the validated EJCP. Produce a Contextualized Skill Profile. Output valid JSON only.\n\n${JSON.stringify(ejcpData, null, 2)}`;

    let rawResponse: string;
    try {
      rawResponse = await invokeAgent(AGENT2_SYSTEM_PROMPT, userMessage, 32000);
    } catch (agentError) {
      console.error("Agent 2 invocation failed:", agentError);
      return NextResponse.json(
        {
          error: "Agent 2 processing failed",
          details: String(agentError),
        },
        { status: 502 }
      );
    }

    let profileData;
    try {
      profileData = parseAgentJSON(rawResponse);
    } catch (parseError) {
      console.error("Agent 2 parse failed:", parseError);
      console.error("Raw response length:", rawResponse.length);
      console.error("Raw response (first 500 chars):", rawResponse.slice(0, 500));
      return NextResponse.json(
        {
          error: "Failed to parse Agent 2 response",
          details: String(parseError),
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
