"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface BatchJob {
  id: string;
  status: string;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  mode: string;
  createdAt: string;
  completedAt: string | null;
}

interface BatchItem {
  id: string;
  batchId: string;
  jdId: string | null;
  ejcpId: string | null;
  profileId: string | null;
  status: string;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600",
  agent1: "bg-blue-100 text-blue-700",
  agent2: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  processing: "bg-amber-100 text-amber-700",
};

export default function BatchProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [job, setJob] = useState<BatchJob | null>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const res = await fetch(`/api/batch?batchId=${id}`);
        const data = await res.json();
        if (!active) return;
        setJob(data.job);
        setItems(data.items || []);
        setLoading(false);

        // Keep polling if not done
        if (data.job?.status === "processing" || data.job?.status === "pending") {
          setTimeout(poll, 5000);
        }
      } catch {
        if (active) setLoading(false);
      }
    }

    poll();
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center text-slate-400">
        Loading batch status...
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center text-slate-500">
        Batch not found.
      </div>
    );
  }

  const progress = job.totalCount > 0
    ? Math.round(((job.completedCount + job.failedCount) / job.totalCount) * 100)
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
        <Link href="/submit-bulk" className="hover:text-[#1B2A4A]">
          Bulk Submit
        </Link>
        <span>/</span>
        <span>Batch Progress</span>
      </div>

      <h1 className="text-3xl font-bold text-[#1B2A4A] mb-2">
        Batch Processing
      </h1>
      <p className="text-slate-500 mb-6">
        Mode: <span className="font-medium">{job.mode === "auto" ? "Auto-enrich" : "Queue for review"}</span>
        {" | "}Started: {new Date(job.createdAt).toLocaleString()}
      </p>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-600">
            {job.completedCount} completed, {job.failedCount} failed of {job.totalCount}
          </span>
          <span
            className={`font-medium ${
              job.status === "completed"
                ? "text-green-600"
                : job.status === "failed"
                  ? "text-red-600"
                  : "text-amber-600"
            }`}
          >
            {job.status === "completed" ? "Done" : job.status === "processing" ? `${progress}%` : job.status}
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              job.failedCount > 0 ? "bg-amber-500" : "bg-green-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Items table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-slate-600 font-medium">#</th>
              <th className="px-4 py-3 text-left text-slate-600 font-medium">Status</th>
              <th className="px-4 py-3 text-left text-slate-600 font-medium">Actions</th>
              <th className="px-4 py-3 text-left text-slate-600 font-medium">Error</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-700">{idx + 1}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      statusColors[item.status] || "bg-slate-100"
                    }`}
                  >
                    {item.status === "agent1"
                      ? "Classifying..."
                      : item.status === "agent2"
                        ? "Profiling..."
                        : item.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {item.profileId && (
                    <Link
                      href={`/profiles/${item.profileId}`}
                      className="text-[#2E75B6] hover:underline"
                    >
                      View Profile
                    </Link>
                  )}
                  {!item.profileId && item.ejcpId && (
                    <Link
                      href={`/review/gate1/${item.ejcpId}`}
                      className="text-[#2E75B6] hover:underline"
                    >
                      Review EJCP
                    </Link>
                  )}
                </td>
                <td className="px-4 py-3 text-red-600 text-xs max-w-xs truncate">
                  {item.error || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Download JSON */}
      {job.status === "completed" && items.some((i) => i.profileId) && (
        <div className="mt-6">
          <button
            type="button"
            onClick={async () => {
              const profileIds = items
                .filter((i) => i.profileId)
                .map((i) => i.profileId);
              const profiles = await Promise.all(
                profileIds.map(async (pid) => {
                  const r = await fetch(`/api/profiles/${pid}`);
                  return r.json();
                })
              );
              const blob = new Blob([JSON.stringify(profiles, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `batch-${id}-profiles.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-4 py-2 bg-[#1B2A4A] text-white rounded-lg text-sm hover:bg-[#2a3d5e]"
          >
            Download All Profiles (JSON)
          </button>
        </div>
      )}
    </div>
  );
}
