"use client";

import { useState } from "react";
import { ZIGGURAT_LAYERS, CATEGORY_NAMES } from "@/lib/ziggurat/enums";
import { EnumSelector } from "./EnumSelector";
import { ConfidenceBadge, ProvenanceBadge } from "./ConfidenceBadge";
import type { CategoryNarrative } from "@/lib/ziggurat/types";

interface LayerData {
  value?: string;
  values?: string[];
  confidence: number;
  provenance: string;
  evidence: string;
  narrative?: string;
  [key: string]: unknown;
}

interface ZigguratContextPanelProps {
  layers: Record<string, LayerData>;
  categoryNarratives?: CategoryNarrative[];
  editable?: boolean;
  onChange?: (layers: Record<string, LayerData>) => void;
  onNarrativeChange?: (narratives: CategoryNarrative[]) => void;
}

// Map from layer IDs in enums.ts to EJCP data keys
const LAYER_KEY_MAP: Record<string, string> = {
  L2: "L2_business_model",
  L4: "L4_scale",
  L5: "L5_lifecycle",
  L6: "L6_digital_maturity",
  L7: "L7_geography",
  L8: "L8_regulatory",
  L9: "L9_role_definition",
  L11: "L11_interaction",
  L12: "L12_proficiency",
  L14_physical: "L14_work_mode",
  L14_temporal: "L14_work_mode",
  L15: "L15_cognitive_load",
  L16: "L16_interdependence",
  L17: "L17_liability",
  L21_psychosocial: "L21_work_design",
  L21_autonomy: "L21_work_design",
  L22_supervision: "L22_growth",
  L22_advancement: "L22_growth",
  L23: "L23_stability",
  L25_readiness: "L25_training",
  L25_partnership: "L25_training",
};

function getLayerValue(
  layerId: string,
  layers: Record<string, LayerData>
): string | string[] {
  const dataKey = LAYER_KEY_MAP[layerId] || layerId;
  const data = layers[dataKey];
  if (!data) return "";

  if (layerId === "L14_physical") return (data.physical as string) || "";
  if (layerId === "L14_temporal") return (data.temporal as string) || "";
  if (layerId === "L21_psychosocial")
    return (data.psychosocial as string) || "";
  if (layerId === "L21_autonomy") return (data.task_autonomy as string) || "";
  if (layerId === "L22_supervision")
    return (data.supervision_model as string) || "";
  if (layerId === "L22_advancement")
    return (data.advancement_pathway as string) || "";
  if (layerId === "L23")
    return (data.schedule_predictability as string) || "";
  if (layerId === "L25_readiness")
    return (data.internal_readiness as string) || "";
  if (layerId === "L25_partnership")
    return (data.partnership_quadrant as string) || "";
  if (layerId === "L9") return (data.role_level as string) || "";

  if (data.values && Array.isArray(data.values)) return data.values;

  return (data.value as string) || "";
}

function getLayerMeta(
  layerId: string,
  layers: Record<string, LayerData>
): { confidence: number; provenance: string; evidence: string; narrative: string } {
  const dataKey = LAYER_KEY_MAP[layerId] || layerId;
  const data = layers[dataKey];
  return {
    confidence: data?.confidence ?? 0,
    provenance: (data?.provenance as string) ?? "unknown",
    evidence: (data?.evidence as string) ?? "",
    narrative: (data?.narrative as string) ?? "",
  };
}

