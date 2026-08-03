import type { Env } from './env';
import statusHtml from './status.html';
import {
  ensureBotHooks,
  handleTelegramUpdate,
  parseTelegramBot,
  sendMessageToAll,
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

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = url.origin;
    const bot = parseTelegramBot(env.TELEGRAM_BOT);

    // Bot callback from Telegram — no IP allowlist
    if (url.pathname === '/telegram') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }
      if (!bot) {
        return new Response('TELEGRAM_BOT not configured', { status: 500 });
      }

      try {
        const update = await request.json();
        await handleTelegramUpdate(update, bot, origin);
      } catch {
        // Always 200 so Telegram does not retry endlessly on bad payloads
      }
      return new Response('OK', { status: 200 });
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

    const denied = checkWhiteIps(request, env.WHITE_IPs);
    if (denied) return denied;

    if (!bot) {
      return new Response('TELEGRAM_BOT not configured', { status: 500 });
    }

    const rawText = await request.text();

    if (!rawText || rawText.trim() === '') {
      return new Response('Empty message', { status: 400 });
    }

    let messageContent = rawText;

    if (env.TIMER_STAMP && env.TIMER_STAMP.trim() !== '') {
      try {
        messageContent = appendTimestamp(rawText, env.TIMER_STAMP.trim());
      } catch {
        // Invalid timezone: leave body unchanged
      }
    }

    const { ok, errors } = await sendMessageToAll(bot.token, bot.chatIds, messageContent);

    if (!ok) {
      return new Response(`Telegram API Error: ${errors.join(' | ')}`, { status: 500 });
    }

    if (errors.length > 0) {
      return new Response(`Partial success: ${errors.join(' | ')}`, { status: 200 });
    }

    return new Response('Success', { status: 200 });
  },
};
