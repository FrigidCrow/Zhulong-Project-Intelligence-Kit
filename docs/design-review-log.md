# Zhulong 文档站与驾驶舱设计复核

日期：2026-07-10
范围：`docs/product.html`、`docs/commands.html`、`docs/technical-guide.html`、`docs/quality-dashboard.html`、`templates/cockpit/index.template.html`

## 设计方向

- 受众：重度使用 CLI、项目制品和证据链的工程团队。
- 气质：上古天象仪器与现代技术档案，而不是通用 AI SaaS 首页。
- 视觉密度：文档站保持可阅读的中高密度，cockpit 使用高密度运行视图。
- 品牌锚点：统一使用 `docs/assets/zhulong-icon.png`，以炭黑、冷灰、余烬橙为主，青色只承担状态与图谱语义。
- 交互边界：保留目录追踪、代码复制和轻量进入动画；不使用随机 canvas、假终端、滚动监听或装饰性光晕。

## 第一轮：结构重构

发现：旧页面是居中标题、假控制台、等宽卡片和通用霓虹背景，品牌图标没有成为首屏主信号。

修正：重做共享 CSS 与 JS；产品页改为非对称首屏和全宽证据带；命令页与技术页改为真实工作路径；cockpit 改为工程运行视图。
结果：5 个页面在桌面与移动端完成首轮渲染，无横向溢出。

## 第二轮：首屏与内容密度

发现：产品图注对比度偏低，QA 在本地文件模式下的报告提示不准确，cockpit 工程制品列宽不够，移动端指标区过长。

修正：移除低价值图注，改写本地报告提示；分离负责人视图与制品视图网格；移动端指标改为双列。
结果：产品、命令、技术、QA 与 cockpit 的首屏都能看见下一段内容，移动端不出现布局跳动。

## 第三轮：反模板化与可访问性

发现：cockpit 仍保留一套未使用的旧 CSS，设计规则只靠人工记忆。

修正：合并为单一样式块；新增 `verify:design`，检查真实品牌素材、单一 H1、反模板化规则、暗色主题、键盘焦点、减少动效和数据注入契约。
结果：静态设计契约 5 页通过，问题数为 0。

## 第四轮：暗色、移动端与文本细节

发现：暗色模式未进入自动证据矩阵，sticky 元素会污染整页截图；部分 HTML 把 Markdown 反引号直接显示；QA 缺少设计报告入口。

修正：截图矩阵扩展为桌面、移动端和桌面暗色；整页截图禁用 sticky；统一内联 `<code>`；QA 增加 Design 状态与报告入口；导航栏改为不透明背景。
结果：5 页乘 3 种视图共 15 组检查通过，截图、溢出、文字裁切、品牌素材与图谱节点均无问题。

## 第五轮：发布前收口

发现：Playwright 复用页面时，少量暗色截图可能出现 sticky 合成层残影。

修正：每个被测页面使用独立 page；增加品牌可见性与 5 项导航完整性断言；执行最终视觉、文档、cockpit、全命令面、质量闭环与 npm pack 检查。
完成标准：所有确定性 gate 为 PASS，npm tarball 不包含截图、临时报告和候选图标，远端 CI 通过后才视为可发布。

## 固化命令

```bash
npm run verify:design
npm run verify:visual
npm run verify:docs
npm run verify:cockpit-build
npm run verify:full-command-surface
npm run verify:quality-closure
npm pack --dry-run --json
```

截图属于短期验证制品，默认写入 `.zl-tmp/` 或 CI artifact，不进入 npm 包。
