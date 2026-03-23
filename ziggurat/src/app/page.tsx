"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardStats {
  total: number;
  draft: number;
  aiEnriched: number;
  humanVerified: number;
  published: number;
  recentProfiles: Array<{
    id: string;
    roleTitle: string;
    employer: string;
    validationStatus: string;
    createdAt: string;
  }>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((profiles: Array<Record<string, unknown>>) => {
        const s: DashboardStats = {
          total: profiles.length,
          draft: profiles.filter((p) => p.validationStatus === "draft").length,
          aiEnriched: profiles.filter(
            (p) => p.validationStatus === "ai_enriched"
          ).length,
          humanVerified: profiles.filter(
            (p) => p.validationStatus === "human_verified"
          ).length,
          published: profiles.filter(
            (p) => p.validationStatus === "published"
          ).length,
          recentProfiles: profiles.slice(0, 5).map((p) => ({
            id: p.id as string,
            roleTitle: (p.roleTitle as string) || "Untitled",
            employer: (p.employer as string) || "Unknown",
            validationStatus: p.validationStatus as string,
            createdAt: p.createdAt as string,
          })),
        };
        setStats(s);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    ai_enriched: "bg-blue-100 text-blue-700",
    human_verified: "bg-amber-100 text-amber-700",
    published: "bg-green-100 text-green-700",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1B2A4A]">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Skill Profile Intelligence Pipeline
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link
          href="/submit"
          className="flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-dashed border-slate-300 hover:border-[#2E75B6] hover:bg-blue-50/50 transition-all"
        >
          <div className="w-12 h-12 rounded-lg bg-[#2E75B6] text-white flex items-center justify-center text-2xl">
            +
          </div>
          <div>
            <h3 className="font-semibold text-[#1B2A4A]">
              Submit New Job Description
            </h3>
            <p className="text-sm text-slate-500">
              Start the classification pipeline
            </p>
          </div>
        </Link>
        <Link
          href="/review"
          className="flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50/50 transition-all"
        >
          <div className="w-12 h-12 rounded-lg bg-amber-500 text-white flex items-center justify-center text-2xl">
            !
          </div>
          <div>
            <h3 className="font-semibold text-[#1B2A4A]">Review Queue</h3>
            <p className="text-sm text-slate-500">
              Review and validate pending profiles
            </p>
          </div>
        </Link>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Profiles", value: stats.total, color: "bg-slate-100 text-slate-700" },
              { label: "AI Enriched", value: stats.aiEnriched, color: "bg-blue-50 text-blue-700" },
              { label: "In Review", value: stats.humanVerified, color: "bg-amber-50 text-amber-700" },
              { label: "Published", value: stats.published, color: "bg-green-50 text-green-700" },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`rounded-xl p-5 ${stat.color}`}
              >
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Recent Profiles */}
          {stats.recentProfiles.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-[#1B2A4A] mb-4">
                Recent Profiles
              </h2>
              <div className="bg-white rounded-xl border overflow-hidden">
                {stats.recentProfiles.map((p) => (
                  <Link
                    key={p.id}
                    href={`/profiles/${p.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors border-b last:border-b-0"
                  >
                    <div>
                      <div className="font-medium text-slate-800">
                        {p.roleTitle}
                      </div>
                      <div className="text-sm text-slate-500">
                        {p.employer}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${statusColors[p.validationStatus] || "bg-slate-100"}`}
                      >
                        {p.validationStatus.replace("_", " ")}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-slate-500 mb-4">
            No profiles yet. Submit a job description to get started.
          </p>
          <Link
            href="/submit"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#2E75B6] text-white rounded-lg font-medium hover:bg-[#1B2A4A] transition-colors"
          >
            Submit JD
          </Link>
        </div>
      )}
    </div>
  );
}
