import type {
  ResponseFunctionToolCall,
  ResponseInput,
  ResponseOutputMessage,
  ResponseReasoningItem,
} from "openai/resources/responses/responses.js";

import { callModel } from "./model.js";
import { executeTool } from "./tools/index.js";
import type { SearchWebResult } from "./types.js";

const DEFAULT_MAX_ITERATIONS = 5;

const SYSTEM_PROMPT = `You are an autonomous research assistant.

Investigate the user's question using the tools available to you.

Do not immediately answer questions that require current or detailed research. First decide what information you need, then use searchWeb to find relevant sources. You may search more than once and should reformulate weak searches yourself.

After each tool result, decide whether you have enough evidence or whether further investigation is required. Prefer primary and authoritative sources. If sources disagree, investigate the disagreement rather than silently choosing one.

Do not research indefinitely. Stop once you have enough reliable information to answer the user's actual question. Simple questions that do not require research may be answered directly.

Your final answer should directly answer the question, explain the important findings, distinguish facts from your judgement, and include the URLs of the most useful search results. Do not claim that you opened or consulted a page when you only saw its search result.`;

function getMaxIterations(): number {
  const configuredValue = Number.parseInt(process.env.MAX_ITERATIONS ?? "", 5);

  return Number.isSafeInteger(configuredValue) && configuredValue > 0
    ? configuredValue
    : DEFAULT_MAX_ITERATIONS;
}

function parseToolArguments(toolCall: ResponseFunctionToolCall): unknown {
  try {
    return JSON.parse(toolCall.arguments);
  } catch {
    return undefined;
  }
}

export async function runAgent(userGoal: string): Promise<string> {
  const input: ResponseInput = [
    {
      role: "user",
      content: userGoal,
    },
  ];

  const maxIterations = getMaxIterations();

  // One iteration is one model decision followed by all tool calls it requests.
  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    console.log(`\n> ITERATION ${iteration}`);

    const response = await callModel(SYSTEM_PROMPT, input);

    // These are the output types our current text + function configuration can
    // produce and that the Responses API accepts as subsequent input.
    const conversationItems = response.output.filter(
      (
        item,
      ): item is
        | ResponseOutputMessage
        | ResponseReasoningItem
        | ResponseFunctionToolCall =>
        item.type === "message" ||
        item.type === "reasoning" ||
        item.type === "function_call",
    );

    input.push(...conversationItems);

    const toolCalls = response.output.filter(
      (item): item is ResponseFunctionToolCall => item.type === "function_call",
    );

    if (toolCalls.length === 0) {
      const finalText = response.output_text.trim();

      if (!finalText) {
        throw new Error(
          "The model returned neither a tool call nor final text",
        );
      }

      return finalText;
    }

    for (const toolCall of toolCalls) {
      console.log("\n> AGENT TOOL CALL");
      console.log(`${toolCall.name}(${toolCall.arguments})`);

      const args = parseToolArguments(toolCall);
      let result: SearchWebResult;

      if (args === undefined) {
        result = {
          success: false,
          error: `Malformed JSON arguments for ${toolCall.name}`,
        };
      } else {
        // This is the visible boundary where a model request becomes an
        // ordinary TypeScript function call.
        result = await executeTool(toolCall.name, args);
      }

      console.log("\n> TOOL RESULT");
      console.log(
        result.success
          ? `${result.results.length} results returned`
          : `Failed: ${result.error}`,
      );

      // Match the observation to the model's request using the call ID.
      input.push({
        type: "function_call_output",
        call_id: toolCall.call_id,
        output: JSON.stringify(result),
      });
    }
  }

  const finalResponse = await callModel(
    `${SYSTEM_PROMPT}\n\nYou have reached the research limit. Do not request any more tools. Give the best possible answer using the information gathered so far.`,
    input,
    false,
  );

  const finalText = finalResponse.output_text.trim();

  if (!finalText) {
    throw new Error("The model did not produce a final answer");
  }

  return finalText;
}
