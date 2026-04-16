import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enrichedProfiles, jobDescriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = db
      .select()
      .from(enrichedProfiles)
      .where(eq(enrichedProfiles.id, id))
      .get();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const jd = db
      .select()
      .from(jobDescriptions)
      .where(eq(jobDescriptions.id, profile.jdId))
      .get();

    return NextResponse.json({
      profile: {
        id: profile.id,
        jdId: profile.jdId,
        status: profile.status,
        overallConfidence: profile.overallConfidence,
        createdAt: profile.createdAt,
        ejcp: JSON.parse(profile.ejcpData),
        skills: JSON.parse(profile.skillData),
        auditTrail: profile.auditTrail ? JSON.parse(profile.auditTrail) : null,
      },
      jd: jd
        ? {
            id: jd.id,
            jobTitle: jd.jobTitle,
            company: jd.company,
            location: jd.location,
            onetCode: jd.onetCode,
            seedSkills: jd.seedSkills ? JSON.parse(jd.seedSkills) : [],
            postingUrl: jd.postingUrl,
            rawText: jd.rawText,
          }
        : null,
    });
  } catch (error) {
    console.error("[profiles/id] Error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
