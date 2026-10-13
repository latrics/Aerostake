'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Plane,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Paperclip,
  Trash2,
  Lock,
  Check,
  X,
  Loader2,
  Eye,
} from 'lucide-react';
import { projectApi } from '@/modules/projects/api';
import { Project } from '@/modules/projects/types';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '@/lib/date';
import {
  MobilisationFormData,
  MobilisationResponsibility,
  ClientTicketApprovalStatus,
  LatricsAdvancePaymentStatus,
  ClientTicketBillItem,
} from '../types';

interface MobilisationConfirmationSectionProps {
  project: Project;
  isClient: boolean;
  isOps: boolean;
  isCompleted?: boolean;
  onUpdated: () => Promise<void>;
}

export const MobilisationConfirmationSection: React.FC<MobilisationConfirmationSectionProps> = ({
  project,
  isClient,
  isOps,
  isCompleted = false,
  onUpdated,
}) => {
  // Extract mobilization from project requirements_payload
  const currentPayload = (project.requirements_payload || {}) as Record<string, any>;
  const mobData = (currentPayload.mobilisation || {}) as Partial<MobilisationFormData>;

  const [responsibility, setResponsibility] = useState<MobilisationResponsibility>(
    (mobData.responsibility as MobilisationResponsibility) ||
      (mobData.mobilisationResponsibility as MobilisationResponsibility) ||
      ''
  );

  // Client responsibility fields
  const [deadline, setDeadline] = useState<string>(mobData.clientTicketShareDeadline || '');
  const [ticketBills, setTicketBills] = useState<ClientTicketBillItem[]>(
    mobData.clientTicketsAndBills || (mobData as any).clientTicketBills || []
  );
  const [ticketStatus, setTicketStatus] = useState<ClientTicketApprovalStatus>(
    (mobData.clientTicketApprovalStatus as ClientTicketApprovalStatus) || 'PENDING_SUBMISSION'
  );
  const [ticketNotes, setTicketNotes] = useState<string>(mobData.clientTicketApprovalNotes || '');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Latrics responsibility fields
  const [utr, setUtr] = useState<string>(mobData.latricsAdvanceUtr || '');
  const [paidAt, setPaidAt] = useState<string>(
    mobData.latricsAdvancePaymentDate || mobData.latricsAdvancePaidAt || ''
  );
  const [slipUrl, setSlipUrl] = useState<string>(
    mobData.latricsAdvanceSlipUrl || mobData.latricsAdvanceSlipFile?.url || ''
  );
  const [slipName, setSlipName] = useState<string>(
    mobData.latricsAdvanceSlipName || mobData.latricsAdvanceSlipFile?.name || ''
  );
  const [advanceStatus, setAdvanceStatus] = useState<LatricsAdvancePaymentStatus>(
    (mobData.latricsAdvancePaymentStatus as LatricsAdvancePaymentStatus) || 'PENDING_PAYMENT'
  );
  const [advanceNotes, setAdvanceNotes] = useState<string>(mobData.latricsAdvanceVerificationNotes || '');

  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isGatePassed =
    (responsibility === 'CLIENT' && ticketStatus === 'APPROVED') ||
    (responsibility === 'LATRICS' && advanceStatus === 'VERIFIED');

  const saveMobilisation = async (patch: Partial<MobilisationFormData>, successText: string) => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const mergedMob: Partial<MobilisationFormData> = {
        ...mobData,
        responsibility: patch.responsibility !== undefined ? patch.responsibility : responsibility,
        mobilisationResponsibility: patch.responsibility !== undefined ? patch.responsibility : responsibility,
        clientTicketShareDeadline: patch.clientTicketShareDeadline !== undefined ? patch.clientTicketShareDeadline : deadline,
        clientTicketsAndBills: patch.clientTicketsAndBills !== undefined ? patch.clientTicketsAndBills : ticketBills,
        clientTicketApprovalStatus: patch.clientTicketApprovalStatus !== undefined ? patch.clientTicketApprovalStatus : ticketStatus,
        clientTicketApprovalNotes: patch.clientTicketApprovalNotes !== undefined ? patch.clientTicketApprovalNotes : ticketNotes,
        latricsAdvanceAmount: 5000,
        latricsAdvanceUtr: patch.latricsAdvanceUtr !== undefined ? patch.latricsAdvanceUtr : utr,
        latricsAdvancePaymentDate: patch.latricsAdvancePaymentDate !== undefined ? patch.latricsAdvancePaymentDate : paidAt,
        latricsAdvancePaidAt: patch.latricsAdvancePaidAt !== undefined ? patch.latricsAdvancePaidAt : paidAt,
        latricsAdvanceSlipUrl: patch.latricsAdvanceSlipUrl !== undefined ? patch.latricsAdvanceSlipUrl : slipUrl,
        latricsAdvanceSlipName: patch.latricsAdvanceSlipName !== undefined ? patch.latricsAdvanceSlipName : slipName,
        latricsAdvanceSlipFile:
          patch.latricsAdvanceSlipFile !== undefined
            ? patch.latricsAdvanceSlipFile
            : slipName
            ? { name: slipName, size: 'Attached', url: slipUrl }
            : null,
        latricsAdvancePaymentStatus: patch.latricsAdvancePaymentStatus !== undefined ? patch.latricsAdvancePaymentStatus : advanceStatus,
        latricsAdvanceVerificationNotes: patch.latricsAdvanceVerificationNotes !== undefined ? patch.latricsAdvanceVerificationNotes : advanceNotes,
        ...patch,
      };

      const updatedPayload = {
        ...currentPayload,
        mobilisation: mergedMob,
      };

      await projectApi.updateProject(project.id, {
        requirements_payload: updatedPayload,
      });

      await onUpdated();
      setStatusMessage({ type: 'success', text: successText });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update mobilization configuration' });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDateTime = (val?: string | null) => {
    return formatDateTimeDDMMYYYY(val);
  };

  const handleSelectResponsibility = (choice: MobilisationResponsibility) => {
    if (isCompleted || !isClient) return;
    setResponsibility(choice);
    saveMobilisation(
      { responsibility: choice, mobilisationResponsibility: choice },
      `Mobilization responsibility assigned to: ${choice === 'CLIENT' ? 'Client Itself' : 'Latrics Operations'}`
    );
  };

  const handleUploadTicketBill = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const newBill: ClientTicketBillItem = {
        id: `bill-${Date.now()}`,
        name: newDocTitle.trim() || file.name,
        size: `${Math.round(file.size / 1024)} KB`,
        type: file.type || 'document',
        url: dataUrl,
        uploadedAt: new Date().toISOString(),
        uploadedBy: isClient ? 'Client' : 'Operations',
      };
      const updatedList = [...ticketBills, newBill];
      setTicketBills(updatedList);
      setNewDocTitle('');
      setUploadingDoc(false);

      // Auto set status to SUBMITTED if pending
      const nextStatus = ticketStatus === 'APPROVED' ? 'APPROVED' : 'SUBMITTED';
      setTicketStatus(nextStatus);

      await saveMobilisation(
        {
          clientTicketsAndBills: updatedList,
          clientTicketApprovalStatus: nextStatus,
        },
        'Ticket/bill document uploaded and submitted for Operations validation.'
      );
    };
    reader.onerror = () => {
      setUploadingDoc(false);
      setStatusMessage({ type: 'error', text: 'Failed to read file.' });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveTicketBill = async (id: string) => {
    if (isCompleted) return;
    const updatedList = ticketBills.filter((b) => b.id !== id);
    setTicketBills(updatedList);
    const nextStatus = updatedList.length === 0 ? 'PENDING_SUBMISSION' : ticketStatus;
    setTicketStatus(nextStatus);
    await saveMobilisation(
      {
        clientTicketsAndBills: updatedList,
        clientTicketApprovalStatus: nextStatus,
      },
      'Document removed.'
    );
  };

  const handleUploadAdvanceSlip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setSlipUrl(dataUrl);
      setSlipName(file.name);
      await saveMobilisation(
        {
          latricsAdvanceSlipUrl: dataUrl,
          latricsAdvanceSlipName: file.name,
          latricsAdvanceSlipFile: {
            name: file.name,
            size: `${Math.round(file.size / 1024)} KB`,
            url: dataUrl,
          },
        },
        '₹5,000 Advance transaction slip attached.'
      );
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmitAdvanceSlip = async () => {
    if (!utr.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter the transaction reference / UTR number.' });
      return;
    }
    setAdvanceStatus('SUBMITTED');
    await saveMobilisation(
      {
        latricsAdvanceUtr: utr.trim(),
        latricsAdvancePaymentDate: paidAt || new Date().toISOString().split('T')[0],
        latricsAdvancePaidAt: paidAt || new Date().toISOString().split('T')[0],
        latricsAdvancePaymentStatus: 'SUBMITTED',
      },
      '₹5,000 advance transaction slip submitted for Operations verification.'
    );
  };

  // Operations actions
  const handleOpsApproveTickets = async () => {
    setTicketStatus('APPROVED');
    await saveMobilisation(
      {
        clientTicketApprovalStatus: 'APPROVED',
        clientTicketApprovalNotes: ticketNotes,
      },
      'Client tickets and bills validated as genuine and approved. Gate passed.'
    );
  };

  const handleOpsRejectTickets = async () => {
    setTicketStatus('REJECTED');
    await saveMobilisation(
      {
        clientTicketApprovalStatus: 'REJECTED',
        clientTicketApprovalNotes: ticketNotes,
      },
      'Clarification requested on client tickets/bills.'
    );
  };

  const handleOpsVerifyAdvance = async () => {
    setAdvanceStatus('VERIFIED');
    await saveMobilisation(
      {
        latricsAdvancePaymentStatus: 'VERIFIED',
        latricsAdvanceVerificationNotes: advanceNotes,
      },
      '₹5,000 advance payment verified. Gate passed.'
    );
  };

  const handleOpsRejectAdvance = async () => {
    setAdvanceStatus('REJECTED');
    await saveMobilisation(
      {
        latricsAdvancePaymentStatus: 'REJECTED',
        latricsAdvanceVerificationNotes: advanceNotes,
      },
      'Advance deposit transaction slip rejected / discrepancy reported.'
    );
  };

  return (
    <div
      style={{
        border: '1px solid #d4d4d8',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        marginTop: '0.5rem',
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '1px solid #e4e4e7',
          paddingBottom: '0.85rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: '#09090b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={16} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
              Mobilisation Operational Responsibility &amp; Stage Clearance Gate
            </h4>
            <span style={{ fontSize: '0.725rem', color: '#71717a' }}>
              Define travel logistics execution responsibility and clear verified requirements before advancing to Stage 4 (Capturing).
            </span>
          </div>
        </div>

        {/* Gate Status Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isGatePassed ? (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.25rem 0.65rem',
                borderRadius: '4px',
                backgroundColor: '#09090b',
                color: '#ffffff',
                border: '1px solid #09090b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <CheckCircle2 size={13} /> Gate Cleared for Stage 4
            </span>
          ) : (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.25rem 0.65rem',
                borderRadius: '4px',
                backgroundColor: '#f4f4f5',
                color: '#09090b',
                border: '1px solid #d4d4d8',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Lock size={13} /> Stage Gate Locked
            </span>
          )}
        </div>
      </div>

      {/* Status Feedback Banner */}
      {statusMessage && (
        <div
          style={{
            padding: '0.65rem 0.85rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: statusMessage.type === 'success' ? '#f4f4f5' : '#18181b',
            color: statusMessage.type === 'success' ? '#09090b' : '#ffffff',
            border: '1px solid #d4d4d8',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Decision Selection: Latrics Or Client itself? */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.775rem', fontWeight: 800, color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Who will take the responsibility for mobilization?
          </div>
          {isClient ? (
            <span style={{ fontSize: '0.7rem', color: '#52525b', fontWeight: 600 }}>
              * Client Choice: Please choose who manages crew travel &amp; logistics
            </span>
          ) : (
            <span
              style={{
                fontSize: '0.675rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                backgroundColor: responsibility ? '#09090b' : '#f4f4f5',
                color: responsibility ? '#ffffff' : '#52525b',
                border: '1px solid #d4d4d8',
              }}
            >
              {responsibility
                ? `Selected by Client: ${responsibility === 'CLIENT' ? 'Client Itself' : 'Latrics Operations'}`
                : 'Awaiting Client Choice (Latrics cannot edit selection)'}
            </span>
          )}
        </div>

        {/* If Latrics visits and Client has not selected yet */}
        {!isClient && !responsibility && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Clock size={15} color="#09090b" />
            <span>
              <strong>Latrics Standby:</strong> Awaiting the Client to choose mobilization responsibility above. Latrics cannot edit this choice and will proceed once the client selects either option.
            </span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          {/* Card A: Client Itself */}
          <div
            onClick={isClient && !isCompleted ? () => handleSelectResponsibility('CLIENT') : undefined}
            style={{
              border: responsibility === 'CLIENT' ? '2px solid #09090b' : '1px solid #e4e4e7',
              backgroundColor: responsibility === 'CLIENT' ? '#fafafa' : '#ffffff',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              cursor: isClient && !isCompleted ? 'pointer' : 'default',
              opacity: !isClient && responsibility && responsibility !== 'CLIENT' ? 0.6 : 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem',
              position: 'relative',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={16} color="#09090b" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
                  Client Itself
                </span>
              </div>
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: responsibility === 'CLIENT' ? '5px solid #09090b' : '1px solid #d4d4d8',
                  backgroundColor: '#ffffff',
                }}
              />
            </div>
            <p style={{ margin: 0, fontSize: '0.725rem', color: '#52525b', lineHeight: 1.45 }}>
              Client books and provides travel tickets and accommodations directly. Client shares confirmations and genuine bills for Operations verification.
            </p>
          </div>

          {/* Card B: Latrics */}
          <div
            onClick={isClient && !isCompleted ? () => handleSelectResponsibility('LATRICS') : undefined}
            style={{
              border: responsibility === 'LATRICS' ? '2px solid #09090b' : '1px solid #e4e4e7',
              backgroundColor: responsibility === 'LATRICS' ? '#fafafa' : '#ffffff',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              cursor: isClient && !isCompleted ? 'pointer' : 'default',
              opacity: !isClient && responsibility && responsibility !== 'LATRICS' ? 0.6 : 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem',
              position: 'relative',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plane size={16} color="#09090b" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
                  Latrics Operations
                </span>
              </div>
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: responsibility === 'LATRICS' ? '5px solid #09090b' : '1px solid #d4d4d8',
                  backgroundColor: '#ffffff',
                }}
              />
            </div>
            <p style={{ margin: 0, fontSize: '0.725rem', color: '#52525b', lineHeight: 1.45 }}>
              Latrics coordinates and books crew mobilization. Client pays <strong>₹5,000 INR</strong> advance deposit and submits the transaction slip for verification.
            </p>
          </div>
        </div>
      </div>

      {/* ── BRANCH A: Client Direct Responsibility ── */}
      {responsibility === 'CLIENT' && (
        <div
          style={{
            border: '1px solid #e4e4e7',
            borderRadius: '6px',
            backgroundColor: '#fafafa',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Building2 size={15} color="#09090b" />
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#09090b' }}>
                Client Direct Mobilisation Workflow
              </span>
            </div>

            {/* Approval Badge */}
            <div>
              {ticketStatus === 'APPROVED' ? (
                <span
                  style={{
                    fontSize: '0.675rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    border: '1px solid #09090b',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <Check size={12} /> Approved &amp; Validated Genuine by Ops
                </span>
              ) : ticketStatus === 'REJECTED' ? (
                <span
                  style={{
                    fontSize: '0.675rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: '#f4f4f5',
                    color: '#09090b',
                    border: '1px solid #09090b',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <AlertCircle size={12} /> Clarification Requested / Rejected
                </span>
              ) : ticketStatus === 'SUBMITTED' ? (
                <span
                  style={{
                    fontSize: '0.675rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: '#f4f4f5',
                    color: '#52525b',
                    border: '1px solid #d4d4d8',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <Clock size={12} /> Awaiting Operations Review
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '0.675rem',
                    fontWeight: 600,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: '#f4f4f5',
                    color: '#71717a',
                    border: '1px solid #e4e4e7',
                  }}
                >
                  Pending Submission
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              padding: '0.65rem 0.85rem',
              backgroundColor: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: '6px',
              fontSize: '0.725rem',
              color: '#52525b',
              lineHeight: 1.5,
            }}
          >
            <strong>Gating Rule:</strong> Client has chosen to take mobilization responsibility directly.
            Latrics Operations provides a deadline by when all tickets and genuine bill slips must be uploaded.
            After the client provides the required slips and proofs, Operations validates and verifies them before the project can proceed to Stage 4 (Capturing).
          </div>

          {/* Target Share Deadline Picker - Specific Control for Latrics, Display for Client */}
          {isOps && !isCompleted ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.725rem', fontWeight: 700, color: '#09090b' }}>
                Set Upload Deadline for Client Tickets &amp; Bills (Latrics Control):
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  style={{
                    height: '34px',
                    padding: '0 0.65rem',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #d4d4d8',
                    backgroundColor: '#ffffff',
                    color: '#09090b',
                    maxWidth: '260px',
                  }}
                />
                <button
                  type="button"
                  disabled={isSaving || !deadline}
                  onClick={() => saveMobilisation({ clientTicketShareDeadline: deadline }, 'Upload deadline saved and issued to client.')}
                  style={{
                    height: '34px',
                    padding: '0 0.85rem',
                    fontSize: '0.725rem',
                    fontWeight: 600,
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    border: '1px solid #09090b',
                    borderRadius: '6px',
                    cursor: !deadline ? 'not-allowed' : 'pointer',
                  }}
                >
                  Save / Issue Deadline
                </button>
                {deadline && (
                  <span style={{ fontSize: '0.725rem', color: '#52525b' }}>
                    Active Deadline: <strong>{formatDateTime(deadline)}</strong>
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '0.75rem 0.95rem',
                backgroundColor: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
              }}
            >
              <Clock size={16} color="#09090b" />
              <div style={{ fontSize: '0.775rem', color: '#09090b' }}>
                {deadline ? (
                  <>
                    <span style={{ color: '#71717a' }}>Upload Deadline (Set by Latrics Operations): </span>
                    <strong style={{ color: '#09090b' }}>{formatDateTime(deadline)}</strong>
                    <div style={{ fontSize: '0.7rem', color: '#71717a', marginTop: '0.15rem' }}>
                      Please provide all flight/train tickets and genuine accommodation bills on or before this deadline.
                    </div>
                  </>
                ) : (
                  <div>
                    <strong style={{ color: '#09090b' }}>Awaiting Deadline from Latrics Operations</strong>
                    <div style={{ fontSize: '0.7rem', color: '#71717a', marginTop: '0.15rem' }}>
                      Latrics Operations will issue a specific deadline by when tickets and bill slips must be uploaded to the portal.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Document Upload Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#09090b' }}>
              Shared Travel Tickets &amp; Expense Bills:
            </div>

            {/* List */}
            {ticketBills.length === 0 ? (
              isOps ? (
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                  }}
                >
                  <Clock size={16} color="#09090b" />
                  <div>
                    <div style={{ fontSize: '0.775rem', fontWeight: 700, color: '#09090b' }}>
                      Waiting for Client to Upload Tickets &amp; Bills
                    </div>
                    <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.15rem' }}>
                      {deadline
                        ? `Client must upload travel tickets and genuine bill slips on or before the deadline (${formatDateTime(deadline)}). Verification controls will activate once client uploads documents.`
                        : 'Please set the deadline above. Once client uploads tickets and bills, Latrics will verify them here.'}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: '1rem',
                    border: '1px dashed #d4d4d8',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    textAlign: 'center',
                    fontSize: '0.725rem',
                    color: '#71717a',
                  }}
                >
                  No travel tickets or bills uploaded yet. Upload flight/train tickets, boarding passes, or accommodation confirmations.
                </div>
              )
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {ticketBills.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e4e4e7',
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden' }}>
                      <FileText size={14} color="#09090b" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {b.name}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      {b.url && (
                        <a
                          href={b.url}
                          download={b.name}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: '#09090b',
                            textDecoration: 'none',
                            padding: '0.2rem 0.45rem',
                            border: '1px solid #d4d4d8',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          <Eye size={11} /> View
                        </a>
                      )}
                      {isClient && !isCompleted && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTicketBill(b.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#71717a',
                            cursor: 'pointer',
                            padding: '0.2rem',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Controls - Client Only */}
            {isClient && !isCompleted && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Document description (e.g. Indigo Return Ticket PDF)"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  style={{
                    height: '32px',
                    padding: '0 0.65rem',
                    fontSize: '0.725rem',
                    borderRadius: '6px',
                    border: '1px solid #d4d4d8',
                    backgroundColor: '#ffffff',
                    flex: '1 1 220px',
                  }}
                />
                <label
                  style={{
                    height: '32px',
                    padding: '0 0.85rem',
                    fontSize: '0.725rem',
                    fontWeight: 600,
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    borderRadius: '6px',
                    cursor: uploadingDoc ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  {uploadingDoc ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  <span>Upload Ticket / Bill</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    disabled={uploadingDoc}
                    onChange={handleUploadTicketBill}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Operations Validation & Approval Actions */}
          {isOps && !isCompleted && (
            <div
              style={{
                border: '1px solid #09090b',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Operations Ticket Validation Action
                </span>
                <span style={{ fontSize: '0.675rem', fontWeight: 600, color: '#71717a' }}>
                  {ticketBills.length > 0 ? `${ticketBills.length} Document(s) Ready for Review` : 'Awaiting Client Uploads'}
                </span>
              </div>

              {ticketBills.length === 0 && (
                <div style={{ fontSize: '0.725rem', color: '#71717a', fontStyle: 'italic' }}>
                  * Operations cannot approve until the client uploads the required travel tickets and genuine bill proofs.
                </div>
              )}

              <input
                type="text"
                placeholder="Validation notes or clarification instructions for client..."
                value={ticketNotes}
                disabled={ticketBills.length === 0}
                onChange={(e) => setTicketNotes(e.target.value)}
                style={{
                  height: '32px',
                  padding: '0 0.65rem',
                  fontSize: '0.725rem',
                  borderRadius: '4px',
                  border: '1px solid #d4d4d8',
                  backgroundColor: ticketBills.length === 0 ? '#f4f4f5' : '#ffffff',
                }}
              />

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={isSaving || ticketBills.length === 0}
                  onClick={handleOpsRejectTickets}
                  style={{
                    height: '32px',
                    padding: '0 0.85rem',
                    fontSize: '0.725rem',
                    fontWeight: 600,
                    backgroundColor: '#ffffff',
                    color: '#09090b',
                    border: '1px solid #d4d4d8',
                    borderRadius: '6px',
                    cursor: ticketBills.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: ticketBills.length === 0 ? 0.6 : 1,
                  }}
                >
                  Request Clarification / Reject
                </button>
                <button
                  type="button"
                  disabled={isSaving || ticketBills.length === 0}
                  onClick={handleOpsApproveTickets}
                  style={{
                    height: '32px',
                    padding: '0 1rem',
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    border: '1px solid #09090b',
                    borderRadius: '6px',
                    cursor: ticketBills.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: ticketBills.length === 0 ? 0.6 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Check size={13} /> Approve &amp; Validate as Genuine
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BRANCH B: Latrics Managed Responsibility ── */}
      {responsibility === 'LATRICS' && (
        <div
          style={{
            border: '1px solid #e4e4e7',
            borderRadius: '6px',
            backgroundColor: '#fafafa',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Plane size={15} color="#09090b" />
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#09090b' }}>
                Latrics Mobilisation &amp; ₹5,000 Advance Verification Workflow
              </span>
            </div>

            {/* Advance Status Badge */}
            <div>
              {advanceStatus === 'VERIFIED' ? (
                <span
                  style={{
                    fontSize: '0.675rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    border: '1px solid #09090b',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <Check size={12} /> Advance Verified by Operations
                </span>
              ) : advanceStatus === 'REJECTED' ? (
                <span
                  style={{
                    fontSize: '0.675rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: '#f4f4f5',
                    color: '#09090b',
                    border: '1px solid #09090b',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <AlertCircle size={12} /> Slip Rejected / Discrepancy
                </span>
              ) : advanceStatus === 'SUBMITTED' ? (
                <span
                  style={{
                    fontSize: '0.675rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: '#f4f4f5',
                    color: '#52525b',
                    border: '1px solid #d4d4d8',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <Clock size={12} /> Slip Submitted — Awaiting Ops Verification
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '0.675rem',
                    fontWeight: 600,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: '#f4f4f5',
                    color: '#71717a',
                    border: '1px solid #e4e4e7',
                  }}
                >
                  ₹5,000 Advance Pending from Client
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              padding: '0.65rem 0.85rem',
              backgroundColor: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: '6px',
              fontSize: '0.725rem',
              color: '#52525b',
              lineHeight: 1.5,
            }}
          >
            <strong>Gating Rule:</strong> Client has chosen Latrics Operations to take mobilization responsibility.
            Client must pay <strong>₹5,000 INR</strong> in advance and upload the transaction proof slip with reference information.
            Latrics will wait until the client submits the slip, then verify it. Once verified by Ops, the project will proceed to Stage 4 (Capturing).
          </div>

          {/* Bank Transfer Account Box */}
          <div
            style={{
              border: '1px solid #d4d4d8',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              padding: '0.85rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.65rem',
            }}
          >
            <div>
              <span style={{ fontSize: '0.65rem', color: '#71717a', display: 'block' }}>Mandatory Mobilisation Advance:</span>
              <strong style={{ fontSize: '0.9rem', color: '#09090b', fontFamily: 'monospace' }}>₹5,000 INR</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: '#71717a', display: 'block' }}>Beneficiary Account:</span>
              <strong style={{ fontSize: '0.75rem', color: '#09090b' }}>LATRICS AEROSTAKE OPERATIONAL A/C</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: '#71717a', display: 'block' }}>Bank / Account No:</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b', fontFamily: 'monospace' }}>HDFC Bank / 50200088991122</span>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: '#71717a', display: 'block' }}>IFSC / UPI VPA:</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b', fontFamily: 'monospace' }}>HDFC0001234 / latrics.ops@hdfcbank</span>
            </div>
          </div>

          {/* Latrics Waiting Banner (shown only to Latrics when Client hasn't submitted yet) */}
          {!isClient && !slipUrl && !utr && advanceStatus === 'PENDING_PAYMENT' && (
            <div
              style={{
                padding: '0.85rem 1rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
              }}
            >
              <Clock size={16} color="#09090b" />
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                  Waiting for Client ₹5,000 Advance Submission
                </div>
                <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.15rem' }}>
                  Client has chosen Latrics Operations to manage mobilization. Latrics is on standby waiting for the client to pay the ₹5,000 INR advance and submit their transaction slip &amp; UTR reference. You will be able to verify the slip as soon as it is uploaded.
                </div>
              </div>
            </div>
          )}

          {/* Latrics View of Client's Submitted Information */}
          {!isClient && (slipUrl || utr) && (
            <div
              style={{
                border: '1px solid #e4e4e7',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Client Submitted Transaction Details:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem', fontSize: '0.775rem' }}>
                <div>
                  <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'block' }}>Bank UTR / Transaction Ref:</span>
                  <strong style={{ fontFamily: 'monospace', color: '#09090b' }}>{utr || '—'}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'block' }}>Payment Date:</span>
                  <strong style={{ color: '#09090b' }}>{paidAt || '—'}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'block' }}>Transaction Slip:</span>
                  {slipUrl ? (
                    <a
                      href={slipUrl}
                      download={slipName || 'Transaction_Slip'}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: '#09090b',
                        fontWeight: 600,
                        textDecoration: 'underline',
                        marginTop: '0.15rem',
                      }}
                    >
                      <Paperclip size={13} /> {slipName || 'View Uploaded Slip'}
                    </a>
                  ) : (
                    <span style={{ color: '#71717a' }}>No slip file attached</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Client Transaction Slip Submission Form - Only for Client */}
          {isClient && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#09090b' }}>
                Transaction Slip &amp; Reference Submission:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div>
                  <label style={{ fontSize: '0.675rem', fontWeight: 600, color: '#52525b', display: 'block', marginBottom: '0.2rem' }}>
                    Bank UTR / Transaction Reference ID:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR123456789012"
                    value={utr}
                    disabled={isCompleted || advanceStatus === 'VERIFIED'}
                    onChange={(e) => setUtr(e.target.value)}
                    style={{
                      width: '100%',
                      height: '32px',
                      padding: '0 0.65rem',
                      fontSize: '0.725rem',
                      borderRadius: '6px',
                      border: '1px solid #d4d4d8',
                      backgroundColor: '#ffffff',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.675rem', fontWeight: 600, color: '#52525b', display: 'block', marginBottom: '0.2rem' }}>
                    Payment Date:
                  </label>
                  <input
                    type="date"
                    value={paidAt}
                    disabled={isCompleted || advanceStatus === 'VERIFIED'}
                    onChange={(e) => setPaidAt(e.target.value)}
                    style={{
                      width: '100%',
                      height: '32px',
                      padding: '0 0.65rem',
                      fontSize: '0.725rem',
                      borderRadius: '6px',
                      border: '1px solid #d4d4d8',
                      backgroundColor: '#ffffff',
                    }}
                  />
                </div>
              </div>

              {/* Slip Attachment */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                {slipName ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.35rem 0.65rem',
                      backgroundColor: '#ffffff',
                      border: '1px solid #d4d4d8',
                      borderRadius: '6px',
                      fontSize: '0.725rem',
                      fontWeight: 600,
                    }}
                  >
                    <Paperclip size={13} />
                    <span>{slipName}</span>
                    {slipUrl && (
                      <a
                        href={slipUrl}
                        download={slipName}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#09090b', textDecoration: 'underline', marginLeft: '0.35rem' }}
                      >
                        View
                      </a>
                    )}
                    {!isCompleted && advanceStatus !== 'VERIFIED' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSlipUrl('');
                          setSlipName('');
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a' }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ) : (
                  <label
                    style={{
                      height: '32px',
                      padding: '0 0.85rem',
                      fontSize: '0.725rem',
                      fontWeight: 600,
                      backgroundColor: '#ffffff',
                      color: '#09090b',
                      border: '1px solid #d4d4d8',
                      borderRadius: '6px',
                      cursor: isCompleted || advanceStatus === 'VERIFIED' ? 'default' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <Upload size={13} />
                    <span>Attach Transaction Slip / Receipt</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      disabled={isCompleted || advanceStatus === 'VERIFIED'}
                      onChange={handleUploadAdvanceSlip}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}

                {!isCompleted && advanceStatus !== 'VERIFIED' && (
                  <button
                    type="button"
                    disabled={isSaving || !utr.trim()}
                    onClick={handleSubmitAdvanceSlip}
                    style={{
                      height: '32px',
                      padding: '0 1rem',
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      backgroundColor: '#09090b',
                      color: '#ffffff',
                      border: '1px solid #09090b',
                      borderRadius: '6px',
                      cursor: !utr.trim() ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    Submit Slip for Verification
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Operations Verification Action Box - Only for Latrics Ops */}
          {isOps && !isCompleted && (
            <div
              style={{
                border: '1px solid #09090b',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Operations Advance Verification Action
                </span>
                <span style={{ fontSize: '0.675rem', fontWeight: 600, color: '#71717a' }}>
                  {slipUrl || utr ? 'Client Proof Received — Ready to Verify' : 'Waiting for Client Proof'}
                </span>
              </div>

              {(!slipUrl && !utr) && (
                <div style={{ fontSize: '0.725rem', color: '#71717a', fontStyle: 'italic' }}>
                  * Operations cannot verify until the client submits their ₹5,000 transaction slip and UTR details.
                </div>
              )}

              <input
                type="text"
                placeholder="Verification remarks or rejection reason..."
                value={advanceNotes}
                disabled={!slipUrl && !utr}
                onChange={(e) => setAdvanceNotes(e.target.value)}
                style={{
                  height: '32px',
                  padding: '0 0.65rem',
                  fontSize: '0.725rem',
                  borderRadius: '4px',
                  border: '1px solid #d4d4d8',
                  backgroundColor: !slipUrl && !utr ? '#f4f4f5' : '#ffffff',
                }}
              />

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={isSaving || (!slipUrl && !utr)}
                  onClick={handleOpsRejectAdvance}
                  style={{
                    height: '32px',
                    padding: '0 0.85rem',
                    fontSize: '0.725rem',
                    fontWeight: 600,
                    backgroundColor: '#ffffff',
                    color: '#09090b',
                    border: '1px solid #d4d4d8',
                    borderRadius: '6px',
                    cursor: !slipUrl && !utr ? 'not-allowed' : 'pointer',
                    opacity: !slipUrl && !utr ? 0.6 : 1,
                  }}
                >
                  Reject Slip / Report Discrepancy
                </button>
                <button
                  type="button"
                  disabled={isSaving || (!slipUrl && !utr)}
                  onClick={handleOpsVerifyAdvance}
                  style={{
                    height: '32px',
                    padding: '0 1rem',
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    border: '1px solid #09090b',
                    borderRadius: '6px',
                    cursor: !slipUrl && !utr ? 'not-allowed' : 'pointer',
                    opacity: !slipUrl && !utr ? 0.6 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Check size={13} /> Verify &amp; Confirm ₹5,000 Advance
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
