"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ZAxis, Legend,
  Treemap,
} from "recharts";

// ── Types ──

interface DimensionInfo {
  key: string;
  label: string;
  group: string;
  type: "categorical" | "numeric" | "text";
  distinctValues?: string[];
  min?: number;
  max?: number;
}

interface FilterRule {
  field: string;
  op: string;
  value: string;
}

interface GroupRow {
  group: string;
  count: number;
  profiles: number;
  avg_confidence: number;
  min_confidence: number;
  max_confidence: number;
  avg_overall_confidence: number;
  avg_required_level: number;
  must_have: number;
  important: number;
  nice_to_have: number;
  contextual: number;
  confirmed: number;
  inferred: number;
  unknown_prov: number;
  seed_confirmed: number;
  seed_expanded: number;
  seed_new: number;
  core_skills: number;
  baseline_skills: number;
  foundational_skills: number;
  specialization_skills: number;
  durable: number;
  high_growth: number;
  high_value: number;
  declining: number;
  [key: string]: unknown;
}

interface AnalyticsResponse {
  totalSkills: number;
  totalProfiles: number;
  groupBy: string[];
  groups: GroupRow[];
  rawRows: Record<string, string | number | null>[];
  availableFields: string[];
}

interface SavedQuery {
  id: string;
  name: string;
  queryParams: { groupBy: string; filters?: FilterRule[] };
}

// ── Constants ──

const COLORS = [
  "#2E75B6", "#1B2A4A", "#5B9BD5", "#ED7D31", "#70AD47",
  "#FFC000", "#44546A", "#4472C4", "#A5A5A5", "#264478",
  "#9B59B6", "#E74C3C", "#1ABC9C", "#F39C12", "#2C3E50",
];

const OPS = [
  { value: "contains", label: "contains" },
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "not equals" },
  { value: "starts_with", label: "starts with" },
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "in", label: "in (pipe-sep)" },
];

type ChartType = "bar" | "stacked_bar" | "pie" | "radar" | "scatter" | "treemap";
type ViewMode = "chart" | "table" | "raw" | "pivot";

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "bar", label: "Bar" },
  { value: "stacked_bar", label: "Stacked" },
  { value: "pie", label: "Pie" },
  { value: "radar", label: "Radar" },
  { value: "scatter", label: "Scatter" },
  { value: "treemap", label: "Treemap" },
];

const METRICS = [
  { value: "count", label: "Count" },
  { value: "profiles", label: "Profiles" },
  { value: "avg_confidence", label: "Avg Confidence" },
  { value: "avg_overall_confidence", label: "Avg Overall Confidence" },
  { value: "avg_required_level", label: "Avg Required Level" },
];

// ── Component ──

