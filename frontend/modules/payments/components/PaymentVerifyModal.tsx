'use client';

import React, { useState } from 'react';
import { PaymentRecord, PaymentRecordVerify } from '../types';

interface PaymentVerifyModalProps {
  isOpen: boolean;
  payment: PaymentRecord | null;
  onClose: () => void;
  onVerify: (paymentId: string, payload: PaymentRecordVerify) => Promise<void>;
}

export function PaymentVerifyModal({
  isOpen,
  payment,
  onClose,
  onVerify,
}: PaymentVerifyModalProps) {
  const [referenceCode, setReferenceCode] = useState('');
  const [notes, setNotes] = useState('Confirmed cleared funds in corporate Treasury account.');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !payment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await onVerify(payment.id, {
        reference_code: referenceCode.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to verify payment receipt');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px' }}
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
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Verify Bank Payment</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Confirm clearance for <strong style={{ color: 'var(--text-primary)' }}>{payment.milestone_name}</strong>
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

        <div
          style={{
            padding: '1rem',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '8px',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Invoiced Amount</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-success)', marginTop: '0.2rem' }}>
            ${payment.amount_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
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
              Bank Wire UTR / Transaction Receipt Code
            </label>
            <input
              type="text"
              className="input-field"
              value={referenceCode}
              onChange={(e) => setReferenceCode(e.target.value)}
              placeholder="e.g. UTR-CHASE-992014881"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Verification Audit Remarks
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
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                fontWeight: 700,
              }}
            >
              {submitting ? 'Verifying...' : 'Confirm Receipt & Unlock Ops'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
