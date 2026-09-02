import OpenAI from "openai";
import type {
  Response,
  ResponseInput,
  Tool,
} from "openai/resources/responses/responses.js";

const DEFAULT_MODEL = "gpt-5.6-luna";

const openai = new OpenAI();

export const tools: Tool[] = [
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
  allowTools = true,
): Promise<Response> {
  return openai.responses.create({
    model: process.env.LLM_MODEL ?? DEFAULT_MODEL,
    instructions,
    input,
    tools: allowTools ? tools : [],
    tool_choice: allowTools ? "auto" : "none",
    parallel_tool_calls: false,
    reasoning: {
      effort: "low",
    },
  });
}
