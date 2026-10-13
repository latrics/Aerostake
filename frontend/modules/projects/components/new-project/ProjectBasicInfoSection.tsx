'use client';

import React from 'react';
import { INDIAN_STATES } from '@/modules/users/constants';

interface ProjectBasicInfoSectionProps {
  projectName: string;
  setProjectName: (val: string) => void;
  locationAddress: string;
  setLocationAddress: (val: string) => void;
  city: string;
  setCity: (val: string) => void;
  state: string;
  setState: (val: string) => void;
  requestedAreaSqKm: string;
  setRequestedAreaSqKm: (val: string) => void;
  isReadOnly?: boolean;
}

export function ProjectBasicInfoSection({
  projectName,
  setProjectName,
  locationAddress,
  setLocationAddress,
  city,
  setCity,
  state,
  setState,
  requestedAreaSqKm,
  setRequestedAreaSqKm,
  isReadOnly,
}: ProjectBasicInfoSectionProps) {
  return (
    <div
      className="wf-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e4e4e7',
        padding: '1.25rem',
      }}
    >
      <h2 className="wf-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b' }}>
        1. Project Details
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#09090b' }}>
          Project Name <span style={{ color: '#09090b' }}>*</span>
        </label>
        <input
          type="text"
          required
          disabled={isReadOnly}
          placeholder="Enter project name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="form-input"
          style={{
            fontSize: '0.825rem',
            height: '38px',
            border: '1px solid #d4d4d8',
            borderRadius: '6px',
            padding: '0 0.75rem',
          }}
        />
      </div>

      {/* Project Location (Address) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#09090b' }}>
          Project Location <span style={{ color: '#09090b' }}>*</span>
          <span style={{ fontSize: '0.725rem', fontWeight: 400, color: '#71717a', marginLeft: '0.45rem' }}>
            (Enter the physical site address — do not use company or project name)
          </span>
        </label>
        <input
          type="text"
          required
          disabled={isReadOnly}
          placeholder="Enter physical site address (e.g. Plot 42, Sector 18, Phase 1 Industrial Area)"
          value={locationAddress}
          onChange={(e) => setLocationAddress(e.target.value)}
          className="form-input"
          style={{
            fontSize: '0.825rem',
            height: '38px',
            border: '1px solid #d4d4d8',
            borderRadius: '6px',
            padding: '0 0.75rem',
          }}
        />
      </div>

      {/* City and State */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#09090b' }}>
            City <span style={{ color: '#09090b' }}>*</span>
          </label>
          <input
            type="text"
            required
            disabled={isReadOnly}
            placeholder="Enter city (e.g. Bengaluru, Mumbai, Ahmedabad)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="form-input"
            style={{
              fontSize: '0.825rem',
              height: '38px',
              border: '1px solid #d4d4d8',
              borderRadius: '6px',
              padding: '0 0.75rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#09090b' }}>
            State <span style={{ color: '#09090b' }}>*</span>
          </label>
          <select
            required
            disabled={isReadOnly}
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="form-select"
            style={{
              fontSize: '0.825rem',
              height: '38px',
              border: '1px solid #d4d4d8',
              borderRadius: '6px',
              padding: '0 0.75rem',
              backgroundColor: '#ffffff',
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
      </div>

      {/* Requested Area (sq. Km) Scanning */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.25rem' }}>
        <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#09090b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>Requested Area (sq. Km) Scanning</span>
          <span style={{ color: '#09090b' }}>*</span>
          <span style={{ fontSize: '0.725rem', fontWeight: 400, color: '#71717a', marginLeft: '0.25rem' }}>
            (How many square kilometers are requested for scanning and mapping)
          </span>
        </label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          required
          disabled={isReadOnly}
          placeholder="e.g. 25.5"
          value={requestedAreaSqKm}
          onChange={(e) => setRequestedAreaSqKm(e.target.value)}
          className="form-input"
          style={{
            fontSize: '0.825rem',
            height: '38px',
            border: '1px solid #d4d4d8',
            borderRadius: '6px',
            padding: '0 0.75rem',
            maxWidth: '320px',
          }}
        />
      </div>
    </div>
  );
}
