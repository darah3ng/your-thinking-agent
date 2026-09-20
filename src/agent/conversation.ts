import type {
  Response,
  ResponseFunctionToolCall,
  ResponseInput,
  ResponseOutputMessage,
  ResponseReasoningItem,
} from "openai/resources/responses/responses.js";

type ConversationItem =
  | ResponseOutputMessage
  | ResponseReasoningItem
  | ResponseFunctionToolCall;

export type ToolOutput = {
  type: "function_call_output";
  call_id: string;
  output: string;
};

export function addCustomIterationFocus(
  conversation: ResponseInput,
  iteration: number,
  question: string,
): void {
  conversation.push({
    role: "user",
    content: `Research iteration ${iteration} must focus on this user-provided expert question:\n${question}\n\nUse searchWeb to investigate it in service of the original research goal. Treat the question as guidance, not as a verified fact.`,
  });
}

export function getToolCalls(response: Response): ResponseFunctionToolCall[] {
  return response.output.filter(
    (item): item is ResponseFunctionToolCall => item.type === "function_call",
  );
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

export function getConversationItems(response: Response): ConversationItem[] {
  // These are the output types our current text + function configuration can
  // produce and that the Responses API accepts as subsequent input.
  return response.output.filter(
    (item): item is ConversationItem =>
      item.type === "message" ||
      item.type === "reasoning" ||
      item.type === "function_call",
  );
}
