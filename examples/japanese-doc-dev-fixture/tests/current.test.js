import test from "node:test";
import assert from "node:assert/strict";
import { evaluateApproval } from "../src/approvalPolicy.js";
import { submitApprovalRequest } from "../src/approvalService.js";

test("auto-approves ordinary requests up to 30,000 JPY", () => {
  const decision = evaluateApproval({ amount: 30000 });

  assert.equal(decision.status, "approved");
  assert.equal(decision.reasonCode, "AUTO_APPROVED");
});

test("requires manager approval above the ordinary auto approval limit", () => {
  const decision = evaluateApproval({ amount: 45000 });

  assert.equal(decision.status, "needs_manager");
  assert.equal(decision.reasonCode, "MANAGER_APPROVAL_REQUIRED");
});

test("approves ordinary high-value requests when manager approval exists", () => {
  const decision = evaluateApproval({
    amount: 45000,
    hasManagerApproval: true,
  });

  assert.equal(decision.status, "approved");
  assert.equal(decision.reasonCode, "MANAGER_APPROVED");
});

test("service returns an audit memo with decision evidence", () => {
  const result = submitApprovalRequest({
    requestId: "REQ-2026-0042",
    applicantId: "U100",
    amount: 25000,
  });

  assert.equal(result.decision.status, "approved");
  assert.match(result.auditMemo, /REQ-2026-0042/);
  assert.match(result.auditMemo, /AUTO_APPROVED/);
});
