import React from 'react';

export default function SettingsPage() {
  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Portal Settings
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Configure system thresholds, notifications routing, and platform constants.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          System Parameters
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '500px' }}>
          <div className="form-group">
            <label className="form-label">CORS Origins Array (JSON String)</label>
            <input type="text" className="form-input" defaultValue='["http://localhost:3000"]' readOnly />
          </div>
          
          <div className="form-group">
            <label className="form-label">Active Mail Transport Provider</label>
            <input type="text" className="form-input" defaultValue="Resend (Sandbox fallback enabled)" readOnly />
          </div>
          
          <div className="form-group">
            <label className="form-label">FCM Integration Mode</label>
            <input type="text" className="form-input" defaultValue="Mock Session (Production VAPID pending)" readOnly />
          </div>
        </div>
      </div>
    </div>
  );
}
