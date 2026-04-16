import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enrichedProfiles, jobDescriptions } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const profiles = db
      .select()
      .from(enrichedProfiles)
      .orderBy(desc(enrichedProfiles.createdAt))
      .limit(200)
      .all();

    const results = profiles.map((profile) => {
      const jd = db
        .select({
          jobTitle: jobDescriptions.jobTitle,
          company: jobDescriptions.company,
          location: jobDescriptions.location,
          onetCode: jobDescriptions.onetCode,
        })
        .from(jobDescriptions)
        .where(eq(jobDescriptions.id, profile.jdId))
        .get();

      let skillCount = 0;
      let roleTitle = "";
      try {
        const skillData = JSON.parse(profile.skillData);
        skillCount = skillData?.skills?.length || skillData?.meta?.total_skills || 0;
        roleTitle = skillData?.meta?.role_title || "";
      } catch { /* ignore */ }

      return {
        id: profile.id,
        jdId: profile.jdId,
        jobTitle: jd?.jobTitle || roleTitle || "Untitled",
        company: jd?.company || "",
        location: jd?.location || "",
        onetCode: jd?.onetCode || "",
        status: profile.status,
        overallConfidence: profile.overallConfidence,
        skillCount,
        createdAt: profile.createdAt,
      };
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("[profiles] Error:", error);
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
  }
}
