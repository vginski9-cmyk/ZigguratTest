import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { batchJobs, batchItems } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const batches = db
      .select()
      .from(batchJobs)
      .orderBy(desc(batchJobs.createdAt))
      .limit(50)
      .all();

    const batchesWithItems = batches.map((batch) => {
      const items = db
        .select()
        .from(batchItems)
        .where(eq(batchItems.batchId, batch.id))
        .all();

      return {
        ...batch,
        items: items.map((item) => ({
          id: item.id,
          jdId: item.jdId,
          status: item.status,
          enrichedProfileId: item.enrichedProfileId,
          error: item.error,
          completedAt: item.completedAt,
        })),
      };
    });

    return NextResponse.json(batchesWithItems);
  } catch (error) {
    console.error("[pipeline] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipeline data" },
      { status: 500 }
    );
  }
}
