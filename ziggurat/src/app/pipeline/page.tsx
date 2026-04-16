"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface BatchJob {
  id: string;
  status: string;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  createdAt: string;
  completedAt: string | null;
  items: Array<{
    id: string;
    status: string;
    enrichedProfileId: string | null;
  }>;
}

export default function PipelinePage() {
  const [batches, setBatches] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBatches();
    const interval = setInterval(loadBatches, 5000);
    return () => clearInterval(interval);
  }, []);

  function loadBatches() {
    fetch("/api/pipeline")
      .then((r) => r.json())
      .then((data) => setBatches(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  const statusColors: Record<string, string> = {
    pending: "bg-slate-100 text-slate-600",
    processing: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-3xl font-bold text-[#1B2A4A]"
            style={{ fontFamily: "DM Serif Display, Georgia, serif" }}
          >
            Pipeline
          </h1>
          <p className="text-slate-500 mt-1">
            Track enrichment batch progress
          </p>
        </div>
        <Link
          href="/ingest"
          className="px-4 py-2 bg-[#2E75B6] text-white rounded-lg text-sm font-medium hover:bg-[#1B2A4A] transition-colors"
        >
          New Batch
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : batches.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-500 mb-4">No batches yet.</p>
          <Link
            href="/ingest"
            className="text-[#2E75B6] hover:underline"
          >
            Ingest job descriptions to start
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {batches.map((batch) => {
            const progress =
              batch.totalCount > 0
                ? Math.round(
                    ((batch.completedCount + batch.failedCount) /
                      batch.totalCount) *
                      100
                  )
                : 0;

            return (
              <Link
                key={batch.id}
                href={`/pipeline/${batch.id}`}
                className="block bg-white rounded-xl border p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[batch.status] || "bg-slate-100"}`}
                    >
                      {batch.status}
                    </span>
                    <span className="text-sm text-slate-500">
                      {batch.totalCount} job descriptions
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(batch.createdAt).toLocaleString()}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      batch.failedCount > 0 && batch.completedCount === 0
                        ? "bg-red-500"
                        : "bg-[#2E75B6]"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {batch.completedCount} completed
                    {batch.failedCount > 0 && (
                      <span className="text-red-500 ml-2">
                        {batch.failedCount} failed
                      </span>
                    )}
                  </span>
                  <span>{progress}%</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
