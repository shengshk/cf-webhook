// src/telegram.ts
function parseTelegramBot(raw) {
  if (!raw || raw.trim() === "") return null;
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const token = parts[0];
  const chatIds = parts.slice(1);
  if (!token || chatIds.length === 0) return null;
  return { token, chatIds, adminId: chatIds[0] };
}
function apiUrl(token, method) {
  return `https://api.telegram.org/bot${token}/${method}`;
}
async function tgJson(token, method, body) {
  const res = await fetch(apiUrl(token, method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === void 0 ? void 0 : JSON.stringify(body)
  });
  return res.json();
}
async function sendMessage(token, chatId, text) {
  return fetch(apiUrl(token, "sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}
async function sendMessageToAll(token, chatIds, text) {
  const results = await Promise.all(
    chatIds.map(async (chatId) => {
      const res = await sendMessage(token, chatId, text);
      if (res.ok) return null;
      return `${chatId}: ${await res.text()}`;
    })
  );
  const errors = results.filter((e) => e !== null);
  return { ok: errors.length < chatIds.length, errors };
}
var WEBHOOK_COMMAND = {
  command: "webhook",
  description: "Get webhook URL / \u83B7\u53D6 Webhook \u94FE\u63A5"
};
async function setupBotHooks(token, publicOrigin, forceWebhook = false) {
  const origin = publicOrigin.replace(/\/$/, "");
  const webhookUrl = `${origin}/telegram`;
  const webhookInfo = await tgJson(token, "getWebhookInfo");
  const currentUrl = webhookInfo?.result?.url || "";
  let setWebhookResult = { skipped: true, current: currentUrl };
  const canSetWebhook = forceWebhook || !currentUrl || currentUrl === webhookUrl || currentUrl.startsWith(`${origin}/`);
  if (canSetWebhook) {
    setWebhookResult = await tgJson(token, "setWebhook", {
      url: webhookUrl,
      allowed_updates: ["message"]
    });
  } else {
    setWebhookResult = {
      skipped: true,
      reason: "Another webhook is already set on this bot. Use a dedicated bot, or /setup?force=1 to overwrite.",
      current: currentUrl,
      wanted: webhookUrl
    };
  }
  const existing = await tgJson(token, "getMyCommands");
  const commands = [...existing?.result || []];
  if (!commands.some((c) => c.command === WEBHOOK_COMMAND.command)) {
    commands.push(WEBHOOK_COMMAND);
  }
  const setCommandsResult = await tgJson(token, "setMyCommands", { commands });
  const afterCommands = await tgJson(token, "getMyCommands");
  const afterWebhook = await tgJson(token, "getWebhookInfo");
  return {
    webhookUrl,
    setWebhook: setWebhookResult,
    setMyCommands: setCommandsResult,
    commands: afterCommands,
    webhookInfo: afterWebhook
  };
}
async function ensureBotHooks(token, publicOrigin) {
  await setupBotHooks(token, publicOrigin, false);
}
function extractCommand(text) {
  if (!text) return null;
  const trimmed = text.trim();
  const match = trimmed.match(/^\/([a-zA-Z0-9_]+)(?:@\w+)?(?:\s|$)/);
  return match ? match[1].toLowerCase() : null;
}
async function handleTelegramUpdate(update, bot, publicOrigin) {
  const chatId = String(update.message?.chat?.id ?? "");
  const command = extractCommand(update.message?.text);
  if (command !== "webhook") return;
  if (chatId !== bot.adminId) return;
  const webhookLink = publicOrigin.replace(/\/$/, "");
  await sendMessage(bot.token, chatId, webhookLink);
}

// src/env.ts
function envLookup(env, ...names) {
  const bag = /* @__PURE__ */ new Map();
  for (const [k, v] of Object.entries(env)) {
    const lk = k.toLowerCase();
    if (!bag.has(lk)) bag.set(lk, v);
  }
  for (const name of names) {
    const v = bag.get(name.toLowerCase());
    if (typeof v === "string") return v;
  }
  return void 0;
}
function parseChannel(raw) {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "webhook") return "webhook";
  if (v === "all") return "all";
  return "tgbot";
}
function parseHttpUrl(raw) {
  if (!raw || raw.trim() === "") return void 0;
  try {
    const u = new URL(raw.trim());
    if (u.protocol === "https:" || u.protocol === "http:") return raw.trim();
  } catch {
  }
  return void 0;
}
function isValidTimeZone(tz) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(/* @__PURE__ */ new Date());
    return true;
  } catch {
    return false;
  }
}
function resolveConfig(env) {
  const timeRaw = envLookup(env, "TIME_MARKER")?.trim();
  const webhookRaw = envLookup(
    env,
    "FORWARD_PATH_WEBHOOK",
    "FORWAERD_PATH_WEBHOOK"
  )?.trim();
  return {
    whiteIps: envLookup(env, "WHITE_IPs", "WHITE_IPS"),
    timeZone: timeRaw && isValidTimeZone(timeRaw) ? timeRaw : void 0,
    channel: parseChannel(envLookup(env, "FORWARD_PATH", "FORWAERD_PATH")),
    bot: parseTelegramBot(
      envLookup(env, "FORWARD_PATH_TGBOT", "FORWAERD_PATH_TGBOT", "TELEGRAM_BOT")
    ),
    webhookRaw: webhookRaw || void 0,
    webhookUrl: parseHttpUrl(webhookRaw)
  };
}

