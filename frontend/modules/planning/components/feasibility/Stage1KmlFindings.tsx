'use client';

import React from 'react';
import { FileText, Paperclip, Lock } from 'lucide-react';
import { PlanningFormData } from './types';

interface Stage1KmlFindingsProps {
  formData: PlanningFormData;
  updateField: (field: keyof PlanningFormData, value: any) => void;
  backendKmlFile: { name: string; size: string } | null;
  isClient: boolean;
  isClosed: boolean;
  onShowToast: (msg: string) => void;
  children?: React.ReactNode;
}

export function Stage1KmlFindings({
  formData,
  updateField,
  backendKmlFile,
  isClient,
  isClosed,
  onShowToast,
  children,
}: Stage1KmlFindingsProps) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e4e4e7',
        borderRadius: '8px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            border: '1px solid #d4d4d8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fafafa',
          }}
        >
          <FileText size={18} color="#09090b" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
            1. KML Findings
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '0.2rem' }}>
            Review the submitted KML and verify area, boundaries and any anomalies.
          </p>
        </div>
      </div>

      {/* Client Submitted KML Reference Card */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
          Client Submitted KML
        </span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1rem',
            borderRadius: '6px',
            border: '1px solid #e4e4e7',
            backgroundColor: '#fafafa',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '4px',
                border: '1px solid #d4d4d8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff',
              }}
            >
              <Paperclip size={15} color="#09090b" />
            </div>
            <div>
              <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#09090b', display: 'block' }}>
                {formData.kmlFileName || backendKmlFile?.name || 'No KML file submitted by client'}
              </span>
              <span style={{ fontSize: '0.725rem', color: '#71717a' }}>
                {formData.kmlFileSize || backendKmlFile?.size || '—'}
              </span>
            </div>
          </div>

          {formData.kmlFileName || backendKmlFile?.name ? (
            <button
              type="button"
              onClick={() => onShowToast('Opening client submitted KML file...')}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: '#ffffff',
                border: '1px solid #09090b',
                borderRadius: '4px',
                color: '#09090b',
                cursor: 'pointer',
              }}
            >
              View File
            </button>
          ) : null}
        </div>
      </div>

      {/* Background Verification Input Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
          LATRICS Background Verification Check
        </span>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.85rem',
            padding: '1rem',
            borderRadius: '6px',
            border: '1px solid #e4e4e7',
            backgroundColor: isClient ? '#fafafa' : '#ffffff',
          }}
        >
          <div>
            <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span>Calculated Area (sq km)</span>
              {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
            </label>
            {isClient || isClosed ? (
              <div
                style={{
                  width: '100%',
                  minHeight: '34px',
                  padding: '0.45rem 0.65rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: '1px solid #e4e4e7',
                  borderRadius: '4px',
                  backgroundColor: '#fafafa',
                  color: '#09090b',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'default',
                }}
              >
                {formData.kmlCalculatedArea ? `${formData.kmlCalculatedArea} sq km` : '—'}
              </div>
            ) : (
              <input
                type="number"
                value={formData.kmlCalculatedArea}
                onChange={(e) => updateField('kmlCalculatedArea', e.target.value)}
                placeholder="—"
                style={{
                  width: '100%',
                  height: '34px',
                  padding: '0 0.65rem',
                  fontSize: '0.8rem',
                  border: '1px solid #d4d4d8',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  color: '#09090b',
                }}
              />
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span>Requested Area (sq km)</span>
              {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
            </label>
            {isClient || isClosed ? (
              <div
                style={{
                  width: '100%',
                  minHeight: '34px',
                  padding: '0.45rem 0.65rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: '1px solid #e4e4e7',
                  borderRadius: '4px',
                  backgroundColor: '#fafafa',
                  color: '#09090b',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'default',
                }}
              >
                {formData.kmlRequestedArea ? `${formData.kmlRequestedArea} sq km` : '—'}
              </div>
            ) : (
              <input
                type="number"
                value={formData.kmlRequestedArea}
                onChange={(e) => updateField('kmlRequestedArea', e.target.value)}
                placeholder="—"
                style={{
                  width: '100%',
                  height: '34px',
                  padding: '0 0.65rem',
                  fontSize: '0.8rem',
                  border: '1px solid #d4d4d8',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  color: '#09090b',
                }}
              />
            )}
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span>Boundary &amp; Dispute Notes</span>
              {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
            </label>
            {isClient || isClosed ? (
              <div
                style={{
                  width: '100%',
                  minHeight: '34px',
                  padding: '0.45rem 0.65rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: '1px solid #e4e4e7',
                  borderRadius: '4px',
                  backgroundColor: '#fafafa',
                  color: '#09090b',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'default',
                }}
              >
                {formData.kmlBoundaryStatus || '—'}
              </div>
            ) : (
              <input
                type="text"
                value={formData.kmlBoundaryStatus}
                onChange={(e) => updateField('kmlBoundaryStatus', e.target.value)}
                placeholder="Enter verified boundary observations or dispute findings..."
                style={{
                  width: '100%',
                  height: '34px',
                  padding: '0 0.65rem',
                  fontSize: '0.8rem',
                  border: '1px solid #d4d4d8',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  color: '#09090b',
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Universal Remarks & Discussion Thread for Stage 1 */}
      {children}
    </div>
  );
}
