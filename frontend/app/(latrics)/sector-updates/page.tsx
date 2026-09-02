'use client';

import React, { useState } from 'react';
import { useMyAllocations } from '@/modules/allocations/hooks';
import { AllocationStatusEnum } from '@/modules/allocations/types';
import { sectorApi } from '@/modules/sectors/api';
import { SectorStatus } from '@/modules/sectors/types';

export default function SectorUpdatesPage() {
  const { allocations, loading, refetch, updateStatus } = useMyAllocations();
  const [selectedAllocationId, setSelectedAllocationId] = useState<string>('');
  const [flightStatus, setFlightStatus] = useState<AllocationStatusEnum>(AllocationStatusEnum.IN_FLIGHT);
  const [sectorSurveyStatus, setSectorSurveyStatus] = useState<SectorStatus>(SectorStatus.IN_PROGRESS);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeAllocations = allocations.filter((a) => a.status !== AllocationStatusEnum.COMPLETED);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllocationId) {
      setFeedbackMsg({ type: 'error', text: 'Please select an assigned flight mission' });
      return;
    }

    const alloc = allocations.find((a) => a.id === selectedAllocationId);

    try {
      setSubmitting(true);
      setFeedbackMsg(null);

      // Update allocation status
      await updateStatus(selectedAllocationId, {
        status: flightStatus,
        notes: notes.trim() || undefined,
      });

      // Also update sector status if sector ID is present
      if (alloc?.sector_id) {
        await sectorApi.updateSectorStatus(alloc.sector_id, {
          status: sectorSurveyStatus,
        }).catch((err) => console.warn('Could not update sector status directly:', err));
      }

      setFeedbackMsg({
        type: 'success',
        text: `Mission telemetry and flight status (${flightStatus.toUpperCase()}) updated and synchronized to Ops!`,
      });
      setNotes('');
      await refetch();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to update flight status' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Real-Time Flight Telemetry & Sector Updates
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Broadcast field flight progress, mission state changes, and environmental observations directly to Operations.
        </p>
      </div>

      {feedbackMsg && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${feedbackMsg.type === 'success' ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
            borderRadius: '8px',
            color: feedbackMsg.type === 'success' ? 'var(--accent-success)' : '#fca5a5',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{feedbackMsg.text}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ maxWidth: '680px' }}>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>
            Broadcast Field Flight Update
          </h3>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading assigned flight missions...
            </div>
          ) : activeAllocations.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No active flight missions available for updates. Go to <strong>My Assignments</strong> to review your roster.
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Target Mission / Sector Allocation *
                </label>
                <select
                  className="input-field"
                  value={selectedAllocationId}
                  onChange={(e) => {
                    setSelectedAllocationId(e.target.value);
                    const selected = allocations.find((a) => a.id === e.target.value);
                    if (selected) {
                      setFlightStatus(selected.status);
                    }
                  }}
                  required
                  style={{ width: '100%' }}
                >
                  <option value="">-- Choose Assigned Mission --</option>
                  {activeAllocations.map((a) => (
                    <option key={a.id} value={a.id}>
                      Sector #{a.sector_id.substring(0, 8)} | 🛸 {a.drone_identifier} | Status: {a.status}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.25rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Flight Mission Status *
                  </label>
                  <select
                    className="input-field"
                    value={flightStatus}
                    onChange={(e) => setFlightStatus(e.target.value as AllocationStatusEnum)}
                    style={{ width: '100%' }}
                  >
                    <option value={AllocationStatusEnum.ASSIGNED}>Assigned (Pre-flight)</option>
                    <option value={AllocationStatusEnum.IN_FLIGHT}>In Flight (Active survey)</option>
                    <option value={AllocationStatusEnum.COMPLETED}>Completed (Landed & Checked)</option>
                    <option value={AllocationStatusEnum.ABORTED}>Aborted (Safety/Weather hold)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Sector Grid Survey Status *
                  </label>
                  <select
                    className="input-field"
                    value={sectorSurveyStatus}
                    onChange={(e) => setSectorSurveyStatus(e.target.value as SectorStatus)}
                    style={{ width: '100%' }}
                  >
                    <option value={SectorStatus.IN_PROGRESS}>In Progress</option>
                    <option value={SectorStatus.SURVEYED}>Surveyed (Raw imagery captured)</option>
                    <option value={SectorStatus.COMPLETED}>Completed (Quality verified)</option>
                    <option value={SectorStatus.FLAGGED}>Flagged (Obstacle / re-fly needed)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Field Telemetry Observations & Environmental Conditions
                </label>
                <textarea
                  className="input-field"
                  rows={4}
                  placeholder="e.g. Wind 8kt SSE, visibility > 10km. Photogrammetry pass 1-6 complete with RTK fix. Battery set #3 deployed."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !selectedAllocationId}
                  style={{ minWidth: '200px' }}
                >
                  {submitting ? 'Broadcasting...' : '📡 Broadcast Status to Ops'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
