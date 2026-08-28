import React from 'react';

export default function MyAssignmentsPage() {
  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          My Flight Assignments
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Assigned flight sectors and hardware logs for your pilot credentials.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>
          Pending Surveys
        </h3>

        <div className="glass-card" style={{ borderLeft: '4px solid var(--brand-primary)' }}>
          <h4 style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Sector SEC-A1 (Solar PV Thermal)</span>
            <span className="badge badge-active">Assigned</span>
          </h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Location: New Delhi Solar Field | Hardware: DJI Matrice 300 RTK (S/N: D300-98711)
          </p>
          <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            Begin Pre-flight Checklist
          </button>
        </div>
      </div>
    </div>
  );
}
