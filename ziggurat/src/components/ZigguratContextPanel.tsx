"use client";

import { useState } from "react";
import { ZIGGURAT_LAYERS, CATEGORY_NAMES } from "@/lib/ziggurat/enums";
import { EnumSelector } from "./EnumSelector";
import { ConfidenceBadge, ProvenanceBadge } from "./ConfidenceBadge";

interface LayerData {
  value?: string;
  values?: string[];
  confidence: number;
  provenance: string;
  evidence: string;
  [key: string]: unknown;
}

interface ZigguratContextPanelProps {
  layers: Record<string, LayerData>;
  editable?: boolean;
  onChange?: (layers: Record<string, LayerData>) => void;
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

  // Handle sub-fields
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
  if (layerId === "L9")
    return (data.role_level as string) || "";

  // Multi-select layers
  if (data.values && Array.isArray(data.values)) return data.values;

  return (data.value as string) || "";
}

function getLayerConfidence(
  layerId: string,
  layers: Record<string, LayerData>
): { confidence: number; provenance: string; evidence: string } {
  const dataKey = LAYER_KEY_MAP[layerId] || layerId;
  const data = layers[dataKey];
  return {
    confidence: data?.confidence ?? 0,
    provenance: (data?.provenance as string) ?? "unknown",
    evidence: (data?.evidence as string) ?? "",
  };
}

export function ZigguratContextPanel({
  layers,
  editable = false,
  onChange,
}: ZigguratContextPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<
    Record<number, boolean>
  >({ 1: true, 2: true, 3: false, 4: false });
  const [expandedEvidence, setExpandedEvidence] = useState<
    Record<string, boolean>
  >({});

  const categories = [1, 2, 3, 4];

  function handleLayerChange(layerId: string, newValue: string | string[]) {
    if (!onChange) return;
    const dataKey = LAYER_KEY_MAP[layerId] || layerId;
    const updated = { ...layers };
    if (!updated[dataKey]) {
      updated[dataKey] = {
        confidence: 0,
        provenance: "unknown",
        evidence: "",
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
    <div className="space-y-4">
      {categories.map((cat) => {
        const categoryLayers = ZIGGURAT_LAYERS.filter(
          (l) => l.category === cat
        );
        const isExpanded = expandedCategories[cat] ?? false;

        return (
          <div
            key={cat}
            className="border rounded-lg overflow-hidden"
          >
            <button
              type="button"
              onClick={() =>
                setExpandedCategories((prev) => ({
                  ...prev,
                  [cat]: !prev[cat],
                }))
              }
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <span className="font-semibold text-[#1B2A4A]">
                Category {cat}: {CATEGORY_NAMES[cat]}
              </span>
              <span className="text-slate-400">
                {isExpanded ? "▼" : "▶"}
              </span>
            </button>

            {isExpanded && (
              <div className="divide-y">
                {categoryLayers.map((layer) => {
                  const currentValue = getLayerValue(layer.id, layers);
                  const { confidence, provenance, evidence } =
                    getLayerConfidence(layer.id, layers);
                  const showWarning = confidence > 0 && confidence < 70;

                  return (
                    <div key={layer.id} className="px-4 py-4">
                      {showWarning && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-1.5 text-xs text-yellow-700 mb-2">
                          Review required — confidence below 70%
                        </div>
                      )}
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
                              ? "Hide evidence"
                              : "Show evidence"}
                          </button>
                          {expandedEvidence[layer.id] && (
                            <p className="text-xs text-slate-500 mt-1 bg-slate-50 rounded p-2">
                              {evidence}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
