import React, { useState } from 'react';
import { PlanRevisionRequest } from '../types';

interface PlanRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PlanRevisionRequest) => Promise<void>;
}

export const PlanRevisionModal: React.FC<PlanRevisionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackNotes.trim() || feedbackNotes.trim().length < 5) {
      setError('Please provide at least 5 characters of feedback explaining requested changes.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit({ feedback_notes: feedbackNotes.trim() });
      setFeedbackNotes('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit plan revision request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        padding: '1rem',
      }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '540px',
          padding: '2rem',
          boxShadow: 'var(--shadow-xl), var(--brand-glow)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Request Operational Plan Revision</h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '1.25rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          Explain the operational parameters or financial adjustments needed. Submitting feedback will transition the plan to <strong>SUPERSEDED</strong> and notify Latrics Operations to republish an adjusted flight schedule.
        </p>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: '#f87171',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Revision Feedback & Required Changes *</label>
            <textarea
              className="form-input"
              rows={4}
              placeholder="e.g. Please expedite the flight schedule or adjust flight hours to accommodate morning solar peak..."
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Transmit Revision Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
