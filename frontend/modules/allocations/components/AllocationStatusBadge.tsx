'use client';

import React from 'react';
import { AllocationStatusEnum } from '../types';

interface AllocationStatusBadgeProps {
  status: AllocationStatusEnum | string;
}

export function AllocationStatusBadge({ status }: AllocationStatusBadgeProps) {
  const getBadgeStyle = () => {
    switch (status) {
      case AllocationStatusEnum.ASSIGNED:
      case 'assigned':
        return {
          background: 'rgba(59, 130, 246, 0.15)',
          color: 'var(--accent-info)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
        };
      case AllocationStatusEnum.IN_FLIGHT:
      case 'in_flight':
        return {
          background: 'rgba(234, 179, 8, 0.15)',
          color: 'var(--accent-warning)',
          border: '1px solid rgba(234, 179, 8, 0.3)',
        };
      case AllocationStatusEnum.COMPLETED:
      case 'completed':
        return {
          background: 'rgba(16, 185, 129, 0.15)',
          color: 'var(--accent-success)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
        };
      case AllocationStatusEnum.ABORTED:
      case 'aborted':
        return {
          background: 'rgba(239, 68, 68, 0.15)',
          color: 'var(--accent-danger)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        };
      default:
        return {
          background: 'rgba(255, 255, 255, 0.05)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-color)',
        };
    }
  };

  const formatText = () => {
    switch (status) {
      case AllocationStatusEnum.IN_FLIGHT:
      case 'in_flight':
        return 'IN FLIGHT';
      default:
        return String(status).toUpperCase();
    }
  };

  return (
    <span
      className="badge"
      style={{
        ...getBadgeStyle(),
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        padding: '0.25rem 0.6rem',
        borderRadius: '6px',
        letterSpacing: '0.04em',
      }}
    >
      {(status === AllocationStatusEnum.IN_FLIGHT || status === 'in_flight') && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-warning)',
            animation: 'pulse 1.5s infinite',
          }}
        />
      )}
      {formatText()}
    </span>
  );
}
