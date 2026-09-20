import assert from "node:assert/strict";
import test from "node:test";

import {
  addCustomIterationFocus,
} from "../src/agent/conversation.js";

test("adds the current custom question to the conversation", () => {
  const conversation = [{ role: "user" as const, content: "Research goal" }];

  addCustomIterationFocus(conversation, 1, "First expert question?");

  const serializedConversation = JSON.stringify(conversation);
  assert.match(serializedConversation, /Research iteration 1 must focus/);
  assert.match(serializedConversation, /First expert question\?/);
});
