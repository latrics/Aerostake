'use client';

import React from 'react';
import { Calendar, Lock } from 'lucide-react';
import { INDUSTRIES, COMPANY_TYPES } from '../constants';

interface CompanyProfileInformationSectionProps {
  isSubClient: boolean;
  companyName: string;
  setCompanyName: (val: string) => void;
  industry: string;
  setIndustry: (val: string) => void;
  companyType: string;
  setCompanyType: (val: string) => void;
  gstNumber: string;
  setGstNumber: (val: string) => void;
  registrationNumber: string;
  setRegistrationNumber: (val: string) => void;
  yearOfEstablishment: string;
  setYearOfEstablishment: (val: string) => void;
  website: string;
  setWebsite: (val: string) => void;
  companyDescription: string;
  setCompanyDescription: (val: string) => void;
}

export function CompanyProfileInformationSection({
  isSubClient,
  companyName,
  setCompanyName,
  industry,
  setIndustry,
  companyType,
  setCompanyType,
  gstNumber,
  setGstNumber,
  registrationNumber,
  setRegistrationNumber,
  yearOfEstablishment,
  setYearOfEstablishment,
  website,
  setWebsite,
  companyDescription,
  setCompanyDescription,
}: CompanyProfileInformationSectionProps) {
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
            1. Company Information
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            Provide your company&apos;s basic details.
          </p>
        </div>
        {isSubClient && (
          <span style={{ fontSize: '0.72rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Lock size={12} /> Managed by Primary Client
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        {/* Company Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
            Company Name <span style={{ color: '#09090b' }}>*</span>
          </label>
          <input
            type="text"
            required
            disabled={isSubClient}
            readOnly={isSubClient}
            placeholder="Enter company name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
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

        {/* Industry / Sector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
            Industry / Sector <span style={{ color: '#09090b' }}>*</span>
          </label>
          <select
            required
            disabled={isSubClient}
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
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
            <option value="">Select industry</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>

        {/* Company Type */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
            Company Type <span style={{ color: '#09090b' }}>*</span>
          </label>
          <select
            required
            disabled={isSubClient}
            value={companyType}
            onChange={(e) => setCompanyType(e.target.value)}
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
            <option value="">Select company type</option>
            {COMPANY_TYPES.map((ct) => (
              <option key={ct} value={ct}>
                {ct}
              </option>
            ))}
          </select>
        </div>

        {/* GST Number */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
            GST Number (Optional)
          </label>
          <input
            type="text"
            disabled={isSubClient}
            readOnly={isSubClient}
            placeholder="Enter GST number"
            value={gstNumber}
            onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
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

        {/* Registration Number */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
            Registration Number (Optional)
          </label>
          <input
            type="text"
            disabled={isSubClient}
            readOnly={isSubClient}
            placeholder="Enter registration number"
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value)}
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

        {/* Year of Establishment */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
            Year of Establishment (Optional)
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              disabled={isSubClient}
              readOnly={isSubClient}
              placeholder="Select year"
              value={yearOfEstablishment}
              onChange={(e) => setYearOfEstablishment(e.target.value)}
              className="form-input"
              style={{
                fontSize: '0.8rem',
                height: '36px',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                paddingRight: '2rem',
                backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                cursor: isSubClient ? 'not-allowed' : undefined,
                color: '#09090b',
              }}
            />
            <Calendar size={16} color="#71717a" style={{ position: 'absolute', right: '10px', top: '10px' }} />
          </div>
        </div>

        {/* Website */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
            Website (Optional)
          </label>
          <input
            type="text"
            disabled={isSubClient}
            readOnly={isSubClient}
            placeholder="https://www.yourcompany.com"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
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

        {/* Company Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
            Company Description (Optional)
          </label>
          <div style={{ position: 'relative' }}>
            <textarea
              rows={3}
              maxLength={500}
              disabled={isSubClient}
              readOnly={isSubClient}
              placeholder="Enter a brief description about your company..."
              value={companyDescription}
              onChange={(e) => setCompanyDescription(e.target.value)}
              className="form-textarea"
              style={{
                fontSize: '0.8rem',
                resize: 'vertical',
                width: '100%',
                padding: '0.65rem',
                paddingBottom: '1.5rem',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                fontFamily: 'inherit',
                outline: 'none',
                backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                cursor: isSubClient ? 'not-allowed' : undefined,
                color: '#09090b',
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '10px',
                fontSize: '0.675rem',
                color: 'var(--text-muted)',
              }}
            >
              {companyDescription.length}/500
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
