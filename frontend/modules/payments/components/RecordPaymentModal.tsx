'use client';

import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Info, Landmark, X, Coins, ArrowRight } from 'lucide-react';
import { Portal } from '@/components/Portal';
import { RecordPaymentIn } from '../types';

interface RecordPaymentModalProps {
  isOpen: boolean;
  projectId: string;
  projectName?: string;
  clientCompanyName?: string | null;
  currentDueBalance?: number;
  onClose: () => void;
  onSubmit: (projectId: string, payload: RecordPaymentIn) => Promise<void>;
}

export function RecordPaymentModal({
  isOpen,
  projectId,
  projectName = 'Survey Project',
  clientCompanyName,
  currentDueBalance = 0,
  onClose,
  onSubmit,
}: RecordPaymentModalProps) {
  const displayCompanyName = clientCompanyName || 'Client Organization';
  const todayStr = new Date().toISOString().slice(0, 10);

  const [amountStr, setAmountStr] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayStr);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer (RTGS/NEFT)');
  const [referenceCode, setReferenceCode] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const enteredAmount = parseFloat(amountStr) || 0;
  // Core formula: Resulting Balance = Current Due Balance - Payment Received
  const resultingBalance = currentDueBalance - enteredAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (enteredAmount <= 0) {
      setError('Please enter a valid payment amount greater than ₹0');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(projectId, {
        amount: enteredAmount,
        payment_date: paymentDate,
        payment_method: paymentMethod.trim() || undefined,
        reference_code: referenceCode.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Portal>
      <div
        className="viewport-modal-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(9, 9, 11, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1.25rem',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="animate-fade-in"
          style={{
            maxWidth: '560px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e4e4e7',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e4e4e7',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#fafafa',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)',
                }}
              >
                <Coins size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#09090b', letterSpacing: '-0.2px' }}>
                  Record Payment Received
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.775rem', color: '#71717a' }}>
                  Credit client wallet for <strong>{projectName}</strong> · {displayCompanyName}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid #e4e4e7',
                backgroundColor: '#ffffff',
                color: '#71717a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Close modal"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#991b1b',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Amount Field */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Payment Received Amount (INR ₹) *
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '9px', fontSize: '1rem', fontWeight: 800, color: '#09090b' }}>
                  ₹
                </span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  placeholder="e.g. 60000"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="form-input"
                  style={{
                    paddingLeft: '2rem',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    height: '42px',
                    fontFamily: 'monospace',
                    borderRadius: '8px',
                  }}
                />
              </div>
            </div>

            {/* Date & Method Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Remittance Date *
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.825rem', height: '38px', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Payment Method
                </label>
                <input
                  type="text"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.825rem', height: '38px', borderRadius: '6px' }}
                />
              </div>
            </div>

            {/* Reference Code / UTR */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Bank Reference Code / UTR / Cheque Number
              </label>
              <input
                type="text"
                placeholder="e.g. UTR-HDFC-9928172918"
                value={referenceCode}
                onChange={(e) => setReferenceCode(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.825rem', height: '38px', borderRadius: '6px', fontFamily: 'monospace' }}
              />
            </div>

            {/* ── Live Cumulative Wallet Balance Impact ── */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
              }}
            >
              <span style={{ fontSize: '0.725rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>
                Live Cumulative Balance Impact
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                <div style={{ padding: '0.5rem', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.675rem', color: '#64748b', display: 'block' }}>Current Balance</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: currentDueBalance > 0 ? '#dc2626' : '#16a34a', fontFamily: 'monospace' }}>
                    ₹{currentDueBalance.toLocaleString('en-IN')}
                  </span>
                </div>
                <div style={{ padding: '0.5rem', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.675rem', color: '#64748b', display: 'block' }}>Payment Credit</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>
                    -₹{enteredAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div style={{ padding: '0.5rem', backgroundColor: '#ffffff', borderRadius: '6px', border: '2px solid #09090b' }}>
                  <span style={{ fontSize: '0.675rem', color: '#09090b', fontWeight: 700, display: 'block' }}>New Balance</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 900, color: resultingBalance > 0 ? '#dc2626' : '#16a34a', fontFamily: 'monospace' }}>
                    {resultingBalance > 0
                      ? `₹${resultingBalance.toLocaleString('en-IN')} Due 🔴`
                      : resultingBalance < 0
                      ? `₹${Math.abs(resultingBalance).toLocaleString('en-IN')} Credit 🟢`
                      : 'Settled 🟢'}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Internal Audit Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Payment remittance verified and cleared in corporate account."
                className="form-input"
                style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem 0.75rem', resize: 'vertical', borderRadius: '6px' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #e4e4e7' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  border: '1px solid #d4d4d8',
                  borderRadius: '6px',
                  color: '#52525b',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '0.55rem 1.4rem',
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
                }}
              >
                {submitting ? 'Recording Remittance...' : `Record Payment (₹${enteredAmount.toLocaleString('en-IN')})`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}
