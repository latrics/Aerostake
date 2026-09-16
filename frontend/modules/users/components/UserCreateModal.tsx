'use client';

import React, { useState } from 'react';
import { Role } from '@/lib/role';
import { UserCreatePayload } from '../types';

interface UserCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: UserCreatePayload) => Promise<void>;
}

export function UserCreateModal({ isOpen, onClose, onSubmit }: UserCreateModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(Role.PILOT);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide email and password');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({ email, password, role });
      setEmail('');
      setPassword('');
      setRole(Role.PILOT);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create user account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Add Team Member</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Provision back-office or field pilot credentials.
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.25rem 0.6rem', fontSize: '1rem', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid var(--accent-danger)',
              borderRadius: '8px',
              color: '#fca5a5',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Email Address *
            </label>
            <input
              type="email"
              required
              className="input-field"
              placeholder="e.g. pilot.rodriguez@latrics.internal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Initial Password *
            </label>
            <input
              type="password"
              required
              className="input-field"
              placeholder="Min 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Assigned Role *
            </label>
            <select
              className="input-field"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              style={{ width: '100%' }}
            >
              <option value={Role.PILOT}>Drone Pilot (Flight telemetry & field missions)</option>
              <option value={Role.OPERATIONS}>Operations Manager (Planning & dispatch)</option>
              <option value={Role.ADMIN}>Platform Administrator (Full authority)</option>
              <option value={Role.CLIENT_PRIMARY}>Client Primary (Organization owner / admin)</option>
              <option value={Role.CLIENT_SUB}>Client Subordinate (Team member)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Creating Profile...' : 'Create Team Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
