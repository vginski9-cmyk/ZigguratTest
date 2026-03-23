import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ejcpVersions, jobDescriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ejcp = await db
      .select()
      .from(ejcpVersions)
      .where(eq(ejcpVersions.id, id))
      .get();

    if (!ejcp) {
      return NextResponse.json(
        { error: "EJCP not found" },
        { status: 404 }
      );
    }

    const jd = await db
      .select()
      .from(jobDescriptions)
      .where(eq(jobDescriptions.id, ejcp.jdId))
      .get();

    return NextResponse.json({
      ejcp: {
        ...ejcp,
        data: JSON.parse(ejcp.data),
      },
      jd,
    });
  } catch (error) {
    console.error("EJCP fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch EJCP" },
      { status: 500 }
    );
  }
}