export default function AnalyticsPage() {
  const [dimensions, setDimensions] = useState<DimensionInfo[]>([]);
  const [dimGroups, setDimGroups] = useState<Record<string, DimensionInfo[]>>({});
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const [groupBy, setGroupBy] = useState<string[]>(["bgt_category"]);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [metric, setMetric] = useState("count");
  const [sortBy, setSortBy] = useState("count");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [resultLimit, setResultLimit] = useState(50);

  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [saveName, setSaveName] = useState("");

  const [rawPage, setRawPage] = useState(0);
  const [rawSort, setRawSort] = useState<{ col: string; dir: "asc" | "desc" } | null>(null);
  const [rawSearch, setRawSearch] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  const [drillFilters, setDrillFilters] = useState<FilterRule[]>([]);

  useEffect(() => {
    fetch("/api/analytics/dimensions")
      .then((r) => r.json())
      .then((data) => {
        const dims: DimensionInfo[] = data.dimensions || [];
        setDimensions(dims);
        const groups: Record<string, DimensionInfo[]> = {};
        for (const d of dims) {
          if (!groups[d.group]) groups[d.group] = [];
          groups[d.group].push(d);
        }
        setDimGroups(groups);
      })
      .catch(console.error);

    fetch("/api/queries")
      .then((r) => r.json())
      .then((d) => setSavedQueries(Array.isArray(d) ? d : []))
      .catch(console.error);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const allFilters = [...filters, ...drillFilters];
    const params = new URLSearchParams({
      groupBy: groupBy.join(","),
      sortBy,
      sortDir,
      limit: String(resultLimit),
    });
    allFilters.forEach((f, i) => {
      params.set(`filter_${i}_field`, f.field);
      params.set(`filter_${i}_value`, f.value);
      params.set(`filter_${i}_op`, f.op);
    });
    try {
      const res = await fetch(`/api/analytics?${params}`);
      const json = await res.json();
      setData(json);
      if (json.availableFields && selectedColumns.length === 0) {
        setSelectedColumns(json.availableFields.slice(0, 12));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [groupBy, filters, drillFilters, sortBy, sortDir, resultLimit, selectedColumns.length]);

  useEffect(() => { loadData(); }, [loadData]);

  function addFilter() {
    const firstDim = dimensions[0]?.key || "bgt_category";
    setFilters([...filters, { field: firstDim, op: "contains", value: "" }]);
  }
  function removeFilter(idx: number) {
    setFilters(filters.filter((_, i) => i !== idx));
  }
  function updateFilter(idx: number, patch: Partial<FilterRule>) {
    setFilters(filters.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }

  function addGroupBy() {
    const unused = dimensions.find((d) => !groupBy.includes(d.key));
    if (unused) setGroupBy([...groupBy, unused.key]);
  }
  function removeGroupBy(idx: number) {
    if (groupBy.length > 1) setGroupBy(groupBy.filter((_, i) => i !== idx));
  }

  function handleDrillDown(groupValue: string) {
    if (groupBy.length === 1) {
      setDrillFilters([...drillFilters, { field: groupBy[0], op: "equals", value: groupValue }]);
    }
  }
  function clearDrill() { setDrillFilters([]); }

  async function saveQuery() {
    if (!saveName.trim()) return;
    await fetch("/api/queries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: saveName, queryParams: { groupBy: groupBy.join(","), filters } }),
    });
    setSaveName("");
    const res = await fetch("/api/queries");
    setSavedQueries(await res.json());
  }
  function loadQuery(q: SavedQuery) {
    const gb = typeof q.queryParams.groupBy === "string" ? q.queryParams.groupBy.split(",") : ["bgt_category"];
    setGroupBy(gb);
    setFilters(q.queryParams.filters || []);
    setDrillFilters([]);
  }

  function handleExport(format: string) {
    const allFilters = [...filters, ...drillFilters];
    const params = new URLSearchParams({ format });
    if (allFilters.length > 0 && allFilters[0].value) {
      params.set("filterField", allFilters[0].field);
      params.set("filterValue", allFilters[0].value);
    }
    window.open(`/api/analytics/export?${params}`, "_blank");
  }

  function dimLabel(key: string): string {
    return dimensions.find((d) => d.key === key)?.label || key.replace(/_/g, " ");
  }

  const rawRows = data?.rawRows || [];
  const allFields = data?.availableFields || [];
  const filteredRaw = rawSearch
    ? rawRows.filter((r) => selectedColumns.some((c) => String(r[c] ?? "").toLowerCase().includes(rawSearch.toLowerCase())))
    : rawRows;
  const sortedRaw = rawSort
    ? [...filteredRaw].sort((a, b) => {
        const av = a[rawSort.col] ?? "";
        const bv = b[rawSort.col] ?? "";
        if (typeof av === "number" && typeof bv === "number") return rawSort.dir === "desc" ? bv - av : av - bv;
        return rawSort.dir === "desc" ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
      })
    : filteredRaw;
  const rawPageSize = 25;
  const rawPageCount = Math.ceil(sortedRaw.length / rawPageSize);
  const pagedRaw = sortedRaw.slice(rawPage * rawPageSize, (rawPage + 1) * rawPageSize);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2A4A]" style={{ fontFamily: "DM Serif Display, Georgia, serif" }}>
            Analytics
          </h1>
          <p className="text-slate-500 mt-1">Query every dimension. Drill down into anything.</p>
        </div>
        <div className="flex items-center gap-2">
          {["csv", "xlsx", "json"].map((fmt) => (
            <button key={fmt} onClick={() => handleExport(fmt)}
              className="px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-slate-50 transition-colors text-slate-600">
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Query Builder */}
      <div className="bg-white rounded-xl border p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Query Builder</span>
          {drillFilters.length > 0 && (
            <button onClick={clearDrill} className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
              Clear drill-down ({drillFilters.length} active)
            </button>
          )}
        </div>

        {/* Group By */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-2">Group By</label>
          <div className="flex flex-wrap items-center gap-2">
            {groupBy.map((field, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-[#1B2A4A] text-white rounded-lg px-1 text-sm">
                <select value={field} onChange={(e) => {
                  const next = [...groupBy];
                  next[idx] = e.target.value;
                  setGroupBy(next);
                }} className="bg-transparent text-white py-1.5 pl-2 pr-1 text-sm outline-none [&>optgroup]:text-slate-900 [&>option]:text-slate-900">
                  {Object.entries(dimGroups).map(([group, dims]) => (
                    <optgroup key={group} label={group}>
                      {dims.map((d) => (
                        <option key={d.key} value={d.key}>{d.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {groupBy.length > 1 && (
                  <button onClick={() => removeGroupBy(idx)} className="text-white/60 hover:text-white px-1">&times;</button>
                )}
              </div>
            ))}
            <button onClick={addGroupBy} className="text-xs px-2 py-1.5 border border-dashed rounded-lg text-slate-400 hover:text-slate-600 hover:border-slate-400">
              + Add Level
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-2">Filters</label>
          {filters.map((f, idx) => (
            <div key={idx} className="flex items-center gap-2 mb-2">
              <select value={f.field} onChange={(e) => updateFilter(idx, { field: e.target.value })}
                className="border rounded-lg px-2 py-1.5 text-sm w-52">
                {Object.entries(dimGroups).map(([group, dims]) => (
                  <optgroup key={group} label={group}>
                    {dims.map((d) => (
                      <option key={d.key} value={d.key}>{d.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <select value={f.op} onChange={(e) => updateFilter(idx, { op: e.target.value })}
                className="border rounded-lg px-2 py-1.5 text-sm w-32">
                {OPS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {dimensions.find((d) => d.key === f.field)?.distinctValues?.length ? (
                <select value={f.value} onChange={(e) => updateFilter(idx, { value: e.target.value })}
                  className="border rounded-lg px-2 py-1.5 text-sm flex-1">
                  <option value="">Select...</option>
                  {dimensions.find((d) => d.key === f.field)?.distinctValues?.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              ) : (
                <input type="text" value={f.value} onChange={(e) => updateFilter(idx, { value: e.target.value })}
                  placeholder="Value..." className="border rounded-lg px-2 py-1.5 text-sm flex-1" />
              )}
              <button onClick={() => removeFilter(idx)} className="text-red-400 hover:text-red-600 px-1">&times;</button>
            </div>
          ))}
          <button onClick={addFilter}
            className="text-xs px-3 py-1.5 border border-dashed rounded-lg text-slate-400 hover:text-slate-600 hover:border-slate-400">
            + Add Filter
          </button>
        </div>

        {/* Controls Row */}
        <div className="flex flex-wrap items-end gap-4 pt-3 border-t">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Metric</label>
            <select value={metric} onChange={(e) => { setMetric(e.target.value); setSortBy(e.target.value); }}
              className="border rounded-lg px-2 py-1.5 text-sm">
              {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Sort</label>
            <div className="flex gap-1">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="border rounded-lg px-2 py-1.5 text-sm">
                {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                <option value="group">Name</option>
              </select>
              <button onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
                className="border rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                {sortDir === "desc" ? "DESC" : "ASC"}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Limit</label>
            <select value={resultLimit} onChange={(e) => setResultLimit(Number(e.target.value))}
              className="border rounded-lg px-2 py-1.5 text-sm">
              {[10, 25, 50, 100, 250, 500].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <input type="text" value={saveName} onChange={(e) => setSaveName(e.target.value)}
              placeholder="Save query as..." className="border rounded-lg px-2 py-1.5 text-sm w-40" />
            <button onClick={saveQuery} disabled={!saveName.trim()}
              className="px-3 py-1.5 text-xs font-medium bg-[#2E75B6] text-white rounded-lg hover:bg-[#1B2A4A] disabled:opacity-50">
              Save
            </button>
          </div>
        </div>

        {savedQueries.length > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <span className="text-xs text-slate-400">Saved:</span>
            {savedQueries.map((q) => (
              <button key={q.id} onClick={() => loadQuery(q)}
                className="text-xs px-2 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600">
                {q.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
          <StatCard label="Total Skills" value={data.totalSkills} />
          <StatCard label="Profiles" value={data.totalProfiles} />
          <StatCard label="Groups" value={data.groups.length} />
          <StatCard label="Must-Have" value={data.groups.reduce((a, g) => a + g.must_have, 0)} color="text-red-600" />
          <StatCard label="Confirmed" value={data.groups.reduce((a, g) => a + g.confirmed, 0)} color="text-green-600" />
          <StatCard label="Inferred" value={data.groups.reduce((a, g) => a + g.inferred, 0)} color="text-amber-600" />
        </div>
      )}

      {/* View Mode Tabs + Chart Type */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          {(["chart", "table", "raw", "pivot"] as ViewMode[]).map((mode) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === mode ? "bg-white text-[#1B2A4A] shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              {mode === "raw" ? "Raw Data" : mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        {viewMode === "chart" && (
          <div className="flex gap-1">
            {CHART_TYPES.map((ct) => (
              <button key={ct.value} onClick={() => setChartType(ct.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  chartType === ct.value ? "bg-[#1B2A4A] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}>
                {ct.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <div className="w-8 h-8 border-2 border-[#2E75B6] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading...
        </div>
      ) : !data || data.groups.length === 0 ? (
        <div className="bg-white rounded-xl border p-16 text-center text-slate-400">
          No data. Ingest and enrich job descriptions first.
        </div>
      ) : viewMode === "chart" ? (
        <ChartView data={data} chartType={chartType} metric={metric} groupBy={groupBy} dimLabel={dimLabel} onDrillDown={handleDrillDown} />
      ) : viewMode === "table" ? (
        <AggregateTable data={data} groupBy={groupBy} dimLabel={dimLabel} onDrillDown={handleDrillDown} />
      ) : viewMode === "raw" ? (
        <RawDataView
          rows={pagedRaw} allFields={allFields} selectedColumns={selectedColumns} setSelectedColumns={setSelectedColumns}
          rawSearch={rawSearch} setRawSearch={setRawSearch} rawSort={rawSort} setRawSort={setRawSort}
          rawPage={rawPage} setRawPage={setRawPage} rawPageCount={rawPageCount}
          totalFiltered={sortedRaw.length} totalAll={rawRows.length}
        />
      ) : (
        <PivotView data={data} groupBy={groupBy} dimLabel={dimLabel} />
      )}
    </div>
  );
}

// ── Sub-components ──

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className={`text-2xl font-bold ${color || "text-[#1B2A4A]"}`}>{value.toLocaleString()}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function ChartView({ data, chartType, metric, groupBy, dimLabel, onDrillDown }: {
  data: AnalyticsResponse; chartType: ChartType; metric: string;
  groupBy: string[]; dimLabel: (k: string) => string;
  onDrillDown: (val: string) => void;
}) {
  const groups = data.groups;

  if (chartType === "treemap") {
    const treemapData = groups.slice(0, 50).map((g, i) => ({
      name: g.group.length > 25 ? g.group.slice(0, 22) + "..." : g.group,
      size: Number(g[metric as keyof GroupRow] ?? g.count),
      fill: COLORS[i % COLORS.length],
    }));
    return (
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold text-[#1B2A4A] mb-4">
          {metric} by {groupBy.map(dimLabel).join(" + ")}
        </h2>
        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <Treemap data={treemapData} dataKey="size" nameKey="name" stroke="#fff"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content={({ x, y, width, height, name, value }: any) => {
                if (width < 40 || height < 25) return (<g />);
                return (
                  <g>
                    <rect x={x} y={y} width={width} height={height} fill={COLORS[0]} fillOpacity={0.15 + 0.85 * (value / (treemapData[0]?.size || 1))} stroke="#fff" strokeWidth={2} />
                    <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#1B2A4A" fontSize={11} fontWeight="bold">
                      {width > 60 ? name : ""}
                    </text>
                    <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="#64748b" fontSize={10}>
                      {value}
                    </text>
                  </g>
                );
              }}
            />
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (chartType === "scatter") {
    const scatterData = groups.map((g) => ({
      name: g.group,
      x: g.count,
      y: g.avg_confidence,
      z: g.profiles,
    }));
    return (
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold text-[#1B2A4A] mb-4">
          Count vs Confidence by {groupBy.map(dimLabel).join(" + ")}
        </h2>
        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="x" name="Count" tick={{ fontSize: 11 }} />
              <YAxis dataKey="y" name="Avg Confidence" tick={{ fontSize: 11 }} />
              <ZAxis dataKey="z" name="Profiles" range={[40, 400]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={({ payload }: any) => {
                  if (!payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white border rounded-lg shadow-lg p-3 text-sm">
                      <div className="font-bold">{d.name}</div>
                      <div>Count: {d.x}</div>
                      <div>Avg Confidence: {d.y}%</div>
                      <div>Profiles: {d.z}</div>
                    </div>
                  );
                }} />
              <Scatter data={scatterData} fill="#2E75B6" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      <h2 className="text-lg font-semibold text-[#1B2A4A] mb-4">
        {metric} by {groupBy.map(dimLabel).join(" + ")}
      </h2>
      <div className="h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart data={groups.slice(0, 30)} onClick={(e) => e?.activeLabel && onDrillDown(String(e.activeLabel))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="group" tick={{ fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={100} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey={metric} fill="#2E75B6" radius={[4, 4, 0, 0]} cursor="pointer" />
            </BarChart>
          ) : chartType === "stacked_bar" ? (
            <BarChart data={groups.slice(0, 30)} onClick={(e) => e?.activeLabel && onDrillDown(String(e.activeLabel))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="group" tick={{ fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={100} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="must_have" stackId="crit" fill="#E74C3C" name="Must-Have" />
              <Bar dataKey="important" stackId="crit" fill="#F39C12" name="Important" />
              <Bar dataKey="nice_to_have" stackId="crit" fill="#3498DB" name="Nice-to-Have" />
              <Bar dataKey="contextual" stackId="crit" fill="#95A5A6" name="Contextual" />
            </BarChart>
          ) : chartType === "pie" ? (
            <PieChart>
              <Pie data={groups.slice(0, 12)} dataKey={metric} nameKey="group" cx="50%" cy="50%" outerRadius={180}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label={(props: any) => `${props.name || ""} (${props.value || 0})`}>
                {groups.slice(0, 12).map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} cursor="pointer" />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          ) : (
            <RadarChart cx="50%" cy="50%" outerRadius={160} data={groups.slice(0, 10)}>
              <PolarGrid />
              <PolarAngleAxis dataKey="group" tick={{ fontSize: 9 }} />
              <PolarRadiusAxis tick={{ fontSize: 10 }} />
              <Radar dataKey={metric} stroke="#2E75B6" fill="#2E75B6" fillOpacity={0.3} />
              <Tooltip />
            </RadarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AggregateTable({ data, groupBy, dimLabel, onDrillDown }: {
  data: AnalyticsResponse;
  groupBy: string[]; dimLabel: (k: string) => string;
  onDrillDown: (val: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-5 py-3 bg-slate-50 border-b flex items-center justify-between">
        <h2 className="font-semibold text-sm text-slate-600">
          Aggregated by {groupBy.map(dimLabel).join(" + ")}
        </h2>
        <span className="text-xs text-slate-400">{data.groups.length} groups</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left">
              <th className="px-4 py-2.5 font-medium text-slate-600">{groupBy.map(dimLabel).join(" + ")}</th>
              <th className="px-3 py-2.5 font-medium text-slate-600 text-right">Count</th>
              <th className="px-3 py-2.5 font-medium text-slate-600 text-right">Profiles</th>
              <th className="px-3 py-2.5 font-medium text-slate-600 text-right">Avg Conf</th>
              <th className="px-3 py-2.5 font-medium text-slate-600 text-right">Avg Level</th>
              <th className="px-3 py-2.5 font-medium text-slate-600 text-right">Must-Have</th>
              <th className="px-3 py-2.5 font-medium text-slate-600 text-right">Important</th>
              <th className="px-3 py-2.5 font-medium text-slate-600 text-right">Nice-to-Have</th>
              <th className="px-3 py-2.5 font-medium text-slate-600 text-right">Confirmed</th>
              <th className="px-3 py-2.5 font-medium text-slate-600 text-right">Inferred</th>
              <th className="px-3 py-2.5 font-medium text-slate-600 text-right">Core</th>
              <th className="px-3 py-2.5 font-medium text-slate-600 text-right">Baseline</th>
              <th className="px-3 py-2.5 font-medium text-slate-600 text-right">Found.</th>
              <th className="px-3 py-2.5 font-medium text-slate-600 text-right">Special.</th>
            </tr>
          </thead>
          <tbody>
            {data.groups.map((g) => (
              <tr key={g.group} className="border-b last:border-b-0 hover:bg-blue-50 cursor-pointer transition-colors"
                onClick={() => onDrillDown(g.group)}>
                <td className="px-4 py-2.5 font-medium text-slate-800 max-w-[250px] truncate">{g.group}</td>
                <td className="px-3 py-2.5 text-right font-mono text-slate-700">{g.count}</td>
                <td className="px-3 py-2.5 text-right text-slate-600">{g.profiles}</td>
                <td className="px-3 py-2.5 text-right"><ConfBadge value={g.avg_confidence} /></td>
                <td className="px-3 py-2.5 text-right text-slate-600">{g.avg_required_level}</td>
                <td className="px-3 py-2.5 text-right text-red-600">{g.must_have || ""}</td>
                <td className="px-3 py-2.5 text-right text-amber-600">{g.important || ""}</td>
                <td className="px-3 py-2.5 text-right text-blue-600">{g.nice_to_have || ""}</td>
                <td className="px-3 py-2.5 text-right text-green-600">{g.confirmed || ""}</td>
                <td className="px-3 py-2.5 text-right text-amber-600">{g.inferred || ""}</td>
                <td className="px-3 py-2.5 text-right text-slate-500">{g.core_skills || ""}</td>
                <td className="px-3 py-2.5 text-right text-slate-500">{g.baseline_skills || ""}</td>
                <td className="px-3 py-2.5 text-right text-slate-500">{g.foundational_skills || ""}</td>
                <td className="px-3 py-2.5 text-right text-slate-500">{g.specialization_skills || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RawDataView({ rows, allFields, selectedColumns, setSelectedColumns, rawSearch, setRawSearch,
  rawSort, setRawSort, rawPage, setRawPage, rawPageCount, totalFiltered, totalAll }: {
  rows: Record<string, string | number | null>[];
  allFields: string[];
  selectedColumns: string[];
  setSelectedColumns: (cols: string[]) => void;
  rawSearch: string;
  setRawSearch: (s: string) => void;
  rawSort: { col: string; dir: "asc" | "desc" } | null;
  setRawSort: (s: { col: string; dir: "asc" | "desc" } | null) => void;
  rawPage: number;
  setRawPage: (n: number) => void;
  rawPageCount: number;
  totalFiltered: number;
  totalAll: number;
}) {
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  const fieldGroups: Record<string, string[]> = {};
  for (const f of allFields) {
    let group = "Other";
    if (f.startsWith("ejcp_")) group = "EJCP Layers";
    else if (["profile_id", "profile_status", "overall_confidence", "job_title", "company", "location", "onet_code"].includes(f)) group = "Profile";
    else if (["skill_name", "bgt_category", "label", "criticality", "required_level", "definition", "how_utilized"].includes(f)) group = "Skill Core";
    else if (f.startsWith("provenance_") || f === "seed_status") group = "Provenance";
    else if (f.startsWith("proficiency_") || f.startsWith("abilities_")) group = "Abilities";
    else if (["knowledge_domain", "knowledge_level", "bloom_target", "credential_level", "assessment_type", "cip_primary"].includes(f)) group = "Knowledge";
    else if (f.startsWith("learning_mode") || f.startsWith("partnership_") || f === "refresh_cadence" || f === "program_fit") group = "Learning";
    if (!fieldGroups[group]) fieldGroups[group] = [];
    fieldGroups[group].push(f);
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-5 py-3 bg-slate-50 border-b flex items-center gap-3">
        <input type="text" value={rawSearch} onChange={(e) => { setRawSearch(e.target.value); setRawPage(0); }}
          placeholder="Search across visible columns..." className="border rounded-lg px-3 py-1.5 text-sm flex-1" />
        <button onClick={() => setShowColumnPicker(!showColumnPicker)}
          className="px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-slate-100 text-slate-600">
          Columns ({selectedColumns.length}/{allFields.length})
        </button>
        <span className="text-xs text-slate-400">
          {totalFiltered === totalAll ? `${totalAll} rows` : `${totalFiltered} of ${totalAll} rows`}
        </span>
      </div>

      {showColumnPicker && (
        <div className="px-5 py-3 border-b bg-slate-50 max-h-60 overflow-y-auto">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => setSelectedColumns(allFields)} className="text-xs text-blue-600 hover:underline">Select All</button>
            <button onClick={() => setSelectedColumns(allFields.slice(0, 8))} className="text-xs text-blue-600 hover:underline">Reset</button>
          </div>
          {Object.entries(fieldGroups).map(([group, fields]) => (
            <div key={group} className="mb-2">
              <div className="text-xs font-bold text-slate-500 uppercase mb-1">{group}</div>
              <div className="flex flex-wrap gap-1">
                {fields.map((f) => (
                  <label key={f} className={`text-xs px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                    selectedColumns.includes(f) ? "bg-[#2E75B6] text-white" : "bg-slate-200 text-slate-600"
                  }`}>
                    <input type="checkbox" className="hidden"
                      checked={selectedColumns.includes(f)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedColumns([...selectedColumns, f]);
                        else setSelectedColumns(selectedColumns.filter((c) => c !== f));
                      }} />
                    {f.replace(/_/g, " ")}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-slate-50">
              {selectedColumns.map((col) => (
                <th key={col}
                  className="px-3 py-2 text-left font-medium text-slate-600 cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                  onClick={() => {
                    if (rawSort?.col === col) setRawSort({ col, dir: rawSort.dir === "desc" ? "asc" : "desc" });
                    else setRawSort({ col, dir: "desc" });
                  }}>
                  {col.replace(/_/g, " ")}
                  {rawSort?.col === col && (rawSort.dir === "desc" ? " v" : " ^")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b last:border-b-0 hover:bg-blue-50/50">
                {selectedColumns.map((col) => (
                  <td key={col} className="px-3 py-1.5 text-slate-700 max-w-[200px] truncate whitespace-nowrap">
                    {String(row[col] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t bg-slate-50 flex items-center justify-between">
        <button onClick={() => setRawPage(Math.max(0, rawPage - 1))} disabled={rawPage === 0}
          className="text-xs px-3 py-1 border rounded disabled:opacity-30">Prev</button>
        <span className="text-xs text-slate-500">Page {rawPage + 1} of {Math.max(1, rawPageCount)}</span>
        <button onClick={() => setRawPage(Math.min(rawPageCount - 1, rawPage + 1))} disabled={rawPage >= rawPageCount - 1}
          className="text-xs px-3 py-1 border rounded disabled:opacity-30">Next</button>
      </div>
    </div>
  );
}

function PivotView({ data, groupBy, dimLabel }: {
  data: AnalyticsResponse; groupBy: string[]; dimLabel: (k: string) => string;
}) {
  const groups = data.groups;
  const breakdowns = [
    { title: "Criticality Distribution", keys: [
      { key: "must_have", label: "Must-Have", color: "bg-red-500" },
      { key: "important", label: "Important", color: "bg-amber-500" },
      { key: "nice_to_have", label: "Nice-to-Have", color: "bg-blue-500" },
      { key: "contextual", label: "Contextual", color: "bg-slate-400" },
    ]},
    { title: "BGT Category Distribution", keys: [
      { key: "core_skills", label: "Core", color: "bg-[#2E75B6]" },
      { key: "baseline_skills", label: "Baseline", color: "bg-[#5B9BD5]" },
      { key: "foundational_skills", label: "Foundational", color: "bg-[#70AD47]" },
      { key: "specialization_skills", label: "Specialization", color: "bg-[#ED7D31]" },
    ]},
    { title: "Provenance Distribution", keys: [
      { key: "confirmed", label: "Confirmed", color: "bg-green-500" },
      { key: "inferred", label: "Inferred", color: "bg-amber-500" },
      { key: "unknown_prov", label: "Unknown", color: "bg-slate-400" },
    ]},
    { title: "Skill Label Distribution", keys: [
      { key: "durable", label: "Durable", color: "bg-indigo-500" },
      { key: "high_growth", label: "High Growth", color: "bg-emerald-500" },
      { key: "high_value", label: "High Value", color: "bg-amber-500" },
      { key: "declining", label: "Declining", color: "bg-red-400" },
    ]},
  ];

  return (
    <div className="space-y-4">
      {breakdowns.map((bd) => (
        <div key={bd.title} className="bg-white rounded-xl border overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b">
            <h3 className="text-sm font-semibold text-slate-600">{bd.title} by {groupBy.map(dimLabel).join(" + ")}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-4 py-2 text-left font-medium text-slate-600">{groupBy.map(dimLabel).join(" + ")}</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">Total</th>
                  {bd.keys.map((k) => (
                    <th key={k.key} className="px-3 py-2 text-right font-medium text-slate-600">{k.label}</th>
                  ))}
                  <th className="px-4 py-2 font-medium text-slate-600 w-64">Distribution</th>
                </tr>
              </thead>
              <tbody>
                {groups.slice(0, 30).map((g) => {
                  const total = bd.keys.reduce((a, k) => a + (Number(g[k.key as keyof GroupRow]) || 0), 0);
                  return (
                    <tr key={g.group} className="border-b last:border-b-0 hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-800 max-w-[200px] truncate">{g.group}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-700">{total}</td>
                      {bd.keys.map((k) => (
                        <td key={k.key} className="px-3 py-2 text-right text-slate-600">
                          {Number(g[k.key as keyof GroupRow]) || 0}
                        </td>
                      ))}
                      <td className="px-4 py-2">
                        <div className="flex h-4 rounded-full overflow-hidden bg-slate-100">
                          {bd.keys.map((k) => {
                            const val = Number(g[k.key as keyof GroupRow]) || 0;
                            const pct = total > 0 ? (val / total) * 100 : 0;
                            if (pct === 0) return null;
                            return (
                              <div key={k.key} className={`${k.color} transition-all`}
                                style={{ width: `${pct}%` }} title={`${k.label}: ${val} (${pct.toFixed(0)}%)`} />
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConfBadge({ value }: { value: number }) {
  const cls = value >= 70 ? "bg-green-100 text-green-700" : value >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{value}%</span>;
}
