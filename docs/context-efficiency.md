# Zhulong 上下文效率约定

Zhulong 的默认策略是先稳定、可复用，再追求更多上下文。CLI 不直接调用模型，但它生成的 runtime skills、context packet 和证据制品必须遵守以下约定。

## B1 稳定前缀

- 把长期不变的项目规则、目录说明、权限边界放在提示词前部。
- 把任务描述、当前 diff、临时日志放在后部。
- 同一项目保持稳定前缀和字段顺序，方便支持 prompt cache 的 runtime 复用缓存。
- 不把时间戳、随机 ID 或完整日志插入稳定前缀。

## B2 引用优先

- 优先提供文件路径、行号、artifact 摘要和查询结果，不默认复制整份文档。
- 只有当前任务确实需要逐段理解时才展开全文。
- 回答里的规格结论必须能回到本地 citation；没有引用的内容按假设处理。

## B3 制品交接

- 调查、计划、实施和验证阶段通过 `.planning/` 制品交接。
- 后续 agent 先读最新状态和证据，不从完整聊天记录重建上下文。
- 每个制品写清状态、输入、结论、风险和下一条命令。

## B6 Token 用量槽位

- Runtime 可以把可获得的 token 数据写入 `.planning/metrics/TOKEN_USAGE.json`。
- 字段建议：`generatedAt`、`runtime`、`model`、`input_tokens`、`output_tokens`、`cache_read_tokens`、`cache_write_tokens`、`task_id`。
- token 数据是可选观测值，不得因为 runtime 不提供用量而让普通工作流失败。
- cockpit 只读取已有槽位，不主动调用模型获取用量。

## 重命令边界

- `zl-docs-index --run`、`zl-graph-build --run` 和 `zl-refresh-run` 必须保持显式。
- `docs sync`、`docs query`、`completion-check` 只可自动执行本地、只读、零依赖的确定性审计。
- 自动审计不得下载模型、连接外网或改写需求源文件。
