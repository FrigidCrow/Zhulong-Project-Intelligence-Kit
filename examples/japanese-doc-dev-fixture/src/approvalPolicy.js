export const AUTO_APPROVAL_LIMIT = 30000;
export const PROXY_APPROVAL_LIMIT = 50000;

export function normalizeAmount(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    throw new TypeError("amount must be a finite number");
  }
  return Math.round(value);
}

export function evaluateApproval(input) {
  const amount = normalizeAmount(input.amount);
  const isProxyApprover = Boolean(input.isProxyApprover);
  const hasManagerApproval = Boolean(input.hasManagerApproval);

  if (amount <= 0) {
    return {
      status: "rejected",
      reasonCode: "INVALID_AMOUNT",
      requiredEvidence: ["申請金額"],
    };
  }

  if (isProxyApprover && amount > PROXY_APPROVAL_LIMIT) {
    return {
      status: "rejected",
      reasonCode: "PROXY_LIMIT_EXCEEDED",
      requiredEvidence: ["代理承認者", "承認上限"],
    };
  }

  if (amount > AUTO_APPROVAL_LIMIT && !hasManagerApproval) {
    return {
      status: "needs_manager",
      reasonCode: "MANAGER_APPROVAL_REQUIRED",
      requiredEvidence: ["上長承認"],
    };
  }

  return {
    status: "approved",
    reasonCode: amount > AUTO_APPROVAL_LIMIT ? "MANAGER_APPROVED" : "AUTO_APPROVED",
    requiredEvidence: [],
  };
}
