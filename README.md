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

### Bot command `/webhook`

1. Open `https://YOUR_WORKER_HOST/setup` once — it registers `/webhook` and reports webhook status as JSON.
2. Talk to the bot as the **admin** (first chat id) and send `/webhook`.
3. One Telegram bot can only have **one** webhook URL. Use a **dedicated bot** for this Worker.

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

### Warning & disclaimer

- This project is for **personal / internal notification** forwarding only. You are solely responsible for how you deploy and use it.
- Do **not** use it for spam, phishing, abuse, or any activity that violates [Cloudflare Terms](https://www.cloudflare.com/terms/), [Cloudflare AUP](https://www.cloudflare.com/acceptable-use-policy/), or [Telegram Terms](https://telegram.org/tos).
- Keep your Bot token and chat IDs secret. Prefer `WHITE_IPs` in production. Anyone who can `POST` your Worker URL can push messages into your Telegram chats.
- Cloudflare / Telegram may rate-limit or suspend accounts for abuse or quota excess. The authors provide this software **as-is**, with **no warranty**, and are **not liable** for account bans, data loss, or damages arising from use.

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

### Bot 命令 `/webhook`

1. 浏览器打开一次 `https://你的Worker域名/setup`，会注册 `/webhook`，并以 JSON 返回状态。
2. 用**管理 id（第一个）** 在 Telegram 发送 `/webhook`。
3. 一个 Bot 只能绑定 **一个** Webhook。请为本 Worker 使用**独立 Bot**。

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

### 警告与免责声明

- 本项目仅供**个人 / 内部通知**转发。部署与使用后果由使用者自行承担。
- **禁止**用于垃圾信息、钓鱼、滥用，或任何违反 [Cloudflare 服务条款](https://www.cloudflare.com/terms/)、[可接受使用政策](https://www.cloudflare.com/acceptable-use-policy/)、[Telegram 服务条款](https://telegram.org/tos) 的行为。
- 请妥善保管 Bot Token 与 chat id。生产环境建议配置 `WHITE_IPs`。任何人只要能 `POST` 你的 Worker 地址，即可向你的 Telegram 会话推送消息。
- Cloudflare / Telegram 可能因滥用或超额限流、封禁账号。本软件按 **MIT「按现状」** 提供，**不作任何保证**；作者对账号封禁、数据丢失或由此产生的损失 **不承担责任**。

### 许可证

[MIT](LICENSE) © 2026 jack (shengshk)


