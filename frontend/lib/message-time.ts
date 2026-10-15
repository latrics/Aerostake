// Timestamp helpers for discussion threads, stage chats and report transcripts.
// All display values are rendered in Indian Standard Time, 24-hour clock.

const IST = 'Asia/Kolkata';

interface TimedMessage {
  id?: string;
  timestamp?: string;
}

/**
 * Resolve the real send time of a message.
 * New messages store an ISO timestamp. Legacy messages stored 'Just now' or a locale string, so for
 * those the epoch-millis embedded in the message id (`msg-3-1727512345678`, `chat-1727512345678-ab12`)
 * is used, since it is exact and timezone-independent.
 */
export function resolveMessageTime(msg: TimedMessage): Date | null {
  const parse = (value: string) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  if (msg.timestamp && /^\d{4}-\d{2}-\d{2}T/.test(msg.timestamp)) {
    const iso = parse(msg.timestamp);
    if (iso) return iso;
  }
  const match = msg.id?.match(/(?:^|\D)(\d{13})(?=\D|$)/);
  if (match) {
    const fromId = new Date(Number(match[1]));
    if (!Number.isNaN(fromId.getTime())) return fromId;
  }
  return msg.timestamp ? parse(msg.timestamp) : null;
}

// Labels are assembled from numeric IST parts with fixed month/weekday names, because locale month
// names differ between ICU versions (e.g. newer en-GB data prints "Sept" instead of "Sep").
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: IST,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  hourCycle: 'h23',
});

interface IstParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
}

function istParts(date: Date): IstParts {
  const p = { year: 0, month: 1, day: 1, hour: 0, minute: 0, second: 0 } as Record<string, number>;
  for (const { type, value } of partsFormatter.formatToParts(date)) {
    if (type in p) p[type] = Number(value);
  }
  // Weekday from the IST calendar date (UTC noon avoids any DST/offset edge).
  const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day, 12)).getUTCDay();
  return { year: p.year, month: p.month, day: p.day, hour: p.hour % 24, minute: p.minute, second: p.second, weekday };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 24-hour clock time, e.g. `14:59`. */
export function formatChatTime(date: Date): string {
  const p = istParts(date);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** Day divider label, e.g. `Sun, 28 Sep 2026`. */
export function formatDayLabel(date: Date): string {
  const p = istParts(date);
  return `${WEEKDAYS[p.weekday]}, ${pad(p.day)} ${MONTHS[p.month - 1]} ${p.year}`;
}

/** Short date used when a quoted parent message is from a different day, e.g. `28 Sep`. */
export function formatShortDate(date: Date): string {
  const p = istParts(date);
  return `${pad(p.day)} ${MONTHS[p.month - 1]}`;
}

/** Stable per-day grouping key in IST, e.g. `2026-09-28`. */
export function dayKey(date: Date): string {
  const p = istParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Full audit timestamp, e.g. `2026-09-28 14:59:03 IST`. */
export function formatAuditTimestamp(date: Date): string {
  const p = istParts(date);
  return `${dayKey(date)} ${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)} IST`;
}

/** Inline label for a single message inside the app, e.g. `28 Sep 2026 · 14:59`. */
export function formatMessageStamp(msg: TimedMessage): string {
  const date = resolveMessageTime(msg);
  if (!date) return msg.timestamp || 'time not recorded';
  const p = istParts(date);
  return `${pad(p.day)} ${MONTHS[p.month - 1]} ${p.year} · ${formatChatTime(date)}`;
}

/** Strip lightweight markdown (`**bold**`, `__bold__`, `*em*`) for plain-text exports. */
export function stripInlineMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/(^|\s)\*(\S.*?)\*(?=\s|$)/g, '$1$2');
}
