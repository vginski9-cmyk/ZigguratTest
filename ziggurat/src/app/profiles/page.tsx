"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ProfileSummary {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  onetCode: string;
  skillCount: number;
  status: string;
  overallConfidence: number;
  createdAt: string;
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((data) => setProfiles(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = profiles.filter((p) => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (
      search &&
      !p.jobTitle.toLowerCase().includes(search.toLowerCase()) &&
      !p.company.toLowerCase().includes(search.toLowerCase()) &&
      !p.onetCode.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const statusColors: Record<string, string> = {
    processing: "bg-blue-100 text-blue-700",
    validated: "bg-green-100 text-green-700",
    flagged: "bg-amber-100 text-amber-700",
    exported: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-3xl font-bold text-[#1B2A4A]"
            style={{ fontFamily: "DM Serif Display, Georgia, serif" }}
          >
            Skill Profiles
          </h1>
          <p className="text-slate-500 mt-1">
            {profiles.length} enriched profiles
          </p>
        </div>
        <Link
          href="/analytics"
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          Analyze All
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by role, company, or O*NET code..."
          className="flex-1 border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-lg px-4 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="validated">Validated</option>
          <option value="flagged">Flagged</option>
          <option value="processing">Processing</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <p className="text-slate-500 mb-4">No profiles found.</p>
          <Link href="/ingest" className="text-[#2E75B6] hover:underline">
            Ingest job descriptions to start
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/profiles/${p.id}`}
              className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-[#1B2A4A] leading-tight">
                  {p.jobTitle}
                </h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${statusColors[p.status] || "bg-slate-100"}`}
                >
                  {p.status}
                </span>
              </div>
              <p className="text-sm text-slate-500 mb-2">{p.company}</p>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                {p.location && <span>{p.location}</span>}
                <span>{p.skillCount} skills</span>
                {p.onetCode && (
                  <span className="font-mono">{p.onetCode}</span>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                {p.overallConfidence > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          p.overallConfidence >= 70
                            ? "bg-green-500"
                            : p.overallConfidence >= 50
                              ? "bg-amber-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${p.overallConfidence}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400">
                      {p.overallConfidence}%
                    </span>
                  </div>
                )}
                <span className="text-xs text-slate-400">
                  {new Date(p.createdAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
