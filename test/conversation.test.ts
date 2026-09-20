import assert from "node:assert/strict";
import test from "node:test";

import {
  addCustomIterationFocus,
  createConversation,
} from "../src/agent/conversation.js";

test("keeps the original conversation unchanged without custom thinking", () => {
  assert.deepEqual(createConversation("Research goal"), [
    { role: "user", content: "Research goal" },
  ]);
});

test("adds the complete custom thinking and current iteration focus", () => {
  const conversation = createConversation("Research goal", {
    questions: ["First expert question?", "Second expert question?"],
  });

  addCustomIterationFocus(conversation, 1, "First expert question?");

  const serializedConversation = JSON.stringify(conversation);
  assert.match(serializedConversation, /User-provided expert questions/);
  assert.match(serializedConversation, /Second expert question\?/);
  assert.match(serializedConversation, /Research iteration 1 must focus/);
  assert.match(serializedConversation, /First expert question\?/);
});
