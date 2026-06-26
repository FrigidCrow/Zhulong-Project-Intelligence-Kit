# BD-APP-03 承認フロー設計

## 対象モジュール

- `src/approvalService.js`
- `src/approvalPolicy.js`

## 処理概要

`submitApprovalRequest` は申請情報を受け取り、`evaluateApproval` に承認判定を委譲する。
判定結果は監査メモへ反映され、承認ルート、金額、理由コードを残す。

## 代理承認の扱い

代理承認は通常承認よりも厳しい制約を持つ。
CR-017適用後、代理承認者は30,000円を超える申請を承認できない。
この制約は上長承認の有無より優先する。

## 影響確認

実装時はGraphifyまたはAI-PIKitコードマップで以下を確認する。

- `evaluateApproval` を呼び出す関数
- `PROXY_APPROVAL_LIMIT` を参照するテスト
- 承認理由コード `PROXY_LIMIT_EXCEEDED` の利用箇所
