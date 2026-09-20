import type { ResponseInput } from "openai/resources/responses/responses.js";

import {
  addCustomIterationFocus,
  getConversationItems,
  getRequiredFinalText,
  getToolCalls,
} from "./agent/conversation.js";
import { RESEARCH_LIMIT_PROMPT, SYSTEM_PROMPT } from "./agent/prompts.js";
import { runToolCall } from "./agent/tool-call.js";
import type { RunLogger } from "./logger.js";
import { callModel } from "./model.js";
import {
  MAX_CUSTOM_THINKING_QUESTIONS,
  type CustomThinking,
} from "./thinking.js";

const DEFAULT_MAX_ITERATIONS = MAX_CUSTOM_THINKING_QUESTIONS;

function getMaxIterations(): number {
  const configuredValue = Number.parseInt(process.env.MAX_ITERATIONS ?? "", 10);

  return Number.isSafeInteger(configuredValue) && configuredValue > 0
    ? configuredValue
    : DEFAULT_MAX_ITERATIONS;
}

export async function runAgent(
  userGoal: string,
  logger: RunLogger,
  customThinking?: CustomThinking,
): Promise<string> {
  const maxIterations = getMaxIterations();
  validateThinkingFitsLoop(customThinking, maxIterations);

  const conversation: ResponseInput = [{ role: "user", content: userGoal }];

  logger.info({ maxIterations }, "RUN STARTED");
  logger.debug(
    {
      systemPrompt: SYSTEM_PROMPT,
      conversation,
    },
    "AGENT STARTED",
  );

  // Ask the model what to do, execute its tools, and return their output.
  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const customQuestion = customThinking?.questions[iteration - 1];

    if (customQuestion) {
      addCustomIterationFocus(conversation, iteration, customQuestion);
    }

    console.log(`\n> ITERATION ${iteration}`);
    logIterationFocus(iteration, customQuestion, logger);

    // 1. Let the model answer or request a web search.
    const toolMode = customQuestion ? "required" : "auto";
    logger.debug({ iteration, toolMode, conversation }, "MODEL REQUEST SENT");
    const response = await callModel(SYSTEM_PROMPT, conversation, toolMode);
    logger.debug({ iteration, response }, "MODEL RESPONSE RECEIVED");

    // 2. Keep the response so the model remembers what it requested.
    conversation.push(...getConversationItems(response));

    // 3. No tool call means the model has finished.
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

    // 4. Execute every requested tool and give the results back to the model.
    for (const toolCall of toolCalls) {
      conversation.push(await runToolCall(toolCall, iteration, logger));
    }
  }

  return forceFinalAnswer(conversation, maxIterations, logger);
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
      toolMode: "none",
      conversation,
    },
    "FINAL MODEL REQUEST SENT",
  );

  const finalResponse = await callModel(
    RESEARCH_LIMIT_PROMPT,
    conversation,
    "none",
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

function validateThinkingFitsLoop(
  customThinking: CustomThinking | undefined,
  maxIterations: number,
): void {
  if (customThinking && customThinking.questions.length > maxIterations) {
    throw new Error(
      `Custom thinking contains ${customThinking.questions.length} questions, but MAX_ITERATIONS is ${maxIterations}`,
    );
  }
}

function logIterationFocus(
  iteration: number,
  customQuestion: string | undefined,
  logger: RunLogger,
): void {
  if (customQuestion) {
    console.log("> FOCUS: CUSTOM QUESTION");
    console.log(customQuestion);
    logger.info(
      `ITERATION ${iteration}\nFocus: custom question\n${customQuestion}`,
    );
    return;
  }

  console.log("> FOCUS: ADAPTIVE (OpenAI decides)");
  logger.info(`ITERATION ${iteration}\nFocus: adaptive (OpenAI decides)`);
}
