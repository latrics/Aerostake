'use client';

import React from 'react';
import { AlertTriangle, Check, Lock } from 'lucide-react';
import { PlanningFormData } from './types';

interface Stage4ObstaclesProps {
  formData: PlanningFormData;
  updateField: (field: keyof PlanningFormData, value: any) => void;
  toggleArrayItem: (field: 'airspaceZones' | 'weatherConditions' | 'hazards' | 'terrainTypes', item: string) => void;
  isClient: boolean;
  isClosed: boolean;
  children?: React.ReactNode;
}

export function Stage4Obstacles({
  formData,
  updateField,
  toggleArrayItem,
  isClient,
  isClosed,
  children,
}: Stage4ObstaclesProps) {
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
          <AlertTriangle size={18} color="#09090b" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
            4. Obstacles &amp; Hazards
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '0.2rem' }}>
            Identify vertical physical obstacles, high-tension electrical hazards, and canopy blockages.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
          Corridor Hazards Identification
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
          {[
            'Powerline / High-Tension Towers',
            'Tall Structures',
            'Tree Canopy',
            'High Building Density',
            'Other Moving Obstacles',
            'Mixed',
          ].map((hazard) => {
            const isSelected = formData.hazards.includes(hazard);
            return (
              <div
                key={hazard}
                onClick={() => !isClient && toggleArrayItem('hazards', hazard)}
                style={{
                  border: isSelected ? '1.5px solid #09090b' : '1px solid #e4e4e7',
                  backgroundColor: isSelected ? '#fafafa' : '#ffffff',
                  borderRadius: '6px',
                  padding: '0.85rem',
                  cursor: isClient ? 'default' : 'pointer',
                  opacity: isClient && !isSelected ? 0.65 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#09090b' }}>
                  {hazard}
                </span>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '3px',
                    border: isSelected ? '1.5px solid #09090b' : '1px solid #d4d4d8',
                    backgroundColor: isSelected ? '#09090b' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isSelected && <Check size={11} color="#ffffff" strokeWidth={3} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          padding: '1rem',
          borderRadius: '6px',
          border: '1px solid #e4e4e7',
          backgroundColor: isClient ? '#fafafa' : '#ffffff',
        }}
      >
        <div>
          <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span>Max Obstacle Height (meters)</span>
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
              {formData.maxObstacleHeightMeters ? `${formData.maxObstacleHeightMeters} meters` : '—'}
            </div>
          ) : (
            <input
              type="number"
              value={formData.maxObstacleHeightMeters}
              onChange={(e) => updateField('maxObstacleHeightMeters', e.target.value)}
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
            <span>Safety Buffer Distance (meters)</span>
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
              {formData.safetyBufferDistanceMeters ? `${formData.safetyBufferDistanceMeters} meters` : '—'}
            </div>
          ) : (
            <input
              type="number"
              value={formData.safetyBufferDistanceMeters}
              onChange={(e) => updateField('safetyBufferDistanceMeters', e.target.value)}
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

      {/* Universal Remarks & Discussion Thread for Stage 4 */}
      {children}
    </div>
  );
}
