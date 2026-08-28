import React from 'react';

export default function SectorUpdatesPage() {
  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Flight & Sector Updates
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Submit flight logs and synchronize sector statuses from the field.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
          Field Progress Sync
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Report state changes like <code>IN_FLIGHT</code> or <code>COMPLETED</code>. This updates the sector maps dynamically and alerts Operations.
        </p>

        <div className="form-group" style={{ maxWidth: '400px' }}>
          <label className="form-label">Active Flight Segment</label>
          <select className="form-input" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <option>SEC-A1 (Assigned - DJI Matrice 300 RTK)</option>
          </select>
        </div>

        <button className="btn btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
          Transmit State Change (IN_FLIGHT)
        </button>
      </div>
    </div>
  );
}
