import OpenAI from "openai";
import type {
  Response,
  ResponseInput,
  Tool,
} from "openai/resources/responses/responses.js";

const DEFAULT_MODEL = "gpt-5.6-luna";

const openai = new OpenAI();

export type ToolMode = "auto" | "required" | "none";

const tools: Tool[] = [
  {
    type: "function",
    name: "searchWeb",
    description:
      "Search the web for relevant sources. Returns titles, URLs, and short snippets.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The focused web-search query to run.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
];

export function callModel(
  instructions: string,
  input: ResponseInput,
  toolMode: ToolMode = "auto",
): Promise<Response> {
  return openai.responses.create({
    model: process.env.LLM_MODEL ?? DEFAULT_MODEL,
    instructions,
    input,
    tools: toolMode === "none" ? [] : tools,
    tool_choice: toolMode,
    parallel_tool_calls: false,
    reasoning: {
      effort: "low",
    },
  });
}
