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

  // Success state with copyable link
  const [createdInvite, setCreatedInvite] = useState<{ email: string; token: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch organizations when drawer opens
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setCreatedInvite(null);
      setCopied(false);
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
      setCopied(false);
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
      setCreatedInvite({
        email: res.email,
        token: res.token,
      });
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch invitation. Please check the details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inviteUrl = createdInvite
    ? `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/accept-invite?token=${createdInvite.token}`
    : '';

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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
          maxWidth: '460px',
          height: '100%',
          backgroundColor: '#ffffff',
          boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#09090b', margin: 0 }}>
              {createdInvite ? 'Invitation Created' : 'Invite New User'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.35rem', margin: 0 }}>
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
              background: '#f1f5f9',
              borderRadius: '6px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Created State with Copyable Link */}
        {createdInvite ? (
          <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
              }}
            >
              <CheckCircle2 size={20} style={{ color: '#15803d', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#15803d' }}>
                  Invitation Token Generated!
                </div>
                <div style={{ fontSize: '0.8rem', color: '#166534', marginTop: '0.25rem' }}>
                  A secure invitation record for <b>{createdInvite.email}</b> has been created.
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#09090b', marginBottom: '0.5rem' }}>
                Direct Onboarding Link:
              </label>
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  color: '#334155',
                  wordBreak: 'break-all',
                  lineHeight: 1.4,
                  fontFamily: 'monospace',
                }}
              >
                {inviteUrl}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: copied ? '#15803d' : '#18181b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Invite Link'}</span>
              </button>

              <a
                href={inviteUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={16} />
                <span>Open Link</span>
              </a>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
              💡 <b>Tip:</b> While transactional email delivery is in sandbox mode, you can copy this link and share it directly with the team member or open it in a private browser window to complete their registration.
            </p>

            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#f1f5f9',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
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
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#b91c1c',
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
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  color: '#0f172a',
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
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  color: '#0f172a',
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
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    backgroundColor: '#f8fafc',
                    color: '#0f172a',
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
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    outline: 'none',
                    color: '#0f172a',
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
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  backgroundColor: '#ffffff',
                  color: role ? '#0f172a' : '#94a3b8',
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
                <option value="client_primary">Client</option>
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
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        backgroundColor: '#ffffff',
                        color: '#0f172a',
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
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      backgroundColor: selectedOrgId ? '#f8fafc' : '#ffffff',
                      color: '#0f172a',
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
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  color: '#0f172a',
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
