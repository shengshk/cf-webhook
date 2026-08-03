export interface TelegramBotConfig {
  token: string;
  chatIds: string[];
  adminId: string;
}

export interface BotCommand {
  command: string;
  description: string;
}

export function parseTelegramBot(raw: string | undefined): TelegramBotConfig | null {
  if (!raw || raw.trim() === '') return null;

  const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  const token = parts[0];
  const chatIds = parts.slice(1);
  if (!token || chatIds.length === 0) return null;

  return { token, chatIds, adminId: chatIds[0] };
}

function apiUrl(token: string, method: string): string {
  return `https://api.telegram.org/bot${token}/${method}`;
}

async function tgJson(token: string, method: string, body?: unknown): Promise<unknown> {
  const res = await fetch(apiUrl(token, method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return res.json();
}

export async function sendMessage(
  token: string,
  chatId: string,
  text: string,
): Promise<Response> {
  return fetch(apiUrl(token, 'sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function sendMessageToAll(
  token: string,
  chatIds: string[],
  text: string,
): Promise<{ ok: boolean; errors: string[] }> {
  const results = await Promise.all(
    chatIds.map(async (chatId) => {
      const res = await sendMessage(token, chatId, text);
      if (res.ok) return null;
      return `${chatId}: ${await res.text()}`;
    }),
  );

  const errors = results.filter((e): e is string => e !== null);
  return { ok: errors.length < chatIds.length, errors };
}

const WEBHOOK_COMMAND: BotCommand = {
  command: 'webhook',
  description: 'Get webhook URL / 获取 Webhook 链接',
};

export async function setupBotHooks(
  token: string,
  publicOrigin: string,
  forceWebhook = false,
): Promise<Record<string, unknown>> {
  const origin = publicOrigin.replace(/\/$/, '');
  const webhookUrl = `${origin}/telegram`;

  const webhookInfo = (await tgJson(token, 'getWebhookInfo')) as {
    ok?: boolean;
    result?: { url?: string };
  };
  const currentUrl = webhookInfo?.result?.url || '';

  let setWebhookResult: unknown = { skipped: true, current: currentUrl };
  const canSetWebhook =
    forceWebhook ||
    !currentUrl ||
    currentUrl === webhookUrl ||
    currentUrl.startsWith(`${origin}/`);

  if (canSetWebhook) {
    setWebhookResult = await tgJson(token, 'setWebhook', {
      url: webhookUrl,
      allowed_updates: ['message'],
    });
  } else {
    setWebhookResult = {
      skipped: true,
      reason:
        'Another service already owns this bot webhook. Use a dedicated bot, or open /setup?force=1 (will break the other service).',
      current: currentUrl,
      wanted: webhookUrl,
    };
  }

  const existing = (await tgJson(token, 'getMyCommands')) as {
    ok?: boolean;
    result?: BotCommand[];
  };
  const commands = [...(existing?.result || [])];
  if (!commands.some(c => c.command === WEBHOOK_COMMAND.command)) {
    commands.push(WEBHOOK_COMMAND);
  }

  const setCommandsResult = await tgJson(token, 'setMyCommands', { commands });
  const afterCommands = await tgJson(token, 'getMyCommands');
  const afterWebhook = await tgJson(token, 'getWebhookInfo');

  return {
    webhookUrl,
    setWebhook: setWebhookResult,
    setMyCommands: setCommandsResult,
    commands: afterCommands,
    webhookInfo: afterWebhook,
  };
}

/** Fire-and-forget helper for status page visits. */
export async function ensureBotHooks(token: string, publicOrigin: string): Promise<void> {
  await setupBotHooks(token, publicOrigin, false);
}

interface TelegramUpdate {
  message?: {
    chat?: { id?: number | string };
    text?: string;
  };
}

export function extractCommand(text: string | undefined): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  const match = trimmed.match(/^\/([a-zA-Z0-9_]+)(?:@\w+)?(?:\s|$)/);
  return match ? match[1].toLowerCase() : null;
}

export async function handleTelegramUpdate(
  update: TelegramUpdate,
  bot: TelegramBotConfig,
  publicOrigin: string,
): Promise<void> {
  const chatId = String(update.message?.chat?.id ?? '');
  const command = extractCommand(update.message?.text);

  if (command !== 'webhook') return;
  if (chatId !== bot.adminId) return;

  const webhookLink = publicOrigin.replace(/\/$/, '');
  await sendMessage(bot.token, chatId, webhookLink);
}
