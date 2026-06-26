import { evaluateApproval } from "./approvalPolicy.js";

export function submitApprovalRequest(request) {
  const decision = evaluateApproval(request);
  return {
    requestId: request.requestId,
    applicantId: request.applicantId,
    amount: request.amount,
    decision,
    auditMemo: buildAuditMemo(request, decision),
  };
}

export function buildAuditMemo(request, decision) {
  const proxyLabel = request.isProxyApprover ? "代理承認" : "通常承認";
  return [
    `request=${request.requestId}`,
    `amount=${request.amount}`,
    `route=${proxyLabel}`,
    `status=${decision.status}`,
    `reason=${decision.reasonCode}`,
  ].join(" ");
}
