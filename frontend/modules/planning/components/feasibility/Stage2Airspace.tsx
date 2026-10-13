'use client';

import React from 'react';
import { Plane, Check } from 'lucide-react';
import { PlanningFormData } from './types';

interface Stage2AirspaceProps {
  formData: PlanningFormData;
  toggleArrayItem: (field: 'airspaceZones' | 'weatherConditions' | 'hazards' | 'terrainTypes', item: string) => void;
  isClient: boolean;
  children?: React.ReactNode;
}

export function Stage2Airspace({
  formData,
  toggleArrayItem,
  isClient,
  children,
}: Stage2AirspaceProps) {
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
            2. Regularity &amp; Airspace
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '0.2rem' }}>
            Verify DGCA Digital Sky airspace classification and clearance prerequisites for the flight perimeter.
          </p>
        </div>
      </div>

      {/* Airspace Zones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
          DGCA Airspace Zone Classification
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
          {[
            { name: 'Green Zone', desc: 'Up to 400 ft AGL. No prior DGCA flight permission required.' },
            { name: 'Yellow Zone', desc: 'Controlled airspace. Prior Air Traffic Control (ATC) clearance required.' },
            { name: 'Red Zone', desc: 'Restricted / Prohibited airspace. Central MoD clearance required.' },
          ].map((zone) => {
            const isSelected = formData.airspaceZones.includes(zone.name);
            return (
              <div
                key={zone.name}
                onClick={() => !isClient && toggleArrayItem('airspaceZones', zone.name)}
                style={{
                  border: isSelected ? '1.5px solid #09090b' : '1px solid #e4e4e7',
                  backgroundColor: isSelected ? '#fafafa' : '#ffffff',
                  borderRadius: '6px',
                  padding: '0.85rem',
                  cursor: isClient ? 'default' : 'pointer',
                  opacity: isClient && !isSelected ? 0.65 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>
                    {zone.name}
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
                    }}
                  >
                    {isSelected && <Check size={11} color="#ffffff" strokeWidth={3} />}
                  </div>
                </div>
                <span style={{ fontSize: '0.725rem', color: '#71717a', lineHeight: 1.35 }}>
                  {zone.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Universal Remarks & Discussion Thread for Stage 2 */}
      {children}
    </div>
  );
}
