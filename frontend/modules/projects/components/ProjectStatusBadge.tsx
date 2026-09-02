import React from 'react';
import { ProjectStatus } from '../types';

interface ProjectStatusBadgeProps {
  status: ProjectStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const ProjectStatusBadge: React.FC<ProjectStatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = (status || '').toLowerCase();

  const getBadgeClass = () => {
    switch (normalized) {
      case 'draft':
        return 'badge-draft';
      case 'submitted':
        return 'badge-submitted';
      case 'planning':
        return 'badge-planning';
      case 'approved':
        return 'badge-approved';
      case 'active':
        return 'badge-active';
      case 'completed':
        return 'badge-completed';
      case 'cancelled':
        return 'badge-cancelled';
      default:
        return 'badge-draft';
    }
  };

  const getLabel = () => {
    switch (normalized) {
      case 'draft':
        return 'Draft';
      case 'submitted':
        return 'Submitted (#001)';
      case 'planning':
        return 'In Planning';
      case 'approved':
        return 'Plan Approved';
      case 'active':
        return 'Survey Active';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const sizeStyle: React.CSSProperties =
    size === 'sm'
      ? { fontSize: '0.7rem', padding: '0.15rem 0.5rem' }
      : size === 'lg'
      ? { fontSize: '0.85rem', padding: '0.35rem 0.85rem' }
      : {};

  return (
    <span className={`badge ${getBadgeClass()}`} style={sizeStyle}>
      {getLabel()}
    </span>
  );
};
