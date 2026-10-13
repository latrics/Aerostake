'use client';

import React from 'react';
import { Compass, Check, Lock } from 'lucide-react';
import { PlanningFormData } from './types';

interface Stage3AccessibilityProps {
  formData: PlanningFormData;
  updateField: (field: keyof PlanningFormData, value: any) => void;
  toggleArrayItem: (field: 'airspaceZones' | 'weatherConditions' | 'hazards' | 'terrainTypes', item: string) => void;
  isClient: boolean;
  isClosed: boolean;
  children?: React.ReactNode;
}

export function Stage3Accessibility({
  formData,
  updateField,
  toggleArrayItem,
  isClient,
  isClosed,
  children,
}: Stage3AccessibilityProps) {
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
          <Compass size={18} color="#09090b" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
            3. Accessibility &amp; Feasibility
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '0.2rem' }}>
            Physical terrain, elevation variation, weather conditions, and site takeoff access.
          </p>
        </div>
      </div>

      {/* Terrain, Elevation, Weather & Access Grid */}
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
        {/* Row 1: Aligned Two-Column Section for Multi-Selects */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.25rem',
          }}
        >
          {/* Left: Terrain Type (Multiple selection) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              padding: '1rem',
              borderRadius: '6px',
              border: '1px solid #e4e4e7',
              backgroundColor: '#fafafa',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                Terrain Type
              </label>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#71717a', backgroundColor: '#ffffff', padding: '0.15rem 0.5rem', borderRadius: '3px', border: '1px solid #e4e4e7' }}>
                Multiple Selection
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
              }}
            >
              {['Flat', 'Hilly', 'Urban', 'Forest', 'Mixed'].map((item) => {
                const isSel = (formData.terrainTypes || []).includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    disabled={isClient}
                    onClick={() => !isClient && toggleArrayItem('terrainTypes', item)}
                    style={{
                      height: '34px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      fontSize: '0.775rem',
                      borderRadius: '4px',
                      border: isSel ? '1.5px solid #09090b' : '1px solid #d4d4d8',
                      backgroundColor: isSel ? '#09090b' : '#ffffff',
                      color: isSel ? '#ffffff' : '#09090b',
                      fontWeight: isSel ? 700 : 500,
                      cursor: isClient ? 'default' : 'pointer',
                      opacity: isClient && !isSel ? 0.65 : 1,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isSel && <Check size={12} color="#ffffff" strokeWidth={3} />}
                    <span>{item}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Weather Conditions (Multiple selection) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              padding: '1rem',
              borderRadius: '6px',
              border: '1px solid #e4e4e7',
              backgroundColor: '#fafafa',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                Weather Conditions
              </label>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#71717a', backgroundColor: '#ffffff', padding: '0.15rem 0.5rem', borderRadius: '3px', border: '1px solid #e4e4e7' }}>
                Multiple Selection
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
              }}
            >
              {['Rainy', 'Foggy', 'Extreme Temp', 'Windy', 'Mixed'].map((item) => {
                const isSel = (formData.weatherConditions || []).includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    disabled={isClient}
                    onClick={() => !isClient && toggleArrayItem('weatherConditions', item)}
                    style={{
                      height: '34px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      fontSize: '0.775rem',
                      borderRadius: '4px',
                      border: isSel ? '1.5px solid #09090b' : '1px solid #d4d4d8',
                      backgroundColor: isSel ? '#09090b' : '#ffffff',
                      color: isSel ? '#ffffff' : '#09090b',
                      fontWeight: isSel ? 700 : 500,
                      cursor: isClient ? 'default' : 'pointer',
                      opacity: isClient && !isSel ? 0.65 : 1,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isSel && <Check size={12} color="#ffffff" strokeWidth={3} />}
                    <span>{item}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 2: Aligned Two-Column Section for Metrics & Site Access */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.25rem',
          }}
        >
          {/* Left: Elevation Variation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Elevation Variation (meters)</span>
              {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
            </label>
            {isClient || isClosed ? (
              <div
                style={{
                  width: '100%',
                  minHeight: '38px',
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
                {formData.elevationVariationMeters ? `${formData.elevationVariationMeters} meters` : '—'}
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  value={formData.elevationVariationMeters}
                  onChange={(e) => updateField('elevationVariationMeters', e.target.value)}
                  placeholder="—"
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 3.5rem 0 0.75rem',
                    fontSize: '0.8rem',
                    border: '1px solid #d4d4d8',
                    borderRadius: '4px',
                    backgroundColor: '#ffffff',
                    color: '#09090b',
                    outline: 'none',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '0.725rem',
                    fontWeight: 600,
                    color: '#71717a',
                  }}
                >
                  meters
                </span>
              </div>
            )}
            <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
              Estimated maximum height delta across survey boundary.
            </span>
          </div>

          {/* Right: Take-off & Landing Access */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Site Access &amp; Launch Safety</span>
              {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
            </label>
            {isClient || isClosed ? (
              <div
                style={{
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0 0.85rem',
                  borderRadius: '4px',
                  border: '1px solid #e4e4e7',
                  backgroundColor: '#fafafa',
                  cursor: 'default',
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '3px',
                    border: formData.fieldAccessIdentified ? '1.5px solid #09090b' : '1px solid #d4d4d8',
                    backgroundColor: formData.fieldAccessIdentified ? '#09090b' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {formData.fieldAccessIdentified && <Check size={11} color="#ffffff" strokeWidth={3} />}
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#09090b' }}>
                  {formData.fieldAccessIdentified ? 'Take-off and Landing Access Identified (Verified)' : 'Take-off and Landing Access Not Identified'}
                </span>
              </div>
            ) : (
              <label
                htmlFor="field-access-check"
                style={{
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0 0.85rem',
                  borderRadius: '4px',
                  border: formData.fieldAccessIdentified ? '1.5px solid #09090b' : '1px solid #d4d4d8',
                  backgroundColor: formData.fieldAccessIdentified ? '#fafafa' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="checkbox"
                  id="field-access-check"
                  checked={formData.fieldAccessIdentified}
                  onChange={(e) => updateField('fieldAccessIdentified', e.target.value)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#09090b' }}
                />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#09090b' }}>
                  Take-off and Landing Access Identified
                </span>
              </label>
            )}
            <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
              Designated clear radius for safe drone takeoff and recovery.
            </span>
          </div>
        </div>
      </div>

      {/* Universal Remarks & Discussion Thread for Stage 3 */}
      {children}
    </div>
  );
}
