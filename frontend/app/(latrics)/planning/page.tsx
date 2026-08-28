import React from 'react';

export default function PlanningPage() {
  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Operational flight planning
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Review flight durations, compute pricing quotations, and draft client operational plans.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
          Operational Plan Drafts
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Use this panel to publish drone resource counts, cost estimates, and flight constraints.
        </p>

        <div className="glass-card" style={{ borderLeft: '4px solid var(--brand-primary)', marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Plan #042 (Solar Photovoltaic Thermal Inspection)
          </h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Associated Request: Version #002 | Estimated Cost: $7,200.00
          </p>
          <span className="badge badge-approved">Approved by Client</span>
        </div>
      </div>
    </div>
  );
}
