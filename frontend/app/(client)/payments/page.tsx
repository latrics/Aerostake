'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import WireframeBox from '@/components/WireframeBox';
import { PageHeader } from '@/components/PageHeader';
import {
  CreditCard,
  Info,
  Download,
  ArrowUpRight,
  Loader2,
  Inbox,
  RotateCcw,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Folder,
  MapPin,
  Cpu,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  Receipt,
  Plus,
  FileText,
  Coins,
  Eye,
  Wallet,
  AlertCircle,
  Building,
  ChevronUp,
  ChevronDown,
  Upload,
  ShieldCheck,
  XCircle,
  X
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { isClientRole, isLatricsRole } from '@/lib/role';
import { projectApi } from '@/modules/projects/api';
import { paymentsApi } from '@/modules/payments/api';
import { PaymentRecord, Invoice, ClientWalletSummary } from '@/modules/payments/types';
import { Project } from '@/modules/projects/types';
import { ClientWalletCard } from '@/modules/payments/components/ClientWalletCard';
import { GenerateBillModal } from '@/modules/payments/components/GenerateBillModal';
import { SubmitPaymentProofModal } from '@/modules/payments/components/SubmitPaymentProofModal';
import { PaymentVerifyModal } from '@/modules/payments/components/PaymentVerifyModal';
import { DigitalInvoiceModal } from '@/modules/payments/components/DigitalInvoiceModal';
import { triggerWalletSync } from '@/modules/payments/hooks/useClientWalletSync';

export default function PaymentsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <Loader2 size={32} className="animate-spin" color="#09090b" />
        </div>
      }
    >
      <PaymentsContent />
    </Suspense>
  );
}

function PaymentsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(searchParams.get('projectId') || null);
  const [projectPaymentsMap, setProjectPaymentsMap] = useState<Record<string, PaymentRecord[]>>({});
  const [projectWalletsMap, setProjectWalletsMap] = useState<Record<string, ClientWalletSummary | null>>({});
  const [projectInvoicesMap, setProjectInvoicesMap] = useState<Record<string, Invoice[]>>({});
  const [collapsedCompanies, setCollapsedCompanies] = useState<Record<string, boolean>>({});

  // Selected project state
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [wallet, setWallet] = useState<ClientWalletSummary | null>(null);

  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Active tab inside selected project: 'invoices' | 'milestones'
  const [activeTab, setActiveTab] = useState<'invoices' | 'milestones'>('invoices');

  const { user } = useAuth();
  const isClient = isClientRole(user?.role);
  const isOpsOrAdmin = isLatricsRole(user?.role) || user?.role === 'admin' || user?.role === 'operations';

  // Modals state
  const [isGenerateBillOpen, setIsGenerateBillOpen] = useState(false);
  const [isSubmitProofOpen, setIsSubmitProofOpen] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState<PaymentRecord | null>(null);
  const [activeSlipZoomUrl, setActiveSlipZoomUrl] = useState<string | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  // 1. Fetch initial projects and financial summaries
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const projList = await projectApi.listProjects();
      const validProjects = projList || [];
      setProjects(validProjects);

      // Fetch payment ledger, wallets, and invoices for all projects in parallel
      const payMap: Record<string, PaymentRecord[]> = {};
      const wallMap: Record<string, ClientWalletSummary | null> = {};
      const invMap: Record<string, Invoice[]> = {};

      await Promise.all(
        validProjects.map(async (p) => {
          try {
            const [payRecords, pWallet, pInvoices] = await Promise.all([
              paymentsApi.listProjectPayments(p.id).catch(() => []),
              paymentsApi.getProjectWallet(p.id).catch(() => null),
              paymentsApi.listProjectInvoices(p.id).catch(() => [])
            ]);
            payMap[p.id] = payRecords || [];
            wallMap[p.id] = pWallet || null;
            invMap[p.id] = pInvoices || [];
          } catch {
            payMap[p.id] = [];
            wallMap[p.id] = null;
            invMap[p.id] = [];
          }
        })
      );
      setProjectPaymentsMap(payMap);
      setProjectWalletsMap(wallMap);
      setProjectInvoicesMap(invMap);

      const paramProj = searchParams.get('projectId');
      if (paramProj && validProjects.some((p) => p.id === paramProj)) {
        setSelectedProjectId(paramProj);
      }
    } catch (err) {
      console.error('Error fetching projects for payments:', err);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // 2. Fetch financial details for selected project
  useEffect(() => {
    if (selectedProjectId) {
      fetchSelectedProjectFinancials(selectedProjectId);
    } else {
      setPayments([]);
      setInvoices([]);
      setWallet(null);
    }
  }, [selectedProjectId]);

  const fetchSelectedProjectFinancials = async (projectId: string) => {
    setIsLoadingPayments(true);
    setIsLoadingWallet(true);
    setIsLoadingInvoices(true);

    try {
      const [payRecords, walletSummary, invList] = await Promise.all([
        paymentsApi.listProjectPayments(projectId).catch(() => []),
        paymentsApi.getProjectWallet(projectId).catch(() => null),
        paymentsApi.listProjectInvoices(projectId).catch(() => [])
      ]);

      setPayments(payRecords || []);
      setWallet(walletSummary);
      setInvoices(invList || []);

      setProjectPaymentsMap((prev) => ({ ...prev, [projectId]: payRecords || [] }));
      setProjectWalletsMap((prev) => ({ ...prev, [projectId]: walletSummary }));
    } catch (err) {
      console.error('Error fetching project financials:', err);
    } finally {
      setIsLoadingPayments(false);
      setIsLoadingWallet(false);
      setIsLoadingInvoices(false);
    }
  };

  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const handleSelectProject = (projId: string | null) => {
    setSelectedProjectId(projId);
    setSearchQuery('');
    if (projId) {
      router.push(`/payments?projectId=${projId}`);
    } else {
      router.push('/payments');
    }
  };

  // Find invoice by number to view
  const handleViewInvoiceByNumber = (invoiceNumber: string) => {
    const inv = invoices.find(
      (i) => i.invoice_number.toLowerCase() === invoiceNumber.toLowerCase()
    );
    if (inv) {
      setViewingInvoice(inv);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${Math.abs(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getCity = (p: Project) => p.city || (p.requirements_payload as any)?.city || '';
  const getState = (p: Project) => p.state || (p.requirements_payload as any)?.state || '';
  const getPayload = (p: Project) => p.payload || (p.requirements_payload as any)?.payload || '';

  const formatLocation = (p: Project) => {
    const parts: string[] = [];
    if (p.survey_location) parts.push(p.survey_location);
    const c = getCity(p);
    const s = getState(p);
    if (c) parts.push(c);
    if (s) parts.push(s);
    return parts.length > 0 ? parts.join(', ') : 'Location not specified';
  };

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.survey_location && p.survey_location.toLowerCase().includes(q)) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.state && p.state.toLowerCase().includes(q))
    );
  }, [projects, searchQuery]);

  const getStatusBadge = (status: string) => {
    return (
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
  };

  // ── 4 Top-level KPIs across all projects ──
  const { totalPending, totalProjected, totalCollected, overdueProjectsCount } = useMemo(() => {
    let pending = 0;
    let projected = 0;
    let collected = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const overdueSet = new Set<string>();

    for (const p of projects) {
      const w = projectWalletsMap[p.id];
      if (w) {
        if (w.current_balance > 0) {
          pending += w.current_balance;
        }
        projected += w.total_billed;
        collected += w.total_paid;
      }

      // Check if project missed deadline: current_balance > 0 and has unpaid invoice past due date
      const pInvs = projectInvoicesMap[p.id] || [];
      const hasUnpaidPastDue = pInvs.some((inv) => {
        return Boolean(inv.due_date && inv.due_date < todayStr && inv.status !== 'paid');
      });
      if (w && w.current_balance > 0 && hasUnpaidPastDue) {
        overdueSet.add(p.id);
      }
    }

    return {
      totalPending: pending,
      totalProjected: projected,
      totalCollected: collected,
      overdueProjectsCount: overdueSet.size,
    };
  }, [projects, projectWalletsMap, projectInvoicesMap]);

  // ── Company-wise grouping ──
  const getProjectCompany = (p: Project): string => {
    if (p.client_company && p.client_company.trim()) return p.client_company.trim();
    const w = projectWalletsMap[p.id];
    if (w?.company_name && w.company_name.trim()) return w.company_name.trim();
    const req = p.requirements_payload as any;
    if (req?.company_name && typeof req.company_name === 'string' && req.company_name.trim()) {
      return req.company_name.trim();
    }
    if (p.client_name && p.client_name.trim()) return p.client_name.trim();
    return 'Direct / Enterprise Clients';
  };

  const toggleCompanyCollapse = (compName: string) => {
    setCollapsedCompanies((prev) => ({
      ...prev,
      [compName]: !prev[compName],
    }));
  };

  const companyGroups = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const map: Record<string, Project[]> = {};

    for (const p of filteredProjects) {
      const c = getProjectCompany(p);
      if (!map[c]) map[c] = [];
      map[c].push(p);
    }

    return Object.entries(map).map(([companyName, projs]) => {
      let billed = 0;
      let paid = 0;
      let overdueCount = 0;

      for (const p of projs) {
        const w = projectWalletsMap[p.id];
        if (w) {
          billed += w.total_billed;
          paid += w.total_paid;
          const pInvs = projectInvoicesMap[p.id] || [];
          if (w.current_balance > 0 && pInvs.some((inv) => inv.due_date && inv.due_date < todayStr && inv.status !== 'paid')) {
            overdueCount++;
          }
        }
      }

      const balance = billed - paid;

      return {
        companyName,
        projects: projs,
        totalBilled: billed,
        totalPaid: paid,
        companyBalance: balance,
        overdueCount,
      };
    });
  }, [filteredProjects, projectWalletsMap, projectInvoicesMap]);


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── 1. Page Header & Navigation Bar ── */}
      <PageHeader
        title={selectedProject ? `${selectedProject.title} — Billing & Cumulative Wallet` : 'Billing, Invoices & Cumulative Wallet'}
        subtitle={
          selectedProject
            ? `Cumulative running balance, digital billing tool, and date-wise ledger for ${selectedProject.title}.`
            : 'Project-wise financial overview, digital bill generation, running client balances, and payment records.'
        }
        breadcrumbs={
          selectedProject ? (
            <button
              onClick={() => handleSelectProject(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#71717a',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <ArrowLeft size={15} /> Back to All Projects
            </button>
          ) : undefined
        }
      >
        {projects.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.775rem', color: '#71717a', fontWeight: 600 }}>Project:</span>
            <select
              value={selectedProjectId || ''}
              onChange={(e) => handleSelectProject(e.target.value || null)}
              className="form-input"
              style={{ fontSize: '0.8rem', height: '34px', minWidth: '180px', padding: '0 0.5rem', borderRadius: '6px', border: '1px solid #e4e4e7' }}
            >
              <option value="">— All Projects Financials —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={() => {
            if (selectedProjectId) fetchSelectedProjectFinancials(selectedProjectId);
            else fetchProjects();
          }}
          title="Refresh financials"
          style={{
            width: '34px',
            height: '34px',
            border: '1px solid #e4e4e7',
            borderRadius: '6px',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={15} color="#09090b" className={isLoadingProjects || isLoadingPayments || isLoadingWallet ? 'animate-spin' : ''} />
        </button>
      </PageHeader>

      {/* ── 2. VIEW MODE A: SPECIFIC PROJECT SELECTED ── */}
      {selectedProject ? (
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
                    {getStatusBadge(selectedProject.status)}
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
            onGenerateBill={!isClient ? () => setIsGenerateBillOpen(true) : undefined}
            onSubmitPaymentProof={isClient ? () => setIsSubmitProofOpen(true) : undefined}
            onRefresh={() => fetchSelectedProjectFinancials(selectedProject.id)}
            onViewInvoice={handleViewInvoiceByNumber}
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
                transition: 'all 0.15s ease'
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
                transition: 'all 0.15s ease'
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
                    onClick={() => setIsGenerateBillOpen(true)}
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
                      onClick={() => setIsGenerateBillOpen(true)}
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
                        cursor: 'pointer'
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
                                border: inv.status === 'paid' ? '1px solid #a7f3d0' : '1px solid #fecdd3'
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
                              onClick={() => setViewingInvoice(inv)}
                              className="wf-btn wf-btn-outline"
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.3rem 0.65rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                cursor: 'pointer'
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
                    onClick={() => setIsSubmitProofOpen(true)}
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
                      onClick={() => setIsSubmitProofOpen(true)}
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
                                  onClick={() => setActiveSlipZoomUrl(pay.slip_url || null)}
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
                                >
                                  <Eye size={12} />
                                  <span>View Slip</span>
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>—</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {/* Ops/Admin verification action: ONLY visible to Ops/Admin, NEVER Client */}
                              {!isClient && isPending ? (
                                <button
                                  type="button"
                                  onClick={() => setVerifyingPayment(pay)}
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
      ) : (
        /* ── 3. VIEW MODE B: ALL PROJECTS FINANCIAL DIRECTORY ── */
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
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0 }}>
              Company-wise and project-wise financial overview. Click any project to open its running wallet ledger.
            </p>
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={14} color="#71717a" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search projects or companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2rem', fontSize: '0.8rem', height: '34px' }}
              />
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

                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '4px',
                            border: '1px solid #e4e4e7',
                            backgroundColor: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#71717a',
                          }}
                        >
                          {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                        </div>
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
                                  onClick={() => handleSelectProject(p.id)}
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
                                    {/* Requirement 2: Simple colored text only! Red for due, Green for surplus/settled. No box representation, no Due/Surplus label. */}
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
                                        handleSelectProject(p.id);
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
      )}

      {/* ── MODALS ── */}
      {selectedProject && (
        <>
          {/* 1. Generate Digital Bill Modal - Ops/Admin only */}
          {!isClient && (
            <GenerateBillModal
              isOpen={isGenerateBillOpen}
              onClose={() => setIsGenerateBillOpen(false)}
              projectId={selectedProject.id}
              projectName={selectedProject.title}
              clientCompanyName={wallet?.company_name || selectedProject.client_company}
              previousBalance={wallet?.current_balance || 0}
              onSubmit={async (projId, payload) => {
                const newInv = await paymentsApi.createDigitalInvoice(projId, payload);
                await fetchSelectedProjectFinancials(projId);
                setViewingInvoice(newInv);
                triggerWalletSync();
              }}
            />
          )}

          {/* 2. Client Payment Slip Upload Modal - Available for clients only */}
          {isClient && (
            <SubmitPaymentProofModal
              isOpen={isSubmitProofOpen}
              onClose={() => setIsSubmitProofOpen(false)}
              projectId={selectedProject.id}
              projectName={selectedProject.title}
              clientCompanyName={wallet?.company_name || selectedProject.client_company}
              currentDueBalance={wallet?.current_balance || 0}
              onSubmit={async (projId, payload) => {
                await paymentsApi.submitPaymentProof(projId, payload);
                await fetchSelectedProjectFinancials(projId);
                triggerWalletSync();
              }}
            />
          )}

          {/* 3. Payment Verification Audit Modal - Ops/Admin only */}
          {!isClient && (
            <PaymentVerifyModal
              isOpen={!!verifyingPayment}
              payment={verifyingPayment}
              onClose={() => setVerifyingPayment(null)}
              onVerify={async (paymentId, payload) => {
                await paymentsApi.verifyPayment(paymentId, payload);
                if (selectedProject) {
                  await fetchSelectedProjectFinancials(selectedProject.id);
                }
                triggerWalletSync();
              }}
              onReject={async (paymentId, notes) => {
                await paymentsApi.rejectPayment(paymentId, notes);
                if (selectedProject) {
                  await fetchSelectedProjectFinancials(selectedProject.id);
                }
                triggerWalletSync();
              }}
            />
          )}

          {/* 4. Digital Invoice View / Download Modal */}
          <DigitalInvoiceModal
            isOpen={!!viewingInvoice}
            onClose={() => setViewingInvoice(null)}
            invoice={viewingInvoice}
            projectName={selectedProject.title}
            clientCompanyName={wallet?.company_name || selectedProject.client_company}
            surveyLocation={selectedProject.survey_location}
          />

          {/* 5. Active Slip Zoom Modal */}
          {activeSlipZoomUrl && (
            <div
              onClick={() => setActiveSlipZoomUrl(null)}
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
                  src={activeSlipZoomUrl}
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
                  onClick={() => setActiveSlipZoomUrl(null)}
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
        </>
      )}
    </div>
  );
}
