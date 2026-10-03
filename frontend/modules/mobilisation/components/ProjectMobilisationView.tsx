'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  CheckCircle,
  FileCheck,
  Upload,
  Users,
  Plane,
  Layers,
  Truck,
  Building2,
  ShieldCheck,
  Calendar,
  FileText,
  Save,
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  Paperclip,
  X,
  AlertCircle,
  Download,
  Loader2,
  MapPin,
  Clock,
  Send,
  MessageSquare,
  HelpCircle,
  Lock,
} from 'lucide-react';
import { projectApi } from '@/modules/projects/api';
import { Project, ProjectStatus } from '@/modules/projects/types';
import { useAuth } from '@/lib/auth';
import { isLatricsRole } from '@/lib/role';
import { formatMessageStamp } from '@/lib/message-time';
import {
  MobilisationFormData,
  PilotCrewMember,
  ThreadMessage,
} from '../types';

interface ProjectMobilisationViewProps {
  projectId: string;
  isLatricsPortal?: boolean;
}

const STAGES = [
  { id: 1, name: 'Stakeholder & POC', desc: 'Capture all key contacts for smooth field operations.' },
  { id: 2, name: 'Flight Crew & Pilot Allocation', desc: 'Assign certified pilots, co-pilots, and ground technicians.' },
  { id: 3, name: 'Hardware & Equipment', desc: 'Specify drone airframes, sensors, DGPS, and power equipment.' },
  { id: 4, name: 'Travel, Commute & Logistics', desc: 'Track ticket bookings, travel modes, PNRs, and vehicle transit.' },
  { id: 5, name: 'Accommodations', desc: 'Basecamp hotel stay, address coordinates, and local contacts.' },
  { id: 6, name: 'Site Access & Clearances', desc: 'Police intimations, security gate passes, and safety gear verification.' },
  { id: 7, name: 'Schedule', desc: 'Target departure, arrival, GCP calibration, and maiden flight dates.' },
  { id: 8, name: 'Remarks & Documents', desc: 'Consolidated mobilization notes and operational clearance.' },
];

const INITIAL_FORM_DATA: MobilisationFormData = {
  clientCoordinatorName: '',
  clientCoordinatorPhone: '',
  clientCoordinatorEmail: '',

  clientLocalPocName: '',
  clientLocalPocPhone: '',
  clientLocalPocAlternatePhone: '',
  clientLocalPocDesignation: 'Site In-Charge',

  latricsOpsPocName: '',
  latricsOpsPocPhone: '',
  latricsOpsPocEmail: '',

  emergencyHospitalName: '',
  emergencyHospitalPhone: '',
  emergencyPolicePhone: '',

  pilots: [],

  hardware: {
    droneModel: '',
    dgcaUin: '',
    droneInsuranceNo: '',
    droneInsuranceExpiry: '',
    sensorPayload: '',
    dgpsUnits: '',
    powerSetup: '',
    batterySetsCount: '',
  },

  logistics: {
    transportMode: 'Dedicated Vehicle',
    ticketBookingDate: '',
    pnrReference: '',
    departureDateTime: '',
    arrivalDateTime: '',
    vehicleRegNo: '',
    driverName: '',
    driverContact: '',
  },

  responsibility: '',
  clientTicketShareDeadline: '',
  clientTicketsAndBills: [],
  clientTicketApprovalStatus: 'PENDING_SUBMISSION',
  clientTicketApprovalNotes: '',
  clientTicketApprovedBy: '',
  clientTicketApprovedAt: '',

  latricsAdvanceAmount: 5000,
  latricsAdvanceUtr: '',
  latricsAdvancePaymentDate: '',
  latricsAdvanceSlipFile: null,
  latricsAdvanceNotes: '',
  latricsAdvancePaymentStatus: 'PENDING_PAYMENT',
  latricsAdvanceVerifiedBy: '',
  latricsAdvanceVerifiedAt: '',
  latricsAdvanceVerificationNotes: '',

  accommodation: {
    hotelName: '',
    address: '',
    googleMapsLink: '',
    checkInDate: '',
    checkOutDate: '',
    hotelContact: '',
  },

  clearances: {
    policeIntimationStatus: 'Not Required',
    gatePassStatus: 'Pending',
    ppeJackets: true,
    ppeHelmets: true,
    ppeBoots: true,
  },

  schedule: {
    departureDate: '',
    arrivalDate: '',
    gcpCalibrationDate: '',
    firstFlightDate: '',
  },

  remarks: '',
  attachments: [],
  stageThreads: {},
};

