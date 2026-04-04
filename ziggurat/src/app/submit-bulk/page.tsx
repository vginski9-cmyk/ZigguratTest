"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BulkSubmitPage() {
  const router = useRouter();
  const [rawInput, setRawInput] = useState("");
  const [mode, setMode] = useState<"auto" | "reviewed">("auto");
  const [createdBy, setCreatedBy] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function parseJDs(): string[] {
    return rawInput
      .split(/\n---\n/)
      .map((jd) => jd.trim())
      .filter((jd) => jd.length > 50);
  }

  async function handleSubmit() {
    const jds = parseJDs();
    if (jds.length === 0) {
      setError("No valid job descriptions found. Separate multiple JDs with a line containing only '---'.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescriptionTexts: jds,
          mode,
          createdBy: createdBy || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create batch");
      }

      const { batchId } = await res.json();
      router.push(`/batch/${batchId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
      setLoading(false);
    }
  }

  const jdCount = parseJDs().length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-[#1B2A4A] mb-2">
        Bulk Submit Job Descriptions
      </h1>
      <p className="text-slate-500 mb-8">
        Paste multiple job descriptions separated by a line containing only{" "}
        <code className="bg-slate-100 px-1 rounded">---</code>. Each will be
        processed through the full enrichment pipeline.
      </p>

      {/* Mode selection */}
      <div className="mb-6">
        <label className="text-sm font-semibold text-slate-700 block mb-2">
          Processing Mode
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="mode"
              value="auto"
              checked={mode === "auto"}
              onChange={() => setMode("auto")}
              className="text-[#1B2A4A]"
            />
            <div>
              <span className="text-sm font-medium">Auto-enrich</span>
              <p className="text-xs text-slate-500">
                Skip human review — Agent 1 + Agent 2 → auto-publish
              </p>
            </div>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="mode"
              value="reviewed"
              checked={mode === "reviewed"}
              onChange={() => setMode("reviewed")}
              className="text-[#1B2A4A]"
            />
            <div>
              <span className="text-sm font-medium">Queue for review</span>
              <p className="text-xs text-slate-500">
                Agent 1 only — queued for Gate 1 human review
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Created by */}
      <div className="mb-6">
        <input
          type="text"
          value={createdBy}
          onChange={(e) => setCreatedBy(e.target.value)}
          placeholder="Your name (optional)"
          className="border rounded-lg px-4 py-2 text-sm w-64"
        />
      </div>

      {/* JD textarea */}
      <div className="mb-4">
        <textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder={`Paste job description #1 here...\n\n---\n\nPaste job description #2 here...\n\n---\n\nPaste job description #3 here...`}
          className="w-full border rounded-xl p-4 text-sm font-mono min-h-[400px]"
        />
      </div>

      {/* Count indicator */}
      <div className="mb-6 text-sm text-slate-500">
        {jdCount === 0
          ? "No job descriptions detected"
          : `${jdCount} job description${jdCount > 1 ? "s" : ""} detected`}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || jdCount === 0}
        className="px-6 py-3 bg-[#1B2A4A] text-white rounded-lg font-medium hover:bg-[#2a3d5e] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
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
            Submitting...
          </span>
        ) : (
          `Submit ${jdCount} Job Description${jdCount !== 1 ? "s" : ""}`
        )}
      </button>
    </div>
  );
}
