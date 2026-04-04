"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { SkillPills } from "@/components/SkillPills";
import { SkillDetail } from "@/components/SkillDetail";
import { ProfileBrief } from "@/components/ProfileBrief";
import { ReviewControls } from "@/components/ReviewControls";
import { ZigguratContextPanel } from "@/components/ZigguratContextPanel";
import type { SkillProfileData, SkillEntry } from "@/lib/ziggurat/types";

function newBlankSkill(): SkillEntry {
  const id = crypto.randomUUID();
  return {
    skill_id: id,
    skill_name: "New Skill",
    bgt_category: "Core Role-Specific Skills",
    label: "Durable Skill",
    criticality: "important",
    required_level: 2,
    definition: "",
    how_utilized: "",
    proficiency_L1: "",
    proficiency_L2: "",
    proficiency_L3: "",
    knowledge_domain: "",
    knowledge_level: "",
    equivalent_coursework: "",
    assessment_indicator: "",
    abilities_cognitive: "",
    abilities_communication: "",
    abilities_dispositional: "",
    learning_modes: [],
    cip_primary: "",
    cip_secondary: [],
    credential_level: "",
    credit_hours: "",
    experiential_hours: "",
    assessment_type: "",
    bloom_target: "",
    program_fit: [],
    refresh_cadence: "",
    partnership: { rating: "moderate", text: "" },
    adjustment_rationale: "",
    source_evidence: [],
  };
}

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
  const [draftStatus, setDraftStatus] = useState<"saved" | "unsaved" | "saving" | "">("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save draft
  const saveDraft = useCallback(async () => {
    if (!profileData) return;
    setDraftStatus("saving");
    try {
      await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: id, data: profileData, skillReviews }),
      });
      setDraftStatus("saved");
    } catch {
      setDraftStatus("unsaved");
    }
  }, [id, profileData, skillReviews]);

  // Trigger auto-save on changes (debounced 5s)
  useEffect(() => {
    if (!profileData || loading) return;
    setDraftStatus("unsaved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveDraft(), 5000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [profileData, skillReviews, saveDraft, loading]);

  useEffect(() => {
    async function loadData() {
      try {
        // Try loading draft first
        const draftRes = await fetch(`/api/drafts?profileId=${id}`);
        const draft = draftRes.ok ? await draftRes.json() : null;

        const profileRes = await fetch(`/api/profiles/${id}`);
        const data = await profileRes.json();

        if (draft?.data) {
          setProfileData(draft.data);
          setSkillReviews(draft.skillReviews || {});
          setDraftStatus("saved");
        } else if (data.profile?.data) {
          setProfileData(data.profile.data);
        }

        if (!draft?.data && data.profile?.data?.skills?.length > 0) {
          setSelectedSkill(data.profile.data.skills[0].skill_id);
        } else if (draft?.data?.skills?.length > 0) {
          setSelectedSkill(draft.data.skills[0].skill_id);
        }

        if (data.ejcp?.data?.layers) {
          setEjcpLayers(data.ejcp.data.layers);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
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

  function addSkill() {
    if (!profileData) return;
    const skill = newBlankSkill();
    setProfileData({
      ...profileData,
      skills: [...profileData.skills, skill],
    });
    setSelectedSkill(skill.skill_id);
  }

  function removeSkill(skillId: string) {
    if (!profileData) return;
    const updated = profileData.skills.filter((s) => s.skill_id !== skillId);
    setProfileData({ ...profileData, skills: updated });
    if (selectedSkill === skillId && updated.length > 0) {
      setSelectedSkill(updated[0].skill_id);
    }
    const newReviews = { ...skillReviews };
    delete newReviews[skillId];
    setSkillReviews(newReviews);
  }

  function bulkApprove(filter?: "must_have") {
    if (!profileData) return;
    const newReviews = { ...skillReviews };
    for (const skill of profileData.skills) {
      if (!filter || skill.criticality === filter) {
        newReviews[skill.skill_id] = { status: "approved", notes: newReviews[skill.skill_id]?.notes || "" };
      }
    }
    setSkillReviews(newReviews);
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

      {/* Reviewer ID + Draft status */}
      <div className="mb-6 flex items-center gap-4">
        <input
          type="text"
          value={reviewerId}
          onChange={(e) => setReviewerId(e.target.value)}
          placeholder="Reviewer ID"
          className="border rounded-lg px-4 py-2 text-sm w-64"
        />
        {draftStatus === "saved" && (
          <span className="text-xs text-green-600">Draft saved</span>
        )}
        {draftStatus === "unsaved" && (
          <span className="text-xs text-amber-600">Unsaved changes</span>
        )}
        {draftStatus === "saving" && (
          <span className="text-xs text-slate-400">Saving...</span>
        )}
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
        <div>
          {/* Bulk Actions Toolbar */}
          <div className="flex flex-wrap gap-2 mb-4 p-3 bg-slate-50 rounded-lg border">
            <button
              type="button"
              onClick={() => bulkApprove()}
              className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-300 rounded-md hover:bg-green-100"
            >
              Approve All
            </button>
            <button
              type="button"
              onClick={() => bulkApprove("must_have")}
              className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-300 rounded-md hover:bg-blue-100"
            >
              Approve Must-Have
            </button>
            <div className="border-l mx-1" />
            <button
              type="button"
              onClick={addSkill}
              className="px-3 py-1.5 text-xs font-medium bg-[#1B2A4A] text-white rounded-md hover:bg-[#2a3d5e]"
            >
              + Add Skill
            </button>
            <button
              type="button"
              onClick={() => saveDraft()}
              className="px-3 py-1.5 text-xs font-medium bg-white text-slate-600 border rounded-md hover:bg-slate-50 ml-auto"
            >
              Save Draft
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Skill list */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border p-4 sticky top-4">
              <SkillPills
                skills={profileData.skills}
                selectedId={selectedSkill}
                onSelect={setSelectedSkill}
                groupByCategory={true}
                onRemove={removeSkill}
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
