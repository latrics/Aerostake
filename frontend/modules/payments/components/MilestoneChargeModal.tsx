'use client';

import React, { useState } from 'react';
import { PaymentRecordCreate } from '../types';

interface MilestoneChargeModalProps {
  isOpen: boolean;
  projectId: string;
  projectName?: string;
  onClose: () => void;
  onSubmit: (projectId: string, payload: PaymentRecordCreate) => Promise<void>;
}

export function MilestoneChargeModal({
  isOpen,
  projectId,
  projectName = 'Survey Project',
  onClose,
  onSubmit,
}: MilestoneChargeModalProps) {
  const [milestoneName, setMilestoneName] = useState('Mobilization Deposit (50%)');
  const [amountUsd, setAmountUsd] = useState('2400');
  const [paymentMethod, setPaymentMethod] = useState('Wire Transfer (SWIFT/ACH)');
  const [referenceCode, setReferenceCode] = useState('');
  const [notes, setNotes] = useState('Due prior to pilot hardware field mobilization.');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountUsd);
    if (!milestoneName.trim()) {
      setError('Milestone name is required');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit(projectId, {
        milestone_name: milestoneName.trim(),
        amount_usd: amount,
        payment_method: paymentMethod.trim() || undefined,
        reference_code: referenceCode.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to issue milestone invoice');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '540px' }}
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
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Issue Milestone Invoice</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Create billing invoice record for {projectName}
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
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Milestone Stage Title *
            </label>
            <input
              type="text"
              required
              className="input-field"
              value={milestoneName}
              onChange={(e) => setMilestoneName(e.target.value)}
              placeholder="e.g. Mobilization Deposit (50%)"
              style={{ width: '100%' }}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Amount (USD $) *
              </label>
              <input
                type="number"
                step="50"
                min="1"
                required
                className="input-field"
                value={amountUsd}
                onChange={(e) => setAmountUsd(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Payment Method
              </label>
              <input
                type="text"
                className="input-field"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="e.g. Wire Transfer"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Invoice / Reference Code
            </label>
            <input
              type="text"
              className="input-field"
              value={referenceCode}
              onChange={(e) => setReferenceCode(e.target.value)}
              placeholder="e.g. INV-2026-0881"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Invoice Notes & Terms
            </label>
            <textarea
              className="input-field"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              {submitting ? 'Issuing Invoice...' : 'Issue Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
