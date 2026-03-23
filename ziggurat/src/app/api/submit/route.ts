import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobDescriptions } from "@/lib/db/schema";
import { hashText } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rawText, sourceUrl, submittedBy } = body;

    if (!rawText || typeof rawText !== "string" || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: "Job description text is required" },
        { status: 400 }
      );
    }

    const id = uuidv4();
    const textHash = hashText(rawText);

    await db.insert(jobDescriptions).values({
      id,
      rawText: rawText.trim(),
      sourceUrl: sourceUrl || null,
      textHash,
      submittedBy: submittedBy || null,
      submittedAt: new Date().toISOString(),
    });

    return NextResponse.json({ id, textHash });
  } catch (error) {
    console.error("Submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit job description" },
      { status: 500 }
    );
  }
}
