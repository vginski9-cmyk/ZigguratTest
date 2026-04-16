"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

interface GroupData {
  group: string;
  count: number;
  avgConfidence: number;
  profiles: number;
  criticalityBreakdown: Record<string, number>;
}

interface AnalyticsResponse {
  totalSkills: number;
  totalProfiles: number;
  groupBy: string;
  groups: GroupData[];
  rawRows: Array<Record<string, unknown>>;
}

interface SavedQuery {
  id: string;
  name: string;
  description: string;
  queryParams: { groupBy: string; filterField?: string; filterValue?: string };
}

const COLORS = [
  "#2E75B6", "#1B2A4A", "#5B9BD5", "#ED7D31", "#70AD47",
  "#FFC000", "#44546A", "#4472C4", "#A5A5A5", "#264478",
];

const GROUP_OPTIONS = [
  { value: "bgtCategory", label: "Skill Category" },
  { value: "criticality", label: "Criticality" },
  { value: "label", label: "Skill Label" },
  { value: "company", label: "Company" },
  { value: "location", label: "Location" },
  { value: "onetCode", label: "O*NET Code" },
  { value: "jobTitle", label: "Job Title" },
  { value: "roleLevel", label: "Role Level" },
  { value: "seedStatus", label: "Seed Status" },
  { value: "provenanceState", label: "Provenance State" },
  { value: "requiredLevel", label: "Required Level" },
];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState("bgtCategory");
  const [filterField, setFilterField] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [chartType, setChartType] = useState<"bar" | "pie" | "radar">("bar");
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [saveName, setSaveName] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ groupBy });
    if (filterField && filterValue) {
      params.set("filterField", filterField);
      params.set("filterValue", filterValue);
    }
    try {
      const res = await fetch(`/api/analytics?${params}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [groupBy, filterField, filterValue]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    fetch("/api/queries")
      .then((r) => r.json())
      .then((data) => setSavedQueries(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  async function saveQuery() {
    if (!saveName.trim()) return;
    await fetch("/api/queries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: saveName,
        queryParams: { groupBy, filterField, filterValue },
      }),
    });
    setSaveName("");
    const res = await fetch("/api/queries");
    setSavedQueries(await res.json());
  }

  function loadQuery(q: SavedQuery) {
    setGroupBy(q.queryParams.groupBy || "bgtCategory");
    setFilterField(q.queryParams.filterField || "");
    setFilterValue(q.queryParams.filterValue || "");
  }

  async function handleExport(format: string) {
    const params = new URLSearchParams({ format, groupBy });
    if (filterField && filterValue) {
      params.set("filterField", filterField);
      params.set("filterValue", filterValue);
    }
    window.open(`/api/analytics/export?${params}`, "_blank");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-3xl font-bold text-[#1B2A4A]"
            style={{ fontFamily: "DM Serif Display, Georgia, serif" }}
          >
            Analytics
          </h1>
          <p className="text-slate-500 mt-1">
            Query, visualize, and export skill data
          </p>
        </div>
        {/* Export buttons */}
        <div className="flex items-center gap-2">
          {["csv", "xlsx", "json"].map((fmt) => (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              className="px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
            >
              Export {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Query Builder */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Group By
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {GROUP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Filter Field
            </label>
            <select
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">No filter</option>
              {GROUP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
              <option value="skillName">Skill Name</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Filter Value
            </label>
            <input
              type="text"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              placeholder="Type to filter..."
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Chart Type
            </label>
            <div className="flex gap-1">
              {(["bar", "pie", "radar"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    chartType === type
                      ? "bg-[#1B2A4A] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Saved Queries */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Save this query as..."
              className="border rounded-lg px-3 py-1.5 text-sm w-48"
            />
            <button
              onClick={saveQuery}
              disabled={!saveName.trim()}
              className="px-3 py-1.5 text-xs font-medium bg-[#2E75B6] text-white rounded-lg hover:bg-[#1B2A4A] disabled:opacity-50 transition-colors"
            >
              Save
            </button>
          </div>
          {savedQueries.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Saved:</span>
              {savedQueries.map((q) => (
                <button
                  key={q.id}
                  onClick={() => loadQuery(q)}
                  className="text-xs px-2 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  {q.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      {data && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-5">
            <div className="text-3xl font-bold text-[#1B2A4A]">
              {data.totalProfiles}
            </div>
            <div className="text-sm text-slate-500">Profiles</div>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <div className="text-3xl font-bold text-[#1B2A4A]">
              {data.totalSkills}
            </div>
            <div className="text-sm text-slate-500">Total Skills</div>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <div className="text-3xl font-bold text-[#1B2A4A]">
              {data.groups.length}
            </div>
            <div className="text-sm text-slate-500">
              Groups ({GROUP_OPTIONS.find((o) => o.value === groupBy)?.label})
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : data && data.groups.length > 0 ? (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#1B2A4A] mb-4">
            Distribution by{" "}
            {GROUP_OPTIONS.find((o) => o.value === groupBy)?.label}
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "bar" ? (
                <BarChart data={data.groups.slice(0, 20)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="group"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2E75B6" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : chartType === "pie" ? (
                <PieChart>
                  <Pie
                    data={data.groups.slice(0, 10)}
                    dataKey="count"
                    nameKey="group"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label={(props: any) =>
                      `${props.name || ""} (${props.value || 0})`
                    }
                  >
                    {data.groups.slice(0, 10).map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={COLORS[idx % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              ) : (
                <RadarChart
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  data={data.groups.slice(0, 8)}
                >
                  <PolarGrid />
                  <PolarAngleAxis dataKey="group" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis tick={{ fontSize: 10 }} />
                  <Radar
                    dataKey="count"
                    stroke="#2E75B6"
                    fill="#2E75B6"
                    fillOpacity={0.3}
                  />
                  <Tooltip />
                </RadarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border p-12 text-center text-slate-400">
          No data to display. Ingest and enrich job descriptions first.
        </div>
      )}

      {/* Data Table */}
      {data && data.groups.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-6 py-3 bg-slate-50 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm text-slate-600">
              Data Table
            </h2>
            <span className="text-xs text-slate-400">
              {data.groups.length} groups
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium text-slate-600">
                    {GROUP_OPTIONS.find((o) => o.value === groupBy)?.label}
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">
                    Count
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">
                    Profiles
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">
                    Avg Confidence
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">
                    Must-Have
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">
                    Important
                  </th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">
                    Nice-to-Have
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.groups.map((g) => (
                  <tr
                    key={g.group}
                    className="border-b last:border-b-0 hover:bg-slate-50"
                  >
                    <td className="px-6 py-3 font-medium text-slate-800">
                      {g.group}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {g.count}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {g.profiles}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          g.avgConfidence >= 70
                            ? "bg-green-100 text-green-700"
                            : g.avgConfidence >= 50
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {g.avgConfidence}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {g.criticalityBreakdown.must_have}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {g.criticalityBreakdown.important}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-600">
                      {g.criticalityBreakdown.nice_to_have}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
