"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SubmitPage() {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState(0); // 0=idle, 1=saving, 2=agent1, 3=done
  const [elapsed, setElapsed] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rawText.trim()) return;

    setLoading(true);
    setError("");
    setStep(1);
    setElapsed(0);
    setStatus("Saving job description...");
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);

    try {
      // Step 1: Submit the JD
      const submitRes = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, sourceUrl, submittedBy }),
      });

      if (!submitRes.ok) {
        throw new Error("Failed to save job description");
      }

      const { id: jdId } = await submitRes.json();

      // Step 2: Invoke Agent 1
      setStep(2);
      setStatus("Classifying against 27 Ziggurat layers (Agent 1)...");
      const agent1Res = await fetch("/api/agent1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdId }),
      });

      if (!agent1Res.ok) {
        const errData = await agent1Res.json();
        throw new Error(
          errData.error || "Agent 1 failed"
        );
      }

      const { ejcpId } = await agent1Res.json();

      setStep(3);
      clearInterval(timer);
      setStatus("Classification complete! Redirecting to review...");
      router.push(`/review/gate1/${ejcpId}`);
    } catch (err) {
      clearInterval(timer);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setLoading(false);
      setStep(0);
      setStatus("");
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-[#1B2A4A] mb-2">
        Submit Job Description
      </h1>
      <p className="text-slate-500 mb-8">
        Paste a raw job description to begin the Ziggurat classification
        pipeline.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="rawText"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            Job Description Text *
          </label>
          <textarea
            id="rawText"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={16}
            className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent resize-y"
            placeholder="Paste the full job description here..."
            disabled={loading}
            required
          />
        </div>

        <div>
          <label
            htmlFor="sourceUrl"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            Source URL (optional)
          </label>
          <input
            id="sourceUrl"
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
            placeholder="https://..."
            disabled={loading}
          />
        </div>

        <div>
          <label
            htmlFor="submittedBy"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            Submitted By (optional)
          </label>
          <input
            id="submittedBy"
            type="text"
            value={submittedBy}
            onChange={(e) => setSubmittedBy(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
            placeholder="Your name"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {step > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="space-y-3">
              {[
                { n: 1, label: "Saving job description" },
                { n: 2, label: "Classifying with Agent 1" },
                { n: 3, label: "Complete" },
              ].map(({ n, label }) => (
                <div key={n} className="flex items-center gap-3">
                  {step > n ? (
                    <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">&#10003;</span>
                  ) : step === n ? (
                    <svg className="animate-spin h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center text-xs">{n}</span>
                  )}
                  <span className={`text-sm ${step >= n ? "text-blue-700 font-medium" : "text-slate-400"}`}>
                    {label}
                  </span>
                </div>
              ))}
              {step > 0 && step < 3 && (
                <p className="text-xs text-slate-500 pl-9">Elapsed: {elapsed}s</p>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !rawText.trim()}
          className="w-full py-3 bg-[#1B2A4A] text-white rounded-lg font-medium hover:bg-[#2a3d5e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Processing..." : "Submit & Classify"}
        </button>
      </form>
    </div>
  );
}
