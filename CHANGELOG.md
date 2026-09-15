# 变更日志

这里记录 `@ciaobye/dsh-sensenova-provider` 的重要变更。

本仓库由早期项目重构而来。SenseNova Provider 的有效历史从提交 `c2140c3` 开始；此前继承自旧项目、与 SenseNova 无关的提交不纳入本变更日志。

## 维护规则

- 后续任何功能新增、问题修复、行为变化、兼容性变化或文档变化，都必须在**同一个提交**中同步更新本文件。
- 每个版本章节用于汇总用户可感知的变化。
- 每个版本下同时记录对应提交，方便在正式 Release / Tag 完善前追溯实现历史。
- 初始化变更日志的提交使用提交标题而不是自身 SHA 记录，因为 Git 提交在生成最终 SHA 之前无法把自己的最终 SHA 写入自身内容。

## [未发布]

### 新增

- `docs: establish changelog tracking`
  - 新增 `CHANGELOG.md`，并回填从 `c2140c3` 开始的 SenseNova 项目历史。
  - 将 `CHANGELOG.md` 加入 package `files` 列表，使发布 tarball 同时包含变更记录。
  - 确立后续代码与变更日志必须同提交更新的维护规则。

### 变更

- `docs: translate changelog to Chinese`
  - 将变更日志正文、版本说明、维护规则和变更分类统一改为中文。
  - 保留真实 Git Commit 标题、SHA、配置字段名与技术名词，确保可追溯性。

---

## [0.4.0-alpha.1] - 2026-09-15

### 新增

- 在 **设置 → SenseNova** 中加入完整的 Key Pool 管理界面。
- 展示 Key 运行状态：可用、凭据缺失、`401` 已禁用、`429` 冷却中、冷却截止时间、最近使用 Key。
- 支持手动重置 Key 运行状态，无需重启 DSH。
- 支持设置首选 Key；首选 Key 不可用时仍会自动故障转移。
- 支持有顺序的 **模型 → 首选 Key** 路由规则；第一条匹配规则优先，同时保留正常 Key Pool fallback。
- 支持模型白名单，只缩小 DSH 常规模型选择器的显示范围，不影响隐藏模型通过 `resolveModel` 被解析。
- 新增 Host 侧 Typert Remote：运行状态、状态重置、SenseNova 实时模型目录。
- 完整 Credential UX：显示是否已配置、凭据来源、可写/只读状态，并支持更换、清除、显示/隐藏待保存密钥、添加和删除 Key。
- 支持字段级 Reset / Unset，使用户覆盖值可以真正回退到 DSH composition/default 层，而不是重新写入默认值。
- 新增 Token Plan 区域，用于明确当前额度 API 集成限制。

### 变更

- SenseNova 设置页从简单配置表单升级为 Provider 管理控制台。
- Host 配置新增 `activeKey`、`modelKeyRules`、`visibleModels`。
- Key 获取逻辑支持从“模型规则指定 Key”或“用户首选 Key”开始，同时继续保留 round-robin 与自动故障转移。
- 模型发现逻辑现在保留完整目录，而常规模型列表根据 `visibleModels` 过滤显示。
- Package 版本升级为 `0.4.0-alpha.1`。

### 安全 / 服务商集成

- 不抓取 SenseNova 控制台私有接口获取额度信息。
- 当 SenseNova 没有提供稳定、公开的账户 quota API 时，不伪造 credits、余额或 5 小时窗口数据。
- 原始 API Key 继续只存在于 DSH Credentials / 启动环境解析链中，不会通过运行状态 Remote 返回到浏览器。

### 验证

- `npm run check`：通过。
- `npm test`：11/11 通过。
- `npm pack`：通过。

### 提交

- `4c761ae` — `feat: add full SenseNova key pool and routing controls`
  - 新增 Key Pool 运行状态与重置 Remote。
  - 新增首选 Key、模型到 Key 路由、模型白名单、Credential 控制、字段 Reset 语义和完整 Provider 管理 UI。
  - 更新测试和 package metadata，发布为 `0.4.0-alpha.1`。

---

## [0.3.0-alpha.2] - 2026-09-15

### 变更

- 重做 SenseNova 设置页布局，使其更接近 DSH / Command Code 的视觉节奏。
- API Key 区域从拥挤的三列横排改为纵向表单结构。
- 高级设置从双列 Grid 改为单列设置流。
- 统一内容宽度、标题字号、卡片内边距、字段间距、按钮尺寸和响应式行为，使其更接近 DSH 设置页规范。
- Package 版本升级为 `0.3.0-alpha.2`。

### 提交

