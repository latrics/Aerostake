'use client';

import React from 'react';
import { SectorAllocation, AllocationStatusEnum } from '../types';
import { AllocationStatusBadge } from './AllocationStatusBadge';

interface AllocationCardProps {
  allocation: SectorAllocation;
  sectorName?: string;
  projectName?: string;
  isPilotView?: boolean;
  onStatusChange?: (allocationId: string, newStatus: AllocationStatusEnum) => void;
  updatingStatus?: boolean;
}

export function AllocationCard({
  allocation,
  sectorName = 'Flight Sector',
  projectName = 'Survey Project',
  isPilotView = false,
  onStatusChange,
  updatingStatus = false,
}: AllocationCardProps) {
  const isAssigned = allocation.status === AllocationStatusEnum.ASSIGNED || allocation.status === ('assigned' as any);
  const isInFlight = allocation.status === AllocationStatusEnum.IN_FLIGHT || allocation.status === ('in_flight' as any);
  const isCompleted = allocation.status === AllocationStatusEnum.COMPLETED || allocation.status === ('completed' as any);

  return (
    <div
      className="glass-card"
      style={{
        padding: '1.5rem',
        borderLeft: `4px solid ${
          isInFlight
            ? 'var(--accent-warning)'
            : isCompleted
            ? 'var(--accent-success)'
            : 'var(--brand-primary)'
        }`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
            {projectName}
          </div>
          <h4 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{sectorName}</h4>
        </div>
        <AllocationStatusBadge status={allocation.status} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          padding: '1rem',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          marginBottom: '1rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Hardware Fleet Asset</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            🛸 {allocation.drone_identifier}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Assigned Timestamp</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            📅 {new Date(allocation.assigned_at).toLocaleDateString()} {new Date(allocation.assigned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {allocation.flight_started_at && (
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Takeoff Time</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--accent-warning)', marginTop: '0.2rem' }}>
              ⚡ {new Date(allocation.flight_started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )}

        {allocation.flight_completed_at && (
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Landing / Logged</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--accent-success)', marginTop: '0.2rem' }}>
              🏁 {new Date(allocation.flight_completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )}
      </div>

      {allocation.notes && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '6px',
            fontSize: '0.85rem',
            marginBottom: '1rem',
          }}
        >
          <strong style={{ color: 'var(--accent-info)' }}>Dispatch Notes: </strong>
          <span style={{ color: 'var(--text-secondary)' }}>{allocation.notes}</span>
        </div>
      )}

      {/* Pilot direct flight controls */}
      {isPilotView && onStatusChange && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          {isAssigned && (
            <button
              onClick={() => onStatusChange(allocation.id, AllocationStatusEnum.IN_FLIGHT)}
              disabled={updatingStatus}
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                color: '#000',
                fontWeight: 700,
                fontSize: '0.875rem',
              }}
            >
              🚀 Takeoff / Start Flight
            </button>
          )}

          {isInFlight && (
            <>
              <button
                onClick={() => onStatusChange(allocation.id, AllocationStatusEnum.ABORTED)}
                disabled={updatingStatus}
                className="btn btn-secondary"
                style={{
                  borderColor: 'var(--accent-danger)',
                  color: 'var(--accent-danger)',
                  fontSize: '0.875rem',
                }}
              >
                ⚠️ Abort Flight
              </button>
              <button
                onClick={() => onStatusChange(allocation.id, AllocationStatusEnum.COMPLETED)}
                disabled={updatingStatus}
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                }}
              >
                ✅ Land & Complete Survey
              </button>
            </>
          )}

          {isCompleted && (
            <div style={{ fontSize: '0.85rem', color: 'var(--accent-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              ✓ Flight Mission Completed & Synchronized
            </div>
          )}
        </div>
      )}
    </div>
  );
}
