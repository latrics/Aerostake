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
          background: '#f4f4f5',
          color: '#27272a',
          border: '1px solid #d4d4d8',
        };
      case AllocationStatusEnum.IN_FLIGHT:
      case 'in_flight':
        return {
          background: '#fafafa',
          color: '#09090b',
          border: '1px dashed #71717a',
        };
      case AllocationStatusEnum.COMPLETED:
      case 'completed':
        return {
          background: '#18181b',
          color: '#ffffff',
          border: '1px solid #18181b',
        };
      case AllocationStatusEnum.ABORTED:
      case 'aborted':
        return {
          background: '#09090b',
          color: '#ffffff',
          border: '1px solid #09090b',
        };
      default:
        return {
          background: '#f4f4f5',
          color: '#52525b',
          border: '1px solid #e4e4e7',
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
            backgroundColor: '#09090b',
            animation: 'pulse 1.5s infinite',
          }}
        />
      )}
      {formatText()}
    </span>
  );
}
