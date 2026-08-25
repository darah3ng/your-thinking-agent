import "dotenv/config";

import { runAgent } from "./agent.js";
import { createRunLogger } from "./logger.js";

const userGoal = process.argv.slice(2).join(" ").trim();

if (!userGoal) {
  console.error('Usage: npm run agent -- "your research question"');
  process.exit(1);
}

const logger = createRunLogger();

logger.log("USER_INPUT_RECEIVED", { userGoal });

console.log("> USER");
console.log(userGoal);
console.log("\n> LOG");
console.log(logger.filePath);

try {
  const finalAnswer = await runAgent(userGoal, logger);

  logger.log("RUN_COMPLETED", { finalAnswer });

  console.log("\n> FINAL ANSWER");
  console.log(finalAnswer);
} catch (error) {
  logger.log("RUN_FAILED", { error });

  console.error("\n> ERROR");
  console.error(error instanceof Error ? error.message : "Agent failed");
  process.exitCode = 1;
}
