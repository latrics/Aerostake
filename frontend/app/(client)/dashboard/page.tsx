'use client';

import React from 'react';
import { useAuth } from '@/lib/auth';

export default function ClientDashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Welcome back, {user ? user.email.split('@')[0] : 'Client'}!
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Monitor your active solar asset survey portfolios and review published operational plans.
        </p>
      </div>

      <div className="grid-3" style={{ marginBottom: '2.5rem' }}>
        <div className="glass-card">
          <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📊</span>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Active Projects
          </h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>1 Project</p>
        </div>

        <div className="glass-card">
          <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📋</span>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Survey Submissions
          </h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>Version #002</p>
        </div>

        <div className="glass-card">
          <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>💳</span>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Milestone Payments
          </h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>Paid (50%)</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
          Solar Photovoltaic Thermal Inspection
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          Project ID: <code>solar-pv-thermal-01</code> | Status:{' '}
          <span className="badge badge-active">Active</span>
        </p>
        
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
            Recent Timeline Log Entries:
          </h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <li style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--success)' }}>✓</span>
              <div>
                <strong>Milestone Payment Verified</strong> - Deposit of $3,600.00 confirmed by Admin.
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                  2026-08-27 19:05 IST | Category: payment
                </div>
              </div>
            </li>
            <li style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--success)' }}>✓</span>
              <div>
                <strong>Pilot Dispatched</strong> - Pilot assigned to Sector SEC-A1 with DJI Matrice 300 RTK.
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                  2026-08-27 18:45 IST | Category: allocation
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
