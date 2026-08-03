import type { Env } from './env';
import statusHtml from './status.html';

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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'GET') {
      return new Response(statusHtml, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    if (env.WHITE_IP_LIST && env.WHITE_IP_LIST.trim() !== '') {
      const clientIp = request.headers.get('CF-Connecting-IP') || '';
      const allowedIps = env.WHITE_IP_LIST.split(',').map(ip => ip.trim());

      if (!allowedIps.includes(clientIp)) {
        return new Response('Forbidden: IP not allowed', { status: 403 });
      }
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

    const telegramUrl = `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`;

    const tgResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_ID,
        text: messageContent,
      }),
    });

    if (!tgResponse.ok) {
      const errorText = await tgResponse.text();
      return new Response(`Telegram API Error: ${errorText}`, { status: 500 });
    }

    return new Response('Success', { status: 200 });
  },
};
