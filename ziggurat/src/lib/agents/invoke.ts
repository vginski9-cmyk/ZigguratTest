import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

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
      // Fall through
    }
  }

  throw new Error(
    `Could not parse JSON from response (length=${response.length}). First 200 chars: ${response.slice(0, 200)}`
  );
}
