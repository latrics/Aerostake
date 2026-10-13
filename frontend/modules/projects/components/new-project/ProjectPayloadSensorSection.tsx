'use client';

import React from 'react';
import { Camera, Layers, Aperture, Check } from 'lucide-react';
import { PayloadType } from '../../new-project-constants';

interface ProjectPayloadSensorSectionProps {
  selectedPayloads: PayloadType[];
  togglePayload: (payload: PayloadType) => void;
  airspaceZone: string;
  setAirspaceZone: (val: string) => void;
  manageFlightPermissions: boolean;
  setManageFlightPermissions: React.Dispatch<React.SetStateAction<boolean>>;
  isReadOnly?: boolean;
}

export function ProjectPayloadSensorSection({
  selectedPayloads,
  togglePayload,
  airspaceZone,
  setAirspaceZone,
  manageFlightPermissions,
  setManageFlightPermissions,
  isReadOnly,
}: ProjectPayloadSensorSectionProps) {
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
          3. Payload / Sensor <span style={{ color: '#09090b' }}>*</span>
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
          Select the payload / sensor for this project (single selection).
        </p>
      </div>

      {/* 3 Selectable Cards (Multiple Selection Enabled) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
        {/* 1) 61MP Camera */}
        <div
          onClick={() => togglePayload('61mp_camera')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '1rem 0.5rem',
            border: selectedPayloads.includes('61mp_camera') ? '2px solid #09090b' : '1px solid #e4e4e7',
            borderRadius: '6px',
            cursor: isReadOnly ? 'default' : 'pointer',
            backgroundColor: selectedPayloads.includes('61mp_camera') ? '#fafafa' : '#ffffff',
            position: 'relative',
            transition: 'all 0.15s ease',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              width: '16px',
              height: '16px',
              borderRadius: '3px',
              border: selectedPayloads.includes('61mp_camera') ? '1.5px solid #09090b' : '1.5px solid #a1a1aa',
              backgroundColor: selectedPayloads.includes('61mp_camera') ? '#09090b' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {selectedPayloads.includes('61mp_camera') && <Check size={11} color="#ffffff" strokeWidth={3} />}
          </div>
          <Camera size={26} color="#09090b" style={{ marginTop: '0.25rem', marginBottom: '0.5rem' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b', lineHeight: 1.2 }}>
            61MP Camera
          </span>
          <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.25 }}>
            High resolution RGB imagery
          </span>
        </div>

        {/* 2) LiDAR */}
        <div
          onClick={() => togglePayload('lidar')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '1rem 0.5rem',
            border: selectedPayloads.includes('lidar') ? '2px solid #09090b' : '1px solid #e4e4e7',
            borderRadius: '6px',
            cursor: isReadOnly ? 'default' : 'pointer',
            backgroundColor: selectedPayloads.includes('lidar') ? '#fafafa' : '#ffffff',
            position: 'relative',
            transition: 'all 0.15s ease',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              width: '16px',
              height: '16px',
              borderRadius: '3px',
              border: selectedPayloads.includes('lidar') ? '1.5px solid #09090b' : '1.5px solid #a1a1aa',
              backgroundColor: selectedPayloads.includes('lidar') ? '#09090b' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {selectedPayloads.includes('lidar') && <Check size={11} color="#ffffff" strokeWidth={3} />}
          </div>
          <Layers size={26} color="#09090b" style={{ marginTop: '0.25rem', marginBottom: '0.5rem' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b', lineHeight: 1.2 }}>
            LiDAR
          </span>
          <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.25 }}>
            Dense 3D point cloud elevation
          </span>
        </div>

        {/* 3) Oblique Camera */}
        <div
          onClick={() => togglePayload('oblique_camera')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '1rem 0.5rem',
            border: selectedPayloads.includes('oblique_camera') ? '2px solid #09090b' : '1px solid #e4e4e7',
            borderRadius: '6px',
            cursor: isReadOnly ? 'default' : 'pointer',
            backgroundColor: selectedPayloads.includes('oblique_camera') ? '#fafafa' : '#ffffff',
            position: 'relative',
            transition: 'all 0.15s ease',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              width: '16px',
              height: '16px',
              borderRadius: '3px',
              border: selectedPayloads.includes('oblique_camera') ? '1.5px solid #09090b' : '1.5px solid #a1a1aa',
              backgroundColor: selectedPayloads.includes('oblique_camera') ? '#09090b' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {selectedPayloads.includes('oblique_camera') && <Check size={11} color="#ffffff" strokeWidth={3} />}
          </div>
          <Aperture size={26} color="#09090b" style={{ marginTop: '0.25rem', marginBottom: '0.5rem' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b', lineHeight: 1.2 }}>
            Oblique Camera
          </span>
          <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.25 }}>
            Multi-angle imagery
          </span>
        </div>
      </div>

      {/* ── DGCA Airspace Zone Classification (Single Selection: 4 Options) ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          marginTop: '0.75rem',
          paddingTop: '0.85rem',
          borderTop: '1px solid #f4f4f5',
        }}
      >
        <div>
          <h3 style={{ fontSize: '0.825rem', fontWeight: 700, color: '#09090b', margin: 0 }}>
            DGCA Airspace Zone Classification (Single Selection)
          </h3>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem', margin: 0 }}>
            Select the single airspace classification applicable to this flight perimeter.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.55rem' }}>
          {[
            { name: 'Green Zone', desc: 'Up to 400 ft AGL. No prior DGCA flight permission required.', color: '#16a34a' },
            { name: 'Yellow Zone', desc: 'Controlled airspace. Prior ATC clearance required.', color: '#ca8a04' },
            { name: 'Red Zone', desc: 'Restricted / Prohibited airspace. Central MoD clearance required.', color: '#dc2626' },
            { name: 'Mixed Zone', desc: 'Perimeter spans multiple airspace zones. Segmented clearances needed.', color: '#7c3aed' },
          ].map((zone) => {
            const isSelected = airspaceZone === zone.name;
            return (
              <div
                key={zone.name}
                onClick={() => {
                  if (isReadOnly) return;
                  setAirspaceZone(zone.name);
                }}
                style={{
                  border: isSelected ? '1.5px solid #09090b' : '1px solid #e4e4e7',
                  backgroundColor: isSelected ? '#fafafa' : '#ffffff',
                  borderRadius: '6px',
                  padding: '0.7rem 0.6rem',
                  cursor: isReadOnly ? 'default' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: zone.color,
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: '0.785rem', fontWeight: 700, color: '#09090b' }}>
                      {zone.name}
                    </span>
                  </div>
                  {/* Radio Indicator */}
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: isSelected ? '5px solid #09090b' : '1.5px solid #d4d4d8',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.675rem', color: '#71717a', lineHeight: 1.3 }}>
                  {zone.desc}
                </span>
              </div>
            );
          })}
        </div>

        {/* Flight Permission Management Assistance Checkbox */}
        <div
          onClick={() => {
            if (isReadOnly) return;
            setManageFlightPermissions((prev) => !prev);
          }}
          style={{
            marginTop: '0.35rem',
            padding: '0.75rem 0.85rem',
            backgroundColor: manageFlightPermissions ? '#fafafa' : '#ffffff',
            border: manageFlightPermissions ? '1.5px solid #09090b' : '1px solid #e4e4e7',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem',
            cursor: isReadOnly ? 'default' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '3px',
              border: manageFlightPermissions ? '1.5px solid #09090b' : '1px solid #a1a1aa',
              backgroundColor: manageFlightPermissions ? '#09090b' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '2px',
            }}
          >
            {manageFlightPermissions && <Check size={11} color="#ffffff" strokeWidth={3} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
              Request LATRICS to manage and obtain Flight Permissions &amp; Clearances
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
              Our regulatory compliance desk will handle Digital Sky portal filings, ATC liaisons, and local administrative permissions on your behalf.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
