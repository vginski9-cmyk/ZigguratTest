import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { skillProfiles, ejcpVersions, jobDescriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = await db
      .select()
      .from(skillProfiles)
      .where(eq(skillProfiles.id, id))
      .get();

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    const ejcp = await db
      .select()
      .from(ejcpVersions)
      .where(eq(ejcpVersions.id, profile.ejcpId))
      .get();

    let jd = null;
    if (ejcp) {
      jd = await db
        .select()
        .from(jobDescriptions)
        .where(eq(jobDescriptions.id, ejcp.jdId))
        .get();
    }

    return NextResponse.json({
      profile: {
        ...profile,
        data: JSON.parse(profile.data),
      },
      ejcp: ejcp
        ? {
            ...ejcp,
            data: JSON.parse(ejcp.data),
          }
        : null,
      jd,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
