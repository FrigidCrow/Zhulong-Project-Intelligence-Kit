# ADR 0002：CLI 输出与退出码

- 状态：已接受
- 日期：2026-07-10

## 决策

所有顶层 Zhulong 命令共享以下契约：

- 正常文本结果写 stdout，诊断和用法错误写 stderr。
- `--quiet` 只抑制正常 stdout。
- `--no-color` 移除 ANSI 控制序列。
- `--json` 只向进程 stdout 写一个 `zhulong-cli-output.v1` JSON 对象；命令原始 stdout/stderr 进入信封数组。
- JSON schema 位于 `schemas/cli-output.schema.json`。

退出码固定为：`0` 成功、`1` 命令或 gate 失败、`2` 用法错误、`3` 必需环境缺失、`70` 内部错误。

## 兼容性

现有成功和 gate 失败仍保持 `0/1`。新增的 `2/3/70` 只让调用方能区分原本混在 `1` 中的错误类型。后续可以在信封中增加可选 `data`，但不得破坏 v1 必填字段。

## 验证

`npm run verify:cli-contract` 验证 schema、单 JSON 输出、stderr 隔离、静默模式、无颜色、补全和错误码。
