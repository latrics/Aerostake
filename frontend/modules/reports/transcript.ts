// Chat-style transcript model shared by the on-screen report view, HTML exports and CSV exports.
// Layout rules (agreed format):
//   • one conversation per section / stage, strict chronological order, every message printed once
//   • a date divider printed once per IST day; each bubble shows only HH:mm
//   • replies carry a quote box of the parent (sender · role, text, attachment); the parent's date is
//     added to the quote only when it was sent on a different day; long quotes are truncated

import {
  dayKey,
  formatChatTime,
  formatDayLabel,
  formatShortDate,
  stripInlineMarkdown,
} from '@/lib/message-time';

export const QUOTE_MAX_CHARS = 140;

export const PLANNING_SECTION_TITLES: Record<string, string> = {
  '1': 'KML Findings',
  '2': 'Regularity and Airspace',
  '3': 'Accessibility and Feasibility',
  '4': 'Obstacles and Hazards',
  '5': 'GCP Planning',
  '6': 'Flight Planning',
  '7': 'Expected Timelines',
  '8': 'Feasible to Proceed',
};

export const PROJECT_STAGE_TITLES: Record<string, string> = {
  '1': 'Request',
  '2': 'Planning',
  '3': 'Mobilising',
  '4': 'Capturing',
  '5': 'Processing',
  '6': 'Delivered',
};

export const MOBILISATION_STAGE_TITLES: Record<string, string> = {
  '1': 'Stakeholder & POC',
  '2': 'Flight Crew & Pilot Allocation',
  '3': 'Hardware & Equipment',
  '4': 'Travel, Commute & Logistics',
  '5': 'Accommodations',
  '6': 'Site Access & Clearances',
  '7': 'Schedule',
  '8': 'Remarks & Documents',
};

export interface TranscriptAttachment {
  name: string;
  size?: string;
}

export interface TranscriptQuote {
  senderName: string;
  roleLabel: string;
  message: string;
  attachments: TranscriptAttachment[];
  time: Date | null;
}

export interface TranscriptMessage {
  id: string;
  senderName: string;
  roleLabel: string;
  message: string;
  attachments: TranscriptAttachment[];
  time: Date | null;
  quote?: TranscriptQuote;
}

export interface TranscriptGroup {
  key: string;
  title: string;
  messages: TranscriptMessage[];
}

export interface TranscriptDay {
  key: string;
  label: string;
  messages: TranscriptMessage[];
}

/** Map any stored role value onto the short badge used in the app: admin, ops, client, subordinate, pilot. */
export function normalizeRoleLabel(raw?: string | null, fallback: 'ops' | 'client' = 'ops'): string {
  const r = (raw || '').toLowerCase();
  if (!r) return fallback;
  if (r.includes('sub')) return 'subordinate';
  if (r.includes('pilot') || r.includes('flight')) return 'pilot';
  if (r.includes('client')) return 'client';
  if (r === 'admin' || r.includes('admin')) return 'admin';
  if (r.includes('ops') || r.includes('operation') || r === 'latrics') return 'ops';
  return fallback;
}

/**
 * Split a chronologically sorted conversation into day buckets. Messages whose time could not be
 * resolved keep their position and are bucketed under "Date not recorded".
 */
export function splitByDay(messages: TranscriptMessage[]): TranscriptDay[] {
  const days: TranscriptDay[] = [];
  for (const msg of messages) {
    const key = msg.time ? dayKey(msg.time) : 'unknown';
    const current = days[days.length - 1];
    if (current && current.key === key) {
      current.messages.push(msg);
    } else {
      days.push({ key, label: msg.time ? formatDayLabel(msg.time) : 'Date not recorded', messages: [msg] });
    }
  }
  return days;
}

export function messageTimeLabel(msg: { time: Date | null }): string {
  return msg.time ? formatChatTime(msg.time) : 'time not recorded';
}

/** Parent date shown in the quote header only when the parent was sent on a different day. */
export function quoteDateLabel(msg: TranscriptMessage): string | null {
  if (!msg.quote?.time || !msg.time) return null;
  return dayKey(msg.quote.time) === dayKey(msg.time) ? null : formatShortDate(msg.quote.time);
}