// src/status.html
var status_default = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WebHook</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3CradialGradient id='g' cx='35%25' cy='30%25' r='70%25'%3E%3Cstop offset='0%25' stop-color='%238dffc4'/%3E%3Cstop offset='45%25' stop-color='%233ecf8e'/%3E%3Cstop offset='100%25' stop-color='%231a5c3c'/%3E%3C/radialGradient%3E%3C/defs%3E%3Ccircle cx='32' cy='32' r='28' fill='url(%23g)'/%3E%3C/svg%3E" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;600;700&family=Noto+Sans+SC:wght@500&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg0: #0b1210;
      --glow: #3ecf8e;
      --text: #e8f5ee;
      --muted: #7a9a88;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      height: 100%;
    }

    body {
      min-height: 100%;
      display: grid;
      place-items: center;
      color: var(--text);
      font-family: "Unbounded", "Noto Sans SC", sans-serif;
      background:
        radial-gradient(ellipse 80% 60% at 50% 35%, #1a3a2a 0%, transparent 55%),
        radial-gradient(ellipse 100% 80% at 50% 100%, #0e1c16 0%, var(--bg0) 60%);
      overflow: hidden;
      cursor: pointer;
      user-select: none;
    }

    .stage {
      text-align: center;
      padding: 1.5rem;
      pointer-events: none;
    }

    .orb {
      width: 72px;
      height: 72px;
      margin: 0 auto 0.9rem;
      border-radius: 50%;
      pointer-events: auto;
      cursor: pointer;
      background: radial-gradient(circle at 35% 30%, #8dffc4, var(--glow) 45%, #1a5c3c 100%);
      box-shadow:
        0 0 24px rgba(62, 207, 142, 0.45),
        0 0 64px rgba(62, 207, 142, 0.2);
      animation: breathe 3.2s ease-in-out infinite;
    }

    .orb::after {
      content: "";
      display: block;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(62, 207, 142, 0.35);
      animation: ring 3.2s ease-in-out infinite;
    }

    .status {
      position: relative;
      min-height: 2.6rem;
      display: grid;
      place-items: center;
      line-height: 1.35;
      padding: 0.1rem 0;
    }

    .status span {
      grid-area: 1 / 1;
      font-size: clamp(1.35rem, 3.6vw, 1.85rem);
      font-weight: 600;
      letter-spacing: 0.03em;
      line-height: 1.35;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 0.55s ease, transform 0.55s ease;
    }

    .status span.active {
      opacity: 1;
      transform: none;
    }

    .hint {
      margin-top: 0.45rem;
      font-size: 0.72rem;
      font-weight: 500;
      color: var(--muted);
      letter-spacing: 0.1em;
      line-height: 1.45;
      opacity: 0.85;
    }

    .toast {
      position: fixed;
      left: 50%;
      bottom: 12%;
      transform: translateX(-50%) translateY(12px);
      padding: 0.55rem 1rem;
      border-radius: 999px;
      background: rgba(20, 40, 30, 0.88);
      color: var(--text);
      font-size: 0.85rem;
      letter-spacing: 0.04em;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease, transform 0.25s ease;
      backdrop-filter: blur(8px);
    }

    .toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    @keyframes breathe {
      0%, 100% {
        transform: scale(0.92);
        filter: brightness(0.9);
      }
      50% {
        transform: scale(1.06);
        filter: brightness(1.15);
      }
    }

    @keyframes ring {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(62, 207, 142, 0);
      }
      50% {
        box-shadow: 0 0 0 18px rgba(62, 207, 142, 0);
      }
    }
  </style>
</head>
<body>
  <main class="stage">
    <div class="orb" id="orb" title="Open GitHub" role="link" tabindex="0"></div>
    <div class="status" id="status" aria-live="polite">
      <span class="active">\u8FD0\u884C\u4E2D</span>
      <span>Working</span>
      <span>\u904B\u4F5C\u4E2D</span>
      <span>\u7A3C\u50CD\u4E2D</span>
      <span>\uC791\uB3D9 \uC911</span>
      <span>En cours</span>
    </div>
    <p class="hint">cf-webhook \xB7 online</p>
  </main>
  <div class="toast" id="toast">Webhook \u5DF2\u590D\u5236</div>
  <script>
    const GITHUB = "https://github.com/shengshk/cf-webhook";

    const phrases = document.querySelectorAll("#status span");
    let i = 0;
    setInterval(() => {
      phrases[i].classList.remove("active");
      i = (i + 1) % phrases.length;
      phrases[i].classList.add("active");
    }, 2200);

    const toast = document.getElementById("toast");
    let toastTimer;

    function showToast(msg) {
      toast.textContent = msg;
      toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove("show"), 1600);
    }

    document.getElementById("orb").addEventListener("click", (e) => {
      e.stopPropagation();
      window.open(GITHUB, "_blank", "noopener,noreferrer");
    });

    document.body.addEventListener("click", async () => {
      const webhook = location.origin;
      try {
        await navigator.clipboard.writeText(webhook);
        showToast("Webhook \u5DF2\u590D\u5236");
      } catch {
        showToast("\u590D\u5236\u5931\u8D25");
      }
    });
  <\/script>
</body>
</html>
`;

// src/index.ts
function appendTimestamp(text, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(/* @__PURE__ */ new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  const stamp = `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
  return `${text}
\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014
\u65F6\u95F4: ${stamp}`;
}
function checkWhiteIps(request, whiteIps) {
  if (!whiteIps || whiteIps.trim() === "") return null;
  const clientIp = request.headers.get("CF-Connecting-IP") || "";
  const allowedIps = whiteIps.split(",").map((ip) => ip.trim()).filter(Boolean);
  if (!allowedIps.includes(clientIp)) {
    return new Response("Forbidden: IP not allowed", { status: 403 });
  }
  return null;
}
async function forwardWebhook(url, body, contentType) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body
    });
    if (res.ok) return { ok: true };
    return { ok: false, error: `webhook ${res.status}: ${await res.text()}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return { ok: false, error: `webhook: ${msg}` };
  }
}
var index_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = url.origin;
    const cfg = resolveConfig(env);
    const bot = cfg.bot;
    if (url.pathname === "/telegram") {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
      }
      if (!bot) {
        return new Response("FORWARD_PATH_TGBOT not configured", { status: 500 });
      }
      try {
        const update = await request.json();
        await handleTelegramUpdate(update, bot, origin);
      } catch {
      }
      return new Response("OK", { status: 200 });
    }
    if (request.method === "GET" && url.pathname === "/setup") {
      if (!bot) {
        return new Response(JSON.stringify({ ok: false, error: "FORWARD_PATH_TGBOT not configured" }), {
          status: 500,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }
      const force = url.searchParams.get("force") === "1";
      const result = await setupBotHooks(bot.token, origin, force);
      return new Response(JSON.stringify({ ok: true, ...result }, null, 2), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "")) {
      if (bot) {
        ctx.waitUntil(ensureBotHooks(bot.token, origin));
      }
      return new Response(status_default, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    }
    if (url.pathname !== "/" && url.pathname !== "") {
      return new Response("Not found", { status: 404 });
    }
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    const denied = checkWhiteIps(request, cfg.whiteIps);
    if (denied) return denied;
    const needTg = cfg.channel === "tgbot" || cfg.channel === "all";
    const needWh = cfg.channel === "webhook" || cfg.channel === "all";
    if (needTg && !bot) {
      return new Response("FORWARD_PATH_TGBOT not configured", { status: 500 });
    }
    if (needWh && !cfg.webhookRaw) {
      return new Response("FORWARD_PATH_WEBHOOK not configured", { status: 500 });
    }
    if (needWh && !cfg.webhookUrl) {
      return new Response("FORWARD_PATH_WEBHOOK must be an http or https URL", { status: 500 });
    }
    const rawText = await request.text();
    if (!rawText || rawText.trim() === "") {
      return new Response("Empty message", { status: 400 });
    }
    let messageContent = rawText;
    if (cfg.timeZone) {
      try {
        messageContent = appendTimestamp(rawText, cfg.timeZone);
      } catch {
      }
    }
    const errors = [];
    let okCount = 0;
    if (needTg && bot) {
      const tg = await sendMessageToAll(bot.token, bot.chatIds, messageContent);
      if (tg.ok) okCount += 1;
      errors.push(...tg.errors);
    }
    if (needWh && cfg.webhookUrl) {
      const contentType = request.headers.get("Content-Type") || "text/plain; charset=utf-8";
      const wh = await forwardWebhook(cfg.webhookUrl, messageContent, contentType);
      if (wh.ok) okCount += 1;
      else if (wh.error) errors.push(wh.error);
    }
    if (okCount === 0) {
      return new Response(`Forward error: ${errors.join(" | ") || "all channels failed"}`, {
        status: 500
      });
    }
    if (errors.length > 0) {
      return new Response(`Partial success: ${errors.join(" | ")}`, { status: 200 });
    }
    return new Response("Success", { status: 200 });
  }
};
export {
  index_default as default
};
