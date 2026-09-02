'use client';

import React, { useState } from 'react';
import { useUsers } from '@/modules/users/hooks';
import { UserCreateModal } from '@/modules/users/components/UserCreateModal';
import { UserCreatePayload } from '@/modules/users/types';
import { Role } from '@/lib/role';

export default function UserManagementPage() {
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const { users, loading, error, refetch, createUser } = useUsers(
    roleFilter === 'all' ? undefined : roleFilter
  );
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCreateUser = async (payload: UserCreatePayload) => {
    try {
      await createUser(payload);
      setFeedbackMsg({
        type: 'success',
        text: `Successfully provisioned account for ${payload.email} with role ${payload.role}!`,
      });
    } catch (err: any) {
      throw err;
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return { background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' };
      case 'operations':
        return { background: 'rgba(124, 58, 237, 0.15)', color: '#a78bfa', border: '1px solid rgba(124, 58, 237, 0.3)' };
      case 'pilot':
        return { background: 'rgba(234, 179, 8, 0.15)', color: '#fde047', border: '1px solid rgba(234, 179, 8, 0.3)' };
      case 'client':
        return { background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.3)' };
      default:
        return { background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' };
    }
  };

  const pilotsCount = users.filter((u) => u.role === Role.PILOT || u.role === 'pilot').length;
  const opsCount = users.filter((u) => u.role === Role.OPERATIONS || u.role === 'operations').length;
  const adminCount = users.filter((u) => u.role === Role.ADMIN || u.role === 'admin').length;
  const clientCount = users.filter((u) => u.role === Role.CLIENT || u.role === 'client').length;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Team & User Management
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Provision staff credentials, manage certified drone pilots, and configure role-based system access.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => refetch()}
            className="btn btn-secondary"
            style={{ fontSize: '0.875rem' }}
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="btn btn-primary"
            style={{ fontSize: '0.875rem' }}
          >
            ➕ Provision Team Member
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${feedbackMsg.type === 'success' ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
            borderRadius: '8px',
            color: feedbackMsg.type === 'success' ? 'var(--accent-success)' : '#fca5a5',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{feedbackMsg.text}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '1rem',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid var(--accent-danger)',
            borderRadius: '8px',
            color: '#fca5a5',
            marginBottom: '1.5rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Role metrics overview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Licensed Pilots</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-warning)', marginTop: '0.25rem' }}>
            👨‍✈️ {pilotsCount}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Operations Officers</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#a78bfa', marginTop: '0.25rem' }}>
            🎛️ {opsCount}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Platform Admins</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f87171', marginTop: '0.25rem' }}>
            🛡️ {adminCount}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Client Accounts</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-success)', marginTop: '0.25rem' }}>
            🏢 {clientCount}
          </div>
        </div>
      </div>

      {/* User Roster Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
            System User Roster ({users.length})
          </h3>

          {/* Role Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {['all', Role.PILOT, Role.OPERATIONS, Role.ADMIN, Role.CLIENT].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                style={{
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.75rem',
                  borderRadius: '4px',
                  border: roleFilter === r ? '1px solid var(--brand-primary)' : '1px solid var(--border-color)',
                  background: roleFilter === r ? 'rgba(124, 58, 237, 0.2)' : 'transparent',
                  color: roleFilter === r ? 'var(--brand-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading users directory...
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No users found matching current filter.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User Profile</th>
                  <th>System Role</th>
                  <th>Account Status</th>
                  <th>Created Date</th>
                  <th>Last Sync</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          {u.email.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.email}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {u.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          ...getRoleBadgeStyle(u.role),
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.8rem',
                          color: u.is_active ? 'var(--accent-success)' : 'var(--accent-danger)',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: u.is_active ? 'var(--accent-success)' : 'var(--accent-danger)',
                          }}
                        />
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {u.updated_at ? new Date(u.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provision Modal */}
      <UserCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateUser}
      />
    </div>
  );
}
