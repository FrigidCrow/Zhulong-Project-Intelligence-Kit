# TS-APP-CR017 テスト仕様

関連: CR-017, QA-042

## テスト観点

| Case | 条件 | 期待結果 |
| --- | --- | --- |
| CR017-01 | 代理承認, 30,000円 | approved / AUTO_APPROVED |
| CR017-02 | 代理承認, 30,001円 | rejected / PROXY_LIMIT_EXCEEDED |
| CR017-03 | 代理承認, 45,000円, 上長承認済み | rejected / PROXY_LIMIT_EXCEEDED |
| CR017-04 | 通常承認, 45,000円, 上長承認なし | needs_manager / MANAGER_APPROVAL_REQUIRED |

## 実行コマンド

```bash
npm run test:task
```

改修前はCR017-01からCR017-03のいずれかが失敗する可能性がある。
改修後は `npm test` と `npm run test:task` の両方を実行し、証跡へ残す。
