'use client';

import React from 'react';
import { Lock } from 'lucide-react';

interface CompanyProfilePrimaryContactSectionProps {
  isSubClient: boolean;
  primaryFullName: string;
  setPrimaryFullName: (val: string) => void;
  primaryPhoneCode: string;
  setPrimaryPhoneCode: (val: string) => void;
  primaryPhone: string;
  setPrimaryPhone: (val: string) => void;
  primaryEmail: string;
  setPrimaryEmail: (val: string) => void;
  primaryDepartment: string;
  setPrimaryDepartment: (val: string) => void;
}

export function CompanyProfilePrimaryContactSection({
  isSubClient,
  primaryFullName,
  setPrimaryFullName,
  primaryPhoneCode,
  setPrimaryPhoneCode,
  primaryPhone,
  setPrimaryPhone,
  primaryEmail,
  setPrimaryEmail,
  primaryDepartment,
  setPrimaryDepartment,
}: CompanyProfilePrimaryContactSectionProps) {
  return (
    <div
      className="wf-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e4e4e7',
        padding: '1.25rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 className="wf-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b' }}>
            {isSubClient ? '3. Primary Contact (Organization Owner)' : '3. Primary Contact (You)'}
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            {isSubClient
              ? 'These details represent your organization\'s primary contact for official communications.'
              : 'These details will be used as the main point of contact for all communications.'}
          </p>
        </div>
        {isSubClient && (
          <span style={{ fontSize: '0.72rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Lock size={12} /> Managed by Primary Client
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        {/* Full Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
            Full Name <span style={{ color: '#09090b' }}>*</span>
          </label>
          <input
            type="text"
            required
            disabled={isSubClient}
            readOnly={isSubClient}
            placeholder="Enter full name"
            value={primaryFullName}
            onChange={(e) => setPrimaryFullName(e.target.value)}
            className="form-input"
            style={{
              fontSize: '0.8rem',
              height: '36px',
              border: '1px solid #d4d4d8',
              borderRadius: '4px',
              backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
              cursor: isSubClient ? 'not-allowed' : undefined,
              color: '#09090b',
            }}
          />
        </div>

        {/* Phone Number */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
            Phone Number <span style={{ color: '#09090b' }}>*</span>
          </label>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <select
              disabled={isSubClient}
              value={primaryPhoneCode}
              onChange={(e) => setPrimaryPhoneCode(e.target.value)}
              className="form-select"
              style={{
                width: '68px',
                fontSize: '0.75rem',
                height: '36px',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                padding: '0 0.3rem',
                backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                cursor: isSubClient ? 'not-allowed' : undefined,
                color: '#09090b',
              }}
            >
              <option value="+91">+91</option>
              <option value="+1">+1</option>
              <option value="+44">+44</option>
              <option value="+971">+971</option>
              <option value="+61">+61</option>
              <option value="+65">+65</option>
            </select>
            <input
              type="text"
              required
              disabled={isSubClient}
              readOnly={isSubClient}
              placeholder="Enter phone number"
              value={primaryPhone}
              onChange={(e) => setPrimaryPhone(e.target.value)}
              className="form-input"
              style={{
                flex: 1,
                fontSize: '0.8rem',
                height: '36px',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                cursor: isSubClient ? 'not-allowed' : undefined,
                color: '#09090b',
              }}
            />
          </div>
        </div>

        {/* Email Address */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
            Email Address <span style={{ color: '#09090b' }}>*</span>
          </label>
          <input
            type="email"
            required
            disabled={isSubClient}
            readOnly={isSubClient}
            placeholder="Enter email address"
            value={primaryEmail}
            onChange={(e) => setPrimaryEmail(e.target.value)}
            className="form-input"
            style={{
              fontSize: '0.8rem',
              height: '36px',
              border: '1px solid #d4d4d8',
              borderRadius: '4px',
              backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
              cursor: isSubClient ? 'not-allowed' : undefined,
              color: '#09090b',
            }}
          />
        </div>

        {/* Department / Designation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
            Department / Designation <span style={{ color: '#09090b' }}>*</span>
          </label>
          <input
            type="text"
            required
            disabled={isSubClient}
            readOnly={isSubClient}
            placeholder="Enter department or designation"
            value={primaryDepartment}
            onChange={(e) => setPrimaryDepartment(e.target.value)}
            className="form-input"
            style={{
              fontSize: '0.8rem',
              height: '36px',
              border: '1px solid #d4d4d8',
              borderRadius: '4px',
              backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
              cursor: isSubClient ? 'not-allowed' : undefined,
              color: '#09090b',
            }}
          />
        </div>
      </div>
    </div>
  );
}
