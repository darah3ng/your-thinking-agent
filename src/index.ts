import "dotenv/config";

import { runAgent } from "./agent.js";
import { parseCliArgs } from "./cli.js";
import { createRunLogger } from "./logger.js";
import { loadCustomThinking } from "./thinking.js";

const usage =
  'Usage: npm run agent -- [--thinking ./thinking.json] "your research question"';

let cliOptions;

try {
  cliOptions = parseCliArgs(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid arguments");
  console.error(usage);
  process.exit(1);
}

if (!cliOptions.userGoal) {
  console.error(usage);
  process.exit(1);
}

const logger = createRunLogger();

logger.info(`USER INPUT\n${cliOptions.userGoal}`);

console.log("> USER");
console.log(cliOptions.userGoal);
console.log("\n> LOG");
console.log(logger.filePath);

try {
  const customThinking = cliOptions.thinkingPath
    ? await loadCustomThinking(cliOptions.thinkingPath)
    : undefined;

  if (customThinking) {
    logger.info(
      `CUSTOM THINKING LOADED\nQuestions: ${customThinking.questions.length}`,
    );
    console.log("\n> CUSTOM THINKING");
    console.log(`${customThinking.questions.length} question(s) loaded`);
  }

  const finalAnswer = await runAgent(
    cliOptions.userGoal,
    logger,
    customThinking,
  );

  logger.info("RUN COMPLETED");

  console.log("\n> FINAL ANSWER");
  console.log(finalAnswer);
} catch (error) {
  logger.error(error, "RUN FAILED");

  console.error("\n> ERROR");
  console.error(error instanceof Error ? error.message : "Agent failed");
  process.exitCode = 1;
}
