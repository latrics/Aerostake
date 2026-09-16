'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import WireframeBox from '@/components/WireframeBox';
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
} from 'lucide-react';
import { projectApi } from '@/modules/projects/api';
import { paymentsApi } from '@/modules/payments/api';
import { PaymentRecord } from '@/modules/payments/types';
import { Project } from '@/modules/projects/types';

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
  
  // Selected project state
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch initial projects and their payment records
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const projList = await projectApi.listProjects();
      const validProjects = projList || [];
      setProjects(validProjects);

      // Fetch payment ledger for all projects in parallel
      const payMap: Record<string, PaymentRecord[]> = {};
      await Promise.all(
        validProjects.map(async (p) => {
          try {
            const payRecords = await paymentsApi.listProjectPayments(p.id);
            payMap[p.id] = payRecords || [];
          } catch {
            payMap[p.id] = [];
          }
        })
      );
      setProjectPaymentsMap(payMap);

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

  // 2. Fetch or load payments for selected project
  useEffect(() => {
    if (selectedProjectId) {
      fetchSelectedProjectPayments(selectedProjectId);
    } else {
      setPayments([]);
    }
  }, [selectedProjectId]);

  const fetchSelectedProjectPayments = async (projectId: string) => {
    setIsLoadingPayments(true);
    try {
      const payRecords = await paymentsApi.listProjectPayments(projectId);
      setPayments(payRecords || []);
      setProjectPaymentsMap((prev) => ({ ...prev, [projectId]: payRecords || [] }));
    } catch (err) {
      console.error('Error fetching project payments:', err);
      setPayments([]);
    } finally {
      setIsLoadingPayments(false);
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

  // KPI Calculations for selected project
  const approvedTotal = useMemo(() => {
    return payments.reduce((acc, p) => acc + (p.amount_usd ?? p.amount_inr ?? 0), 0);
  }, [payments]);

  const paidVerifiedTotal = useMemo(() => {
    return payments
      .filter((p) => p.status === 'verified')
      .reduce((acc, p) => acc + (p.amount_usd ?? p.amount_inr ?? 0), 0);
  }, [payments]);

  const outstandingTotal = approvedTotal - paidVerifiedTotal;

  const formatCurrency = (amount: number) => {
    return '$' + amount.toLocaleString();
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
    const s = (status || '').toLowerCase();
    let bg = '#f4f4f5';
    let text = '#18181b';
    let border = '#d4d4d8';

    if (s === 'active' || s === 'approved') {
      bg = '#f0fdf4';
      text = '#15803d';
      border = '#bbf7d0';
    } else if (s === 'submitted') {
      bg = '#eff6ff';
      text = '#1d4ed8';
      border = '#bfdbfe';
    } else if (s === 'completed') {
      bg = '#09090b';
      text = '#ffffff';
      border = '#09090b';
    }

    return (
      <span
        style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          padding: '0.15rem 0.5rem',
          borderRadius: '4px',
          backgroundColor: bg,
          color: text,
          border: `1px solid ${border}`,
          textTransform: 'capitalize',
        }}
      >
        {status}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── 1. Page Header & Navigation Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            {selectedProject ? (
              <button
                onClick={() => handleSelectProject(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <ArrowLeft size={15} /> All Projects
              </button>
            ) : null}
            {selectedProject && <span style={{ color: 'var(--text-muted)' }}>/</span>}
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
              {selectedProject ? `${selectedProject.title} — Payments & Ledger` : 'Payments & Milestone Ledger'}
            </h2>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
            {selectedProject
              ? `Track approved quotations, milestone disbursement invoices, and bank transfer receipts for ${selectedProject.title}.`
              : 'Project-wise financial overview, milestone charges, and verified disbursement records.'}
          </p>
        </div>

        {/* Project Selector & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {projects.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Project:</span>
              <select
                value={selectedProjectId || ''}
                onChange={(e) => handleSelectProject(e.target.value || null)}
                className="form-input"
                style={{ fontSize: '0.8rem', height: '34px', minWidth: '180px', padding: '0 0.5rem' }}
              >
                <option value="">— All Projects Financials —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({(projectPaymentsMap[p.id] || []).length} milestones)
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => {
              if (selectedProjectId) fetchSelectedProjectPayments(selectedProjectId);
              else fetchProjects();
            }}
            title="Refresh payments"
            style={{
              width: '34px',
              height: '34px',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={15} color="#09090b" className={isLoadingProjects || isLoadingPayments ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── 2. VIEW MODE A: SPECIFIC PROJECT SELECTED ── */}
      {selectedProject ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Project Overview Header Card */}
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
                  <CreditCard size={22} color="#09090b" />
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
                      <span>Start Date: {formatDate(selectedProject.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action: Open Full Project Overview */}
              <Link
                href={`/projects/${selectedProject.id}/overview`}
                className="wf-btn wf-btn-outline"
                style={{
                  fontSize: '0.775rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.75rem',
                  textDecoration: 'none',
                  color: '#09090b',
                }}
              >
                <span>Full Project Overview</span>
                <ExternalLink size={13} />
              </Link>
            </div>
          </div>

          {/* 4 Financial KPI Summary Cards for Selected Project */}
          <div className="grid-4">
            <div className="wf-card">
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Approved Total Estimate
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.25rem 0', color: '#09090b' }}>
                {isLoadingPayments ? '—' : formatCurrency(approvedTotal)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                Across {payments.length} project milestones
              </div>
            </div>

            <div className="wf-card">
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Total Paid &amp; Verified
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.25rem 0', color: '#15803d' }}>
                {isLoadingPayments ? '—' : formatCurrency(paidVerifiedTotal)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {payments.filter((p) => p.status === 'verified').length} milestones cleared
              </div>
            </div>

            <div className="wf-card">
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Outstanding Balance
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.25rem 0', color: outstandingTotal > 0 ? '#b91c1c' : '#09090b' }}>
                {isLoadingPayments ? '—' : outstandingTotal > 0 ? `-${formatCurrency(outstandingTotal)}` : '$0'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {payments.filter((p) => p.status === 'pending').length} milestones due
              </div>
            </div>

            <div className="wf-card">
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Milestone Clearance Status
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.65rem',
                    backgroundColor: payments.length === 0 ? '#f4f4f5' : outstandingTotal === 0 ? '#f0fdf4' : '#eff6ff',
                    color: payments.length === 0 ? '#71717a' : outstandingTotal === 0 ? '#15803d' : '#1d4ed8',
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: payments.length === 0 ? '#d4d4d8' : outstandingTotal === 0 ? '#bbf7d0' : '#bfdbfe',
                  }}
                >
                  {payments.length === 0
                    ? 'No Invoices Yet'
                    : outstandingTotal === 0
                    ? 'Fully Cleared'
                    : 'Pending Disbursement'}
                </span>
              </div>
            </div>
          </div>

          {/* Milestone Schedule & Invoices Table */}
          <div className="wf-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>
                  Milestone Invoices &amp; Receipts ({selectedProject.title})
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  All financial milestones and verification audit stamps recorded for this project
                </span>
              </div>
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
                  No Payment Records for {selectedProject.title}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '380px' }}>
                  No milestone invoices or quotations have been issued yet for this survey project. When LATRICS billing desk issues project invoices, they will appear here.
                </p>
              </div>
            ) : (
              <table className="wf-table">
                <thead>
                  <tr>
                    <th>Milestone Name</th>
                    <th>Amount (USD/INR)</th>
                    <th>Status</th>
                    <th>Payment Method</th>
                    <th>Verified Date</th>
                    <th>Bank Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((pay) => (
                    <tr key={pay.id}>
                      <td style={{ fontWeight: 700, color: '#09090b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <CreditCard size={15} color="#71717a" />
                          <span>{pay.milestone_name}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 800 }}>{formatCurrency(pay.amount_usd ?? pay.amount_inr ?? 0)}</td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            backgroundColor: pay.status === 'verified' ? '#09090b' : '#f4f4f5',
                            color: pay.status === 'verified' ? '#ffffff' : '#09090b',
                            borderRadius: '3px',
                            border: pay.status === 'verified' ? 'none' : '1px solid #d4d4d8',
                            textTransform: 'capitalize',
                          }}
                        >
                          {pay.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                        {pay.payment_method || 'Bank Transfer (RTGS)'}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {formatDate(pay.verified_at || pay.created_at)}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#09090b' }}>
                        {pay.bank_reference || pay.reference_code || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Disclaimer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-color)', fontSize: '0.725rem', color: 'var(--text-muted)', backgroundColor: '#fafafa' }}>
              <Info size={14} style={{ flexShrink: 0 }} />
              <span>
                Payments are recorded and verified by LATRICS billing team. All transactions occur via direct RTGS/NEFT to designated escrow/bank accounts.
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* ── 3. VIEW MODE B: ALL PROJECTS FINANCIAL DIRECTORY ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Search bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0 }}>
              Project financial ledger directory. Click any project to view its milestone breakdown, invoices, and payment status.
            </p>
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={14} color="#71717a" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search projects..."
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
          ) : filteredProjects.length === 0 ? (
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
                {searchQuery ? 'No projects match your search.' : 'No survey projects found in your workspace.'}
              </p>
            </div>
          ) : (
            <div className="wf-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="wf-table">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Site Location</th>
                    <th>Status</th>
                    <th>Approved Value</th>
                    <th>Paid &amp; Cleared</th>
                    <th>Outstanding</th>
                    <th>Milestones</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((p) => {
                    const projectPays = projectPaymentsMap[p.id] || [];
                    const pApproved = projectPays.reduce((acc, pay) => acc + (pay.amount_usd ?? pay.amount_inr ?? 0), 0);
                    const pPaid = projectPays
                      .filter((pay) => pay.status === 'verified')
                      .reduce((acc, pay) => acc + (pay.amount_usd ?? pay.amount_inr ?? 0), 0);
                    const pDue = pApproved - pPaid;

                    return (
                      <tr
                        key={p.id}
                        onClick={() => handleSelectProject(p.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <WireframeBox width={32} height={32} style={{ borderRadius: '4px', flexShrink: 0 }}>
                              <Folder size={15} color="#09090b" />
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
                          {formatCurrency(pApproved)}
                        </td>
                        <td style={{ fontWeight: 700, fontSize: '0.85rem', color: '#15803d' }}>
                          {formatCurrency(pPaid)}
                        </td>
                        <td style={{ fontWeight: 700, fontSize: '0.85rem', color: pDue > 0 ? '#b91c1c' : '#71717a' }}>
                          {pDue > 0 ? `-${formatCurrency(pDue)}` : '$0'}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {projectPays.length} recorded
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
                            <span>View Ledger</span>
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
      )}
    </div>
  );
}
