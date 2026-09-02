import React, { useState } from 'react';
import { OperationalPlan, PlanStatus } from '../types';
import { PlanRevisionModal } from './PlanRevisionModal';
import { PlanRevisionRequest } from '../types';

interface OperationalPlanViewerProps {
  plan: OperationalPlan | null;
  onApprove: () => Promise<void>;
  onRevise: (data: PlanRevisionRequest) => Promise<void>;
  isProjectApproved?: boolean;
}

export const OperationalPlanViewer: React.FC<OperationalPlanViewerProps> = ({
  plan,
  onApprove,
  onRevise,
  isProjectApproved = false,
}) => {
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!plan) {
    return (
      <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⏳</div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Operational Plan Pending Publication
        </h3>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto', fontSize: '0.9rem' }}>
          Latrics Operations engineers are currently analyzing your submitted survey geometry, calculating flight hours, and assigning optimal sensor modalities. You will be notified once the flight plan is published for your review.
        </p>
      </div>
    );
  }

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      setActionError(null);
      await onApprove();
    } catch (err: any) {
      setActionError(err.message || 'Failed to approve operational plan');
    } finally {
      setIsApproving(false);
    }
  };

  const isApproved = plan.status === PlanStatus.APPROVED || isProjectApproved;
  const isSuperseded = plan.status === PlanStatus.SUPERSEDED;

  return (
    <div className="glass-panel" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
      {/* Decorative ambient background glow */}
      <div
        style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          background: isApproved
            ? 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
              Operational Survey Strategy & Flight Quotation
            </h3>
            {isApproved ? (
              <span className="badge badge-approved">Plan Approved</span>
            ) : isSuperseded ? (
              <span className="badge badge-cancelled">Plan Superseded</span>
            ) : (
              <span className="badge badge-submitted">Awaiting Client Approval</span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Published by Latrics Operations {plan.published_at ? `on ${new Date(plan.published_at).toLocaleDateString()}` : ''}
          </p>
        </div>

        {!isApproved && !isSuperseded && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setIsRevisionModalOpen(true)}
              className="btn btn-secondary"
              disabled={isApproving}
            >
              Request Changes
            </button>
            <button
              onClick={handleApprove}
              className="btn btn-primary"
              disabled={isApproving}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: 'var(--success-glow)',
              }}
            >
              {isApproving ? 'Approving...' : '✓ Approve Flight Plan'}
            </button>
          </div>
        )}
      </div>

      {actionError && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: '#f87171',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
          }}
        >
          {actionError}
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid-4" style={{ marginBottom: '1.75rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Total Flight Hours
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-focus, #3b82f6)' }}>
            {plan.estimated_flight_hours} hrs
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Estimated field airtime
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Required Pilots
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            {plan.required_pilots_count} {plan.required_pilots_count === 1 ? 'Pilot' : 'Pilots'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            DGCA certified operators
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Drone Hardware Units
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            {plan.required_drones_count} {plan.required_drones_count === 1 ? 'Drone' : 'Drones'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            RTK enterprise fleet
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Total Quotation (USD)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>
            ${plan.estimated_cost_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Milestone invoice basis
          </div>
        </div>
      </div>

      {/* Flight Strategy Notes */}
      {plan.flight_strategy_notes && (
        <div
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Operational Strategy & Flight Parameters:
          </h4>
          <p style={{ color: 'var(--text-primary)', fontSize: '0.925rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {plan.flight_strategy_notes}
          </p>
        </div>
      )}

      <PlanRevisionModal
        isOpen={isRevisionModalOpen}
        onClose={() => setIsRevisionModalOpen(false)}
        onSubmit={onRevise}
      />
    </div>
  );
};
