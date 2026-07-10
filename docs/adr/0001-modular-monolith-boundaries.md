# ADR 0001：模块化单体与依赖方向

- 状态：已接受
- 日期：2026-07-10

## 决策

Zhulong 保持零运行时依赖的模块化单体，不拆成服务，也不进行全量 TypeScript 重写。

依赖方向固定为：`bin/zl.mjs` -> `src/app.mjs` -> 领域命令边界 -> shared/project/cli 纯函数。领域模块不得反向导入 `src/app.mjs`，`bin/` 不保存领域实现。

docs、rag、graph、workflow、policy、cockpit、codebase、evidence 和 runtime 各自暴露命令边界；迁移期间允许尚未抽离的领域服务暂留 `src/app.mjs`，但新增代码优先进入所属模块。

## 原因

该结构保留 75 个 npm bin 的兼容行为和快速启动，同时降低单文件维护风险。它还能让纯函数使用 Node.js 内置测试独立验证，不增加运行时供应链。

## 约束

- 不允许领域模块形成循环依赖。
- 行为迁移与用户可见变更分开提交。
- `.planning/` 制品格式变化必须另行记录 schema 与迁移策略。
- 模块提取后必须通过全命令面、双项目画像和对应领域 verifier。
