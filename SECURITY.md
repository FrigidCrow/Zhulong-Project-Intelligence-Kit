# 安全政策

## 支持范围

| 版本 | 状态 |
| --- | --- |
| `0.1.x` | 接受安全修复 |
| 更早版本 | 不提供安全修复承诺 |

## 私密报告漏洞

请不要通过公开 Issue 披露漏洞、密钥、真实项目资料或可利用细节。请进入仓库的 [Security Advisories](https://github.com/FrigidCrow/Zhulong-Project-Intelligence-Kit/security/advisories) 页面，选择 **Report a vulnerability** 提交私密报告。

报告请尽量包括：

- 受影响版本和运行环境。
- 最小复现步骤或概念验证。
- 影响范围与攻击前提。
- 建议修复方向。
- 是否已经向其他人披露。

维护者会尽量在 7 天内确认报告，并在验证影响后协调修复和披露时间。不要在修复发布前公开利用细节。

## 安全边界

Zhulong 默认执行 local-only 策略，但 Codex、Claude Code、GitHub Copilot、GraphRAG、Graphify、Ollama 和其他外部工具有各自的安全与服务边界。外部工具自身的漏洞应同时报告给对应上游项目。
