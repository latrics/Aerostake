'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { INDIAN_STATES } from '../constants';

interface CompanyProfileAddressSectionProps {
  isSubClient: boolean;
  addressLine1: string;
  setAddressLine1: (val: string) => void;
  addressLine2: string;
  setAddressLine2: (val: string) => void;
  city: string;
  setCity: (val: string) => void;
  pinCode: string;
  setPinCode: (val: string) => void;
  state: string;
  setState: (val: string) => void;
  country: string;
  setCountry: (val: string) => void;
}

export function CompanyProfileAddressSection({
  isSubClient,
  addressLine1,
  setAddressLine1,
  addressLine2,
  setAddressLine2,
  city,
  setCity,
  pinCode,
  setPinCode,
  state,
  setState,
  country,
  setCountry,
}: CompanyProfileAddressSectionProps) {
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
            2. Company Address
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            Provide your official business address.
          </p>
        </div>
        {isSubClient && (
          <span style={{ fontSize: '0.72rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Lock size={12} /> Managed by Primary Client
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        {/* Address Line 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
            Address Line 1 <span style={{ color: '#09090b' }}>*</span>
          </label>
          <input
            type="text"
            required
            disabled={isSubClient}
            readOnly={isSubClient}
            placeholder="Enter address line 1"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
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

        {/* Address Line 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
            Address Line 2 (Optional)
          </label>
          <input
            type="text"
            disabled={isSubClient}
            readOnly={isSubClient}
            placeholder="Enter address line 2"
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
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

        {/* City */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
            City <span style={{ color: '#09090b' }}>*</span>
          </label>
          <input
            type="text"
            required
            disabled={isSubClient}
            readOnly={isSubClient}
            placeholder="Enter city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
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

        {/* PIN / Postal Code */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
            PIN / Postal Code <span style={{ color: '#09090b' }}>*</span>
          </label>
          <input
            type="text"
            required
            disabled={isSubClient}
            readOnly={isSubClient}
            placeholder="Enter PIN code"
            value={pinCode}
            onChange={(e) => setPinCode(e.target.value)}
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

        {/* State */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
            State <span style={{ color: '#09090b' }}>*</span>
          </label>
          <select
            required
            disabled={isSubClient}
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="form-select"
            style={{
              fontSize: '0.8rem',
              height: '36px',
              border: '1px solid #d4d4d8',
              borderRadius: '4px',
              backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
              cursor: isSubClient ? 'not-allowed' : undefined,
              color: '#09090b',
            }}
          >
            <option value="">Select state</option>
            {INDIAN_STATES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Country */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
            Country <span style={{ color: '#09090b' }}>*</span>
          </label>
          <select
            required
            disabled={isSubClient}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="form-select"
            style={{
              fontSize: '0.8rem',
              height: '36px',
              border: '1px solid #d4d4d8',
              borderRadius: '4px',
              backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
              cursor: isSubClient ? 'not-allowed' : undefined,
              color: '#09090b',
            }}
          >
            <option value="India">India</option>
            <option value="United States">United States</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="United Arab Emirates">United Arab Emirates</option>
            <option value="Australia">Australia</option>
            <option value="Singapore">Singapore</option>
            <option value="Germany">Germany</option>
            <option value="Canada">Canada</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
    </div>
  );
}
