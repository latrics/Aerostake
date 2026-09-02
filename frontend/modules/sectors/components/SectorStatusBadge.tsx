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
          bg: 'rgba(107, 114, 128, 0.15)',
          border: 'rgba(107, 114, 128, 0.3)',
          color: '#9ca3af',
          label: 'Pending',
        };
      case 'allocated':
        return {
          bg: 'rgba(59, 130, 246, 0.15)',
          border: 'rgba(59, 130, 246, 0.3)',
          color: '#3b82f6',
          label: 'Pilot Allocated',
        };
      case 'in_progress':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          border: 'rgba(245, 158, 11, 0.3)',
          color: '#f59e0b',
          label: 'In Flight',
        };
      case 'surveyed':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.3)',
          color: '#10b981',
          label: 'Surveyed',
        };
      case 'completed':
        return {
          bg: 'rgba(16, 185, 129, 0.25)',
          border: 'rgba(16, 185, 129, 0.5)',
          color: '#34d399',
          label: 'Completed',
        };
      case 'flagged':
        return {
          bg: 'rgba(239, 68, 68, 0.15)',
          border: 'rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          label: 'Flagged / Issue',
        };
      default:
        return {
          bg: 'rgba(107, 114, 128, 0.15)',
          border: 'rgba(107, 114, 128, 0.3)',
          color: '#9ca3af',
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
          backgroundColor: config.color,
        }}
      />
      {config.label}
    </span>
  );
};
