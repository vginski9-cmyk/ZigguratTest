import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  ejcpVersions,
  skillProfiles,
  skillReviews,
  reviewQueue,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      entityType,
      entityId,
      data,
      reviewerId,
      gate,
      skillReviewData,
      changeDiff,
    } = body;

    const now = new Date().toISOString();

    if (entityType === "ejcp") {
      // Get existing EJCP
      const existing = await db
        .select()
        .from(ejcpVersions)
        .where(eq(ejcpVersions.id, entityId))
        .get();

      if (!existing) {
        return NextResponse.json(
          { error: "EJCP not found" },
          { status: 404 }
        );
      }

      // Create new version
      const newId = uuidv4();
      await db.insert(ejcpVersions).values({
        id: newId,
        jdId: existing.jdId,
        employerId: existing.employerId,
        version: existing.version + 1,
        data: JSON.stringify(data),
        validationStatus: "human_verified",
        agentVersion: existing.agentVersion,
        reviewerId: reviewerId || null,
        reviewedAt: now,
        changeDiff: changeDiff ? JSON.stringify(changeDiff) : null,
        createdAt: now,
      });

      // Complete the gate1 queue item
      const queueItems = await db
        .select()
        .from(reviewQueue)
        .where(
          and(
            eq(reviewQueue.entityId, entityId),
            eq(reviewQueue.gate, "gate1")
          )
        )
        .all();

      for (const item of queueItems) {
        await db
          .update(reviewQueue)
          .set({ status: "completed", completedAt: now })
          .where(eq(reviewQueue.id, item.id));
      }

      return NextResponse.json({ newId, entityType: "ejcp" });
    }

    if (entityType === "profile") {
      const existing = await db
        .select()
        .from(skillProfiles)
        .where(eq(skillProfiles.id, entityId))
        .get();

      if (!existing) {
        return NextResponse.json(
          { error: "Skill profile not found" },
          { status: 404 }
        );
      }

      // Create new version
      const newId = uuidv4();
      await db.insert(skillProfiles).values({
        id: newId,
        ejcpId: existing.ejcpId,
        version: existing.version + 1,
        data: JSON.stringify(data),
        validationStatus: gate === "publish" ? "published" : "human_verified",
        agentVersion: existing.agentVersion,
        reviewerId: reviewerId || null,
        reviewedAt: now,
        changeDiff: changeDiff ? JSON.stringify(changeDiff) : null,
        createdAt: now,
      });

      // Save individual skill reviews
      if (skillReviewData && Array.isArray(skillReviewData)) {
        for (const review of skillReviewData) {
          await db.insert(skillReviews).values({
            id: uuidv4(),
            profileId: newId,
            skillId: review.skillId,
            status: review.status,
            reviewerId: reviewerId || null,
            notes: review.notes || null,
            reviewedAt: now,
          });
        }
      }

      // Complete gate2 queue items
      const queueItems = await db
        .select()
        .from(reviewQueue)
        .where(
          and(
            eq(reviewQueue.entityId, entityId),
            eq(reviewQueue.gate, "gate2")
          )
        )
        .all();

      for (const item of queueItems) {
        await db
          .update(reviewQueue)
          .set({ status: "completed", completedAt: now })
          .where(eq(reviewQueue.id, item.id));
      }

      return NextResponse.json({
        newId,
        entityType: "profile",
        published: gate === "publish",
      });
    }

    return NextResponse.json(
      { error: "Invalid entityType" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Validate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
