import assert from "node:assert/strict";
import test from "node:test";
import { codebaseFileKind } from "../src/codebase/command.mjs";

test("classifies codebase paths used by refresh planning", () => {
  assert.equal(codebaseFileKind("src/server.mjs"), "source");
  assert.equal(codebaseFileKind("config/settings.yml"), "config");
  assert.equal(codebaseFileKind("docs/architecture.md"), "doc");
  assert.equal(codebaseFileKind("assets/logo.png"), "other");
});
