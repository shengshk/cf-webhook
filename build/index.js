// src/status.html
var status_default = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1" />\n  <title>cfwebhook</title>\n  <link rel="preconnect" href="https://fonts.googleapis.com" />\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700&family=Noto+Sans+SC:wght@500&display=swap" rel="stylesheet" />\n  <style>\n    :root {\n      --bg0: #0b1210;\n      --glow: #3ecf8e;\n      --text: #e8f5ee;\n      --muted: #7a9a88;\n    }\n\n    * { box-sizing: border-box; margin: 0; padding: 0; }\n\n    html, body {\n      height: 100%;\n    }\n\n    body {\n      min-height: 100%;\n      display: grid;\n      place-items: center;\n      color: var(--text);\n      font-family: "Syne", "Noto Sans SC", sans-serif;\n      background:\n        radial-gradient(ellipse 80% 60% at 50% 35%, #1a3a2a 0%, transparent 55%),\n        radial-gradient(ellipse 100% 80% at 50% 100%, #0e1c16 0%, var(--bg0) 60%);\n      overflow: hidden;\n      cursor: pointer;\n      user-select: none;\n    }\n\n    .stage {\n      text-align: center;\n      padding: 2rem;\n      pointer-events: none;\n    }\n\n    .orb {\n      width: 72px;\n      height: 72px;\n      margin: 0 auto 1.75rem;\n      border-radius: 50%;\n      pointer-events: auto;\n      cursor: pointer;\n      background: radial-gradient(circle at 35% 30%, #8dffc4, var(--glow) 45%, #1a5c3c 100%);\n      box-shadow:\n        0 0 24px rgba(62, 207, 142, 0.45),\n        0 0 64px rgba(62, 207, 142, 0.2);\n      animation: breathe 3.2s ease-in-out infinite;\n    }\n\n    .orb::after {\n      content: "";\n      display: block;\n      width: 100%;\n      height: 100%;\n      border-radius: 50%;\n      box-shadow: 0 0 0 0 rgba(62, 207, 142, 0.35);\n      animation: ring 3.2s ease-in-out infinite;\n    }\n\n    .status {\n      position: relative;\n      min-height: 3.25rem;\n      display: grid;\n      place-items: center;\n      line-height: 1.35;\n      padding: 0.15rem 0;\n    }\n\n    .status span {\n      grid-area: 1 / 1;\n      font-size: clamp(1.5rem, 4vw, 2rem);\n      font-weight: 600;\n      letter-spacing: 0.04em;\n      line-height: 1.35;\n      opacity: 0;\n      transform: translateY(6px);\n      transition: opacity 0.55s ease, transform 0.55s ease;\n    }\n\n    .status span.active {\n      opacity: 1;\n      transform: translateY(0);\n    }\n\n    .hint {\n      margin-top: 1.25rem;\n      font-size: 0.8rem;\n      font-weight: 500;\n      color: var(--muted);\n      letter-spacing: 0.08em;\n      opacity: 0.85;\n    }\n\n    .toast {\n      position: fixed;\n      left: 50%;\n      bottom: 12%;\n      transform: translateX(-50%) translateY(12px);\n      padding: 0.55rem 1rem;\n      border-radius: 999px;\n      background: rgba(20, 40, 30, 0.88);\n      color: var(--text);\n      font-size: 0.85rem;\n      letter-spacing: 0.04em;\n      opacity: 0;\n      pointer-events: none;\n      transition: opacity 0.25s ease, transform 0.25s ease;\n      backdrop-filter: blur(8px);\n    }\n\n    .toast.show {\n      opacity: 1;\n      transform: translateX(-50%) translateY(0);\n    }\n\n    @keyframes breathe {\n      0%, 100% {\n        transform: scale(0.92);\n        filter: brightness(0.9);\n      }\n      50% {\n        transform: scale(1.06);\n        filter: brightness(1.15);\n      }\n    }\n\n    @keyframes ring {\n      0%, 100% {\n        box-shadow: 0 0 0 0 rgba(62, 207, 142, 0);\n      }\n      50% {\n        box-shadow: 0 0 0 18px rgba(62, 207, 142, 0);\n      }\n    }\n  </style>\n</head>\n<body>\n  <main class="stage">\n    <div class="orb" id="orb" title="Open GitHub" role="link" tabindex="0"></div>\n    <div class="status" id="status" aria-live="polite">\n      <span class="active">\u8FD0\u884C\u4E2D\u2026</span>\n      <span>Working\u2026</span>\n      <span>\u7A3C\u50CD\u4E2D\u2026</span>\n      <span>En cours\u2026</span>\n      <span>\u0420\u0430\u0431\u043E\u0442\u0430\u0435\u0442\u2026</span>\n    </div>\n    <p class="hint">cfwebhook \xB7 online</p>\n  </main>\n  <div class="toast" id="toast">Webhook \u5DF2\u590D\u5236</div>\n  <script>\n    const GITHUB = "https://github.com/shengshk/cfwebhook";\n\n    const phrases = document.querySelectorAll("#status span");\n    let i = 0;\n    setInterval(() => {\n      phrases[i].classList.remove("active");\n      i = (i + 1) % phrases.length;\n      phrases[i].classList.add("active");\n    }, 2200);\n\n    const toast = document.getElementById("toast");\n    let toastTimer;\n\n    function showToast(msg) {\n      toast.textContent = msg;\n      toast.classList.add("show");\n      clearTimeout(toastTimer);\n      toastTimer = setTimeout(() => toast.classList.remove("show"), 1600);\n    }\n\n    document.getElementById("orb").addEventListener("click", (e) => {\n      e.stopPropagation();\n      window.open(GITHUB, "_blank", "noopener,noreferrer");\n    });\n\n    document.body.addEventListener("click", async () => {\n      const webhook = location.origin;\n      try {\n        await navigator.clipboard.writeText(webhook);\n        showToast("Webhook \u5DF2\u590D\u5236");\n      } catch {\n        showToast("\u590D\u5236\u5931\u8D25");\n      }\n    });\n  <\/script>\n</body>\n</html>\n';

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
async function ensureBotHooks(token, publicOrigin) {
  const webhookUrl = `${publicOrigin.replace(/\/$/, "")}/telegram`;
  await Promise.all([
    fetch(apiUrl(token, "setWebhook"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, allowed_updates: ["message"] })
    }),
    fetch(apiUrl(token, "setMyCommands"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "webhook", description: "Get webhook URL / \u83B7\u53D6 Webhook \u94FE\u63A5" }
        ]
      })
    })
  ]);
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
var index_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = url.origin;
    const bot = parseTelegramBot(env.TELEGRAM_BOT);
    if (url.pathname === "/telegram") {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
      }
      if (!bot) {
        return new Response("TELEGRAM_BOT not configured", { status: 500 });
      }
      try {
        const update = await request.json();
        await handleTelegramUpdate(update, bot, origin);
      } catch {
      }
      return new Response("OK", { status: 200 });
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
    const denied = checkWhiteIps(request, env.WHITE_IPs);
    if (denied) return denied;
    if (!bot) {
      return new Response("TELEGRAM_BOT not configured", { status: 500 });
    }
    const rawText = await request.text();
    if (!rawText || rawText.trim() === "") {
      return new Response("Empty message", { status: 400 });
    }
    let messageContent = rawText;
    if (env.TIMER_STAMP && env.TIMER_STAMP.trim() !== "") {
      try {
        messageContent = appendTimestamp(rawText, env.TIMER_STAMP.trim());
      } catch {
      }
    }
    const { ok, errors } = await sendMessageToAll(bot.token, bot.chatIds, messageContent);
    if (!ok) {
      return new Response(`Telegram API Error: ${errors.join(" | ")}`, { status: 500 });
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
