"use client";

import { useState } from "react";

interface ProfileBriefProps {
  brief: {
    for_business: string;
    for_learner: string;
    for_educator: string;
  };
  editable?: boolean;
  onChange?: (brief: {
    for_business: string;
    for_learner: string;
    for_educator: string;
  }) => void;
}

const sections = [
  {
    key: "for_business" as const,
    title: "For the Business",
    description: "Written to the employer/hiring manager",
  },
  {
    key: "for_learner" as const,
    title: "For the Learner",
    description: "Written to someone considering or performing this role",
  },
  {
    key: "for_educator" as const,
    title: "For the Educator",
    description: "Written to curriculum designers and program directors",
  },
];

export function ProfileBrief({
  brief,
  editable = false,
  onChange,
}: ProfileBriefProps) {
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <div key={section.key}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-[#1B2A4A]">
                {section.title}
              </h3>
              <p className="text-xs text-slate-500">{section.description}</p>
            </div>
            {editable && (
              <button
                type="button"
                onClick={() =>
                  setEditMode((prev) => ({
                    ...prev,
                    [section.key]: !prev[section.key],
                  }))
                }
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {editMode[section.key] ? "Preview" : "Edit"}
              </button>
            )}
          </div>
          {editable && editMode[section.key] ? (
            <textarea
              value={brief[section.key] || ""}
              onChange={(e) =>
                onChange?.({ ...brief, [section.key]: e.target.value })
              }
              className="w-full border rounded-lg p-4 text-sm min-h-[200px]"
            />
          ) : (
            <div className="prose prose-sm max-w-none text-slate-700 bg-white rounded-lg border p-6">
              {(brief[section.key] || "No content available.").split("\n\n").map((para, i) => (
                <p key={i} className="mb-3 last:mb-0">
                  {para}
                </p>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
