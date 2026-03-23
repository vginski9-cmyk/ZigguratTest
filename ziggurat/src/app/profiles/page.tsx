"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ProfileSummary {
  id: string;
  roleTitle: string;
  employer: string;
  location: string;
  skillCount: number;
  validationStatus: string;
  createdAt: string;
  socCode: string;
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((data) => setProfiles(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = profiles.filter((p) => {
    if (filterStatus !== "all" && p.validationStatus !== filterStatus)
      return false;
    if (
      search &&
      !p.roleTitle.toLowerCase().includes(search.toLowerCase()) &&
      !p.employer.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    ai_enriched: "bg-blue-100 text-blue-700",
    human_verified: "bg-amber-100 text-amber-700",
    published: "bg-green-100 text-green-700",
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-[#1B2A4A] mb-2">
        Skill Profiles
      </h1>
      <p className="text-slate-500 mb-6">Browse all skill profiles.</p>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by role or employer..."
          className="flex-1 border rounded-lg px-4 py-2 text-sm"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-lg px-4 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="ai_enriched">AI Enriched</option>
          <option value="human_verified">Human Verified</option>
          <option value="published">Published</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <p className="text-slate-500 mb-4">No profiles found.</p>
          <Link
            href="/submit"
            className="text-[#2E75B6] hover:underline"
          >
            Submit a job description
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
                  {p.roleTitle}
                </h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${statusColors[p.validationStatus] || "bg-slate-100"}`}
                >
                  {p.validationStatus.replace("_", " ")}
                </span>
              </div>
              <p className="text-sm text-slate-500 mb-2">{p.employer}</p>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span>{p.location}</span>
                <span>{p.skillCount} skills</span>
                {p.socCode && (
                  <span className="font-mono">{p.socCode}</span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-2">
                {new Date(p.createdAt).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
