import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  timeout: 5 * 60 * 1000, // 5 minutes — large prompts need time
});

export async function invokeAgent(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 16000
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  if (response.stop_reason === "max_tokens") {
    console.warn(
      `[invokeAgent] Response was truncated at ${maxTokens} tokens. Consider increasing maxTokens.`
    );
  }

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  return textBlock?.text ?? "";
}

/**
 * Attempt to repair truncated JSON by closing unclosed brackets/braces
 * and removing trailing commas.
 */
function repairTruncatedJSON(json: string): string {
  // Remove trailing commas before } or ]
  let repaired = json.replace(/,\s*([}\]])/g, "$1");

  // Remove any trailing incomplete key-value (e.g. `"key": ` or `"key":`)
  repaired = repaired.replace(/,?\s*"[^"]*"\s*:\s*$/, "");
  // Remove trailing incomplete string value (e.g. `"key": "some text that got cut`)
  repaired = repaired.replace(/,?\s*"[^"]*"\s*:\s*"[^"]*$/, "");

  // Count unclosed braces and brackets
  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escape = false;

  for (const ch of repaired) {
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") braces++;
    if (ch === "}") braces--;
    if (ch === "[") brackets++;
    if (ch === "]") brackets--;
  }

  // If we're inside a string, close it
  if (inString) {
    repaired += '"';
  }

  // Close unclosed brackets then braces
  while (brackets > 0) {
    repaired += "]";
    brackets--;
  }
  while (braces > 0) {
    repaired += "}";
    braces--;
  }

  // Clean up trailing commas one more time after repairs
  repaired = repaired.replace(/,\s*([}\]])/g, "$1");

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
