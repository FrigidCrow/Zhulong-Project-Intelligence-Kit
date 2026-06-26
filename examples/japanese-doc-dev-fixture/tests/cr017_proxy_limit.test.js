import test from "node:test";
import assert from "node:assert/strict";
import { evaluateApproval, PROXY_APPROVAL_LIMIT } from "../src/approvalPolicy.js";

test("CR-017 lowers proxy approval limit to 30,000 JPY", () => {
  assert.equal(PROXY_APPROVAL_LIMIT, 30000);
});

test("CR-017 rejects proxy approval above 30,000 JPY even with manager approval", () => {
  const decision = evaluateApproval({
    amount: 45000,
    isProxyApprover: true,
    hasManagerApproval: true,
  });

  assert.equal(decision.status, "rejected");
  assert.equal(decision.reasonCode, "PROXY_LIMIT_EXCEEDED");
});

test("CR-017 still allows proxy approval at or below 30,000 JPY", () => {
  const decision = evaluateApproval({
    amount: 30000,
    isProxyApprover: true,
    hasManagerApproval: false,
  });

  assert.equal(decision.status, "approved");
  assert.equal(decision.reasonCode, "AUTO_APPROVED");
});
