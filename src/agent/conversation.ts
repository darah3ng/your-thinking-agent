import type {
  Response,
  ResponseFunctionToolCall,
  ResponseInput,
  ResponseOutputMessage,
  ResponseReasoningItem,
} from "openai/resources/responses/responses.js";

import type { RunLogger } from "../logger.js";
import type { CustomThinking } from "../thinking.js";

type ConversationItem =
  | ResponseOutputMessage
  | ResponseReasoningItem
  | ResponseFunctionToolCall;

export type ToolOutput = {
  type: "function_call_output";
  call_id: string;
  output: string;
};

export function createConversation(
  userGoal: string,
  customThinking?: CustomThinking,
): ResponseInput {
  return [
    {
      role: "user",
      content: customThinking
        ? formatGoalWithCustomThinking(userGoal, customThinking)
        : userGoal,
    },
  ];
}

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

export function storeModelOutput(
  response: Response,
  conversation: ResponseInput,
  iteration: number,
  logger: RunLogger,
): void {
  const modelOutput = getConversationItems(response);
  conversation.push(...modelOutput);

  logger.debug({ iteration, storedItems: modelOutput }, "MODEL OUTPUT STORED");
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

  logger.debug({ iteration, storedItem: toolOutput }, "TOOL OUTPUT STORED");
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

function formatGoalWithCustomThinking(
  userGoal: string,
  customThinking: CustomThinking,
): string {
  const questions = customThinking.questions
    .map((question, index) => `${index + 1}. ${question}`)
    .join("\n");

  return `Research goal:\n${userGoal}\n\nUser-provided expert questions:\n${questions}\n\nUse these questions to guide the research. They are not verified facts. Each question will be assigned to its corresponding research iteration; use any remaining iterations to investigate the most important unresolved gap.`;
}
