'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
  Lock,
  ArrowRight,
  ExternalLink,
  Wallet,
  Receipt,
  Download,
  Award,
  DollarSign,
  AlertTriangle,
  UserCheck,
  MapPin,
  Calendar,
  Layers,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { Project } from '@/modules/projects/types';
import { projectApi } from '@/modules/projects/api';
import { PaymentRecord, Invoice, ClientWalletSummary } from '@/modules/payments/types';
import { paymentsApi } from '@/modules/payments/api';
import { StageChatBox, StageChatMessage } from '@/modules/projects/components/StageChatBox';
import { formatDateDDMMYYYY } from '@/lib/date';

export interface DeliveredStageWorkspaceProps {
  project: Project | null;
  payments?: PaymentRecord[];
  wallet?: ClientWalletSummary | null;
  invoices?: Invoice[];
  onRefresh: () => void | Promise<void>;
  userRole?: string;
  userName?: string;
  stageMessages: StageChatMessage[];
  onSendMessage: (text: string, attachments?: { name: string; size?: string }[]) => Promise<void>;
}

export const DeliveredStageWorkspace: React.FC<DeliveredStageWorkspaceProps> = ({
  project,
  payments = [],
  wallet = null,
  invoices = [],
  onRefresh,
  userRole,
  userName = 'User',
  stageMessages = [],
  onSendMessage,
}) => {
  const isOps = userRole === 'admin' || userRole === 'operations';
  const isClient = userRole === 'client' || userRole === 'client_primary' || userRole === 'client_sub';

  // Live Wallet and Invoices State (with self-healing fallback)
  const [internalWallet, setInternalWallet] = useState<ClientWalletSummary | null>(wallet || null);
  const [internalInvoices, setInternalInvoices] = useState<Invoice[]>(invoices || []);

  useEffect(() => {
    if (wallet !== undefined) setInternalWallet(wallet);
  }, [wallet]);

  useEffect(() => {
    if (invoices !== undefined) setInternalInvoices(invoices);
  }, [invoices]);

  useEffect(() => {
    if (!wallet && project?.id) {
      paymentsApi.getProjectWallet(project.id).then((w) => setInternalWallet(w)).catch(() => {});
      paymentsApi.listProjectInvoices(project.id).then((invs) => setInternalInvoices(invs)).catch(() => {});
    }
  }, [project?.id, wallet]);

  // Sub-step navigation or active view
  const [activeSubStep, setActiveSubStep] = useState<'A' | 'B' | 'C'>('A');

  // Step A: Client Acceptance Form State
  const [signerName, setSignerName] = useState('');
  const [declaration1, setDeclaration1] = useState(false);
  const [declaration2, setDeclaration2] = useState(false);
  const [declaration3, setDeclaration3] = useState(false);
  const [userLocation, setUserLocation] = useState<string>('Detecting location...');
  const [isSubmittingAcceptance, setIsSubmittingAcceptance] = useState(false);

  // Step B: Financial Clearance State
  const [isConfirmingClearance, setIsConfirmingClearance] = useState(false);

  // Step C: Project Closure State
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [isClosingProject, setIsClosingProject] = useState(false);

  // Status feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Payload extraction
  const reqPayload = useMemo(() => {
    return ((project?.requirements_payload || {}) as Record<string, any>);
  }, [project]);

  const procDeliv = useMemo(() => {
    return (reqPayload.processing_deliverables || {}) as Record<string, any>;
  }, [reqPayload]);

  const linksMap = useMemo(() => {
    return (procDeliv.links || {}) as Record<string, string>;
  }, [procDeliv]);

  const formalAcceptance = useMemo(() => {
    return (reqPayload.formal_acceptance || {}) as Record<string, any>;
  }, [reqPayload]);

  const isStepAAccepted = Boolean(
    formalAcceptance.accepted ||
    (procDeliv.client_signoff?.acknowledged && formalAcceptance.accepted !== false)
  );

  const financialClearance = useMemo(() => {
    return (reqPayload.financial_clearance || {}) as Record<string, any>;
  }, [reqPayload]);

  const closureDetails = useMemo(() => {
    return (reqPayload.closure_details || {}) as Record<string, any>;
  }, [reqPayload]);

  const isProjectCompleted = project?.status === 'completed';

  // Detect Geolocation for Electronic Signature
  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation(`Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)} (GPS Verified)`);
        },
        () => {
          try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            setUserLocation(`${tz} (Browser Locale)`);
          } catch {
            setUserLocation('India Standard Time (IST)');
          }
        },
        { timeout: 5000 }
      );
    } else {
      setUserLocation('Standard Web Session');
    }
  }, []);

  // Financial calculations strictly from real backend records (no synthetic numbers or frontend-fabricated costs)
  const { totalEstimatedCost, totalVerifiedPaid, balanceDue, isFinancialCleared } = useMemo(() => {
    // 1. Total Billed / Contract Value
    // Prioritize actual project wallet billed amount or digital invoices sum
    const walletBilled = internalWallet ? Number(internalWallet.total_billed || 0) : 0;
    const invoicesSum = (internalInvoices || []).reduce((acc, inv) => acc + (Number(inv.total_amount) || 0), 0);
    const reqCommercialCost = Number(
      reqPayload.commercials?.total_project_cost ||
      reqPayload.estimated_cost ||
      0
    );

    const contractValue = walletBilled > 0 ? walletBilled : (invoicesSum > 0 ? invoicesSum : reqCommercialCost);

    // 2. Total Verified Paid
    const verifiedPayments = (payments || []).filter((p) => p.status === 'verified');
    const paidSumFromPayments = verifiedPayments.reduce((acc, p) => acc + (Number(p.amount_inr ?? p.amount_usd) || 0), 0);
    const paidSum = internalWallet ? Number(internalWallet.total_paid || 0) : paidSumFromPayments;

    // 3. Outstanding Balance Due
    let due = 0;
    if (internalWallet) {
      due = Number(internalWallet.amount_due ?? (internalWallet.current_balance > 0 ? internalWallet.current_balance : 0));
    } else if (contractValue > 0) {
      due = Math.max(0, contractValue - paidSum);
    }

    // 4. Financial Clearance status
    // CRITICAL: Cannot be cleared if balance due > 0!
    // If due > 0, cleared is strictly false.
    // If due === 0, it is cleared only if Ops explicitly confirmed clearance (financialClearance.cleared is true)
    const cleared = due <= 0 && Boolean(financialClearance.cleared);

    return {
      totalEstimatedCost: contractValue,
      totalVerifiedPaid: paidSum,
      balanceDue: due,
      isFinancialCleared: cleared,
    };
  }, [reqPayload, payments, financialClearance, internalWallet, internalInvoices]);

  // Dynamic deliverables from processing deliverables (zero static mock items)
  const deliverablesList = useMemo(() => {
    const preObj = (procDeliv.pre_processing || {}) as Record<string, any>;
    const postObj = (procDeliv.post_processing || {}) as Record<string, any>;
    const linksObj = (procDeliv.links || {}) as Record<string, string>;

    const list: { id: string; label: string; ext: string; url: string }[] = [];

    // Pre-processing deliverables with link
    Object.entries(preObj).forEach(([id, rec]: [string, any]) => {
      const url = rec.link || linksObj[`pre_${id}`] || '';
      if (url) {
        list.push({
          id: `pre_${id}`,
          label: rec.name || id,
          ext: rec.format || 'Pre-Processing Deliverable',
          url,
        });
      }
    });

    // Post-processing deliverables with link
    Object.entries(postObj).forEach(([id, rec]: [string, any]) => {
      const url = rec.link || linksObj[`post_${id}`] || '';
      if (url) {
        list.push({
          id: `post_${id}`,
          label: rec.name || id,
          ext: rec.format || 'Geospatial Product',
          url,
        });
      }
    });

    // Any other links in linksObj
    Object.entries(linksObj).forEach(([k, url]) => {
      if (url && !list.some((it) => it.id === k)) {
        list.push({
          id: k,
          label: k.replace(/^(pre_|post_)/, '').replace(/_/g, ' ').toUpperCase(),
          ext: 'Cloud Deliverable',
          url,
        });
      }
    });

    return list;
  }, [procDeliv]);

  // Auto-focus the next active step
  useEffect(() => {
    if (!isStepAAccepted) {
      setActiveSubStep('A');
    } else if (!isFinancialCleared) {
      setActiveSubStep('B');
    } else {
      setActiveSubStep('C');
    }
  }, [isStepAAccepted, isFinancialCleared]);

  // Handle Step A: Submit Client Acceptance
  const handleSubmitAcceptance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !isClient) return;

    if (!declaration1 || !declaration2 || !declaration3) {
      setErrorMessage('Please confirm all three formal acceptance declaration checkboxes.');
      return;
    }

    if (!signerName.trim()) {
      setErrorMessage('Please enter your full legal name as your electronic signature.');
      return;
    }

    setIsSubmittingAcceptance(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const nowIso = new Date().toISOString();
      const updatedFormal = {
        accepted: true,
        signed_by: userName,
        signature_name: signerName.trim(),
        signed_at: nowIso,
        location: userLocation,
        declarations_confirmed: true,
      };

      const updatedPayload = {
        ...reqPayload,
        formal_acceptance: updatedFormal,
        processing_deliverables: {
          ...procDeliv,
          client_acknowledged: true,
          client_acknowledged_at: nowIso,
          client_acknowledged_by: signerName.trim(),
        },
      };

      await projectApi.updateProject(project.id, {
        requirements_payload: updatedPayload,
      });

      setSuccessMessage('Client Acceptance signed and submitted successfully! Advancing to Financial Verification.');
      await onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit client acceptance.');
    } finally {
      setIsSubmittingAcceptance(false);
    }
  };

  // Handle Step B: Confirm Financial Clearance
  const handleConfirmFinancialClearance = async () => {
    if (!project || !isOps) return;
    if (balanceDue > 0) {
      setErrorMessage(`Cannot confirm clearance: ₹${balanceDue.toLocaleString()} remains due on the project account.`);
      return;
    }

    setIsConfirmingClearance(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const nowIso = new Date().toISOString();
      const updatedFinancial = {
        cleared: true,
        cleared_by: userName,
        cleared_at: nowIso,
        balance_due: 0,
      };

      const updatedPayload = {
        ...reqPayload,
        financial_clearance: updatedFinancial,
      };

      await projectApi.updateProject(project.id, {
        requirements_payload: updatedPayload,
      });

      setSuccessMessage('Financial clearance confirmed by Operations! The project is now ready for formal closure.');
      await onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to confirm financial clearance.');
    } finally {
      setIsConfirmingClearance(false);
    }
  };

  // Handle Step C: Close Project
  const handleCloseProject = async () => {
    if (!project || !isOps) return;
    if (!isStepAAccepted) {
      setErrorMessage('Cannot close project: Client must first sign and submit the formal acceptance form (Step A).');
      return;
    }
    if (!isFinancialCleared) {
      setErrorMessage('Cannot close project: Financial verification must be cleared with ₹0 due (Step B).');
      return;
    }

    setIsClosingProject(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const nowIso = new Date().toISOString();
      const updatedClosure = {
        closed_by: userName,
        closed_at: nowIso,
        status: 'completed',
        retention_guaranteed: true,
      };

      const updatedPayload = {
        ...reqPayload,
        closure_details: updatedClosure,
      };

      await projectApi.updateProject(project.id, {
        status: 'completed' as any,
        requirements_payload: updatedPayload,
      });

      setShowCloseModal(false);
      setSuccessMessage(`Project '${project.title}' has been successfully closed and permanently archived!`);
      await onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to close project.');
    } finally {
      setIsClosingProject(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.25rem', alignItems: 'stretch' }}>
      {/* ── Left Column: Delivered Stage 3-Step Workspace ── */}
      <div
        className="wf-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '620px',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Uniform Header */}
        <div
          className="wf-card-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
            padding: '0.85rem 1.25rem',
            margin: 0,
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: '#ffffff',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <h2 className="wf-title" style={{ margin: 0 }}>
              Stage 6: Delivered &amp; Project Handover
            </h2>

            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                backgroundColor: isProjectCompleted ? '#ecfdf5' : '#f4f4f5',
                color: isProjectCompleted ? '#059669' : '#18181b',
                border: isProjectCompleted ? '1px solid #a7f3d0' : '1px solid #d4d4d8',
              }}
            >
              {isProjectCompleted
                ? 'Closed & Permanently Archived'
                : balanceDue > 0 && isStepAAccepted
                ? 'Payment Pending'
                : isStepAAccepted && isFinancialCleared
                ? 'Ready for Closure'
                : 'Awaiting Client Acceptance'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            {!isProjectCompleted && isOps && isStepAAccepted && isFinancialCleared && (
              <button
                type="button"
                onClick={() => setShowCloseModal(true)}
                className="btn btn-primary"
                style={{
                  fontSize: '0.75rem',
                  height: '32px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 700,
                  padding: '0 0.85rem',
                  borderRadius: '4px',
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                  border: '1px solid #09090b',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <Lock size={13} />
                <span>Close Project</span>
              </button>
            )}
          </div>
        </div>

        {/* ── 3-Step Progression Bar ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            borderBottom: '1px solid #e4e4e7',
            backgroundColor: '#fafafa',
          }}
        >
          {/* Step A Button */}
          <button
            type="button"
            onClick={() => setActiveSubStep('A')}
            style={{
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: 'none',
              background: activeSubStep === 'A' ? '#ffffff' : 'transparent',
              borderBottom: activeSubStep === 'A' ? '2px solid #09090b' : '2px solid transparent',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 700,
                backgroundColor: isStepAAccepted ? '#16a34a' : activeSubStep === 'A' ? '#09090b' : '#e4e4e7',
                color: '#ffffff',
              }}
            >
              {isStepAAccepted ? '✓' : 'A'}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#09090b' }}>
                Step A: Client Acceptance
              </div>
              <div style={{ fontSize: '0.675rem', color: isStepAAccepted ? '#16a34a' : 'var(--text-muted)' }}>
                {isStepAAccepted ? 'Signed & Sealed' : 'Electronic Signature'}
              </div>
            </div>
          </button>

          {/* Step B Button */}
          <button
            type="button"
            onClick={() => setActiveSubStep('B')}
            style={{
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: 'none',
              background: activeSubStep === 'B' ? '#ffffff' : 'transparent',
              borderBottom: activeSubStep === 'B' ? '2px solid #09090b' : '2px solid transparent',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 700,
                backgroundColor: isFinancialCleared ? '#16a34a' : balanceDue > 0 ? '#dc2626' : activeSubStep === 'B' ? '#09090b' : '#e4e4e7',
                color: '#ffffff',
              }}
            >
              {isFinancialCleared ? '✓' : balanceDue > 0 ? '!' : 'B'}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#09090b' }}>
                Step B: Financial Verification
              </div>
              <div style={{ fontSize: '0.675rem', color: isFinancialCleared ? '#16a34a' : balanceDue > 0 ? '#dc2626' : 'var(--text-muted)' }}>
                {isFinancialCleared
                  ? '₹0 Due Cleared'
                  : balanceDue > 0
                  ? `₹${balanceDue.toLocaleString()} Due (Pending)`
                  : 'Accounts Check'}
              </div>
            </div>
          </button>

          {/* Step C Button */}
          <button
            type="button"
            onClick={() => setActiveSubStep('C')}
            style={{
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: 'none',
              background: activeSubStep === 'C' ? '#ffffff' : 'transparent',
              borderBottom: activeSubStep === 'C' ? '2px solid #09090b' : '2px solid transparent',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 700,
                backgroundColor: isProjectCompleted ? '#16a34a' : activeSubStep === 'C' ? '#09090b' : '#e4e4e7',
                color: '#ffffff',
              }}
            >
              {isProjectCompleted ? '✓' : 'C'}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#09090b' }}>
                Step C: Project Closure
              </div>
              <div style={{ fontSize: '0.675rem', color: isProjectCompleted ? '#16a34a' : 'var(--text-muted)' }}>
                {isProjectCompleted ? 'Completed & Archived' : 'Ops Final Sign-off'}
              </div>
            </div>
          </button>
        </div>

        {/* Transient Alerts */}
        {errorMessage && (
          <div
            style={{
              padding: '0.65rem 1rem',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              borderBottom: '1px solid #fee2e2',
              fontSize: '0.775rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <AlertCircle size={14} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div
            style={{
              padding: '0.65rem 1rem',
              backgroundColor: '#f0fdf4',
              color: '#16a34a',
              borderBottom: '1px solid #bbf7d0',
              fontSize: '0.775rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <CheckCircle2 size={14} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ── Tab Content ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          {/* ══════════════════════════════════════════════════════════
              STEP A: CLIENT ACCEPTANCE
          ══════════════════════════════════════════════════════════ */}
          {activeSubStep === 'A' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Signed Banner if already executed */}
              {isStepAAccepted ? (
                <div
                  style={{
                    padding: '1rem',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.85rem',
                  }}
                >
                  <CheckCircle2 size={24} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#166534', margin: 0 }}>
                      Formal Client Acceptance Executed &amp; Recorded
                    </h3>
                    <p style={{ fontSize: '0.775rem', color: '#15803d', margin: '0.25rem 0 0.5rem 0' }}>
                      The client has verified receipt of all survey deliverables and electronically signed the formal acceptance declaration.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.725rem', backgroundColor: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #dcfce7' }}>
                      <div>
                        <span style={{ color: '#64748b' }}>Electronic Signature:</span>{' '}
                        <strong style={{ color: '#09090b' }}>{formalAcceptance.signature_name || formalAcceptance.signed_by || userName}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Timestamp:</span>{' '}
                        <strong style={{ color: '#09090b' }}>{formalAcceptance.signed_at ? new Date(formalAcceptance.signed_at).toLocaleString() : 'Recorded'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Location:</span>{' '}
                        <strong style={{ color: '#09090b' }}>{formalAcceptance.location || userLocation}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: '#fafafa',
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileCheck2 size={16} color="#09090b" />
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                      Predefined Deliverables Acceptance Form
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: '0.3rem 0 0 0' }}>
                    Review the verified deliverable assets below and acknowledge acceptance. Your submission will record your electronic signature, timestamp, and location.
                  </p>
                </div>
              )}

              {/* Deliverables Checklist / Links Summary */}
              <div style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '1rem', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                  <Layers size={14} color="#09090b" />
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b', margin: 0 }}>
                    Project Deliverables Verification Roster
                  </h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  {deliverablesList.length > 0 ? (
                    deliverablesList.map((deliv) => (
                      <div
                        key={deliv.id}
                        style={{
                          padding: '0.65rem 0.85rem',
                          backgroundColor: '#fafafa',
                          border: '1px solid #f4f4f5',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.775rem', fontWeight: 700, color: '#09090b' }}>
                            {deliv.label}
                          </div>
                          <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                            Format: {deliv.ext}
                          </div>
                        </div>

                        {deliv.url ? (
                          <a
                            href={deliv.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              color: '#09090b',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              backgroundColor: '#ffffff',
                              border: '1px solid #d4d4d8',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                            }}
                          >
                            <span>Open</span>
                            <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.675rem', color: '#71717a' }}>Verified In Package</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        padding: '1rem',
                        color: '#71717a',
                        fontSize: '0.775rem',
                        fontStyle: 'italic',
                        gridColumn: '1 / -1',
                        textAlign: 'center',
                        backgroundColor: '#fafafa',
                        borderRadius: '6px',
                        border: '1px dashed #e4e4e7',
                      }}
                    >
                      No deliverable links uploaded in Stage 5 (Processing) yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Acceptance Declaration & Signature Form */}
              {!isStepAAccepted ? (
                isClient ? (
                  <form onSubmit={handleSubmitAcceptance} style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '1rem', backgroundColor: '#ffffff' }}>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b', margin: '0 0 0.85rem 0' }}>
                      Client Acknowledgment &amp; Electronic Signature
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.775rem', color: '#09090b' }}>
                        <input
                          type="checkbox"
                          checked={declaration1}
                          onChange={(e) => setDeclaration1(e.target.checked)}
                          style={{ marginTop: '2px', cursor: 'pointer' }}
                          required
                        />
                        <span>
                          <strong>Receipt Confirmation:</strong> I confirm that our organization has received, downloaded, and reviewed all required pre-processing and post-processing deliverables.
                        </span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.775rem', color: '#09090b' }}>
                        <input
                          type="checkbox"
                          checked={declaration2}
                          onChange={(e) => setDeclaration2(e.target.checked)}
                          style={{ marginTop: '2px', cursor: 'pointer' }}
                          required
                        />
                        <span>
                          <strong>Quality Acceptance:</strong> I confirm the geospatial deliverables conform to our contracted scope, target area, and accuracy tolerances.
                        </span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.775rem', color: '#09090b' }}>
                        <input
                          type="checkbox"
                          checked={declaration3}
                          onChange={(e) => setDeclaration3(e.target.checked)}
                          style={{ marginTop: '2px', cursor: 'pointer' }}
                          required
                        />
                        <span>
                          <strong>Closure Authorization:</strong> I authorize LATRICS Operations to advance this project for financial verification and formal closure.
                        </span>
                      </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem', backgroundColor: '#fafafa', padding: '0.85rem', borderRadius: '6px', border: '1px solid #f4f4f5' }}>
                      <div>
                        <label style={{ fontSize: '0.725rem', fontWeight: 700, color: '#09090b', display: 'block', marginBottom: '0.35rem' }}>
                          Electronic Signature (Full Legal Name) *
                        </label>
                        <input
                          type="text"
                          value={signerName}
                          onChange={(e) => setSignerName(e.target.value)}
                          placeholder="e.g. Aditya Verma"
                          required
                          style={{
                            width: '100%',
                            height: '34px',
                            padding: '0 0.75rem',
                            fontSize: '0.8rem',
                            borderRadius: '4px',
                            border: '1px solid #d4d4d8',
                            backgroundColor: '#ffffff',
                            fontWeight: 600,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.725rem', fontWeight: 700, color: '#09090b', display: 'block', marginBottom: '0.35rem' }}>
                          Recorded Location Stamp
                        </label>
                        <div
                          style={{
                            height: '34px',
                            padding: '0 0.75rem',
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                            border: '1px solid #e4e4e7',
                            backgroundColor: '#f4f4f5',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            color: '#52525b',
                          }}
                        >
                          <MapPin size={12} />
                          <span>{userLocation}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="submit"
                        disabled={isSubmittingAcceptance || !declaration1 || !declaration2 || !declaration3 || !signerName.trim()}
                        className="btn btn-primary"
                        style={{
                          height: '36px',
                          padding: '0 1.25rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          backgroundColor: '#09090b',
                          color: '#ffffff',
                          border: '1px solid #09090b',
                          borderRadius: '5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          cursor: 'pointer',
                        }}
                      >
                        <CheckCircle2 size={14} />
                        <span>{isSubmittingAcceptance ? 'Signing & Submitting...' : 'Sign & Submit Formal Acceptance'}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div style={{ padding: '1.25rem', textAlign: 'center', backgroundColor: '#fafafa', border: '1px dashed #d4d4d8', borderRadius: '8px' }}>
                    <Clock size={20} style={{ color: '#71717a', margin: '0 auto 0.5rem auto' }} />
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b', margin: 0 }}>
                      Awaiting Formal Acceptance from Client
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0 0' }}>
                      The predefined acceptance form has been presented to the client representative. Once the client electronically signs the form, this step will be completed and Financial Verification will unlock.
                    </p>
                  </div>
                )
              ) : null}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              STEP B: FINANCIAL VERIFICATION
          ══════════════════════════════════════════════════════════ */}
          {activeSubStep === 'B' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Financial Status Summary */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  backgroundColor: balanceDue > 0 ? '#fef2f2' : isFinancialCleared ? '#f0fdf4' : '#fffbeb',
                  border: balanceDue > 0 ? '1px solid #fecaca' : isFinancialCleared ? '1px solid #bbf7d0' : '1px solid #fde68a',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                }}
              >
                {balanceDue > 0 ? (
                  <AlertCircle size={22} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
                ) : isFinancialCleared ? (
                  <CheckCircle2 size={22} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
                ) : (
                  <Clock size={22} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                )}
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: balanceDue > 0 ? '#991b1b' : isFinancialCleared ? '#166534' : '#92400e', margin: 0 }}>
                    {balanceDue > 0
                      ? `Payment Pending: ₹${balanceDue.toLocaleString()} Outstanding Balance`
                      : isFinancialCleared
                      ? 'Financial Clearance Confirmed: ₹0 Due'
                      : 'Accounts Reconciled: ₹0 Due (Awaiting Operations Clearance)'}
                  </h3>
                  <p style={{ fontSize: '0.775rem', color: balanceDue > 0 ? '#b91c1c' : isFinancialCleared ? '#15803d' : '#b45309', margin: '0.25rem 0 0.5rem 0' }}>
                    {balanceDue > 0
                      ? `An outstanding balance of ₹${balanceDue.toLocaleString()} remains pending on project invoices. The client must settle the payment or Operations must record and verify the remittance before financial clearance can be granted.`
                      : isFinancialCleared
                      ? 'All milestone invoices and client wallet transactions have been verified and settled. The outstanding balance is ₹0.'
                      : 'All invoiced dues have been settled (₹0 due balance). Operations must confirm final financial clearance to unlock project closure.'}
                  </p>
                </div>
              </div>

              {/* Financial Metrics Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div style={{ padding: '0.85rem 1rem', border: '1px solid #e4e4e7', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Contract / Invoiced Value</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#09090b', marginTop: '0.2rem' }}>
                    ₹{totalEstimatedCost.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {internalInvoices.length > 0
                      ? `${internalInvoices.length} Project Invoice${internalInvoices.length === 1 ? '' : 's'}`
                      : 'Commercial Package Value'}
                  </div>
                </div>

                <div style={{ padding: '0.85rem 1rem', border: '1px solid #e4e4e7', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Payments Verified</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>
                    ₹{totalVerifiedPaid.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Settled in Wallet / Ledger</div>
                </div>

                <div style={{ padding: '0.85rem 1rem', border: '1px solid #e4e4e7', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Outstanding Balance Due</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: balanceDue > 0 ? '#dc2626' : '#16a34a', marginTop: '0.2rem' }}>
                    ₹{balanceDue.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.675rem', color: balanceDue > 0 ? '#dc2626' : '#16a34a', marginTop: '0.2rem' }}>
                    {balanceDue > 0 ? 'Clearance Required' : '₹0 Due Balance'}
                  </div>
                </div>
              </div>

              {/* Ledger / Payments History */}
              <div style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '1rem', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Receipt size={14} color="#09090b" />
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b', margin: 0 }}>
                      Project Milestone Invoices &amp; Ledger
                    </h4>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {internalWallet?.ledger_entries?.length ?? (internalInvoices.length + (payments || []).length)} Transaction{(internalWallet?.ledger_entries?.length ?? (internalInvoices.length + (payments || []).length)) === 1 ? '' : 's'}
                  </span>
                </div>

                {internalWallet?.ledger_entries && internalWallet.ledger_entries.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {internalWallet.ledger_entries.map((entry) => (
                      <div
                        key={entry.id}
                        style={{
                          padding: '0.6rem 0.85rem',
                          backgroundColor: '#fafafa',
                          border: '1px solid #f4f4f5',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.775rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              backgroundColor: entry.type === 'bill' ? '#f4f4f5' : '#ecfdf5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {entry.type === 'bill' ? (
                              <FileText size={14} color="#52525b" />
                            ) : (
                              <Wallet size={14} color="#059669" />
                            )}
                          </div>
                          <div>
                            <strong style={{ color: '#09090b' }}>{entry.description}</strong>
                            <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                              Ref: {entry.reference} • {entry.date}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'right' }}>
                          <div>
                            <div style={{ fontWeight: 800, color: entry.type === 'bill' ? '#09090b' : '#16a34a' }}>
                              {entry.type === 'bill' ? `₹${entry.amount_billed.toLocaleString()}` : `-₹${entry.amount_paid.toLocaleString()}`}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: entry.running_balance > 0 ? '#dc2626' : '#16a34a' }}>
                              Bal: ₹{entry.running_balance.toLocaleString()}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: '0.675rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: entry.type === 'bill' ? '#f4f4f5' : '#ecfdf5',
                              color: entry.type === 'bill' ? '#52525b' : '#059669',
                              border: entry.type === 'bill' ? '1px solid #e4e4e7' : '1px solid #a7f3d0',
                              textTransform: 'capitalize',
                            }}
                          >
                            {entry.type === 'bill' ? 'Billed' : 'Verified'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (payments && payments.length > 0) || internalInvoices.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {internalInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        style={{
                          padding: '0.6rem 0.85rem',
                          backgroundColor: '#fafafa',
                          border: '1px solid #f4f4f5',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.775rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileText size={14} color="#52525b" />
                          </div>
                          <div>
                            <strong style={{ color: '#09090b' }}>{inv.title || `Invoice ${inv.invoice_number}`}</strong>
                            <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                              Ref: {inv.invoice_number} • {inv.bill_date || '—'}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontWeight: 800, color: '#09090b' }}>
                            ₹{Number(inv.total_amount).toLocaleString()}
                          </span>
                          <span style={{ fontSize: '0.675rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f4f4f5', color: '#52525b', border: '1px solid #e4e4e7' }}>
                            Billed
                          </span>
                        </div>
                      </div>
                    ))}
                    {payments.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          padding: '0.6rem 0.85rem',
                          backgroundColor: '#fafafa',
                          border: '1px solid #f4f4f5',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.775rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Wallet size={14} color="#059669" />
                          </div>
                          <div>
                            <strong style={{ color: '#09090b' }}>{p.milestone_name}</strong>
                            <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                              Ref: {p.reference_code || p.bank_reference || 'REF-PENDING'} • {p.created_at ? formatDateDDMMYYYY(p.created_at) : '—'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontWeight: 800, color: '#16a34a' }}>
                            ₹{Number(p.amount_inr ?? p.amount_usd ?? 0).toLocaleString()}
                          </span>
                          <span
                            style={{
                              fontSize: '0.675rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: p.status === 'verified' ? '#ecfdf5' : '#fef3c7',
                              color: p.status === 'verified' ? '#059669' : '#b45309',
                              border: p.status === 'verified' ? '1px solid #a7f3d0' : '1px solid #fde68a',
                              textTransform: 'capitalize',
                            }}
                          >
                            {p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                    No milestone invoices recorded. Project total of ₹{totalEstimatedCost.toLocaleString()} cleared under contract terms.
                  </div>
                )}
              </div>

              {/* Action Bar for Step B */}
              {isOps && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    backgroundColor: balanceDue > 0 ? '#fef2f2' : '#fafafa',
                    border: balanceDue > 0 ? '1px solid #fecaca' : '1px solid #e4e4e7',
                    borderRadius: '8px',
                  }}
                >
                  <span style={{ fontSize: '0.775rem', color: balanceDue > 0 ? '#991b1b' : '#09090b', fontWeight: 600 }}>
                    {balanceDue > 0
                      ? `Operations cannot grant clearance: ₹${balanceDue.toLocaleString()} remains pending on project invoices.`
                      : isFinancialCleared
                      ? `Financial clearance confirmed by Operations (${financialClearance.cleared_by || userName}).`
                      : 'The account balance is ₹0 due. Confirm financial clearance to proceed to project closure.'}
                  </span>

                  {!isFinancialCleared && (
                    <button
                      type="button"
                      onClick={handleConfirmFinancialClearance}
                      disabled={isConfirmingClearance || balanceDue > 0}
                      className="btn btn-primary"
                      style={{
                        height: '34px',
                        padding: '0 1rem',
                        fontSize: '0.775rem',
                        fontWeight: 700,
                        backgroundColor: balanceDue > 0 ? '#a1a1aa' : '#09090b',
                        color: '#ffffff',
                        border: '1px solid #09090b',
                        borderRadius: '5px',
                        cursor: balanceDue > 0 ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <CheckCircle2 size={13} />
                      <span>
                        {isConfirmingClearance
                          ? 'Confirming...'
                          : balanceDue > 0
                          ? `Payment Pending (₹${balanceDue.toLocaleString()} Due)`
                          : 'Confirm Financial Clearance (₹0 Due)'}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              STEP C: PROJECT CLOSURE
          ══════════════════════════════════════════════════════════ */}
          {activeSubStep === 'C' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {isProjectCompleted ? (
                /* Completed Certificate */
                <div
                  style={{
                    padding: '1.5rem',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    backgroundColor: '#f0fdf4',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Award size={32} style={{ color: '#16a34a' }} />
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#166534', margin: 0 }}>
                        Official Project Closure Certificate
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: '#15803d', margin: '0.2rem 0 0 0' }}>
                        This project has concluded all field captures, photogrammetry deliverables, client acceptance, and financial settlements.
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '0.75rem',
                      backgroundColor: '#ffffff',
                      padding: '1rem',
                      borderRadius: '6px',
                      border: '1px solid #dcfce7',
                      fontSize: '0.775rem',
                    }}
                  >
                    <div>
                      <div style={{ color: '#64748b' }}>Project Title:</div>
                      <strong style={{ color: '#09090b' }}>{project?.title}</strong>
                    </div>
                    <div>
                      <div style={{ color: '#64748b' }}>Client Acceptance:</div>
                      <strong style={{ color: '#16a34a' }}>Signed by {formalAcceptance.signature_name || 'Client'}</strong>
                    </div>
                    <div>
                      <div style={{ color: '#64748b' }}>Financial Clearance:</div>
                      <strong style={{ color: '#16a34a' }}>₹0 Due (Verified)</strong>
                    </div>
                    <div>
                      <div style={{ color: '#64748b' }}>Closed &amp; Sealed:</div>
                      <strong style={{ color: '#09090b' }}>
                        {closureDetails.closed_at ? formatDateDDMMYYYY(closureDetails.closed_at) : 'Archived'}
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', borderTop: '1px solid #dcfce7', paddingTop: '0.85rem' }}>
                    <ShieldCheck size={16} color="#16a34a" />
                    <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>
                      All telemetry records, flight logs, deliverable links, and audit timestamps are permanently retained.
                    </span>
                  </div>
                </div>
              ) : (
                /* Pre-closure Validation Summary */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div
                    style={{
                      padding: '1rem',
                      backgroundColor: '#fafafa',
                      border: '1px solid #e4e4e7',
                      borderRadius: '8px',
                    }}
                  >
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                      Final Project Closure Verification Gate
                    </h3>
                    <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: '0.3rem 0 0 0' }}>
                      To formally close and archive the project, both Client Acceptance (Step A) and Financial Verification (Step B) must be fully executed.
                    </p>
                  </div>

                  {/* 2 Requirements Checkboxes */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div
                      style={{
                        padding: '1rem',
                        borderRadius: '8px',
                        border: isStepAAccepted ? '1px solid #bbf7d0' : '1px solid #fecaca',
                        backgroundColor: isStepAAccepted ? '#f0fdf4' : '#fef2f2',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.65rem',
                      }}
                    >
                      {isStepAAccepted ? (
                        <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
                      ) : (
                        <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
                      )}
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                          Requirement 1: Client Acceptance
                        </div>
                        <div style={{ fontSize: '0.725rem', color: isStepAAccepted ? '#15803d' : '#991b1b', marginTop: '0.2rem' }}>
                          {isStepAAccepted
                            ? `Accepted & signed by ${formalAcceptance.signature_name || 'Client'}`
                            : 'Pending electronic signature from client in Step A.'}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '1rem',
                        borderRadius: '8px',
                        border: isFinancialCleared ? '1px solid #bbf7d0' : '1px solid #fecaca',
                        backgroundColor: isFinancialCleared ? '#f0fdf4' : '#fef2f2',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.65rem',
                      }}
                    >
                      {isFinancialCleared ? (
                        <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
                      ) : (
                        <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
                      )}
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                          Requirement 2: Financial Clearance
                        </div>
                        <div style={{ fontSize: '0.725rem', color: isFinancialCleared ? '#15803d' : '#991b1b', marginTop: '0.2rem' }}>
                          {isFinancialCleared
                            ? 'All payments settled with ₹0 due balance.'
                            : `Outstanding balance of ₹${balanceDue.toLocaleString()} remains pending.`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Closure Action Card */}
                  <div
                    style={{
                      padding: '1.25rem',
                      borderRadius: '8px',
                      border: '1px solid #e4e4e7',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                        Ready to Seal &amp; Close Project?
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                        Closing the project will lock all edit permissions, finalize audit logs, and record completion status.
                      </p>
                    </div>

                    {isOps ? (
                      <button
                        type="button"
                        onClick={() => setShowCloseModal(true)}
                        disabled={!isStepAAccepted || !isFinancialCleared}
                        className="btn btn-primary"
                        style={{
                          height: '38px',
                          padding: '0 1.25rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          backgroundColor: (!isStepAAccepted || !isFinancialCleared) ? '#71717a' : '#09090b',
                          color: '#ffffff',
                          border: '1px solid #09090b',
                          borderRadius: '6px',
                          cursor: (!isStepAAccepted || !isFinancialCleared) ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                        }}
                      >
                        <Lock size={14} />
                        <span>Close Project</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#71717a', fontStyle: 'italic' }}>
                        Authorized Operations Officer will execute final closure once all requirements pass.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right Column: Stage 6 Integrated Chat & Telemetry ── */}
      <StageChatBox
        projectId={project?.id || ''}
        stageId={6}
        stageName="Delivered"
        stageStatus={isProjectCompleted ? 'completed' : 'active'}
        messages={stageMessages}
        onSendMessage={onSendMessage}
        currentUserName={userName}
        currentUserRole={userRole || 'client'}
      />

      {/* ── Ops Close Project Confirmation Modal ── */}
      {showCloseModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              maxWidth: '520px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#f4f4f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Lock size={20} color="#09090b" />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                  Confirm Project Closure
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
                  Project: {project?.title}
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#52525b', lineHeight: 1.5, margin: '0 0 1.25rem 0' }}>
              Are you sure you want to officially close and complete this project?
              Both verification gates have passed:
            </p>

            <ul style={{ fontSize: '0.775rem', color: '#09090b', paddingLeft: '1.25rem', margin: '0 0 1.25rem 0', lineHeight: 1.6 }}>
              <li>Client Acceptance electronically signed and acknowledged (Step A)</li>
              <li>Financial clearance confirmed with ₹0 outstanding balance (Step B)</li>
              <li>Project status will transition to <strong>COMPLETED</strong> and all records sealed.</li>
            </ul>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                disabled={isClosingProject}
                style={{
                  height: '34px',
                  padding: '0 0.85rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '5px',
                  border: '1px solid #d4d4d8',
                  backgroundColor: '#ffffff',
                  color: '#09090b',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCloseProject}
                disabled={isClosingProject}
                style={{
                  height: '34px',
                  padding: '0 1.15rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  borderRadius: '5px',
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                  border: '1px solid #09090b',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Lock size={13} />
                <span>{isClosingProject ? 'Closing Project...' : 'Confirm & Close Project'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
