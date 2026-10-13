'use client';

import React from 'react';
import { CheckCircle2, Check, Lock, Loader2 } from 'lucide-react';
import { PlanningFormData } from './types';

interface ClientMobilizationCardProps {
  formData: PlanningFormData;
  displayArea: string;
  isClosed: boolean;
  role: string;
  clientDeclarationConfirmed: boolean;
  setClientDeclarationConfirmed: (confirmed: boolean) => void;
  isMobilizingTransitioning: boolean;
  handleConfirmClientDeclaration: () => Promise<void>;
}

export function ClientMobilizationCard({
  formData,
  displayArea,
  isClosed,
  role,
  clientDeclarationConfirmed,
  setClientDeclarationConfirmed,
  isMobilizingTransitioning,
  handleConfirmClientDeclaration,
}: ClientMobilizationCardProps) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: isClosed ? '1.5px solid #09090b' : '2px solid #09090b',
        borderRadius: '8px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              backgroundColor: '#09090b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                Client Acknowledgement &amp; Mobilization Sign-off
              </h3>
              {isClosed && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    backgroundColor: '#f4f4f5',
                    color: '#09090b',
                    border: '1px solid #d4d4d8',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <Check size={12} strokeWidth={3} /> Confirmed &amp; Signed
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.8rem', color: '#71717a', margin: '0.2rem 0 0' }}>
              {isClosed
                ? 'The client reviewed and confirmed agreement to the operational plan (Sections 1–7), scope parameters, safety mitigations, and mobilization terms. This project was officially approved and advanced to the Mobilizing Phase.'
                : 'LATRICS Ops has verified Sections 1–7 and determined this project is feasible to proceed. Please review the operational parameters below and confirm agreement to initiate the Mobilizing Phase.'}
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
          backgroundColor: '#fafafa',
          border: '1px solid #e4e4e7',
          borderRadius: '6px',
          padding: '1rem',
        }}
      >
        <div>
          <span style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>Survey Area</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#09090b', display: 'block', marginTop: '0.15rem' }}>
            {formData.kmlCalculatedArea ? `${formData.kmlCalculatedArea} sq km` : displayArea}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>Planned Altitude</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#09090b', display: 'block', marginTop: '0.15rem' }}>
            {formData.plannedAltitudeMeters ? `${formData.plannedAltitudeMeters} m AGL` : '—'}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>Estimated Field Days</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#09090b', display: 'block', marginTop: '0.15rem' }}>
            {formData.expectedSurveyDays ? `${formData.expectedSurveyDays} Days` : '—'}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>Deliverable Timeline</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#09090b', display: 'block', marginTop: '0.15rem' }}>
            {formData.dataDeliveryTimelineDays ? `${formData.dataDeliveryTimelineDays} Days Post-Flight` : '—'}
          </span>
        </div>
      </div>

      {isClosed ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.15rem',
            border: '1.5px solid #09090b',
            borderRadius: '6px',
            backgroundColor: '#fafafa',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '4px',
                backgroundColor: '#09090b',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Check size={14} strokeWidth={3} />
            </div>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#09090b' }}>
              Client Confirmed: Complete operational plan (Sections 1–7) reviewed and agreed to parameters, scopes, safety mitigations, and mobilization terms.
            </span>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '4px',
              backgroundColor: '#09090b',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.01em',
            }}
          >
            <Lock size={12} /> Agreed &amp; Mobilized
          </span>
        </div>
      ) : role === 'client' ? (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.85rem 1rem',
              border: '1.5px dashed #09090b',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
            }}
          >
            <input
              type="checkbox"
              id="client-declaration-check"
              checked={clientDeclarationConfirmed}
              onChange={(e) => setClientDeclarationConfirmed(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#09090b' }}
            />
            <label htmlFor="client-declaration-check" style={{ fontSize: '0.825rem', fontWeight: 700, color: '#09090b', cursor: 'pointer' }}>
              I confirm that I have reviewed the complete operational plan (Sections 1–7) and agree to the planning parameters, scopes, safety mitigations, and mobilization terms.
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              disabled={!clientDeclarationConfirmed || isMobilizingTransitioning}
              onClick={handleConfirmClientDeclaration}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                height: '40px',
                padding: '0 1.5rem',
                fontSize: '0.85rem',
                fontWeight: 800,
                backgroundColor: clientDeclarationConfirmed ? '#09090b' : '#f4f4f5',
                color: clientDeclarationConfirmed ? '#ffffff' : '#a1a1aa',
                border: clientDeclarationConfirmed ? '1px solid #09090b' : '1px solid #d4d4d8',
                borderRadius: '6px',
                cursor: clientDeclarationConfirmed ? 'pointer' : 'not-allowed',
              }}
            >
              {isMobilizingTransitioning ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
              <span>{isMobilizingTransitioning ? 'Advancing to Mobilization...' : 'Confirm Agreement & Proceed to Mobilizing Phase'}</span>
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
