'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { isClientRole, isLatricsRole } from '@/lib/role';
import { projectApi } from '@/modules/projects/api';
import { paymentsApi } from '@/modules/payments/api';
import { PaymentRecord, Invoice, ClientWalletSummary } from '@/modules/payments/types';
import { Project } from '@/modules/projects/types';
import { GenerateBillModal } from '@/modules/payments/components/GenerateBillModal';
import { SubmitPaymentProofModal } from '@/modules/payments/components/SubmitPaymentProofModal';
import { PaymentVerifyModal } from '@/modules/payments/components/PaymentVerifyModal';
import { DigitalInvoiceModal } from '@/modules/payments/components/DigitalInvoiceModal';
import { triggerWalletSync } from '@/modules/payments/hooks/useClientWalletSync';
import { ProjectFinancialDetailsView } from '@/modules/payments/components/ProjectFinancialDetailsView';
import { AllProjectsFinancialDirectory, CompanyGroup } from '@/modules/payments/components/AllProjectsFinancialDirectory';
import { SlipZoomModal } from '@/modules/payments/components/SlipZoomModal';

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

  const fetchProjects = useCallback(async () => {
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
              paymentsApi.listProjectInvoices(p.id).catch(() => []),
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
  }, [searchParams]);

  // 1. Fetch initial projects and financial summaries
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

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
        paymentsApi.listProjectInvoices(projectId).catch(() => []),
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
  const getProjectCompany = useCallback(
    (p: Project): string => {
      if (p.client_company && p.client_company.trim()) return p.client_company.trim();
      const w = projectWalletsMap[p.id];
      if (w?.company_name && w.company_name.trim()) return w.company_name.trim();
      const req = p.requirements_payload as any;
      if (req?.company_name && typeof req.company_name === 'string' && req.company_name.trim()) {
        return req.company_name.trim();
      }
      if (p.client_name && p.client_name.trim()) return p.client_name.trim();
      return 'Direct / Enterprise Clients';
    },
    [projectWalletsMap]
  );

  const toggleCompanyCollapse = (compName: string) => {
    setCollapsedCompanies((prev) => ({
      ...prev,
      [compName]: !prev[compName],
    }));
  };

  const toggleAllCompanies = () => {
    const areAllCollapsed =
      companyGroups.length > 0 && companyGroups.every((g) => Boolean(collapsedCompanies[g.companyName]));
    if (areAllCollapsed) {
      setCollapsedCompanies({});
    } else {
      const all: Record<string, boolean> = {};
      companyGroups.forEach((g) => {
        all[g.companyName] = true;
      });
      setCollapsedCompanies(all);
    }
  };

  const companyGroups: CompanyGroup[] = useMemo(() => {
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
  }, [filteredProjects, projectWalletsMap, projectInvoicesMap, getProjectCompany]);

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
        breadcrumb={
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
        onRefresh={() => {
          if (selectedProjectId) fetchSelectedProjectFinancials(selectedProjectId);
          else fetchProjects();
        }}
        isRefreshing={isLoadingProjects || isLoadingPayments || isLoadingWallet}
        refreshTooltip="Refresh financials"
      >
        {projects.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.775rem', color: '#71717a', fontWeight: 600 }}>Project:</span>
            <select
              value={selectedProjectId || ''}
              onChange={(e) => handleSelectProject(e.target.value || null)}
              className="form-input"
              style={{ fontSize: '0.8rem', height: '36px', minWidth: '190px', padding: '0 0.5rem', borderRadius: '6px', border: '1px solid #e4e4e7' }}
            >
              <option value="">— All Projects Financials —</option>
              {companyGroups.length > 1
                ? companyGroups.map((group) => (
                    <optgroup key={group.companyName} label={`${group.companyName} (${group.projects.length})`}>
                      {group.projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </optgroup>
                  ))
                : projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
            </select>
          </div>
        )}
      </PageHeader>

      {/* ── 2. VIEW MODE A: SPECIFIC PROJECT SELECTED vs VIEW MODE B: ALL PROJECTS ── */}
      {selectedProject ? (
        <ProjectFinancialDetailsView
          selectedProject={selectedProject}
          wallet={wallet}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          invoices={invoices}
          payments={payments}
          isLoadingInvoices={isLoadingInvoices}
          isLoadingPayments={isLoadingPayments}
          isLoadingWallet={isLoadingWallet}
          isClient={isClient}
          onRefresh={() => fetchSelectedProjectFinancials(selectedProject.id)}
          onOpenGenerateBill={() => setIsGenerateBillOpen(true)}
          onOpenSubmitProof={() => setIsSubmitProofOpen(true)}
          onViewInvoice={(inv) => setViewingInvoice(inv)}
          onViewInvoiceByNumber={handleViewInvoiceByNumber}
          onVerifyPayment={(pay) => setVerifyingPayment(pay)}
        />
      ) : (
        <AllProjectsFinancialDirectory
          totalPending={totalPending}
          totalProjected={totalProjected}
          totalCollected={totalCollected}
          overdueProjectsCount={overdueProjectsCount}
          companyGroups={companyGroups}
          filteredProjects={filteredProjects}
          collapsedCompanies={collapsedCompanies}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isLoadingProjects={isLoadingProjects}
          toggleCompanyCollapse={toggleCompanyCollapse}
          toggleAllCompanies={toggleAllCompanies}
          projectWalletsMap={projectWalletsMap}
          onSelectProject={(projId) => handleSelectProject(projId)}
        />
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
                await paymentsApi.createDigitalInvoice(projId, payload);
                await fetchSelectedProjectFinancials(projId);
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
        </>
      )}

      {/* 5. Active Slip Zoom Modal */}
      <SlipZoomModal
        imageUrl={activeSlipZoomUrl}
        onClose={() => setActiveSlipZoomUrl(null)}
      />
    </div>
  );
}
