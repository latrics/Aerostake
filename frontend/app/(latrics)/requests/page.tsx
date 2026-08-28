import React from 'react';

export default function RequestsPage() {
  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Client Survey Requests
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Manage client survey requests and view requirement versions.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>
          Active Submissions Feed
        </h3>
        
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project ID</th>
                <th>Request Version</th>
                <th>Survey Type</th>
                <th>Target Coordinates</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>solar-pv-thermal-01</code></td>
                <td><span className="badge badge-submitted">Version #002</span></td>
                <td>RGB + Thermal Scan</td>
                <td>[28.6139° N, 77.2090° E]</td>
                <td><span className="badge badge-active">Active</span></td>
              </tr>
              <tr>
                <td><code>wind-turbine-blade-04</code></td>
                <td><span className="badge badge-submitted">Version #001</span></td>
                <td>RGB High-Res</td>
                <td>[19.0760° N, 72.8777° E]</td>
                <td><span className="badge badge-planning">Planning</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
