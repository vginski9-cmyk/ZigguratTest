"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { SkillPills } from "@/components/SkillPills";
import { SkillDetail } from "@/components/SkillDetail";
import { ProfileBrief } from "@/components/ProfileBrief";
import { ReviewControls } from "@/components/ReviewControls";
import { ZigguratContextPanel } from "@/components/ZigguratContextPanel";
import type { SkillProfileData, SkillEntry } from "@/lib/ziggurat/types";

export default function Gate2ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [profileData, setProfileData] = useState<SkillProfileData | null>(null);
  const [ejcpLayers, setEjcpLayers] = useState<Record<string, unknown> | null>(
    null
  );
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [skillReviews, setSkillReviews] = useState<
    Record<string, { status: string; notes: string }>
  >({});
  const [activeTab, setActiveTab] = useState<"skills" | "brief">("skills");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [showContext, setShowContext] = useState(false);

  useEffect(() => {
    fetch(`/api/profiles/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.profile?.data) {
          setProfileData(data.profile.data);
          if (data.profile.data.skills?.length > 0) {
            setSelectedSkill(data.profile.data.skills[0].skill_id);
          }
        }
        if (data.ejcp?.data?.layers) {
          setEjcpLayers(data.ejcp.data.layers);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  function updateSkill(updated: SkillEntry) {
    if (!profileData) return;
    setProfileData({
      ...profileData,
      skills: profileData.skills.map((s) =>
        s.skill_id === updated.skill_id ? updated : s
      ),
    });
  }

  async function handlePublish() {
    if (!profileData) return;

    // Check that all must_have skills are approved
    const mustHaveSkills = profileData.skills.filter(
      (s) => s.criticality === "must_have"
    );
    const unapproved = mustHaveSkills.filter(
      (s) => skillReviews[s.skill_id]?.status !== "approved"
    );

    if (unapproved.length > 0) {
      setError(
        `${unapproved.length} must-have skill(s) need to be approved before publishing.`
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "profile",
          entityId: id,
          data: profileData,
          reviewerId,
          gate: "publish",
          skillReviewData: Object.entries(skillReviews).map(
            ([skillId, review]) => ({
              skillId,
              status: review.status,
              notes: review.notes,
            })
          ),
        }),
      });

      if (!res.ok) throw new Error("Failed to publish");

      const { newId } = await res.json();
      router.push(`/profiles/${newId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to publish profile"
      );
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center py-12 text-slate-400">
          Loading skill profile...
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center py-12 text-slate-500">
          Profile not found.
        </div>
      </div>
    );
  }

  const currentSkill = profileData.skills.find(
    (s) => s.skill_id === selectedSkill
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <span>Gate 2</span>
          <span>/</span>
          <span>Skill Profile Review</span>
        </div>
        <h1 className="text-3xl font-bold text-[#1B2A4A]">
          {profileData.meta?.role_title || "Skill Profile Review"}
        </h1>
        <p className="text-slate-500 mt-1">
          {profileData.meta?.employer} — {profileData.meta?.location}
        </p>
      </div>

      {/* Reviewer ID */}
      <div className="mb-6">
        <input
          type="text"
          value={reviewerId}
          onChange={(e) => setReviewerId(e.target.value)}
          placeholder="Reviewer ID"
          className="border rounded-lg px-4 py-2 text-sm w-64"
        />
      </div>

      {/* Ziggurat Context Summary (collapsible) */}
      {ejcpLayers && (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowContext(!showContext)}
            className="flex items-center gap-2 text-sm text-[#3A5A8C] hover:text-[#1B2A4A]"
          >
            {showContext ? "▼" : "▶"} Ziggurat Context (read-only)
          </button>
          {showContext && (
            <div className="mt-3 bg-white rounded-xl border p-6">
              <ZigguratContextPanel
                layers={ejcpLayers as Record<string, { value?: string; values?: string[]; confidence: number; provenance: string; evidence: string }>}
                editable={false}
              />
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("skills")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "skills"
              ? "bg-white text-[#1B2A4A] shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Skills ({profileData.skills.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("brief")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "brief"
              ? "bg-white text-[#1B2A4A] shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Profile Brief
        </button>
      </div>

      {activeTab === "skills" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Skill list */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border p-4 sticky top-4">
              <SkillPills
                skills={profileData.skills}
                selectedId={selectedSkill}
                onSelect={setSelectedSkill}
                groupByCategory={true}
              />
            </div>
          </div>

          {/* Skill detail */}
          <div className="lg:col-span-2">
            {currentSkill ? (
              <div className="bg-white rounded-xl border p-6">
                <h3 className="text-xl font-semibold text-[#1B2A4A] mb-4">
                  {currentSkill.skill_name}
                </h3>
                <SkillDetail
                  skill={currentSkill}
                  editable={true}
                  onChange={updateSkill}
                  reviewStatus={skillReviews[currentSkill.skill_id]?.status}
                  onReviewChange={(status, notes) =>
                    setSkillReviews((prev) => ({
                      ...prev,
                      [currentSkill.skill_id]: { status, notes },
                    }))
                  }
                />
              </div>
            ) : (
              <div className="bg-white rounded-xl border p-12 text-center text-slate-400">
                Select a skill to review
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "brief" && (
        <div className="bg-white rounded-xl border p-6">
          <ProfileBrief
            brief={profileData.brief}
            editable={true}
            onChange={(brief) =>
              setProfileData({ ...profileData, brief })
            }
          />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 mt-4">
          {error}
        </div>
      )}

      <ReviewControls
        onValidate={handlePublish}
        validateLabel="Validate & Publish"
        loading={submitting}
      />
    </div>
  );
}
