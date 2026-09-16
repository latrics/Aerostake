'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { invitationsApi } from '@/modules/invitations/api';
import { apiClient, setCookie } from '@/lib/api-client';
import { setCachedUser } from '@/lib/auth';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, Lock, User, Phone } from 'lucide-react';

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Missing invitation token. Please check your invitation link.');
      setLoading(false);
      return;
    }

    async function verify() {
      try {
        const inv = await invitationsApi.verifyToken(token!);
        setInvitation(inv);
      } catch (err: any) {
        setError(err.message || 'Invalid or expired invitation token.');
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await apiClient.post<any>('/invitations/accept', {
        token: token,
        password: password,
        full_name: fullName.trim() || undefined,
        phone_number: phoneNumber.trim() || undefined,
      });

      // Save token in localStorage and cookies for middleware / SSR
      if (res.access_token) {
        setCookie('access_token', res.access_token, 1);
        setCookie('refresh_token', res.refresh_token, 7);
        if (res.user?.role) {
          setCookie('user_role', res.user.role, 7);
        }
        const isOnboarded = res.user?.company_profile?.is_onboarded ? 'true' : 'false';
        setCookie('is_onboarded', isOnboarded, 7);
        if (res.user) {
          setCachedUser(res.user);
        }
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        const role = res.user?.role?.toLowerCase();
        const isOnboarded = Boolean(res.user?.company_profile?.is_onboarded);

        if (role === 'admin' || role === 'operations') {
          router.push('/dashboard');
        } else if (role === 'pilot') {
          router.push('/my-assignments');
        } else if (role === 'client_primary' || role === 'client') {
          if (!isOnboarded) {
            router.push('/company-profile?first_time=true');
          } else {
            router.push('/dashboard');
          }
        } else {
          router.push('/dashboard');
        }
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'operations':
        return 'Operations Team Member';
      case 'pilot':
        return 'Certified Drone Pilot';
      case 'client_primary':
        return 'Client Primary Administrator';
      case 'client_sub':
        return 'Client Team Member';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#09090b', margin: '0 auto 1rem auto' }} />
        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#09090b' }}>Verifying your invitation...</div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
          }}
        >
          <AlertCircle size={28} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#09090b', marginBottom: '0.5rem' }}>
          Invalid or Expired Invitation
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
          {error}
        </p>
        <Link
          href="/login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            backgroundColor: '#18181b',
            color: '#ffffff',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          Return to Login
        </Link>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
          }}
        >
          <CheckCircle2 size={28} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#09090b', marginBottom: '0.5rem' }}>
          Account Activated Successfully!
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
          Redirecting you to your portal dashboard...
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '20px',
            backgroundColor: '#f1f5f9',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#334155',
            marginBottom: '0.75rem',
          }}
        >
          <ShieldCheck size={14} />
          <span>Invited as {getRoleLabel(invitation?.role)}</span>
        </div>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.02em', margin: 0 }}>
          Complete Your Registration
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.35rem' }}>
          You are joining as <b>{invitation?.email}</b>
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#b91c1c',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Full Name */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#09090b', marginBottom: '0.35rem' }}>
            Full Name
          </label>
          <div style={{ position: 'relative' }}>
            <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="e.g. Aarav Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem 0.65rem 2.25rem',
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

        {/* Phone Number */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#09090b', marginBottom: '0.35rem' }}>
            Phone Number
          </label>
          <div style={{ position: 'relative' }}>
            <Phone size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="tel"
              placeholder="e.g. +91 98765 43210"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem 0.65rem 2.25rem',
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

        {/* Password */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#09090b', marginBottom: '0.35rem' }}>
            Create Password *
          </label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem 0.65rem 2.25rem',
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

        {/* Confirm Password */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#09090b', marginBottom: '0.35rem' }}>
            Confirm Password *
          </label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem 0.65rem 2.25rem',
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

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: '0.5rem',
            padding: '0.75rem 1rem',
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
          }}
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Activating Account...</span>
            </>
          ) : (
            <>
              <span>Activate Account & Login</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto' }} />
        </div>
      }
    >
      <AcceptInviteForm />
    </Suspense>
  );
}
