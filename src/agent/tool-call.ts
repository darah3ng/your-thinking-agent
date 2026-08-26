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

  logger.log("TOOL_CALL_RECEIVED", {
    iteration,
    toolCall,
  });

  const args = parseToolArguments(toolCall);

  logger.log("TOOL_ARGUMENTS_PARSED", {
    iteration,
    toolName: toolCall.name,
    args,
  });

  const result = await executeParsedToolCall(toolCall, args);

  logger.log("TOOL_RESULT_RECEIVED", {
    iteration,
    toolName: toolCall.name,
    result,
  });

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
