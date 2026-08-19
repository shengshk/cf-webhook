import { resolveConfig, type Env } from './env';
import statusHtml from './status.html';
import {
  ensureBotHooks,
  handleTelegramUpdate,
  sendMessageToAll,
  setupBotHooks,
} from './telegram';

function appendTimestamp(text: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(p => p.type === type)?.value || '';

  const stamp = `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
  return `${text}\n—————————\n时间: ${stamp}`;
}

function checkWhiteIps(request: Request, whiteIps: string | undefined): Response | null {
  if (!whiteIps || whiteIps.trim() === '') return null;

  const clientIp = request.headers.get('CF-Connecting-IP') || '';
  const allowedIps = whiteIps.split(',').map(ip => ip.trim()).filter(Boolean);

  if (!allowedIps.includes(clientIp)) {
    return new Response('Forbidden: IP not allowed', { status: 403 });
  }
  return null;
}

async function forwardWebhook(
  url: string,
  body: string,
  contentType: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body,
    });
    if (res.ok) return { ok: true };
    return { ok: false, error: `webhook ${res.status}: ${await res.text()}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'fetch failed';
    return { ok: false, error: `webhook: ${msg}` };
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = url.origin;
    const cfg = resolveConfig(env);
    const bot = cfg.bot;

    // Bot callback from Telegram — no IP allowlist
    if (url.pathname === '/telegram') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }
      if (!bot) {
        return new Response('FORWARD_PATH_TGBOT not configured', { status: 500 });
      }

      try {
        const update = await request.json();
        await handleTelegramUpdate(update, bot, origin);
      } catch {
        // Always 200 so Telegram does not retry endlessly on bad payloads
      }
      return new Response('OK', { status: 200 });
    }

    if (request.method === 'GET' && url.pathname === '/setup') {
      if (!bot) {
        return new Response(JSON.stringify({ ok: false, error: 'FORWARD_PATH_TGBOT not configured' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
      }
      const force = url.searchParams.get('force') === '1';
      const result = await setupBotHooks(bot.token, origin, force);
      return new Response(JSON.stringify({ ok: true, ...result }, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '')) {
      if (bot) {
        ctx.waitUntil(ensureBotHooks(bot.token, origin));
      }
      return new Response(statusHtml, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Business webhook receive → forward
    if (url.pathname !== '/' && url.pathname !== '') {
      return new Response('Not found', { status: 404 });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const denied = checkWhiteIps(request, cfg.whiteIps);
    if (denied) return denied;

    const needTg = cfg.channel === 'tgbot' || cfg.channel === 'all';
    const needWh = cfg.channel === 'webhook' || cfg.channel === 'all';

    if (needTg && !bot) {
      return new Response('FORWARD_PATH_TGBOT not configured', { status: 500 });
    }
    if (needWh && !cfg.webhookRaw) {
      return new Response('FORWARD_PATH_WEBHOOK not configured', { status: 500 });
    }
    if (needWh && !cfg.webhookUrl) {
      return new Response('FORWARD_PATH_WEBHOOK must be an http or https URL', { status: 500 });
    }

    const rawText = await request.text();

    if (!rawText || rawText.trim() === '') {
      return new Response('Empty message', { status: 400 });
    }

    let messageContent = rawText;
    if (cfg.timeZone) {
      try {
        messageContent = appendTimestamp(rawText, cfg.timeZone);
      } catch {
        // Invalid timezone: leave body unchanged
      }
    }

    const errors: string[] = [];
    let okCount = 0;

    if (needTg && bot) {
      const tg = await sendMessageToAll(bot.token, bot.chatIds, messageContent);
      if (tg.ok) okCount += 1;
      errors.push(...tg.errors);
    }

    if (needWh && cfg.webhookUrl) {
      const contentType = request.headers.get('Content-Type') || 'text/plain; charset=utf-8';
      const wh = await forwardWebhook(cfg.webhookUrl, messageContent, contentType);
      if (wh.ok) okCount += 1;
      else if (wh.error) errors.push(wh.error);
    }

    if (okCount === 0) {
      return new Response(`Forward error: ${errors.join(' | ') || 'all channels failed'}`, {
        status: 500,
      });
    }

    if (errors.length > 0) {
      return new Response(`Partial success: ${errors.join(' | ')}`, { status: 200 });
    }

    return new Response('Success', { status: 200 });
  },
};
