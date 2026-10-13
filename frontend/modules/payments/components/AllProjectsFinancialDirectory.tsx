'use client';

import React from 'react';
import WireframeBox from '@/components/WireframeBox';
import {
  AlertCircle,
  Coins,
  CheckCircle2,
  Clock,
  Search,
  Loader2,
  Inbox,
  Building,
  ChevronDown,
  ChevronUp,
  Folder,
  ChevronRight,
} from 'lucide-react';
import { Project } from '@/modules/projects/types';
import { ClientWalletSummary } from '@/modules/payments/types';
import { formatCurrency, formatLocation } from '../utils/formatters';

export interface CompanyGroup {
  companyName: string;
  projects: Project[];
  totalBilled: number;
  totalPaid: number;
  companyBalance: number;
  overdueCount: number;
}

interface AllProjectsFinancialDirectoryProps {
  totalPending: number;
  totalProjected: number;
  totalCollected: number;
  overdueProjectsCount: number;
  companyGroups: CompanyGroup[];
  filteredProjects: Project[];
  collapsedCompanies: Record<string, boolean>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isLoadingProjects: boolean;
  toggleCompanyCollapse: (companyName: string) => void;
  toggleAllCompanies: () => void;
  projectWalletsMap: Record<string, ClientWalletSummary | null>;
  onSelectProject: (projectId: string) => void;
}

const getStatusBadge = (status: string) => (
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
    {status}
  </span>
);

