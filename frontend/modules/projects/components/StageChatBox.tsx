'use client';

import React, { useState, useRef } from 'react';
import { formatMessageStamp } from '@/lib/message-time';
import {
  MessageSquare,
  Lock,
  Send,
  Paperclip,
  X,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export interface StageChatMessage {
  id: string;
  sender_name: string;
  sender_role: string;
  sender_tag: string; // '[Client]' | '[LATRICS Ops]'
  message: string;
  timestamp: string;
  attachments?: { name: string; size?: string; url?: string }[];
}

interface StageChatBoxProps {
  projectId: string;
  stageId: number;
  stageName: string;
  stageStatus: 'completed' | 'active' | 'pending';
  messages: StageChatMessage[];
  onSendMessage: (text: string, attachments?: { name: string; size?: string }[]) => Promise<void>;
  currentUserName: string;
  currentUserRole: string;
}

export const StageChatBox: React.FC<StageChatBoxProps> = ({
  stageId,
  stageName,
  stageStatus,
  messages = [],
  onSendMessage,
  currentUserRole = '',
}) => {
  const [inputText, setInputText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isClosed = stageStatus === 'completed';
  const isPending = stageStatus === 'pending';
  const isActive = stageStatus === 'active';

  const isPilot = currentUserRole?.toLowerCase() === 'pilot';
  const isCapturing = stageId === 4 || stageName?.toLowerCase() === 'capturing';
  const canUserWrite = !isPilot || isCapturing;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const incoming = Array.from(e.target.files);
    setPendingAttachments((prev) => [...prev, ...incoming]);
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isClosed || isPending || !canUserWrite) return;
    const trimmed = inputText.trim();
    if (!trimmed && pendingAttachments.length === 0) return;

    setIsSubmitting(true);
    try {
      const atts = pendingAttachments.map((f) => ({
        name: f.name,
        size: `${(f.size / 1024).toFixed(1)} KB`,
      }));
      await onSendMessage(trimmed, atts);
      setInputText('');
      setPendingAttachments([]);
    } catch (err) {
      console.error('Failed to post stage message:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="wf-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '480px',
        maxHeight: '620px',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1rem',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: '#fafafa',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={16} color="#09090b" />
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#09090b', margin: 0 }}>
            {stageName} Chat & Communication
          </h3>
        </div>

        {/* Stage Status Badge */}
        {isClosed ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.675rem',
              fontWeight: 700,
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              backgroundColor: '#f4f4f5',
              border: '1px solid #d4d4d8',
              color: '#52525b',
            }}
            title="This stage is closed. Messages are sealed and non-editable for both Latrics and Client."
          >
            <Lock size={11} /> Closed (Sealed)
          </span>
        ) : isActive ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.675rem',
              fontWeight: 700,
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              backgroundColor: '#09090b',
              border: '1px solid #09090b',
              color: '#ffffff',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
              }}
            />
            Active Discussion
          </span>
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.675rem',
              fontWeight: 600,
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              backgroundColor: '#f4f4f5',
              color: '#71717a',
              border: '1px solid #e4e4e7',
            }}
          >
            <Clock size={11} /> Upcoming
          </span>
        )}
      </div>

      {/* ── Subtitle Info Banner ── */}
      <div
        style={{
          padding: '0.45rem 1rem',
          fontSize: '0.7rem',
          backgroundColor: isClosed ? '#f4f4f5' : '#fafafa',
          borderBottom: '1px solid var(--border-color)',
          color: isClosed ? '#18181b' : 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}
      >
        {isClosed ? (
          <>
            <Lock size={12} color="#09090b" />
            <span>
              Stage closed. Chat history is preserved as an immutable audit record for both parties.
            </span>
          </>
        ) : isPending ? (
          <>
            <AlertCircle size={12} color="#71717a" />
            <span>This stage has not started yet. Chat unlocks when project enters this stage.</span>
          </>
        ) : (
          <>
            <CheckCircle2 size={12} color="#09090b" />
            <span>Official communications for Stage {stageId} between Client and LATRICS Operations.</span>
          </>
        )}
      </div>

      {/* ── Message Stream (Scrollable) ── */}
      <div
        style={{
          flex: 1,
          padding: '1rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          backgroundColor: '#ffffff',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              color: 'var(--text-muted)',
              padding: '2rem 1rem',
              gap: '0.5rem',
            }}
          >
            <MessageSquare size={28} strokeWidth={1.2} color="#a1a1aa" />
            <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>
              {isClosed
                ? `No recorded chat messages during the ${stageName} stage.`
                : isPending
                ? `Stage ${stageId} is upcoming. Chat opens upon stage mobilization.`
                : `No messages yet for ${stageName}. Post an update below.`}
            </span>
          </div>
        ) : (
          messages.map((msg) => {
            const isPilotTag =
              msg.sender_tag === '[Pilot]' ||
              msg.sender_role?.toLowerCase() === 'pilot';
            const isClientTag =
              !isPilotTag && (
                msg.sender_tag === '[Client]' ||
                msg.sender_role?.toLowerCase().includes('client')
              );

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  backgroundColor: isPilotTag ? '#f4f4f5' : isClientTag ? '#fafafa' : '#f4f4f5',
                  border: '1px solid #d4d4d8',
                }}
              >
                {/* Meta row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.7rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{ fontWeight: 700, color: '#09090b' }}>{msg.sender_name}</span>
                    <span
                      style={{
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.35rem',
                        borderRadius: '3px',
                        backgroundColor: isPilotTag ? '#09090b' : isClientTag ? '#f4f4f5' : '#18181b',
                        color: isPilotTag ? '#ffffff' : isClientTag ? '#18181b' : '#ffffff',
                        border: '1px solid #18181b',
                      }}
                    >
                      {msg.sender_tag || (isPilotTag ? '[Pilot]' : isClientTag ? '[Client]' : '[LATRICS Ops]')}
                    </span>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                    {formatMessageStamp(msg)}
                  </span>
                </div>

                {/* Message Body */}
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: '#18181b',
                    lineHeight: 1.45,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.message}
                </div>

                {/* Attachment Chips if any */}
                {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
                    {msg.attachments.map((att, attIdx) => (
                      <div
                        key={attIdx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.2rem 0.45rem',
                          borderRadius: '4px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #d4d4d8',
                          fontSize: '0.675rem',
                          color: '#09090b',
                          fontWeight: 500,
                        }}
                      >
                        <FileText size={11} color="#52525b" />
                        <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {att.name}
                        </span>
                        {att.size && (
                          <span style={{ color: '#71717a', fontSize: '0.6rem' }}>({att.size})</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Footer / Composer ── */}
      <div
        style={{
          borderTop: '1px solid var(--border-color)',
          padding: '0.75rem',
          backgroundColor: isClosed ? '#fafafa' : '#ffffff',
        }}
      >
        {isClosed ? (
          /* Non-editable sealed banner */
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '6px',
              backgroundColor: '#f4f4f5',
              border: '1px dashed #d4d4d8',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.75rem',
              color: '#52525b',
              fontWeight: 500,
            }}
          >
            <Lock size={15} color="#71717a" style={{ flexShrink: 0 }} />
            <span>
              <strong>Chat Box Closed:</strong> This stage has concluded. Communications are sealed and non-editable for both Latrics and Client.
            </span>
          </div>
        ) : isPending ? (
          /* Pending stage banner */
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '6px',
              backgroundColor: '#f4f4f5',
              border: '1px dashed #d4d4d8',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.75rem',
              color: '#71717a',
            }}
          >
            <Clock size={15} style={{ flexShrink: 0 }} />
            <span>Chat is currently locked. It will open automatically when Stage {stageId} starts.</span>
          </div>
        ) : isPilot && !isCapturing ? (
          /* Pilot restricted in non-capturing stage banner */
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '6px',
              backgroundColor: '#f4f4f5',
              border: '1px dashed #d4d4d8',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.75rem',
              color: '#52525b',
              fontWeight: 500,
            }}
          >
            <Lock size={15} color="#71717a" style={{ flexShrink: 0 }} />
            <span>
              <strong>Pilot Chat Restricted:</strong> Drone pilots only have chat write access during Stage 4 (Capturing). Stage {stageId} ({stageName}) communications are read-only.
            </span>
          </div>
        ) : (
          /* Active Composer */
          <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Attachment preview row */}
            {pendingAttachments.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {pendingAttachments.map((file, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      backgroundColor: '#f4f4f5',
                      border: '1px solid #e4e4e7',
                      fontSize: '0.675rem',
                      color: '#09090b',
                    }}
                  >
                    <Paperclip size={10} />
                    <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                    >
                      <X size={10} color="#71717a" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                multiple
                onChange={handleFileChange}
              />

              <div
                style={{
                  position: 'relative',
                  flex: 1,
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Type a message for Stage ${stageId} (${stageName})...`}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.5rem 2rem 0.5rem 0.65rem',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.785rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'none',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file"
                  style={{
                    position: 'absolute',
                    right: '0.4rem',
                    top: '0.5rem',
                    background: 'none',
                    border: 'none',
                    color: '#71717a',
                    cursor: 'pointer',
                    padding: '0.2rem',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Paperclip size={14} />
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || (!inputText.trim() && pendingAttachments.length === 0)}
                className="btn btn-primary"
                style={{
                  height: '38px',
                  padding: '0 0.85rem',
                  fontSize: '0.785rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  flexShrink: 0,
                }}
              >
                {isSubmitting ? (
                  <Loader2 size={13} className="spinner" />
                ) : (
                  <>
                    <Send size={13} />
                    <span>Post</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
