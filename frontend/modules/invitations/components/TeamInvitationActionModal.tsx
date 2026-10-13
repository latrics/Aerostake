'use client';

import React, { useState } from 'react';
import {
  X,
  Check,
  Copy,
  Mail,
  RefreshCw,
  Loader2,
  Lock,
} from 'lucide-react';
import { Portal } from '@/components/Portal';
import { InvitationOut } from '../types';
import { TeamMemberContact } from '@/modules/users/types';
import {
  getInviteUrl,
  generateEmailHtml,
  generateEmailPlainText,
  launchEmailPlatform,
} from '../utils/emailTemplates';

interface TeamInvitationActionModalProps {
  selectedMember: {
    member: TeamMemberContact;
    invite: InvitationOut | null;
    index: number;
  } | null;
  onClose: () => void;
  inviterName: string;
  companyName: string;
  isSubClient: boolean;
  isGeneratingInvite: boolean;
  onRegenerateInvite: (email: string) => Promise<void>;
}

export function TeamInvitationActionModal({
  selectedMember,
  onClose,
  inviterName,
  companyName,
  isSubClient,
  isGeneratingInvite,
  onRegenerateInvite,
}: TeamInvitationActionModalProps) {
  const [copiedActionId, setCopiedActionId] = useState<string | null>(null);

  if (!selectedMember) return null;

  const { member, invite } = selectedMember;
  const inviteUrl = getInviteUrl(invite);

  const handleCopyLink = async () => {
    if (!invite?.token) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedActionId('modal-link');
      setTimeout(() => setCopiedActionId(null), 2500);
    } catch (e) {
      console.error('Failed to copy link', e);
    }
  };

  const handleCopyEmail = async () => {
    const html = generateEmailHtml(member, invite, inviterName, companyName);
    const plain = generateEmailPlainText(member, invite, inviterName, companyName);
    try {
      if (typeof window !== 'undefined' && navigator.clipboard && window.ClipboardItem) {
        const htmlBlob = new Blob([html], { type: 'text/html' });
        const textBlob = new Blob([plain], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob }),
        ]);
      } else {
        await navigator.clipboard.writeText(plain);
      }
      setCopiedActionId('modal-email');
      setTimeout(() => setCopiedActionId(null), 2500);
    } catch {
      await navigator.clipboard.writeText(plain);
      setCopiedActionId('modal-email');
      setTimeout(() => setCopiedActionId(null), 2500);
    }
  };

  return (
    <Portal>
      <div
        className="viewport-modal-backdrop"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '2px solid #09090b',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '740px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 30px -5px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div
            style={{
              padding: '1.15rem 1.5rem',
              borderBottom: '1px solid #e4e4e7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#fafafa',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#09090b' }}>
                Team Member Invitation
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#71717a', margin: '3px 0 0 0' }}>
                Access &amp; credentials for <strong>{member.full_name || 'Team Member'}</strong> ({member.email})
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#71717a',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Body - Scrollable */}
          <div
            style={{
              padding: '1.25rem 1.5rem',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            {/* Current Status Indicator & Rule */}
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#fafafa',
                border: '1px solid #e4e4e7',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#09090b' }}>Current Status:</span>
                {invite?.status === 'accepted' ? (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ffffff', backgroundColor: '#09090b', padding: '2px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={12} /> Registered &amp; Active
                  </span>
                ) : invite?.status === 'pending' ? (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#09090b', backgroundColor: '#f4f4f5', border: '1px solid #d4d4d8', padding: '2px 8px', borderRadius: '4px' }}>
                    ● Active Link (Valid for 24 Hours)
                  </span>
                ) : invite?.status === 'expired' ? (
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#71717a', backgroundColor: '#ffffff', border: '1px dashed #71717a', padding: '2px 8px', borderRadius: '4px' }}>
                    ● Expired (Generate New Link)
                  </span>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: '#71717a', fontStyle: 'italic' }}>
                    Not Generated Yet
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#71717a' }}>
                Active for 24h &amp; until user completes registration
              </span>
            </div>

            {/* ── Option A: Just Copy the Link ── */}
            <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                  a. Just Copy the Link
                </h4>
                {copiedActionId === 'modal-link' && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#09090b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={13} /> Link copied to clipboard!
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  readOnly
                  value={invite?.token ? inviteUrl : 'Invitation link not generated yet'}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.775rem',
                    fontFamily: 'monospace',
                    backgroundColor: '#f4f4f5',
                    border: '1px solid #d4d4d8',
                    borderRadius: '4px',
                    color: invite?.token ? '#09090b' : '#71717a',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  disabled={!invite?.token}
                  onClick={handleCopyLink}
                  style={{
                    height: '34px',
                    padding: '0 0.9rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    backgroundColor: copiedActionId === 'modal-link' ? '#09090b' : '#ffffff',
                    color: copiedActionId === 'modal-link' ? '#ffffff' : '#09090b',
                    border: '1px solid #09090b',
                    borderRadius: '4px',
                    cursor: invite?.token ? 'pointer' : 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {copiedActionId === 'modal-link' ? (
                    <>
                      <Check size={13} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={13} /> Copy Link
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* ── Option B: Send Email ── */}
            <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    b. Send Email
                  </h4>
                  <p style={{ fontSize: '0.72rem', color: '#71717a', margin: '2px 0 0 0' }}>
                    Preview email with coloured button below. Copy formatted layout or navigate to your email platform:
                  </p>
                </div>
                {copiedActionId === 'modal-email' && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#09090b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={13} /> Formatted email copied!
                  </span>
                )}
              </div>

              {/* Scrollable Email Preview Box with Outlook-compatible button */}
              <div
                style={{
                  maxHeight: '270px',
                  overflowY: 'auto',
                  border: '1px solid #e4e4e7',
                  borderRadius: '6px',
                  padding: '1rem',
                  backgroundColor: '#fafafa',
                  marginBottom: '0.85rem',
                }}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: generateEmailHtml(member, invite, inviterName, companyName),
                  }}
                />
              </div>

              {/* Email Actions: Copy Layout OR Navigate to Platform */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    style={{
                      height: '34px',
                      padding: '0 1rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      backgroundColor: '#09090b',
                      color: '#ffffff',
                      border: '1px solid #09090b',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Copy size={13} /> Copy Formatted Email
                  </button>

                  <span style={{ fontSize: '0.72rem', color: '#71717a' }}>
                    Paste directly into Gmail, Outlook, or Yahoo Mail composer
                  </span>
                </div>

                {/* Direct Platform Navigation Buttons */}
                <div style={{ borderTop: '1px dashed #e4e4e7', paddingTop: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#52525b' }}>
                      Or Launch Email Platform Directly:
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
                      {member.email}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Gmail */}
                    <button
                      type="button"
                      onClick={() => launchEmailPlatform('gmail', member, invite, inviterName, companyName)}
                      title={`Launch Gmail (To: ${member.email})`}
                      style={{
                        width: '34px',
                        height: '34px',
                        padding: 0,
                        backgroundColor: '#ffffff',
                        border: '1px solid #d4d4d8',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f4f4f5';
                        e.currentTarget.style.borderColor = '#a1a1aa';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#d4d4d8';
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="#09090b" d="M22 6.5V17a3 3 0 0 1-3 3h-2V9.5l-5 3.5-5-3.5V20H5a3 3 0 0 1-3-3V6.5a2.5 2.5 0 0 1 4-2L12 9l6-4.5a2.5 2.5 0 0 1 4 2z"/>
                        <path fill="#18181b" d="M2 17a3 3 0 0 0 3 3h2v-9.5L2 6.5V17z"/>
                        <path fill="#09090b" d="M12 9L6 4.5A2.5 2.5 0 0 0 2 6.5V7l10 7 10-7v-.5a2.5 2.5 0 0 0-4-2L12 9z"/>
                        <path fill="#27272a" d="M22 6.5l-5 4V20h2a3 3 0 0 0 3-3V6.5z"/>
                      </svg>
                    </button>

                    {/* Outlook Live */}
                    <button
                      type="button"
                      onClick={() => launchEmailPlatform('outlook-live', member, invite, inviterName, companyName)}
                      title={`Launch Outlook Live (To: ${member.email})`}
                      style={{
                        width: '34px',
                        height: '34px',
                        padding: 0,
                        backgroundColor: '#ffffff',
                        border: '1px solid #d4d4d8',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f4f4f5';
                        e.currentTarget.style.borderColor = '#a1a1aa';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#d4d4d8';
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="4" width="20" height="16" rx="3.5" fill="#09090b" fillOpacity="0.12" stroke="#09090b" strokeWidth="1.5"/>
                        <path d="M2 7.5L12 13.5L22 7.5" stroke="#09090b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="8" cy="14" r="3.2" fill="#09090b"/>
                        <text x="8" y="16.4" textAnchor="middle" fill="#FFFFFF" fontSize="6.8" fontWeight="bold" fontFamily="system-ui, sans-serif">O</text>
                      </svg>
                    </button>

                    {/* Outlook 365 */}
                    <button
                      type="button"
                      onClick={() => launchEmailPlatform('outlook-office', member, invite, inviterName, companyName)}
                      title={`Launch Microsoft 365 Outlook (To: ${member.email})`}
                      style={{
                        width: '34px',
                        height: '34px',
                        padding: 0,
                        backgroundColor: '#ffffff',
                        border: '1px solid #d4d4d8',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f4f4f5';
                        e.currentTarget.style.borderColor = '#a1a1aa';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#d4d4d8';
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="4" width="20" height="16" rx="3.5" fill="#09090b" fillOpacity="0.16" stroke="#09090b" strokeWidth="1.5"/>
                        <path d="M2 7.5L12 13.5L22 7.5" stroke="#09090b" strokeWidth="1.5" strokeLinecap="round"/>
                        <rect x="4" y="11" width="8" height="6.5" rx="1.5" fill="#18181b"/>
                        <text x="8" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="5.2" fontWeight="900" fontFamily="system-ui, sans-serif">365</text>
                      </svg>
                    </button>

                    {/* Yahoo Mail */}
                    <button
                      type="button"
                      onClick={() => launchEmailPlatform('yahoo', member, invite, inviterName, companyName)}
                      title={`Launch Yahoo Mail (To: ${member.email})`}
                      style={{
                        width: '34px',
                        height: '34px',
                        padding: 0,
                        backgroundColor: '#ffffff',
                        border: '1px solid #d4d4d8',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f4f4f5';
                        e.currentTarget.style.borderColor = '#a1a1aa';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#d4d4d8';
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="4" width="20" height="16" rx="3.5" fill="#09090b" fillOpacity="0.12" stroke="#09090b" strokeWidth="1.5"/>
                        <path d="M6 7.5L9.5 12.5V17.5H11.5V12.5L15 7.5H12.8L10.5 11.2L8.2 7.5H6Z" fill="#09090b"/>
                        <rect x="16.5" y="13" width="1.6" height="4" rx="0.8" fill="#09090b"/>
                        <circle cx="17.3" cy="10" r="1" fill="#09090b"/>
                      </svg>
                    </button>

                    {/* Default Mail Client */}
                    <button
                      type="button"
                      onClick={() => launchEmailPlatform('mailto', member, invite, inviterName, companyName)}
                      title={`Launch Default Mail Client (To: ${member.email})`}
                      style={{
                        width: '34px',
                        height: '34px',
                        padding: 0,
                        backgroundColor: '#ffffff',
                        border: '1px solid #d4d4d8',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f4f4f5';
                        e.currentTarget.style.borderColor = '#a1a1aa';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#d4d4d8';
                      }}
                    >
                      <Mail size={16} color="#09090b" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Option C: Regenerate Link ── */}
            <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    c. Regenerate Invitation Link
                  </h4>
                  <p style={{ fontSize: '0.72rem', color: '#71717a', margin: '3px 0 0 0' }}>
                    A link is active for 24 hours and until the targeted user successfully registers. Regenerating generates a fresh link and immediately invalidates any prior token.
                  </p>
                </div>

                {isSubClient ? (
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#71717a', backgroundColor: '#f4f4f5', padding: '6px 12px', borderRadius: '4px', border: '1px solid #d4d4d8', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Lock size={12} /> Managed by Primary Client
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={isGeneratingInvite}
                    onClick={() => onRegenerateInvite(member.email)}
                    style={{
                      height: '34px',
                      padding: '0 1rem',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      backgroundColor: '#ffffff',
                      color: '#09090b',
                      border: '1px solid #09090b',
                      borderRadius: '4px',
                      cursor: isGeneratingInvite ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                  >
                    {isGeneratingInvite ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={13} />
                        <span>Regenerate Link</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              padding: '0.85rem 1.5rem',
              borderTop: '1px solid #e4e4e7',
              display: 'flex',
              justifyContent: 'flex-end',
              backgroundColor: '#fafafa',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                height: '32px',
                padding: '0 1.25rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                backgroundColor: '#ffffff',
                color: '#09090b',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
