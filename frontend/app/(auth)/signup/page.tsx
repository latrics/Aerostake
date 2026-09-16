'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Role } from '@/lib/role';

export default function SignupPage() {
  const { signup, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(Role.CLIENT);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!email || !password) {
      setValidationError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const data = await signup({ email, password, role });
      
      // Perform redirect based on role
      const userRole = data.user.role;
      if (userRole === 'client' || userRole === 'client_primary') {
        window.location.href = '/company-profile?first_time=true';
      } else if (userRole === 'client_sub') {
        window.location.href = '/dashboard';
      } else if (userRole === 'admin') {
        window.location.href = '/requests';
      } else if (userRole === 'operations') {
        window.location.href = '/allocations';
      } else if (userRole === 'pilot') {
        window.location.href = '/my-assignments';
      }
    } catch (err: any) {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>
        Create Account
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
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="password">
          Password (min 6 chars)
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

      <div className="form-group" style={{ marginBottom: '1.75rem' }}>
        <label className="form-label" htmlFor="role">
          Account Role
        </label>
        <select
          id="role"
          className="form-input"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          disabled={loading}
          style={{
            appearance: 'none',
            background: 'var(--bg-secondary) url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%239ca3af\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e") no-repeat right 0.75rem center/1.25rem auto',
            paddingRight: '2rem',
          }}
        >
          <option value={Role.CLIENT}>Client (Asset Owner)</option>
          <option value={Role.OPERATIONS}>Operations Manager</option>
          <option value={Role.PILOT}>Drone Pilot</option>
          <option value={Role.ADMIN}>Platform Administrator</option>
        </select>
      </div>

      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={loading}
        style={{ opacity: loading ? 0.7 : 1 }}
      >
        {loading ? 'Registering...' : 'Sign Up'}
      </button>

      <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: '#3b82f6', fontWeight: 600 }}>
          Log in instead
        </Link>
      </div>
    </form>
  );
}
