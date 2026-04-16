"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Tab = "upload" | "paste";

export default function IngestPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("paste");
  const [pasteText, setPasteText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ rows: number; parseErrors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      let res: Response;

      if (tab === "upload" && file) {
        const formData = new FormData();
        formData.append("file", file);
        res = await fetch("/api/ingest", { method: "POST", body: formData });
      } else if (tab === "paste" && pasteText.trim()) {
        res = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: pasteText, format: "csv" }),
        });
      } else {
        setError("Please provide data to ingest");
        setLoading(false);
        return;
      }

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Ingestion failed");
        setLoading(false);
        return;
      }

      setPreview({
        rows: result.itemCount,
        parseErrors: (result.parseErrors || []).map(
          (e: { row: number; message: string }) => `Row ${e.row}: ${e.message}`
        ),
      });

      // Kick off processing
      await fetch("/api/ingest/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: result.batchId }),
      });

      // Navigate to pipeline view
      router.push(`/pipeline/${result.batchId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) {
      setFile(f);
      setTab("upload");
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1
          className="text-3xl font-bold text-[#1B2A4A]"
          style={{ fontFamily: "DM Serif Display, Georgia, serif" }}
        >
          Ingest Job Descriptions
        </h1>
        <p className="text-slate-500 mt-1">
          Upload a CSV/Excel file or paste table data. Each row becomes a skill
          profile.
        </p>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("paste")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "paste"
              ? "bg-white text-[#1B2A4A] shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Paste Text
        </button>
        <button
          onClick={() => setTab("upload")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "upload"
              ? "bg-white text-[#1B2A4A] shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Upload File
        </button>
      </div>

      {/* Paste Tab */}
      {tab === "paste" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Paste CSV or tab-separated data with headers
            </label>
            <p className="text-xs text-slate-400 mb-3">
              Expected columns: Status, Job Title, Location, O*NET Code,
              Company, Skills, Link to Live Job Posting, Job Description
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={12}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent resize-y"
              placeholder="Status&#9;Job Title&#9;Location&#9;O*NET Code&#9;Company&#9;Skills&#9;Link to Live Job Posting&#9;Job Description&#10;Feb 2026 - Active&#9;Science Teachers&#9;Cary, NC&#9;25-2031.00&#9;Wake County..."
            />
          </div>
        </div>
      )}

      {/* Upload Tab */}
      {tab === "upload" && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          className="bg-white rounded-xl border-2 border-dashed border-slate-300 hover:border-[#2E75B6] transition-colors p-12 text-center"
        >
          {file ? (
            <div>
              <p className="text-lg font-medium text-slate-800">{file.name}</p>
              <p className="text-sm text-slate-500 mt-1">
                {(file.size / 1024).toFixed(1)} KB
              </p>
              <button
                onClick={() => {
                  setFile(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="text-sm text-red-500 hover:text-red-700 mt-2"
              >
                Remove
              </button>
            </div>
          ) : (
            <div>
              <p className="text-lg text-slate-500 mb-2">
                Drag & drop a CSV or XLSX file here
              </p>
              <p className="text-sm text-slate-400 mb-4">or</p>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#2E75B6] text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-[#1B2A4A] transition-colors">
                Browse Files
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.tsv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          Successfully ingested {preview.rows} job descriptions.
          {preview.parseErrors.length > 0 && (
            <div className="mt-2 text-amber-600">
              Warnings: {preview.parseErrors.join("; ")}
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleSubmit}
          disabled={
            loading ||
            (tab === "paste" && !pasteText.trim()) ||
            (tab === "upload" && !file)
          }
          className="px-6 py-3 bg-[#2E75B6] text-white rounded-lg font-medium hover:bg-[#1B2A4A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            "Ingest & Enrich"
          )}
        </button>
        <p className="text-sm text-slate-500">
          Each JD will be researched, enriched with EJCP + skills, then
          validated.
        </p>
      </div>
    </div>
  );
}
