import { execSync } from "child_process";

const MODEL = "claude-haiku-4-5-20251001";

function getApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Check your .env.local file."
    );
  }
  return key;
}

export async function invokeAgent(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 16000,
  options?: { prefill?: string }
): Promise<{ text: string; truncated: boolean }> {
  const messages: Array<{ role: string; content: string }> = [
    { role: "user", content: userMessage },
  ];

  if (options?.prefill) {
    messages.push({ role: "assistant", content: options.prefill });
  }

  const body = JSON.stringify({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });

  // Write body to a temp file to avoid shell escaping issues with large prompts
  const tmpFile = `/tmp/anthropic-req-${Date.now()}.json`;
  const { writeFileSync, unlinkSync } = await import("fs");
  writeFileSync(tmpFile, body);

  try {
    const result = execSync(
      `curl -s --max-time 480 https://api.anthropic.com/v1/messages ` +
        `-H "x-api-key: ${getApiKey()}" ` +
        `-H "anthropic-version: 2023-06-01" ` +
        `-H "content-type: application/json" ` +
        `-d @${tmpFile}`,
      { maxBuffer: 50 * 1024 * 1024, timeout: 500000 }
    );

    const response = JSON.parse(result.toString());

    if (response.type === "error") {
      throw new Error(
        `API error: ${response.error?.type} - ${response.error?.message}`
      );
    }

    const truncated = response.stop_reason === "max_tokens";
    if (truncated) {
      console.warn(
        `[invokeAgent] Response was truncated at ${maxTokens} tokens (${response.usage?.output_tokens} used).`
      );
    }

    const textBlock = response.content?.find(
      (b: { type: string }) => b.type === "text"
    );
    const text = (options?.prefill ?? "") + (textBlock?.text ?? "");
    return { text, truncated };
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {
      // ignore cleanup errors
    }
  }
}

/**
 * Attempt to repair truncated JSON by finding the last valid structural point
 * and closing all open brackets/braces.
 */
function repairTruncatedJSON(json: string): string {
  let inString = false;
  let escape = false;
  const stack: string[] = [];
  let lastSafeEnd = 0;

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
      // structural chars
    } else if (/\d/.test(ch)) {
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

  let repaired = json.slice(0, lastSafeEnd);
  repaired = repaired.replace(/,\s*$/, "");

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

  while (remaining.length > 0) {
    const open = remaining.pop()!;
    repaired += open === "{" ? "}" : "]";
  }

  return repaired;
}

export function parseAgentJSON(response: string): unknown {
  let cleaned = response
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Fall through
  }

  const jsonMatch = cleaned.match(/(\{[\s\S]*\})/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      // Fall through
    }
  }

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
