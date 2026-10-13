'use client';

import React from 'react';
import Link from 'next/link';
import WireframeBox from '@/components/WireframeBox';
import {
  Wallet,
  MapPin,
  Cpu,
  Calendar,
  ExternalLink,
  Receipt,
  CreditCard,
  Plus,
  Loader2,
  FileText,
  Eye,
  Inbox,
  Upload,
  ShieldCheck,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { Project } from '@/modules/projects/types';
import { PaymentRecord, Invoice, ClientWalletSummary } from '@/modules/payments/types';
import { ClientWalletCard } from './ClientWalletCard';
import {
  formatCurrency,
  formatDate,
  formatLocation,
  getPayload,
  openSlipInNewTab,
} from '../utils/formatters';

interface ProjectFinancialDetailsViewProps {
  selectedProject: Project;
  wallet: ClientWalletSummary | null;
  activeTab: 'invoices' | 'milestones';
  setActiveTab: (tab: 'invoices' | 'milestones') => void;
  invoices: Invoice[];
  payments: PaymentRecord[];
  isLoadingInvoices: boolean;
  isLoadingPayments: boolean;
  isLoadingWallet: boolean;
  isClient: boolean;
  onRefresh: () => void;
  onOpenGenerateBill: () => void;
  onOpenSubmitProof: () => void;
  onViewInvoice: (inv: Invoice) => void;
  onViewInvoiceByNumber: (invNumber: string) => void;
  onVerifyPayment: (pay: PaymentRecord) => void;
}

export const ProjectFinancialDetailsView: React.FC<ProjectFinancialDetailsViewProps> = ({
  selectedProject,
  wallet,
  activeTab,
  setActiveTab,
  invoices,
  payments,
  isLoadingInvoices,
  isLoadingPayments,
  isLoadingWallet,
  isClient,
  onRefresh,
  onOpenGenerateBill,
  onOpenSubmitProof,
  onViewInvoice,
  onViewInvoiceByNumber,
  onVerifyPayment,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Project Details Bar */}
      <div
        className="wf-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <WireframeBox width={46} height={46} style={{ borderRadius: '6px', flexShrink: 0 }}>
              <Wallet size={22} color="#09090b" />
            </WireframeBox>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#09090b' }}>
                  {selectedProject.title}
                </h3>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: '#f4f4f5',
                    color: '#18181b',
                    border: '1px solid #d4d4d8',
                    textTransform: 'capitalize',
                  }}
                >
                  {selectedProject.status}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  ID: {selectedProject.id.slice(0, 8)}...
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                  <MapPin size={14} color="#71717a" />
                  <span>{formatLocation(selectedProject)}</span>
                </div>
                {getPayload(selectedProject) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                    <Cpu size={14} color="#71717a" />
                    <span>Payload: {getPayload(selectedProject)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                  <Calendar size={14} color="#71717a" />
                  <span>Created: {formatDate(selectedProject.created_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action: Open Full Project Overview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link
              href={`/projects/${selectedProject.id}/overview`}
              className="wf-btn wf-btn-outline"
              style={{
                fontSize: '0.775rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.75rem',
                textDecoration: 'none',
                color: '#09090b',
              }}
            >
              <span>Project Overview</span>
              <ExternalLink size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── CLIENT CUMULATIVE WALLET CARD ── */}
      <ClientWalletCard
        wallet={wallet}
        isLoading={isLoadingWallet}
        isClient={isClient}
        onGenerateBill={!isClient ? onOpenGenerateBill : undefined}
        onSubmitPaymentProof={isClient ? onOpenSubmitProof : undefined}
        onRefresh={onRefresh}
        onViewInvoice={onViewInvoiceByNumber}
      />

      {/* Section Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('invoices')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.825rem',
            fontWeight: 700,
            padding: '0.45rem 0.85rem',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'invoices' ? '#09090b' : '#f4f4f5',
            color: activeTab === 'invoices' ? '#ffffff' : '#52525b',
            transition: 'all 0.15s ease',
          }}
        >
          <Receipt size={14} />
          <span>Digital Invoices &amp; Bills ({invoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('milestones')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.825rem',
            fontWeight: 700,
            padding: '0.45rem 0.85rem',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'milestones' ? '#09090b' : '#f4f4f5',
            color: activeTab === 'milestones' ? '#ffffff' : '#52525b',
            transition: 'all 0.15s ease',
          }}
        >
          <CreditCard size={14} />
          <span>Payment Slips &amp; Verifications ({payments.length})</span>
        </button>
      </div>

      {/* ── TAB 1: DIGITAL INVOICES & BILLS ── */}
      {activeTab === 'invoices' && (
        <div className="wf-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#09090b' }}>
                Generated Invoices &amp; Digital Bills
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Itemized cost bills recorded for {selectedProject.title}. Automatically adjusts cumulative client balance.
              </span>
            </div>
            {!isClient && (
              <button
                onClick={onOpenGenerateBill}
                className="wf-btn wf-btn-outline"
                style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.65rem' }}
              >
                <Plus size={13} />
                <span>Create Digital Bill</span>
              </button>
            )}
          </div>

          {isLoadingInvoices ? (
            <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
              <p style={{ fontSize: '0.85rem' }}>Loading digital invoices...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                textAlign: 'center',
                backgroundColor: '#fafafa',
                gap: '0.75rem',
              }}
            >
              <FileText size={28} color="#71717a" />
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b' }}>
                No Digital Bills Generated Yet
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '420px' }}>
                {isClient
                  ? 'Itemized digital service bills issued by Latrics Operations will appear here once generated.'
                  : 'Operations team can create itemized digital bills with custom unit costs, tenure, and automatic totals.'}
              </p>
              {!isClient && (
                <button
                  onClick={onOpenGenerateBill}
                  className="wf-btn"
                  style={{
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} />
                  <span>Generate First Bill</span>
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="wf-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Target / Sector</th>
                    <th>Bill Date</th>
                    <th>Due Date</th>
                    <th>Items Count</th>
                    <th style={{ textAlign: 'right' }}>Total Bill (INR)</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition">
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Receipt size={15} color="#4f46e5" />
                          <span style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '0.85rem', color: '#09090b' }}>
                            {inv.invoice_number}
                          </span>
                        </div>
                      </td>
                      <td>
                        {inv.sector_code ? (
                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            Sector {inv.sector_code}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: 600,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              backgroundColor: '#f4f4f5',
                              color: '#52525b',
                              border: '1px solid #e4e4e7',
                            }}
                          >
                            General (Project)
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {formatDate(inv.bill_date)}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {formatDate(inv.due_date)}
                      </td>
                      <td style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        {inv.items ? inv.items.length : 0} items
                      </td>
                      <td style={{ fontWeight: 800, fontSize: '0.9rem', textAlign: 'right', color: '#09090b' }}>
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            textTransform: 'capitalize',
                            backgroundColor: inv.status === 'paid' ? '#ecfdf5' : '#fff1f2',
                            color: inv.status === 'paid' ? '#047857' : '#be123c',
                            border: inv.status === 'paid' ? '1px solid #a7f3d0' : '1px solid #fecdd3',
                          }}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {inv.created_by || 'Ops Admin'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => onViewInvoice(inv)}
                          className="wf-btn wf-btn-outline"
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.3rem 0.65rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={13} />
                          <span>View / Print Bill</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: PAYMENT SLIPS & VERIFICATIONS ── */}
      {activeTab === 'milestones' && (
        <div className="wf-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>
                Payment Slips &amp; Verifications ({selectedProject.title})
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Client payment remittance submissions and Operations verification audit stamps
              </span>
            </div>
            {isClient && (
              <button
                onClick={onOpenSubmitProof}
                className="wf-btn"
                style={{
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                  fontSize: '0.775rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Upload size={14} />
                <span>Upload Payment Slip</span>
              </button>
            )}
          </div>

          {isLoadingPayments ? (
            <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
              <p style={{ fontSize: '0.85rem' }}>Loading milestone ledger...</p>
            </div>
          ) : payments.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                textAlign: 'center',
                backgroundColor: '#fafafa',
                gap: '0.5rem',
              }}
            >
              <Inbox size={24} color="#71717a" />
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#09090b' }}>
                No Milestone Records for {selectedProject.title}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '380px' }}>
                No milestone invoices or client payment slips have been submitted yet for this survey project.
              </p>
              {isClient && (
                <button
                  onClick={onOpenSubmitProof}
                  className="wf-btn"
                  style={{
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginTop: '0.5rem',
                  }}
                >
                  <Upload size={14} />
                  <span>Upload First Payment Slip</span>
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="wf-table">
                <thead>
                  <tr>
                    <th>Milestone / Remittance</th>
                    <th>Amount (INR)</th>
                    <th>Status</th>
                    <th>Payment Method</th>
                    <th>Date</th>
                    <th>Bank UTR / Ref</th>
                    <th>Payment Slip</th>
                    <th style={{ textAlign: 'right' }}>Audit Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((pay) => {
                    const isPending = pay.status === 'pending';
                    const isVerified = pay.status === 'verified';
                    const hasSlip = Boolean(pay.slip_url);

                    return (
                      <tr key={pay.id}>
                        <td style={{ fontWeight: 700, color: '#09090b' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CreditCard size={15} color="#71717a" />
                            <span>{pay.milestone_name}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 800 }}>{formatCurrency(pay.amount_inr ?? pay.amount_usd ?? 0)}</td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.55rem',
                              backgroundColor: isVerified ? '#ecfdf5' : isPending ? '#fffbeb' : '#fef2f2',
                              color: isVerified ? '#16a34a' : isPending ? '#d97706' : '#dc2626',
                              borderRadius: '4px',
                              border: `1px solid ${isVerified ? '#bbf7d0' : isPending ? '#fde68a' : '#fecaca'}`,
                              textTransform: 'capitalize',
                            }}
                          >
                            {isPending ? 'Pending Ops Audit' : isVerified ? 'Verified Clearance' : pay.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                          {pay.payment_method || 'Bank Transfer (RTGS)'}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {formatDate(pay.verified_at || pay.created_at)}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#09090b', fontWeight: 600 }}>
                          {pay.bank_reference || pay.reference_code || '—'}
                        </td>
                        <td>
                          {hasSlip ? (
                            <button
                              type="button"
                              onClick={() => openSlipInNewTab(pay.slip_url!)}
                              style={{
                                border: '1px solid #e4e4e7',
                                backgroundColor: '#ffffff',
                                padding: '0.25rem 0.55rem',
                                borderRadius: '4px',
                                fontSize: '0.725rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                color: '#09090b',
                              }}
                              title="Open slip in new tab"
                            >
                              <ExternalLink size={12} />
                              <span>Open Slip</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {!isClient && isPending ? (
                            <button
                              type="button"
                              onClick={() => onVerifyPayment(pay)}
                              style={{
                                backgroundColor: '#16a34a',
                                color: '#ffffff',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                border: 'none',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                boxShadow: '0 1px 2px rgba(22, 163, 74, 0.25)',
                              }}
                            >
                              <ShieldCheck size={13} />
                              <span>Audit &amp; Verify</span>
                            </button>
                          ) : isVerified ? (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#16a34a',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              <CheckCircle2 size={13} />
                              <span>Cleared</span>
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Awaiting Ops</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Disclaimer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-color)', fontSize: '0.725rem', color: 'var(--text-muted)', backgroundColor: '#fafafa' }}>
            <Info size={14} style={{ flexShrink: 0 }} />
            <span>
              Payments are recorded and verified by LATRICS billing team. All transactions occur via direct RTGS/NEFT to designated bank accounts.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
