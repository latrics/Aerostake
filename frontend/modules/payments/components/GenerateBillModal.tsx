'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Calculator, X, AlertCircle, Info, Check } from 'lucide-react';
import { Portal } from '@/components/Portal';
import { InvoiceCreate, InvoiceItem } from '../types';

interface GenerateBillModalProps {
  isOpen: boolean;
  projectId: string;
  projectName?: string;
  clientCompanyName?: string | null;
  previousBalance?: number; // positive = Due, negative = Credit
  initialSectorId?: string | null;
  sectors?: any[];
  onClose: () => void;
  onSubmit: (projectId: string, payload: InvoiceCreate) => Promise<void>;
}

function extractTenureNumber(tenureStr?: string): number {
  if (!tenureStr) return 1;
  const match = tenureStr.match(/(\d+(\.\d+)?)/);
  if (match) {
    const val = parseFloat(match[1]);
    return isNaN(val) || val <= 0 ? 1 : val;
  }
  return 1;
}

export function GenerateBillModal({
  isOpen,
  projectId,
  projectName = 'Survey Project',
  clientCompanyName,
  previousBalance = 0,
  initialSectorId,
  sectors,
  onClose,
  onSubmit,
}: GenerateBillModalProps) {
  const displayCompanyName = clientCompanyName || 'Client Organization';
  const todayStr = new Date().toISOString().slice(0, 10);
  const dueDefaultStr = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);

  const [title, setTitle] = useState('General Project Survey Services & Mobilization Bill');
  const [billDate, setBillDate] = useState(todayStr);
  const [dueDate, setDueDate] = useState(dueDefaultStr);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !title) {
      setTitle('General Project Survey Services & Mobilization Bill');
    }
  }, [isOpen]);

  // Clean, simple line items
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      sl_no: 1,
      date: todayStr,
      item_name: '',
      unit: 1,
      price: 0,
      tenure: '',
      multiply_tenure: false,
      total_price: 0,
    },
  ]);

  if (!isOpen) return null;

  const blockNegativeAndScientificKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
      e.preventDefault();
    }
  };

  const calculateLineTotal = (unit: number, price: number, tenure: string, multiply: boolean): number => {
    const u = Math.max(1, Math.abs(parseFloat(String(unit)) || 1));
    const p = Math.max(0, Math.abs(parseFloat(String(price)) || 0));
    if (multiply) {
      const t = extractTenureNumber(tenure);
      return Math.round(u * p * t * 100) / 100;
    }
    return Math.round(u * p * 100) / 100;
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, val: any) => {
    setItems((prev) => {
      const next = [...prev];
      const cur = { ...next[index] };

      if (field === 'unit') {
        const cleaned = String(val).replace(/[^0-9]/g, '');
        const parsed = parseInt(cleaned, 10);
        const u = isNaN(parsed) ? 1 : Math.max(1, parsed);
        cur.unit = u;
        cur.total_price = calculateLineTotal(u, cur.price, cur.tenure || '', !!cur.multiply_tenure);
      } else if (field === 'price') {
        const cleaned = String(val).replace(/[^0-9.]/g, '');
        const p = isNaN(parseFloat(cleaned)) ? 0 : Math.max(0, parseFloat(cleaned));
        cur.price = p;
        cur.total_price = calculateLineTotal(cur.unit, p, cur.tenure || '', !!cur.multiply_tenure);
      } else if (field === 'tenure') {
        cur.tenure = val;
        if (cur.multiply_tenure) {
          cur.total_price = calculateLineTotal(cur.unit, cur.price, val, true);
        }
      } else if (field === 'multiply_tenure') {
        const multiply = Boolean(val);
        cur.multiply_tenure = multiply;
        cur.total_price = calculateLineTotal(cur.unit, cur.price, cur.tenure || '', multiply);
      } else if (field === 'total_price') {
        const cleaned = String(val).replace(/[^0-9.]/g, '');
        const t = isNaN(parseFloat(cleaned)) ? 0 : Math.max(0, parseFloat(cleaned));
        cur.total_price = t;
      } else {
        (cur as any)[field] = val;
      }

      next[index] = cur;
      return next;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        sl_no: prev.length + 1,
        date: billDate || todayStr,
        item_name: '',
        unit: 1,
        price: 0,
        tenure: '',
        multiply_tenure: false,
        total_price: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setError('Invoice must contain at least one line item');
      return;
    }
    setItems((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((item, idx) => ({ ...item, sl_no: idx + 1 }));
    });
  };

  // Strictly positive total and forward balance impact calculation
  const totalAmount = Math.max(0, items.reduce((acc, it) => acc + Math.max(0, it.total_price || 0), 0));
  const projectedBalance = previousBalance + totalAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError('Please add at least one line item');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.item_name.trim()) {
        setError(`Item #${i + 1}: Item description is required`);
        return;
      }
      if (it.unit <= 0 || isNaN(it.unit)) {
        setError(`Item #${i + 1}: Quantity must be at least 1`);
        return;
      }
      if (it.price < 0 || isNaN(it.price)) {
        setError(`Item #${i + 1}: Price cannot be negative`);
        return;
      }
      if (it.total_price <= 0 || isNaN(it.total_price)) {
        setError(`Item #${i + 1}: Line total must be greater than ₹0`);
        return;
      }
    }

    if (totalAmount <= 0 || isNaN(totalAmount)) {
      setError('Total bill amount must be greater than ₹0. Negative inputs and reverse calculations are not permitted.');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(projectId, {
        title: title.trim() || 'General Project Survey Services Bill',
        bill_date: billDate,
        due_date: dueDate || undefined,
        items,
        total_amount: totalAmount,
        sector_id: null,
        sector_code: null,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to issue digital invoice');
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
            maxWidth: '980px',
            width: '100%',
            maxHeight: '92vh',
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
              padding: '1.25rem 1.75rem',
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
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                }}
              >
                <Calculator size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#09090b', letterSpacing: '-0.2px' }}>
                  Generate Digital Bill &amp; Invoice
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.775rem', color: '#71717a' }}>
                  Project: <strong>{projectName}</strong> · {displayCompanyName}
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
          <form
            onSubmit={handleSubmit}
            style={{
              overflowY: 'auto',
              padding: '1.5rem 1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
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



            {/* Bill Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Bill Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.825rem', height: '36px', borderRadius: '6px' }}
                  placeholder="e.g. Phase 1 Aerial Mapping & GCP Survey Bill"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Bill Date *
                </label>
                <input
                  type="date"
                  required
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.825rem', height: '36px', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Payment Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.825rem', height: '36px', borderRadius: '6px' }}
                />
              </div>
            </div>

            {/* Items Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
                  Line Items
                </span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.35rem 0.75rem',
                    backgroundColor: '#ffffff',
                    color: '#09090b',
                    borderRadius: '6px',
                    border: '1px solid #d4d4d8',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <Plus size={13} />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div style={{ border: '1px solid #e4e4e7', borderRadius: '8px', overflowX: 'auto', backgroundColor: '#ffffff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '780px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e4e4e7', textAlign: 'left', color: '#71717a', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <th style={{ padding: '0.65rem 0.5rem', width: '35px', textAlign: 'center' }}>#</th>
                      <th style={{ padding: '0.65rem 0.4rem', width: '120px' }}>Date</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Item Description</th>
                      <th style={{ padding: '0.65rem 0.4rem', width: '75px', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '0.65rem 0.4rem', width: '100px', textAlign: 'right' }}>Price (₹)</th>
                      <th style={{ padding: '0.65rem 0.4rem', width: '150px' }}>Tenure</th>
                      <th style={{ padding: '0.65rem 0.6rem', width: '130px', textAlign: 'right' }}>Total (₹)</th>
                      <th style={{ padding: '0.65rem 0.35rem', width: '36px', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const tNum = extractTenureNumber(item.tenure);
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f4f4f5', verticalAlign: 'top' }}>
                          {/* Sl */}
                          <td style={{ padding: '0.65rem 0.4rem', textAlign: 'center', fontWeight: 700, color: '#71717a', fontSize: '0.75rem' }}>
                            {item.sl_no}
                          </td>

                          {/* Date */}
                          <td style={{ padding: '0.5rem 0.35rem' }}>
                            <input
                              type="date"
                              value={item.date}
                              onChange={(e) => handleItemChange(idx, 'date', e.target.value)}
                              style={{
                                fontSize: '0.775rem',
                                height: '32px',
                                width: '100%',
                                padding: '0 0.4rem',
                                border: '1px solid #e4e4e7',
                                borderRadius: '4px',
                              }}
                            />
                          </td>

                          {/* Item Name */}
                          <td style={{ padding: '0.5rem 0.35rem' }}>
                            <input
                              type="text"
                              required
                              value={item.item_name}
                              onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                              placeholder="e.g. Drone rental / Transport / Hotel"
                              style={{
                                fontSize: '0.775rem',
                                height: '32px',
                                width: '100%',
                                padding: '0 0.5rem',
                                border: '1px solid #e4e4e7',
                                borderRadius: '4px',
                              }}
                            />
                          </td>

                          {/* Unit / Qty */}
                          <td style={{ padding: '0.5rem 0.35rem' }}>
                            <input
                              type="number"
                              step="1"
                              min="1"
                              required
                              value={item.unit}
                              onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                              onKeyDown={blockNegativeAndScientificKeys}
                              style={{
                                fontSize: '0.775rem',
                                height: '32px',
                                width: '100%',
                                padding: '0 0.25rem',
                                border: '1px solid #e4e4e7',
                                borderRadius: '4px',
                                textAlign: 'center',
                                fontFamily: 'monospace',
                              }}
                            />
                          </td>

                          {/* Price */}
                          <td style={{ padding: '0.5rem 0.35rem' }}>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              required
                              value={item.price}
                              onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                              onKeyDown={blockNegativeAndScientificKeys}
                              style={{
                                fontSize: '0.775rem',
                                height: '32px',
                                width: '100%',
                                padding: '0 0.35rem',
                                border: '1px solid #e4e4e7',
                                borderRadius: '4px',
                                textAlign: 'right',
                                fontFamily: 'monospace',
                              }}
                            />
                          </td>

                          {/* Tenure + Simple Multiplier Checkbox */}
                          <td style={{ padding: '0.5rem 0.35rem' }}>
                            <input
                              type="text"
                              value={item.tenure || ''}
                              onChange={(e) => handleItemChange(idx, 'tenure', e.target.value)}
                              placeholder="e.g. 3 Days"
                              style={{
                                fontSize: '0.775rem',
                                height: '32px',
                                width: '100%',
                                padding: '0 0.4rem',
                                border: '1px solid #e4e4e7',
                                borderRadius: '4px',
                              }}
                            />
                            <label
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontSize: '0.7rem',
                                color: item.multiply_tenure ? '#4338ca' : '#71717a',
                                fontWeight: item.multiply_tenure ? 700 : 500,
                                marginTop: '4px',
                                cursor: 'pointer',
                                userSelect: 'none',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={!!item.multiply_tenure}
                                onChange={(e) => handleItemChange(idx, 'multiply_tenure', e.target.checked)}
                                style={{ cursor: 'pointer' }}
                              />
                              <span>× with tenure</span>
                            </label>
                          </td>

                          {/* Total (Auto-calculated, Read-only) */}
                          <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>
                            <div
                              title="Auto-calculated (Qty × Price)"
                              style={{
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                height: '32px',
                                width: '100%',
                                padding: '0 0.5rem',
                                border: '1px solid #e2e8f0',
                                borderRadius: '4px',
                                textAlign: 'right',
                                fontFamily: 'monospace',
                                color: '#09090b',
                                backgroundColor: '#f8fafc',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                userSelect: 'none',
                              }}
                            >
                              ₹{item.total_price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            {item.multiply_tenure && (
                              <span style={{ fontSize: '0.675rem', color: '#4338ca', fontWeight: 600, display: 'block', marginTop: '2px' }}>
                                {item.unit} × ₹{item.price} × {tNum}d
                              </span>
                            )}
                          </td>

                          {/* Remove */}
                          <td style={{ padding: '0.5rem 0.25rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              title="Remove row"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '0.2rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Footer Total */}
                <div
                  style={{
                    padding: '0.85rem 1.25rem',
                    backgroundColor: '#fafafa',
                    borderTop: '2px solid #09090b',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#09090b', letterSpacing: '0.5px' }}>
                    Total Bill Amount
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                    <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#09090b', fontFamily: 'monospace' }}>
                      ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Wallet Impact Banner */}
            <div
              style={{
                padding: '0.85rem 1.15rem',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', fontWeight: 700, color: '#0f172a' }}>
                <Info size={14} color="#4f46e5" />
                <span>Client Wallet — Cumulative Balance Impact</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.775rem' }}>
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>Previous Balance</span>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: previousBalance > 0 ? '#dc2626' : previousBalance < 0 ? '#16a34a' : '#09090b', fontFamily: 'monospace' }}>
                    ₹{Math.abs(previousBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>+ New Bill (Adds to Balance)</span>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#4f46e5', fontFamily: 'monospace' }}>
                    +₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#ffffff', borderRadius: '6px', border: '2px solid #09090b' }}>
                  <span style={{ color: '#09090b', fontWeight: 700, display: 'block', fontSize: '0.7rem' }}>= Resulting Balance</span>
                  <span style={{ fontWeight: 900, fontSize: '1rem', color: projectedBalance > 0 ? '#dc2626' : '#16a34a', fontFamily: 'monospace' }}>
                    ₹{Math.abs(projectedBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Invoice Notes &amp; Remittance Terms
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Payment due within 15 calendar days via direct RTGS/NEFT remittance..."
                className="form-input"
                style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem 0.75rem', resize: 'vertical', borderRadius: '6px' }}
              />
            </div>

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '0.75rem',
                paddingTop: '0.5rem',
                borderTop: '1px solid #e4e4e7',
              }}
            >
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
                disabled={submitting || totalAmount <= 0}
                style={{
                  padding: '0.55rem 1.4rem',
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  backgroundColor: submitting || totalAmount <= 0 ? '#a1a1aa' : '#09090b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: submitting || totalAmount <= 0 ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {submitting
                  ? 'Generating Digital Invoice...'
                  : totalAmount <= 0
                  ? 'Enter Bill Amounts to Issue Invoice'
                  : `Issue Digital Invoice (₹${totalAmount.toLocaleString('en-IN')})`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}
