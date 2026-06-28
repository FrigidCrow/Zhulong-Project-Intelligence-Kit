# AI-PIKit Quality Control Summary

生成时间: 2026-06-28T15:46:46.243Z

- 状态: PASS
- 总分: 99
- 等级: A
- 发布判断: RELEASE_OK
- Critical fail: no

| 维度 | 权重 | 分数 |
| --- | --- | --- |
| Static Skill Quality | 10% | 100 |
| Trigger Accuracy | 15% | 100 |
| Command / Tool Trajectory | 20% | 100 |
| Workflow / Evidence Closure | 20% | 100 |
| Knowledge / RAG Quality | 15% | 100 |
| Safety / Governance | 10% | 100 |
| Efficiency / Stability | 10% | 85 |

## 方法论来源

链接复核日期: 2026-06-29

| 方法论 / 来源 | 采用方式 |
| --- | --- |
| [OpenAI Agent Skills docs](https://developers.openai.com/codex/skills) | runtime skill/prompt structure and trigger boundary |
| [OpenAI Testing Agent Skills Systematically with Evals](https://developers.openai.com/blog/eval-skills) | prompt -> trace/artifacts -> checks -> score for SKILL_BEHAVIOR_SCORES |
| [SkillsBench / SkillsBench 1.1](https://arxiv.org/abs/2602.12670) | with_skill / without_skill delta in BENCHMARK_COMPARISON |
| [Anthropic Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | trajectory + outcome and deterministic regression eval layering |
| [Ragas agent metrics](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/agents/) | local proxy knowledge metrics for tool call and goal accuracy |
| [Promptfoo Agent Skills](https://www.promptfoo.dev/docs/integrations/agent-skill/) | local proxy eval/redteam matrix |
| [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) | agent security governance checklist |
| [NIST AI RMF / NIST AI 600-1 GenAI Profile](https://www.nist.gov/itl/ai-risk-management-framework) | risk management and release gate governance |

## 边界

- 默认 local-only，除显式 `--allow-external-rag` 外不允许 AI-PIKit 命令外发项目资料。
- Codex、Claude Code、GitHub Copilot 是用户主动使用的 coding runtime 例外，不改变 AI-PIKit 命令默认本地边界。
- Ragas-style / Promptfoo-style 是本地代理评分，不接外部 SaaS，也不调用外部模型。
- OWASP / NIST 是治理 checklist，不是外部认证。
- 本摘要来自 `.pik-audit/latest/QUALITY_CONTROL_SCORECARD.md`。
