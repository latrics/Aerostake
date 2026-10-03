'use client';

import React, { useState, useEffect } from 'react';
import { X, Send, AlertCircle, CheckCircle2, Building2, User, Mail, Phone, Copy, Check, ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { invitationsApi } from '@/modules/invitations/api';
import { OrganizationInfo } from '@/modules/invitations/types';

interface InviteUserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteUserDrawer({ isOpen, onClose, onSuccess }: InviteUserDrawerProps) {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role?.toString().toLowerCase() === 'admin';
  const isOps = currentUser?.role?.toString().toLowerCase() === 'operations';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [message, setMessage] = useState('');

  const [organizations, setOrganizations] = useState<OrganizationInfo[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success state with copyable link & email layout
  const [createdInvite, setCreatedInvite] = useState<{
    email: string;
    token: string;
    role: string;
    fullName?: string;
    companyName?: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Fetch organizations when drawer opens
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setCreatedInvite(null);
      setCopiedLink(false);
      setCopiedEmail(false);
      fetchOrganizations();
    } else {
      // Reset form when closed
      setFullName('');
      setEmail('');
      setPhoneNumber('');
      setRole('');
      setSelectedOrgId('');
      setNewCompanyName('');
      setMessage('');
      setErrorMsg(null);
      setCreatedInvite(null);
      setCopiedLink(false);
      setCopiedEmail(false);
    }
  }, [isOpen]);

  const fetchOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const orgs = await invitationsApi.listOrganizations();
      setOrganizations(orgs);
    } catch {
      setOrganizations([]);
    } finally {
      setLoadingOrgs(false);
    }
  };

  if (!isOpen) return null;

  const isClient = role === 'client_primary' || role === 'client';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim()) {
      setErrorMsg('Email address is required.');
      return;
    }
    if (!role) {
      setErrorMsg('Please select a role.');
      return;
    }

    if (isClient && !selectedOrgId && !newCompanyName.trim()) {
      setErrorMsg('Please specify a company name or select an existing organization for the client.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        email: email.trim().toLowerCase(),
        role: role,
      };

      if (isClient) {
        if (newCompanyName.trim()) {
          payload.company_name = newCompanyName.trim();
        } else if (selectedOrgId) {
          payload.organization_id = selectedOrgId;
        }
      }

      const res = await invitationsApi.createInvitation(payload);
      const matchedOrg = organizations.find((o) => o.id === selectedOrgId);
      setCreatedInvite({
        email: res.email,
        token: res.token,
        role: res.role || role,
        fullName: fullName.trim() || undefined,
        companyName: newCompanyName.trim() || matchedOrg?.name || currentUser?.company_name || 'Latrics Aerostake',
      });
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch invitation. Please check the details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inviteUrl = createdInvite
    ? `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/accept-invite?token=${encodeURIComponent(createdInvite.token)}`
    : '';

  const handleCopyLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error('Failed to copy link', err);
    }
  };

  const generateEmailHtml = (invite: { email: string; token: string; role: string; fullName?: string; companyName?: string }) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const targetUrl = `${origin}/accept-invite?token=${encodeURIComponent(invite.token)}`;
    const memberName = invite.fullName?.trim() || invite.email.split('@')[0] || 'Team Member';
    const inviterName = currentUser?.full_name?.trim() || currentUser?.email || 'Aerostake Administrator';
    const compName = invite.companyName?.trim() || currentUser?.company_name || 'Latrics Aerostake';

    // Role-specific description
    let roleDescription = 'join the Aerostake platform';
    const roleKey = (invite.role || '').toLowerCase();
    if (roleKey.includes('client')) {
      roleDescription = `collaborate on the <strong>${compName}</strong> workspace for drone survey project requests, flight reviews, and deliverables`;
    } else if (roleKey.includes('operations')) {
      roleDescription = `collaborate on the <strong>${compName}</strong> operations team for flight planning, resource allocation, and mission tracking`;
    } else if (roleKey.includes('pilot')) {
      roleDescription = `access field flight missions, sector logs, and operational reports on the <strong>${compName}</strong> portal`;
    } else if (roleKey.includes('admin')) {
      roleDescription = `access administrative management, user provisioning, and operational oversight on <strong>${compName}</strong>`;
    }

    return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 8px; background-color: #ffffff; padding: 24px; color: #09090b;">
  <div style="border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px;">
    <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #71717a;">Latrics Joint Ownership & Drone Survey Portal</div>
    <h1 style="margin: 4px 0 0 0; font-size: 18px; font-weight: 800; color: #09090b;">Aerostake Workspace Invitation</h1>
  </div>
  <p style="font-size: 14px; line-height: 1.6; color: #18181b; margin: 0 0 12px 0;">
    Hello <strong>${memberName}</strong>,
  </p>
  <p style="font-size: 14px; line-height: 1.6; color: #3f3f46; margin: 0 0 18px 0;">
    <strong>${inviterName}</strong> has invited you to ${roleDescription}.
  </p>
  
  <!-- Outlook-Bulletproof Coloured Button -->
  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: separate; margin: 20px 0;">
    <tbody>
      <tr>
        <td align="center" valign="middle" bgcolor="#09090b" style="background-color: #09090b; border: 1px solid #09090b; border-radius: 6px; padding: 12px 26px; text-align: center;">
          <!--[if mso]>
          <v:rect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${targetUrl}" style="height:44px;v-text-anchor:middle;width:260px;" stroke="f" fillcolor="#09090b">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:-apple-system,sans-serif;font-size:14px;font-weight:bold;">Accept Invitation &amp; Set Password</center>
          </v:rect>
          <![endif]-->
          <a href="${targetUrl}" target="_blank" style="color: #ffffff !important; text-decoration: none !important; font-size: 14px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: inline-block;">
            <span style="color: #ffffff !important; text-decoration: none !important; font-weight: 700;">Accept Invitation &amp; Set Password</span>
          </a>
        </td>
      </tr>
    </tbody>
  </table>

  <div style="background-color: #f4f4f5; border-left: 4px solid #09090b; padding: 10px 14px; border-radius: 4px; margin: 16px 0;">
    <p style="margin: 0; font-size: 12px; color: #18181b; font-weight: 700;">Important Validity Notice:</p>
    <p style="margin: 3px 0 0 0; font-size: 11px; color: #52525b; line-height: 1.5;">This invitation link is valid for 24 hours. Please click above to establish your credentials and join the workspace.</p>
  </div>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 20px 0;" />
  <p style="font-size: 11px; line-height: 1.5; color: #71717a; margin: 0;">
    If the button above does not work, copy and paste this URL into your web browser:<br />
    <a href="${targetUrl}" style="color: #09090b; text-decoration: underline; word-break: break-all;">${targetUrl}</a>
  </p>
