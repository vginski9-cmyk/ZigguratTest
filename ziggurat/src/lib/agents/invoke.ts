import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  timeout: 5 * 60 * 1000, // 5 minutes — large prompts need time
});

export async function invokeAgent(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 16000,
  options?: { prefill?: string }
): Promise<{ text: string; truncated: boolean }> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  // Assistant prefill forces the model to continue from this text
  // (avoids markdown fences, ensures JSON starts immediately)
  if (options?.prefill) {
    messages.push({ role: "assistant", content: options.prefill });
  }

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });

  const truncated = response.stop_reason === "max_tokens";
  if (truncated) {
    console.warn(
      `[invokeAgent] Response was truncated at ${maxTokens} tokens (${response.usage?.output_tokens} used).`
    );
  }

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  const text = (options?.prefill ?? "") + (textBlock?.text ?? "");
  return { text, truncated };
}

/**
 * Attempt to repair truncated JSON by finding the last valid structural point
 * and closing all open brackets/braces.
 */
function repairTruncatedJSON(json: string): string {
  // Walk character by character tracking structure
  let inString = false;
  let escape = false;
  const stack: string[] = []; // track open { and [
  let lastSafeEnd = 0; // last position after a complete value

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\") {
      if (inString) escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      if (!inString) {
        // Just closed a string — this is a safe point
        lastSafeEnd = i + 1;
      }
      continue;
    }

    if (inString) continue;

    if (ch === "{" || ch === "[") {
      stack.push(ch);
    } else if (ch === "}") {
      stack.pop();
      lastSafeEnd = i + 1;
    } else if (ch === "]") {
      stack.pop();
      lastSafeEnd = i + 1;
    } else if (ch === "," || ch === ":") {
      // structural chars are fine
    } else if (/\d/.test(ch)) {
      // number — find end of number
      let j = i;
      while (j < json.length && /[\d.eE+\-]/.test(json[j])) j++;
      lastSafeEnd = j;
      i = j - 1;
    } else if (json.slice(i, i + 4) === "true") {
      lastSafeEnd = i + 4;
      i += 3;
    } else if (json.slice(i, i + 5) === "false") {
      lastSafeEnd = i + 5;
      i += 4;
    } else if (json.slice(i, i + 4) === "null") {
      lastSafeEnd = i + 4;
      i += 3;
    }
  }

  // Truncate to last safe position
  let repaired = json.slice(0, lastSafeEnd);

  // Remove trailing commas
  repaired = repaired.replace(/,\s*$/, "");

  // Re-count what's still open
  const remaining: string[] = [];
  inString = false;
  escape = false;
  for (const ch of repaired) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { if (inString) escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") remaining.push("{");
    else if (ch === "[") remaining.push("[");
    else if (ch === "}" || ch === "]") remaining.pop();
  }

  // Close everything in reverse order
  while (remaining.length > 0) {
    const open = remaining.pop()!;
    repaired += open === "{" ? "}" : "]";
  }

  return repaired;
}

export function parseAgentJSON(response: string): unknown {
  // Strip markdown code fences
  let cleaned = response
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {
    // Fall through to extraction
  }

  // Try to extract JSON object from surrounding text
  const jsonMatch = cleaned.match(/(\{[\s\S]*\})/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      // Fall through to repair
    }
  }

  // Find the start of the JSON object and try to repair truncated response
  const objStart = cleaned.indexOf("{");
  if (objStart !== -1) {
    const fragment = cleaned.slice(objStart);
    const repaired = repairTruncatedJSON(fragment);
    try {
      return JSON.parse(repaired);
    } catch {
      // Fall through
    }
  }

  throw new Error(
    `Could not parse JSON from response (length=${response.length}). First 200 chars: ${response.slice(0, 200)}`
  );
}
