import assert from "node:assert/strict";
import test from "node:test";
import { dispatchCommand } from "../src/cli/router.mjs";

test("dispatches a known command", async () => {
  const calls = [];
  const result = await dispatchCommand({ command: "docs", _: ["status"] }, {
    usage: () => calls.push("usage"),
    docs: (args) => calls.push(args._[0]),
  });
  assert.deepEqual(calls, ["status"]);
  assert.deepEqual(result, { handled: true, command: "docs", exitCode: 0 });
});

test("prints usage for an unknown command and returns a non-zero contract", async () => {
  const calls = [];
  const result = await dispatchCommand({ command: "unknown", _: [] }, {
    usage: () => calls.push("usage"),
  });
  assert.deepEqual(calls, ["usage"]);
  assert.deepEqual(result, { handled: false, command: "unknown", exitCode: 2 });
});

test("prints usage for an empty command", async () => {
  const calls = [];
  const result = await dispatchCommand({ command: undefined, _: [] }, {
    usage: () => calls.push("usage"),
  });
  assert.deepEqual(calls, ["usage"]);
  assert.equal(result.exitCode, 0);
});
