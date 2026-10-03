'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';

function LoginForm() {
  const { login, error: authError } = useAuth();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (searchParams.get('session_expired') === 'true') {
      setSessionExpired(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setSessionExpired(false);
    
    if (!email || !password) {
      setValidationError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const data = await login({ email, password });
      
      // Perform redirect based on role and onboarding status
      const role = data.user.role;
      if (role === 'client' || role === 'client_primary') {
        const isOnboarded = Boolean(data.user.company_profile?.is_onboarded);
        if (!isOnboarded) {
          window.location.href = '/company-profile?first_time=true';
        } else {
          window.location.href = '/dashboard';
        }
      } else if (role === 'client_sub') {
        window.location.href = '/dashboard';
      } else if (role === 'admin') {
        window.location.href = '/requests';
      } else if (role === 'operations') {
        window.location.href = '/allocations';
      } else if (role === 'pilot') {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      // Errors handled by useAuth hook and displayed via authError
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>
        Account Login
      </h2>

      {sessionExpired && (
        <div
          style={{
            backgroundColor: '#18181b',
            color: '#fafafa',
            border: '1px solid #27272a',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            lineHeight: 1.4,
          }}
        >
          <strong>Session Expired:</strong> Your session has timed out. Please sign in again to continue.
        </div>
      )}

      {(validationError || authError) && (
        <div
          style={{
            backgroundColor: '#f4f4f5',
            border: '1px solid #09090b',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem',
            marginBottom: '1.25rem',
            color: 'var(--error)',
            fontSize: '0.875rem',
          }}
        >
          {validationError || authError}
        </div>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="email">
          Email Address
        </label>
        <input
          type="email"
          id="email"
          className="form-input"
          placeholder="name@latrics.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      <div className="form-group" style={{ marginBottom: '1.75rem' }}>
        <label className="form-label" htmlFor="password">
          Password
        </label>
        <input
          type="password"
          id="password"
          className="form-input"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={loading}
        style={{ opacity: loading ? 0.7 : 1 }}
      >
        {loading ? 'Authenticating...' : 'Sign In'}
      </button>

      <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Don&apos;t have an account?{' '}
        <Link href="/signup" style={{ color: '#09090b', fontWeight: 600, textDecoration: 'underline' }}>
          Create one here
        </Link>
      </div>

      <div
        style={{
          marginTop: '2rem',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '1rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          lineHeight: '1.5',
        }}
      >
        <strong>Available System Accounts:</strong>
        <ul style={{ paddingLeft: '1.2rem', marginTop: '0.35rem', listStyleType: 'disc' }}>
          <li>Admin: <code>aditya.paul@latrics.com</code> (Password: <code>Password123!</code>)</li>
          <li>Operations: <code>ops@latrics.com</code> (Password: <code>Password123!</code>)</li>
          <li>Client Primary: <code>client1@email.com</code> (Password: <code>Password123!</code>)</li>
          <li>Client Sub-User: <code>sub1@email.com</code> (Password: <code>Password123!</code>)</li>
          <li>Pilot: <code>pilot1@email.com</code> (Password: <code>Password123!</code>)</li>
        </ul>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>Loading login...</div>}>
      <LoginForm />
    </Suspense>
  );
}
