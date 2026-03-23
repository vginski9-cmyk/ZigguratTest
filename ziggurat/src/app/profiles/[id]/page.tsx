"use client";

import { useEffect, useState, use } from "react";
import { ZigguratContextPanel } from "@/components/ZigguratContextPanel";
import { SkillPills } from "@/components/SkillPills";
import { SkillDetail } from "@/components/SkillDetail";
import { ProfileBrief } from "@/components/ProfileBrief";
import type { SkillProfileData } from "@/lib/ziggurat/types";

export default function ProfileViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [profileData, setProfileData] = useState<SkillProfileData | null>(null);
  const [ejcpLayers, setEjcpLayers] = useState<Record<string, unknown> | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<
    "overview" | "skills" | "brief"
  >("overview");
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center py-12 text-slate-400">Loading...</div>
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

  const critColors: Record<string, string> = {
    must_have: "bg-red-600 text-white",
    important: "bg-amber-600 text-white",
    nice_to_have: "bg-slate-500 text-white",
    contextual: "bg-slate-400 text-white",
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <h1 className="text-3xl font-bold text-[#1B2A4A] mb-1">
          {profileData.meta?.role_title || "Untitled Role"}
        </h1>
        <p className="text-lg text-[#3A5A8C]">
          {profileData.meta?.employer}
        </p>
        <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
          <span>{profileData.meta?.location}</span>
          {profileData.meta?.soc_code && (
            <span className="font-mono">
              SOC: {profileData.meta.soc_code}
            </span>
          )}
          {profileData.meta?.onet_code && (
            <span className="font-mono">
              O*NET: {profileData.meta.onet_code}
            </span>
          )}
          <span>{profileData.skills?.length || 0} skills</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        {(
          [
            ["overview", "Full Profile"],
            ["skills", "Skill Details"],
            ["brief", "Profile Brief"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === key
                ? "bg-white text-[#1B2A4A] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Ziggurat Context */}
          {ejcpLayers && (
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold text-[#1B2A4A] mb-4">
                Ziggurat Context Classification
              </h2>
              <ZigguratContextPanel
                layers={ejcpLayers as Record<string, { value?: string; values?: string[]; confidence: number; provenance: string; evidence: string }>}
                editable={false}
              />
            </div>
          )}

          {/* Skill Summary */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-[#1B2A4A] mb-4">
              Skills Summary
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {profileData.skills.map((skill) => (
                <button
                  key={skill.skill_id}
                  type="button"
                  onClick={() => {
                    setSelectedSkill(skill.skill_id);
                    setActiveTab("skills");
                  }}
                  className="text-left p-4 rounded-lg border hover:shadow-sm transition-shadow bg-slate-50 hover:bg-white"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-[#1B2A4A]">
                      {skill.skill_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${critColors[skill.criticality]}`}
                    >
                      {skill.criticality.replace("_", " ")}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2E75B6] text-white">
                      L{skill.required_level}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {skill.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Skill Details */}
      {activeTab === "skills" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
          <div className="lg:col-span-2">
            {currentSkill ? (
              <div className="bg-white rounded-xl border p-6">
                <h3 className="text-xl font-semibold text-[#1B2A4A] mb-4">
                  {currentSkill.skill_name}
                </h3>
                <SkillDetail skill={currentSkill} editable={false} />
              </div>
            ) : (
              <div className="bg-white rounded-xl border p-12 text-center text-slate-400">
                Select a skill to view details
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Brief */}
      {activeTab === "brief" && profileData.brief && (
        <div className="bg-white rounded-xl border p-6">
          <ProfileBrief brief={profileData.brief} editable={false} />
        </div>
      )}
    </div>
  );
}
