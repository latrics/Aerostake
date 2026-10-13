'use client';

import React from 'react';
import { MapPin, Lock, Paperclip, Download, X, Upload } from 'lucide-react';
import { PlanningFormData } from './types';

interface Stage5GcpPlanningProps {
  formData: PlanningFormData;
  updateField: (field: keyof PlanningFormData, value: any) => void;
  isClient: boolean;
  isClosed: boolean;
  children?: React.ReactNode;
}

export function Stage5GcpPlanning({
  formData,
  updateField,
  isClient,
  isClosed,
  children,
}: Stage5GcpPlanningProps) {
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
          <MapPin size={18} color="#09090b" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
            5. GCP Planning
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '0.2rem' }}>
            Ground Control Points network, target specifications, and base station benchmark setup.
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          padding: '1.25rem',
          borderRadius: '6px',
          border: '1px solid #e4e4e7',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Top 3 fields: No. of GCP needed, GCP target size in cm, GCP material */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
          }}
        >
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span>No. of GCP needed</span>
              {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
            </label>
            {isClient || isClosed ? (
              <div
                style={{
                  width: '100%',
                  minHeight: '36px',
                  padding: '0 0.75rem',
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
                {formData.gcpsNeeded || '—'}
              </div>
            ) : (
              <input
                type="number"
                value={formData.gcpsNeeded}
                onChange={(e) => updateField('gcpsNeeded', e.target.value)}
                placeholder="—"
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 0.75rem',
                  fontSize: '0.8rem',
                  border: '1px solid #d4d4d8',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  color: '#09090b',
                  outline: 'none',
                }}
              />
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span>GCP target size in cm</span>
              {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
            </label>
            {isClient || isClosed ? (
              <div
                style={{
                  width: '100%',
                  minHeight: '36px',
                  padding: '0 0.75rem',
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
                {formData.gcpTargetSizeCm ? `${formData.gcpTargetSizeCm} cm` : '—'}
              </div>
            ) : (
              <input
                type="number"
                value={formData.gcpTargetSizeCm}
                onChange={(e) => updateField('gcpTargetSizeCm', e.target.value)}
                placeholder="—"
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 0.75rem',
                  fontSize: '0.8rem',
                  border: '1px solid #d4d4d8',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  color: '#09090b',
                  outline: 'none',
                }}
              />
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span>GCP material</span>
              {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
            </label>
            {isClient || isClosed ? (
              <div
                style={{
                  width: '100%',
                  minHeight: '36px',
                  padding: '0 0.75rem',
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
                {formData.gcpTargetMaterial || '—'}
              </div>
            ) : (
              <input
                type="text"
                value={formData.gcpTargetMaterial}
                onChange={(e) => updateField('gcpTargetMaterial', e.target.value)}
                placeholder="—"
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 0.75rem',
                  fontSize: '0.8rem',
                  border: '1px solid #d4d4d8',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  color: '#09090b',
                  outline: 'none',
                }}
              />
            )}
          </div>
        </div>

        {/* Field 4: GCP location : (Attachments input type) */}
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span>GCP location (Attachments)</span>
            {isClient && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
          </label>

          {formData.gcpLocationFile ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                border: '1px solid #18181b',
                borderRadius: '4px',
                backgroundColor: '#fafafa',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '4px',
                    border: '1px solid #d4d4d8',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Paperclip size={14} color="#09090b" />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                    {formData.gcpLocationFile}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#71717a' }}>
                    GCP Location File attached
                  </div>
                </div>
              </div>

              {isClient ? (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    border: '1px solid #d4d4d8',
                    borderRadius: '4px',
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#09090b',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <Download size={13} />
                  Attached
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => updateField('gcpLocationFile', '')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'none',
                    border: '1px solid #e4e4e7',
                    borderRadius: '4px',
                    padding: '0.3rem 0.6rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#09090b',
                  }}
                >
                  <X size={13} />
                  Remove
                </button>
              )}
            </div>
          ) : isClient ? (
            <div
              style={{
                padding: '1.25rem 1rem',
                borderRadius: '6px',
                border: '1px dashed #d4d4d8',
                backgroundColor: '#fafafa',
                textAlign: 'center',
                color: '#71717a',
                fontSize: '0.775rem',
              }}
            >
              No GCP location coordinates file attached by LATRICS Operations for this survey.
            </div>
          ) : (
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem 1rem',
                border: '1.5px dashed #d4d4d8',
                borderRadius: '6px',
                backgroundColor: '#fafafa',
                cursor: 'pointer',
                gap: '0.4rem',
              }}
            >
              <input
                type="file"
                accept=".csv,.kml,.kmz,.geojson,.txt,.pdf,.xlsx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    updateField('gcpLocationFile', file.name);
                  }
                }}
                style={{ display: 'none' }}
              />
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: '1px solid #e4e4e7',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Upload size={16} color="#09090b" />
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#09090b' }}>
                Click to upload GCP location file or drag and drop
              </div>
              <div style={{ fontSize: '0.725rem', color: '#71717a' }}>
                Supports CSV, KML, KMZ, GeoJSON, TXT, or coordinates sheet
              </div>
            </label>
          )}
        </div>
      </div>

      {/* Universal Remarks & Discussion Thread for Stage 5 */}
      {children}
    </div>
  );
}