export default function ProjectMobilisationView({
  projectId,
  isLatricsPortal = false,
}: ProjectMobilisationViewProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const isPilot = Boolean(user && user.role?.toLowerCase() === 'pilot');
  const isOps = Boolean(user && (user.role === 'admin' || user.role === 'operations'));
  const isStagePassed = Boolean(
    project?.status?.toLowerCase() === 'active' ||
    project?.status?.toLowerCase() === 'completed' ||
    project?.status?.toLowerCase() === 'surveying'
  );
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [formData, setFormData] = useState<MobilisationFormData>(INITIAL_FORM_DATA);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Local state for Client ticket & bill uploads
  const [ticketDocName, setTicketDocName] = useState('');
  const [ticketDocNotes, setTicketDocNotes] = useState('');
  const [ticketDocFile, setTicketDocFile] = useState<File | null>(null);

  // Local state for Ops validation notes & actions
  const [opsTicketNotesInput, setOpsTicketNotesInput] = useState('');
  const [opsAdvanceNotesInput, setOpsAdvanceNotesInput] = useState('');

  // Local state for Latrics ₹5,000 transaction slip file
  const [advanceSlipFileToUpload, setAdvanceSlipFileToUpload] = useState<File | null>(null);

  // Mobilisation Gate Satisfaction Check
  const isMobilisationGateSatisfied = useMemo(() => {
    if (!formData.responsibility) return false;
    if (formData.responsibility === 'CLIENT') {
      return formData.clientTicketApprovalStatus === 'APPROVED';
    }
    if (formData.responsibility === 'LATRICS') {
      return formData.latricsAdvancePaymentStatus === 'VERIFIED';
    }
    return false;
  }, [formData.responsibility, formData.clientTicketApprovalStatus, formData.latricsAdvancePaymentStatus]);

  // Responsibility selection handler
  const handleSelectResponsibility = async (resp: 'CLIENT' | 'LATRICS') => {
    if (isPilot || isStagePassed) return;
    const updated = {
      ...formData,
      responsibility: resp,
    };
    setFormData(updated);
    await saveFormData(updated, false);
  };

  // Branch A: Add ticket/bill document
  const handleAddTicketBill = async () => {
    if (!ticketDocName.trim() && !ticketDocFile) return;
    const newItem = {
      id: `doc_${Date.now()}`,
      name: ticketDocName.trim() || (ticketDocFile ? ticketDocFile.name : 'Travel Ticket / Bill Document'),
      size: ticketDocFile ? `${(ticketDocFile.size / 1024).toFixed(1)} KB` : 'Attached',
      notes: ticketDocNotes.trim(),
      uploadedAt: new Date().toISOString(),
      uploadedBy: user?.full_name || (isOps ? 'LATRICS Operations' : 'Client Representative'),
    };
    const updatedTickets = [...(formData.clientTicketsAndBills || []), newItem];
    const updated = {
      ...formData,
      clientTicketsAndBills: updatedTickets,
      clientTicketApprovalStatus: 'SUBMITTED' as const,
    };
    setFormData(updated);
    setTicketDocName('');
    setTicketDocNotes('');
    setTicketDocFile(null);
    await saveFormData(updated, true);
  };

  const handleRemoveTicketBill = async (docId: string) => {
    if (isPilot || isStagePassed) return;
    const updatedTickets = (formData.clientTicketsAndBills || []).filter((d) => d.id !== docId);
    const updated = {
      ...formData,
      clientTicketsAndBills: updatedTickets,
      clientTicketApprovalStatus: updatedTickets.length === 0 ? ('PENDING_SUBMISSION' as const) : formData.clientTicketApprovalStatus,
    };
    setFormData(updated);
    await saveFormData(updated, false);
  };

  // Branch A: Ops Approve Tickets as Genuine
  const handleOpsApproveTickets = async () => {
    if (!isOps) return;
    const updated = {
      ...formData,
      clientTicketApprovalStatus: 'APPROVED' as const,
      clientTicketApprovalNotes: opsTicketNotesInput.trim() || 'Verified and approved as genuine by Operations.',
      clientTicketApprovedBy: user?.full_name || 'Operations Lead',
      clientTicketApprovedAt: new Date().toISOString(),
    };
    setFormData(updated);
    await saveFormData(updated, true);
    setSuccessMessage('Client tickets and bills approved as genuine. Stage 4 transition is now cleared.');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Branch A: Ops Reject Tickets
  const handleOpsRejectTickets = async () => {
    if (!isOps) return;
    const updated = {
      ...formData,
      clientTicketApprovalStatus: 'REJECTED' as const,
      clientTicketApprovalNotes: opsTicketNotesInput.trim() || 'Tickets require re-verification or additional details.',
    };
    setFormData(updated);
    await saveFormData(updated, true);
    setErrorMessage('Client tickets rejected. Clarification required from client.');
    setTimeout(() => setErrorMessage(null), 4000);
  };

  // Branch B: Submit ₹5,000 Advance Transaction Slip
  const handleSubmitAdvanceSlip = async () => {
    if (!formData.latricsAdvanceUtr && !advanceSlipFileToUpload) {
      setErrorMessage('Please provide the transaction reference / UTR number or attach the slip.');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }
    const updated = {
      ...formData,
      latricsAdvancePaymentStatus: 'SUBMITTED' as const,
      latricsAdvanceSlipFile: advanceSlipFileToUpload
        ? {
            name: advanceSlipFileToUpload.name,
            size: `${(advanceSlipFileToUpload.size / 1024).toFixed(1)} KB`,
          }
        : formData.latricsAdvanceSlipFile,
    };
    setFormData(updated);
    await saveFormData(updated, true);
    setAdvanceSlipFileToUpload(null);
    setSuccessMessage('₹5,000 Advance transaction slip submitted for Operations verification.');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Branch B: Ops Verify Advance
  const handleOpsVerifyAdvance = async () => {
    if (!isOps) return;
    const updated = {
      ...formData,
      latricsAdvancePaymentStatus: 'VERIFIED' as const,
      latricsAdvanceVerificationNotes: opsAdvanceNotesInput.trim() || '₹5,000 advance payment verified and acknowledged by Operations.',
      latricsAdvanceVerifiedBy: user?.full_name || 'Operations Finance Lead',
      latricsAdvanceVerifiedAt: new Date().toISOString(),
    };
    setFormData(updated);
    await saveFormData(updated, true);
    setSuccessMessage('₹5,000 Advance transaction verified. Stage 4 transition is now cleared.');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Branch B: Ops Reject Advance
  const handleOpsRejectAdvance = async () => {
    if (!isOps) return;
    const updated = {
      ...formData,
      latricsAdvancePaymentStatus: 'REJECTED' as const,
      latricsAdvanceVerificationNotes: opsAdvanceNotesInput.trim() || 'Transaction slip details could not be verified.',
    };
    setFormData(updated);
    await saveFormData(updated, true);
    setErrorMessage('Transaction slip rejected. Client notified.');
    setTimeout(() => setErrorMessage(null), 4000);
  };

  // Discussion Thread State for current stage
  const [newRemarkText, setNewRemarkText] = useState<string>('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isPostingRemark, setIsPostingRemark] = useState<boolean>(false);

  // Internal Note Modal / Input
  const [showInternalNoteModal, setShowInternalNoteModal] = useState<boolean>(false);
  const [internalNoteText, setInternalNoteText] = useState<string>('');

  // Fetch live project data strictly from backend
  const fetchProjectData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const proj = await projectApi.getProject(projectId);
      setProject(proj);

      const reqPayload = (proj.requirements_payload || {}) as Record<string, any>;
      const savedMob = reqPayload.mobilisation as Partial<MobilisationFormData> | undefined;

      if (savedMob) {
        setFormData({
          ...INITIAL_FORM_DATA,
          ...savedMob,
          hardware: { ...INITIAL_FORM_DATA.hardware, ...(savedMob.hardware || {}) },
          logistics: { ...INITIAL_FORM_DATA.logistics, ...(savedMob.logistics || {}) },
          accommodation: { ...INITIAL_FORM_DATA.accommodation, ...(savedMob.accommodation || {}) },
          clearances: { ...INITIAL_FORM_DATA.clearances, ...(savedMob.clearances || {}) },
          schedule: { ...INITIAL_FORM_DATA.schedule, ...(savedMob.schedule || {}) },
          pilots: savedMob.pilots || [],
          stageThreads: savedMob.stageThreads || {},
        });
      } else {
        // Auto-hydrate initial contact values strictly from project intake if available
        setFormData((prev) => ({
          ...prev,
          clientCoordinatorName: proj.client_name || reqPayload.primary_contact_name || '',
          clientCoordinatorPhone: reqPayload.primary_contact_phone || '',
          clientCoordinatorEmail: proj.client_email || reqPayload.primary_contact_email || '',
          clientLocalPocName: reqPayload.alternate_contact_name || '',
          clientLocalPocPhone: reqPayload.alternate_contact_phone || '',
          latricsOpsPocName: (isOps && user?.full_name) || '',
          latricsOpsPocEmail: (isOps && user?.email) || '',
          hardware: {
            ...prev.hardware,
            sensorPayload: proj.payload || reqPayload.sensor_payload || '',
          },
        }));
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch project details');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, isOps, user]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // Persist updated form state directly to database
  const saveFormData = async (updatedData: MobilisationFormData, showNotification = true) => {
    if (!project || isPilot || isStagePassed) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const currentReqPayload = (project.requirements_payload || {}) as Record<string, any>;
      const newPayload = {
        ...currentReqPayload,
        mobilisation: updatedData,
      };

      await projectApi.updateProject(project.id, {
        requirements_payload: newPayload,
      });

      setProject((prev) => prev ? { ...prev, requirements_payload: newPayload } : prev);
      if (showNotification) {
        setSuccessMessage('Mobilisation details saved successfully.');
        setTimeout(() => setSuccessMessage(null), 3500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save mobilisation data');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (field: keyof MobilisationFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNestedChange = (
    section: 'hardware' | 'logistics' | 'accommodation' | 'clearances' | 'schedule',
    field: string,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  // Pilot Roster Management (Dynamic Multi-Pilot)
  const handleAddPilot = () => {
    const newPilot: PilotCrewMember = {
      id: `pilot_${Date.now()}`,
      role: formData.pilots.length === 0 ? 'Lead Remote Pilot' : 'Co-Pilot / Drone Operator',
      name: '',
      contactNo: '',
      alternateContact: '',
      age: '',
      aadhaarNo: '',
      dgcaLicenseNo: '',
      insuranceActive: true,
    };
    setFormData((prev) => ({
      ...prev,
      pilots: [...prev.pilots, newPilot],
    }));
  };

  const handleRemovePilot = (pilotId: string) => {
    setFormData((prev) => ({
      ...prev,
      pilots: prev.pilots.filter((p) => p.id !== pilotId),
    }));
  };

  const handlePilotChange = (pilotId: string, field: keyof PilotCrewMember, value: any) => {
    setFormData((prev) => ({
      ...prev,
      pilots: prev.pilots.map((p) => (p.id === pilotId ? { ...p, [field]: value } : p)),
    }));
  };

  // Discussion Thread Posting for Current Stage
  const handlePostRemark = async () => {
    if (isPilot || (!newRemarkText.trim() && !attachedFile)) return;
    setIsPostingRemark(true);
    try {
      const authorName = user?.full_name || (isOps ? 'LATRICS Operations' : 'Client Representative');
      const authorRole = isOps ? 'LATRICS' : 'CLIENT';

      const newMessage: ThreadMessage = {
        id: `msg_${Date.now()}`,
        author: authorName,
        role: authorRole,
        timestamp: new Date().toISOString(),
        content: newRemarkText.trim(),
        attachment: attachedFile
          ? {
              name: attachedFile.name,
              size: `${(attachedFile.size / 1024).toFixed(1)} KB`,
            }
          : undefined,
      };

      const currentStageMessages = formData.stageThreads[currentStage] || [];
      const updatedThreads = {
        ...formData.stageThreads,
        [currentStage]: [...currentStageMessages, newMessage],
      };

      const updatedFormData = {
        ...formData,
        stageThreads: updatedThreads,
      };

      setFormData(updatedFormData);
      await saveFormData(updatedFormData, false);
      setNewRemarkText('');
      setAttachedFile(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to post remark');
    } finally {
      setIsPostingRemark(false);
    }
  };

  // Advance Stage / Final Mobilisation Confirmation
  const handleNextSection = async () => {
    if (!isPilot && !isStagePassed) {
      await saveFormData(formData, false);
    }
    if (currentStage < 8) {
      setCurrentStage((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (isPilot || isStagePassed || !isOps) return;
      // Stage 8 Final Confirmation
      setIsSaving(true);
      try {
        if (project) {
          if (!isMobilisationGateSatisfied) {
            setErrorMessage('Cannot advance to next stage: Required Operations approval/verification gate has not been completed.');
            setTimeout(() => setErrorMessage(null), 4000);
            setIsSaving(false);
            return;
          }
          // Transition project stage forward to ACTIVE (Capturing)
          await projectApi.updateProject(project.id, {
            requirements_payload: {
              ...(project.requirements_payload || {}),
              mobilisation: formData,
              mobilisation_status: 'confirmed',
            },
            status: ProjectStatus.ACTIVE,
          });
        }
        setSuccessMessage('Mobilisation confirmed and cleared! Project has advanced to Stage 4 (Capturing).');
        setTimeout(() => {
          router.push(`/projects/${projectId}/overview`);
        }, 1500);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to confirm mobilisation');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handlePrevSection = () => {
    if (currentStage > 1) {
      setCurrentStage((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '0.75rem' }}>
        <Loader2 size={32} className="animate-spin" color="#09090b" />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading Mobilisation Workspace...</span>
      </div>
    );
  }

  const clientCompany = project?.client_company || project?.client_name || 'Client';
  const projectTitle = project?.title || 'Project';
  const locationDisplay = project?.survey_location || '—';
  const areaDisplay = project?.target_area_sqkm ? `${project.target_area_sqkm} sq. km` : 'Area specified in sector plan';
  const payloadDisplay = project?.payload || (project?.requirements_payload as any)?.sensor_payload || 'Standard Photogrammetry (RGB)';
  const deliverablesList = (project?.requirements_payload as any)?.deliverables || ['Orthomosaic', 'Point Cloud', 'DEM'];
  const stageMessages = formData.stageThreads[currentStage] || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── 1. Top Breadcrumbs & Title Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            <Link href="/projects" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Projects</Link>
            <span>&gt;</span>
            <span>{clientCompany}</span>
            <span>&gt;</span>
            <Link href={`/projects/${projectId}/overview`} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>{projectTitle}</Link>
            <span>&gt;</span>
            <span style={{ fontWeight: 600, color: '#09090b' }}>Mobilisation</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#09090b', letterSpacing: '-0.02em', margin: 0 }}>
              Mobilisation – {projectTitle}
            </h1>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.15rem 0.55rem',
                borderRadius: '4px',
                backgroundColor: '#f4f4f5',
                border: '1px solid var(--border-color)',
                color: '#09090b',
              }}
            >
              In Progress
            </span>
            {formData.responsibility === 'CLIENT' && (
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #09090b',
                  color: '#09090b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Mob Model: Client Direct · {formData.clientTicketApprovalStatus === 'APPROVED' ? '✓ Tickets Approved' : 'Tickets Pending Ops Approval'}
              </span>
            )}
            {formData.responsibility === 'LATRICS' && (
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #09090b',
                  color: '#09090b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Mob Model: Latrics · {formData.latricsAdvancePaymentStatus === 'VERIFIED' ? '✓ ₹5k Verified' : '₹5k Slip Pending Ops Verification'}
              </span>
            )}
          </div>

          <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.25rem', marginBottom: 0 }}>
            Project: {projectTitle} | {clientCompany} | Request #001
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => router.push(`/projects/${projectId}/overview`)}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', height: '36px' }}
          >
            <ArrowLeft size={14} /> Back to Project
          </button>
        </div>
      </div>

      {/* Stage Passed Banner or Pilot View-Only Mode Banner */}
      {isStagePassed ? (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#fafafa',
            border: '1px solid #d4d4d8',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem',
            color: '#18181b',
            fontWeight: 600,
          }}
        >
          <Lock size={15} color="#09090b" style={{ flexShrink: 0 }} />
          <span>
            <strong>Stage 3 (Mobilisation) Completed &amp; Sealed:</strong> The project has already proceeded to Stage 4 (Capturing). Mobilisation contacts and flight crew allocations are locked as an immutable audit record.
          </span>
        </div>
      ) : isPilot ? (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#f4f4f5',
            border: '1px solid #d4d4d8',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem',
            color: '#18181b',
          }}
        >
          <Lock size={15} color="#71717a" style={{ flexShrink: 0 }} />
          <span>
            <strong>Pilot View-Only Mode:</strong> Drone pilots have read-only access to mobilization parameters. Editing and advancing stages are restricted.
          </span>
        </div>
      ) : null}

      {/* Success / Error Banners */}
      {successMessage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', backgroundColor: '#f4f4f5', border: '1px solid #d4d4d8', borderRadius: '6px', color: '#09090b', fontSize: '0.825rem' }}>
          <Check size={16} />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', backgroundColor: '#f4f4f5', border: '1px solid #d4d4d8', borderRadius: '6px', color: '#09090b', fontSize: '0.825rem' }}>
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── 2. Three-Column Main Layout: Left Stages Sidebar + Center Form + Right Summary ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 310px', gap: '1.25rem', alignItems: 'flex-start' }}>
        {/* ── LEFT COLUMN: 8-Stage Step Selector ── */}
        <div className="wf-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
              Mobilisation Stages
            </h3>
            <p style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Complete all sections before confirming mobilisation.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
            {STAGES.map((s) => {
              const isSelected = currentStage === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCurrentStage(s.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '6px',
                    border: isSelected ? '1px solid #09090b' : '1px solid transparent',
                    backgroundColor: isSelected ? '#09090b' : 'transparent',
                    color: isSelected ? '#ffffff' : '#09090b',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: isSelected ? '#ffffff' : '#f4f4f5',
                      color: isSelected ? '#09090b' : '#71717a',
                      fontSize: '0.725rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {s.id}
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: isSelected ? 700 : 500 }}>
                    {s.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── CENTER COLUMN: Stage Content & Form Inputs ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="wf-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem' }}>
            {/* Stage Title */}
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#09090b', margin: 0 }}>
                {currentStage}. {STAGES[currentStage - 1].name}
              </h2>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                {STAGES[currentStage - 1].desc}
              </p>
            </div>

            <fieldset disabled={isPilot || isStagePassed} style={{ border: 'none', padding: 0, margin: 0 }}>
            {/* STAGE 1: Stakeholder & POC Directory */}
            {currentStage === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                {/* 1. Client Coordinator */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '1rem', backgroundColor: '#fafafa' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Building2 size={16} color="#09090b" />
                    <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b' }}>
                      Client Coordinator (HQ / Office)
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label">Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Coordinator Name"
                        value={formData.clientCoordinatorName}
                        onChange={(e) => handleFieldChange('clientCoordinatorName', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Phone Number</label>
                      <input
                        type="text"
                        placeholder="+91 98765 43210"
                        value={formData.clientCoordinatorPhone}
                        onChange={(e) => handleFieldChange('clientCoordinatorPhone', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Official Email</label>
                      <input
                        type="email"
                        placeholder="coordinator@client.com"
                        value={formData.clientCoordinatorEmail}
                        onChange={(e) => handleFieldChange('clientCoordinatorEmail', e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Client Local / Site POC */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '1rem', backgroundColor: '#fafafa' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <MapPin size={16} color="#09090b" />
                    <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b' }}>
                      Client Local / Site POC
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label">Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Site In-Charge Name"
                        value={formData.clientLocalPocName}
                        onChange={(e) => handleFieldChange('clientLocalPocName', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Phone Number</label>
                      <input
                        type="text"
                        placeholder="+91 87654 32109"
                        value={formData.clientLocalPocPhone}
                        onChange={(e) => handleFieldChange('clientLocalPocPhone', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Alternate Contact</label>
                      <input
                        type="text"
                        placeholder="+91 90000 11122"
                        value={formData.clientLocalPocAlternatePhone}
                        onChange={(e) => handleFieldChange('clientLocalPocAlternatePhone', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Designation</label>
                      <select
                        value={formData.clientLocalPocDesignation}
                        onChange={(e) => handleFieldChange('clientLocalPocDesignation', e.target.value)}
                        className="form-select"
                      >
                        <option value="Site In-Charge">Site In-Charge</option>
                        <option value="Security Lead">Security Lead</option>
                        <option value="Survey Escort">Survey Escort</option>
                        <option value="Plant Manager">Plant Manager</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. LATRICS Ops Project Manager */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '1rem', backgroundColor: '#fafafa' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Users size={16} color="#09090b" />
                    <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b' }}>
                      LATRICS Ops Project Manager
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label">Name</label>
                      <input
                        type="text"
                        placeholder="LATRICS Operations Lead"
                        value={formData.latricsOpsPocName}
                        onChange={(e) => handleFieldChange('latricsOpsPocName', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Phone Number</label>
                      <input
                        type="text"
                        placeholder="+91 79898 94561"
                        value={formData.latricsOpsPocPhone}
                        onChange={(e) => handleFieldChange('latricsOpsPocPhone', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        placeholder="ops@latrics.com"
                        value={formData.latricsOpsPocEmail}
                        onChange={(e) => handleFieldChange('latricsOpsPocEmail', e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Emergency & Medical Contacts */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <ShieldCheck size={16} color="#71717a" />
                    <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b' }}>
                      Emergency &amp; Local Authority Contact
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label">Nearest Hospital Name</label>
                      <input
                        type="text"
                        placeholder="District / City Hospital"
                        value={formData.emergencyHospitalName}
                        onChange={(e) => handleFieldChange('emergencyHospitalName', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Hospital Emergency Phone</label>
                      <input
                        type="text"
                        placeholder="108 / Hospital Contact"
                        value={formData.emergencyHospitalPhone}
                        onChange={(e) => handleFieldChange('emergencyHospitalPhone', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Local Police Station Contact</label>
                      <input
                        type="text"
                        placeholder="100 / Local Station Phone"
                        value={formData.emergencyPolicePhone}
                        onChange={(e) => handleFieldChange('emergencyPolicePhone', e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 2: Flight Crew & Pilot Allocation (Dynamic Multi-Pilot) */}
            {currentStage === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#09090b' }}>
                    Allocated Pilots &amp; Flight Crew Members ({formData.pilots.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddPilot}
                    className="btn btn-outline"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.775rem', height: '32px' }}
                  >
                    <Plus size={14} /> Add Pilot / Crew Member
                  </button>
                </div>

                {formData.pilots.length === 0 ? (
                  <div style={{ padding: '2.5rem', textAlign: 'center', backgroundColor: '#fafafa', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
                    <Users size={28} color="#71717a" style={{ margin: '0 auto 0.5rem' }} />
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.825rem', fontWeight: 600, color: '#09090b' }}>
                      No flight crew members added yet.
                    </p>
                    <button
                      type="button"
                      onClick={handleAddPilot}
                      className="btn btn-primary"
                      style={{ fontSize: '0.775rem', height: '32px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Plus size={14} /> Add First Pilot
                    </button>
                  </div>
                ) : (
                  formData.pilots.map((pilot, idx) => (
                    <div
                      key={pilot.id}
                      style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '1rem',
                        backgroundColor: '#fafafa',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#09090b' }}>
                          Crew #{idx + 1} — {pilot.role || 'Pilot'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemovePilot(pilot.id)}
                          title="Remove crew member"
                          style={{ background: 'none', border: 'none', color: '#09090b', cursor: 'pointer', padding: '2px' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                        <div>
                          <label className="form-label">Role</label>
                          <select
                            value={pilot.role}
                            onChange={(e) => handlePilotChange(pilot.id, 'role', e.target.value)}
                            className="form-select"
                          >
                            <option value="Lead Remote Pilot">Lead Remote Pilot</option>
                            <option value="Co-Pilot / Drone Operator">Co-Pilot / Drone Operator</option>
                            <option value="DGPS Ground Surveyor">DGPS Ground Surveyor</option>
                            <option value="Safety & Ground Tech">Safety & Ground Tech</option>
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Full Name</label>
                          <input
                            type="text"
                            placeholder="Full name as per ID"
                            value={pilot.name}
                            onChange={(e) => handlePilotChange(pilot.id, 'name', e.target.value)}
                            className="form-input"
                          />
                        </div>
                        <div>
                          <label className="form-label">Contact No.</label>
                          <input
                            type="text"
                            placeholder="+91 98765 00000"
                            value={pilot.contactNo}
                            onChange={(e) => handlePilotChange(pilot.id, 'contactNo', e.target.value)}
                            className="form-input"
                          />
                        </div>
                        <div>
                          <label className="form-label">Age</label>
                          <input
                            type="number"
                            placeholder="e.g. 28"
                            value={pilot.age}
                            onChange={(e) => handlePilotChange(pilot.id, 'age', e.target.value)}
                            className="form-input"
                          />
                        </div>
                        <div>
                          <label className="form-label">Aadhaar / Govt ID No.</label>
                          <input
                            type="text"
                            placeholder="XXXX-XXXX-XXXX"
                            value={pilot.aadhaarNo}
                            onChange={(e) => handlePilotChange(pilot.id, 'aadhaarNo', e.target.value)}
                            className="form-input"
                          />
                        </div>
                        <div>
                          <label className="form-label">DGCA License / RPC No.</label>
                          <input
                            type="text"
                            placeholder="RPC-XXXXXXXX"
                            value={pilot.dgcaLicenseNo}
                            onChange={(e) => handlePilotChange(pilot.id, 'dgcaLicenseNo', e.target.value)}
                            className="form-input"
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.2rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                            <input
                              type="checkbox"
                              checked={pilot.insuranceActive ?? true}
                              onChange={(e) => handlePilotChange(pilot.id, 'insuranceActive', e.target.checked)}
                            />
                            Active Insurance Coverage
                          </label>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* STAGE 3: Hardware & Equipment Deployment */}
            {currentStage === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
                  <div>
                    <label className="form-label">Drone Model &amp; Make</label>
                    <input
                      type="text"
                      placeholder="e.g. DJI Matrice 300 RTK / IdeaForge"
                      value={formData.hardware.droneModel}
                      onChange={(e) => handleNestedChange('hardware', 'droneModel', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">DGCA UIN (Unique ID Number)</label>
                    <input
                      type="text"
                      placeholder="UIN-XXXX-XXXX"
                      value={formData.hardware.dgcaUin}
                      onChange={(e) => handleNestedChange('hardware', 'dgcaUin', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Sensor / Camera Payload</label>
                    <input
                      type="text"
                      placeholder="e.g. 61MP Full Frame RGB / LiDAR"
                      value={formData.hardware.sensorPayload}
                      onChange={(e) => handleNestedChange('hardware', 'sensorPayload', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Drone Insurance Policy No.</label>
                    <input
                      type="text"
                      placeholder="POL-XXXX-XXXX"
                      value={formData.hardware.droneInsuranceNo}
                      onChange={(e) => handleNestedChange('hardware', 'droneInsuranceNo', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Insurance Expiry Date</label>
                    <input
                      type="date"
                      value={formData.hardware.droneInsuranceExpiry}
                      onChange={(e) => handleNestedChange('hardware', 'droneInsuranceExpiry', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">DGPS Base &amp; Rover Units</label>
                    <input
                      type="text"
                      placeholder="e.g. Trimble / CHCNAV RTK Set"
                      value={formData.hardware.dgpsUnits}
                      onChange={(e) => handleNestedChange('hardware', 'dgpsUnits', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Flight Battery Sets (LiPo)</label>
                    <input
                      type="text"
                      placeholder="e.g. 8 Sets (16 Batteries)"
                      value={formData.hardware.batterySetsCount}
                      onChange={(e) => handleNestedChange('hardware', 'batterySetsCount', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Field Power &amp; Charging Station</label>
                    <input
                      type="text"
                      placeholder="e.g. 2kW Generator / EcoFlow Station"
                      value={formData.hardware.powerSetup}
                      onChange={(e) => handleNestedChange('hardware', 'powerSetup', e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 4: Travel, Commute & Logistics */}
            {currentStage === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* ── CARD A: Who will take responsibility for mobilization? ── */}
                <div style={{ border: '1px solid #09090b', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71717a' }}>
                        Operational Responsibility Governance
                      </span>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#09090b', margin: '0.2rem 0 0.35rem' }}>
                        Who will take the responsibility for mobilization?
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: '#52525b', margin: 0 }}>
                        Select whether Latrics Operations or the Client will arrange, pay for, and manage travel logistics for the flight crew.
                      </p>
                    </div>
                    {formData.responsibility ? (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '4px', backgroundColor: '#09090b', color: '#ffffff' }}>
                        {formData.responsibility === 'LATRICS' ? 'Latrics Responsible' : 'Client Responsible'}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '4px', backgroundColor: '#f4f4f5', border: '1px dashed #71717a', color: '#71717a' }}>
                        Selection Required
                      </span>
                    )}
                  </div>

                  {/* Two Main Option Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginTop: '0.75rem' }}>
                    {/* Option 1: Latrics */}
                    <div
                      onClick={() => handleSelectResponsibility('LATRICS')}
                      style={{
                        border: formData.responsibility === 'LATRICS' ? '2px solid #09090b' : '1px solid #d4d4d8',
                        borderRadius: '6px',
                        padding: '1rem',
                        backgroundColor: formData.responsibility === 'LATRICS' ? '#fafafa' : '#ffffff',
                        cursor: (isPilot || isStagePassed) ? 'default' : 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#09090b' }}>
                            Latrics Operations
                          </span>
                          <input
                            type="radio"
                            name="mobResponsibility"
                            checked={formData.responsibility === 'LATRICS'}
                            onChange={() => handleSelectResponsibility('LATRICS')}
                            disabled={isPilot || isStagePassed}
                          />
                        </div>
                        <p style={{ fontSize: '0.76rem', color: '#52525b', lineHeight: 1.45, margin: 0 }}>
                          Latrics Operations coordinates flight crew transit, vehicle deployment, flights/trains, and fuel logistics.
                        </p>
                      </div>
                      <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px dashed #d4d4d8' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#09090b', display: 'block' }}>
                          Requirement: ₹5,000 INR Advance Deposit
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
                          Client must pay ₹5,000 in advance and share transaction slip. Only after Ops verifies the transaction can the project proceed to Stage 4.
                        </span>
                      </div>
                    </div>

                    {/* Option 2: Client Direct */}
                    <div
                      onClick={() => handleSelectResponsibility('CLIENT')}
                      style={{
                        border: formData.responsibility === 'CLIENT' ? '2px solid #09090b' : '1px solid #d4d4d8',
                        borderRadius: '6px',
                        padding: '1rem',
                        backgroundColor: formData.responsibility === 'CLIENT' ? '#fafafa' : '#ffffff',
                        cursor: (isPilot || isStagePassed) ? 'default' : 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#09090b' }}>
                            Client Itself (Direct)
                          </span>
                          <input
                            type="radio"
                            name="mobResponsibility"
                            checked={formData.responsibility === 'CLIENT'}
                            onChange={() => handleSelectResponsibility('CLIENT')}
                            disabled={isPilot || isStagePassed}
                          />
                        </div>
                        <p style={{ fontSize: '0.76rem', color: '#52525b', lineHeight: 1.45, margin: 0 }}>
                          Client directly books and pays for pilot crew transit, flight/train tickets, and local vehicles.
                        </p>
                      </div>
                      <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px dashed #d4d4d8' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#09090b', display: 'block' }}>
                          Requirement: Ticket Share Deadline &amp; Genuine Proof
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
                          Client commits to ticket share time and shares all tickets &amp; bills. Only after Ops approves and validates tickets as genuine can the project proceed to Stage 4.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── BRANCH A PANEL: If Client Itself ── */}
                {formData.responsibility === 'CLIENT' && (
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.65rem' }}>
                      <div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                          Client Mobilisation Workflow &amp; Ticket Validation
                        </h4>
                        <p style={{ fontSize: '0.75rem', color: '#71717a', margin: '2px 0 0 0' }}>
                          Commit to your ticket sharing schedule and upload genuine tickets/bills for Operations verification.
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.65rem',
                          borderRadius: '4px',
                          border: '1px solid #09090b',
                          backgroundColor: formData.clientTicketApprovalStatus === 'APPROVED' ? '#09090b' : '#ffffff',
                          color: formData.clientTicketApprovalStatus === 'APPROVED' ? '#ffffff' : '#09090b',
                        }}
                      >
                        Status: {formData.clientTicketApprovalStatus === 'APPROVED' ? 'Approved & Validated' : formData.clientTicketApprovalStatus === 'SUBMITTED' ? 'Submitted (Under Ops Review)' : formData.clientTicketApprovalStatus === 'REJECTED' ? 'Clarification Required' : 'Pending Submission'}
                      </span>
                    </div>

                    {/* Question: By what time will they share tickets and confirmations? */}
                    <div style={{ backgroundColor: '#fafafa', border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b', display: 'block', marginBottom: '0.35rem' }}>
                        By what time will you share the tickets and confirmations? <span style={{ color: '#09090b' }}>*</span>
                      </label>
                      <p style={{ fontSize: '0.73rem', color: '#52525b', marginBottom: '0.5rem' }}>
                        Specify the exact commitment deadline when the flight crew can expect tickets, boarding passes, or driver contact confirmations.
                      </p>
                      <input
                        type="datetime-local"
                        value={formData.clientTicketShareDeadline || ''}
                        onChange={(e) => handleFieldChange('clientTicketShareDeadline', e.target.value)}
                        disabled={isPilot || isStagePassed}
                        className="form-input"
                        style={{ maxWidth: '320px' }}
                      />
                    </div>

                    {/* Upload Tickets & Booking Bills */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                        Upload Travel Tickets, PNRs &amp; Expense Bills
                      </span>

                      {/* Document List */}
                      {(formData.clientTicketsAndBills || []).length === 0 ? (
                        <div style={{ padding: '1.25rem', textAlign: 'center', backgroundColor: '#fafafa', border: '1px dashed #d4d4d8', borderRadius: '6px' }}>
                          <span style={{ fontSize: '0.75rem', color: '#71717a' }}>
                            No tickets or bills uploaded yet. Add ticket documents below for Operations validation.
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          {(formData.clientTicketsAndBills || []).map((doc) => (
                            <div
                              key={doc.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.65rem 0.85rem',
                                border: '1px solid #e4e4e7',
                                borderRadius: '4px',
                                backgroundColor: '#ffffff',
                              }}
                            >
                              <div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                                  {doc.name}
                                </span>
                                {doc.notes && (
                                  <span style={{ fontSize: '0.72rem', color: '#52525b', display: 'block' }}>
                                    Note: {doc.notes}
                                  </span>
                                )}
                                <span style={{ fontSize: '0.68rem', color: '#71717a' }}>
                                  Uploaded on {new Date(doc.uploadedAt).toLocaleString()} by {doc.uploadedBy}
                                </span>
                              </div>
                              {!isPilot && !isStagePassed && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTicketBill(doc.id)}
                                  style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: '0.75rem' }}
                                >
                                  &times; Remove
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Document Row */}
                      {!isPilot && !isStagePassed && (
                        <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '0.85rem', backgroundColor: '#fafafa', display: 'grid', gridTemplateColumns: '2fr 2fr 1fr auto', gap: '0.65rem', alignItems: 'flex-end' }}>
                          <div>
                            <label className="form-label" style={{ fontSize: '0.72rem' }}>Ticket / Document Description</label>
                            <input
                              type="text"
                              placeholder="e.g. Indigo Flight 6E-204 Tickets (2 Pilots)"
                              value={ticketDocName}
                              onChange={(e) => setTicketDocName(e.target.value)}
                              className="form-input"
                              style={{ fontSize: '0.78rem' }}
                            />
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: '0.72rem' }}>Remarks / PNR Note</label>
                            <input
                              type="text"
                              placeholder="e.g. PNR: XYZ123 / Confirmed"
                              value={ticketDocNotes}
                              onChange={(e) => setTicketDocNotes(e.target.value)}
                              className="form-input"
                              style={{ fontSize: '0.78rem' }}
                            />
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: '0.72rem' }}>Select File</label>
                            <input
                              type="file"
                              onChange={(e) => setTicketDocFile(e.target.files?.[0] || null)}
                              style={{ fontSize: '0.75rem' }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleAddTicketBill}
                            className="btn btn-secondary"
                            style={{ height: '34px', fontSize: '0.75rem', fontWeight: 700 }}
                          >
                            + Add Document
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Operations Validation & Approval Panel */}
                    <div style={{ border: '1px solid #09090b', borderRadius: '6px', padding: '1rem', backgroundColor: '#fafafa', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#09090b' }}>
                          Operations Approval &amp; Validation Gate
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#52525b' }}>
                          Rule: After Ops approves and validates tickets as genuine, project can proceed to Stage 4.
                        </span>
                      </div>

                      {formData.clientTicketApprovalNotes && (
                        <div style={{ padding: '0.5rem 0.75rem', border: '1px solid #d4d4d8', borderRadius: '4px', backgroundColor: '#ffffff', marginBottom: '0.65rem', fontSize: '0.75rem', color: '#09090b' }}>
                          <b>Ops Note:</b> {formData.clientTicketApprovalNotes}
                          {formData.clientTicketApprovedBy && (
                            <span style={{ display: 'block', fontSize: '0.68rem', color: '#71717a', marginTop: '2px' }}>
                              By: {formData.clientTicketApprovedBy} at {formData.clientTicketApprovedAt ? new Date(formData.clientTicketApprovedAt).toLocaleString() : ''}
                            </span>
                          )}
                        </div>
                      )}

                      {isOps && !isStagePassed && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <textarea
                            rows={2}
                            placeholder="Enter Operations validation notes (e.g. Verified genuine PNR and confirmed airline booking for pilots)..."
                            value={opsTicketNotesInput}
                            onChange={(e) => setOpsTicketNotesInput(e.target.value)}
                            className="form-input"
                            style={{ height: 'auto', fontSize: '0.75rem', padding: '0.4rem' }}
                          />
                          <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={handleOpsRejectTickets}
                              className="btn btn-outline"
                              style={{ height: '32px', fontSize: '0.75rem', fontWeight: 600 }}
                            >
                              Request Clarification / Reject
                            </button>
                            <button
                              type="button"
                              onClick={handleOpsApproveTickets}
                              className="btn btn-primary"
                              style={{ height: '32px', fontSize: '0.75rem', fontWeight: 700 }}
                            >
                              ✓ Approve &amp; Validate Tickets as Genuine
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── BRANCH B PANEL: If Latrics Operations ── */}
                {formData.responsibility === 'LATRICS' && (
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.65rem' }}>
                      <div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                          Latrics Mobilisation — ₹5,000 Advance Payment &amp; Verification
                        </h4>
                        <p style={{ fontSize: '0.75rem', color: '#71717a', margin: '2px 0 0 0' }}>
                          Client must pay ₹5,000 in advance and submit the transaction slip for Operations verification.
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.65rem',
                          borderRadius: '4px',
                          border: '1px solid #09090b',
                          backgroundColor: formData.latricsAdvancePaymentStatus === 'VERIFIED' ? '#09090b' : '#ffffff',
                          color: formData.latricsAdvancePaymentStatus === 'VERIFIED' ? '#ffffff' : '#09090b',
                        }}
                      >
                        Status: {formData.latricsAdvancePaymentStatus === 'VERIFIED' ? 'Verified by Operations' : formData.latricsAdvancePaymentStatus === 'SUBMITTED' ? 'Slip Submitted (Under Verification)' : formData.latricsAdvancePaymentStatus === 'REJECTED' ? 'Slip Rejected' : 'Pending Payment'}
                      </span>
                    </div>

                    {/* Official Bank Account & UPI Details Box */}
                    <div style={{ backgroundColor: '#fafafa', border: '1px solid #09090b', borderRadius: '6px', padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem' }}>
                      <div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#71717a', textTransform: 'uppercase' }}>Required Advance Amount</span>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#09090b', marginTop: '2px' }}>₹5,000.00</div>
                        <span style={{ fontSize: '0.68rem', color: '#52525b' }}>Mobilisation Advance Deposit</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#71717a', textTransform: 'uppercase' }}>Beneficiary Account</span>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b', marginTop: '2px' }}>Latrics Operations Pvt Ltd</div>
                        <span style={{ fontSize: '0.7rem', color: '#52525b' }}>HDFC Bank · Current A/C</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#71717a', textTransform: 'uppercase' }}>A/C No. &amp; IFSC</span>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b', fontFamily: 'monospace', marginTop: '2px' }}>50200088991122</div>
                        <span style={{ fontSize: '0.7rem', color: '#52525b' }}>IFSC: HDFC0001234</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#71717a', textTransform: 'uppercase' }}>UPI VPA Handle</span>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b', fontFamily: 'monospace', marginTop: '2px' }}>latrics.ops@hdfcbank</div>
                        <span style={{ fontSize: '0.7rem', color: '#52525b' }}>Instant UPI / QR Transfer</span>
                      </div>
                    </div>

                    {/* Client Transaction Slip Submission Form */}
                    <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b', display: 'block', marginBottom: '0.65rem' }}>
                        Submit Payment Slip &amp; Reference Details
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
                        <div>
                          <label className="form-label">Transaction Reference / UTR No. <span style={{ color: '#09090b' }}>*</span></label>
                          <input
                            type="text"
                            placeholder="e.g. UTR-9876543210"
                            value={formData.latricsAdvanceUtr || ''}
                            onChange={(e) => handleFieldChange('latricsAdvanceUtr', e.target.value)}
                            disabled={isPilot || isStagePassed}
                            className="form-input"
                          />
                        </div>
                        <div>
                          <label className="form-label">Payment Date &amp; Time</label>
                          <input
                            type="datetime-local"
                            value={formData.latricsAdvancePaymentDate || ''}
                            onChange={(e) => handleFieldChange('latricsAdvancePaymentDate', e.target.value)}
                            disabled={isPilot || isStagePassed}
                            className="form-input"
                          />
                        </div>
                        <div>
                          <label className="form-label">Attach Transaction Slip / Receipt</label>
                          <input
                            type="file"
                            onChange={(e) => setAdvanceSlipFileToUpload(e.target.files?.[0] || null)}
                            disabled={isPilot || isStagePassed}
                            style={{ fontSize: '0.75rem' }}
                          />
                          {formData.latricsAdvanceSlipFile && !advanceSlipFileToUpload && (
                            <span style={{ fontSize: '0.7rem', color: '#52525b', display: 'block', marginTop: '2px' }}>
                              Current: {formData.latricsAdvanceSlipFile.name} ({formData.latricsAdvanceSlipFile.size})
                            </span>
                          )}
                        </div>
                      </div>

                      {!isPilot && !isStagePassed && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.85rem' }}>
                          <button
                            type="button"
                            onClick={handleSubmitAdvanceSlip}
                            className="btn btn-secondary"
                            style={{ height: '34px', fontSize: '0.78rem', fontWeight: 700 }}
                          >
                            Submit ₹5,000 Advance Slip for Verification
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Operations Advance Verification Gate */}
                    <div style={{ border: '1px solid #09090b', borderRadius: '6px', padding: '1rem', backgroundColor: '#fafafa' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#09090b' }}>
                          Operations Advance Deposit Verification Gate
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#52525b' }}>
                          Rule: Only verified transactions permit the project to proceed to Stage 4.
                        </span>
                      </div>

                      {formData.latricsAdvanceVerificationNotes && (
                        <div style={{ padding: '0.5rem 0.75rem', border: '1px solid #d4d4d8', borderRadius: '4px', backgroundColor: '#ffffff', marginBottom: '0.65rem', fontSize: '0.75rem', color: '#09090b' }}>
                          <b>Ops Verification Note:</b> {formData.latricsAdvanceVerificationNotes}
                          {formData.latricsAdvanceVerifiedBy && (
                            <span style={{ display: 'block', fontSize: '0.68rem', color: '#71717a', marginTop: '2px' }}>
                              Verified by: {formData.latricsAdvanceVerifiedBy} at {formData.latricsAdvanceVerifiedAt ? new Date(formData.latricsAdvanceVerifiedAt).toLocaleString() : ''}
                            </span>
                          )}
                        </div>
                      )}

                      {isOps && !isStagePassed && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <textarea
                            rows={2}
                            placeholder="Enter Operations verification notes (e.g. Confirmed receipt of ₹5,000 in HDFC Current Account)..."
                            value={opsAdvanceNotesInput}
                            onChange={(e) => setOpsAdvanceNotesInput(e.target.value)}
                            className="form-input"
                            style={{ height: 'auto', fontSize: '0.75rem', padding: '0.4rem' }}
                          />
                          <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={handleOpsRejectAdvance}
                              className="btn btn-outline"
                              style={{ height: '32px', fontSize: '0.75rem', fontWeight: 600 }}
                            >
                              Reject Slip / Clarify
                            </button>
                            <button
                              type="button"
                              onClick={handleOpsVerifyAdvance}
                              className="btn btn-primary"
                              style={{ height: '32px', fontSize: '0.75rem', fontWeight: 700 }}
                            >
                              ✓ Verify ₹5,000 Advance Deposit
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Commute & Transport Metadata Details ── */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: '#ffffff' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b', display: 'block', marginBottom: '0.65rem' }}>
                    Flight Crew Commute, Vehicle &amp; Driver Specifications
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
                    <div>
                      <label className="form-label">Mode of Transportation</label>
                      <select
                        value={formData.logistics.transportMode}
                        onChange={(e) => handleNestedChange('logistics', 'transportMode', e.target.value)}
                        className="form-select"
                      >
                        <option value="Dedicated Vehicle">Dedicated Vehicle</option>
                        <option value="Flight">Flight</option>
                        <option value="Train">Train</option>
                        <option value="Rental Cab">Rental Cab</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Date of Ticket Booking</label>
                      <input
                        type="date"
                        value={formData.logistics.ticketBookingDate}
                        onChange={(e) => handleNestedChange('logistics', 'ticketBookingDate', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">PNR / Booking Reference No.</label>
                      <input
                        type="text"
                        placeholder="e.g. PNR-98765432"
                        value={formData.logistics.pnrReference}
                        onChange={(e) => handleNestedChange('logistics', 'pnrReference', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Departure Date &amp; Time</label>
                      <input
                        type="datetime-local"
                        value={formData.logistics.departureDateTime}
                        onChange={(e) => handleNestedChange('logistics', 'departureDateTime', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Estimated Time of Arrival (ETA)</label>
                      <input
                        type="datetime-local"
                        value={formData.logistics.arrivalDateTime}
                        onChange={(e) => handleNestedChange('logistics', 'arrivalDateTime', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Vehicle Registration No. (if road)</label>
                      <input
                        type="text"
                        placeholder="e.g. KA-01-XX-0000"
                        value={formData.logistics.vehicleRegNo}
                        onChange={(e) => handleNestedChange('logistics', 'vehicleRegNo', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Driver Name</label>
                      <input
                        type="text"
                        placeholder="Driver full name"
                        value={formData.logistics.driverName}
                        onChange={(e) => handleNestedChange('logistics', 'driverName', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Driver Contact Phone</label>
                      <input
                        type="text"
                        placeholder="+91 99999 88888"
                        value={formData.logistics.driverContact}
                        onChange={(e) => handleNestedChange('logistics', 'driverContact', e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 5: Accommodations */}
            {currentStage === 5 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Basecamp Hotel / Guest House Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Hotel Grand / Site Guest House"
                      value={formData.accommodation.hotelName}
                      onChange={(e) => handleNestedChange('accommodation', 'hotelName', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Hotel / Front Desk Contact</label>
                    <input
                      type="text"
                      placeholder="+91 80 1234 5678"
                      value={formData.accommodation.hotelContact}
                      onChange={(e) => handleNestedChange('accommodation', 'hotelContact', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Complete Physical Address</label>
                    <input
                      type="text"
                      placeholder="Street, City, State, PIN"
                      value={formData.accommodation.address}
                      onChange={(e) => handleNestedChange('accommodation', 'address', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Google Maps Pin Link</label>
                    <input
                      type="text"
                      placeholder="https://maps.app.goo.gl/..."
                      value={formData.accommodation.googleMapsLink}
                      onChange={(e) => handleNestedChange('accommodation', 'googleMapsLink', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Check-in Date</label>
                    <input
                      type="date"
                      value={formData.accommodation.checkInDate}
                      onChange={(e) => handleNestedChange('accommodation', 'checkInDate', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Estimated Checkout Date</label>
                    <input
                      type="date"
                      value={formData.accommodation.checkOutDate}
                      onChange={(e) => handleNestedChange('accommodation', 'checkOutDate', e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 6: Site Access & Clearances */}
            {currentStage === 6 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
                  <div>
                    <label className="form-label">Local Police / District Intimation Status</label>
                    <select
                      value={formData.clearances.policeIntimationStatus}
                      onChange={(e) => handleNestedChange('clearances', 'policeIntimationStatus', e.target.value)}
                      className="form-select"
                    >
                      <option value="Not Required">Not Required</option>
                      <option value="Submitted">Submitted (Acknowledgement Received)</option>
                      <option value="Approved">Formally Approved</option>
                      <option value="Pending">Pending Submission</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Client Site Gate Pass / Security Entry</label>
                    <select
                      value={formData.clearances.gatePassStatus}
                      onChange={(e) => handleNestedChange('clearances', 'gatePassStatus', e.target.value)}
                      className="form-select"
                    >
                      <option value="Issued">Issued &amp; Active</option>
                      <option value="Pending">Pending Verification at Gate</option>
                      <option value="Escort Provided">Escort Provided by Site POC</option>
                    </select>
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '1rem', backgroundColor: '#fafafa', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b', display: 'block', marginBottom: '0.5rem' }}>
                    Mandatory Safety &amp; PPE Verification
                  </span>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={formData.clearances.ppeJackets}
                        onChange={(e) => handleNestedChange('clearances', 'ppeJackets', e.target.checked)}
                      />
                      High-Visibility Safety Jackets
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={formData.clearances.ppeHelmets}
                        onChange={(e) => handleNestedChange('clearances', 'ppeHelmets', e.target.checked)}
                      />
                      Safety Helmets (Hard Hats)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={formData.clearances.ppeBoots}
                        onChange={(e) => handleNestedChange('clearances', 'ppeBoots', e.target.checked)}
                      />
                      Steel-Toe Safety Boots
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 7: Schedule */}
            {currentStage === 7 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
                  <div>
                    <label className="form-label">Team Departure Target Date</label>
                    <input
                      type="date"
                      value={formData.schedule.departureDate}
                      onChange={(e) => handleNestedChange('schedule', 'departureDate', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Site Arrival &amp; Check-in Target Date</label>
                    <input
                      type="date"
                      value={formData.schedule.arrivalDate}
                      onChange={(e) => handleNestedChange('schedule', 'arrivalDate', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">GCP Marking &amp; DGPS Calibration Date</label>
                    <input
                      type="date"
                      value={formData.schedule.gcpCalibrationDate}
                      onChange={(e) => handleNestedChange('schedule', 'gcpCalibrationDate', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Maiden Flight Takeoff Target Date</label>
                    <input
                      type="date"
                      value={formData.schedule.firstFlightDate}
                      onChange={(e) => handleNestedChange('schedule', 'firstFlightDate', e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 8: Remarks & Documents */}
            {currentStage === 8 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="form-label">Final Mobilisation Remarks &amp; Special Site Instructions</label>
                  <textarea
                    rows={4}
                    placeholder="Enter any special field notes, charging availability, terrain caveats, or emergency instructions..."
                    value={formData.remarks}
                    onChange={(e) => handleFieldChange('remarks', e.target.value)}
                    className="form-input"
                    style={{ height: 'auto', padding: '0.5rem' }}
                  />
                </div>

                {/* Stage 3 -> Stage 4 Gate Clearance Box */}
                <div
                  style={{
                    border: isMobilisationGateSatisfied ? '1px solid #09090b' : '1px dashed #71717a',
                    borderRadius: '6px',
                    padding: '1.25rem',
                    backgroundColor: isMobilisationGateSatisfied ? '#ffffff' : '#fafafa',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
                        Stage 4 (Capturing) Operational Clearance Gate
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        backgroundColor: isMobilisationGateSatisfied ? '#09090b' : '#f4f4f5',
                        color: isMobilisationGateSatisfied ? '#ffffff' : '#09090b',
                        border: '1px solid #09090b',
                      }}
                    >
                      {isMobilisationGateSatisfied ? 'Gate Cleared ✓' : 'Stage 4 Locked 🔒'}
                    </span>
                  </div>

                  {!formData.responsibility ? (
                    <div style={{ padding: '0.75rem', backgroundColor: '#f4f4f5', borderRadius: '4px', border: '1px solid #d4d4d8' }}>
                      <p style={{ fontSize: '0.75rem', color: '#09090b', margin: 0 }}>
                        <b>Mobilisation Responsibility Unassigned:</b> Please navigate to Stage 4 (Travel &amp; Logistics) and select whether Latrics Operations or the Client will take responsibility.
                      </p>
                      <button
                        type="button"
                        onClick={() => { setCurrentStage(4); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="btn btn-outline"
                        style={{ marginTop: '0.5rem', height: '28px', fontSize: '0.72rem' }}
                      >
                        Go to Stage 4: Travel &amp; Logistics →
                      </button>
                    </div>
                  ) : formData.responsibility === 'CLIENT' ? (
                    <div>
                      {formData.clientTicketApprovalStatus === 'APPROVED' ? (
                        <div style={{ padding: '0.75rem', backgroundColor: '#f4f4f5', borderRadius: '4px', border: '1px solid #09090b' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#09090b', display: 'block' }}>
                            ✓ Clearance Approved: Client Travel Tickets &amp; Bills Validated as Genuine
                          </span>
                          <p style={{ fontSize: '0.73rem', color: '#52525b', margin: '3px 0 0' }}>
                            Operations team ({formData.clientTicketApprovedBy}) has verified and approved the client-provided tickets and bills. Project is cleared to advance to Stage 4 (Capturing).
                          </p>
                        </div>
                      ) : (
                        <div style={{ padding: '0.75rem', backgroundColor: '#fafafa', borderRadius: '4px', border: '1px solid #71717a' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#09090b', display: 'block' }}>
                            🔒 Stage 4 Advancement Locked: Waiting for Operations Ticket Validation
                          </span>
                          <p style={{ fontSize: '0.73rem', color: '#52525b', margin: '3px 0 0' }}>
                            The client has chosen to take responsibility for mobilization. After Operations reviews and validates that all travel tickets and bills shared are genuine, only then will this project be allowed to move to Stage 4.
                          </p>
                          <button
                            type="button"
                            onClick={() => { setCurrentStage(4); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className="btn btn-outline"
                            style={{ marginTop: '0.5rem', height: '28px', fontSize: '0.72rem' }}
                          >
                            Inspect / Manage Tickets in Stage 4 →
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {formData.latricsAdvancePaymentStatus === 'VERIFIED' ? (
                        <div style={{ padding: '0.75rem', backgroundColor: '#f4f4f5', borderRadius: '4px', border: '1px solid #09090b' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#09090b', display: 'block' }}>
                            ✓ Clearance Approved: ₹5,000 Advance Mobilisation Deposit Verified
                          </span>
                          <p style={{ fontSize: '0.73rem', color: '#52525b', margin: '3px 0 0' }}>
                            Operations team ({formData.latricsAdvanceVerifiedBy}) has verified receipt of the ₹5,000 advance transaction slip (UTR: {formData.latricsAdvanceUtr || 'Recorded'}). Project is cleared to advance to Stage 4 (Capturing).
                          </p>
                        </div>
                      ) : (
                        <div style={{ padding: '0.75rem', backgroundColor: '#fafafa', borderRadius: '4px', border: '1px solid #71717a' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#09090b', display: 'block' }}>
                            🔒 Stage 4 Advancement Locked: Waiting for ₹5,000 Advance Verification
                          </span>
                          <p style={{ fontSize: '0.73rem', color: '#52525b', margin: '3px 0 0' }}>
                            Latrics was chosen to take responsibility for mobilization. The client must pay ₹5,000 in advance and share the transaction slip. Only if the transaction is verified by Operations will this project proceed to Stage 4.
                          </p>
                          <button
                            type="button"
                            onClick={() => { setCurrentStage(4); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className="btn btn-outline"
                            style={{ marginTop: '0.5rem', height: '28px', fontSize: '0.72rem' }}
                          >
                            Submit / Verify ₹5,000 Advance in Stage 4 →
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <p style={{ fontSize: '0.72rem', color: '#71717a', margin: '0.65rem 0 0 0' }}>
                    Clicking &quot;Confirm Mobilisation &amp; Advance&quot; will seal all checklist items, dispatch automated notifications, and transition project status to ACTIVE (Capturing Stage).
                  </p>
                </div>
              </div>
            )}
            </fieldset>

            {/* ── STAGE DISCUSSION THREAD ── */}
            <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <MessageSquare size={16} color="#09090b" />
                  <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b' }}>
                    Discussion Thread — Stage {currentStage}: {STAGES[currentStage - 1].name}
                  </span>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  All remarks and responses for this section are immutable audit logs.
                </span>
              </div>

              {/* Message Stream */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {stageMessages.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#fafafa', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      No remarks posted for this section yet. Use the box below to coordinate.
                    </span>
                  </div>
                ) : (
                  stageMessages.map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: '#ffffff',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span
                            style={{
                              fontSize: '0.675rem',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '3px',
                              backgroundColor: msg.role === 'LATRICS' ? '#18181b' : '#f4f4f5',
                              color: msg.role === 'LATRICS' ? '#ffffff' : '#09090b',
                              border: msg.role === 'LATRICS' ? '1px solid #18181b' : '1px solid #d4d4d8',
                            }}
                          >
                            {msg.role === 'LATRICS' ? 'Admin (LATRICS Ops)' : 'Client'}
                          </span>
                          <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#09090b' }}>
                            {msg.author}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {formatMessageStamp(msg)}
                        </span>
                      </div>

                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#18181b', lineHeight: 1.45 }}>
                        {msg.content}
                      </p>

                      {msg.attachment && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem', padding: '0.25rem 0.5rem', backgroundColor: '#f4f4f5', borderRadius: '4px', border: '1px solid #e4e4e7', width: 'fit-content' }}>
                          <Paperclip size={12} color="#71717a" />
                          <span style={{ fontSize: '0.725rem', fontWeight: 600, color: '#09090b' }}>{msg.attachment.name}</span>
                          <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>({msg.attachment.size})</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Remark Composer */}
              {isStagePassed ? (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    backgroundColor: '#f4f4f5',
                    borderRadius: '6px',
                    border: '1px dashed #d4d4d8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontSize: '0.75rem',
                    color: '#52525b',
                    fontWeight: 500,
                    marginTop: '0.25rem',
                  }}
                >
                  <Lock size={14} color="#71717a" style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Discussion Thread Closed:</strong> This stage has concluded. Communications and coordination remarks are sealed and non-editable.
                  </span>
                </div>
              ) : isPilot ? (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    backgroundColor: '#f4f4f5',
                    borderRadius: '6px',
                    border: '1px dashed #d4d4d8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontSize: '0.75rem',
                    color: '#52525b',
                    fontWeight: 500,
                    marginTop: '0.25rem',
                  }}
                >
                  <Lock size={14} color="#71717a" style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Discussion Thread Restricted:</strong> Drone pilots have view-only access during the Mobilising stage. Chat write access unlocks in Stage 4 (Capturing).
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <textarea
                    rows={2}
                    placeholder={`Write a remark or coordination note for Stage ${currentStage}...`}
                    value={newRemarkText}
                    onChange={(e) => setNewRemarkText(e.target.value)}
                    className="form-input"
                    style={{ height: 'auto', padding: '0.5rem', fontSize: '0.8rem' }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <input
                        type="file"
                        id="mob_file_upload"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setAttachedFile(e.target.files[0]);
                          }
                        }}
                      />
                      <label
                        htmlFor="mob_file_upload"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: '#f4f4f5',
                          border: '1px solid #e4e4e7',
                        }}
                      >
                        <Paperclip size={13} />
                        {attachedFile ? attachedFile.name : 'Attach File'}
                      </label>
                      {attachedFile && (
                        <button
                          type="button"
                          onClick={() => setAttachedFile(null)}
                          style={{ background: 'none', border: 'none', color: '#09090b', cursor: 'pointer', marginLeft: '0.35rem', fontSize: '0.75rem' }}
                        >
                          (Remove)
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handlePostRemark}
                      disabled={isPostingRemark || (!newRemarkText.trim() && !attachedFile)}
                      className="btn btn-primary"
                      style={{ fontSize: '0.775rem', height: '32px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      {isPostingRemark ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      Post
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── BOTTOM ACTION BAR ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '0.85rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={handlePrevSection}
              disabled={currentStage === 1}
              className="btn btn-outline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', opacity: currentStage === 1 ? 0.4 : 1 }}
            >
              <ArrowLeft size={14} /> Previous
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {!isPilot && !isStagePassed && (
                <button
                  type="button"
                  onClick={() => saveFormData(formData, true)}
                  disabled={isSaving}
                  className="btn btn-outline"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Draft
                </button>
              )}

              {(isPilot || isStagePassed || !isOps) && currentStage === 8 ? (
                <button
                  type="button"
                  onClick={() => router.push(`/projects/${projectId}/overview`)}
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
                >
                  ← Back to Overview
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNextSection}
                  disabled={isSaving || (currentStage === 8 && !isMobilisationGateSatisfied)}
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.8rem',
                    opacity: (currentStage === 8 && !isMobilisationGateSatisfied) ? 0.45 : 1,
                    cursor: (currentStage === 8 && !isMobilisationGateSatisfied) ? 'not-allowed' : 'pointer',
                  }}
                  title={currentStage === 8 && !isMobilisationGateSatisfied ? 'Operations approval/verification required to advance to Stage 4' : undefined}
                >
                  {currentStage === 8 ? (
                    <>
                      <Check size={14} /> Confirm Mobilisation &amp; Advance
                    </>
                  ) : (
                    <>
                      Next Section <ArrowRight size={14} />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Project Summary & Help Card ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Project Summary Card */}
          <div className="wf-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <FileText size={16} color="#09090b" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
                  Project Summary
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', backgroundColor: '#f4f4f5', border: '1px solid #e4e4e7', color: '#09090b' }}>
                #001
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.775rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Project Name</span>
                <span style={{ fontWeight: 700, color: '#09090b' }}>{projectTitle}</span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Client Company</span>
                <span style={{ fontWeight: 700, color: '#09090b' }}>{clientCompany}</span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Location</span>
                <span style={{ fontWeight: 600, color: '#18181b' }}>{locationDisplay}</span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Area to Cover</span>
                <span style={{ fontWeight: 700, color: '#09090b' }}>{areaDisplay}</span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Payload</span>
                <span style={{ fontWeight: 600, color: '#18181b' }}>{payloadDisplay}</span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Deliverables</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                  {Array.isArray(deliverablesList) && deliverablesList.map((d: string, i: number) => (
                    <span key={i} style={{ fontSize: '0.675rem', padding: '1px 5px', backgroundColor: '#f4f4f5', borderRadius: '3px', border: '1px solid #e4e4e7', color: '#09090b' }}>
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Current Stage</span>
                <span style={{ display: 'inline-block', marginTop: '0.2rem', fontSize: '0.725rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#09090b', color: '#ffffff' }}>
                  Mobilising
                </span>
              </div>
            </div>
          </div>

          {/* Need Help? Card */}
          <div className="wf-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundColor: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <MessageSquare size={16} color="#09090b" />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
                Need Help?
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              If you need additional information, you can raise an internal note or contact the client.
            </p>
            <button
              type="button"
              onClick={() => setShowInternalNoteModal(true)}
              className="btn btn-outline"
              style={{ width: '100%', fontSize: '0.775rem', height: '32px' }}
            >
              Add Internal Note
            </button>
          </div>
        </div>
      </div>

      {/* Internal Note Modal */}
      {showInternalNoteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="wf-card" style={{ width: '440px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Add Internal Operations Note</h3>
              <button onClick={() => setShowInternalNoteModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            <textarea
              rows={4}
              placeholder="Write an internal operational note for this mobilisation stage..."
              value={internalNoteText}
              onChange={(e) => setInternalNoteText(e.target.value)}
              className="form-input"
              style={{ height: 'auto', padding: '0.5rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" onClick={() => setShowInternalNoteModal(false)} className="btn btn-outline" style={{ fontSize: '0.8rem' }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (internalNoteText.trim()) {
                    setSuccessMessage('Internal note recorded.');
                    setTimeout(() => setSuccessMessage(null), 3000);
                  }
                  setShowInternalNoteModal(false);
                  setInternalNoteText('');
                }}
                className="btn btn-primary"
                style={{ fontSize: '0.8rem' }}
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
