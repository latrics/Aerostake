import React from 'react';
import { SectorStatus } from '../types';

interface SectorStatusBadgeProps {
  status: SectorStatus | string;
  size?: 'sm' | 'md';
}

export const SectorStatusBadge: React.FC<SectorStatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = (status || '').toLowerCase();

  const getStyle = () => {
    switch (normalized) {
      case 'pending':
        return {
          bg: '#f4f4f5',
          border: '#d4d4d8',
          color: '#52525b',
          dot: '#71717a',
          label: 'Pending',
        };
      case 'allocated':
        return {
          bg: '#ffffff',
          border: '#71717a',
          color: '#27272a',
          dot: '#27272a',
          label: 'Pilot Allocated',
        };
      case 'in_progress':
        return {
          bg: '#fafafa',
          border: '#09090b',
          color: '#09090b',
          dot: '#09090b',
          label: 'In Flight',
        };
      case 'surveyed':
        return {
          bg: '#27272a',
          border: '#27272a',
          color: '#ffffff',
          dot: '#e4e4e7',
          label: 'Surveyed',
        };
      case 'completed':
        return {
          bg: '#09090b',
          border: '#09090b',
          color: '#ffffff',
          dot: '#ffffff',
          label: 'Completed',
        };
      case 'flagged':
        return {
          bg: '#ffffff',
          border: '#09090b',
          color: '#09090b',
          dot: '#09090b',
          label: 'Flagged / Issue',
        };
      default:
        return {
          bg: '#f4f4f5',
          border: '#d4d4d8',
          color: '#71717a',
          dot: '#71717a',
          label: status,
        };
    }
  };

  const config = getStyle();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: size === 'sm' ? '0.15rem 0.5rem' : '0.25rem 0.65rem',
        borderRadius: '9999px',
        fontSize: size === 'sm' ? '0.7rem' : '0.75rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: config.dot || config.color,
        }}
      />
      {config.label}
    </span>
  );
};
