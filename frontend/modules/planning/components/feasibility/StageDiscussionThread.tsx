'use client';

import React from 'react';
import {
  MessageSquare,
  Lock,
  RefreshCw,
  CornerDownRight,
  FileText,
  Download,
  Paperclip,
  X,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
} from 'lucide-react';
import { ThreadMessage } from './types';
import { formatMessageStamp } from '@/lib/message-time';

interface StageDiscussionThreadProps {
  stageNum: number;
  stageName: string;
  threads: ThreadMessage[];
  draftText: string;
  attachedFile: string | null;
  isAddingRemark: boolean;
  onSetDraftText: (text: string) => void;
  onSetAttachedFile: (file: string | null) => void;
  onSetAddingRemark: (adding: boolean) => void;
  onPostReview: (stageNum: number) => void;
  onReplyToMessage: (stageNum: number, parentMessageId: string) => void;
  onRefreshThreads: () => void;
  isRefreshing: boolean;
  isClosed: boolean;
  isPilot: boolean;
  role: string;
  isSubordinate: boolean;
  threadReplyInputs: Record<string, string>;
  onSetThreadReplyInput: (id: string, text: string) => void;
  threadReplyAttachments: Record<string, string | null>;
  onSetThreadReplyAttachment: (id: string, file: string | null) => void;
  activeReplyBoxId: string | null;
  setActiveReplyBoxId: (id: string | null) => void;
  onShowToast: (msg: string) => void;
}

