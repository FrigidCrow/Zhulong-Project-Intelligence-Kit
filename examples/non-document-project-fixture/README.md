# Zhulong 非文档密集型 Fixture

这是一个以代码、测试和任务状态为主要事实来源的最小 Node.js 项目。它没有 `docs/` 目录，不需要 RAG，也不依赖外部服务。

验证目标：

- `reference + rag none` 可以完成 Zhulong 初始化。
- codebase、Graphify、workflow、evidence 和 completion gate 保持完整。
- `zl-next` 和场景帮助不会要求安装、索引或查询 RAG。
- 测试只使用 Node.js 24 内置 test runner。
