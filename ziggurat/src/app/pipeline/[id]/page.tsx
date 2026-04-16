"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface BatchItem {
  id: string;
  jdId: string;
  status: string;
  enrichedProfileId: string | null;
  error: string | null;
  completedAt: string | null;
  jd: {
    jobTitle: string | null;
    company: string | null;
    location: string | null;
    onetCode: string | null;
  } | null;
}

interface BatchDetail {
  id: string;
  status: string;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  createdAt: string;
  completedAt: string | null;
  items: BatchItem[];
}

export default function PipelineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBatch();
    const interval = setInterval(loadBatch, 3000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function loadBatch() {
    fetch(`/api/pipeline/${id}`)
      .then((r) => r.json())
      .then(setBatch)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  const itemStatusColors: Record<string, string> = {
    pending: "bg-slate-100 text-slate-600",
    researching: "bg-blue-100 text-blue-700",
    validating: "bg-purple-100 text-purple-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };

  const itemStatusLabels: Record<string, string> = {
    pending: "Waiting",
    researching: "Researching...",
    validating: "Validating...",
    completed: "Done",
    failed: "Failed",
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-400">
        Loading batch...
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-red-500">
        Batch not found
      </div>
    );
  }

  const progress =
    batch.totalCount > 0
      ? Math.round(
          ((batch.completedCount + batch.failedCount) / batch.totalCount) * 100
        )
      : 0;

  const isActive = batch.status === "processing" || batch.status === "pending";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-2">
        <Link
          href="/pipeline"
          className="text-sm text-[#2E75B6] hover:underline"
        >
          Pipeline
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-500">Batch</span>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1
            className="text-2xl font-bold text-[#1B2A4A]"
            style={{ fontFamily: "DM Serif Display, Georgia, serif" }}
          >
            Batch Progress
          </h1>
          {isActive && (
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          )}
        </div>
        <p className="text-slate-500 mt-1">
          {batch.totalCount} job descriptions &bull; Started{" "}
          {new Date(batch.createdAt).toLocaleString()}
        </p>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold text-[#1B2A4A]">
              {progress}%
            </span>
            <div className="text-sm text-slate-500">
              <span className="text-green-600 font-medium">
                {batch.completedCount}
              </span>{" "}
              completed
              {batch.failedCount > 0 && (
                <>
                  {" "}&bull;{" "}
                  <span className="text-red-500 font-medium">
                    {batch.failedCount}
                  </span>{" "}
                  failed
                </>
              )}
              {" "}&bull;{" "}
              <span>
                {batch.totalCount - batch.completedCount - batch.failedCount}{" "}
                remaining
              </span>
            </div>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              batch.status === "completed"
                ? "bg-green-100 text-green-700"
                : batch.status === "failed"
                  ? "bg-red-100 text-red-700"
                  : "bg-blue-100 text-blue-700"
            }`}
          >
            {batch.status}
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div
            className="h-3 rounded-full bg-[#2E75B6] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-6 py-3 bg-slate-50 border-b">
          <h2 className="font-semibold text-sm text-slate-600">
            Job Descriptions
          </h2>
        </div>
        {batch.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between px-6 py-4 border-b last:border-b-0 hover:bg-slate-50/50"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-800 truncate">
                {item.jd?.jobTitle || "Untitled"}
              </div>
              <div className="text-sm text-slate-500">
                {item.jd?.company || ""}
                {item.jd?.location ? ` \u2022 ${item.jd.location}` : ""}
                {item.jd?.onetCode ? ` \u2022 ${item.jd.onetCode}` : ""}
              </div>
              {item.error && (
                <div className="text-xs text-red-500 mt-1 truncate">
                  {item.error}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 ml-4">
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${itemStatusColors[item.status] || "bg-slate-100"}`}
              >
                {itemStatusLabels[item.status] || item.status}
              </span>
              {item.enrichedProfileId && (
                <Link
                  href={`/profiles/${item.enrichedProfileId}`}
                  className="text-xs text-[#2E75B6] hover:underline"
                >
                  View Profile
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
