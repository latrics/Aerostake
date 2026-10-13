'use client';

import React from 'react';

interface ProjectScheduleSectionProps {
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  tenureDays: number;
  isReadOnly?: boolean;
}

export function ProjectScheduleSection({
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  tenureDays,
  isReadOnly,
}: ProjectScheduleSectionProps) {
  return (
    <div
      className="wf-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e4e4e7',
        padding: '1.25rem',
      }}
    >
      <h2 className="wf-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b' }}>
        5. Schedule
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#09090b' }}>
            Expected Start Date <span style={{ color: '#09090b' }}>*</span>
          </label>
          <input
            type="date"
            required
            disabled={isReadOnly}
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="form-input"
            style={{
              fontSize: '0.8rem',
              height: '36px',
              border: '1px solid #d4d4d8',
              borderRadius: '4px',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#09090b' }}>
            Expected End Date <span style={{ color: '#09090b' }}>*</span>
          </label>
          <input
            type="date"
            required
            disabled={isReadOnly}
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="form-input"
            style={{
              fontSize: '0.8rem',
              height: '36px',
              border: '1px solid #d4d4d8',
              borderRadius: '4px',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Tenure
        </label>
        <input
          type="text"
          readOnly
          value={`${tenureDays} Days`}
          className="form-input"
          style={{
            fontSize: '0.8rem',
            height: '36px',
            backgroundColor: '#f4f4f5',
            color: '#52525b',
            fontWeight: 600,
            border: '1px solid #e4e4e7',
            borderRadius: '4px',
          }}
        />
      </div>
    </div>
  );
}