export function ZigguratContextPanel({
  layers,
  categoryNarratives = [],
  editable = false,
  onChange,
  onNarrativeChange,
}: ZigguratContextPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<
    Record<number, boolean>
  >({ 1: true, 2: true, 3: true, 4: true });
  const [expandedEvidence, setExpandedEvidence] = useState<
    Record<string, boolean>
  >({});
  const [editingNarrative, setEditingNarrative] = useState<
    Record<number, boolean>
  >({});

  const categories = [1, 2, 3, 4];

  function getCategoryNarrative(cat: number): CategoryNarrative | undefined {
    return categoryNarratives.find((n) => n.category === cat);
  }

  function handleCategoryNarrativeEdit(cat: number, field: "summary" | "analysis", value: string) {
    if (!onNarrativeChange) return;
    const updated = [...categoryNarratives];
    const idx = updated.findIndex((n) => n.category === cat);
    if (idx >= 0) {
      updated[idx] = { ...updated[idx], [field]: value };
    } else {
      updated.push({
        category: cat,
        title: CATEGORY_NAMES[cat] || `Category ${cat}`,
        summary: field === "summary" ? value : "",
        analysis: field === "analysis" ? value : "",
      });
    }
    onNarrativeChange(updated);
  }

  function handleLayerChange(layerId: string, newValue: string | string[]) {
    if (!onChange) return;
    const dataKey = LAYER_KEY_MAP[layerId] || layerId;
    const updated = { ...layers };
    if (!updated[dataKey]) {
      updated[dataKey] = {
        confidence: 0,
        provenance: "unknown",
        evidence: "",
        narrative: "",
      };
    }

    if (layerId === "L14_physical")
      updated[dataKey] = { ...updated[dataKey], physical: newValue };
    else if (layerId === "L14_temporal")
      updated[dataKey] = { ...updated[dataKey], temporal: newValue };
    else if (layerId === "L21_psychosocial")
      updated[dataKey] = { ...updated[dataKey], psychosocial: newValue };
    else if (layerId === "L21_autonomy")
      updated[dataKey] = { ...updated[dataKey], task_autonomy: newValue };
    else if (layerId === "L22_supervision")
      updated[dataKey] = { ...updated[dataKey], supervision_model: newValue };
    else if (layerId === "L22_advancement")
      updated[dataKey] = { ...updated[dataKey], advancement_pathway: newValue };
    else if (layerId === "L23")
      updated[dataKey] = { ...updated[dataKey], schedule_predictability: newValue };
    else if (layerId === "L25_readiness")
      updated[dataKey] = { ...updated[dataKey], internal_readiness: newValue };
    else if (layerId === "L25_partnership")
      updated[dataKey] = { ...updated[dataKey], partnership_quadrant: newValue };
    else if (layerId === "L9")
      updated[dataKey] = { ...updated[dataKey], role_level: newValue };
    else if (Array.isArray(newValue))
      updated[dataKey] = { ...updated[dataKey], values: newValue };
    else updated[dataKey] = { ...updated[dataKey], value: newValue };

    onChange(updated);
  }

  return (
    <div className="space-y-6">
      {categories.map((cat) => {
        const categoryLayers = ZIGGURAT_LAYERS.filter(
          (l) => l.category === cat
        );
        const isExpanded = expandedCategories[cat] ?? false;
        const catNarrative = getCategoryNarrative(cat);
        const isEditingNarrative = editingNarrative[cat] ?? false;

        return (
          <div
            key={cat}
            className="border rounded-xl overflow-hidden shadow-sm"
          >
            {/* Category Header */}
            <button
              type="button"
              onClick={() =>
                setExpandedCategories((prev) => ({
                  ...prev,
                  [cat]: !prev[cat],
                }))
              }
              className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <span className="font-semibold text-lg text-[#1B2A4A]">
                Category {cat}: {CATEGORY_NAMES[cat]}
              </span>
              <span className="text-slate-400 text-lg">
                {isExpanded ? "▼" : "▶"}
              </span>
            </button>

            {isExpanded && (
              <div>
                {/* Category Narrative Section */}
                {catNarrative && (catNarrative.summary || catNarrative.analysis) && (
                  <div className="px-5 py-4 bg-[#f8fafc] border-b border-slate-200">
                    {/* Summary headline */}
                    {catNarrative.summary && (
                      <div className="mb-3">
                        {editable && isEditingNarrative ? (
                          <textarea
                            value={catNarrative.summary}
                            onChange={(e) =>
                              handleCategoryNarrativeEdit(cat, "summary", e.target.value)
                            }
                            className="w-full border rounded-lg px-3 py-2 text-base font-medium text-[#1B2A4A] resize-none"
                            rows={2}
                          />
                        ) : (
                          <p className="text-base font-medium text-[#1B2A4A] leading-relaxed">
                            {catNarrative.summary}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Analysis narrative */}
                    {catNarrative.analysis && (
                      <div className="mb-2">
                        {editable && isEditingNarrative ? (
                          <textarea
                            value={catNarrative.analysis}
                            onChange={(e) =>
                              handleCategoryNarrativeEdit(cat, "analysis", e.target.value)
                            }
                            className="w-full border rounded-lg px-3 py-2 text-sm text-slate-700 resize-vertical min-h-[120px]"
                            rows={8}
                          />
                        ) : (
                          <div className="text-sm text-slate-700 leading-relaxed space-y-3">
                            {catNarrative.analysis.split("\n\n").map((para, i) => (
                              <p key={i}>{para}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {editable && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditingNarrative((prev) => ({
                            ...prev,
                            [cat]: !prev[cat],
                          }))
                        }
                        className="text-xs text-[#2E75B6] hover:text-[#1B2A4A] font-medium mt-1"
                      >
                        {isEditingNarrative ? "Done editing" : "Edit narrative"}
                      </button>
                    )}
                  </div>
                )}

                {/* Layer Classifications */}
                <div className="divide-y">
                  {categoryLayers.map((layer) => {
                    const currentValue = getLayerValue(layer.id, layers);
                    const { confidence, provenance, evidence, narrative } =
                      getLayerMeta(layer.id, layers);
                    const showWarning = confidence > 0 && confidence < 70;

                    return (
                      <div key={layer.id} className="px-5 py-4">
                        {showWarning && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-1.5 text-xs text-yellow-700 mb-2">
                            Review required — confidence below 70%
                          </div>
                        )}

                        {/* Layer header with badges */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono text-slate-400">
                            {layer.id}
                          </span>
                          <span className="text-sm font-medium text-slate-700">
                            {layer.name}
                          </span>
                          <ConfidenceBadge confidence={confidence} />
                          <ProvenanceBadge provenance={provenance} />
                        </div>

                        {/* Per-layer narrative — shown prominently above the selector */}
                        {narrative && (
                          <div className="mb-3 bg-slate-50 rounded-lg p-3 border border-slate-100">
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                              {narrative}
                            </p>
                          </div>
                        )}

                        {/* Enum selector */}
                        <div className="mb-2">
                          <EnumSelector
                            options={layer.enums}
                            value={currentValue}
                            multi={layer.multi}
                            onChange={(val) =>
                              handleLayerChange(layer.id, val)
                            }
                            disabled={!editable}
                          />
                        </div>

                        {/* Evidence quote (secondary — collapsible) */}
                        {evidence && (
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedEvidence((prev) => ({
                                  ...prev,
                                  [layer.id]: !prev[layer.id],
                                }))
                              }
                              className="text-xs text-slate-400 hover:text-slate-600"
                            >
                              {expandedEvidence[layer.id]
                                ? "Hide source quote"
                                : "Show source quote"}
                            </button>
                            {expandedEvidence[layer.id] && (
                              <p className="text-xs text-slate-500 mt-1 bg-white rounded p-2 border border-slate-100 italic">
                                &ldquo;{evidence}&rdquo;
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
