import Anthropic from "@anthropic-ai/sdk";
import { executeCustomTool } from "./tools";
import { parseAgentJSON } from "./invoke";

const MODEL = "claude-sonnet-4-20250514";

function getApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Check your .env.local file."
    );
  }
  return key;
}

interface ContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: unknown;
  [key: string]: unknown;
}

interface ToolUseResult {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export interface AgentToolsOptions {
  maxIterations?: number;
  maxTokens?: number;
  onProgress?: (step: string) => void;
}

export async function invokeAgentWithTools(
  systemPrompt: string,
  userMessage: string,
  tools: unknown[],
  options: AgentToolsOptions = {}
): Promise<{ text: string; toolCalls: number; truncated: boolean }> {
  const { maxIterations = 15, maxTokens = 64000 } = options;

  const client = new Anthropic({ apiKey: getApiKey() });

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  let totalText = "";
  let totalToolCalls = 0;
  let truncated = false;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    options.onProgress?.(
      `Agent iteration ${iteration + 1}/${maxIterations}...`
    );

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
      tools: tools as Anthropic.Tool[],
    });

    truncated = response.stop_reason === "max_tokens";

    // Collect text from response
    const textBlocks: string[] = [];
    const toolUseBlocks: ContentBlock[] = [];
    const serverToolBlocks: ContentBlock[] = [];

    for (const block of response.content as unknown as ContentBlock[]) {
      if (block.type === "text") {
        textBlocks.push(block.text || "");
      } else if (block.type === "tool_use") {
        toolUseBlocks.push(block);
        totalToolCalls++;
      } else if (block.type === "server_tool_use") {
        serverToolBlocks.push(block);
        totalToolCalls++;
      }
      // web_search_tool_result blocks are handled automatically by the SDK
    }

    totalText += textBlocks.join("");

    // If no tool calls, we're done — this is the final response
    if (toolUseBlocks.length === 0 && serverToolBlocks.length === 0) {
      break;
    }

    // If there are only server-side tool blocks (web_search), the SDK handles them.
    // We still need to push the assistant response and continue the loop.
    // The server tool results are already embedded in the response content.
    messages.push({
      role: "assistant",
      content: response.content as unknown as Anthropic.ContentBlockParam[],
    });

    // Process custom tool calls (fetch_url etc.) — need to send tool_result
    if (toolUseBlocks.length > 0) {
      const toolResults: Array<{
        type: "tool_result";
        tool_use_id: string;
        content: string;
        is_error?: boolean;
      }> = [];

      for (const toolBlock of toolUseBlocks) {
        options.onProgress?.(`Calling tool: ${toolBlock.name}...`);
        const result = await executeCustomTool(
          toolBlock.name!,
          toolBlock.input as Record<string, unknown>
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolBlock.id!,
          content: result.content,
          is_error: result.is_error,
        });
      }

      messages.push({
        role: "user",
        content: toolResults as unknown as Anthropic.ContentBlockParam[],
      });
    }
  }

  return { text: totalText, toolCalls: totalToolCalls, truncated };
}

export function parseResearcherJSON(response: string): unknown {
  return parseAgentJSON(response);
}
