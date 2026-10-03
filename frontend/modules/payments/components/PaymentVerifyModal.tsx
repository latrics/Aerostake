'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  X,
  FileText,
  Eye,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Coins,
  Download,
} from 'lucide-react';
import { Portal } from '@/components/Portal';
import { PaymentRecord, PaymentRecordVerify } from '../types';

interface PaymentVerifyModalProps {
  isOpen: boolean;
  payment: PaymentRecord | null;
  onClose: () => void;
  onVerify: (paymentId: string, payload: PaymentRecordVerify) => Promise<void>;
  onReject?: (paymentId: string, notes?: string) => Promise<void>;
}

export function PaymentVerifyModal({
  isOpen,
  payment,
  onClose,
  onVerify,
  onReject,
}: PaymentVerifyModalProps) {
  const [referenceCode, setReferenceCode] = useState('');
  const [verifiedAmountStr, setVerifiedAmountStr] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slipZoomOpen, setSlipZoomOpen] = useState(false);

  useEffect(() => {
    if (payment) {
      setReferenceCode(payment.reference_code || '');
      setVerifiedAmountStr(payment.amount_usd ? payment.amount_usd.toString() : '');
      setNotes('');
      setError(null);
    }
  }, [payment]);

  if (!isOpen || !payment) return null;

  const enteredVerifiedAmount = parseFloat(verifiedAmountStr) || 0;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredVerifiedAmount <= 0) {
      setError('Please specify a verified received amount greater than ₹0');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onVerify(payment.id, {
        reference_code: referenceCode.trim() || undefined,
        verified_amount: enteredVerifiedAmount,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to verify payment receipt');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;
    if (!confirm('Are you sure you want to reject this client payment slip?')) return;

    try {
      setRejecting(true);
      setError(null);
      await onReject(payment.id, notes.trim() || 'Payment slip rejected by Operations - funds not received');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reject payment slip');
    } finally {
      setRejecting(false);
    }
  };

  const hasSlip = Boolean(payment.slip_url);
  const isImageSlip = payment.slip_url?.startsWith('data:image/') || payment.slip_url?.match(/\.(jpeg|jpg|png|webp)($|\?)/i);

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
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
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
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              backgroundColor: '#fafafa',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#16a34a',
                }}
              >
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#09090b' }}>
                  Verify Client Payment Remittance
                </h3>
                <p style={{ margin: '0.15rem 0 0 0', color: '#71717a', fontSize: '0.75rem' }}>
                  Manual verification audit &bull; Automatically deducts from client due amount
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#71717a',
                cursor: 'pointer',
                padding: '0.25rem',
                borderRadius: '4px',
              }}
            >
              <X size={18} />
            </button>
          </div>

          <form
            onSubmit={handleVerify}
            style={{
              padding: '1.5rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.15rem',
            }}
          >
            {/* Payment Summary Box */}
            <div
              style={{
                padding: '1rem 1.25rem',
                background: '#fafafa',
                border: '1px solid #e4e4e7',
                borderRadius: '8px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.725rem', color: '#71717a', fontWeight: 600 }}>Claimed / Invoiced Amount</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'monospace', color: '#09090b', marginTop: '0.2rem' }}>
                  ₹{payment.amount_usd.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.725rem', color: '#71717a', fontWeight: 600 }}>Payment Method</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#27272a', marginTop: '0.35rem' }}>
                  {payment.payment_method || 'Bank Transfer (RTGS/NEFT)'}
                </div>
              </div>
            </div>

            {/* Uploaded Slip / Screenshot Preview */}
            {hasSlip && (
              <div
                style={{
                  padding: '0.85rem 1rem',
                  border: '1px solid #e4e4e7',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#09090b' }}>
                    Uploaded Transaction Slip / Screenshot
                  </span>
                  {isImageSlip && (
                    <button
                      type="button"
                      onClick={() => setSlipZoomOpen(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.725rem',
                        fontWeight: 600,
                        color: '#09090b',
                        border: '1px solid #e4e4e7',
                        borderRadius: '4px',
                        padding: '0.2rem 0.5rem',
                        backgroundColor: '#fafafa',
                        cursor: 'pointer',
                      }}
                    >
                      <Eye size={12} />
                      <span>Zoom View</span>
                    </button>
                  )}
                </div>

                {isImageSlip ? (
                  <div
                    onClick={() => setSlipZoomOpen(true)}
                    style={{
                      maxHeight: '140px',
                      overflow: 'hidden',
                      borderRadius: '6px',
                      border: '1px solid #e4e4e7',
                      cursor: 'pointer',
                      backgroundColor: '#f4f4f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={payment.slip_url!}
                      alt="Payment Slip"
                      style={{ maxHeight: '140px', width: 'auto', objectFit: 'contain' }}
                    />
                  </div>
                ) : (
                  <a
                    href={payment.slip_url!}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      backgroundColor: '#f4f4f5',
                      color: '#09090b',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    <FileText size={16} />
                    <span>View / Download Payment Slip PDF</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}

            {/* Client Audit Remarks */}
            {payment.notes && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f4f4f5',
                  borderRadius: '6px',
                  border: '1px solid #e4e4e7',
                  fontSize: '0.775rem',
                  color: '#52525b',
                }}
              >
                <strong style={{ color: '#09090b' }}>Client Notes:</strong> {payment.notes}
              </div>
            )}

            {error && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#991b1b',
                  fontSize: '0.825rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Ops Verification Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b' }}>
                  Verified Received Amount (₹) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: '#71717a',
                    }}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-field"
                    value={verifiedAmountStr}
                    onChange={(e) => setVerifiedAmountStr(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem 0.55rem 2rem',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      borderRadius: '6px',
                      border: '1px solid #e4e4e7',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.675rem', color: '#71717a', marginTop: '0.2rem' }}>
                  This exact amount will be deducted from client due balance.
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b' }}>
                  Confirmed Bank Wire / UTR Ref
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={referenceCode}
                  onChange={(e) => setReferenceCode(e.target.value)}
                  placeholder="e.g. UTR-HDFC-992014881"
                  style={{
                    width: '100%',
                    borderRadius: '6px',
                    border: '1px solid #e4e4e7',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b' }}>
                Operations Audit Remarks
              </label>
              <textarea
                className="input-field"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Cleared in Latrics corporate bank account. Verified genuine."
                style={{
                  width: '100%',
                  resize: 'vertical',
                  borderRadius: '6px',
                  border: '1px solid #e4e4e7',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.825rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.75rem',
                paddingTop: '0.5rem',
              }}
            >
              {onReject && (
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={submitting || rejecting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.55rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #fecaca',
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: submitting || rejecting ? 'not-allowed' : 'pointer',
                  }}
                >
                  <XCircle size={14} />
                  <span>Reject Slip</span>
                </button>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginLeft: 'auto' }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting || rejecting}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid #e4e4e7',
                    backgroundColor: '#ffffff',
                    color: '#09090b',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || rejecting || enteredVerifiedAmount <= 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.55rem 1.25rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    cursor: submitting || rejecting || enteredVerifiedAmount <= 0 ? 'not-allowed' : 'pointer',
                    opacity: submitting || rejecting || enteredVerifiedAmount <= 0 ? 0.6 : 1,
                    boxShadow: '0 1px 3px rgba(22, 163, 74, 0.3)',
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>{submitting ? 'Verifying...' : `Verify & Credit ₹${enteredVerifiedAmount.toLocaleString('en-IN')}`}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Slip Full Zoom View Modal */}
          {slipZoomOpen && payment.slip_url && (
            <div
              onClick={() => setSlipZoomOpen(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100000,
                padding: '2rem',
              }}
            >
              <div style={{ maxWidth: '85vw', maxHeight: '85vh', position: 'relative' }}>
                <img
                  src={payment.slip_url}
                  alt="Full Slip preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '85vh',
                    borderRadius: '8px',
                    objectFit: 'contain',
                    border: '1px solid #3f3f46',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setSlipZoomOpen(false)}
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '-12px',
                    backgroundColor: '#ffffff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
