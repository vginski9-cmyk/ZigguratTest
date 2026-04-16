import { convert } from "html-to-text";

// Anthropic server-side web search tool
export const WEB_SEARCH_TOOL = {
  type: "web_search_20250305" as const,
  name: "web_search",
  max_uses: 10,
};

// Custom tool: fetch and extract text from a URL
export const FETCH_URL_TOOL = {
  name: "fetch_url",
  description:
    "Fetches the content of a web page at the given URL and returns extracted text. Use this to read job postings, company pages, or other relevant URLs.",
  input_schema: {
    type: "object" as const,
    properties: {
      url: {
        type: "string",
        description: "The full URL to fetch",
      },
    },
    required: ["url"],
  },
};

export const RESEARCHER_TOOLS = [WEB_SEARCH_TOOL, FETCH_URL_TOOL];

export async function executeCustomTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<{ content: string; is_error?: boolean }> {
  if (toolName === "fetch_url") {
    return fetchUrl(toolInput.url as string);
  }
  return { content: `Unknown tool: ${toolName}`, is_error: true };
}

async function fetchUrl(
  url: string
): Promise<{ content: string; is_error?: boolean }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ZigguratBot/1.0; research tool)",
        Accept: "text/html,application/xhtml+xml,text/plain",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        content: `Failed to fetch URL (${res.status}): ${res.statusText}`,
        is_error: true,
      };
    }

    const contentType = res.headers.get("content-type") || "";
    const body = await res.text();

    if (contentType.includes("text/html")) {
      const text = convert(body, {
        wordwrap: 120,
        selectors: [
          { selector: "script", format: "skip" },
          { selector: "style", format: "skip" },
          { selector: "nav", format: "skip" },
          { selector: "footer", format: "skip" },
          { selector: "img", format: "skip" },
        ],
      });
      // Limit to ~8000 chars to stay within token budgets
      return { content: text.slice(0, 8000) };
    }

    return { content: body.slice(0, 8000) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: `Error fetching URL: ${msg}`, is_error: true };
  }
}
