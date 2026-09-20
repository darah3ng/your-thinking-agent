import assert from "node:assert/strict";
import test from "node:test";

import { parseCliArgs } from "../src/cli.js";

test("parses a research goal without custom thinking", () => {
  assert.deepEqual(parseCliArgs(["which database should we use?"]), {
    userGoal: "which database should we use?",
  });
});

test("parses and removes the thinking option from the research goal", () => {
  assert.deepEqual(
    parseCliArgs([
      "--thinking",
      "./thinking.json",
      "which database should we use?",
    ]),
    {
      userGoal: "which database should we use?",
      thinkingPath: "./thinking.json",
    },
  );
});

test("rejects a missing thinking file path", () => {
  assert.throws(() => parseCliArgs(["--thinking"]), /argument missing/);
});

test("rejects an empty thinking file path", () => {
  assert.throws(
    () => parseCliArgs(["--thinking="]),
    /--thinking requires a JSON file path/,
  );
});

test("rejects duplicate thinking options", () => {
  assert.throws(
    () => parseCliArgs(["--thinking=a.json", "--thinking=b.json"]),
    /--thinking can only be provided once/,
  );
});