- `05e34ed` — `fix: align SenseNova settings layout with DSH`
  - 修正卡片与字段间距，以及 API Key 操作按钮因横向空间不足而被挤成竖排文字的问题。
- `30829cb` — `chore: bump SenseNova provider to 0.3.0-alpha.2`
  - 将布局修订发布为 `0.3.0-alpha.2`。

---

## [0.3.0-alpha.1] - 2026-09-15

### 新增

- 新增 SenseNova Browser-side DSH Client 插件。
- 通过 `settings.section` 在设置侧栏注册独立的 **SenseNova** 入口。
- 支持可视化编辑 API Endpoint、多 API Key、429 冷却时间、连接超时、流空闲超时和默认 Context Window。
- 集成 DSH Credentials，使 API Key 只能由浏览器写入凭据系统，不写入 `settings.yaml`。
- 接入自定义 Models Provider Card，引导用户进入独立 SenseNova 设置页，而不是显示通用的“编辑 settings.yaml”提示。
- 增加中文和英文设置文案。
- 增加 Browser bundle 注册 smoke test。

### 变更

- Package metadata 增加 DSH Web Client 所需的 export 与 injection 声明。
- README 增加新的可视化设置流程说明。

### 提交

- `33d89e8` — `feat: add SenseNova web settings client`
  - 新增首个 Browser Client 和独立 SenseNova 设置页。
- `9695cfa` — `feat: wire SenseNova web client metadata`
  - 增加 package client export / injection metadata，并完成 `0.3.0-alpha.1` 的 Web Client 接线。
- `5ea7bb4` — `docs: document the SenseNova settings page`
  - 更新 README，说明新的 UI 配置流程。
- `69eed0b` — `test: cover SenseNova client registration`
  - 增加 `settings.section`、Models Provider Card 注册以及 package client metadata 测试。

---

## [0.2.0-alpha.1] - 2026-09-15

### 新增

- 面向 DeepSeek Harness `0.1.6-alpha.1` 重写 SenseNova Provider。
- 接入 OpenAI-compatible `/models` 与 `/chat/completions`。
- 新增多 Key round-robin Key Pool；池内只保存逻辑凭据引用，不保存原始 API Key。
- `401`：将当前 Key 在本插件运行生命周期内禁用，并立即尝试下一个可用 Key。
- `429`：支持 `Retry-After`、SenseNova 特定错误码对应的冷却下限、可配置默认/最大 cooldown，并立即尝试下一个可用 Key。
- 接入 DSH retry policy；全部 Key 冷却时，将最早恢复时间作为 Provider 重试时间返回给 DSH。
- 新增 connect/first-byte timeout 和 stream idle timeout，同时保证收到响应头后 Host cancellation 仍能中止网络流。
- 修复 SenseNova 流式 Tool Call 后续 chunk 中空 `id` / `function.name` 覆盖前序有效值的问题。
- 修复历史 Tool Call：异常 ID、空 arguments、空 name、孤立 tool result。
- 符合 DSH `0.1.6` Stream Contract：`block end → usage → finish`，且 `finish` 后不再输出任何事件。
- 新增模型目录解析：context、最大输出 token、已知模型 reasoning effort fallback。
- 增加 Key Pool 与流式 Tool Call 的初始单元测试。

### 变更

- 将 README 从实现记录重写为开源项目首页，重点突出用途、安装、配置以及 401/429 行为。
- 增加 DSH compatibility metadata，使兼容性检查不再显示 `UNKNOWN`。

### 提交

- `c2140c3` — `feat: add DSH 0.1.6 SenseNova provider`
  - 初始独立 SenseNova Provider 实现及测试。
- `1355c71` — `docs: simplify README`
  - 重写 README，聚焦主要使用流程与核心能力。
- `c1c50fc` — `chore: declare DSH compatibility metadata`
  - 为 DSH `0.1.6` 系列增加显式兼容性 metadata。

---

[未发布]: https://github.com/CiaoBye/dsh-sensenova-provider/compare/4c761aef5432abd36c21aedc17b9872b3fbed818...HEAD
[0.4.0-alpha.1]: https://github.com/CiaoBye/dsh-sensenova-provider/commit/4c761aef5432abd36c21aedc17b9872b3fbed818
[0.3.0-alpha.2]: https://github.com/CiaoBye/dsh-sensenova-provider/commit/30829cb764dc91ab75e67edeb5537c86e60b2e4e
[0.3.0-alpha.1]: https://github.com/CiaoBye/dsh-sensenova-provider/commit/69eed0b63764ab3a32b805a3b013e49d6a640dcb
[0.2.0-alpha.1]: https://github.com/CiaoBye/dsh-sensenova-provider/commit/c1c50fcafc992554e4ed99183414e3b28e87e40b
