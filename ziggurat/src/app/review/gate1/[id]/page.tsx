"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ZigguratContextPanel } from "@/components/ZigguratContextPanel";
import {
  ExtractedSkillPills,
  InferredSkillPills,
} from "@/components/SkillPills";
import { ReviewControls } from "@/components/ReviewControls";
import type { EJCPData } from "@/lib/ziggurat/types";

export default function Gate1ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [ejcpData, setEjcpData] = useState<EJCPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [reviewerId, setReviewerId] = useState("");

  useEffect(() => {
    fetch(`/api/profiles/${id}`)
      .then((r) => {
        if (!r.ok) {
          // Try fetching as an EJCP directly
          return fetch(`/api/profiles`).then((r2) => r2.json()).then(() => {
            throw new Error("EJCP view - loading from ejcp_versions");
          });
        }
        return r.json();
      })
      .then((data) => {
        if (data.ejcp?.data) {
          setEjcpData(data.ejcp.data);
        } else if (data.profile?.data?.ziggurat_context_summary) {
          // We're looking at a profile, get its EJCP
          setEjcpData(null);
        }
      })
      .catch(() => {
        // Load EJCP data directly
        loadEjcpDirectly();
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function loadEjcpDirectly() {
    try {
      const res = await fetch(`/api/profiles`);
      const profiles = await res.json();
      for (const p of profiles) {
        if (p.ejcpId === id && p.ejcpData) {
          setEjcpData(p.ejcpData);
          return;
        }
      }
      // If no match found, try loading from the profile data directly
      for (const p of profiles) {
        if (p.id === id && p.ejcpData) {
          setEjcpData(p.ejcpData);
          return;
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleValidate() {
    if (!ejcpData) return;

    setSubmitting(true);
    setError("");
    setStatus("Saving validated EJCP...");

    try {
      // Validate EJCP
      const validateRes = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "ejcp",
          entityId: id,
          data: ejcpData,
          reviewerId,
          gate: "gate1",
        }),
      });

      if (!validateRes.ok) throw new Error("Failed to save validation");

      const { newId } = await validateRes.json();

      // Invoke Agent 2
      setStatus(
        "Running Skill Profiler (Agent 2)... This takes 60-120 seconds."
      );
      const agent2Res = await fetch("/api/agent2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ejcpId: newId }),
      });

      if (!agent2Res.ok) {
        const errData = await agent2Res.json();
        throw new Error(errData.error || "Agent 2 failed");
      }

      const { profileId } = await agent2Res.json();

      setStatus("Skill profile generated! Redirecting...");
      router.push(`/review/gate2/${profileId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setSubmitting(false);
      setStatus("");
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center py-12 text-slate-400">
          Loading EJCP data...
        </div>
      </div>
    );
  }

  if (!ejcpData) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-slate-500">EJCP data not found for ID: {id}</p>
        </div>
      </div>
    );
  }

  const layers = ejcpData.layers || {};
  const identity = layers.L0_identity;
  const roleDefinition = layers.L9_role_definition;

  // Count low-confidence layers
  const lowConfidenceLayers = Object.values(layers).filter(
    (l) => typeof l === "object" && l !== null && "confidence" in l && (l as { confidence: number }).confidence > 0 && (l as { confidence: number }).confidence < 70
  ).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <span>Gate 1</span>
          <span>/</span>
          <span>Ziggurat Context Review</span>
        </div>
        <h1 className="text-3xl font-bold text-[#1B2A4A]">
          {(roleDefinition as Record<string, unknown>)?.title_raw as string || "Role Classification Review"}
        </h1>
        {identity && (
          <p className="text-slate-500 mt-1">
            {(identity as Record<string, unknown>).legal_name as string || "Unknown Employer"}
            {(identity as Record<string, unknown>).hq_zip ? ` — ${(identity as Record<string, unknown>).hq_zip}` : ""}
          </p>
        )}
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

      {/* Role Summary */}
      {roleDefinition && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#1B2A4A] mb-3">
            Role Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Title</span>
              <p className="font-medium">
                {(roleDefinition as Record<string, unknown>).title_normalized as string || "—"}
              </p>
            </div>
            <div>
              <span className="text-slate-500">SOC Code</span>
              <p className="font-medium font-mono">
                {(roleDefinition as Record<string, unknown>).soc_6 as string || "—"}
              </p>
            </div>
            <div>
              <span className="text-slate-500">O*NET</span>
              <p className="font-medium font-mono">
                {(roleDefinition as Record<string, unknown>).onet_code as string || "—"}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Level</span>
              <p className="font-medium">
                {(roleDefinition as Record<string, unknown>).role_level as string || "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ziggurat Context Panel */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="text-lg font-semibold text-[#1B2A4A] mb-4">
          Ziggurat Context Classification
        </h2>
        <ZigguratContextPanel
          layers={layers as Record<string, { value?: string; values?: string[]; confidence: number; provenance: string; evidence: string }>}
          editable={true}
          onChange={(updatedLayers) =>
            setEjcpData({ ...ejcpData, layers: updatedLayers as EJCPData["layers"] })
          }
        />
      </div>

      {/* Tasks */}
      {layers.L10_tasks && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#1B2A4A] mb-3">
            Core Tasks
          </h2>
          <ul className="space-y-2">
            {((layers.L10_tasks as Record<string, unknown>).core_tasks as string[] || []).map(
              (task: string, i: number) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-slate-700"
                >
                  <span className="text-slate-400 mt-0.5">•</span>
                  {task}
                </li>
              )
            )}
          </ul>
        </div>
      )}

      {/* Skills */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="text-lg font-semibold text-[#1B2A4A] mb-4">
          Extracted Skills
        </h2>
        <ExtractedSkillPills
          skills={ejcpData.extracted_skills_raw || []}
          onRemove={(skill) =>
            setEjcpData({
              ...ejcpData,
              extracted_skills_raw:
                ejcpData.extracted_skills_raw.filter((s) => s !== skill),
            })
          }
        />

        {ejcpData.inferred_skills && ejcpData.inferred_skills.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">
              Inferred Skills
            </h3>
            <InferredSkillPills skills={ejcpData.inferred_skills} />
          </div>
        )}
      </div>

      {/* Clarifying Questions */}
      {ejcpData.clarifying_questions &&
        ejcpData.clarifying_questions.length > 0 && (
          <div className="bg-white rounded-xl border p-6 mb-6">
            <h2 className="text-lg font-semibold text-[#1B2A4A] mb-4">
              Clarifying Questions
            </h2>
            <div className="space-y-4">
              {ejcpData.clarifying_questions.map((q, i) => {
                const priorityColors: Record<string, string> = {
                  high: "bg-red-100 text-red-700",
                  medium: "bg-yellow-100 text-yellow-700",
                  low: "bg-slate-100 text-slate-600",
                };
                return (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[q.priority]}`}
                      >
                        {q.priority}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {q.layer}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-700 mb-1">
                      {q.question}
                    </p>
                    <p className="text-xs text-slate-500 mb-2">{q.impact}</p>
                    <input
                      type="text"
                      placeholder="Your answer..."
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {/* Status/Error Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}
      {status && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            {submitting && (
              <svg
                className="animate-spin h-5 w-5 text-blue-600"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            <span className="text-sm text-blue-700">{status}</span>
          </div>
        </div>
      )}

      <ReviewControls
        onValidate={handleValidate}
        validateLabel="Validate & Send to Agent 2"
        loading={submitting}
        warningCount={lowConfidenceLayers}
      />
    </div>
  );
}
