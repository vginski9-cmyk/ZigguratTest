import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function invokeAgent(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  return textBlock?.text ?? "";
}

export function parseAgentJSON(response: string): unknown {
  const cleaned = response
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  return JSON.parse(cleaned);
}
