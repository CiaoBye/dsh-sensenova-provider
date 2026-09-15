# dsh-sensenova-provider

SenseNova Provider for **DeepSeek Harness (DSH)**.

为 DSH 接入 SenseNova OpenAI-compatible API，并提供多 Key 轮转、401/429 自动切换、Tool Call 流式修复，以及独立的 Web 设置页。

## 功能

- SenseNova `/models` 与 `/chat/completions`
- 多 Key 自动轮转
- `401`：禁用当前 Key，立即切换下一 Key
- `429`：当前 Key 进入 cooldown，立即切换下一 Key
- 修复流式 Tool Call 后续 chunk 的空 `id` / `function.name`
- DSH 设置侧栏独立 **SenseNova** 页面
- API Key 通过 DSH Credentials 保存，不写入 `settings.yaml`

## 安装

```sh
dsh plugin --profile web add "github:CiaoBye/dsh-sensenova-provider#main"
```

安装后打开：

```text
设置 → SenseNova
```

可直接配置：

- API Endpoint
- 多个 API Key
- 429 默认 / 最大冷却时间
- 连接超时
- Stream idle timeout
- 默认 Context Window

保存后对下一次请求生效，无需重启 DSH。

## 默认值

| 项目 | 默认值 |
| --- | --- |
| Provider ID | `sensenova` |
| API Endpoint | `https://token.sensenova.cn/v1` |
| 默认凭据引用 | `SENSENOVA_API_KEY` |
| 429 cooldown | `30000 ms` |
| 最大 cooldown | `120000 ms` |
| 连接超时 | `45000 ms` |
| Stream idle timeout | `60000 ms` |
| Context Window | `131072` |

## Key 行为

| 响应 | 行为 |
| --- | --- |
| `2xx` | 正常使用 |
| `401` | 当前 Key 在插件生命周期内禁用，并尝试下一 Key |
| `429` | 当前 Key 暂时冷却，并尝试下一 Key |
| 全部 Key 限流 | 返回 `RATE_LIMIT`，由 DSH 在最早 cooldown 到期后重试 |

插件同时尊重 `Retry-After`。

## 兼容性

- DSH：`0.1.6-alpha.1`
- Node.js：`>= 22`
- Package：`@ciaobye/dsh-sensenova-provider`

## 开发

```sh
npm run check
npm test
```

## License

MIT