</div>`;
  };

  const generateEmailPlainText = (invite: { email: string; token: string; role: string; fullName?: string; companyName?: string }) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const targetUrl = `${origin}/accept-invite?token=${encodeURIComponent(invite.token)}`;
    const memberName = invite.fullName?.trim() || invite.email.split('@')[0] || 'Team Member';
    const inviterName = currentUser?.full_name?.trim() || currentUser?.email || 'Aerostake Administrator';
    const compName = invite.companyName?.trim() || currentUser?.company_name || 'Latrics Aerostake';

    let roleDescription = `join the ${compName} workspace`;
    const roleKey = (invite.role || '').toLowerCase();
    if (roleKey.includes('client')) {
      roleDescription = `collaborate on the ${compName} workspace for drone survey project requests, flight reviews, and deliverables`;
    } else if (roleKey.includes('operations')) {
      roleDescription = `collaborate on the ${compName} operations team for flight planning, resource allocation, and mission tracking`;
    } else if (roleKey.includes('pilot')) {
      roleDescription = `access field flight missions, sector logs, and operational reports on the ${compName} portal`;
    } else if (roleKey.includes('admin')) {
      roleDescription = `access administrative management, user provisioning, and operational oversight on ${compName}`;
    }

    return `Latrics Joint Ownership & Drone Survey Portal\nAerostake Workspace Invitation\n\nHello ${memberName},\n\n${inviterName} has invited you to ${roleDescription}.\n\n[Accept Invitation & Set Password](${targetUrl})\n\nImportant Validity Notice:\nThis invitation link is valid for 24 hours. Please click above to establish your credentials and join the workspace.\n\nIf the button above does not work, copy and paste this URL into your web browser:\n${targetUrl}\n`;
  };

  const handleCopyEmailLayout = async () => {
    if (!createdInvite) return;
    const html = generateEmailHtml(createdInvite);
    const plain = generateEmailPlainText(createdInvite);
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
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    } catch {
      await navigator.clipboard.writeText(plain);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    }
  };

  const openEmailPlatform = (platform: 'gmail' | 'outlook-live' | 'outlook-office' | 'yahoo' | 'mailto') => {
    if (!createdInvite) return;
    
    // Copy the rich HTML layout to clipboard so it's ready to paste rich card
    handleCopyEmailLayout().catch((err) => console.warn('Failed copying HTML to clipboard:', err));

    const compName = createdInvite.companyName?.trim() || currentUser?.company_name || 'Latrics Aerostake';
    const subject = `Invitation to join ${compName} on Aerostake`;
    const to = createdInvite.email.trim();
    const body = generateEmailPlainText(createdInvite);

    if (platform === 'gmail') {
      window.open(
        `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
        '_blank'
      );
    } else if (platform === 'outlook-live') {
      window.open(
        `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
        '_blank'
      );
    } else if (platform === 'outlook-office') {
      window.open(
        `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
        '_blank'
      );
    } else if (platform === 'yahoo') {
      window.open(
        `https://compose.mail.yahoo.com/?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
        '_blank'
      );
    } else if (platform === 'mailto') {
      window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(2px)',
        transition: 'opacity 0.2s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: createdInvite ? '560px' : '460px',
          height: '100%',
          backgroundColor: '#ffffff',
          boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          overflowY: 'auto',
          transition: 'max-width 0.2s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e4e4e7',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#09090b', margin: 0 }}>
              {createdInvite ? 'Invitation Created' : 'Invite New User'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#52525b', marginTop: '0.35rem', margin: 0 }}>
              {createdInvite
                ? 'Invitation has been recorded in the database.'
                : 'Send an invitation to add a new user to the platform.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: '#f4f4f5',
              borderRadius: '6px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#52525b',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Created State with Copy Link + Email Layout */}
        {createdInvite ? (
          <div style={{ padding: '1.25rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Success Banner */}
            <div
              style={{
                padding: '0.85rem 1rem',
                backgroundColor: '#f4f4f5',
                border: '1px solid #d4d4d8',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <CheckCircle2 size={18} style={{ color: '#09090b', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#09090b' }}>
                  Invitation Token Generated!
                </div>
                <div style={{ fontSize: '0.78rem', color: '#09090b', marginTop: '0.15rem' }}>
                  A secure invitation record for <b>{createdInvite.email}</b> ({createdInvite.role}) has been created.
                </div>
              </div>
            </div>

            {/* Option A: Just Copy the Link */}
            <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '0.9rem', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                  a. Just Copy the Link
                </h4>
                {copiedLink && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#09090b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
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
                    borderRadius: '4px',
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
                    borderRadius: '4px',
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
                    borderRadius: '4px',
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

            {/* Option B: Send Email */}
            <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '0.9rem', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    b. Send Email
                  </h4>
                  <p style={{ fontSize: '0.72rem', color: '#71717a', margin: '2px 0 0 0' }}>
                    Preview email with button below. Copy formatted layout or navigate to your email platform:
                  </p>
                </div>
                {copiedEmail && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#09090b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={13} /> Formatted email copied!
                  </span>
                )}
              </div>

              {/* Scrollable Email Preview Box with Outlook-compatible button */}
              <div
                style={{
                  maxHeight: '220px',
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
                    __html: generateEmailHtml(createdInvite),
                  }}
                />
              </div>

              {/* Email Actions: Copy Layout OR Navigate to Platform */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
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
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {copiedEmail ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedEmail ? 'Copied to Clipboard!' : 'Copy Formatted Email'}</span>
                  </button>

                  <span style={{ fontSize: '0.72rem', color: '#71717a' }}>
                    Paste directly into Gmail, Outlook, or Yahoo Mail
                  </span>
                </div>

                {/* Direct Platform Navigation Buttons */}
                <div style={{ borderTop: '1px dashed #e4e4e7', paddingTop: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#52525b' }}>
                      Or Launch Email Platform Directly:
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
                      {createdInvite.email}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Gmail */}
                    <button
                      type="button"
                      onClick={() => openEmailPlatform('gmail')}
                      title={`Launch Gmail (To: ${createdInvite.email})`}
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
                      onClick={() => openEmailPlatform('outlook-live')}
                      title={`Launch Outlook Live (To: ${createdInvite.email})`}
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
                      onClick={() => openEmailPlatform('outlook-office')}
                      title={`Launch Microsoft 365 Outlook (To: ${createdInvite.email})`}
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
                      onClick={() => openEmailPlatform('yahoo')}
                      title={`Launch Yahoo Mail (To: ${createdInvite.email})`}
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
                      onClick={() => openEmailPlatform('mailto')}
                      title={`Launch Default Mail Client (To: ${createdInvite.email})`}
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
                  <div style={{ fontSize: '0.71rem', color: '#09090b', marginTop: '0.45rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={12} /> Opens with invitation body pre-filled & copies rich HTML card to clipboard.
                  </div>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.74rem', color: '#52525b', lineHeight: 1.4, margin: 0 }}>
              💡 <b>Validity Notice:</b> This invitation link is valid for 24 hours. While transactional email delivery is in sandbox mode, you can copy this formatted email or link to share it directly with the invitee.
            </p>

            <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '0.7rem',
                  backgroundColor: '#f4f4f5',
                  color: '#09090b',
                  border: '1px solid #d4d4d8',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Form Body */
          <form onSubmit={handleSubmit} style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {errorMsg && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f4f4f5',
                  border: '1px solid #d4d4d8',
                  borderRadius: '8px',
                  color: '#09090b',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#09090b', marginBottom: '0.4rem' }}>
                Full Name *
              </label>
              <input
                type="text"
                placeholder="Enter full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid #d4d4d8',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  color: '#09090b',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Email Address */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#09090b', marginBottom: '0.4rem' }}>
                Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid #d4d4d8',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  color: '#09090b',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Phone Number with Country Code */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#09090b', marginBottom: '0.4rem' }}>
                Phone Number
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  style={{
                    width: '90px',
                    padding: '0.65rem 0.5rem',
                    border: '1px solid #d4d4d8',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    backgroundColor: '#fafafa',
                    color: '#09090b',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="+91">+91 (IN)</option>
                  <option value="+1">+1 (US)</option>
                  <option value="+44">+44 (UK)</option>
                  <option value="+971">+971 (UAE)</option>
                  <option value="+65">+65 (SG)</option>
                  <option value="+61">+61 (AU)</option>
                </select>
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.85rem',
                    border: '1px solid #d4d4d8',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    outline: 'none',
                    color: '#09090b',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Role Dropdown */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#09090b', marginBottom: '0.4rem' }}>
                Role *
              </label>
              <select
                required
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setSelectedOrgId('');
                  setNewCompanyName('');
                }}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid #d4d4d8',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  backgroundColor: '#ffffff',
                  color: role ? '#09090b' : '#71717a',
                  outline: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <option value="" disabled>
                  Select role
                </option>
                {isAdmin && <option value="admin">Latrics Admin</option>}
                <option value="operations">Latrics Operation</option>
                <option value="pilot">Latrics Pilot</option>
                {(isAdmin || isOps) && <option value="client_primary">Client</option>}
              </select>
            </div>

            {/* Organization Dropdown (Only relevant for client) */}
            {isClient && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#09090b', marginBottom: '0.4rem' }}>
                  Organization (for clients)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {organizations.length > 0 && (
                    <select
                      value={selectedOrgId}
                      onChange={(e) => {
                        setSelectedOrgId(e.target.value);
                        if (e.target.value) setNewCompanyName('');
                      }}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        border: '1px solid #d4d4d8',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        backgroundColor: '#ffffff',
                        color: '#09090b',
                        outline: 'none',
                      }}
                    >
                      <option value="">-- Choose Existing Organization or enter below --</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    placeholder="Enter new company / organization name"
                    value={newCompanyName}
                    disabled={!!selectedOrgId}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      border: '1px solid #d4d4d8',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      backgroundColor: selectedOrgId ? '#fafafa' : '#ffffff',
                      color: '#09090b',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Message (Optional) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#09090b', marginBottom: '0.4rem' }}>
                Message (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Add a personal message to the invitation..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid #d4d4d8',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  color: '#09090b',
                  resize: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Submit Button */}
            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  backgroundColor: '#18181b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                  transition: 'background-color 0.15s ease',
                }}
              >
                <Send size={16} />
                <span>{submitting ? 'Sending Invitation...' : 'Send Invitation'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
