# 变更日志

这里记录 `@ciaobye/dsh-sensenova-provider` 的重要变更。

本仓库由早期项目重构而来。SenseNova Provider 的有效历史从提交 `c2140c3` 开始；此前继承自旧项目、与 SenseNova 无关的提交不纳入本变更日志。

## 维护规则

- **每次提交都必须同步更新本文件**：任何功能新增、问题修复、行为变化、兼容性变化或文档变化，都要在**同一个提交**里写入对应条目，不允许事后补记。
- 每个版本章节用于汇总用户可感知的变化。
- 每个版本下同时记录对应提交，方便在正式 Release / Tag 完善前追溯实现历史。
- `### 提交` 映射**只能使用真实的 Commit SHA 与真实标题**。禁止用自拟标题冒充提交记录：自拟标题会让记录看起来完整却无法追溯，比不记更糟。无法在自身提交内写入的 SHA 用标题记录，并在后续提交或发布时回填。
- 面向用户的描述（新增 / 变更 / 修复）与提交映射**分开书写**：前者写用户可感知的变化，后者只做溯源，两者不混用成同一种格式。

## [未发布]

### 新增

- 建立 `CHANGELOG.md`，并回填从 `c2140c3` 开始的 SenseNova 项目历史；`CHANGELOG.md` 同时加入 package `files` 列表，使发布 tarball 包含变更记录。
- 确立后续代码与变更日志必须同提交更新的维护规则。
- KeyPool 的 `401` 禁用与 `429` 冷却现在会持久化到 `$DSH_HOME/storages/llm-sensenova/key-state.json`，DSH 重启后不再重复试探已知不可用的 Key。
- 新增 `state-store.js`：原子写（临时文件 + rename）、写合并（debounce）、文件缺失/损坏/不可读时安全降级为空状态，且绝不影响 Provider 启动。
- 新增配置 `persistRuntimeState`（默认开启）、`stateFilePath`、`disabledStateTtlMs`（默认 30 分钟，设为 `0` 表示必须手动重置）。
- 运行状态 Remote 新增 `persistence` 字段，用于区分 `file` / `memory`。
- 新增配置 `reasoningEfforts`，可按模型覆盖内置 reasoning effort 表，新模型上线不再必须等待插件发版。
- 新增 `catalog.js` 的 `resolveReasoningEfforts`，解析顺序为 **服务端 `/models` 数据 → 运维覆盖 → 内置兜底表**；兼容服务端 `reasoning_efforts` 的字符串与 `{ id, name, description }` 两种形态并保留 `description`，effort id 去空白并去重。

### 变更

- 将变更日志正文、版本说明、维护规则和变更分类统一改为中文，保留真实 Git Commit 标题、SHA 与配置字段名，确保可追溯性。
- `npm test` 改为 `node --test --test-isolation=none`：默认的逐文件子进程模型会在受限环境里连续启动大量 node 进程，触发 `0xc0000142`（`STATUS_DLL_INIT_FAILED`）。
- 本 `[未发布]` 小节的条目改为对应真实提交：面向用户的描述与 `### 提交` 映射分开，并补上真实 Commit SHA，修正此前只有自拟标题、无法追溯的问题。
- 「维护规则」明确为可执行条款：**每次提交都必须同步更新本文件**（不允许事后补记），`### 提交` **只能使用真实 SHA 与真实标题**，且描述与提交映射不得混成同一种格式。
- 回填 `c238386`、`e670108` 的 Commit SHA，并首次推送本地提交到 `origin/main`。

### 修复

- 原生 Provider 编辑器的识别从 `className.includes('editor')` 改为 CSS-module token 精确匹配，不再误伤 `editorActions` / `editorHeader` / `editorTitle` / `editorRoute`；并兼容 credential-only 编辑器的根类名 `addBlock`，此前这类编辑器完全无法被识别。
- 卡片容器解析改为向上查找 `<li>`，不再依赖 `data-slot` 锚点的直接父节点；隐藏与恢复改为按元素记录原始 `display` 值并在卸载时精确还原，不再无条件清空 `style`；`MutationObserver` 同时观察 `childList` 与 `subtree`。
- DOM 解析与副作用逻辑抽为不依赖 React 的纯函数（`attachEditorSuppression` 等），此前完全无法测试，现可用真实 `MutationObserver` 时序覆盖挂载、切换与卸载。
- 不再对未知模型暴露未经验证的 reasoning effort：`dsh-llm` 对不支持的显式 effort 会在 Provider I/O 之前直接拒绝且不做回退，内置猜测表因此是真实故障源，而不只是维护负担。
- `disabledStateTtlMs` 此前只在插件启动时读取一次，在设置页修改后不生效、需要重启 DSH；现在改为随实时配置读取，与其余配置项一致。
- 注册 `ctx.llm.registerModelDiscovery`：本插件此前从未注册，导致设置页模型目录的回退路径必然以 `llm/model-discovery-rejected` 失败。
- 修复设置页「模型目录读取失败」的启动竞态：Controller 在 runtime Remote 挂载之前就发起了首次刷新，而 `_loading` 守卫会**静默丢弃** `setRuntimeApi` 触发的第二次刷新，使失败一直保留到用户手动点「刷新模型」；现在第二次刷新会排队，并在当前请求结束后重跑。
- Key Pool 中「名称」与「API 密钥」两个输入框此前没有标签，语言包里的 `name` / `secret` 定义了却从未被引用，用户无从分辨哪个是哪个；两项标签现已实际生效，凭据来源信息移到密钥输入框下方。
- 「名称」与「API 密钥」不再并排两列：两列各自是 flex 列、元素个数不同，导致两个输入框上下错开；现改为纵向排列，字段标签与输入框逐行对齐。
- 换 Key 后不再被旧的 `401` 禁用挡住：host 侧此前不监听凭据变化，粘贴一个修正后的 Key 仍会被上一次记录的禁用挡在门外，直到 TTL 过期或用户手动点「重置状态」。现在监听 `credentials/reference-updated`，凭据一旦提交就清除绑定到该引用的禁用。

### 验证

- `npm run check`：通过。
- `npm test`：72/72 通过。

### 提交

- `0ab7d60` — `docs: establish changelog tracking`
  - 新增 `CHANGELOG.md` 并回填 SenseNova 项目历史，确立代码与变更日志同提交更新的维护规则。
- `93a5e21` — `docs: translate changelog to Chinese`
  - 将变更日志统一改为中文，保留真实 Git Commit 标题与技术名词以便追溯。
- `f2da9b8` — `feat: persist key-pool state, add effort overrides, harden provider-card detection`
  - KeyPool 运行状态持久化、`reasoningEfforts` 覆盖、Provider 编辑器识别加固、`disabledStateTtlMs` 实时读取、`npm test` 单进程化。
- `c55be7d` — `fix: register model discovery, unblock the catalog refresh, label key fields`
  - 注册 model discovery、修复模型目录刷新的启动竞态、补齐 Key Pool 的字段标签。
- `c238386` — `docs: align the unreleased changelog with real commits`
  - 把 `[未发布]` 的面向用户描述与真实提交映射分开，补上真实 SHA。
- `e670108` — `docs: make the changelog commit-mapping rules explicit`
  - 将「每次提交同步更新」与「只用真实 SHA/标题」固化为可执行条款。

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
