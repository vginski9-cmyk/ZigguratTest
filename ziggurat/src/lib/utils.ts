import { createHash } from "crypto";

export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function confidenceColor(confidence: number): string {
  if (confidence >= 85) return "green";
  if (confidence >= 50) return "yellow";
  return "red";
}

export function provenanceColor(provenance: string): string {
  switch (provenance) {
    case "extracted":
      return "blue";
    case "inferred":
      return "purple";
    case "unknown":
      return "red";
    default:
      return "gray";
  }
}
