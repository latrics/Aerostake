'use client';

import React, { useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  History,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Coins,
  Upload,
} from 'lucide-react';
import type { ClientWalletSummary, WalletLedgerEntry } from '../types';

interface ClientWalletCardProps {
  wallet: ClientWalletSummary | null;
  isLoading?: boolean;
  isClient?: boolean;
  onGenerateBill?: () => void;
  onSubmitPaymentProof?: () => void;
  onRefresh?: () => void;
  onViewInvoice?: (invoiceNumber: string) => void;
}

export const ClientWalletCard: React.FC<ClientWalletCardProps> = ({
  wallet,
  isLoading = false,
  isClient = false,
  onGenerateBill,
  onSubmitPaymentProof,
  onRefresh,
  onViewInvoice,
}) => {
  const [showLedger, setShowLedger] = useState(false);

  if (isLoading) {
    return (
      <div
        className="wf-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          padding: '1.5rem',
          backgroundColor: '#ffffff',
          border: '1px solid #e4e4e7',
          borderRadius: '10px',
        }}
      >
        <div style={{ height: '24px', width: '35%', backgroundColor: '#f4f4f5', borderRadius: '4px' }} />
        <div style={{ height: '48px', width: '50%', backgroundColor: '#f4f4f5', borderRadius: '6px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '0.5rem' }}>
          <div style={{ height: '70px', backgroundColor: '#f4f4f5', borderRadius: '6px' }} />
          <div style={{ height: '70px', backgroundColor: '#f4f4f5', borderRadius: '6px' }} />
          <div style={{ height: '70px', backgroundColor: '#f4f4f5', borderRadius: '6px' }} />
        </div>
      </div>
    );
  }

  if (!wallet) {
    return null;
  }

  const isDue = wallet.status === 'due';
  const isSettled = wallet.status === 'settled';
  const isCredit = wallet.status === 'credit';

  const formatCurrency = (amount: number) => {
    return `₹${Math.abs(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Export ledger to CSV
  const handleExportLedgerCSV = () => {
    if (!wallet.ledger_entries || wallet.ledger_entries.length === 0) return;
    const headers = ['Date', 'Type', 'Reference', 'Description', 'Amount Billed', 'Amount Paid', 'Running Balance', 'Status'];
    const rows = wallet.ledger_entries.map((entry) => [
      entry.date,
      entry.type.toUpperCase(),
      entry.reference,
      `"${entry.description.replace(/"/g, '""')}"`,
      entry.amount_billed,
      entry.amount_paid,
      entry.running_balance,
      entry.balance_status.toUpperCase()
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Wallet_Ledger_${wallet.project_id || 'Client'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e4e4e7',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* ── TOP HEADER: TITLE & PRIMARY ACTIONS ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid #f4f4f5',
          paddingBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isDue ? '#fef2f2' : '#ecfdf5',
              border: isDue ? '1px solid #fecaca' : '1px solid #a7f3d0',
              color: isDue ? '#dc2626' : '#059669',
              flexShrink: 0
            }}
          >
            <Wallet size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.2px' }}>
                Client Billing Wallet
              </h3>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  backgroundColor: '#f4f4f5',
                  color: '#52525b',
                  border: '1px solid #e4e4e7',
                }}
              >
                Cumulative Running Balance
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#71717a' }}>
              {wallet.project_title ? `Project: ${wallet.project_title}` : 'All finalized billing & recorded payments roll into one continuous balance'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Refresh Wallet Balance"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '6px',
                border: '1px solid #e4e4e7',
                backgroundColor: '#ffffff',
                color: '#52525b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <RefreshCw size={14} />
            </button>
          )}

          {/* Client Action: Upload Payment Slip (Only for clients) */}
          {isClient && onSubmitPaymentProof && (
            <button
              onClick={onSubmitPaymentProof}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#09090b',
                color: '#ffffff',
                fontSize: '0.775rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.15s ease'
              }}
            >
              <Upload size={14} />
              <span>Upload Payment Slip</span>
            </button>
          )}

          {/* Ops/Admin Action: Generate Digital Bill (Only for Ops/Admin, never client) */}
          {!isClient && onGenerateBill && (
            <button
              onClick={onGenerateBill}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#09090b',
                color: '#ffffff',
                fontSize: '0.775rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.15s ease'
              }}
            >
              <Plus size={14} />
              <span>Generate Digital Bill</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 3-COLUMN METRIC TILES DISPLAY ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* TILE 1: CUMULATIVE WALLET BALANCE */}
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            border: '1px solid #e4e4e7',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#71717a' }}>
              Current Wallet Balance
            </span>
          </div>

          <div>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 900,
                fontFamily: 'monospace',
                letterSpacing: '-0.5px',
                color: isDue ? '#dc2626' : '#16a34a',
              }}
            >
              {formatCurrency(wallet.current_balance)}
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#71717a' }}>
              Cumulative running balance across all finalized bills and verified payments
            </p>
          </div>
        </div>

        {/* TILE 2: TOTAL BILLED */}
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '10px',
            backgroundColor: '#fafafa',
            border: '1px solid #e4e4e7',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#71717a' }}>
              Total Finalized Invoices
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338ca' }}>
              <ArrowUpRight size={15} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#09090b', fontFamily: 'monospace' }}>
              {formatCurrency(wallet.total_billed)}
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#71717a' }}>
              Cumulative sum of all digital bills generated
            </p>
          </div>
        </div>

        {/* TILE 3: TOTAL PAYMENTS */}
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '10px',
            backgroundColor: '#fafafa',
            border: '1px solid #e4e4e7',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#71717a' }}>
              Payments Received
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
              <ArrowDownLeft size={15} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>
              {formatCurrency(wallet.total_paid)}
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#71717a' }}>
              Verified and cleared client remittances
            </p>
          </div>
        </div>
      </div>

      {/* ── CUMULATIVE FORMULA BAR ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.65rem 0.85rem',
          backgroundColor: '#fafafa',
          borderRadius: '8px',
          border: '1px solid #e4e4e7',
          fontSize: '0.75rem',
          color: '#52525b',
        }}
      >
        <HelpCircle size={15} color="#6366f1" style={{ flexShrink: 0 }} />
        <span>
          <strong style={{ color: '#09090b' }}>Cumulative Formula:</strong> Current Balance = Previous Balance + New Bill − Payment Received. Excess payment creates a <strong>Credit Balance</strong> that automatically applies to future bills.
        </span>
      </div>

      {/* ── LEDGER EXPAND / COLLAPSE BUTTON ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #f4f4f5',
          paddingTop: '0.85rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <button
          onClick={() => setShowLedger(!showLedger)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'none',
            border: 'none',
            color: '#09090b',
            fontSize: '0.775rem',
            fontWeight: 700,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <History size={15} color="#4f46e5" />
          <span>{showLedger ? 'Hide Cumulative Running Ledger' : 'View Cumulative Running Ledger'}</span>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: '999px',
              backgroundColor: '#f4f4f5',
              fontSize: '0.675rem',
              color: '#71717a',
              border: '1px solid #e4e4e7',
            }}
          >
            {wallet.ledger_entries?.length || 0} entries
          </span>
          {showLedger ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showLedger && wallet.ledger_entries && wallet.ledger_entries.length > 0 && (
          <button
            onClick={handleExportLedgerCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.65rem',
              borderRadius: '5px',
              border: '1px solid #d4d4d8',
              backgroundColor: '#ffffff',
              fontSize: '0.725rem',
              fontWeight: 600,
              color: '#09090b',
              cursor: 'pointer',
            }}
          >
            <FileSpreadsheet size={13} color="#059669" />
            <span>Export Ledger CSV</span>
          </button>
        )}
      </div>

      {/* ── EXPANDABLE RUNNING LEDGER TABLE ── */}
      {showLedger && (
        <div style={{ overflowX: 'auto', border: '1px solid #e4e4e7', borderRadius: '8px' }}>
          <table className="wf-table" style={{ width: '100%', margin: 0 }}>
            <thead>
              <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e4e4e7' }}>
                <th style={{ padding: '0.6rem 0.75rem', fontSize: '0.725rem', fontWeight: 700, color: '#71717a' }}>Date</th>
                <th style={{ padding: '0.6rem 0.75rem', fontSize: '0.725rem', fontWeight: 700, color: '#71717a' }}>Type</th>
                <th style={{ padding: '0.6rem 0.75rem', fontSize: '0.725rem', fontWeight: 700, color: '#71717a' }}>Reference</th>
                <th style={{ padding: '0.6rem 0.75rem', fontSize: '0.725rem', fontWeight: 700, color: '#71717a' }}>Description</th>
                <th style={{ padding: '0.6rem 0.75rem', fontSize: '0.725rem', fontWeight: 700, color: '#71717a', textAlign: 'right' }}>Billed (+)</th>
                <th style={{ padding: '0.6rem 0.75rem', fontSize: '0.725rem', fontWeight: 700, color: '#71717a', textAlign: 'right' }}>Paid (-)</th>
                <th style={{ padding: '0.6rem 0.75rem', fontSize: '0.725rem', fontWeight: 700, color: '#71717a', textAlign: 'right' }}>Running Balance</th>
                <th style={{ padding: '0.6rem 0.75rem', fontSize: '0.725rem', fontWeight: 700, color: '#71717a', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {wallet.ledger_entries && wallet.ledger_entries.length > 0 ? (
                wallet.ledger_entries.map((entry) => {
                  const entryIsDue = entry.balance_status === 'due';
                  const entryIsCredit = entry.balance_status === 'credit';
                  return (
                    <tr key={entry.id} style={{ borderBottom: '1px solid #f4f4f5' }}>
                      <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.775rem', color: '#52525b', whiteSpace: 'nowrap' }}>
                        {entry.date}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        {entry.type === 'bill' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.675rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#e0e7ff',
                              color: '#4338ca',
                              border: '1px solid #c7d2fe',
                            }}
                          >
                            <Receipt size={10} /> Bill
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.675rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #86efac',
                            }}
                          >
                            <Coins size={10} /> Payment
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace', fontSize: '0.775rem' }}>
                        {entry.type === 'bill' && onViewInvoice ? (
                          <button
                            onClick={() => onViewInvoice(entry.reference)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#4f46e5',
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              padding: 0,
                            }}
                          >
                            {entry.reference}
                          </button>
                        ) : (
                          <span style={{ fontWeight: 700, color: '#09090b' }}>{entry.reference}</span>
                        )}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.775rem', color: '#52525b', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.description}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.775rem', color: entry.amount_billed > 0 ? '#b91c1c' : '#71717a', fontWeight: entry.amount_billed > 0 ? 700 : 400 }}>
                        {entry.amount_billed > 0 ? `+${formatCurrency(entry.amount_billed)}` : '—'}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.775rem', color: entry.amount_paid > 0 ? '#15803d' : '#71717a', fontWeight: entry.amount_paid > 0 ? 700 : 400 }}>
                        {entry.amount_paid > 0 ? `-${formatCurrency(entry.amount_paid)}` : '—'}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.825rem', fontWeight: 800, color: entryIsDue ? '#b91c1c' : '#15803d' }}>
                        {formatCurrency(entry.running_balance)}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: entryIsDue ? '#fee2e2' : '#dcfce7',
                            color: entryIsDue ? '#dc2626' : '#15803d',
                            border: entryIsDue ? '1px solid #fca5a5' : '1px solid #86efac',
                          }}
                        >
                          {entry.balance_status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#71717a', fontSize: '0.8rem' }}>
                    No transactions recorded in this wallet yet. Generate a bill or record a payment to begin the running ledger.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
