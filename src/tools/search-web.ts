import { z } from "zod";

import type { SearchWebResult } from "../types.js";

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";
const SEARCH_TIMEOUT_MS = 10_000;
const MAX_RESULTS = 5;

export const searchWebArgsSchema = z
  .object({
    query: z.string().trim().min(1).max(400),
  })
  .strict();

export type SearchWebArgs = z.infer<typeof searchWebArgsSchema>;

const tavilyResponseSchema = z.object({
  results: z.array(
    z.object({
      title: z.string(),
      url: z.url(),
      content: z.string().optional(),
    }),
  ),
});

export async function searchWeb(args: unknown): Promise<SearchWebResult> {
  const parsedArgs = searchWebArgsSchema.safeParse(args);

  if (!parsedArgs.success) {
    return {
      success: false,
      error: `Invalid searchWeb arguments: ${z.prettifyError(parsedArgs.error)}`,
    };
  }

  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: "TAVILY_API_KEY is not set",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    const response = await fetch(TAVILY_SEARCH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: parsedArgs.data.query,
        search_depth: "basic",
        max_results: MAX_RESULTS,
        include_answer: false,
        include_raw_content: false,
        include_images: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Tavily Search returned HTTP ${response.status}`,
      };
    }

    const parsedResponse = tavilyResponseSchema.safeParse(
      await response.json(),
    );

    if (!parsedResponse.success) {
      return {
        success: false,
        error: "Tavily Search returned an unexpected response",
      };
    }

    return {
      success: true,
      query: parsedArgs.data.query,
      results: parsedResponse.data.results.map((result) => ({
        title: result.title,
        url: result.url,
        ...(result.content ? { snippet: result.content } : {}),
      })),
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        error: `Tavily Search timed out after ${SEARCH_TIMEOUT_MS}ms`,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Tavily Search failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}
