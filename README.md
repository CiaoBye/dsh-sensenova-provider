# dsh-account-pool

DeepSeek Harness（DSH）插件：为 OpenCode Go、OpenCode Zen 和 OpenRouter 提供独立的多 Key 账号池、模型目录和故障切换。

## 能做什么

- 每条 Provider 路由维护独立的 Key 列表、活动 Key、禁用/失效/耗尽状态和持久化状态。
- 请求在输出内容前遇到额度或凭据失败时，自动切换到下一个可用 Key 并静默重试。
- OpenCode Go 按 5 小时滚动、每周、每月窗口用量进行预切换和自动复活。
- OpenRouter 按账户额度和剩余额度进行预切换；普通上游 429 不会误判为账号耗尽。
- OpenCode Zen 当前没有公开用量接口，卡片展示“用量不可用”，仍支持请求失败切换。
- 模型目录以本地 pi-ai catalog 为安全基线，并按 Provider 刷新官方/公开的 `/models` 响应。
- 设置页用三个 Provider 选项卡管理 Key、模型选择、切换策略和模型目录刷新；自定义模型支持搜索、提供商/能力筛选、分组折叠、批量选择和“仅保留此模型”。

## Provider 路由

| Provider | DSH 路由 | 用量语义 | 默认模型目录 |
| --- | --- | --- | --- |
| OpenCode Go | `opencode-go` | 5h / weekly / monthly windows | `https://opencode.ai/zen/go/v1/models` |
| OpenCode Zen | `opencode` | 暂不支持公开用量 | `https://opencode.ai/zen/v1/models` |
| OpenRouter | `openrouter` | `/api/v1/key` 的 credits / limit | `https://openrouter.ai/api/v1/models` |

插件默认尝试接管三条 canonical 路由；如果另一插件已经占用某条路由，该 Provider 会显示为 waiting，释放后通过 `llm/adapters-updated` 自动接管。可以在 Provider 配置中关闭 `enabled` 或 `takeover`。

## 安装

```sh
dsh plugin --profile web add "github:CiaoBye/dsh-account-pool#main"
```

当前仓库为私有 GitHub 仓库，安装前请确保本机 GitHub HTTPS 凭据或 SSH 权限可用。若使用 SSH，可改用 `git+ssh://git@github.com/CiaoBye/dsh-account-pool.git#main`。

重启 DSH 后，在设置侧边栏打开“多 Provider 账号池”。如果模型设置中已经有同名 Provider 行，先移除该行或关闭本插件对应 Provider 的 takeover，让路由归属保持唯一。

## 配置

新配置按 Provider 分组：

```yaml
- id: account-pool
  name: dsh-account-pool
  config:
    providers:
      opencode-go:
        enabled: true
        takeover: true
        keys:
          - id: go-main
            label: Go 主号
            apiKeyEnv: OPENCODE_GO_KEY_A
        preemptAtPercent: 100
        switchAfterConsecutiveFailures: 0
        modelMode: all
        models: []
      opencode:
        enabled: true
        takeover: true
        keys: []
      openrouter:
        enabled: true
        takeover: true
        keys:
          - id: router-main
            label: Router 主号
            apiKeyEnv: OPENROUTER_KEY_A
```

支持的通用字段：

| 字段 | 默认 | 作用 |
| --- | --- | --- |
| `enabled` | `true` | 是否启用该 Provider 池 |
| `takeover` | `true` | 是否接管 canonical 路由 |
| `keys` | `[]` | `{id, label, apiKeyEnv}` 列表 |
| `preemptAtPercent` | `100` | 用量/余额达到阈值时提前避让；`100` 表示失败才切换 |
| `switchAfterConsecutiveFailures` | `0` | 连续非额度失败达到 N 次后切换；`0` 关闭 |
| `modelMode` | `all` | `all` 跟随目录；`custom` 仅暴露 `models` |
| `models` | `[]` | 自定义模型 ID 列表 |
| `usageBaseUrl` | 按 Provider | 用量接口地址；Zen 当前不使用 |
| `modelsBaseUrl` | 按 Provider | 模型目录地址 |
| `usageRefreshMs` | `30000` | 设置页轮询间隔 |
| `catalogRefreshMs` | `300000` | live catalog 缓存时间 |
| `timeoutMs` | `15000` | 用量请求超时 |

原插件的 Go-only 扁平配置（`keys`、`route`、`usageBaseUrl` 等直接位于 `config` 下）在新的 composition entry 中会迁移到 `providers.opencode-go`。旧插件的运行状态文件不会被覆盖；新版本使用 `$DSH_HOME/dsh-account-pool.<provider>.state.json`，需要时可在确认无并发请求后手工迁移或重新配置。

## 凭据与安全

配置和 Remote 响应只保存 `apiKeyEnv` 凭据引用，不保存明文 Key。设置页的“密钥”输入会通过 DSH credentials seam 写入凭据存储；也可以使用凭据页、`~/.dsh/.credentials.yaml` 或受信任环境变量。

不要把真实 Key 写入 `cordis.yml`、Git、日志或模型配置。多账号使用前请确认符合对应服务的条款和账号政策。

## 故障切换规则

1. `QUOTA`、OpenCode/Router 账户级 billing/credit failure 和 401 凭据失败会标记当前 Key 并尝试切换。
2. OpenRouter 普通 429 被保留为可重试的瞬时错误，不会直接淘汰当前账户。
3. 失败发生在任何内容输出前时，同一次 `stream()` 内静默重试。
4. 已经输出内容后发生失败时，先记录切换，再把错误交给上层重试机制。
5. 全部 Key 不可用时返回明确的 `QUOTA` finish，而不是发出没有凭据的请求。

运行态包含活动 Key、耗尽/失效/禁用状态、最近一次切换和最近用量，分别写入：

```text
$DSH_HOME/dsh-account-pool.opencode-go.state.json
$DSH_HOME/dsh-account-pool.opencode.state.json
$DSH_HOME/dsh-account-pool.openrouter.state.json
```

## 开发与验证

仓库是纯 ESM，无构建步骤。核心实现分层如下：

- `index.js`：Provider-neutral Host 服务、路由接管、池适配器和 Remote 方法。
- `pool.js`：不依赖 DSH 的 KeyPool 状态机。
- `driver-core.js` / `drivers.js`：Provider ID、失败分类、pi-ai Provider 和用量语义。
- `usage.js`：OpenCode 窗口用量和 OpenRouter credits 解析。
- `catalog.js`：静态 pi-ai catalog 与 live `/models` 合并。
- `typert.host.js`：严格 Remote manifest。
- `client.js`：lazy-CJS 浏览器设置页。

运行测试：

```sh
node --check index.js
node --check client.js
npm test
npm pack --dry-run
```

没有 DSH/React peer dependencies 的纯 checkout 会跳过 Host 集成和 React 渲染测试；这不等同于真实 DSH 加载验证，需在带完整 profile 依赖的环境中再验证插件激活、路由注册和 UI。

## 许可证

MIT
