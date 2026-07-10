import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { COMMAND_ALIASES, normalizeArgv, parseArgs } from "../src/cli/args.mjs";

test("every direct zl command has an argv alias", () => {
  const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const directCommands = Object.keys(pkg.bin).filter((name) => name.startsWith("zl-"));
  assert.equal(COMMAND_ALIASES.size, directCommands.length);
  for (const command of directCommands) assert.ok(COMMAND_ALIASES.has(command), command);
});

test("normalizes a direct command without mutating input", () => {
  const input = ["--target", "/tmp/project"];
  const normalized = normalizeArgv(input, "/usr/local/bin/zl-docs-sync");
  assert.deepEqual(normalized, ["docs", "sync", "--target", "/tmp/project"]);
  assert.deepEqual(input, ["--target", "/tmp/project"]);
});

test("parses RAG backend values and boolean flags", () => {
  assert.deepEqual(parseArgs(["init", "--rag", "none", "--force"]), {
    command: "init",
    _: [],
    rag: "none",
    force: true,
  });
});

test("preserves docs query text after boolean --rag", () => {
  assert.deepEqual(parseArgs(["docs", "query", "--rag", "approval limit"]), {
    command: "docs",
    _: ["query", "approval limit"],
    rag: true,
  });
});

test("maps --command away from the top-level command key", () => {
  assert.deepEqual(parseArgs(["evidence", "record", "--command", "npm test"]), {
    command: "evidence",
    _: ["record"],
    recordCommand: "npm test",
  });
});

test("parses global machine-output flags", () => {
  assert.deepEqual(parseArgs(["doctor", "--json", "--quiet", "--no-color"]), {
    command: "doctor",
    _: [],
    json: true,
    quiet: true,
    "no-color": true,
  });
});
