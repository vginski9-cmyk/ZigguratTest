"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface QueueItem {
  id: string;
  entityType: string;
  entityId: string;
  gate: string;
  status: string;
  createdAt: string;
  roleTitle?: string;
  employer?: string;
}

export default function ReviewQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((profiles: Array<Record<string, unknown>>) => {
        // Build queue items from profiles and their EJCP data
        const queue: QueueItem[] = [];
        for (const p of profiles) {
          if (p.validationStatus === "ai_enriched") {
            // Could be gate1 or gate2 depending on context
            const profileData = p.profileData as Record<string, unknown> | null;
            queue.push({
              id: p.id as string,
              entityType: "profile",
              entityId: p.id as string,
              gate: "gate2",
              status: "pending",
              createdAt: p.createdAt as string,
              roleTitle: (profileData as Record<string, Record<string, string>>)?.meta?.role_title || (p.roleTitle as string) || "Untitled",
              employer: (profileData as Record<string, Record<string, string>>)?.meta?.employer || (p.employer as string) || "Unknown",
            });
          }
        }
        setItems(queue);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const gateColors: Record<string, string> = {
    gate1: "bg-blue-100 text-blue-700",
    gate2: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-[#1B2A4A] mb-2">Review Queue</h1>
      <p className="text-slate-500 mb-8">
        Profiles awaiting human review and validation.
      </p>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <p className="text-slate-500 mb-4">No items in the review queue.</p>
          <Link
            href="/submit"
            className="text-[#2E75B6] hover:underline"
          >
            Submit a job description to get started
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          {items.map((item) => (
            <Link
              key={item.id}
              href={
                item.gate === "gate1"
                  ? `/review/gate1/${item.entityId}`
                  : `/review/gate2/${item.entityId}`
              }
              className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors border-b last:border-b-0"
            >
              <div>
                <div className="font-medium text-slate-800">
                  {item.roleTitle}
                </div>
                <div className="text-sm text-slate-500">{item.employer}</div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${gateColors[item.gate]}`}
                >
                  {item.gate === "gate1"
                    ? "Gate 1: Context Review"
                    : "Gate 2: Skill Review"}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
