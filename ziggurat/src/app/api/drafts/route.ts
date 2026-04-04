import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reviewDrafts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const { profileId, data, skillReviews } = await request.json();

    if (!profileId || !data) {
      return NextResponse.json({ error: "profileId and data required" }, { status: 400 });
    }

    // Upsert: delete old draft, insert new one
    const existing = await db
      .select()
      .from(reviewDrafts)
      .where(eq(reviewDrafts.profileId, profileId))
      .get();

    if (existing) {
      await db.delete(reviewDrafts).where(eq(reviewDrafts.profileId, profileId));
    }

    await db.insert(reviewDrafts).values({
      id: uuidv4(),
      profileId,
      data: JSON.stringify(data),
      skillReviews: JSON.stringify(skillReviews || {}),
      savedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Draft save error:", error);
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get("profileId");
  if (!profileId) {
    return NextResponse.json({ error: "profileId required" }, { status: 400 });
  }

  const draft = await db
    .select()
    .from(reviewDrafts)
    .where(eq(reviewDrafts.profileId, profileId))
    .get();

  if (!draft) {
    return NextResponse.json(null);
  }

  return NextResponse.json({
    data: JSON.parse(draft.data),
    skillReviews: JSON.parse(draft.skillReviews),
    savedAt: draft.savedAt,
  });
}
