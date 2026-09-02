'use client';

import React, { useState } from 'react';
import { useMyAllocations } from '@/modules/allocations/hooks';
import { AllocationCard } from '@/modules/allocations/components/AllocationCard';
import { AllocationStatusEnum } from '@/modules/allocations/types';

export default function MyAssignmentsPage() {
  const { allocations, loading, error, refetch, updateStatus } = useMyAllocations();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const handleStatusChange = async (allocationId: string, newStatus: AllocationStatusEnum) => {
    try {
      setUpdatingId(allocationId);
      setActionFeedback(null);
      await updateStatus(allocationId, { status: newStatus });
      setActionFeedback(`Flight status successfully updated to ${newStatus.toUpperCase()}!`);
    } catch (err: any) {
      alert(err.message || 'Failed to update flight status');
    } finally {
      setUpdatingId(null);
    }
  };

  const activeMissions = allocations.filter(
    (a) => a.status === AllocationStatusEnum.ASSIGNED || a.status === AllocationStatusEnum.IN_FLIGHT
  );
  const completedMissions = allocations.filter(
    (a) => a.status === AllocationStatusEnum.COMPLETED || a.status === AllocationStatusEnum.ABORTED
  );

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            My Flight Missions
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Review assigned sector grids, hardware specs, pre-flight safety protocols, and record flight telemetry.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="btn btn-secondary"
          style={{ fontSize: '0.875rem' }}
        >
          🔄 Refresh Missions
        </button>
      </div>

      {actionFeedback && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid var(--accent-success)',
            borderRadius: '8px',
            color: 'var(--accent-success)',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{actionFeedback}</span>
          <button
            onClick={() => setActionFeedback(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '1rem',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid var(--accent-danger)',
            borderRadius: '8px',
            color: '#fca5a5',
            marginBottom: '1.5rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Pre-flight checklist banner */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem',
          marginBottom: '2rem',
          borderLeft: '4px solid var(--brand-primary)',
        }}
      >
        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          🛡️ Field Pilot Standard Operating Procedures (SOP)
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <div>✅ <strong>RTK Fixed Lock:</strong> Verify GNSS RTK fixed status before takeoff.</div>
          <div>✅ <strong>Battery Voltage:</strong> Ensure dual battery sets above 95% charge.</div>
          <div>✅ <strong>Airspace Check:</strong> Confirm NOTAM and obstacle clearance.</div>
          <div>✅ <strong>Sensors Calibration:</strong> Calibrate thermal / RGB radiometric sensors.</div>
        </div>
      </div>

      {/* Active Missions */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Active Field Missions</span>
          <span style={{ fontSize: '0.8rem', background: 'rgba(124, 58, 237, 0.2)', color: 'var(--brand-primary)', padding: '0.2rem 0.5rem', borderRadius: '12px' }}>
            {activeMissions.length} Pending
          </span>
        </h3>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading your flight missions...
          </div>
        ) : activeMissions.length === 0 ? (
          <div
            className="glass-card"
            style={{
              padding: '2.5rem',
              textAlign: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            No active flight missions currently assigned to your pilot profile. Operations will dispatch new sectors soon.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
            {activeMissions.map((alloc) => (
              <AllocationCard
                key={alloc.id}
                allocation={alloc}
                sectorName={`Sector Flight #${alloc.sector_id.substring(0, 8)}`}
                projectName="Survey Flight Zone"
                isPilotView={true}
                onStatusChange={handleStatusChange}
                updatingStatus={updatingId === alloc.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Completed Missions History */}
      {completedMissions.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Completed Flight Missions Log ({completedMissions.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
            {completedMissions.map((alloc) => (
              <AllocationCard
                key={alloc.id}
                allocation={alloc}
                sectorName={`Sector Flight #${alloc.sector_id.substring(0, 8)}`}
                projectName="Survey Flight Zone"
                isPilotView={true}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
