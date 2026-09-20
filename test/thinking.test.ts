import assert from "node:assert/strict";
import test from "node:test";

import { parseCustomThinking } from "../src/thinking.js";

test("accepts and trims up to three custom questions", () => {
  assert.deepEqual(
    parseCustomThinking({
      questions: [" First question? ", "Second question?", "Third question?"],
    }),
    {
      questions: ["First question?", "Second question?", "Third question?"],
    },
  );
});

test("rejects more than three custom questions", () => {
  assert.throws(
    () =>
      parseCustomThinking({
        questions: ["One?", "Two?", "Three?", "Four?"],
      }),
    /questions cannot contain more than 3 questions/,
  );
});

test("rejects empty custom questions", () => {
  assert.throws(
    () => parseCustomThinking({ questions: [" "] }),
    /questions cannot contain empty strings/,
  );
});
