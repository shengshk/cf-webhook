export interface Env {
  TELEGRAM_TOKEN: string;
  TELEGRAM_ID: string;
  /** Comma-separated IPs. Empty / unset = allow all. */
  WHITE_IP_LIST?: string;
  /** IANA timezone, e.g. Asia/Shanghai. Empty / invalid / unset = disabled. */
  TIMER_STAMP?: string;
}