export const AllProjectsFinancialDirectory: React.FC<AllProjectsFinancialDirectoryProps> = ({
  totalPending,
  totalProjected,
  totalCollected,
  overdueProjectsCount,
  companyGroups,
  filteredProjects,
  collapsedCompanies,
  searchQuery,
  setSearchQuery,
  isLoadingProjects,
  toggleCompanyCollapse,
  toggleAllCompanies,
  projectWalletsMap,
  onSelectProject,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── 4 KEY PERFORMANCE INDICATORS (KPIs) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* KPI 1: Total Pending Amount */}
        <div
          style={{
            padding: '1.25rem',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e4e4e7',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Pending Amount
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dc2626',
              }}
            >
              <AlertCircle size={17} />
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                fontFamily: 'monospace',
                letterSpacing: '-0.5px',
                color: totalPending > 0 ? '#dc2626' : '#16a34a',
              }}
            >
              {formatCurrency(totalPending)}
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#71717a' }}>
              Outstanding balances across all projects
            </p>
          </div>
        </div>

        {/* KPI 2: Total Projected Amount */}
        <div
          style={{
            padding: '1.25rem',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e4e4e7',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Projected Amount
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: '#f4f4f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#09090b',
              }}
            >
              <Coins size={17} />
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                fontFamily: 'monospace',
                letterSpacing: '-0.5px',
                color: '#09090b',
              }}
            >
              {formatCurrency(totalProjected)}
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#71717a' }}>
              Total billed and projected invoices
            </p>
          </div>
        </div>

        {/* KPI 3: Total Collection */}
        <div
          style={{
            padding: '1.25rem',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e4e4e7',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Collection
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a',
              }}
            >
              <CheckCircle2 size={17} />
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                fontFamily: 'monospace',
                letterSpacing: '-0.5px',
                color: '#16a34a',
              }}
            >
              {formatCurrency(totalCollected)}
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#71717a' }}>
              Verified payments received so far
            </p>
          </div>
        </div>

        {/* KPI 4: Dues Missed Deadlines */}
        <div
          style={{
            padding: '1.25rem',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e4e4e7',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Dues Missed Deadlines
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: overdueProjectsCount > 0 ? '#fef2f2' : '#f4f4f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: overdueProjectsCount > 0 ? '#dc2626' : '#71717a',
              }}
            >
              <Clock size={17} />
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                letterSpacing: '-0.5px',
                color: overdueProjectsCount > 0 ? '#dc2626' : '#09090b',
              }}
            >
              {overdueProjectsCount} {overdueProjectsCount === 1 ? 'Project' : 'Projects'}
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: overdueProjectsCount > 0 ? '#dc2626' : '#71717a' }}>
              {overdueProjectsCount > 0 ? 'Projects with overdue payment deadlines' : 'All project dues within deadline'}
            </p>
          </div>
        </div>
      </div>

      {/* Directory Search & Filter Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#09090b', margin: 0 }}>
            Company-Wise Project Portfolios ({companyGroups.length} {companyGroups.length === 1 ? 'Company' : 'Companies'}, {filteredProjects.length} Projects)
          </p>
          <p style={{ fontSize: '0.775rem', color: '#71717a', margin: '0.15rem 0 0 0' }}>
            Financial ledgers and wallet balances grouped by client organization. Click any project to open its ledger.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {companyGroups.length > 0 && (
            <button
              type="button"
              onClick={toggleAllCompanies}
              style={{
                fontSize: '0.775rem',
                fontWeight: 600,
                height: '36px',
                padding: '0 0.85rem',
                borderRadius: '6px',
                border: '1px solid #d4d4d8',
                backgroundColor: '#ffffff',
                color: '#09090b',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span>
                {companyGroups.every((g) => Boolean(collapsedCompanies[g.companyName]))
                  ? 'Expand All Projects'
                  : 'Collapse All Projects'}
              </span>
            </button>
          )}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={14} color="#71717a" style={{ position: 'absolute', left: '10px', top: '11px' }} />
            <input
              type="text"
              placeholder="Search projects or companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2rem', fontSize: '0.8rem', height: '36px', borderRadius: '6px', border: '1px solid #e4e4e7' }}
            />
          </div>
        </div>
      </div>

      {isLoadingProjects ? (
        <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
          <p style={{ fontSize: '0.85rem' }}>Loading project financial ledgers...</p>
        </div>
      ) : companyGroups.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            textAlign: 'center',
            backgroundColor: '#fafafa',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            gap: '0.5rem',
          }}
        >
          <Inbox size={28} color="#71717a" />
          <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>No Projects Found</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '380px' }}>
            {searchQuery ? 'No companies or projects match your search.' : 'No survey projects found in your workspace.'}
          </p>
        </div>
      ) : (
        /* ── COMPANY-WISE UNDER THAT PROJECT-WISE DIRECTORY ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {companyGroups.map((group) => {
            const isCollapsed = Boolean(collapsedCompanies[group.companyName]);
            const isGroupDue = group.companyBalance > 0;

            return (
              <div
                key={group.companyName}
                className="wf-card"
                style={{ padding: 0, overflow: 'hidden', border: '1px solid #e4e4e7', borderRadius: '10px' }}
              >
                {/* ── COMPANY HEADER ── */}
                <div
                  onClick={() => toggleCompanyCollapse(group.companyName)}
                  style={{
                    padding: '0.85rem 1.25rem',
                    backgroundColor: '#fbfbfb',
                    borderBottom: isCollapsed ? 'none' : '1px solid #e4e4e7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                  className="hover:bg-zinc-50 transition"
                >
                  {/* Left: Company Identity */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '6px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e4e4e7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Building size={16} color="#09090b" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b' }}>
                          {group.companyName}
                        </span>
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
                          {group.projects.length} {group.projects.length === 1 ? 'Project' : 'Projects'}
                        </span>
                        {group.overdueCount > 0 && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                            }}
                          >
                            {group.overdueCount} Missed Deadline
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Company Financial Summary & Collapse Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem' }}>
                      <div>
                        <span style={{ color: '#71717a', fontSize: '0.725rem' }}>Invoiced: </span>
                        <span style={{ fontWeight: 700, color: '#09090b' }}>
                          {formatCurrency(group.totalBilled)}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#71717a', fontSize: '0.725rem' }}>Received: </span>
                        <span style={{ fontWeight: 700, color: '#16a34a' }}>
                          {formatCurrency(group.totalPaid)}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#71717a', fontSize: '0.725rem' }}>Balance: </span>
                        <span
                          style={{
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            color: isGroupDue ? '#dc2626' : '#16a34a',
                          }}
                        >
                          {formatCurrency(group.companyBalance)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCompanyCollapse(group.companyName);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        height: '32px',
                        padding: '0 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid #d4d4d8',
                        backgroundColor: '#ffffff',
                        color: '#09090b',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      className="hover:border-zinc-950"
                    >
                      <span>{isCollapsed ? `Show Projects (${group.projects.length})` : `Hide Projects (${group.projects.length})`}</span>
                      {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                  </div>
                </div>

                {/* ── PROJECT-WISE NESTED TABLE UNDER COMPANY ── */}
                {!isCollapsed && (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="wf-table">
                      <thead>
                        <tr>
                          <th>Project Name</th>
                          <th>Site Location</th>
                          <th>Status</th>
                          <th>Total Invoiced</th>
                          <th>Payments Received</th>
                          <th>Cumulative Wallet Balance</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.projects.map((p) => {
                          const pWallet = projectWalletsMap[p.id];
                          const isDue = pWallet ? pWallet.current_balance > 0 : false;

                          return (
                            <tr
                              key={p.id}
                              onClick={() => onSelectProject(p.id)}
                              style={{ cursor: 'pointer' }}
                              className="hover:bg-slate-50 transition"
                            >
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                  <WireframeBox width={30} height={30} style={{ borderRadius: '4px', flexShrink: 0 }}>
                                    <Folder size={14} color="#09090b" />
                                  </WireframeBox>
                                  <div>
                                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#09090b' }}>
                                      {p.title}
                                    </div>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                      ID: {p.id.slice(0, 8)}...
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '200px' }}>
                                <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', display: 'block' }}>
                                  {formatLocation(p)}
                                </span>
                              </td>
                              <td>{getStatusBadge(p.status)}</td>
                              <td style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                                {pWallet ? formatCurrency(pWallet.total_billed) : '₹0.00'}
                              </td>
                              <td style={{ fontWeight: 700, fontSize: '0.85rem', color: '#16a34a' }}>
                                {pWallet ? formatCurrency(pWallet.total_paid) : '₹0.00'}
                              </td>
                              <td>
                                {pWallet ? (
                                  <span
                                    style={{
                                      fontWeight: 800,
                                      fontSize: '0.875rem',
                                      fontFamily: 'monospace',
                                      color: isDue ? '#dc2626' : '#16a34a',
                                    }}
                                  >
                                    {formatCurrency(pWallet.current_balance)}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 800, fontFamily: 'monospace' }}>
                                    ₹0.00
                                  </span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectProject(p.id);
                                  }}
                                  className="wf-btn wf-btn-outline"
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '0.3rem 0.65rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                  }}
                                >
                                  <span>Open Wallet</span>
                                  <ChevronRight size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
