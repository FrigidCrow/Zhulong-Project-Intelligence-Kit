import assert from "node:assert/strict";
import test from "node:test";
import { completeTask, nextRunnable } from "../src/taskQueue.mjs";

test("selects the highest-priority runnable task", () => {
  const selected = nextRunnable([
    { id: "task-c", priority: 3, status: "ready" },
    { id: "task-a", priority: 1, status: "ready", blocked: true },
    { id: "task-b", priority: 2, status: "ready" },
  ]);
  assert.equal(selected?.id, "task-b");
});

test("completes only the requested task", () => {
  const result = completeTask([
    { id: "task-a", status: "ready" },
    { id: "task-b", status: "ready" },
  ], "task-a");
  assert.deepEqual(result, [
    { id: "task-a", status: "done" },
    { id: "task-b", status: "ready" },
  ]);
});
