"use client";

import type { SkillEntry } from "@/lib/ziggurat/types";

interface SkillPillsProps {
  skills: SkillEntry[];
  selectedId?: string;
  onSelect: (skillId: string) => void;
  groupByCategory?: boolean;
  onRemove?: (skillId: string) => void;
}

const categoryColors: Record<string, string> = {
  "Core Role-Specific Skills": "bg-blue-50 text-blue-700 border-blue-300",
  "Baseline Applied Skills": "bg-green-50 text-green-700 border-green-300",
  "Foundational & Leadership Skills":
    "bg-amber-50 text-amber-700 border-amber-300",
  Specialization: "bg-purple-50 text-purple-700 border-purple-300",
};

const criticalityBadge: Record<string, string> = {
  must_have: "bg-red-600 text-white",
  important: "bg-amber-600 text-white",
  nice_to_have: "bg-slate-400 text-white",
  contextual: "bg-slate-300 text-slate-700",
};

export function SkillPills({
  skills,
  selectedId,
  onSelect,
  groupByCategory = true,
  onRemove,
}: SkillPillsProps) {
  if (!groupByCategory) {
    return (
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <SkillPill
            key={skill.skill_id}
            skill={skill}
            isSelected={selectedId === skill.skill_id}
            onClick={() => onSelect(skill.skill_id)}
            onRemove={onRemove ? () => onRemove(skill.skill_id) : undefined}
          />
        ))}
      </div>
    );
  }

  const groups = skills.reduce(
    (acc, skill) => {
      const cat = skill.bgt_category || "Uncategorized";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(skill);
      return acc;
    },
    {} as Record<string, SkillEntry[]>
  );

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([category, categorySkills]) => (
        <div key={category}>
          <h4 className="text-sm font-semibold text-slate-600 mb-2">
            {category}
          </h4>
          <div className="flex flex-wrap gap-2">
            {categorySkills.map((skill) => (
              <SkillPill
                key={skill.skill_id}
                skill={skill}
                isSelected={selectedId === skill.skill_id}
                onClick={() => onSelect(skill.skill_id)}
                onRemove={onRemove ? () => onRemove(skill.skill_id) : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SkillPill({
  skill,
  isSelected,
  onClick,
  onRemove,
}: {
  skill: SkillEntry;
  isSelected: boolean;
  onClick: () => void;
  onRemove?: () => void;
}) {
  const catColor =
    categoryColors[skill.bgt_category] ||
    "bg-slate-50 text-slate-700 border-slate-300";
  const critColor =
    criticalityBadge[skill.criticality] || "bg-slate-300 text-slate-700";

  return (
    <span className="inline-flex items-center">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border transition-all ${
          onRemove ? "rounded-l-full" : "rounded-full"
        } ${
          isSelected
            ? "bg-[#1B2A4A] text-white border-[#1B2A4A] shadow-md"
            : `${catColor} hover:shadow-sm`
        }`}
      >
        <span>{skill.skill_name}</span>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? "bg-white/20 text-white" : critColor}`}
        >
          L{skill.required_level}
        </span>
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className={`px-1.5 py-1.5 text-sm border border-l-0 rounded-r-full transition-colors ${
            isSelected
              ? "bg-[#1B2A4A] text-red-300 border-[#1B2A4A] hover:text-red-100"
              : "bg-white text-red-400 border-slate-300 hover:text-red-600 hover:bg-red-50"
          }`}
          title="Remove skill"
        >
          &times;
        </button>
      )}
    </span>
  );
}

export function ExtractedSkillPills({
  skills,
  onRemove,
}: {
  skills: string[];
  onRemove?: (skill: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <span
          key={skill}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-blue-50 text-blue-700 border border-blue-300"
        >
          {skill}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(skill)}
              className="ml-1 text-blue-400 hover:text-blue-600"
            >
              &times;
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

export function InferredSkillPills({
  skills,
  onRemove,
}: {
  skills: { skill: string; confidence: number }[];
  onRemove?: (skill: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((s, i) => (
        <span
          key={`${s.skill}-${i}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-purple-50 text-purple-700 border border-purple-300"
        >
          {s.skill}
          <span className="text-[10px] bg-purple-200 px-1 rounded">
            {s.confidence}%
          </span>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(s.skill)}
              className="ml-1 text-purple-400 hover:text-purple-600"
            >
              &times;
            </button>
          )}
        </span>
      ))}
    </div>
  );
}
