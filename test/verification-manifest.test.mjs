import assert from "node:assert/strict";
import test from "node:test";
import {
  VERIFICATION_TASKS,
  selectVerificationTasks,
  validateVerificationManifest,
} from "../scripts/verification-manifest.mjs";

test("verification manifest is unique and topologically ordered", () => {
  assert.deepEqual(validateVerificationManifest(), []);
  assert.equal(new Set(VERIFICATION_TASKS.map((task) => task.id)).size, VERIFICATION_TASKS.length);
});

test("release tier includes every CI task exactly once", () => {
  const ci = selectVerificationTasks("ci").map((task) => task.id);
  const release = selectVerificationTasks("release").map((task) => task.id);
  assert.equal(new Set(release).size, release.length);
  for (const id of ci) assert.ok(release.includes(id), id);
});

test("local RAG tier includes the hermetic CI gate and local RAG smoke", () => {
  const ids = selectVerificationTasks("local-rag").map((task) => task.id);
  assert.ok(ids.includes("project-profiles"));
  assert.ok(ids.includes("full-command-surface"));
  assert.ok(ids.includes("rag-local"));
});
