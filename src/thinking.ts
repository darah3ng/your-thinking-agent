import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";

export const MAX_CUSTOM_THINKING_QUESTIONS = 3;

const customThinkingSchema = z
  .object({
    questions: z
      .array(z.string().trim().min(1, "questions cannot contain empty strings"))
      .min(1, "questions must contain at least one question")
      .max(
        MAX_CUSTOM_THINKING_QUESTIONS,
        `questions cannot contain more than ${MAX_CUSTOM_THINKING_QUESTIONS} questions`,
      ),
  })
  .strict();

export type CustomThinking = z.infer<typeof customThinkingSchema>;

export async function loadCustomThinking(
  filePath: string,
): Promise<CustomThinking> {
  const resolvedPath = resolve(filePath);
  let contents: string;

  try {
    contents = await readFile(resolvedPath, "utf8");
  } catch (error) {
    throw new Error(`Could not read custom thinking file: ${resolvedPath}`, {
      cause: error,
    });
  }

  let value: unknown;

  try {
    value = JSON.parse(contents);
  } catch (error) {
    throw new Error(`Custom thinking file is not valid JSON: ${resolvedPath}`, {
      cause: error,
    });
  }

  return parseCustomThinking(value);
}

export function parseCustomThinking(value: unknown): CustomThinking {
  const result = customThinkingSchema.safeParse(value);

  if (!result.success) {
    throw new Error(`Invalid custom thinking:\n${z.prettifyError(result.error)}`);
  }

  return result.data;
}
