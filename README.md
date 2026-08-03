# cfwebhook

<p align="center">
  <a href="#english"><img src="https://img.shields.io/badge/lang-English-0B5FFF?style=for-the-badge" alt="English" /></a>
  &nbsp;
  <a href="#中文"><img src="https://img.shields.io/badge/lang-中文-E34F26?style=for-the-badge" alt="中文" /></a>
</p>

<p align="center">
  Cloudflare Worker · HTTP Webhook → Telegram<br/>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="MIT" /></a>
</p>

![Status page](docs/status-page.jpg)

---

## English

<p align="right"><a href="#中文">中文 ▸</a></p>

Cloudflare Worker that receives HTTP webhooks and forwards the body to Telegram.

### What it does

| Path / Method | Behavior |
|---------------|----------|
| **GET /** | Status page (“running”). Center orb → GitHub; elsewhere → copy webhook URL (`location.origin`). Also registers Telegram `/webhook` command + bot webhook in the background. |
| **POST /** | Business receive: forward request body to **all** configured chat IDs. Body is **not modified**, except optional timestamp. Optional `WHITE_IPs` apply here only. |
| **POST /telegram** | Telegram Bot callback (no IP allowlist). Admin (first chat id) can send `/webhook` to receive the public webhook URL. |

Typical business flow:

1. Client `POST`s to your Worker root URL.
2. Optional IP allowlist.
3. Optional timezone timestamp.
4. Message is sent to every chat id in `TELEGRAM_BOT`.
5. Returns `Success` (or partial/error info).

### Cloudflare variables

**Settings → Variables and Secrets**

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT` | Yes | `token,admin_id[,id2,id3...]` — Bot token, then chat ids. **First id = admin** (can use `/webhook`). **All ids** receive forwarded messages. |
| `WHITE_IPs` | No | Comma-separated IPs for **POST /** only. Empty / unset = allow all. Uses `CF-Connecting-IP`. |
| `TIMER_STAMP` | No | IANA timezone, e.g. `Asia/Shanghai`. Empty / invalid / unset = off. Appends: |

```text
—————————
时间: 2026-08-03 02:00
```

Example `TELEGRAM_BOT`:

```text
123456:AAF-xxxx,111111111,222222222
```

Remove old vars if present: `TELEGRAM_TOKEN`, `TELEGRAM_ID`, `WHITE_IP_LIST`.

`keep_vars` is on in `wrangler.jsonc`.

### Bot command `/webhook`

1. Open `https://YOUR_WORKER_HOST/setup` once — it registers `/webhook` (merged with existing commands) and reports webhook status as JSON.
2. Talk to the bot as the **admin** (first chat id) and send `/webhook`.
3. **Important:** One Telegram bot can only have **one** webhook URL. If this token is shared with another Worker (e.g. mail2telegram), create a **dedicated bot** for cfwebhook. Using `/setup?force=1` will point the bot webhook here and break the other service.

### Deploy

1. Connect this repo to Workers Builds (or deploy locally).
2. Build: `bun run build`
3. Deploy: `npx wrangler deploy`
4. Set variables in the dashboard.
5. Business webhook URL: `https://YOUR_WORKER_HOST`

```bash
bun install && bun run build && bun run deploy
```

### Test

```bash
curl -X POST "https://YOUR_WORKER_URL" \
  -H "Content-Type: text/plain" \
  -d "hello from cfwebhook"
```

### License

[MIT](LICENSE) © 2026 jack (shengshk)

---

## 中文

<p align="right"><a href="#english">◂ English</a></p>

将 HTTP Webhook 请求体转发到 Telegram 的 Cloudflare Worker。

### 功能说明

| 路径 / 方法 | 行为 |
|-------------|------|
| **GET /** | 状态页。点中心 → GitHub；点其他区域 → 复制 Webhook（`location.origin`）。后台注册 Bot 的 `/webhook` 命令与 Telegram Webhook。 |
| **POST /** | 业务接收：正文转发到配置的**全部** chat id。**不改动正文**，仅可选追加时间戳。`WHITE_IPs` 只作用于此路径。 |
| **POST /telegram** | Telegram 回调（**不走** IP 白名单）。仅**管理 id（第一个）** 可发 `/webhook`，Bot 回传公开 Webhook 链接。 |

业务流程：

1. 客户端 `POST` 到 Worker 根路径。
2. 可选 IP 白名单。
3. 可选时区时间戳。
4. 向 `TELEGRAM_BOT` 中全部 id 发送。
5. 返回 `Success`（或部分成功 / 错误信息）。

### 在 Cloudflare 配置变量

**设置 → 变量和密钥**

| 变量 | 必需 | 说明 |
|------|------|------|
| `TELEGRAM_BOT` | 是 | `token,管理id[,id2,id3...]`。第一段为 Bot Token；其后为 chat id。**第一个 id = 管理**（可 `/webhook`）。**全部 id** 接收转发消息。 |
| `WHITE_IPs` | 否 | 仅限制 **POST /**。逗号分隔。空 / 未配置 = 不限制。 |
| `TIMER_STAMP` | 否 | IANA 时区，如 `Asia/Shanghai`。未配置 / 无效 = 关闭。开启时追加： |

```text
—————————
时间: 2026-08-03 02:00
```

`TELEGRAM_BOT` 示例：

```text
123456:AAF-xxxx,111111111,222222222
```

请删除旧变量（如有）：`TELEGRAM_TOKEN`、`TELEGRAM_ID`、`WHITE_IP_LIST`。

### Bot 命令 `/webhook`

1. 浏览器打开一次 Worker 地址（GET `/`），自动完成 `setWebhook` / `setMyCommands`。
2. 用**管理 id（第一个）** 在 Telegram 与 Bot 对话。
3. 发送或点击 `/webhook`，Bot 回复公开 Webhook 链接。

### 部署

1. 接入 Workers Builds，或本地部署。
2. 构建：`bun run build`
3. 部署：`npx wrangler deploy`
4. 在控制台配置变量。
5. 业务 Webhook：`https://你的Worker域名`

```bash
bun install && bun run build && bun run deploy
```

### 测试

```bash
curl -X POST "https://你的Worker地址" \
  -H "Content-Type: text/plain" \
  -d "来自 cfwebhook 的测试"
```

### 许可证

[MIT](LICENSE) © 2026 jack (shengshk)
