import type {
  Response,
  ResponseFunctionToolCall,
  ResponseInput,
  ResponseOutputMessage,
  ResponseReasoningItem,
} from "openai/resources/responses/responses.js";

import type { RunLogger } from "../logger.js";

type ConversationItem =
  | ResponseOutputMessage
  | ResponseReasoningItem
  | ResponseFunctionToolCall;

export type ToolOutput = {
  type: "function_call_output";
  call_id: string;
  output: string;
};

export function createConversation(userGoal: string): ResponseInput {
  return [
    {
      role: "user",
      content: userGoal,
    },
  ];
}

export function storeModelOutput(
  response: Response,
  conversation: ResponseInput,
  iteration: number,
  logger: RunLogger,
): void {
  const modelOutput = getConversationItems(response);
  conversation.push(...modelOutput);

  logger.log("MODEL_OUTPUT_STORED", {
    iteration,
    storedItems: modelOutput,
    conversation,
  });
}

export function getToolCalls(response: Response): ResponseFunctionToolCall[] {
  return response.output.filter(
    (item): item is ResponseFunctionToolCall => item.type === "function_call",
  );
}

export function storeToolOutput(
  toolOutput: ToolOutput,
  conversation: ResponseInput,
  iteration: number,
  logger: RunLogger,
): void {
  conversation.push(toolOutput);

  logger.log("TOOL_OUTPUT_STORED", {
    iteration,
    storedItem: toolOutput,
    conversation,
  });
}

export function getRequiredFinalText(
  response: Response,
  errorMessage: string,
): string {
  const finalText = response.output_text.trim();

  if (!finalText) {
    throw new Error(errorMessage);
  }

  return finalText;
}

function getConversationItems(response: Response): ConversationItem[] {
  // These are the output types our current text + function configuration can
  // produce and that the Responses API accepts as subsequent input.
  return response.output.filter(
    (item): item is ConversationItem =>
      item.type === "message" ||
      item.type === "reasoning" ||
      item.type === "function_call",
  );
}
