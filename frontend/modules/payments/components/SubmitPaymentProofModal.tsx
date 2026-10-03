'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Coins,
  ShieldCheck,
  Building,
  Calendar,
  Landmark,
  ArrowRight,
  Eye,
  Trash2,
} from 'lucide-react';
import { Portal } from '@/components/Portal';
import { ClientPaymentProofIn } from '../types';

interface SubmitPaymentProofModalProps {
  isOpen: boolean;
  projectId: string;
  projectName?: string;
  clientCompanyName?: string | null;
  currentDueBalance?: number;
  onClose: () => void;
  onSubmit: (projectId: string, payload: ClientPaymentProofIn) => Promise<void>;
}

export function SubmitPaymentProofModal({
  isOpen,
  projectId,
  projectName = 'Survey Project',
  clientCompanyName,
  currentDueBalance = 0,
  onClose,
  onSubmit,
}: SubmitPaymentProofModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const todayStr = new Date().toISOString().slice(0, 10);

  const [amountStr, setAmountStr] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer (RTGS/NEFT)');
  const [paymentDate, setPaymentDate] = useState(todayStr);
  const [notes, setNotes] = useState('');
  const [slipFile, setSlipFile] = useState<{
    name: string;
    size: number;
    dataUrl: string;
    isImage: boolean;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewZoomOpen, setPreviewZoomOpen] = useState(false);

  if (!isOpen) return null;

  const enteredAmount = parseFloat(amountStr) || 0;
  const displayCompanyName = clientCompanyName || 'Client Account';

  const handleFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit. Please upload a smaller screenshot or PDF.');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setSlipFile({
        name: file.name,
        size: file.size,
        dataUrl,
        isImage: file.type.startsWith('image/'),
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (enteredAmount <= 0) {
      setError('Please enter a valid transferred payment amount greater than ₹0');
      return;
    }

    if (!referenceCode.trim()) {
      setError('Please provide the Bank Transaction ID / UTR Number for Operations clearance');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(projectId, {
        amount: enteredAmount,
        reference_code: referenceCode.trim(),
        payment_method: paymentMethod.trim(),
        payment_date: paymentDate,
        slip_url: slipFile?.dataUrl,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit payment proof');
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
            maxWidth: '580px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
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
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              backgroundColor: '#fafafa',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#f4f4f5',
                    border: '1px solid #e4e4e7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#09090b',
                  }}
                >
                  <Upload size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#09090b' }}>
                    Upload Payment Slip / Remittance Proof
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.15rem' }}>
                    {projectName} &bull; {displayCompanyName}
                  </div>
                </div>
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

          {/* Form Content */}
          <form
            onSubmit={handleSubmit}
            style={{
              padding: '1.5rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.15rem',
            }}
          >
            {/* Outstanding Balance Context Card */}
            <div
              style={{
                padding: '0.85rem 1.1rem',
                borderRadius: '8px',
                border: '1px solid #e4e4e7',
                backgroundColor: currentDueBalance > 0 ? '#fef2f2' : '#f4f4f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '0.725rem', color: '#71717a', fontWeight: 600 }}>Current Outstanding Balance</div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    color: currentDueBalance > 0 ? '#dc2626' : '#16a34a',
                    marginTop: '0.1rem',
                  }}
                >
                  ₹{Math.abs(currentDueBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, marginLeft: '0.4rem' }}>
                    {currentDueBalance > 0 ? 'Due' : 'Settled'}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e4e4e7',
                    color: '#52525b',
                  }}
                >
                  Manual Ops Clearance
                </span>
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Input Row 1: Amount & UTR */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#09090b', marginBottom: '0.35rem' }}>
                  Amount Paid (₹) <span style={{ color: '#dc2626' }}>*</span>
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
                    placeholder="0.00"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem 0.55rem 2rem',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      fontFamily: 'monospace',
                      borderRadius: '6px',
                      border: '1px solid #e4e4e7',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#09090b', marginBottom: '0.35rem' }}>
                  Bank UTR / Transaction ID <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-HDFC-992014881"
                  value={referenceCode}
                  onChange={(e) => setReferenceCode(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                    borderRadius: '6px',
                    border: '1px solid #e4e4e7',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Input Row 2: Payment Mode & Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#09090b', marginBottom: '0.35rem' }}>
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.825rem',
                    borderRadius: '6px',
                    border: '1px solid #e4e4e7',
                    backgroundColor: '#ffffff',
                    color: '#09090b',
                    outline: 'none',
                  }}
                >
                  <option value="Bank Transfer (RTGS/NEFT)">Bank Transfer (RTGS / NEFT)</option>
                  <option value="IMPS">IMPS Immediate Payment</option>
                  <option value="UPI / QR">UPI (Google Pay, PhonePe, Paytm)</option>
                  <option value="Corporate Wire Transfer">Corporate Wire Transfer</option>
                  <option value="Cheque / Demand Draft">Cheque / Demand Draft</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#09090b', marginBottom: '0.35rem' }}>
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.825rem',
                    borderRadius: '6px',
                    border: '1px solid #e4e4e7',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Slip Upload Zone */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#09090b', marginBottom: '0.35rem' }}>
                Upload Transaction Slip / Bank Screenshot
              </label>

              {!slipFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${isDragging ? '#09090b' : '#d4d4d8'}`,
                    borderRadius: '8px',
                    padding: '1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: isDragging ? '#fafafa' : '#ffffff',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileInputChange}
                    style={{ display: 'none' }}
                  />
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: '#f4f4f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 0.65rem',
                      color: '#52525b',
                    }}
                  >
                    <Upload size={18} />
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>
                    Click to upload or drag &amp; drop
                  </div>
                  <div style={{ fontSize: '0.725rem', color: '#71717a', marginTop: '0.2rem' }}>
                    PNG, JPG, WEBP, or PDF (Max 10MB)
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #e4e4e7',
                    backgroundColor: '#fafafa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                    {slipFile.isImage ? (
                      <img
                        src={slipFile.dataUrl}
                        alt="Slip preview"
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '6px',
                          objectFit: 'cover',
                          border: '1px solid #e4e4e7',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '6px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e4e4e7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#09090b',
                        }}
                      >
                        <FileText size={20} />
                      </div>
                    )}
                    <div style={{ overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: '0.825rem',
                          fontWeight: 700,
                          color: '#09090b',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {slipFile.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#71717a' }}>
                        {(slipFile.size / 1024).toFixed(1)} KB &bull; Attached
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {slipFile.isImage && (
                      <button
                        type="button"
                        onClick={() => setPreviewZoomOpen(true)}
                        style={{
                          border: '1px solid #e4e4e7',
                          backgroundColor: '#ffffff',
                          padding: '0.35rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <Eye size={12} />
                        <span>Preview</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSlipFile(null)}
                      style={{
                        border: '1px solid #fecaca',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                      title="Remove file"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Client Remarks */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#09090b', marginBottom: '0.35rem' }}>
                Client Audit Remarks / Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Paid via HDFC Current Account. Reference bill INV-2026-0001."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.825rem',
                  borderRadius: '6px',
                  border: '1px solid #e4e4e7',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Informational Verification Notice */}
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                border: '1px solid #e4e4e7',
                backgroundColor: '#fafafa',
                display: 'flex',
                gap: '0.65rem',
              }}
            >
              <ShieldCheck size={18} color="#09090b" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <div style={{ fontSize: '0.75rem', color: '#52525b', lineHeight: 1.45 }}>
                <strong style={{ color: '#09090b' }}>Manual Ops Verification Protocol:</strong> Latrics Operations team will
                manually inspect the transaction ID / UTR against corporate bank statements. Once validated, the verified paid
                amount will automatically be deducted from your due balance and reflected across the application.
              </div>
            </div>

            {/* Footer Buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                paddingTop: '0.5rem',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
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
                disabled={submitting || enteredAmount <= 0 || !referenceCode.trim()}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '6px',
                  border: '1px solid #09090b',
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  cursor: submitting || enteredAmount <= 0 || !referenceCode.trim() ? 'not-allowed' : 'pointer',
                  opacity: submitting || enteredAmount <= 0 || !referenceCode.trim() ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                {submitting ? (
                  <span>Submitting Proof...</span>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>Submit Payment Slip</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Image Zoom Modal */}
          {previewZoomOpen && slipFile?.isImage && (
            <div
              onClick={() => setPreviewZoomOpen(false)}
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
                  src={slipFile.dataUrl}
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
                  onClick={() => setPreviewZoomOpen(false)}
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
