import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { batchJobs, batchItems, jobDescriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const batch = db
      .select()
      .from(batchJobs)
      .where(eq(batchJobs.id, id))
      .get();

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const items = db
      .select()
      .from(batchItems)
      .where(eq(batchItems.batchId, id))
      .all();

    // Enrich items with JD info
    const enrichedItems = items.map((item) => {
      let jdInfo = null;
      if (item.jdId) {
        const jd = db
          .select({
            jobTitle: jobDescriptions.jobTitle,
            company: jobDescriptions.company,
            location: jobDescriptions.location,
            onetCode: jobDescriptions.onetCode,
          })
          .from(jobDescriptions)
          .where(eq(jobDescriptions.id, item.jdId))
          .get();
        jdInfo = jd;
      }
      return { ...item, jd: jdInfo };
    });

    return NextResponse.json({ ...batch, items: enrichedItems });
  } catch (error) {
    console.error("[pipeline/id] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch batch" },
      { status: 500 }
    );
  }
}