export function StageDiscussionThread({
  stageNum,
  stageName,
  threads,
  draftText,
  attachedFile,
  isAddingRemark,
  onSetDraftText,
  onSetAttachedFile,
  onSetAddingRemark,
  onPostReview,
  onReplyToMessage,
  onRefreshThreads,
  isRefreshing,
  isClosed,
  isPilot,
  role,
  isSubordinate,
  threadReplyInputs,
  onSetThreadReplyInput,
  threadReplyAttachments,
  onSetThreadReplyAttachment,
  activeReplyBoxId,
  setActiveReplyBoxId,
  onShowToast,
}: StageDiscussionThreadProps) {
  const isComposing = !!isAddingRemark || !!draftText.trim() || !!attachedFile;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        borderTop: '1px solid #e4e4e7',
        paddingTop: '1.25rem',
      }}
    >
      {/* ── Section Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'nowrap',
          gap: '0.75rem',
          paddingBottom: '0.85rem',
          borderBottom: '1px solid #f4f4f5',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#f4f4f5',
              border: '1px solid #d4d4d8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#09090b',
              flexShrink: 0,
            }}
          >
            <MessageSquare size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b', lineHeight: 1.2 }}>
              Discussion Thread
            </div>
            <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '2px' }}>
              All remarks and discussion for this section. Remarks will reflect across the application once the 8-stage planning form is completed and submitted.
            </div>
          </div>
        </div>

        {/* Top Right Action Button: toggles between '+ Add Remark' and solid 'Post' */}
        {isPilot ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.725rem',
              color: '#71717a',
              backgroundColor: '#f4f4f5',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              border: '1px solid #e4e4e7',
              fontWeight: 600,
            }}
          >
            <Lock size={12} /> Read-Only for Pilots
          </span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
            <button
              type="button"
              onClick={onRefreshThreads}
              disabled={isRefreshing}
              title="Synchronize latest discussion and remarks from backend"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                height: '34px',
                padding: '0 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: '#ffffff',
                color: '#09090b',
                border: '1px solid #d4d4d8',
                borderRadius: '6px',
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              <span>Sync</span>
            </button>
            {!isClosed && (
              isComposing ? (
                <button
                  type="button"
                  onClick={() => onPostReview(stageNum)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '34px',
                    padding: '0 1.25rem',
                    fontSize: '0.775rem',
                    fontWeight: 700,
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    border: '1px solid #09090b',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Post
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSetAddingRemark(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    height: '34px',
                    padding: '0 0.95rem',
                    fontSize: '0.775rem',
                    fontWeight: 600,
                    backgroundColor: '#ffffff',
                    color: '#09090b',
                    border: '1px solid #d4d4d8',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  + Add Remark
                </button>
              )
            )}
          </div>
        )}

        {isClosed && (
          <div style={{ flexShrink: 0 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                height: '32px',
                padding: '0 0.75rem',
                fontSize: '0.725rem',
                fontWeight: 700,
                backgroundColor: '#f4f4f5',
                color: '#52525b',
                border: '1px solid #d4d4d8',
                borderRadius: '6px',
              }}
            >
              <Lock size={12} /> Stage Closed (Locked)
            </span>
          </div>
        )}
      </div>

      {/* Closed warning if stage is closed */}
      {isClosed && (
        <div
          style={{
            padding: '0.85rem 1.15rem',
            backgroundColor: '#f4f4f5',
            border: '1px solid #e4e4e7',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#71717a',
          }}
        >
          <Lock size={16} color="#09090b" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.775rem', lineHeight: 1.45 }}>
            <strong style={{ color: '#09090b', display: 'block', marginBottom: '0.1rem' }}>
              Stage Concluded — Discussion Closed
            </strong>
            This stage has concluded. Remarks and discussion threads are permanently sealed as immutable audit records and cannot be added or modified from either side.
          </div>
        </div>
      )}

      {/* ── Vertical Timeline List with Connecting Line & Avatars ── */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {threads.length === 0 && !isComposing ? (
          <div
            style={{
              padding: '1.25rem 1.25rem',
              textAlign: 'center',
              backgroundColor: '#fafafa',
              border: '1px dashed #e4e4e7',
              borderRadius: '8px',
              color: '#71717a',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span>No remarks or clarifications recorded yet for {stageName}.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {threads.map((msg, idx) => {
              const isLatrics = msg.role === 'LATRICS' || msg.author.toLowerCase().includes('admin');
              const msgRoleTag = msg.authorRole || (isLatrics ? 'admin' : (msg.author.toLowerCase().includes('subordinate') ? 'subordinate' : 'client'));
              const isSubTag = msgRoleTag === 'subordinate';
              const isLast = idx === threads.length - 1;
              const showBottomLine = !isLast || isComposing;
              const isReplying = activeReplyBoxId === msg.id;

              return (
                <div key={msg.id} style={{ display: 'flex', position: 'relative', gap: '1rem', paddingBottom: '1.25rem' }}>
                  {/* Left Column: Avatar and Vertical Connector Line */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '28px', flexShrink: 0, position: 'relative' }}>
                    {/* Avatar Circle */}
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: isLatrics ? '#09090b' : (isSubTag ? '#09090b' : '#3f3f46'),
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        flexShrink: 0,
                        zIndex: 2,
                      }}
                    >
                      {isLatrics ? 'A' : (isSubTag ? 'S' : 'C')}
                    </div>

                    {/* Continuous Connector Line */}
                    {showBottomLine && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '28px',
                          bottom: '-1.25rem',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '2px',
                          backgroundColor: '#e4e4e7',
                          zIndex: 1,
                        }}
                      />
                    )}
                  </div>

                  {/* Right Column: Message Card */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0 }}>
                    {/* Author Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#09090b' }}>
                          {msg.author}
                        </span>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            padding: '0.1rem 0.45rem',
                            borderRadius: '4px',
                            backgroundColor: isSubTag ? '#f4f4f5' : '#f4f4f5',
                            color: isSubTag ? '#27272a' : (isLatrics ? '#3f3f46' : '#09090b'),
                            textTransform: 'lowercase',
                            border: `1px solid ${isSubTag ? '#d4d4d8' : (isLatrics ? '#e4e4e7' : '#d4d4d8')}`,
                          }}
                        >
                          {msgRoleTag}
                        </span>
                        <span style={{ fontSize: '0.725rem', color: '#52525b' }}>
                          • {formatMessageStamp(msg)}
                        </span>
                        {msg.isPendingSubmit && (
                          <span
                            style={{
                              fontSize: '0.625rem',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#f4f4f5',
                              color: '#52525b',
                              border: '1px dashed #d4d4d8',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                            title="Posted in your current working session. Will reflect to all users once the 8-stage planning form is completed and submitted."
                          >
                            Posted (Pending Form Submit)
                          </span>
                        )}
                      </div>

                      {/* Visible Reply Button */}
                      {!isClosed && !isPilot && (
                        <button
                          type="button"
                          onClick={() => setActiveReplyBoxId(activeReplyBoxId === msg.id ? null : msg.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            backgroundColor: activeReplyBoxId === msg.id ? '#09090b' : '#ffffff',
                            color: activeReplyBoxId === msg.id ? '#ffffff' : '#09090b',
                            border: '1px solid #d4d4d8',
                            borderRadius: '4px',
                            padding: '0.2rem 0.6rem',
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          title="Reply to this remark"
                        >
                          <CornerDownRight size={11} />
                          <span>{activeReplyBoxId === msg.id ? 'Replying...' : 'Reply'}</span>
                        </button>
                      )}
                    </div>

                    {/* Quoted Reply Reference */}
                    {msg.replyTo && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '4px',
                          backgroundColor: '#f4f4f5',
                          borderLeft: '3px solid #09090b',
                          fontSize: '0.72rem',
                          color: '#52525b',
                          marginBottom: '0.2rem',
                        }}
                      >
                        <CornerDownRight size={11} color="#09090b" />
                        <span>
                          Replying to <strong>{msg.replyTo.author}</strong>: &ldquo;{msg.replyTo.content}&rdquo;
                        </span>
                      </div>
                    )}

                    {/* Message Content */}
                    <p style={{ fontSize: '0.825rem', color: '#27272a', lineHeight: 1.5, margin: 0, wordBreak: 'break-word' }}>
                      {msg.content}
                    </p>

                    {/* Downloadable Attachment Card */}
                    {msg.attachment && (
                      <div
                        onClick={() => {
                          const blob = new Blob([`Aerostake Survey Attachment: ${msg.attachment?.name}\nAuthor: ${msg.author}\nTimestamp: ${formatMessageStamp(msg)}`], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = msg.attachment?.name || 'attachment.txt';
                          a.click();
                          URL.revokeObjectURL(url);
                          onShowToast(`Downloaded ${msg.attachment?.name}`);
                        }}
                        title="Click to download attachment"
                        style={{
                          marginTop: '0.4rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1.25rem',
                          padding: '0.5rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #e4e4e7',
                          backgroundColor: '#fafafa',
                          cursor: 'pointer',
                          width: 'fit-content',
                          maxWidth: '100%',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#d4d4d8';
                          e.currentTarget.style.backgroundColor = '#f4f4f5';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e4e4e7';
                          e.currentTarget.style.backgroundColor = '#fafafa';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                          <FileText size={16} color="#09090b" style={{ flexShrink: 0 }} />
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ fontSize: '0.775rem', fontWeight: 600, color: '#09090b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {msg.attachment.name}
                            </span>
                            <span style={{ fontSize: '0.675rem', color: '#52525b' }}>
                              {msg.attachment.size}
                            </span>
                          </div>
                        </div>
                        <Download size={14} color="#52525b" style={{ flexShrink: 0 }} />
                      </div>
                    )}

                    {/* Inline Reply Composer if toggled */}
                    {isReplying && !isClosed && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.45rem',
                          marginTop: '0.5rem',
                          backgroundColor: '#fafafa',
                          border: '1px solid #d4d4d8',
                          borderRadius: '6px',
                          padding: '0.75rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#09090b', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <CornerDownRight size={12} />
                            <span>Replying to {msg.author}</span>
                          </span>
                          <span style={{ fontSize: '0.675rem', color: '#71717a' }}>{msg.role === 'LATRICS' ? 'Operations Remark' : 'Client Remark'}</span>
                        </div>
                        <textarea
                          rows={2}
                          value={threadReplyInputs[msg.id] || ''}
                          onChange={(e) => onSetThreadReplyInput(msg.id, e.target.value)}
                          placeholder={
                            role === 'client'
                              ? (isSubordinate
                                  ? 'Provide subordinate clarification or coordination response...'
                                  : 'Provide clarification response regarding this remark...')
                              : 'Provide follow-up question or clarification note...'
                          }
                          style={{
                            width: '100%',
                            padding: '0.55rem',
                            fontSize: '0.775rem',
                            border: '1px solid #d4d4d8',
                            borderRadius: '4px',
                            backgroundColor: '#ffffff',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                            outline: 'none',
                          }}
                        />

                        {threadReplyAttachments[msg.id] && (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.2rem 0.5rem',
                              backgroundColor: '#ffffff',
                              border: '1px solid #09090b',
                              borderRadius: '4px',
                              fontSize: '0.725rem',
                              fontWeight: 600,
                              width: 'fit-content',
                            }}
                          >
                            <Paperclip size={12} />
                            <span>{threadReplyAttachments[msg.id]}</span>
                            <button
                              type="button"
                              onClick={() => onSetThreadReplyAttachment(msg.id, null)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <label
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: '#ffffff',
                              border: '1px solid #d4d4d8',
                              borderRadius: '4px',
                              padding: '0.25rem 0.55rem',
                              fontSize: '0.725rem',
                              fontWeight: 600,
                              color: '#09090b',
                              cursor: 'pointer',
                            }}
                          >
                            <span>Attach Document</span>
                            <input
                              type="file"
                              accept=".pdf,.kml,.kmz,.zip,.jpg,.jpeg,.png,.doc,.docx"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  onSetThreadReplyAttachment(msg.id, file.name);
                                }
                              }}
                            />
                          </label>

                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              onClick={() => setActiveReplyBoxId(null)}
                              style={{
                                height: '28px',
                                padding: '0 0.75rem',
                                fontSize: '0.725rem',
                                fontWeight: 600,
                                backgroundColor: '#ffffff',
                                border: '1px solid #d4d4d8',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>

                            <button
                              type="button"
                              onClick={() => onReplyToMessage(stageNum, msg.id)}
                              style={{
                                height: '28px',
                                padding: '0 0.85rem',
                                fontSize: '0.725rem',
                                fontWeight: 700,
                                backgroundColor: '#09090b',
                                color: '#ffffff',
                                border: '1px solid #09090b',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              Post Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Rich Composer ── */}
        {isComposing && !isClosed && (
          <div style={{ display: 'flex', gap: '1rem', marginTop: threads.length > 0 ? '0.25rem' : '0' }}>
            {/* Left Column: Avatar for current user */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '28px', flexShrink: 0 }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: role === 'client' ? (isSubordinate ? '#09090b' : '#3f3f46') : '#09090b',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {role === 'client' ? (isSubordinate ? 'S' : 'C') : 'A'}
              </div>
            </div>

            {/* Right Column: Composer Card */}
            <div
              style={{
                flex: 1,
                borderRadius: '8px',
                border: '1px solid #d4d4d8',
                backgroundColor: '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Toolbar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.4rem 0.65rem',
                  backgroundColor: '#fafafa',
                  borderBottom: '1px solid #e4e4e7',
                }}
              >
                {/* Formatting Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() =>
                      onSetDraftText(draftText ? `**${draftText}**` : '**bold text**')
                    }
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '3px 5px',
                      color: '#27272a',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      borderRadius: '3px',
                    }}
                    title="Bold"
                  >
                    <Bold size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onSetDraftText(draftText ? `*${draftText}*` : '*italic text*')
                    }
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '3px 5px',
                      color: '#27272a',
                      borderRadius: '3px',
                    }}
                    title="Italic"
                  >
                    <Italic size={13} />
                  </button>
                  <span style={{ color: '#d4d4d8', margin: '0 2px' }}>|</span>
                  <button
                    type="button"
                    onClick={() =>
                      onSetDraftText((draftText ? `${draftText}\n` : '') + '• ')
                    }
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '3px 5px',
                      color: '#27272a',
                      borderRadius: '3px',
                    }}
                    title="Bullet list"
                  >
                    <List size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onSetDraftText((draftText ? `${draftText}\n` : '') + '1. ')
                    }
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '3px 5px',
                      color: '#27272a',
                      borderRadius: '3px',
                    }}
                    title="Numbered list"
                  >
                    <ListOrdered size={13} />
                  </button>
                  <span style={{ color: '#d4d4d8', margin: '0 2px' }}>|</span>
                  <button
                    type="button"
                    onClick={() =>
                      onSetDraftText((draftText ? `${draftText} ` : '') + '[link](url)')
                    }
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '3px 5px',
                      color: '#27272a',
                      borderRadius: '3px',
                    }}
                    title="Insert link"
                  >
                    <LinkIcon size={13} />
                  </button>
                </div>

                {/* Attach File Option */}
                <div>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      cursor: 'pointer',
                      fontSize: '0.725rem',
                      fontWeight: 600,
                      color: '#09090b',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '4px',
                      border: '1px solid #d4d4d8',
                      backgroundColor: '#ffffff',
                      transition: 'all 0.15s ease',
                    }}
                    title="Attach file (PDF, KML, ZIP, Images)"
                  >
                    <Paperclip size={12} color="#09090b" />
                    <span>Attach File</span>
                    <input
                      type="file"
                      accept=".pdf,.kml,.kmz,.zip,.jpg,.jpeg,.png,.doc,.docx"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          onSetAttachedFile(file.name);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Textarea */}
              <textarea
                rows={3}
                value={draftText}
                onChange={(e) => onSetDraftText(e.target.value)}
                placeholder={
                  role === 'client'
                    ? (isSubordinate
                        ? 'Add subordinate remarks, site coordination notes, or flight questions...'
                        : 'Add client remarks, questions, or clarification notes for this section...')
                    : 'Record section remarks or survey feasibility review notes...'
                }
                style={{
                  width: '100%',
                  minHeight: '85px',
                  padding: '0.75rem',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.8rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  backgroundColor: '#ffffff',
                  color: '#09090b',
                  lineHeight: 1.45,
                }}
              />

              {/* Attached file chip */}
              {attachedFile && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.35rem 0.75rem',
                    backgroundColor: '#f4f4f5',
                    borderTop: '1px solid #e4e4e7',
                    fontSize: '0.725rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#09090b', fontWeight: 600 }}>
                    <Paperclip size={12} color="#52525b" />
                    <span>Attached: <strong>{attachedFile}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSetAttachedFile(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#71717a',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                    }}
                  >
                    <X size={12} />
                    <span>Remove</span>
                  </button>
                </div>
              )}

              {/* Bottom Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.4rem 0.75rem',
                  backgroundColor: '#ffffff',
                  borderTop: '1px solid #f4f4f5',
                }}
              >
                <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
                  {draftText.length}/1000
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      onSetAddingRemark(false);
                      onSetDraftText('');
                      onSetAttachedFile(null);
                    }}
                    style={{
                      height: '28px',
                      padding: '0 0.75rem',
                      fontSize: '0.725rem',
                      fontWeight: 600,
                      backgroundColor: '#ffffff',
                      border: '1px solid #d4d4d8',
                      color: '#3f3f46',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => onPostReview(stageNum)}
                    style={{
                      height: '28px',
                      padding: '0 0.95rem',
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      backgroundColor: '#09090b',
                      color: '#ffffff',
                      border: '1px solid #09090b',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Post Remark
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
