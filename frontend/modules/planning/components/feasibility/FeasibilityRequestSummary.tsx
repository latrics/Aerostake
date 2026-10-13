'use client';

import React from 'react';
import { FileText, MessageSquare } from 'lucide-react';

interface FeasibilityRequestSummaryProps {
  displayRequestId: string;
  displayProjectName: string;
  displayClientCompany: string;
  displayLocation: string;
  displayArea: string;
  displayPayload: string;
  displayDeliverables: string;
  displayStatus: string;
  role: string;
  onShowToast: (msg: string) => void;
}

export function FeasibilityRequestSummary({
  displayRequestId,
  displayProjectName,
  displayClientCompany,
  displayLocation,
  displayArea,
  displayPayload,
  displayDeliverables,
  displayStatus,
  role,
  onShowToast,
}: FeasibilityRequestSummaryProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e4e4e7',
          borderRadius: '8px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.65rem' }}>
          <FileText size={16} color="#09090b" />
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
            Request Summary
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.775rem' }}>
          <div>
            <span style={{ color: '#71717a', display: 'block', fontSize: '0.7rem' }}>Request ID</span>
            <strong style={{ color: '#09090b' }}>{displayRequestId}</strong>
          </div>

          <div>
            <span style={{ color: '#71717a', display: 'block', fontSize: '0.7rem' }}>Project Name</span>
            <strong style={{ color: '#09090b' }}>{displayProjectName}</strong>
          </div>

          <div>
            <span style={{ color: '#71717a', display: 'block', fontSize: '0.7rem' }}>Client Company</span>
            <strong style={{ color: '#09090b' }}>{displayClientCompany}</strong>
          </div>

          <div>
            <span style={{ color: '#71717a', display: 'block', fontSize: '0.7rem' }}>Location</span>
            <strong style={{ color: '#09090b', lineHeight: 1.3, display: 'block' }}>
              {displayLocation}
            </strong>
          </div>

          <div>
            <span style={{ color: '#71717a', display: 'block', fontSize: '0.7rem' }}>Area to Cover</span>
            <strong style={{ color: '#09090b' }}>{displayArea}</strong>
          </div>

          <div>
            <span style={{ color: '#71717a', display: 'block', fontSize: '0.7rem' }}>Requested Payload</span>
            <strong style={{ color: '#09090b' }}>{displayPayload}</strong>
          </div>

          <div>
            <span style={{ color: '#71717a', display: 'block', fontSize: '0.7rem' }}>Requested Deliverables</span>
            <strong style={{ color: '#09090b' }}>{displayDeliverables}</strong>
          </div>

          <div style={{ paddingTop: '0.25rem' }}>
            <span style={{ color: '#71717a', display: 'block', fontSize: '0.7rem', marginBottom: '0.25rem' }}>Current Status</span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid #d4d4d8',
                backgroundColor: '#f4f4f5',
                color: '#09090b',
                display: 'inline-block',
              }}
            >
              {displayStatus}
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e4e4e7',
          borderRadius: '8px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={15} color="#09090b" />
          <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b' }}>
            Need Help?
          </span>
        </div>

        <p style={{ fontSize: '0.725rem', color: '#71717a', lineHeight: 1.35, margin: 0 }}>
          {role === 'client'
            ? 'Have questions about these planning stages? Reply directly in the remark threads or contact LATRICS support.'
            : 'If you need additional information, you can request clarification or contact the client.'}
        </p>

        <button
          type="button"
          onClick={() => onShowToast(role === 'client' ? 'Support contact request noted.' : 'Internal note modal requested.')}
          style={{
            width: '100%',
            padding: '0.45rem 0.5rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            backgroundColor: '#ffffff',
            border: '1px solid #09090b',
            borderRadius: '6px',
            color: '#09090b',
            cursor: 'pointer',
          }}
        >
          {role === 'client' ? 'Contact Support' : 'Add Internal Note'}
        </button>
      </div>
    </div>
  );
}
