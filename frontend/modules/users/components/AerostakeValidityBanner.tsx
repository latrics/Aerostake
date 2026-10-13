'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { AerostakeValidityInfo } from '../utils/validity';

interface AerostakeValidityBannerProps {
  isLandingsOver: boolean;
  tenureCalc: AerostakeValidityInfo['tenureCalc'];
  totalLandings: number;
}

export function AerostakeValidityBanner({
  isLandingsOver,
  tenureCalc,
  totalLandings,
}: AerostakeValidityBannerProps) {
  return (
    <div
      style={{
        background: 'repeating-linear-gradient(-45deg, #09090b, #09090b 10px, #18181b 10px, #18181b 20px)',
        border: '2px solid #27272a',
        borderRadius: '8px',
        padding: '1.25rem 1.5rem',
        color: '#ffffff',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        position: 'relative',
      }}
    >
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: '#27272a',
              border: '1px solid #52525b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertCircle size={18} color="#ffffff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, letterSpacing: '-0.01em', color: '#ffffff' }}>
              Aerostake Validity Expired — Contract Renewal Required
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>
              Notice for Latrics Operations &amp; Primary Client
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '4px 10px',
            borderRadius: '4px',
            background: 'repeating-linear-gradient(45deg, #27272a, #27272a 4px, #3f3f46 4px, #3f3f46 8px)',
            border: '1px solid #71717a',
            fontSize: '0.7rem',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          <span>VALIDITY OVER</span>
        </div>
      </div>

      {/* Explanation message for Ops to understand */}
      <div style={{ fontSize: '0.825rem', color: '#e4e4e7', lineHeight: 1.5 }}>
        <strong style={{ color: '#ffffff' }}>Operational Notice:</strong>{' '}
        {isLandingsOver && tenureCalc.isTenureOver
          ? 'This company has reached their 1,000 landings quota AND completed their 3-year agreement tenure (1,095 days). Aerostake validity is completed. Contract renewal is required before scheduling further flights.'
          : isLandingsOver
          ? `This company has completed ${totalLandings} / 1,000 landings. The Aerostake landing quota is fully utilized. Operational contract renewal is required to unlock additional survey sorties.`
          : `This company's 3-year agreement tenure (1,095 days) concluded on ${tenureCalc.formattedEnd}. Aerostake validity has expired. Ops renewal is required to continue active survey operations.`}
      </div>

      {/* Metrics summary row */}
      <div
        style={{
          display: 'flex',
          gap: '1.5rem',
          flexWrap: 'wrap',
          paddingTop: '0.65rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.12)',
          fontSize: '0.75rem',
        }}
      >
        <div>
          <span style={{ color: '#a1a1aa' }}>Landings Used: </span>
          <strong style={{ color: isLandingsOver ? '#ffffff' : '#e4e4e7' }}>
            {totalLandings} / 1,000 {isLandingsOver ? '(Quota Exhausted)' : ''}
          </strong>
        </div>
        <div>
          <span style={{ color: '#a1a1aa' }}>Agreement Tenure: </span>
          <strong style={{ color: tenureCalc.isTenureOver ? '#ffffff' : '#e4e4e7' }}>
            {tenureCalc.daysRemaining <= 0 ? '3 Years Completed (0 days remaining)' : `${tenureCalc.daysRemaining} days remaining of 3 years`}
          </strong>
        </div>
        <div>
          <span style={{ color: '#a1a1aa' }}>Agreement Start: </span>
          <strong style={{ color: '#ffffff' }}>
            {tenureCalc.formattedStart}
          </strong>
        </div>
        <div>
          <span style={{ color: '#a1a1aa' }}>Agreement End: </span>
          <strong style={{ color: '#ffffff' }}>
            {tenureCalc.formattedEnd}
          </strong>
        </div>
      </div>
    </div>
  );
}
