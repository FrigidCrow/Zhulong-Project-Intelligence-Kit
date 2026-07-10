import assert from "node:assert/strict";
import test from "node:test";
import {
  EXIT_CODES,
  commandFailure,
  commandIdentity,
  environmentFailure,
  stripAnsi,
} from "../src/cli/output.mjs";

test("strips ANSI sequences from machine-readable output", () => {
  assert.equal(stripAnsi("\u001b[31mFAIL\u001b[0m"), "FAIL");
});

test("uses only the route and subcommand in command identity", () => {
  assert.equal(commandIdentity({ command: "docs", _: ["query", "secret question"] }), "docs query");
  assert.equal(commandIdentity({}), "help");
});

test("classifies expected command and environment failures", () => {
  assert.equal(commandFailure("blocked").exitCode, EXIT_CODES.COMMAND_FAILED);
  assert.equal(environmentFailure("missing").exitCode, EXIT_CODES.ENVIRONMENT);
});
