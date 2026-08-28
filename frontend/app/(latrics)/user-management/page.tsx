import React from 'react';

export default function UserManagementPage() {
  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          User Profile Management
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Manage user profiles, assign roles, and audit access credentials.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>
          Registered Platform Profiles
        </h3>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Email Address</th>
                <th>Assigned Role</th>
                <th>Profile Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>admin@latrics.com</td>
                <td><span className="badge badge-submitted">ADMIN</span></td>
                <td><span className="badge badge-completed">Active</span></td>
              </tr>
              <tr>
                <td>ops@latrics.com</td>
                <td><span className="badge badge-planning">OPERATIONS</span></td>
                <td><span className="badge badge-completed">Active</span></td>
              </tr>
              <tr>
                <td>pilot@latrics.com</td>
                <td><span className="badge badge-draft">PILOT</span></td>
                <td><span className="badge badge-completed">Active</span></td>
              </tr>
              <tr>
                <td>client@latrics.com</td>
                <td><span className="badge badge-approved">CLIENT</span></td>
                <td><span className="badge badge-completed">Active</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
