import "dotenv/config";

import { runAgent } from "./agent.js";

const userGoal = process.argv.slice(2).join(" ").trim();

if (!userGoal) {
  console.error('Usage: npm run agent -- "your research question"');
  process.exit(1);
}

console.log("> USER");
console.log(userGoal);

try {
  const finalAnswer = await runAgent(userGoal);

  console.log("\n> FINAL ANSWER");
  console.log(finalAnswer);
} catch (error) {
  console.error("\n> ERROR");
  console.error(error instanceof Error ? error.message : "Agent failed");
  process.exitCode = 1;
}
