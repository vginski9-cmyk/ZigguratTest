"use client";

import { useEffect, useState, use } from "react";
import { SkillPills } from "@/components/SkillPills";
import { SkillDetail } from "@/components/SkillDetail";
import { ProfileBrief } from "@/components/ProfileBrief";
import Link from "next/link";
import type { SkillProfileData, AuditTrail, EJCPData } from "@/lib/ziggurat/types";

export default function ProfileViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [profileData, setProfileData] = useState<SkillProfileData | null>(null);
  const [ejcpData, setEjcpData] = useState<EJCPData | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditTrail | null>(null);
  const [jdInfo, setJdInfo] = useState<Record<string, unknown> | null>(null);
  const [profileStatus, setProfileStatus] = useState("");
  const [overallConfidence, setOverallConfidence] = useState(0);
  const [activeTab, setActiveTab] = useState<
    "overview" | "skills" | "context" | "audit" | "brief"
  >("overview");
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/profiles/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          setProfileData(data.profile.skills || null);
          setEjcpData(data.profile.ejcp || null);
          setAuditTrail(data.profile.auditTrail || null);
          setProfileStatus(data.profile.status || "");
          setOverallConfidence(data.profile.overallConfidence || 0);

          const skills = data.profile.skills?.skills;
          if (skills?.length > 0) {
            setSelectedSkill(skills[0].skill_id);
          }
        }
        if (data.jd) {
          setJdInfo(data.jd);
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

  const currentSkill = profileData.skills?.find(
    (s) => s.skill_id === selectedSkill
  );

  const critColors: Record<string, string> = {
    must_have: "bg-red-600 text-white",
    important: "bg-amber-600 text-white",
    nice_to_have: "bg-slate-500 text-white",
    contextual: "bg-slate-400 text-white",
  };

  const statusColors: Record<string, string> = {
    processing: "bg-blue-100 text-blue-700",
    validated: "bg-green-100 text-green-700",
    flagged: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/profiles" className="text-sm text-[#2E75B6] hover:underline">
          Profiles
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-500 truncate">
          {profileData.meta?.role_title || "Profile"}
        </span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-3xl font-bold text-[#1B2A4A] mb-1"
              style={{ fontFamily: "DM Serif Display, Georgia, serif" }}
            >
              {profileData.meta?.role_title || "Untitled Role"}
            </h1>
            <p className="text-lg text-[#3A5A8C]">
              {profileData.meta?.employer}
            </p>
            <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
              {profileData.meta?.location && (
                <span>{profileData.meta.location}</span>
              )}
              {profileData.meta?.onet_code && (
                <span className="font-mono">
                  O*NET: {profileData.meta.onet_code}
                </span>
              )}
              <span>{profileData.skills?.length || 0} skills</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {overallConfidence > 0 && (
              <span
                className={`text-sm font-medium px-3 py-1 rounded-full ${
                  overallConfidence >= 70
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {overallConfidence}% confidence
              </span>
            )}
            <span
              className={`text-xs px-2 py-1 rounded-full ${statusColors[profileStatus] || "bg-slate-100"}`}
            >
              {profileStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        {(
          [
            ["overview", "Overview"],
            ["skills", "Skills"],
            ["context", "EJCP Context"],
            ["audit", "Audit Trail"],
            ["brief", "Brief"],
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
            {key === "audit" && auditTrail && (
              <span className="ml-1.5 text-xs bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded-full">
                {(auditTrail.flagged_for_review?.length || 0)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Seed Skills */}
          {jdInfo && (jdInfo.seedSkills as string[])?.length > 0 && (
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold text-[#1B2A4A] mb-3">
                Original Seed Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {(jdInfo.seedSkills as string[]).map((s, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Skills Grid */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-[#1B2A4A] mb-4">
              Enriched Skills ({profileData.skills?.length || 0})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {profileData.skills?.map((skill) => (
                <button
                  key={skill.skill_id}
                  type="button"
                  onClick={() => {
                    setSelectedSkill(skill.skill_id);
                    setActiveTab("skills");
                  }}
                  className="text-left p-4 rounded-lg border hover:shadow-sm transition-shadow bg-slate-50 hover:bg-white"
                >
                  <div className="font-medium text-sm text-[#1B2A4A]">
                    {skill.skill_name}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {skill.definition}
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
                    {skill.seed_status && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          skill.seed_status === "confirmed"
                            ? "bg-green-100 text-green-700"
                            : skill.seed_status === "new"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {skill.seed_status}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Skills */}
      {activeTab === "skills" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border p-4 sticky top-4">
              <SkillPills
                skills={profileData.skills || []}
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

      {/* Tab: EJCP Context */}
      {activeTab === "context" && ejcpData && (
        <div className="space-y-6">
          {/* Category Narratives */}
          {ejcpData.category_narratives?.map((cat) => (
            <div key={cat.category} className="bg-white rounded-xl border p-6">
              <h3 className="text-lg font-semibold text-[#1B2A4A] mb-2">
                {cat.title}
              </h3>
              <p className="text-sm text-[#2E75B6] mb-3">{cat.summary}</p>
              <div className="text-sm text-slate-600 whitespace-pre-wrap">
                {cat.analysis}
              </div>
            </div>
          ))}

          {/* Layer Details */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="text-lg font-semibold text-[#1B2A4A] mb-4">
              Layer Classifications
            </h3>
            <div className="space-y-4">
              {Object.entries(ejcpData.layers || {}).map(([key, layer]) => {
                const l = layer as Record<string, unknown>;
                const conf = (l.confidence as number) || 0;
                return (
                  <div key={key} className="border-b pb-3 last:border-b-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs text-slate-500">
                        {key}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            l.provenance === "extracted"
                              ? "bg-green-100 text-green-700"
                              : l.provenance === "inferred"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {l.provenance as string}
                        </span>
                        <span className="text-xs text-slate-400">{conf}%</span>
                      </div>
                    </div>
                    <div className="text-sm text-slate-700">
                      {String(l.value || (l.values as string[])?.join(", ") || "-")}
                    </div>
                    {l.narrative ? (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {String(l.narrative)}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Audit Trail */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          {auditTrail ? (
            <>
              {/* Summary */}
              <div className="bg-white rounded-xl border p-6">
                <h3 className="text-lg font-semibold text-[#1B2A4A] mb-3">
                  Validation Summary
                </h3>
                <div className="text-sm text-slate-600 whitespace-pre-wrap">
                  {auditTrail.summary}
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-700">
                      {auditTrail.confirmed_items?.length || 0}
                    </div>
                    <div className="text-xs text-green-600">Confirmed</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-700">
                      {auditTrail.inferred_fixes?.length || 0}
                    </div>
                    <div className="text-xs text-blue-600">Fixes Applied</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-amber-700">
                      {auditTrail.flagged_for_review?.length || 0}
                    </div>
                    <div className="text-xs text-amber-600">Flagged</div>
                  </div>
                </div>
              </div>

              {/* Flagged Items */}
              {auditTrail.flagged_for_review?.length > 0 && (
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="text-lg font-semibold text-[#1B2A4A] mb-4">
                    Flagged for Review
                  </h3>
                  <div className="space-y-3">
                    {auditTrail.flagged_for_review.map((item, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border-l-4 ${
                          item.severity === "high"
                            ? "border-l-red-500 bg-red-50"
                            : item.severity === "medium"
                              ? "border-l-amber-500 bg-amber-50"
                              : "border-l-blue-500 bg-blue-50"
                        }`}
                      >
                        <div className="font-mono text-xs text-slate-500">
                          {item.field}
                        </div>
                        <div className="text-sm text-slate-700 mt-1">
                          {item.issue}
                        </div>
                        {item.suggestion && (
                          <div className="text-xs text-slate-500 mt-1">
                            Suggestion: {item.suggestion}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inferred Fixes */}
              {auditTrail.inferred_fixes?.length > 0 && (
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="text-lg font-semibold text-[#1B2A4A] mb-4">
                    Inferred Fixes Applied
                  </h3>
                  <div className="space-y-3">
                    {auditTrail.inferred_fixes.map((fix, i) => (
                      <div key={i} className="p-3 rounded-lg bg-blue-50">
                        <div className="font-mono text-xs text-slate-500">
                          {fix.field}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm">
                          <span className="line-through text-slate-400">
                            {fix.old_value}
                          </span>
                          <span className="text-slate-400">&rarr;</span>
                          <span className="text-blue-700 font-medium">
                            {fix.new_value}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {fix.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl border p-12 text-center text-slate-400">
              No audit trail available for this profile.
            </div>
          )}
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
