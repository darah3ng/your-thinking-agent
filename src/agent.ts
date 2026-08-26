import type {
  Response,
  ResponseInput,
} from "openai/resources/responses/responses.js";

import {
  createConversation,
  getRequiredFinalText,
  getToolCalls,
  storeModelOutput,
  storeToolOutput,
} from "./agent/conversation.js";
import { RESEARCH_LIMIT_PROMPT, SYSTEM_PROMPT } from "./agent/prompts.js";
import { runToolCall } from "./agent/tool-call.js";
import type { RunLogger } from "./logger.js";
import { callModel } from "./model.js";

const DEFAULT_MAX_ITERATIONS = 3;

function getMaxIterations(): number {
  const configuredValue = Number.parseInt(process.env.MAX_ITERATIONS ?? "", 10);

  return Number.isSafeInteger(configuredValue) && configuredValue > 0
    ? configuredValue
    : DEFAULT_MAX_ITERATIONS;
}

export async function runAgent(
  userGoal: string,
  logger: RunLogger,
): Promise<string> {
  const conversation = createConversation(userGoal);
  const maxIterations = getMaxIterations();

  logger.log("AGENT_STARTED", {
    maxIterations,
    systemPrompt: SYSTEM_PROMPT,
    conversation,
  });

  // One iteration is one model decision followed by all tool calls it requests.
  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    console.log(`\n> ITERATION ${iteration}`);

    const response = await requestModelDecision(
      iteration,
      conversation,
      logger,
    );
    storeModelOutput(response, conversation, iteration, logger);

    const toolCalls = getToolCalls(response);
    if (toolCalls.length === 0) {
      const finalText = getRequiredFinalText(
        response,
        "The model returned neither a tool call nor final text",
      );

      logger.log("FINAL_ANSWER_PRODUCED", {
        iteration,
        finalAnswer: finalText,
      });

      return finalText;
    }

    for (const toolCall of toolCalls) {
      const toolOutput = await runToolCall(toolCall, iteration, logger);
      storeToolOutput(toolOutput, conversation, iteration, logger);
    }
  }

  return forceFinalAnswer(conversation, maxIterations, logger);
}

async function requestModelDecision(
  iteration: number,
  conversation: ResponseInput,
  logger: RunLogger,
): Promise<Response> {
  logger.log("MODEL_REQUEST_SENT", {
    iteration,
    allowTools: true,
    conversation,
  });

  const response = await callModel(SYSTEM_PROMPT, conversation);

  logger.log("MODEL_RESPONSE_RECEIVED", {
    iteration,
    response,
  });

  return response;
}

async function forceFinalAnswer(
  conversation: ResponseInput,
  maxIterations: number,
  logger: RunLogger,
): Promise<string> {
  logger.log("RESEARCH_LIMIT_REACHED", {
    maxIterations,
    conversation,
  });

  logger.log("FINAL_MODEL_REQUEST_SENT", {
    allowTools: false,
    conversation,
  });

  const finalResponse = await callModel(
    RESEARCH_LIMIT_PROMPT,
    conversation,
    false,
  );

  logger.log("FINAL_MODEL_RESPONSE_RECEIVED", {
    response: finalResponse,
  });

  const finalText = getRequiredFinalText(
    finalResponse,
    "The model did not produce a final answer",
  );

  logger.log("FINAL_ANSWER_PRODUCED", {
    reason: "research_limit_reached",
    finalAnswer: finalText,
  });

  return finalText;
}
