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

  logger.info({ maxIterations }, "RUN STARTED");
  logger.debug(
    {
      systemPrompt: SYSTEM_PROMPT,
      conversation,
    },
    "AGENT STARTED",
  );

  // One iteration is one model decision followed by all tool calls it requests.
  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    console.log(`\n> ITERATION ${iteration}`);
    logger.info(`ITERATION ${iteration}`);

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

      logger.info(
        `FINAL ANSWER\nReason: OpenAI completed the research\n\n${finalText}`,
      );

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
  logger.debug(
    {
      iteration,
      allowTools: true,
      conversation,
    },
    "MODEL REQUEST SENT",
  );

  const response = await callModel(SYSTEM_PROMPT, conversation);

  logger.debug({ iteration, response }, "MODEL RESPONSE RECEIVED");

  return response;
}

async function forceFinalAnswer(
  conversation: ResponseInput,
  maxIterations: number,
  logger: RunLogger,
): Promise<string> {
  logger.info(
    { maxIterations },
    "RESEARCH LIMIT REACHED - asking OpenAI to answer without more searches",
  );

  logger.debug(
    {
      allowTools: false,
      conversation,
    },
    "FINAL MODEL REQUEST SENT",
  );

  const finalResponse = await callModel(
    RESEARCH_LIMIT_PROMPT,
    conversation,
    false,
  );

  logger.debug({ response: finalResponse }, "FINAL MODEL RESPONSE RECEIVED");

  const finalText = getRequiredFinalText(
    finalResponse,
    "The model did not produce a final answer",
  );

  logger.info(
    `FINAL ANSWER\nReason: Maximum research iterations reached\n\n${finalText}`,
  );

  return finalText;
}
