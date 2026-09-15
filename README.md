# dsh-sensenova-provider

SenseNova Provider for **DeepSeek Harness (DSH)**.

基于 SenseNova OpenAI-compatible API，为 DSH 提供模型接入、多 Key 轮转、限流切换，以及 Tool Call 流式兼容修复。

## 核心能力

- **SenseNova 接入**：支持 `/models` 与 `/chat/completions`
- **多 Key 轮转**：自动选择可用 Key，请求失败后切换下一 Key
- **401 自动禁用**：失效 Key 在当前插件生命周期内停止使用
- **429 自动冷却**：限流 Key 暂停使用，到期后自动恢复
- **Tool Call 修复**：避免 SenseNova 流式返回空 `id` / `function.name` 覆盖前序有效值
- **DSH 0.1.6 兼容**：符合当前 stream / usage / finish 契约

## 安装

```sh
dsh plugin --profile web add "github:CiaoBye/dsh-sensenova-provider"
```

Provider ID：

```text
sensenova
```

默认 API：

```text
https://token.sensenova.cn/v1
```

## 配置

单 Key 默认读取：

```text
SENSENOVA_API_KEY
```

多 Key 示例：

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
    cooldown429Ms: 30000
    maxCooldown429Ms: 120000
```

推荐将 Key 保存到 DSH Credentials，或通过对应环境变量提供。插件配置和日志不会保存明文 API Key。

## Key 处理规则

| 情况 | 行为 |
| --- | --- |
| `2xx` | 正常使用 |
| `401` | 禁用当前 Key，并立即尝试下一 Key |
| `429` | 当前 Key 进入 cooldown，并立即尝试下一 Key |
| 全部 Key 限流 | 返回 `RATE_LIMIT`，等待最早 cooldown 到期后由 DSH 重试 |

插件同时尊重 `Retry-After`。SenseNova 特定限流代码会应用更合适的冷却时间。

## Tool Call 兼容修复

SenseNova 某些流式 Tool Call 后续 chunk 会返回空 `id` 或空 `function.name`。

本插件以 `tool_calls[].index` 关联同一次 Tool Call，并且只接受非空 `id/name` 更新，因此不会让后续空字段覆盖已经收到的有效值。

## 兼容性

- DSH：`>= 0.1.6-alpha.1 < 0.2.0`
- Node.js：`>= 22`
- Provider：`sensenova`

当前基线：`dsh-v0.1.6-alpha.1`

## 开发

```sh
npm run check
npm test
```

## License

MIT
