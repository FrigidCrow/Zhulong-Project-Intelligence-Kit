import assert from "node:assert/strict";
import test from "node:test";
import { sha256Text, stableJson, stableValue } from "../src/shared/stable-json.mjs";

test("sorts object keys recursively while preserving array order", () => {
  assert.deepEqual(stableValue({ z: 1, a: { d: 4, b: 2 }, list: [{ y: 2, x: 1 }] }), {
    a: { b: 2, d: 4 },
    list: [{ x: 1, y: 2 }],
    z: 1,
  });
});

test("stable JSON and hash are independent of insertion order", () => {
  const left = stableJson({ b: 2, a: 1 });
  const right = stableJson({ a: 1, b: 2 });
  assert.equal(left, right);
  assert.equal(sha256Text(left), sha256Text(right));
});
