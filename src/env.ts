export interface Env {
  /**
   * token,admin_id[,id2,id3...]
   * First chat id is admin (can use /webhook); all ids receive forwarded messages.
   */
  TELEGRAM_BOT: string;
  /** Comma-separated IPs. Empty / unset = allow all. Applies to business POST / only. */
  WHITE_IPs?: string;
  /** IANA timezone, e.g. Asia/Shanghai. Empty / invalid / unset = disabled. */
  TIMER_STAMP?: string;
}
