"use client";

import { useState } from "react";
import type { SkillEntry } from "@/lib/ziggurat/types";

interface SkillDetailProps {
  skill: SkillEntry;
  editable?: boolean;
  onChange?: (updated: SkillEntry) => void;
  reviewStatus?: string;
  onReviewChange?: (status: string, notes: string) => void;
}

const labelColors: Record<string, string> = {
  "Durable Skill": "bg-green-50 text-green-700 border-green-300",
  "High Growth Skill": "bg-blue-50 text-blue-700 border-blue-300",
  "High Value Skill": "bg-amber-50 text-amber-700 border-amber-300",
  "Declining Skill": "bg-red-50 text-red-700 border-red-300",
};

const critColors: Record<string, string> = {
  must_have: "bg-red-600 text-white",
  important: "bg-amber-600 text-white",
  nice_to_have: "bg-slate-500 text-white",
  contextual: "bg-slate-400 text-white",
};

export function SkillDetail({
  skill,
  editable = false,
  onChange,
  reviewStatus,
  onReviewChange,
}: SkillDetailProps) {
  const [reviewNotes, setReviewNotes] = useState("");

  function updateField(field: keyof SkillEntry, value: unknown) {
    if (onChange) {
      onChange({ ...skill, [field]: value } as SkillEntry);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header badges */}
      <div className="flex flex-wrap gap-2 items-center">
        <span
          className={`px-3 py-1 rounded-full text-sm border font-medium ${labelColors[skill.label] || "bg-slate-100"}`}
        >
          {skill.label}
        </span>
        {editable ? (
          <select
            value={skill.criticality}
            onChange={(e) => updateField("criticality", e.target.value)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="must_have">Must Have</option>
            <option value="important">Important</option>
            <option value="nice_to_have">Nice to Have</option>
            <option value="contextual">Contextual</option>
          </select>
        ) : (
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${critColors[skill.criticality]}`}
          >
            {skill.criticality.replace("_", " ")}
          </span>
        )}
        {editable ? (
          <select
            value={skill.required_level}
            onChange={(e) =>
              updateField("required_level", parseInt(e.target.value))
            }
            className="text-sm border rounded px-2 py-1"
          >
            <option value={1}>Level 1</option>
            <option value={2}>Level 2</option>
            <option value={3}>Level 3</option>
          </select>
        ) : (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-[#2E75B6] text-white">
            Level {skill.required_level}
          </span>
        )}
      </div>

      {/* Adjustment Rationale */}
      {skill.adjustment_rationale && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h5 className="text-sm font-semibold text-yellow-800 mb-1">
            Contextual Adjustment Rationale
          </h5>
          <p className="text-sm text-yellow-700">
            {skill.adjustment_rationale}
          </p>
        </div>
      )}

      {/* Definition */}
      <div>
        <h5 className="text-sm font-semibold text-slate-700 mb-1">
          Definition
        </h5>
        {editable ? (
          <textarea
            value={skill.definition}
            onChange={(e) => updateField("definition", e.target.value)}
            className="w-full border rounded-lg p-3 text-sm"
            rows={3}
          />
        ) : (
          <p className="text-sm text-slate-600">{skill.definition}</p>
        )}
      </div>

      {/* How Utilized */}
      <div>
        <h5 className="text-sm font-semibold text-slate-700 mb-1">
          How Utilized
        </h5>
        {editable ? (
          <textarea
            value={skill.how_utilized}
            onChange={(e) => updateField("how_utilized", e.target.value)}
            className="w-full border rounded-lg p-3 text-sm"
            rows={3}
          />
        ) : (
          <p className="text-sm text-slate-600">{skill.how_utilized}</p>
        )}
      </div>

      {/* Proficiency Levels */}
      <div>
        <h5 className="text-sm font-semibold text-slate-700 mb-3">
          Proficiency Levels
        </h5>
        <div className="grid gap-3">
          {[1, 2, 3].map((level) => {
            const key =
              `proficiency_L${level}` as keyof SkillEntry;
            const isRequired = skill.required_level === level;
            return (
              <div
                key={level}
                className={`rounded-lg border-2 p-4 ${
                  isRequired
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold">Level {level}</span>
                  {isRequired && (
                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                      REQUIRED FOR THIS CONTEXT
                    </span>
                  )}
                </div>
                {editable ? (
                  <textarea
                    value={(skill[key] as string) || ""}
                    onChange={(e) => updateField(key, e.target.value)}
                    className="w-full border rounded p-2 text-sm"
                    rows={4}
                  />
                ) : (
                  <p className="text-sm text-slate-600">
                    {(skill[key] as string) || "—"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Knowledge Requirements */}
      <div>
        <h5 className="text-sm font-semibold text-slate-700 mb-3">
          Baseline Knowledge Requirements
        </h5>
        <div className="grid grid-cols-2 gap-4">
          {(
            [
              ["knowledge_domain", "Knowledge Domain"],
              ["knowledge_level", "Bloom's Level"],
              ["equivalent_coursework", "Equivalent Coursework"],
              ["assessment_indicator", "Assessment Indicator"],
            ] as const
          ).map(([field, label]) => (
            <div key={field}>
              <label className="text-xs text-slate-500">{label}</label>
              {editable ? (
                <input
                  type="text"
                  value={(skill[field] as string) || ""}
                  onChange={(e) => updateField(field, e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm mt-1"
                />
              ) : (
                <p className="text-sm text-slate-700 mt-1">
                  {(skill[field] as string) || "—"}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ability Requirements */}
      <div>
        <h5 className="text-sm font-semibold text-slate-700 mb-3">
          Ability Requirements
        </h5>
        <div className="grid grid-cols-3 gap-4">
          {(
            [
              ["abilities_cognitive", "Cognitive (L15)"],
              ["abilities_communication", "Communication (L11)"],
              ["abilities_dispositional", "Dispositional (L21)"],
            ] as const
          ).map(([field, label]) => (
            <div key={field}>
              <label className="text-xs text-slate-500">{label}</label>
              {editable ? (
                <textarea
                  value={(skill[field] as string) || ""}
                  onChange={(e) => updateField(field, e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm mt-1"
                  rows={3}
                />
              ) : (
                <p className="text-sm text-slate-700 mt-1">
                  {(skill[field] as string) || "—"}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Learning Modalities */}
      <div>
        <h5 className="text-sm font-semibold text-slate-700 mb-3">
          Preferred Learning Modalities
        </h5>
        <div className="space-y-2">
          {(skill.learning_modes || [])
            .sort((a, b) => a.rank - b.rank)
            .map((mode, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="text-xs font-bold bg-slate-200 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {mode.rank}
                </span>
                <div>
                  <span className="text-sm font-medium">{mode.mode}</span>
                  <p className="text-xs text-slate-500">{mode.why}</p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Education Mapping */}
      <div>
        <h5 className="text-sm font-semibold text-slate-700 mb-3">
          Education Program Mapping
        </h5>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {(
            [
              ["cip_primary", "CIP Primary"],
              ["credential_level", "Credential Level"],
              ["credit_hours", "Credit Hours"],
              ["experiential_hours", "Experiential Hours"],
              ["assessment_type", "Assessment Type"],
              ["bloom_target", "Bloom's Target"],
              ["refresh_cadence", "Refresh Cadence"],
            ] as const
          ).map(([field, label]) => (
            <div key={field}>
              <label className="text-xs text-slate-500">{label}</label>
              {editable ? (
                <input
                  type="text"
                  value={(skill[field] as string) || ""}
                  onChange={(e) => updateField(field, e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm mt-1"
                />
              ) : (
                <p className="text-slate-700 mt-1">
                  {(skill[field] as string) || "—"}
                </p>
              )}
            </div>
          ))}
          <div>
            <label className="text-xs text-slate-500">Program Fit</label>
            <p className="text-slate-700 mt-1">
              {(skill.program_fit || []).join(", ") || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Partnership Viability */}
      {skill.partnership && (
        <div>
          <h5 className="text-sm font-semibold text-slate-700 mb-2">
            Partnership Viability
          </h5>
          <div
            className={`rounded-lg border p-4 ${
              skill.partnership.rating === "high"
                ? "bg-green-50 border-green-300"
                : skill.partnership.rating === "moderate"
                  ? "bg-yellow-50 border-yellow-300"
                  : "bg-red-50 border-red-300"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {editable ? (
                <select
                  value={skill.partnership.rating}
                  onChange={(e) =>
                    updateField("partnership", {
                      ...skill.partnership,
                      rating: e.target.value,
                    })
                  }
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="high">High</option>
                  <option value="moderate">Moderate</option>
                  <option value="low">Low</option>
                  <option value="not_viable">Not Viable</option>
                </select>
              ) : (
                <span className="text-sm font-semibold capitalize">
                  {skill.partnership.rating}
                </span>
              )}
            </div>
            {editable ? (
              <textarea
                value={skill.partnership.text}
                onChange={(e) =>
                  updateField("partnership", {
                    ...skill.partnership,
                    text: e.target.value,
                  })
                }
                className="w-full border rounded p-2 text-sm"
                rows={3}
              />
            ) : (
              <p className="text-sm">{skill.partnership.text}</p>
            )}
          </div>
        </div>
      )}

      {/* Review Controls */}
      {onReviewChange && (
        <div className="border-t pt-4 mt-4">
          <h5 className="text-sm font-semibold text-slate-700 mb-3">
            Review Decision
          </h5>
          <div className="flex gap-2 mb-3">
            {[
              ["approved", "Approved", "bg-green-50 text-green-600 border-green-500"],
              ["needs_revision", "Needs Revision", "bg-amber-50 text-amber-600 border-amber-500"],
              ["rejected", "Rejected", "bg-red-50 text-red-600 border-red-500"],
            ].map(([status, label, colors]) => (
              <button
                key={status}
                type="button"
                onClick={() => onReviewChange(status, reviewNotes)}
                className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                  reviewStatus === status
                    ? colors
                    : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <textarea
            placeholder="Review notes..."
            value={reviewNotes}
            onChange={(e) => {
              setReviewNotes(e.target.value);
              if (reviewStatus) {
                onReviewChange(reviewStatus, e.target.value);
              }
            }}
            className="w-full border rounded-lg p-3 text-sm"
            rows={2}
          />
        </div>
      )}
    </div>
  );
}
