'use client';

import React, { useState } from 'react';
import { OperationalPlanCreate } from '../types';

interface PlanPublishModalProps {
  isOpen: boolean;
  requestVersionId: string;
  versionNumber?: number;
  projectName?: string;
  onClose: () => void;
  onSubmit: (requestVersionId: string, planData: OperationalPlanCreate) => Promise<void>;
}

export function PlanPublishModal({
  isOpen,
  requestVersionId,
  versionNumber = 1,
  projectName = 'Survey Project',
  onClose,
  onSubmit,
}: PlanPublishModalProps) {
  const [flightHours, setFlightHours] = useState('14.5');
  const [pilotsCount, setPilotsCount] = useState('2');
  const [dronesCount, setDronesCount] = useState('2');
  const [costUsd, setCostUsd] = useState('4800');
  const [strategyNotes, setStrategyNotes] = useState(
    'Dual-grid cross-hatch flight pattern at 75m AGL with 80% forward and 70% side overlap. RTK ground base station deployment required.'
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hours = parseFloat(flightHours);
    const pilots = parseInt(pilotsCount, 10);
    const drones = parseInt(dronesCount, 10);
    const cost = parseFloat(costUsd);

    if (isNaN(hours) || hours <= 0) {
      setError('Estimated flight hours must be greater than 0');
      return;
    }
    if (isNaN(pilots) || pilots < 1) {
      setError('Required pilots count must be at least 1');
      return;
    }
    if (isNaN(drones) || drones < 1) {
      setError('Required drones count must be at least 1');
      return;
    }
    if (isNaN(cost) || cost < 0) {
      setError('Quotation cost must be a valid positive number');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit(requestVersionId, {
        estimated_flight_hours: hours,
        required_pilots_count: pilots,
        required_drones_count: drones,
        estimated_cost_usd: cost,
        flight_strategy_notes: strategyNotes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to publish operational flight plan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        <div
          className="modal-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              Draft & Publish Operational Plan
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Publish flight strategy and commercial quotation for {projectName} (Req #{String(versionNumber).padStart(3, '0')})
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.25rem 0.6rem', fontSize: '1rem', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid var(--accent-danger)',
              borderRadius: '8px',
              color: '#fca5a5',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Est. Flight Duration (Hours) *
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                className="input-field"
                value={flightHours}
                onChange={(e) => setFlightHours(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Quotation Cost (USD $) *
              </label>
              <input
                type="number"
                step="50"
                min="0"
                required
                className="input-field"
                value={costUsd}
                onChange={(e) => setCostUsd(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Required Pilots Count *
              </label>
              <input
                type="number"
                min="1"
                required
                className="input-field"
                value={pilotsCount}
                onChange={(e) => setPilotsCount(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Required Drone Units *
              </label>
              <input
                type="number"
                min="1"
                required
                className="input-field"
                value={dronesCount}
                onChange={(e) => setDronesCount(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Flight Strategy & Operational Notes
            </label>
            <textarea
              className="input-field"
              rows={4}
              placeholder="Describe flight paths, battery replacement stations, ground control points, and safety constraints..."
              value={strategyNotes}
              onChange={(e) => setStrategyNotes(e.target.value)}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Publishing Plan...' : 'Publish Plan to Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
