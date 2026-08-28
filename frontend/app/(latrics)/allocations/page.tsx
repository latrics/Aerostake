import React from 'react';

export default function AllocationsPage() {
  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Hardware & Pilot Allocations
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Assign drone hardware and pilot personnel to approved flight sectors.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>
          Current Active Assignments
        </h3>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Allocation ID</th>
                <th>Sector Code</th>
                <th>Assigned Pilot</th>
                <th>Drone Model</th>
                <th>Allocation Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>alloc-098</code></td>
                <td><span className="badge badge-draft">SEC-A1</span></td>
                <td>pilot@latrics.com</td>
                <td>DJI Matrice 300 RTK</td>
                <td><span className="badge badge-active">Assigned</span></td>
              </tr>
              <tr>
                <td><code>alloc-099</code></td>
                <td><span className="badge badge-draft">SEC-A2</span></td>
                <td>pilot@latrics.com</td>
                <td>DJI Mavic 3 Enterprise</td>
                <td><span className="badge badge-completed">Completed</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
