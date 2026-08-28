'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    
    if (!email || !password) {
      setValidationError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const data = await login({ email, password });
      
      // Perform redirect based on role
      const role = data.user.role;
      if (role === 'client') {
        window.location.href = '/dashboard';
      } else if (role === 'admin') {
        window.location.href = '/requests';
      } else if (role === 'operations') {
        window.location.href = '/allocations';
      } else if (role === 'pilot') {
        window.location.href = '/my-assignments';
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

      {(validationError || authError) && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
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
        <Link href="/signup" style={{ color: '#3b82f6', fontWeight: 600 }}>
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
          lineHeight: '1.4',
        }}
      >
        <strong>Demo Accounts (Seeded):</strong>
        <ul style={{ paddingLeft: '1.2rem', marginTop: '0.25rem' }}>
          <li>Admin: <code>admin@latrics.com</code> / password</li>
          <li>Ops: <code>ops@latrics.com</code> / password</li>
          <li>Pilot: <code>pilot@latrics.com</code> / password</li>
          <li>Client: <code>client@latrics.com</code> / password</li>
        </ul>
      </div>
    </form>
  );
}
