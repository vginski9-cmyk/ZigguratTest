import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { skillProfiles, ejcpVersions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const profiles = await db
      .select()
      .from(skillProfiles)
      .orderBy(desc(skillProfiles.createdAt))
      .all();

    const enrichedProfiles = await Promise.all(
      profiles.map(async (profile) => {
        const ejcp = await db
          .select()
          .from(ejcpVersions)
          .where(eq(ejcpVersions.id, profile.ejcpId))
          .get();

        let profileData;
        try {
          profileData = JSON.parse(profile.data);
        } catch {
          profileData = null;
        }

        let ejcpData;
        try {
          ejcpData = ejcp ? JSON.parse(ejcp.data) : null;
        } catch {
          ejcpData = null;
        }

        return {
          id: profile.id,
          ejcpId: profile.ejcpId,
          version: profile.version,
          validationStatus: profile.validationStatus,
          createdAt: profile.createdAt,
          roleTitle: profileData?.meta?.role_title || "Untitled Role",
          employer: profileData?.meta?.employer || "Unknown Employer",
          location: profileData?.meta?.location || "Unknown",
          skillCount: profileData?.skills?.length || 0,
          socCode: profileData?.meta?.soc_code || "",
          ejcpData,
          profileData,
        };
      })
    );

    return NextResponse.json(enrichedProfiles);
  } catch (error) {
    console.error("Profiles fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profiles" },
      { status: 500 }
    );
  }
}
