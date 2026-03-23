import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobDescriptions, ejcpVersions, reviewQueue } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { invokeAgent, parseAgentJSON } from "@/lib/agents/invoke";
import { AGENT1_SYSTEM_PROMPT } from "@/lib/agents/agent1-prompt";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const { jdId } = await request.json();

    if (!jdId) {
      return NextResponse.json({ error: "jdId is required" }, { status: 400 });
    }

    const jd = await db
      .select()
      .from(jobDescriptions)
      .where(eq(jobDescriptions.id, jdId))
      .get();

    if (!jd) {
      return NextResponse.json(
        { error: "Job description not found" },
        { status: 404 }
      );
    }

    const userMessage = `Please classify the following job description against all 27 Ziggurat layers. Include rich category narratives and per-layer narrative analysis. Output valid JSON only.\n\n---\n\n${jd.rawText}`;

    let rawText: string;
    let truncated = false;
    try {
      const result = await invokeAgent(AGENT1_SYSTEM_PROMPT, userMessage, 32000);
      rawText = result.text;
      truncated = result.truncated;
    } catch (agentError) {
      console.error("Agent 1 invocation failed:", agentError);
      return NextResponse.json(
        {
          error: "Agent 1 processing failed",
          details: String(agentError),
        },
        { status: 502 }
      );
    }

    if (truncated) {
      console.warn(
        `[Agent1] Response was truncated (${rawText.length} chars). Attempting JSON repair.`
      );
    }

    let ejcpData;
    try {
      ejcpData = parseAgentJSON(rawText);
    } catch {
      // If truncated, retry with a more concise prompt
      if (truncated) {
        console.warn("[Agent1] JSON repair failed on truncated response. Retrying with concise instructions.");
        try {
          const conciseMessage = `Classify this job description against the 27 Ziggurat layers. Keep narratives to 2-3 sentences each. Keep category analysis to 1 paragraph each. Output valid JSON only.\n\n---\n\n${jd.rawText}`;
          const retryResult = await invokeAgent(AGENT1_SYSTEM_PROMPT, conciseMessage, 32000);
          rawText = retryResult.text;
          ejcpData = parseAgentJSON(rawText);
        } catch (retryError) {
          return NextResponse.json(
            {
              error: "Failed to parse Agent 1 response after retry",
              details: String(retryError),
              rawResponseLength: rawText.length,
            },
            { status: 422 }
          );
        }
      } else {
        return NextResponse.json(
          {
            error: "Failed to parse Agent 1 response",
            rawResponse: rawText,
          },
          { status: 422 }
        );
      }
    }

    const ejcpId = uuidv4();
    const now = new Date().toISOString();

    await db.insert(ejcpVersions).values({
      id: ejcpId,
      jdId,
      version: 1,
      data: JSON.stringify(ejcpData),
      validationStatus: "ai_enriched",
      agentVersion: "Ziggurat_Classifier_v2",
      createdAt: now,
    });

    const queueId = uuidv4();
    await db.insert(reviewQueue).values({
      id: queueId,
      entityType: "ejcp",
      entityId: ejcpId,
      gate: "gate1",
      status: "pending",
      createdAt: now,
    });

    return NextResponse.json({
      ejcpId,
      queueId,
      data: ejcpData,
    });
  } catch (error) {
    console.error("Agent 1 route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
