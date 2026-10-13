'use client';

import React from 'react';

interface ProjectRemarksSectionProps {
  remarks: string;
  setRemarks: (val: string) => void;
  isReadOnly?: boolean;
}

export function ProjectRemarksSection({
  remarks,
  setRemarks,
  isReadOnly,
}: ProjectRemarksSectionProps) {
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
      <div>
        <h2 className="wf-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b' }}>
          8. Remarks / Instructions
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
          Provide any specific instructions or additional information (Optional).
        </p>
      </div>

      <div style={{ position: 'relative' }}>
        <textarea
          rows={4}
          maxLength={1000}
          disabled={isReadOnly}
          placeholder="Enter your message..."
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          className="form-textarea"
          style={{
            fontSize: '0.8rem',
            resize: 'vertical',
            width: '100%',
            padding: '0.75rem',
            paddingBottom: '1.75rem',
            border: '1px solid #d4d4d8',
            borderRadius: '6px',
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        <span
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '12px',
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            fontWeight: 500,
            pointerEvents: 'none',
          }}
        >
          {remarks.length}/1000
        </span>
      </div>
    </div>
  );
}
