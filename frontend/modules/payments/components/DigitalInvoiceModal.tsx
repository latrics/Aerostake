'use client';

import React, { useRef } from 'react';
import { Download, Printer, CheckCircle2, Building, Calendar, FileText, ArrowLeft, ShieldCheck, Mail, MapPin, X } from 'lucide-react';
import { Portal } from '@/components/Portal';
import { Invoice } from '../types';

interface DigitalInvoiceModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  projectName?: string | null;
  clientCompanyName?: string | null;
  clientEmail?: string | null;
  surveyLocation?: string | null;
  onClose: () => void;
}

function numberToIndianWords(num: number): string {
  if (!num || isNaN(num)) return 'Zero Rupees Only';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    } else if (n > 0) {
      str += a[n];
    }
    return str.trim();
  }

  const integerPart = Math.floor(Math.abs(num));
  if (integerPart === 0) return 'Zero Rupees Only';

  let str = '';
  const crore = Math.floor(integerPart / 10000000);
  const lakh = Math.floor((integerPart % 10000000) / 100000);
  const thousand = Math.floor((integerPart % 100000) / 1000);
  const remainder = integerPart % 1000;

  if (crore > 0) str += inWords(crore) + ' Crore ';
  if (lakh > 0) str += inWords(lakh) + ' Lakh ';
  if (thousand > 0) str += inWords(thousand) + ' Thousand ';
  if (remainder > 0) str += inWords(remainder);

  return `Indian Rupees ${str.trim()} Only`;
}

