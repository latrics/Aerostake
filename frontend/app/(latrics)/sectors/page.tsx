import React from 'react';

export default function SectorsPage() {
  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Flight Sectors
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Manage layout subdivisions and coordinates for active asset zones.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>
          Sector Grid Map Division
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Flight sectors represent mapped boundaries divided dynamically for single-flight coverage.
        </p>

        <div className="grid-2">
          <div className="glass-card">
            <h4 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Sector A1 (North Grid)</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Area: 1.5 sq km | Estimated Flight Time: 45 min
            </p>
            <span className="badge badge-active">In Progress</span>
          </div>

          <div className="glass-card">
            <h4 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Sector A2 (South Grid)</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Area: 1.2 sq km | Estimated Flight Time: 40 min
            </p>
            <span className="badge badge-completed">Surveyed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
