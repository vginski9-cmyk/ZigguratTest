"use client";

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color =
    confidence >= 85
      ? "bg-green-500 text-white"
      : confidence >= 50
        ? "bg-yellow-500 text-white"
        : "bg-red-500 text-white";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}
    >
      {confidence}%
    </span>
  );
}

export function ProvenanceBadge({
  provenance,
}: {
  provenance: string;
}) {
  const color =
    provenance === "extracted"
      ? "bg-blue-100 text-blue-700 border-blue-300"
      : provenance === "inferred"
        ? "bg-purple-100 text-purple-700 border-purple-300"
        : "bg-red-100 text-red-700 border-red-300";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}
    >
      {provenance}
    </span>
  );
}
