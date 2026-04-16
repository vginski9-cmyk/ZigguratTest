"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ProfileSummary {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  status: string;
  overallConfidence: number;
  skillCount: number;
  createdAt: string;
}

interface PipelineStats {
  totalProfiles: number;
  validated: number;
  flagged: number;
  processing: number;
  activeBatches: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [recentProfiles, setRecentProfiles] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/profiles").then((r) => r.json()),
      fetch("/api/pipeline").then((r) => r.json()),
    ])
      .then(([profiles, batches]) => {
        const profileList = Array.isArray(profiles) ? profiles : [];
        const batchList = Array.isArray(batches) ? batches : [];

        setStats({
          totalProfiles: profileList.length,
          validated: profileList.filter(
            (p: ProfileSummary) => p.status === "validated"
          ).length,
          flagged: profileList.filter(
            (p: ProfileSummary) => p.status === "flagged"
          ).length,
          processing: profileList.filter(
            (p: ProfileSummary) => p.status === "processing"
          ).length,
          activeBatches: batchList.filter(
            (b: { status: string }) =>
              b.status === "pending" || b.status === "processing"
          ).length,
        });

        setRecentProfiles(profileList.slice(0, 8));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusColors: Record<string, string> = {
    processing: "bg-blue-100 text-blue-700",
    validated: "bg-green-100 text-green-700",
    flagged: "bg-amber-100 text-amber-700",
    exported: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1
          className="text-3xl font-bold text-[#1B2A4A]"
          style={{ fontFamily: "DM Serif Display, Georgia, serif" }}
        >
          Dashboard
        </h1>
        <p className="text-slate-500 mt-1">
          Bulk skill profile enrichment and analytics
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          href="/ingest"
          className="flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-dashed border-slate-300 hover:border-[#2E75B6] hover:bg-blue-50/50 transition-all"
        >
          <div className="w-12 h-12 rounded-lg bg-[#2E75B6] text-white flex items-center justify-center text-xl font-bold">
            +
          </div>
          <div>
            <h3 className="font-semibold text-[#1B2A4A]">Ingest JDs</h3>
            <p className="text-sm text-slate-500">
              Upload CSV/Excel or paste data
            </p>
          </div>
        </Link>
        <Link
          href="/pipeline"
          className="flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
        >
          <div className="w-12 h-12 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xl font-bold">
            &#8635;
          </div>
          <div>
            <h3 className="font-semibold text-[#1B2A4A]">Pipeline</h3>
            <p className="text-sm text-slate-500">Monitor enrichment progress</p>
          </div>
        </Link>
        <Link
          href="/analytics"
          className="flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-dashed border-slate-300 hover:border-purple-400 hover:bg-purple-50/50 transition-all"
        >
          <div className="w-12 h-12 rounded-lg bg-purple-500 text-white flex items-center justify-center text-xl font-bold">
            &#9776;
          </div>
          <div>
            <h3 className="font-semibold text-[#1B2A4A]">Analytics</h3>
            <p className="text-sm text-slate-500">
              Query, visualize, and export
            </p>
          </div>
        </Link>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[
              { label: "Total Profiles", value: stats.totalProfiles, color: "bg-slate-100 text-slate-700" },
              { label: "Validated", value: stats.validated, color: "bg-green-50 text-green-700" },
              { label: "Flagged", value: stats.flagged, color: "bg-amber-50 text-amber-700" },
              { label: "Processing", value: stats.processing, color: "bg-blue-50 text-blue-700" },
              { label: "Active Batches", value: stats.activeBatches, color: "bg-purple-50 text-purple-700" },
            ].map((stat) => (
              <div key={stat.label} className={`rounded-xl p-5 ${stat.color}`}>
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Recent Profiles */}
          {recentProfiles.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[#1B2A4A]">
                  Recent Profiles
                </h2>
                <Link
                  href="/profiles"
                  className="text-sm text-[#2E75B6] hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="bg-white rounded-xl border overflow-hidden">
                {recentProfiles.map((p) => (
                  <Link
                    key={p.id}
                    href={`/profiles/${p.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors border-b last:border-b-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 truncate">
                        {p.jobTitle}
                      </div>
                      <div className="text-sm text-slate-500">
                        {p.company}
                        {p.location ? ` \u2022 ${p.location}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className="text-xs text-slate-500">
                        {p.skillCount} skills
                      </span>
                      {p.overallConfidence > 0 && (
                        <span className="text-xs text-slate-500">
                          {p.overallConfidence}%
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${statusColors[p.status] || "bg-slate-100"}`}
                      >
                        {p.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <p className="text-slate-500 mb-4 text-lg">
            No profiles yet. Ingest job descriptions to get started.
          </p>
          <Link
            href="/ingest"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#2E75B6] text-white rounded-lg font-medium hover:bg-[#1B2A4A] transition-colors"
          >
            Ingest JDs
          </Link>
        </div>
      )}
    </div>
  );
}
