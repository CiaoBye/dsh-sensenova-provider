# dsh-sensenova-provider

为 DeepSeek Harness (DSH) `v0.1.6-alpha.1+` 重写的 SenseNova LLM Adapter。

## 功能

- `sensenova` Provider，走 SenseNova OpenAI-compatible `/chat/completions` 与 `/models`。
- 多 Key 轮转：每次请求从可用 Key 池选择，失败时只在**首个响应内容之前**切换。
- `401`：当前 Key 在本进程生命周期内永久禁用，立即尝试下一把 Key。
- `429`：当前 Key 进入 cooldown，立即尝试下一把 Key；cooldown 到期后自动恢复。
- SenseNova `error.code=8` 默认至少冷却 15 秒，`429001` 默认至少冷却 60 秒；同时尊重 `Retry-After`，并受 `maxCooldown429Ms` 限制。
- Tool Call 修复：SenseNova 后续 SSE chunk 即使返回空 `id` / 空 `function.name`，也不会覆盖首个有效值。
- 坏历史防护：空 tool name 丢弃；空 arguments 补 `{}`；空 id 生成临时稳定 id；孤立 tool result 不回放。
- DSH 0.1.6 stream 契约：`usage` 永远在 `finish` 前发出，`finish` 后绝不再发 chunk。
- API Key 仅保存 credential-ref / 环境变量名，不把明文 Key 写入插件配置或日志。

## 安装

当前 GitHub 分支安装：

```sh
dsh plugin --profile web add "github:CiaoBye/dsh-account-pool#sensenova-provider"
```

> 该分支是独立插件树，不会改动 `dsh-account-pool` 的 `main` 分支。

重启 DSH 后，Provider ID 为：

```text
sensenova
```

默认 API 地址：

```text
https://token.sensenova.cn/v1
```

## 配置

默认只引用 `SENSENOVA_API_KEY`。多 Key 推荐全部使用 credential refs：

```yaml
- id: llm-sensenova
  name: "@ciaobye/dsh-sensenova-provider"
  config:
    apiBase: https://token.sensenova.cn/v1
    keys:
      - id: sn-a
        label: SenseNova A
        apiKeyEnv: SENSENOVA_API_KEY_A
      - id: sn-b
        label: SenseNova B
        apiKeyEnv: SENSENOVA_API_KEY_B
      - id: sn-c
        label: SenseNova C
        apiKeyEnv: SENSENOVA_API_KEY_C
    cooldown429Ms: 30000
    maxCooldown429Ms: 120000
    connectTimeoutMs: 45000
    streamIdleTimeoutMs: 60000
    defaultContextWindow: 131072
```

把 Key 写进 DSH Credentials，或在启动 DSH 的可信环境里设置同名环境变量即可。

## Key 状态机

```text
READY --401--> DISABLED   (直到插件重载/配置重建)
READY --429--> COOLDOWN   (到期自动恢复 READY)
READY --2xx--> READY
```

单次请求使用 `tried` 集合，不会在 A/B Key 之间来回乒乓。所有 Key 都在 cooldown 时，Adapter 抛 `RATE_LIMIT` 并给 DSH `providerRetryAfterMs`，由宿主 retry 层在最早 cooldown 到期后继续。

## Tool Call 空字段修复

SenseNova 有时会先发：

```json
{"index":0,"id":"call_abc","function":{"name":"read_file","arguments":""}}
```

后续再发：

```json
{"index":0,"id":"","function":{"name":"","arguments":"{\"path\":"}}
```

插件以 `tool_calls[].index` 为第一关联键，只有**非空** `id/name` 才能更新槽位，因此后续空字段不会覆盖 `call_abc/read_file`。

## DSH 版本

开发基线：`dsh-v0.1.6-alpha.1`（2026-09-15）。依赖范围锁在 `@deepseek-ai/dsh-* >=0.1.6-alpha.1 <0.2.0`，避免静默跨越下一代破坏性 API。

## 开发验证

```sh
npm run check
npm test
npm pack --dry-run
```

测试覆盖：

- round-robin 多 Key
- 401 disable
- 429 cooldown / 自动恢复
- Tool Call 后续空 `id/name` 不覆盖
- `usage -> finish` 顺序
- 坏历史 tool-call 清洗

## License

MIT
