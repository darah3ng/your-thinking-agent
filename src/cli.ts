import { parseArgs } from "node:util";

export type CliOptions = {
  userGoal: string;
  thinkingPath?: string;
};

export function parseCliArgs(args: string[]): CliOptions {
  const { values, positionals, tokens } = parseArgs({
    args,
    allowPositionals: true,
    options: { thinking: { type: "string" } },
    tokens: true,
  });
  const thinkingOptions = tokens.filter(
    (token) => token.kind === "option" && token.name === "thinking",
  );

  if (thinkingOptions.length > 1) {
    throw new Error("--thinking can only be provided once");
  }

  const thinkingPath = values.thinking?.trim();
  if (values.thinking !== undefined && !thinkingPath) {
    throw new Error("--thinking requires a JSON file path");
  }

  const userGoal = positionals.join(" ").trim();

  return thinkingPath ? { userGoal, thinkingPath } : { userGoal };
}
