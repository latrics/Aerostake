'use client';

import React from 'react';
import { MessageSquare, Calendar, Paperclip } from 'lucide-react';
import {
  TranscriptGroup,
  TranscriptAttachment,
  splitByDay,
  messageTimeLabel,
  quoteDateLabel,
  truncateQuote,
} from '../transcript';

/** Render `**bold**` segments without injecting HTML. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*.+?\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^\*\*.+\*\*$/.test(part) ? <strong key={i}>{part.slice(2, -2)}</strong> : <React.Fragment key={i}>{part}</React.Fragment>
      )}
    </>
  );
}

function Attachments({ items }: { items: TranscriptAttachment[] }) {
  if (items.length === 0) return null;
  return (
    <>
      {items.map((a, i) => (
        <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#3f3f46', marginTop: '0.2rem' }}>
          <Paperclip size={11} color="#71717a" />
          <span>{a.name}</span>
        </div>
      ))}
    </>
  );
}

export function ChatTranscript({ group }: { group: TranscriptGroup }) {
  const count = group.messages.length;
  if (count === 0) return null;

  return (
    <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', backgroundColor: '#ffffff', overflow: 'hidden' }}>
      <div
        style={{
          padding: '0.4rem 0.75rem',
          backgroundColor: '#fafafa',
          borderBottom: '1px solid #e4e4e7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <MessageSquare size={13} color="#09090b" />
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#09090b' }}>{group.title}</span>
        </div>
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 600,
            color: '#71717a',
            backgroundColor: '#f4f4f5',
            padding: '0.1rem 0.4rem',
            borderRadius: '999px',
            border: '1px solid #e4e4e7',
          }}
        >
          {count} {count === 1 ? 'msg' : 'msgs'}
        </span>
      </div>

      <div style={{ padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {splitByDay(group.messages).map((day) => (
          <div key={day.key + day.messages[0].id} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {/* Compact date header with monochrome icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.65rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.02em', padding: '0.15rem 0' }}>
              <Calendar size={11} color="#71717a" />
              <span>{day.label}</span>
            </div>

            {day.messages.map((m) => {
              const qDate = quoteDateLabel(m);
              return (
                <div
                  key={m.id}
                  style={{
                    border: '1px solid #e4e4e7',
                    borderRadius: '6px',
                    padding: '0.4rem 0.65rem',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.2rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#09090b' }}>
                        {m.senderName}
                      </span>
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          padding: '0.05rem 0.35rem',
                          borderRadius: '4px',
                          backgroundColor: m.roleLabel === 'client' ? '#f4f4f5' : '#e4e4e7',
                          color: '#18181b',
                        }}
                      >
                        {m.roleLabel}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#71717a', fontFamily: 'monospace' }}>
                      {messageTimeLabel(m)}
                    </span>
                  </div>

                  {m.quote && (
                    <div
                      style={{
                        borderLeft: '2px solid #71717a',
                        backgroundColor: '#f4f4f5',
                        borderRadius: '3px',
                        padding: '0.2rem 0.45rem',
                        fontSize: '0.68rem',
                        color: '#52525b',
                        margin: '0.1rem 0',
                      }}
                    >
                      <strong style={{ color: '#18181b' }}>{m.quote.senderName} ({m.quote.roleLabel}{qDate ? ` · ${qDate}` : ''}):</strong>{' '}
                      <span>{truncateQuote(m.quote.message, 120)}</span>
                      <Attachments items={m.quote.attachments} />
                    </div>
                  )}

                  {m.message && (
                    <div style={{ fontSize: '0.75rem', color: '#18181b', lineHeight: 1.35, whiteSpace: 'pre-wrap', marginTop: '0.1rem' }}>
                      <RichText text={m.message} />
                    </div>
                  )}
                  <Attachments items={m.attachments} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