export function truncateQuote(text: string, max = QUOTE_MAX_CHARS): string {
  const clean = stripInlineMarkdown(text).replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

// ── HTML export ──────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escape, then render `**bold**` as <strong> and keep line breaks. */
function richText(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function attachmentsHtml(atts: TranscriptAttachment[]): string {
  return atts.map((a) => `<div class="tx-att"><strong>Attachment:</strong> ${escapeHtml(a.name)}</div>`).join('');
}

export const TRANSCRIPT_CSS = `
  .tx-group { margin-bottom: 0.75rem; page-break-inside: avoid; }
  .tx-group-title { font-size: 0.8rem; font-weight: 800; display: flex; justify-content: space-between; align-items: center; background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 4px; padding: 0.35rem 0.6rem; margin-bottom: 0.35rem; }
  .tx-group-count { font-size: 0.675rem; color: #71717a; font-weight: 600; }
  .tx-empty { color: #a1a1aa; font-size: 0.75rem; padding: 0.35rem 0.5rem; }
  .tx-day-label { font-size: 0.675rem; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.03em; margin: 0.35rem 0 0.2rem; }
  .tx-list { display: flex; flex-direction: column; gap: 0.3rem; }
  .tx-item { border: 1px solid #e4e4e7; border-radius: 5px; padding: 0.4rem 0.6rem; background: #ffffff; page-break-inside: avoid; }
  .tx-header { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
  .tx-sender { font-size: 0.75rem; font-weight: 700; color: #09090b; }
  .tx-role { font-size: 0.625rem; font-weight: 600; text-transform: uppercase; background: #f4f4f5; color: #3f3f46; padding: 1px 4px; border-radius: 3px; margin-left: 4px; }
  .tx-time { font-size: 0.65rem; color: #71717a; font-family: monospace; }
  .tx-quote { border-left: 2px solid #71717a; background: #f4f4f5; border-radius: 3px; padding: 0.2rem 0.45rem; margin: 0.2rem 0; font-size: 0.68rem; color: #52525b; }
  .tx-text { font-size: 0.75rem; line-height: 1.35; color: #18181b; margin-top: 0.15rem; word-break: break-word; }
  .tx-att { font-size: 0.68rem; color: #09090b; margin-top: 0.15rem; }
`;

export function renderTranscriptGroupHtml(group: TranscriptGroup): string {
  const count = group.messages.length;
  if (count === 0) return '';

  const header = `<div class="tx-group-title"><span>${escapeHtml(group.title)}</span><span class="tx-group-count">${count} ${count === 1 ? 'msg' : 'msgs'}</span></div>`;
  const body = splitByDay(group.messages)
    .map((day) => {
      const dayLabel = `<div class="tx-day-label">${escapeHtml(day.label)}</div>`;
      const items = day.messages
        .map((m) => {
          const qDate = quoteDateLabel(m);
          const quote = m.quote
            ? `<div class="tx-quote"><strong>${escapeHtml(m.quote.senderName)} (${escapeHtml(m.quote.roleLabel)}${qDate ? ` · ${qDate}` : ''}):</strong> ${escapeHtml(truncateQuote(m.quote.message, 120))}${attachmentsHtml(m.quote.attachments)}</div>`
            : '';
          return `
            <div class="tx-item">
              <div class="tx-header">
                <div>
                  <span class="tx-sender">${escapeHtml(m.senderName)}</span>
                  <span class="tx-role">${escapeHtml(m.roleLabel)}</span>
                </div>
                <span class="tx-time">${messageTimeLabel(m)}</span>
              </div>
              ${quote}
              ${m.message ? `<div class="tx-text">${richText(m.message)}</div>` : ''}
              ${attachmentsHtml(m.attachments)}
            </div>
          `;
        })
        .join('');
      return `${dayLabel}<div class="tx-list">${items}</div>`;
    })
    .join('');

  return `<div class="tx-group">${header}${body}</div>`;
}

// ── CSV export ───────────────────────────────────────────────────────

export const TRANSCRIPT_CSV_HEADERS = [
  'Channel',
  'Section / Stage',
  'Date',
  'Time (IST)',
  'Sender',
  'Role',
  'Replying To (Sender)',
  'Quoted Text',
  'Message',
  'Attachments',
];

export function transcriptCsvRows(channel: string, group: TranscriptGroup): string[][] {
  return group.messages.map((m) => [
    channel,
    group.title,
    m.time ? dayKey(m.time) : 'not recorded',
    m.time ? formatChatTime(m.time) : 'not recorded',
    m.senderName,
    m.roleLabel,
    m.quote ? `${m.quote.senderName} (${m.quote.roleLabel})` : '',
    m.quote ? truncateQuote(m.quote.message) : '',
    stripInlineMarkdown(m.message),
    m.attachments.map((a) => a.name).join('; '),
  ]);
}
