'use client';

import React from 'react';
import WireframeBox from '@/components/WireframeBox';
import { CreditCard, Info, Download, ArrowUpRight } from 'lucide-react';

export default function PaymentsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Payments & Milestone Ledger</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Track approved quotations, milestone disbursement invoices, and bank transfer receipts.
        </p>
      </div>

      {/* 4 Financial KPI Summary Cards */}
      <div className="grid-4">
        <div className="wf-card">
          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>Approved Total Estimate</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.25rem 0' }}>₹12.40L</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Across 3 project milestones</div>
        </div>

        <div className="wf-card">
          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Paid & Verified</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.25rem 0' }}>₹7.60L</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Milestones 01 & 02 cleared</div>
        </div>

        <div className="wf-card">
          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>Outstanding Balance</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.25rem 0' }}>-₹4.80L</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Milestone 03 due on completion</div>
        </div>

        <div className="wf-card">
          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>Payment Status</div>
          <div style={{ marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.25rem 0.65rem', backgroundColor: '#f4f4f5', borderRadius: '4px', border: '1px solid #d4d4d8' }}>
              Partially Paid
            </span>
          </div>
        </div>
      </div>

      {/* Milestone Schedule & Invoices Table */}
      <div className="wf-card">
        <div className="wf-card-header">
          <h3 className="wf-title">Milestone Invoices & Verification Records</h3>
          <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'flex', gap: '0.3rem' }}>
            <Download size={14} /> Export Statement (PDF)
          </button>
        </div>

        <table className="wf-table">
          <thead>
            <tr>
              <th>Milestone Ref</th>
              <th>Project Target</th>
              <th>Amount (INR)</th>
              <th>Payment Status</th>
              <th>Verified Date</th>
              <th>Bank Ref</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 700 }}>MS-01 (Mobilization)</td>
              <td>Project Alpha (50MW Solar)</td>
              <td style={{ fontWeight: 700 }}>₹4,00,000</td>
              <td>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.45rem', backgroundColor: '#09090b', color: '#ffffff', borderRadius: '3px' }}>
                  Verified
                </span>
              </td>
              <td>12 Aug 2024</td>
              <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>NEFT-HDFC-992104</td>
              <td>
                <button style={{ background: 'none', border: 'none', fontSize: '0.75rem', fontWeight: 600, color: '#09090b', cursor: 'pointer', textDecoration: 'underline' }}>
                  Receipt ↗
                </button>
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700 }}>MS-02 (50% Sectors Flown)</td>
              <td>Project Alpha (50MW Solar)</td>
              <td style={{ fontWeight: 700 }}>₹3,60,000</td>
              <td>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.45rem', backgroundColor: '#09090b', color: '#ffffff', borderRadius: '3px' }}>
                  Verified
                </span>
              </td>
              <td>20 Aug 2024</td>
              <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>RTGS-ICICI-481903</td>
              <td>
                <button style={{ background: 'none', border: 'none', fontSize: '0.75rem', fontWeight: 600, color: '#09090b', cursor: 'pointer', textDecoration: 'underline' }}>
                  Receipt ↗
                </button>
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700 }}>MS-03 (Deliverables & Final)</td>
              <td>Project Alpha (50MW Solar)</td>
              <td style={{ fontWeight: 700 }}>₹4,80,000</td>
              <td>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.45rem', backgroundColor: '#f4f4f5', border: '1px solid #d4d4d8', borderRadius: '3px' }}>
                  Pending
                </span>
              </td>
              <td>—</td>
              <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Awaiting Transfer</td>
              <td>
                <button style={{ background: 'none', border: 'none', fontSize: '0.75rem', fontWeight: 600, color: '#09090b', cursor: 'pointer', textDecoration: 'underline' }}>
                  Pay Invoice →
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Disclaimer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
          <Info size={14} style={{ flexShrink: 0 }} />
          <span>
            Payments are recorded and verified by LATRICS billing team. All transactions occur via direct RTGS/NEFT to designated bank accounts.
          </span>
        </div>
      </div>
    </div>
  );
}
