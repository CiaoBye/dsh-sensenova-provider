# dsh-sensenova-provider

SenseNova Provider for **DeepSeek Harness (DSH)**.

## 核心能力

- **多 Key 轮转**：自动使用可用 Key；支持手动指定首选 Key
- **模型 → Key 路由**：第一条匹配规则优先，目标 Key 不可用时自动故障转移
- **Key Pool 状态**：可查看可用、429 冷却、401 禁用、未配置与最近使用状态，并手动重置运行状态
- **401 自动禁用 / 429 自动冷却**：尊重 `Retry-After`，全部 Key 限流时把最早恢复时间交给 DSH 重试
- **模型白名单**：只控制 DSH 模型选择器显示范围，不限制底层 `resolveModel`
- **完整 Credentials UX**：API Key 只写入 DSH Credentials；支持更换、清除、来源/可写状态显示
- **字段级 Reset**：恢复 DSH composition/default 层，而不是把默认值硬写进用户配置
- **Tool Call 流式修复**：空 `id` / `function.name` 不会覆盖前序有效值
- **独立 Web 设置页**：Settings → SenseNova

## 安装

```sh
dsh plugin --profile web add "github:CiaoBye/dsh-sensenova-provider"
```

插件升级后首次需要重启 DSH；之后在 SenseNova 设置页修改 Key、路由和参数无需重启。

## 默认值

- Provider：`sensenova`
- API：`https://token.sensenova.cn/v1`
- 默认 Credential Ref：`SENSENOVA_API_KEY`
- DSH：`>= 0.1.6-alpha.1 < 0.2.0`（已实测 `0.1.6-alpha.1`、`0.1.6-alpha.2`）
- Node.js：`>= 22`

## DSH 兼容性声明

`package.json` 用两个字段声明支持的 DSH 版本：官方 package manifest 字段 `engines.dsh`（SemVer 范围），以及 `dsh.compatibility.dshReleases`（逐版本实测记录）。

DSH 发布新版本后，先在本机实测（加载插件并真实走一次请求），确认无破坏后再把该版本写进 `dshReleases`。没有实测过的版本不会标成 `compatible`，因此上表里出现某个版本，意味着它真的被跑过。

## 路由语义

1. 命中第一条 `modelKeyRules` 时，该规则的 Key 成为本次请求首选 Key。
2. 未命中规则时使用 `activeKey`。
3. 未设置 `activeKey` 时按 Key Pool 自动轮转。
4. 首选 Key 未配置、401 禁用或 429 冷却时，自动尝试其他可用 Key。

## Token Plan / credits

插件不会抓取 SenseNova 控制台的私有接口。只有在 SenseNova 发布稳定、公开的账户 credits / quota API 后，才会加入 Token Plan 用量与侧边栏额度卡。

## 开发

```sh
npm run check
npm test
```

## License

MIT
