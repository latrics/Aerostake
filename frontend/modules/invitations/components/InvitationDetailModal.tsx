'use client';

import React, { useState } from 'react';
import {
  X,
  Mail,
  Copy,
  Check,
  ExternalLink,
  Clock,
  RefreshCw,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { InvitationOut } from '../types';
import { invitationsApi } from '../api';

interface InvitationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitation: InvitationOut | null;
  onInvitationUpdated?: (updated: InvitationOut) => void;
}

export const InvitationDetailModal: React.FC<InvitationDetailModalProps> = ({
  isOpen,
  onClose,
  invitation,
  onInvitationUpdated,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [currentInvite, setCurrentInvite] = useState<InvitationOut | null>(invitation);

  React.useEffect(() => {
    setCurrentInvite(invitation);
    setCopiedLink(false);
    setCopiedEmail(false);
  }, [invitation]);

  if (!isOpen || !currentInvite) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const inviteUrl = `${baseUrl}/accept-invite?token=${encodeURIComponent(currentInvite.token)}`;

  // Calculate 24-hour expiration status
  const expiresAtDate = new Date(currentInvite.expires_at);
  const isExpired = expiresAtDate.getTime() < Date.now();
  const hoursRemaining = Math.max(0, Math.round((expiresAtDate.getTime() - Date.now()) / (1000 * 60 * 60)));

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleRegenerateToken = async () => {
    try {
      setIsRegenerating(true);
      const refreshed = await invitationsApi.resendOrganizationInvitation(currentInvite.email);
      setCurrentInvite(refreshed);
      if (onInvitationUpdated) {
        onInvitationUpdated(refreshed);
      }
    } catch (err: any) {
      console.error('Failed to regenerate invitation link:', err);
      alert(err?.response?.data?.detail || 'Failed to refresh token.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const generateEmailHtml = (inv: InvitationOut) => {
    const roleTitle = inv.role.toUpperCase();
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; color: #18181b; line-height: 1.5;">
        <div style="font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; color: #71717a; font-weight: 700; margin-bottom: 0.35rem;">
          LATRICS JOINT OWNERSHIP & DRONE SURVEY PORTAL
        </div>
        <h2 style="font-size: 1.25rem; font-weight: 800; color: #09090b; margin: 0 0 1rem 0; border-bottom: 2px solid #09090b; padding-bottom: 0.5rem;">
          Aerostake Workspace Invitation
        </h2>
        <p style="margin: 0 0 0.85rem 0; font-size: 0.9rem;">
          Hello <strong>Pilot / Team Member</strong>,
        </p>
        <p style="margin: 0 0 0.85rem 0; font-size: 0.9rem;">
          <strong>${inv.invited_by_name || 'Operations'}</strong> has invited you to access field flight missions, sector logs, and operational reports on the <strong>Latrics Aerostake Inc.</strong> portal as a <strong>${roleTitle}</strong>.
        </p>
        <div style="margin: 1.25rem 0;">
          <a href="${inviteUrl}" target="_blank" style="background-color: #09090b; color: #ffffff; padding: 0.65rem 1.25rem; border-radius: 6px; font-weight: 700; font-size: 0.85rem; text-decoration: none; display: inline-block;">
            Activate Account &amp; Complete Profile &rarr;
          </a>
        </div>
        <p style="font-size: 0.75rem; color: #71717a; margin-top: 1rem;">
          * Note: This invitation link is valid for 24 hours. After authenticating, submit your DGCA License / Pilot credentials to complete profile synchronization.
        </p>
      </div>
    `;
  };

  const handleCopyEmailLayout = async () => {
    try {
      const html = generateEmailHtml(currentInvite);
      const blob = new Blob([html], { type: 'text/html' });
      const textBlob = new Blob([`Aerostake Invitation Link: ${inviteUrl}`], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blob,
          'text/plain': textBlob,
        }),
      ]);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    } catch {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    }
  };

  const subject = encodeURIComponent(`Aerostake Workspace Invitation: Join Field Operations`);
  const bodyText = encodeURIComponent(
    `Hello,\n\nYou have been invited to Aerostake as a ${currentInvite.role.toUpperCase()}.\n\nActivate your account and complete your profile here (valid for 24h):\n${inviteUrl}\n\nLatrics Aerostake Inc.`
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          borderRadius: '10px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e4e4e7',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.18s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #f4f4f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
              Invitation Created
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#71717a', margin: '0.15rem 0 0 0' }}>
              Invitation has been recorded in the database.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#71717a',
              padding: '0.35rem',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '1.25rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Top Token Banner */}
          <div
            style={{
              backgroundColor: isExpired ? '#fef2f2' : '#fafafa',
              border: `1px solid ${isExpired ? '#fecaca' : '#e4e4e7'}`,
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {isExpired ? (
                <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
              ) : (
                <Clock size={18} color="#09090b" style={{ flexShrink: 0 }} />
              )}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>
                  {isExpired ? 'Invitation Token Expired' : 'Invitation Token Active!'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.1rem' }}>
                  A secure invitation record for <strong>{currentInvite.email}</strong> ({currentInvite.role}) is in the system.
                  {!isExpired && (
                    <span style={{ color: '#09090b', fontWeight: 600, marginLeft: '0.35rem' }}>
                      (Valid for ~{hoursRemaining || 24} hours)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRegenerateToken}
              disabled={isRegenerating}
              style={{
                height: '30px',
                padding: '0 0.75rem',
                fontSize: '0.725rem',
                fontWeight: 600,
                borderRadius: '5px',
                backgroundColor: '#ffffff',
                border: '1px solid #d4d4d8',
                color: '#09090b',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
              title="Generate a fresh 24-hour invitation token"
            >
              <RefreshCw size={12} className={isRegenerating ? 'animate-spin' : ''} />
              <span>{isRegenerating ? 'Regenerating...' : 'Regenerate Link'}</span>
            </button>
          </div>

          {/* Section A: Just Copy the Link */}
          <div
            style={{
              border: '1px solid #e4e4e7',
              borderRadius: '8px',
              padding: '1rem',
              backgroundColor: '#ffffff',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
              }}
            >
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                a. Just Copy the Link
              </h4>
              {copiedLink && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#065f46',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Check size={13} /> Link copied to clipboard!
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={inviteUrl}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.775rem',
                  fontFamily: 'monospace',
                  backgroundColor: '#f4f4f5',
                  border: '1px solid #d4d4d8',
                  borderRadius: '6px',
                  color: '#09090b',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  height: '34px',
                  padding: '0 0.85rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  backgroundColor: copiedLink ? '#09090b' : '#ffffff',
                  color: copiedLink ? '#ffffff' : '#09090b',
                  border: '1px solid #09090b',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                }}
              >
                {copiedLink ? (
                  <>
                    <Check size={13} /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={13} /> Copy Link
                  </>
                )}
              </button>
              <a
                href={inviteUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  height: '34px',
                  padding: '0 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  color: '#09090b',
                  border: '1px solid #d4d4d8',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <ExternalLink size={13} /> Open
              </a>
            </div>
          </div>

          {/* Section B: Send Email */}
          <div
            style={{
              border: '1px solid #e4e4e7',
              borderRadius: '8px',
              padding: '1rem',
              backgroundColor: '#ffffff',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                  b. Send Email
                </h4>
                <p style={{ fontSize: '0.72rem', color: '#71717a', margin: '2px 0 0 0' }}>
                  Preview email with button below. Copy formatted layout or navigate to your email platform:
                </p>
              </div>
              {copiedEmail && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#065f46',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Check size={13} /> Formatted email copied!
                </span>
              )}
            </div>

            {/* Email Preview Card */}
            <div
              style={{
                maxHeight: '210px',
                overflowY: 'auto',
                border: '1px solid #e4e4e7',
                borderRadius: '6px',
                padding: '0.85rem',
                backgroundColor: '#fafafa',
                marginBottom: '0.75rem',
              }}
            >
              <div
                dangerouslySetInnerHTML={{
                  __html: generateEmailHtml(currentInvite),
                }}
              />
            </div>

            {/* Email Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={handleCopyEmailLayout}
                  style={{
                    height: '32px',
                    padding: '0 0.9rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    border: '1px solid #09090b',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Copy size={13} />
                  <span>Copy Formatted Email</span>
                </button>
                <span style={{ fontSize: '0.72rem', color: '#71717a' }}>
                  Paste directly into Gmail, Outlook, or Yahoo Mail
                </span>
              </div>

              {/* Direct Mail Launchers */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '0.65rem',
                  borderTop: '1px dashed #e4e4e7',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#71717a', fontWeight: 600 }}>
                  Or Launch Email Platform Directly:
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  {/* Gmail */}
                  <a
                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                      currentInvite.email
                    )}&su=${subject}&body=${bodyText}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      backgroundColor: '#ffffff',
                      border: '1px solid #d4d4d8',
                      borderRadius: '5px',
                      color: '#09090b',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                    title="Compose in Gmail"
                  >
                    <Send size={11} /> Gmail
                  </a>

                  {/* Default / Outlook Mail */}
                  <a
                    href={`mailto:${currentInvite.email}?subject=${subject}&body=${bodyText}`}
                    style={{
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      backgroundColor: '#ffffff',
                      border: '1px solid #d4d4d8',
                      borderRadius: '5px',
                      color: '#09090b',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                    title="Open default email client"
                  >
                    <Mail size={11} /> Outlook / Mail
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid #f4f4f5',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: '34px',
              padding: '0 1rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '6px',
              backgroundColor: '#09090b',
              border: '1px solid #09090b',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
