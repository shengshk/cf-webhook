import { parseTelegramBot, type TelegramBotConfig } from './telegram';

export interface Env {
  TIME_MARKER?: string;
  FORWARD_PATH?: string;
  FORWARD_PATH_TGBOT?: string;
  FORWARD_PATH_WEBHOOK?: string;
  TELEGRAM_BOT?: string;
  WHITE_IPs?: string;
}

export type ForwardChannel = 'tgbot' | 'webhook' | 'all';

export interface AppConfig {
  whiteIps: string | undefined;
  timeZone: string | undefined;
  channel: ForwardChannel;
  bot: TelegramBotConfig | null;
  webhookRaw: string | undefined;
  webhookUrl: string | undefined;
}

function envLookup(env: Env, ...names: string[]): string | undefined {
  const bag = new Map<string, unknown>();
  for (const [k, v] of Object.entries(env as Record<string, unknown>)) {
    const lk = k.toLowerCase();
    if (!bag.has(lk)) bag.set(lk, v);
  }
  for (const name of names) {
    const v = bag.get(name.toLowerCase());
    if (typeof v === 'string') return v;
  }
  return undefined;
}

function parseChannel(raw: string | undefined): ForwardChannel {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === 'webhook') return 'webhook';
  if (v === 'all') return 'all';
  return 'tgbot';
}

function parseHttpUrl(raw: string | undefined): string | undefined {
  if (!raw || raw.trim() === '') return undefined;
  try {
    const u = new URL(raw.trim());
    if (u.protocol === 'https:' || u.protocol === 'http:') return raw.trim();
  } catch {
    // invalid URL
  }
  return undefined;
}

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function resolveConfig(env: Env): AppConfig {
  const timeRaw = envLookup(env, 'TIME_MARKER')?.trim();
  const webhookRaw = envLookup(
    env,
    'FORWARD_PATH_WEBHOOK',
    'FORWAERD_PATH_WEBHOOK',
  )?.trim();

  return {
    whiteIps: envLookup(env, 'WHITE_IPs', 'WHITE_IPS'),
    timeZone: timeRaw && isValidTimeZone(timeRaw) ? timeRaw : undefined,
    channel: parseChannel(envLookup(env, 'FORWARD_PATH', 'FORWAERD_PATH')),
    bot: parseTelegramBot(
      envLookup(env, 'FORWARD_PATH_TGBOT', 'FORWAERD_PATH_TGBOT', 'TELEGRAM_BOT'),
    ),
    webhookRaw: webhookRaw || undefined,
    webhookUrl: parseHttpUrl(webhookRaw),
  };
}