export function DigitalInvoiceModal({
  isOpen,
  invoice,
  projectName = 'Survey Project',
  clientCompanyName,
  clientEmail,
  surveyLocation,
  onClose,
}: DigitalInvoiceModalProps) {
  const displayProjectName = projectName || 'Survey Project';
  const displayCompanyName = clientCompanyName || 'Client Enterprise';
  const displayEmail = clientEmail || 'accounts@client.com';
  const displayLocation = surveyLocation || 'Survey Site';
  const invoiceRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !invoice) return null;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCsv = () => {
    const headers = ['Sl No.', 'Date', 'Item Name', 'Unit / Qty', 'Price (INR)', 'Tenure', 'Total Price (INR)'];
    const rows = (invoice.items || []).map((it) => [
      it.sl_no,
      it.date,
      `"${(it.item_name || '').replace(/"/g, '""')}"`,
      it.unit,
      it.price,
      `"${it.tenure || ''}"`,
      it.total_price,
    ]);

    const csvContent =
      `"Invoice Number","${invoice.invoice_number}"\n` +
      `"Project","${displayProjectName}"\n` +
      `"Client","${displayCompanyName}"\n` +
      `"Bill Date","${invoice.bill_date}"\n` +
      `"Total Amount","INR ${invoice.total_amount}"\n\n` +
      headers.join(',') +
      '\n' +
      rows.map((r) => r.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${invoice.invoice_number}_statement.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            maxWidth: '920px',
            width: '100%',
            backgroundColor: '#f4f4f5',
            borderRadius: '12px',
            border: '1px solid #e4e4e7',
            padding: 0,
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            margin: 'auto',
            maxHeight: '94vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Top Control Bar (Non-printed, Sticky Header) */}
          <div
            className="no-print"
            style={{
              flexShrink: 0,
              padding: '0.85rem 1.5rem',
              borderBottom: '1px solid #e4e4e7',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Digital Bill Preview
              </span>
              <span
                style={{
                  fontSize: '0.825rem',
                  fontWeight: 800,
                  color: '#09090b',
                  fontFamily: 'monospace',
                  backgroundColor: '#f4f4f5',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid #e4e4e7',
                }}
              >
                {invoice.invoice_number}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleDownloadCsv}
                style={{
                  fontSize: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.75rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #d4d4d8',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: '#09090b',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                }}
              >
                <Download size={13} /> Export CSV
              </button>

              <button
                type="button"
                onClick={handlePrint}
                style={{
                  fontSize: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.85rem',
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                }}
              >
                <Printer size={13} /> Print / Save as PDF
              </button>

              <button
                type="button"
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
                  marginLeft: '0.25rem',
                }}
                title="Close modal"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* ── Scrollable Document Container ── */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.75rem 1.25rem',
              backgroundColor: '#f4f4f5',
            }}
          >
            {/* ── Printable Digital Invoice Paper ── */}
            <div
              ref={invoiceRef}
              id="digital-invoice-printable"
              style={{
                maxWidth: '820px',
                margin: '0 auto',
                padding: '2.5rem',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e4e4e7',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
                color: '#09090b',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              }}
            >
              {/* Invoice Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #09090b', paddingBottom: '1.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.5px', color: '#09090b' }}>
                      AEROSTAKE
                    </span>
                    <span style={{ fontSize: '0.75rem', backgroundColor: '#09090b', color: '#ffffff', padding: '0.15rem 0.45rem', borderRadius: '3px', fontWeight: 700 }}>
                      ENTERPRISE
                    </span>
                  </div>
                  <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: '#71717a' }}>
                    LATRICS Aerial Survey &amp; Industrial Mapping Operations
                  </p>
                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.75rem', color: '#71717a' }}>
                    GSTIN: 29AABCL1234F1Z5 · corporate@latrics.com
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#09090b', letterSpacing: '-0.5px' }}>
                    TAX INVOICE
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, fontFamily: 'monospace', color: '#09090b', marginTop: '0.2rem' }}>
                    {invoice.invoice_number}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.25rem' }}>
                    Issued: <strong>{formatDate(invoice.bill_date)}</strong>
                  </div>
                  {invoice.due_date && (
                    <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.1rem' }}>
                      Due Date: <strong>{formatDate(invoice.due_date)}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Billed To & Project Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', margin: '1.5rem 0', padding: '1rem', backgroundColor: '#fafafa', borderRadius: '6px', border: '1px solid #e4e4e7' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#71717a', letterSpacing: '0.5px' }}>
                    BILLED TO:
                  </span>
                  <h4 style={{ margin: '0.3rem 0 0.15rem 0', fontSize: '1rem', fontWeight: 800, color: '#09090b' }}>
                    {displayCompanyName}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.775rem', color: '#52525b' }}>
                    {displayEmail}
                  </p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#71717a' }}>
                    Survey Site: {displayLocation}
                  </p>
                </div>

                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#71717a', letterSpacing: '0.5px' }}>
                    PROJECT DETAILS:
                  </span>
                  <h4 style={{ margin: '0.3rem 0 0.15rem 0', fontSize: '1rem', fontWeight: 800, color: '#09090b' }}>
                    {displayProjectName}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#71717a', fontFamily: 'monospace' }}>
                    Project ID: {invoice.project_id}
                  </p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#52525b' }}>
                    Subject: {invoice.title}
                  </p>
                </div>
              </div>

              {/* Line Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', margin: '1.5rem 0', fontSize: '0.825rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #09090b', textAlign: 'left', fontSize: '0.725rem', textTransform: 'uppercase', color: '#52525b' }}>
                    <th style={{ padding: '0.65rem 0.5rem', width: '45px' }}>#</th>
                    <th style={{ padding: '0.65rem 0.5rem', width: '110px' }}>Date</th>
                    <th style={{ padding: '0.65rem 0.5rem' }}>Item Description</th>
                    <th style={{ padding: '0.65rem 0.5rem', width: '70px', textAlign: 'center' }}>Unit</th>
                    <th style={{ padding: '0.65rem 0.5rem', width: '100px', textAlign: 'right' }}>Price (₹)</th>
                    <th style={{ padding: '0.65rem 0.5rem', width: '90px' }}>Tenure</th>
                    <th style={{ padding: '0.65rem 0.5rem', width: '120px', textAlign: 'right' }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.items || []).map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e4e4e7' }}>
                      <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700, color: '#71717a' }}>{it.sl_no}</td>
                      <td style={{ padding: '0.65rem 0.5rem', color: '#52525b' }}>{formatDate(it.date)}</td>
                      <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600, color: '#09090b' }}>{it.item_name}</td>
                      <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', color: '#52525b' }}>{it.unit}</td>
                      <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontFamily: 'monospace' }}>
                        ₹{Number(it.price).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', color: '#71717a', fontSize: '0.775rem' }}>
                        {it.tenure || '—'}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontWeight: 800, fontFamily: 'monospace', color: '#09090b' }}>
                        ₹{Number(it.total_price).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Bill Totals & Amount in Words */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', marginTop: '1.5rem', alignItems: 'flex-start' }}>
                {/* Left: Amount in Words & Terms */}
                <div style={{ padding: '1rem', backgroundColor: '#fafafa', border: '1px solid #e4e4e7', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.725rem', fontWeight: 800, textTransform: 'uppercase', color: '#71717a', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>
                    Total Amount in Words
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b', lineHeight: 1.4 }}>
                    {numberToIndianWords(invoice.total_amount)}
                  </div>
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px dashed #e4e4e7', fontSize: '0.725rem', color: '#71717a' }}>
                    <span>Payment Terms: </span>
                    <strong style={{ color: '#09090b' }}>
                      {invoice.due_date ? `Due on or before ${formatDate(invoice.due_date)}` : 'Due upon receipt'}
                    </strong>
                  </div>
                </div>

                {/* Right: Bill Subtotal & Total */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#52525b', padding: '0 0.5rem' }}>
                    <span>Subtotal:</span>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>₹{invoice.total_amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#52525b', padding: '0 0.5rem' }}>
                    <span>Taxes &amp; Levies (Included):</span>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>₹0</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      backgroundColor: '#09090b',
                      color: '#ffffff',
                      borderRadius: '6px',
                      marginTop: '0.5rem',
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase' }}>
                      Total Invoice Bill
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900 }}>
                      ₹{invoice.total_amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bank Wire Payment Remittance Details */}
              <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #e4e4e7', borderRadius: '6px', fontSize: '0.75rem', backgroundColor: '#fafafa' }}>
                <span style={{ fontWeight: 800, textTransform: 'uppercase', color: '#09090b', display: 'block', marginBottom: '0.35rem' }}>
                  Bank Wire / RTGS Payment Details:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.5rem', color: '#52525b' }}>
                  <div>Bank Name: <strong>HDFC Bank Ltd.</strong></div>
                  <div>Account Name: <strong>LATRICS PRIVATE LIMITED</strong></div>
                  <div>Account Number: <strong>50200088991122</strong></div>
                  <div>IFSC Code: <strong>HDFC0001234</strong></div>
                  <div>Account Type: <strong>Current Account</strong></div>
                  <div>Branch: <strong>Indiranagar, Bengaluru</strong></div>
                </div>
                {invoice.notes && (
                  <p style={{ margin: '0.75rem 0 0 0', color: '#71717a', fontSize: '0.725rem', fontStyle: 'italic' }}>
                    Note: {invoice.notes}
                  </p>
                )}
              </div>

              {/* Footer Signature Notice */}
              <div style={{ marginTop: '2.5rem', paddingTop: '1rem', borderTop: '1px solid #e4e4e7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#a1a1aa' }}>
                <span>This is a computer-generated digital invoice. No physical signature is required.</span>
                <span>Aerostake Cloud Ledger System · Timestamp: {new Date().toISOString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
