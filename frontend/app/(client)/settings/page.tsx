'use client';

import React, { useState } from 'react';
import WireframeBox from '@/components/WireframeBox';
import { Save, Bell, Shield, Building } from 'lucide-react';

export default function ClientSettingsPage() {
  const [orgName, setOrgName] = useState('Acme Industries Pvt Ltd');
  const [adminEmail, setAdminEmail] = useState('john.doe@acme.com');
  const [billingContact, setBillingContact] = useState('accounts@acme.com');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '800px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Account & Organization Settings</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Manage your organization profile, billing contact details, and push notification preferences.
        </p>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Organization Profile Card */}
        <div className="wf-card">
          <div className="wf-card-header">
            <h3 className="wf-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building size={16} /> Organization Profile
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Company Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Primary Admin Email
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Billing & Invoicing Email
              </label>
              <input
                type="email"
                value={billingContact}
                onChange={(e) => setBillingContact(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Contact Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Notification Preferences Card */}
        <div className="wf-card">
          <div className="wf-card-header">
            <h3 className="wf-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={16} /> Notification Preferences
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.825rem' }}>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#09090b' }}
              />
              <div>
                <span style={{ fontWeight: 600 }}>Transactional Email Alerts</span>
                <span style={{ display: 'block', fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                  Receive quotations, invoice verifications, and milestone completion summaries via email.
                </span>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.825rem' }}>
              <input
                type="checkbox"
                checked={pushAlerts}
                onChange={(e) => setPushAlerts(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#09090b' }}
              />
              <div>
                <span style={{ fontWeight: 600 }}>Browser Web Push Notifications</span>
                <span style={{ display: 'block', fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                  Instant desktop alerts when a sector survey is completed or a plan quotation is published.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1.25rem', display: 'flex', gap: '0.4rem' }}>
            <Save size={16} /> Save Preferences
          </button>
          {saved && (
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#09090b' }}>
              ✓ Settings saved successfully
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
