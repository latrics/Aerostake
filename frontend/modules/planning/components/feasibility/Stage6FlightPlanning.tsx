'use client';

import React from 'react';
import { Plane, Lock } from 'lucide-react';
import { PlanningFormData } from './types';

interface Stage6FlightPlanningProps {
  formData: PlanningFormData;
  updateField: (field: keyof PlanningFormData, value: any) => void;
  isClient: boolean;
  isClosed: boolean;
  children?: React.ReactNode;
}

export function Stage6FlightPlanning({
  formData,
  updateField,
  isClient,
  isClosed,
  children,
}: Stage6FlightPlanningProps) {
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
          <Plane size={18} color="#09090b" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
            6. Flight Planning
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '0.2rem' }}>
            Drone flight altitude, overlaps, and mission flights.
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
          padding: '1rem',
          borderRadius: '6px',
          border: '1px solid #e4e4e7',
          backgroundColor: isClient ? '#fafafa' : '#ffffff',
          alignItems: 'stretch',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', minHeight: '2.2rem', lineHeight: 1.35, marginBottom: '0.35rem' }}>
            <span>No. of Landings</span>
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
              {formData.numberOfLandings || '—'}
            </div>
          ) : (
            <input
              type="number"
              value={formData.numberOfLandings}
              onChange={(e) => updateField('numberOfLandings', e.target.value)}
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

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', minHeight: '2.2rem', lineHeight: 1.35, marginBottom: '0.35rem' }}>
            <span>Planned Altitude (m AGL)</span>
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
              {formData.plannedAltitudeMeters ? `${formData.plannedAltitudeMeters} m AGL` : '—'}
            </div>
          ) : (
            <input
              type="number"
              value={formData.plannedAltitudeMeters}
              onChange={(e) => updateField('plannedAltitudeMeters', e.target.value)}
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

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', minHeight: '2.2rem', lineHeight: 1.35, marginBottom: '0.35rem' }}>
            <span>Front Overlap (%)</span>
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
              {formData.frontOverlapPercent ? `${formData.frontOverlapPercent}%` : '—'}
            </div>
          ) : (
            <input
              type="number"
              value={formData.frontOverlapPercent}
              onChange={(e) => updateField('frontOverlapPercent', e.target.value)}
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

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', minHeight: '2.2rem', lineHeight: 1.35, marginBottom: '0.35rem' }}>
            <span>Side Overlap (%)</span>
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
              {formData.sideOverlapPercent ? `${formData.sideOverlapPercent}%` : '—'}
            </div>
          ) : (
            <input
              type="number"
              value={formData.sideOverlapPercent}
              onChange={(e) => updateField('sideOverlapPercent', e.target.value)}
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
      </div>

      {/* Universal Remarks & Discussion Thread for Stage 6 */}
      {children}
    </div>
  );
}
