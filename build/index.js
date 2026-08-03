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
var index_default = {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    if (env.WHITE_IP_LIST && env.WHITE_IP_LIST.trim() !== "") {
      const clientIp = request.headers.get("CF-Connecting-IP") || "";
      const allowedIps = env.WHITE_IP_LIST.split(",").map((ip) => ip.trim());
      if (!allowedIps.includes(clientIp)) {
        return new Response("Forbidden: IP not allowed", { status: 403 });
      }
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
    const telegramUrl = `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`;
    const tgResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_ID,
        text: messageContent
      })
    });
    if (!tgResponse.ok) {
      const errorText = await tgResponse.text();
      return new Response(`Telegram API Error: ${errorText}`, { status: 500 });
    }
    return new Response("Success", { status: 200 });
  }
};
export {
  index_default as default
};
