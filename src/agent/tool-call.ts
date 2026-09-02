import type { ResponseFunctionToolCall } from "openai/resources/responses/responses.js";

import type { RunLogger } from "../logger.js";
import { executeTool } from "../tools/index.js";
import type { SearchWebResult } from "../types.js";
import type { ToolOutput } from "./conversation.js";

export async function runToolCall(
  toolCall: ResponseFunctionToolCall,
  iteration: number,
  logger: RunLogger,
): Promise<ToolOutput> {
  console.log("\n> AGENT TOOL CALL");
  console.log(`${toolCall.name}(${toolCall.arguments})`);

  logger.debug({ iteration, toolCall }, "TOOL CALL RECEIVED");

  const args = parseToolArguments(toolCall);

  logger.debug(
    { iteration, toolName: toolCall.name, args },
    "TOOL ARGUMENTS PARSED",
  );

  const query = getQuery(args, toolCall.arguments);
  logger.info({ iteration, query }, "OPENAI REQUESTED SEARCH");

  const result = await executeParsedToolCall(toolCall, args);

  if (result.success) {
    logger.info(
      { iteration, query, results: result.results },
      "TAVILY RETURNED",
    );
  } else {
    logger.warn({ iteration, query, error: result.error }, "TAVILY FAILED");
  }

  logger.debug(
    { iteration, toolName: toolCall.name, result },
    "TOOL RESULT RECEIVED",
  );

  console.log("\n> TOOL RESULT");
  console.log(
    result.success
      ? `${result.results.length} results returned`
      : `Failed: ${result.error}`,
  );

  // Match the observation to the model's request using the call ID.
  return {
    type: "function_call_output",
    call_id: toolCall.call_id,
    output: JSON.stringify(result),
  };
}

function getQuery(args: unknown, fallback: string): string {
  if (
    typeof args === "object" &&
    args !== null &&
    "query" in args &&
    typeof args.query === "string"
  ) {
    return args.query;
  }

  return fallback;
}

function parseToolArguments(toolCall: ResponseFunctionToolCall): unknown {
  try {
    return JSON.parse(toolCall.arguments);
  } catch {
    return undefined;
  }
}

async function executeParsedToolCall(
  toolCall: ResponseFunctionToolCall,
  args: unknown,
): Promise<SearchWebResult> {
  if (args === undefined) {
    return {
      success: false,
      error: `Malformed JSON arguments for ${toolCall.name}`,
    };
  }

  // This is the visible boundary where a model request becomes an ordinary
  // TypeScript function call.
  return executeTool(toolCall.name, args);
}
