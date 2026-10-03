'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import {
  Clock,
  FileText,
  Search,
  Building2,
  Folder,
  Loader2,
  Inbox,
  RotateCcw,
  Upload,
  Download,
  Calendar,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  FileCheck,
  CreditCard,
  MessageSquare,
  Layers,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Package,
  X,
  FileSpreadsheet,
  Printer,
  Scale,
  Filter,
  Receipt,
  Coins,
  Wallet,
} from 'lucide-react';
import { Portal } from '@/components/Portal';
import { useAuth } from '@/lib/auth';
import { isLatricsRole } from '@/lib/role';
import { projectApi } from '@/modules/projects/api';
import { timelineApi } from '@/modules/timeline/api';
import { paymentsApi } from '@/modules/payments/api';
import { planningApi } from '@/modules/planning/api';
import { Project } from '@/modules/projects/types';
import { TimelineEvent } from '@/modules/timeline/types';
import { PaymentRecord, Invoice, DateWiseCostSummary, ClientWalletSummary } from '@/modules/payments/types';
import { PlanningFormVersion } from '@/modules/planning/types';
import { StageChatMessage } from '@/modules/projects/components/StageChatBox';
import { resolveMessageTime } from '@/lib/message-time';
import {
  PLANNING_SECTION_TITLES,
  PROJECT_STAGE_TITLES,
  MOBILISATION_STAGE_TITLES,
  TRANSCRIPT_CSS,
  TRANSCRIPT_CSV_HEADERS,
  TranscriptGroup,
  normalizeRoleLabel,
  renderTranscriptGroupHtml,
  transcriptCsvRows,
} from '@/modules/reports/transcript';
import { ChatTranscript } from '@/modules/reports/components/ChatTranscript';

// ── Types ─────────────────────────────────────────────────────────────

interface FormattedDocumentItem {
  id: string;
  projectId: string;
  projectTitle: string;
  name: string;
  category: string;
  stage: string;
  size: string;
  uploadedBy: string;
  uploaderRole: string;
  uploadedOn: string;
  timestamp: string;
  description: string;
  url?: string;
  fileExt?: string;
}

export type CommunicationType = 'chatbox' | 'remark';
export type CommunicationChannel = 'chatbox' | 'remark' | 'clarification' | 'mobilisation';

export interface FormattedChatMessageItem {
  id: string;
  projectId: string;
  projectTitle: string;
  commType: CommunicationType;
  channel: CommunicationChannel;
  groupKey: string; // one conversation per key, e.g. remark-3, chat-4, clarify-<id>, mob-2
  groupTitle: string; // e.g. "Section 1 · KML Findings — Remarks"
  stageKey: string;
  stageName: string;
  sectionNumber?: string | number;
  sectionName?: string;
  versionCode?: string;
  senderName: string;
  senderRole: string;
  senderTag: string;
  roleLabel: string; // admin | ops | client | subordinate | pilot
  message: string;
  timestamp: string;
  timeRecorded: boolean;
  sortTime: number;
  replyToId?: string;
  replyToAuthor?: string;
  replyToRoleLabel?: string;
  replyToSnippet?: string;
  replyToAttachments?: { name: string; size?: string; url?: string }[];
  replyToTimestamp?: string;
  attachments?: { name: string; size?: string; url?: string }[];
}

interface ProjectReportBundle {
  project: Project;
  companyName: string;
  timeline: TimelineEvent[];
  payments: PaymentRecord[];
  planningVersions: PlanningFormVersion[];
  documents: FormattedDocumentItem[];
  communications: FormattedChatMessageItem[];
  costLedger?: DateWiseCostSummary[];
  invoices?: Invoice[];
  wallet?: ClientWalletSummary | null;
  isLoadingDetails: boolean;
}

export default function DailyLogsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <Loader2 size={32} className="animate-spin" color="#09090b" />
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}

// ── Export Utility Helpers ──────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '_');
}

function formatTimestamp(isoStr?: string | null): string {
  if (!isoStr) return 'N/A';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} IST`;
  } catch {
    return String(isoStr);
  }
}

function formatDate(isoStr?: string | null): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr).split('T')[0] || String(isoStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return String(isoStr).split('T')[0] || String(isoStr);
  }
}

function formatTime(isoStr?: string | null): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '—';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds} IST`;
  } catch {
    return '—';
  }
}

// ── Domain Helpers for Real Database Values & Classifications ────────

function getEventActor(evt: TimelineEvent): { name: string; role: string } {
  if (evt.actor_name && evt.actor_name !== 'System' && evt.actor_name !== 'LATRICS Ops') {
    return {
      name: evt.actor_name,
      role: evt.actor_role || (evt.actor_name.toLowerCase().includes('client') ? 'Client' : 'LATRICS Ops'),
    };
  }
  const msg = evt.message || (evt as any).description || '';
  if (msg.includes('(OPS)')) {
    const parts = msg.split('created by ');
    return {
      name: parts[1] ? parts[1].replace('(OPS)', '').trim() : (evt.actor_name || 'Aditya Paul (OPS)'),
      role: 'LATRICS Ops',
    };
  }
  if (msg.includes('(CLIENT)')) {
    const parts = msg.split('created by ');
    return {
      name: parts[1] ? parts[1].replace('(CLIENT)', '').trim() : (evt.actor_name || 'Mr. Rao (CLIENT)'),
      role: 'Client',
    };
  }
  if (msg.includes('initialized by ')) {
    const parts = msg.split('initialized by ');
    return {
      name: parts[1] ? parts[1].trim() : 'Client',
      role: 'Client',
    };
  }
  if (msg.includes('Initial Survey Request') || (evt.action && evt.action.includes('request_submitted'))) {
    return {
      name: evt.actor_name && evt.actor_name !== 'LATRICS Ops' ? evt.actor_name : 'Client',
      role: 'Client',
    };
  }
  if (evt.actor_name) {
    return { name: evt.actor_name, role: evt.actor_role || 'LATRICS Ops' };
  }
  return { name: 'LATRICS Ops', role: 'LATRICS Ops' };
}

function getEventCategory(evt: TimelineEvent): string {
  const cat = (evt.category || '').toLowerCase().trim();
  if (cat === 'project' || cat === 'request') return 'request';
  return cat || 'operation';
}

function formatEventTitle(evt: TimelineEvent): string {
  if (evt.title && evt.title.trim()) return evt.title.trim();
  const action = (evt.action || '').trim();
  const msg = (evt.description || (evt as any).message || '').trim();
  const meta = (evt as any).event_metadata || (evt as any).metadata || {};
  const actor = getEventActor(evt);
  const isClient =
    actor.role.toLowerCase().includes('client') ||
    msg.toLowerCase().includes('(client)') ||
    meta.sender === 'client';

  // 1. Initial Project & Request Creation
  if (action === 'project_created' || action === 'request_created') {
    return 'Survey Request Created (#001 Initialized)';
  }
  if (action === 'request_submitted') {
    return 'Survey Request Submitted';
  }

  // 2. Stage Progression & Lifecycle Transitions
  if (action === 'stage_advanced_to_planning') {
    return 'Stage Advanced to Planning (Stage 2)';
  }
  if (action === 'request_converted_to_project' || action === 'stage_advanced_to_mobilising') {
    return 'Request Converted to Project: Advanced to Mobilising (Stage 3)';
  }
  if (action === 'stage_advanced_to_capturing') {
    return 'Mobilisation Gate Passed: Advanced to Capturing (Stage 4)';
  }
  if (action === 'stage_advanced_to_processing') {
    return 'Flight Capture Completed: Advanced to Processing (Stage 5)';
  }
  if (action === 'stage_advanced_to_completed') {
    return 'Deliverables Handed Over: Project Completed & Delivered (Stage 6)';
  }

  // 3. Planning & Feasibility Events
  if (action === 'operational_plan_formulated') {
    return 'Initial Operational Plan Formulated (V01)';
  }
  if (action === 'planning_revision_formulated') {
    const vMatch = (msg.match(/[A-Za-z0-9]+_V\d+/i) || [])[0];
    return `Operational Plan Revision Formulated (${vMatch || 'V02'})`;
  }
  if (action === 'planning_version_created') {
    if (isClient) {
      if (
        msg.toLowerCase().includes('mobilis') ||
        msg.toLowerCase().includes('approved') ||
        meta.status === 'approved' ||
        meta.status === 'mobilising'
      ) {
        return 'Planning Feasibility Signed Off (Advancing to Mobilising)';
      }
      return 'Operational Clarifications Submitted by Client';
    } else {
      if (
        msg.includes('_V02') ||
        msg.includes('_V03') ||
        msg.includes('_V04') ||
        (meta.version_number && meta.version_number > 1)
      ) {
        const vMatch = (msg.match(/[A-Za-z0-9]+_V\d+/i) || [])[0];
        return `Operational Plan Revision Formulated (${vMatch || 'V02'})`;
      }
      return 'Initial Operational Plan Formulated (V01)';
    }
  }
  if (action === 'plan_approved') {
    return 'Planning Feasibility Signed Off';
  }
  if (action === 'clarification_submitted') {
    return 'Operational Clarifications Submitted by Client';
  }
  if (action === 'client_planning_feedback') {
    return 'Operational Clarifications Submitted by Client';
  }
  if (action === 'plan_published') {
    return 'Operational Plan Published';
  }
  if (action === 'plan_revised') {
    return 'Plan Revision Requested';
  }

  // 4. Mobilisation Gate Events
  if (action === 'mobilisation_responsibility_assigned') {
    return 'Mobilisation Responsibility Assigned';
  }
  if (action === 'mobilisation_deadline_declared') {
    return 'Ticket Submission Target Date Declared';
  }
  if (action === 'mobilisation_tickets_submitted') {
    return 'Travel Tickets & Bills Submitted';
  }
  if (action === 'mobilisation_tickets_approved') {
    return 'Travel Tickets & Bills Approved as Genuine';
  }
  if (action === 'mobilisation_tickets_rejected') {
    return 'Travel Tickets Clarification Flagged / Rejected';
  }
  if (action === 'mobilisation_advance_submitted') {
    return 'Advance Payment Slip Submitted (₹5,000)';
  }
  if (action === 'mobilisation_advance_verified') {
    return 'Advance Payment Verified & Confirmed (₹5,000)';
  }
  if (action === 'mobilisation_advance_rejected') {
    return 'Advance Payment Slip Rejected';
  }
  if (action === 'pilot_allocated') {
    return 'Flight Crew Roster & Pilots Allocated';
  }
  if (action === 'pilot_reallocated') {
    return 'Flight Crew Pilot Reallocated';
  }

  // 5. Capturing & Telemetry Events
  if (action === 'sector_created') {
    return 'Flight Sector Grid Demarcated';
  }
  if (action === 'sector_planning_configured') {
    return 'Sector Flight Planning Configured';
  }
  if (action === 'sector_flight_log_recorded') {
    return 'Flight Sortie & Daily Status Telemetry Logged';
  }

  // 6. Documents & Payments
  if (action === 'boundary_file_uploaded') {
    return 'Survey Boundary AOI (KML) Uploaded';
  }
  if (action === 'document_uploaded') {
    return 'Project Document Uploaded';
  }
  if (action === 'payment_created') {
    return 'Milestone Payment Generated';
  }
  if (action === 'payment_verified') {
    return 'Milestone Payment Verified & Confirmed';
  }

  // 7. Status updates
  if (action === 'status_updated') {
    const oldS = (meta.old_status || '').toLowerCase();
    const newS = (meta.new_status || '').toLowerCase();
    if (oldS === 'submitted' && newS === 'planning') return 'Stage Advanced to Planning (Stage 2)';
    if (oldS === 'planning' && newS === 'approved') return 'Request Converted to Project: Advanced to Mobilising (Stage 3)';
    if (oldS === 'approved' && newS === 'active') return 'Mobilisation Gate Passed: Advanced to Capturing (Stage 4)';
    if (oldS === 'active' && newS === 'completed') return 'Deliverables Handed Over: Project Completed & Delivered (Stage 6)';
    if (newS) return `Project Status Updated (${newS.toUpperCase()})`;
  }

  if (action === 'project_cancelled') return 'Project Cancelled';
  if (action === 'project_on_hold') return 'Project Put On Hold';

  if (!action) return 'Activity Event';

  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getEventStage(
  evt: TimelineEvent,
  project?: Project | null
): { id: number; name: string; label: string } {
  const action = (evt.action || '').toLowerCase().trim();
  const cat = (evt.category || '').toLowerCase().trim();
  const msg = (evt.description || (evt as any).message || '').toLowerCase();
  const meta = (evt as any).event_metadata || (evt as any).metadata || {};

  // 1. Explicit stage in metadata or event property
  const explicitStage = meta.stage ?? meta.stage_number ?? meta.project_stage ?? (evt as any).stage;
  if (explicitStage !== undefined && explicitStage !== null) {
    const sNum = parseInt(String(explicitStage), 10);
    if (sNum === 6 || String(explicitStage).toLowerCase().includes('deliver')) return { id: 6, name: 'Delivered', label: 'Stage 6: Delivered' };
    if (sNum === 5 || String(explicitStage).toLowerCase().includes('process')) return { id: 5, name: 'Processing', label: 'Stage 5: Processing' };
    if (sNum === 4 || String(explicitStage).toLowerCase().includes('captur')) return { id: 4, name: 'Capturing', label: 'Stage 4: Capturing' };
    if (sNum === 3 || String(explicitStage).toLowerCase().includes('mobilis')) return { id: 3, name: 'Mobilising', label: 'Stage 3: Mobilising' };
    if (sNum === 2 || String(explicitStage).toLowerCase().includes('plan')) return { id: 2, name: 'Planning', label: 'Stage 2: Planning' };
    if (sNum === 1 || String(explicitStage).toLowerCase().includes('request')) return { id: 1, name: 'Request', label: 'Stage 1: Request' };
  }

  const explicitStageName = String(meta.stage_name || (evt as any).stage_name || '').toLowerCase();
  if (explicitStageName.includes('deliver') || explicitStageName.includes('complete')) return { id: 6, name: 'Delivered', label: 'Stage 6: Delivered' };
  if (explicitStageName.includes('process')) return { id: 5, name: 'Processing', label: 'Stage 5: Processing' };
  if (explicitStageName.includes('captur')) return { id: 4, name: 'Capturing', label: 'Stage 4: Capturing' };
  if (explicitStageName.includes('mobilis')) return { id: 3, name: 'Mobilising', label: 'Stage 3: Mobilising' };
  if (explicitStageName.includes('plan')) return { id: 2, name: 'Planning', label: 'Stage 2: Planning' };
  if (explicitStageName.includes('request')) return { id: 1, name: 'Request', label: 'Stage 1: Request' };

  // 2. Action / Message keywords for Stage 6: Delivered
  if (
    action.includes('completed') ||
    action.includes('delivered') ||
    action === 'stage_advanced_to_completed' ||
    msg.includes('stage 6') ||
    msg.includes('completed and delivered') ||
    meta.new_status === 'completed'
  ) {
    return { id: 6, name: 'Delivered', label: 'Stage 6: Delivered' };
  }

  // Stage 5: Processing
  if (
    action.includes('processing') ||
    action === 'stage_advanced_to_processing' ||
    msg.includes('photogrammetry') ||
    msg.includes('stage 5') ||
    meta.new_status === 'processing'
  ) {
    return { id: 5, name: 'Processing', label: 'Stage 5: Processing' };
  }

  // Stage 4: Capturing
  if (
    action.includes('capturing') ||
    action === 'stage_advanced_to_capturing' ||
    action.includes('sector') ||
    action.includes('flight_log') ||
    action.includes('sortie') ||
    msg.includes('stage 4') ||
    meta.new_status === 'active'
  ) {
    return { id: 4, name: 'Capturing', label: 'Stage 4: Capturing' };
  }

  // Stage 3: Mobilising
  if (
    action.includes('mobilis') ||
    action.includes('ticket') ||
    action.includes('advance') ||
    action.includes('pilot') ||
    action === 'request_converted_to_project' ||
    action === 'stage_advanced_to_mobilising' ||
    msg.includes('mobilis') ||
    msg.includes('stage 3') ||
    meta.new_status === 'approved'
  ) {
    return { id: 3, name: 'Mobilising', label: 'Stage 3: Mobilising' };
  }

  // Stage 2: Planning
  if (
    cat === 'planning' ||
    cat === 'approval' ||
    action.includes('plan') ||
    action.includes('clarification') ||
    action === 'stage_advanced_to_planning' ||
    msg.includes('stage 2') ||
    meta.new_status === 'planning'
  ) {
    return { id: 2, name: 'Planning', label: 'Stage 2: Planning' };
  }

  // 3. For Payment, Invoices, or Financial evaluation events:
  if (cat === 'payment' || action.includes('payment') || action.includes('invoice') || action.includes('bill')) {
    if (msg.includes('advance') || action.includes('advance')) {
      return { id: 3, name: 'Mobilising', label: 'Stage 3: Mobilising' };
    }
    if (project) {
      const pStatus = (project.status || '').toLowerCase();
      if (pStatus === 'completed' || pStatus === 'delivered') return { id: 6, name: 'Delivered', label: 'Stage 6: Delivered' };
      if (pStatus === 'processing') return { id: 5, name: 'Processing', label: 'Stage 5: Processing' };
      if (pStatus === 'active' || pStatus === 'capturing') return { id: 4, name: 'Capturing', label: 'Stage 4: Capturing' };
      if (pStatus === 'approved' || pStatus === 'mobilising') return { id: 3, name: 'Mobilising', label: 'Stage 3: Mobilising' };
      if (pStatus === 'planning') return { id: 2, name: 'Planning', label: 'Stage 2: Planning' };
    }
  }

  // 4. Project status context fallback
  if (project) {
    const pStatus = (project.status || '').toLowerCase();
    if (action.includes('request') || cat === 'request') {
      return { id: 1, name: 'Request', label: 'Stage 1: Request' };
    }
    if (pStatus === 'completed') return { id: 6, name: 'Delivered', label: 'Stage 6: Delivered' };
    if (pStatus === 'processing') return { id: 5, name: 'Processing', label: 'Stage 5: Processing' };
    if (pStatus === 'active') return { id: 4, name: 'Capturing', label: 'Stage 4: Capturing' };
    if (pStatus === 'approved') return { id: 3, name: 'Mobilising', label: 'Stage 3: Mobilising' };
    if (pStatus === 'planning') return { id: 2, name: 'Planning', label: 'Stage 2: Planning' };
  }

  // Stage 1: Request (Default for initial request)
  return { id: 1, name: 'Request', label: 'Stage 1: Request' };
}

function enrichTimelineEvents(
  project: Project,
  rawTimeline: TimelineEvent[],
  planningVersions: PlanningFormVersion[] = [],
  documents: FormattedDocumentItem[] = [],
  payments: PaymentRecord[] = []
): TimelineEvent[] {
  const enriched: TimelineEvent[] = [];
  const pStatus = (project.status || '').toLowerCase();

  // Track existing action signatures to prevent redundant injections
  const hasAction = (act: string) =>
    rawTimeline.some((e) => (e.action || '').toLowerCase() === act.toLowerCase()) ||
    enriched.some((e) => (e.action || '').toLowerCase() === act.toLowerCase());
  const hasMsgMatch = (str: string) =>
    rawTimeline.some((e) => (e.description || (e as any).message || '').toLowerCase().includes(str.toLowerCase()));

  // 1. Process and normalize existing raw events
  rawTimeline.forEach((evt) => {
    const actor = getEventActor(evt);
    const meta = (evt as any).event_metadata || (evt as any).metadata || {};
    const action = (evt.action || '').trim();
    const rawMsg = (evt.description || (evt as any).message || '').trim();
    const isClient =
      actor.role.toLowerCase().includes('client') ||
      rawMsg.toLowerCase().includes('(client)') ||
      meta.sender === 'client';

    let title = evt.title || '';
    let desc = rawMsg;
    let category = getEventCategory(evt);

    if (action === 'project_created' || action === 'request_created') {
      title = 'Survey Request Created (#001 Initialized)';
      desc = `Survey Request #001 initialized for project '${project.title}'`;
      category = 'request';
    } else if (action === 'request_submitted') {
      title = 'Survey Request Submitted';
      desc = `Initial Survey Request #001 submitted for project '${project.title}'`;
      category = 'request';
    } else if (action === 'planning_version_created') {
      if (isClient) {
        if (
          rawMsg.toLowerCase().includes('mobilis') ||
          rawMsg.toLowerCase().includes('approved') ||
          meta.status === 'approved' ||
          meta.status === 'mobilising'
        ) {
          title = 'Planning Feasibility Signed Off (Advancing to Mobilising)';
          desc = `Client approved and signed off planning feasibility to commence field mobilisation`;
          category = 'approval';
        } else {
          title = 'Operational Clarifications Submitted by Client';
          desc = rawMsg.replace(/Planning version [^\s]+ created by [^\(]+ \(CLIENT\)/i, 'Client submitted operational clarification details and notes');
          category = 'planning';
        }
      } else {
        const vCodeMatch = rawMsg.match(/[A-Za-z0-9]+_V\d+/i);
        const vCode = vCodeMatch ? vCodeMatch[0] : (meta.version_code || 'V01');
        const isRev = (meta.version_number && meta.version_number > 1) || rawMsg.includes('_V02') || rawMsg.includes('_V03');
        if (isRev) {
          title = `Operational Plan Revision Formulated (${vCode})`;
          desc = rawMsg.replace(/Planning version [^\s]+ created by/i, `Operational plan revision ${vCode} formulated by`);
        } else {
          title = `Initial Operational Plan Formulated (${vCode})`;
          desc = rawMsg.replace(/Planning version [^\s]+ created by/i, `Initial operational plan ${vCode} formulated by`);
        }
        category = 'planning';
      }
    } else if (action === 'plan_approved') {
      title = 'Planning Feasibility Signed Off';
      category = 'approval';
    } else if (action === 'clarification_submitted') {
      title = 'Operational Clarifications Submitted by Client';
      category = 'planning';
    } else if (action === 'status_updated') {
      const oldS = (meta.old_status || '').toLowerCase();
      const newS = (meta.new_status || '').toLowerCase();
      if (oldS === 'submitted' && newS === 'planning') {
        title = 'Stage Advanced to Planning (Stage 2)';
        desc = `Survey request accepted by LATRICS Operations; flight planning & feasibility assessment initiated`;
        category = 'planning';
      } else if (oldS === 'planning' && newS === 'approved') {
        title = 'Request Converted to Project: Advanced to Mobilising (Stage 3)';
        desc = `Survey Request #001 converted into active Project '${project.title}' upon feasibility agreement; advanced to Stage 3 (Mobilising)`;
        category = 'project';
      } else if (oldS === 'approved' && newS === 'active') {
        title = 'Mobilisation Gate Passed: Advanced to Capturing (Stage 4)';
        desc = `Required mobilisation validations verified: Project '${project.title}' advanced to Stage 4 (Capturing) with active flight operations`;
        category = 'project';
      } else if (oldS === 'active' && newS === 'completed') {
        title = 'Deliverables Handed Over: Project Completed & Delivered (Stage 6)';
        desc = `Survey deliverables verified: Project '${project.title}' completed and delivered to client`;
        category = 'project';
      }
    }

    if (!title) {
      title = formatEventTitle(evt);
    }

    enriched.push({
      ...evt,
      title,
      description: desc,
      category,
    });
  });

  // 2. Synthesize implicit stage transition milestones if not present
  const baseTime = new Date(project.created_at || Date.now()).getTime();

  // (a) Stage 1 -> Stage 2: Stage Advanced to Planning
  const hasPlanStage =
    hasAction('stage_advanced_to_planning') ||
    hasMsgMatch('advanced to stage 2') ||
    hasMsgMatch('flight planning & feasibility');
  const reachedPlanning =
    planningVersions.length > 0 || ['planning', 'approved', 'active', 'completed'].includes(pStatus);
  if (!hasPlanStage && reachedPlanning) {
    const firstPlanTime = planningVersions[0]?.created_at
      ? new Date(planningVersions[0].created_at).getTime() - 2000
      : baseTime + 30000;
    enriched.push({
      id: `syn-adv-plan-${project.id}`,
      project_id: project.id,
      created_at: new Date(firstPlanTime).toISOString(),
      category: 'planning',
      action: 'stage_advanced_to_planning',
      title: 'Stage Advanced to Planning (Stage 2)',
      description: `Survey request accepted by LATRICS Operations; flight planning & feasibility assessment initiated.`,
      actor_name: 'LATRICS Operations',
      actor_role: 'LATRICS Ops',
    } as any);
  }

  // (b) Stage 2 -> Stage 3: Request Converted to Project (Advanced to Mobilising)
  const hasConvProject =
    hasAction('request_converted_to_project') ||
    hasAction('stage_advanced_to_mobilising') ||
    hasMsgMatch('converted to active project') ||
    hasMsgMatch('advanced to stage 3');
  const reachedMobilising =
    ['approved', 'active', 'completed'].includes(pStatus) ||
    planningVersions.some((v) => (v.status || '').includes('mobilis') || (v.status || '').includes('approved'));
  if (!hasConvProject && reachedMobilising) {
    const approvedPlan = planningVersions
      .slice()
      .reverse()
      .find((v) => (v.status || '').includes('mobilis') || (v.status || '').includes('approved'));
    const convTime = approvedPlan?.created_at
      ? new Date(approvedPlan.created_at).getTime() + 1000
      : baseTime + 60000;
    enriched.push({
      id: `syn-conv-proj-${project.id}`,
      project_id: project.id,
      created_at: new Date(convTime).toISOString(),
      category: 'project',
      action: 'request_converted_to_project',
      title: 'Request Converted to Project: Advanced to Mobilising (Stage 3)',
      description: `Client signed off operational planning feasibility. Survey Request #001 converted into active Project '${project.title}' to begin field mobilisation.`,
      actor_name: project.client_name || 'Client Representative',
      actor_role: 'Client',
    } as any);
  }

  // (c) Stage 3 -> Stage 4: Mobilisation Gate Passed (Advanced to Capturing)
  const hasCapturingStage =
    hasAction('stage_advanced_to_capturing') ||
    hasMsgMatch('advanced to stage 4') ||
    hasMsgMatch('advanced to capturing');
  const reachedCapturing = ['active', 'completed'].includes(pStatus);
  if (!hasCapturingStage && reachedCapturing) {
    const capTime = baseTime + 120000;
    enriched.push({
      id: `syn-adv-cap-${project.id}`,
      project_id: project.id,
      created_at: new Date(capTime).toISOString(),
      category: 'project',
      action: 'stage_advanced_to_capturing',
      title: 'Mobilisation Gate Passed: Advanced to Capturing (Stage 4)',
      description: `Required mobilisation validations verified. Project advanced to Stage 4 (Capturing) with active aerial flight operations.`,
      actor_name: 'LATRICS Operations',
      actor_role: 'LATRICS Ops',
    } as any);
  }

  // (d) Stage 4 -> Stage 5: Flight Capture Completed (Advanced to Processing)
  const hasProcessingStage =
    hasAction('stage_advanced_to_processing') ||
    hasMsgMatch('advanced to stage 5') ||
    hasMsgMatch('advanced to processing');
  const reachedProcessing = pStatus === 'completed';
  if (!hasProcessingStage && reachedProcessing) {
    const procTime = baseTime + 180000;
    enriched.push({
      id: `syn-adv-proc-${project.id}`,
      project_id: project.id,
      created_at: new Date(procTime).toISOString(),
      category: 'project',
      action: 'stage_advanced_to_processing',
      title: 'Flight Capture Completed: Advanced to Processing (Stage 5)',
      description: `Aerial survey flight sorties completed. Raw imagery and GCP targets transitioned to photogrammetry processing.`,
      actor_name: 'LATRICS Operations',
      actor_role: 'LATRICS Ops',
    } as any);
  }

  // (e) Stage 5 -> Stage 6: Deliverables Handed Over (Project Completed & Delivered)
  const hasCompletedStage =
    hasAction('stage_advanced_to_completed') ||
    hasMsgMatch('completed and delivered');
  const reachedDelivered = pStatus === 'completed';
  if (!hasCompletedStage && reachedDelivered) {
    const compTime = baseTime + 240000;
    enriched.push({
      id: `syn-adv-comp-${project.id}`,
      project_id: project.id,
      created_at: new Date(compTime).toISOString(),
      category: 'project',
      action: 'stage_advanced_to_completed',
      title: 'Deliverables Handed Over: Project Completed & Delivered (Stage 6)',
      description: `Quality assurance inspection verified. Complete survey package handed over and delivered to client.`,
      actor_name: 'LATRICS Operations',
      actor_role: 'LATRICS Ops',
    } as any);
  }

  // 3. Integrate Key Document Uploads as Stage Actions (if not already recorded in timeline)
  documents.forEach((doc, idx) => {
    const docNameLower = doc.name.toLowerCase();
    const alreadyLogged = enriched.some((e) =>
      (e.description || (e as any).message || '').toLowerCase().includes(docNameLower)
    );
    if (!alreadyLogged) {
      const isBoundary =
        doc.category.toLowerCase().includes('boundary') ||
        doc.name.endsWith('.kml') ||
        doc.name.endsWith('.kmz');
      const isTicket =
        doc.category.toLowerCase().includes('ticket') ||
        doc.category.toLowerCase().includes('bill');
      const isAdvance =
        doc.category.toLowerCase().includes('advance') ||
        doc.category.toLowerCase().includes('slip');

      let act = 'document_uploaded';
      let title = `Project Document Uploaded (${doc.name})`;
      let cat = 'document';
      if (isBoundary) {
        act = 'boundary_file_uploaded';
        title = `Survey Boundary AOI (KML) Uploaded`;
        cat = 'request';
      } else if (isTicket) {
        act = 'mobilisation_tickets_submitted';
        title = `Travel Tickets & Bills Submitted (${doc.name})`;
        cat = 'mobilisation';
      } else if (isAdvance) {
        act = 'mobilisation_advance_submitted';
        title = `Mobilisation Advance Payment Slip Submitted`;
        cat = 'mobilisation';
      }

      enriched.push({
        id: `syn-doc-${project.id}-${idx}`,
        project_id: project.id,
        created_at: doc.timestamp || project.created_at,
        category: cat,
        action: act,
        title,
        description: `Uploaded file '${doc.name}' (${doc.size}) under ${doc.stage}`,
        actor_name: doc.uploadedBy || 'Client Representative',
        actor_role: (doc.uploaderRole || 'client') === 'client' ? 'Client' : 'LATRICS Ops',
      } as any);
    }
  });

  // Sort ascending by created_at
  return enriched.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
}

function extractPlanningParameters(ver: PlanningFormVersion) {
  const f = ver.form_data || {};

  // 1. Altitude
  const altitudeVal = f.plannedAltitudeMeters ?? f.altitude ?? f.flight_altitude;
  const altitudeLabel = altitudeVal !== undefined && altitudeVal !== '' ? `${altitudeVal}m AGL` : '—';

  // 2. Overlap (Front / Side)
  const frontVal = f.frontOverlapPercent ?? f.front_overlap;
  const sideVal = f.sideOverlapPercent ?? f.side_overlap;
  const hasFront = frontVal !== undefined && frontVal !== '' && frontVal !== null;
  const hasSide = sideVal !== undefined && sideVal !== '' && sideVal !== null;
  const overlapLabel = hasFront && hasSide
    ? `${frontVal}% / ${sideVal}%`
    : hasFront
    ? `${frontVal}%`
    : '—';

  // 3. Ground Control Points (GCPs)
  const gcpVal = f.gcpsNeeded ?? f.gcp_needed ?? f.gcp_count;
  const gcpLabel = gcpVal !== undefined && gcpVal !== '' && gcpVal !== null ? String(gcpVal) : '—';

  // 4. Feasibility Decision
  const rawDecision = (f.feasibilityDecision || ver.status || f.decision || '').toLowerCase();
  let decisionLabel = 'UNDER REVIEW';
  if (rawDecision === 'yes' || rawDecision === 'feasible') {
    decisionLabel = 'FEASIBLE';
  } else if (rawDecision === 'no' || rawDecision === 'not_feasible') {
    decisionLabel = 'NOT FEASIBLE';
  } else if (rawDecision === 'need_clarity' || rawDecision === 'awaiting_clarity') {
    decisionLabel = 'NEED CLARITY';
  } else if (rawDecision === 'clarification_submitted') {
    decisionLabel = 'CLARIFICATION SUBMITTED';
  } else if (rawDecision === 'feasible_pending_client_confirmation') {
    decisionLabel = 'FEASIBLE (PENDING CLIENT)';
  } else if (rawDecision === 'mobilising' || rawDecision === 'mobilizing') {
    decisionLabel = 'MOBILISING';
  } else if (rawDecision === 'approved') {
    decisionLabel = 'APPROVED';
  }

  // 5. Remarks
  const remarksVal = f.decisionRemarks || f.decision_notes || f.remarks || f.hazardMitigationNotes;
  const remarksLabel = remarksVal && String(remarksVal).trim().length > 0 ? String(remarksVal).trim() : '—';

  // 6. Expected Data Delivery Timeline (Days post-flight)
  const deliveryDays = f.dataDeliveryTimelineDays ?? f.expectedDeliveryDays ?? f.deliveryTimelineDays ?? f.turnaround_days;
  const deliveryTimelineLabel = deliveryDays ? `${deliveryDays} Days Post-Flight` : 'Standard SLA (7 Days)';

  // 7. Client Sign-Off State
  const clientSignOff = (ver as any).client_confirmation || f.clientSignOff || f.client_approved || (ver.status === 'approved' && ver.sender === 'client');
  const clientSignOffLabel = clientSignOff ? 'APPROVED' : (ver.status === 'approved' ? 'OPS VERIFIED' : 'PENDING SIGN-OFF');

  // 8. Airspace Zone
  const airspaceLabel = Array.isArray(f.airspace_zones) ? f.airspace_zones.join(', ') : (f.airspaceZone || 'Green Zone');

  return {
    altitudeLabel,
    overlapLabel,
    gcpLabel,
    decisionLabel,
    remarksLabel,
    deliveryTimelineLabel,
    clientSignOffLabel,
    airspaceLabel,
  };
}

const PLANNING_SECTION_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(PLANNING_SECTION_TITLES).map(([num, title]) => [num, `Section ${num}: ${title}`])
);

// ── Chat-style transcript grouping (Remarks / Chatbox) ───────────────

function toTranscriptGroup(key: string, title: string, msgs: FormattedChatMessageItem[]): TranscriptGroup {
  return {
    key,
    title,
    messages: msgs.map((c) => ({
      id: c.id,
      senderName: c.senderName,
      roleLabel: c.roleLabel,
      message: c.message,
      attachments: c.attachments || [],
      time: c.timeRecorded ? new Date(c.timestamp) : null,
      quote:
        c.replyToId || c.replyToAuthor
          ? {
              senderName: c.replyToAuthor || 'Unknown',
              roleLabel: c.replyToRoleLabel || 'ops',
              message: c.replyToSnippet || '',
              attachments: c.replyToAttachments || [],
              time: c.replyToTimestamp ? new Date(c.replyToTimestamp) : null,
            }
          : undefined,
    })),
  };
}

/** Planning remarks: all 8 sections always listed (Section 8 only when present), then Need More Clarity threads. */
function buildRemarkGroups(comms: FormattedChatMessageItem[], includeSection8: boolean): TranscriptGroup[] {
  const sectionNums = includeSection8 ? ['1', '2', '3', '4', '5', '6', '7', '8'] : ['1', '2', '3', '4', '5', '6', '7'];
  const sections = sectionNums.map((n) =>
    toTranscriptGroup(
      `remark-${n}`,
      `Section ${n} · ${PLANNING_SECTION_TITLES[n]} — Remarks`,
      comms.filter((c) => c.channel === 'remark' && c.sectionNumber === n)
    )
  );
  const clarifyKeys = Array.from(new Set(comms.filter((c) => c.channel === 'clarification').map((c) => c.groupKey)));
  const clarifications = clarifyKeys.map((k) => {
    const msgs = comms.filter((c) => c.groupKey === k);
    return toTranscriptGroup(k, msgs[0].groupTitle, msgs);
  });
  return [...sections, ...clarifications];
}

/** Project chatboxes: all 6 stages always listed; planning remarks & clarifications included under Stage 2; mobilisation sub-stage discussions follow Stage 3. */
function buildChatGroups(comms: FormattedChatMessageItem[]): TranscriptGroup[] {
  const groups: TranscriptGroup[] = [];
  ['1', '2', '3', '4', '5', '6'].forEach((n) => {
    groups.push(
      toTranscriptGroup(
        `chat-${n}`,
        `Stage ${n} · ${PROJECT_STAGE_TITLES[n]} — Chatbox`,
        comms.filter((c) => c.channel === 'chatbox' && c.stageKey === n)
      )
    );
    if (n === '2') {
      // Include Planning stage remarks & questions/clarifications in the exact same chatbox transcript layout
      const remarkKeys = Array.from(
        new Set(
          comms
            .filter((c) => (c.channel === 'remark' || c.channel === 'clarification') && (c.stageKey === '2' || !c.stageKey))
            .map((c) => c.groupKey)
        )
      );
      remarkKeys.forEach((k) => {
        const msgs = comms.filter((c) => c.groupKey === k);
        if (msgs.length > 0) {
          groups.push(toTranscriptGroup(k, msgs[0].groupTitle || `Planning · Remarks`, msgs));
        }
      });
    }
    if (n === '3') {
      const mobKeys = Array.from(new Set(comms.filter((c) => c.channel === 'mobilisation').map((c) => c.groupKey))).sort();
      mobKeys.forEach((k) => {
        const msgs = comms.filter((c) => c.groupKey === k);
        groups.push(toTranscriptGroup(k, msgs[0].groupTitle, msgs));
      });
    }
  });
  return groups;
}

function transcriptSectionHtml(groups: TranscriptGroup[]): string {
  const nonEmpty = groups.filter((g) => g.messages.length > 0);
  if (nonEmpty.length === 0) {
    return `<div style="padding: 1rem; color: #71717a; font-size: 0.75rem; text-align: center; background: #fafafa; border: 1px dashed #d4d4d8; border-radius: 4px;">No messages recorded in this channel.</div>`;
  }
  return nonEmpty.map(renderTranscriptGroupHtml).join('');
}

function transcriptCsv(remarks: TranscriptGroup[], chats: TranscriptGroup[]): string[][] {
  return [
    ...remarks.flatMap((g) => transcriptCsvRows(g.key.startsWith('clarify') ? 'Need More Clarity' : 'Planning Remarks', g)),
    ...chats.flatMap((g) => transcriptCsvRows(g.key.startsWith('mob') ? 'Mobilisation Discussion' : 'Stage Chatbox', g)),
  ];
}

function downloadCsv(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
  const sanitize = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvRows = [
    headers.map(sanitize).join(','),
    ...rows.map((row) => row.map(sanitize).join(',')),
  ];

  const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateHtmlReportString(
  reportTitle: string,
  project: Project,
  companyName: string,
  sections: Array<{
    title: string;
    subtitle?: string;
    headers: string[];
    rows: (string | number | boolean | null | undefined)[][];
    customHtml?: string; // chat-style transcript body rendered instead of a table
    countLabel?: string;
  }>,
  autoPrint: boolean = false
): string {
  const now = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + ' IST';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${reportTitle} — ${project.title}</title>
  <style>
    @page { 
      size: A4 portrait; 
      margin: 12mm 14mm 14mm 14mm; 
    }
    * { box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
      margin: 0 auto; 
      padding: 1.5rem; 
      max-width: 210mm;
      color: #09090b; 
      background: #ffffff; 
      -webkit-font-smoothing: antialiased;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 1rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: flex-start; }
    .logo-badge { font-weight: 900; font-size: 1.25rem; letter-spacing: -0.03em; color: #09090b; }
    .logo-badge span { color: #09090b; }
    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1.5rem; background: #fafafa; padding: 1rem; border-radius: 6px; border: 1px solid #e4e4e7; }
    .meta-item { display: flex; flex-direction: column; gap: 0.2rem; }
    .meta-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; color: #52525b; font-weight: 700; }
    .meta-val { font-size: 0.85rem; font-weight: 700; color: #09090b; }
    .section { margin-bottom: 2rem; break-inside: avoid; page-break-inside: avoid; }
    .section-title { font-size: 1rem; font-weight: 800; color: #09090b; margin-bottom: 0.35rem; display: flex; align-items: center; justify-content: space-between; }
    .section-desc { font-size: 0.75rem; color: #52525b; margin-bottom: 0.75rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.75rem; margin-top: 0.5rem; }
    th { background: #09090b; color: #ffffff; text-align: left; padding: 0.5rem 0.65rem; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.02em; border: 1px solid #09090b; }
    td { padding: 0.5rem 0.65rem; border: 1px solid #e4e4e7; vertical-align: top; line-height: 1.35; }
    tr:nth-child(even) td { background: #fafafa; }
    .timestamp { font-family: monospace; font-size: 0.72rem; color: #09090b; font-weight: 600; white-space: nowrap; }
    .print-btn { background: #09090b; color: #ffffff; border: none; padding: 0.45rem 0.85rem; border-radius: 4px; font-weight: 700; cursor: pointer; font-size: 0.75rem; }
    @media print { 
      .print-btn { display: none !important; } 
      body { padding: 0 !important; max-width: 100% !important; }
      .section { break-inside: avoid; page-break-inside: avoid; }
      .day-card { break-inside: avoid !important; page-break-inside: avoid !important; }
      .exec-summary-grid { break-inside: avoid !important; page-break-inside: avoid !important; }
      tr { break-inside: avoid !important; page-break-inside: avoid !important; }
    }
    .exec-summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.65rem;
      margin-bottom: 1.25rem;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .exec-card {
      background: #fafafa;
      border: 1px solid #e4e4e7;
      border-radius: 6px;
      padding: 0.7rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .exec-card-title {
      font-size: 0.65rem;
      font-weight: 700;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .exec-card-value {
      font-size: 1rem;
      font-weight: 800;
      font-family: monospace;
      color: #09090b;
    }
    .day-card {
      border: 1px solid #d4d4d8;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 1.15rem;
      background: #ffffff;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .day-header {
      background: #09090b;
      color: #ffffff;
      padding: 0.5rem 0.75rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.775rem;
      font-weight: 700;
    }
    .day-ts {
      font-family: monospace;
      font-size: 0.7rem;
      color: #a1a1aa;
      font-weight: 500;
    }
    .day-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.725rem;
      margin: 0;
    }
    .day-table th {
      background: #f4f4f5;
      color: #52525b;
      font-weight: 700;
      padding: 0.4rem 0.6rem;
      border-bottom: 1px solid #e4e4e7;
      border-top: none;
      border-left: none;
      border-right: none;
      text-align: left;
      font-size: 0.68rem;
    }
    .day-table td {
      padding: 0.45rem 0.6rem;
      border-bottom: 1px solid #f4f4f5;
      border-top: none;
      border-left: none;
      border-right: none;
      vertical-align: middle;
      line-height: 1.35;
    }
    .day-table tr:last-child td {
      border-bottom: none;
    }
    .day-footer {
      background: #fafafa;
      border-top: 1px solid #e4e4e7;
      padding: 0.45rem 0.75rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.725rem;
      font-weight: 700;
    }
    ${TRANSCRIPT_CSS}
  </style>
  ${
    autoPrint
      ? `<script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>`
      : ''
  }
</head>
<body>
  <div class="header">
    <div>
      <div class="logo-badge">LATRICS <span>AEROSTAKE</span></div>
      <h1 style="margin: 0.35rem 0 0.15rem 0; font-size: 1.5rem; font-weight: 800;">${reportTitle}</h1>
      <div style="font-size: 0.85rem; color: #52525b;">Project Audit Ledger &amp; Field Telemetry Manifest</div>
    </div>
    <div style="text-align: right;">
      <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
      <div style="font-size: 0.75rem; color: #52525b; margin-top: 0.5rem;">Generated: ${now}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item">
      <span class="meta-label">Project Title</span>
      <span class="meta-val">${project.title}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Client Company</span>
      <span class="meta-val">${companyName}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Lifecycle Status</span>
      <span class="meta-val">${(project.status || 'ACTIVE').toUpperCase()}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Target Area</span>
      <span class="meta-val">${project.target_area_sqkm || project.requirements_payload?.requested_area_sqkm || 'N/A'} sq.km</span>
    </div>
  </div>

  ${sections
    .map(
      (sec) => `
    <div class="section">
      <div class="section-title">
        <span>${sec.title}</span>
        <span style="font-size: 0.75rem; color: #52525b; font-weight: 500;">${sec.countLabel ?? `${sec.rows.length} ${sec.rows.length === 1 ? 'record' : 'records'}`}</span>
      </div>
      ${sec.subtitle ? `<div class="section-desc">${sec.subtitle}</div>` : ''}
      ${sec.customHtml !== undefined ? sec.customHtml : `<table>
        <thead>
          <tr>${sec.headers.map((h) => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${
            sec.rows.length === 0
              ? `<tr><td colspan="${sec.headers.length}" style="text-align: center; color: #71717a; padding: 1.5rem;">No records recorded for this section</td></tr>`
              : sec.rows
                  .map(
                    (r) =>
                      `<tr>${r
                        .map(
                          (c, idx) =>
                            `<td>${
                              idx === 0 || String(c).includes('IST')
                                ? `<span class="timestamp">${c ?? ''}</span>`
                                : c ?? ''
                            }</td>`
                        )
                        .join('')}</tr>`
                  )
                  .join('')
          }
        </tbody>
      </table>`}
    </div>
  `
    )
    .join('')}
</body>
</html>`;
}

function downloadHtmlReport(
  filename: string,
  reportTitle: string,
  project: Project,
  companyName: string,
  sections: Array<{
    title: string;
    subtitle?: string;
    headers: string[];
    rows: (string | number | boolean | null | undefined)[][];
    customHtml?: string; // chat-style transcript body rendered instead of a table
    countLabel?: string;
  }>
) {
  const html = generateHtmlReportString(reportTitle, project, companyName, sections, false);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function openPrintReport(
  reportTitle: string,
  project: Project,
  companyName: string,
  sections: Array<{
    title: string;
    subtitle?: string;
    headers: string[];
    rows: (string | number | boolean | null | undefined)[][];
    customHtml?: string; // chat-style transcript body rendered instead of a table
    countLabel?: string;
  }>
) {
  const html = generateHtmlReportString(reportTitle, project, companyName, sections, true);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

// ── In-App Report Preview Modal (Print & PDF Ready) ──────────────────

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportTitle: string;
  project: Project;
  companyName: string;
  sections: Array<{
    title: string;
    subtitle?: string;
    headers: string[];
    rows: (string | number | boolean | null | undefined)[][];
    customHtml?: string;
    countLabel?: string;
  }>;
  onDownloadCsv?: () => void;
}

function ReportPreviewModal({ isOpen, onClose, reportTitle, project, companyName, sections, onDownloadCsv }: ReportPreviewModalProps) {
  if (!isOpen) return null;

  const htmlContent = generateHtmlReportString(reportTitle, project, companyName, sections, false);

  const handlePrint = () => {
    openPrintReport(reportTitle, project, companyName, sections);
  };

  const handleDownload = () => {
    const today = new Date().toISOString().split('T')[0];
    const slug = slugify(project.title);
    downloadHtmlReport(`${slug}_Preview_${today}.html`, reportTitle, project, companyName, sections);
  };

  return (
    <Portal>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #09090b',
            width: '100%',
            maxWidth: '1150px',
            height: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '0.85rem 1.25rem',
              backgroundColor: '#09090b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.65rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>Document Preview: {reportTitle}</div>
              <div style={{ fontSize: '0.725rem', color: '#a1a1aa' }}>
                {project.title} • {companyName} • <span style={{ color: '#38bdf8', fontWeight: 600 }}>A4 Portrait View (210 × 297 mm)</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
              {onDownloadCsv && (
                <button
                  type="button"
                  onClick={onDownloadCsv}
                  title="Download CSV spreadsheet"
                  style={{
                    height: '30px',
                    padding: '0 0.85rem',
                    backgroundColor: '#ffffff',
                    color: '#09090b',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    cursor: 'pointer',
                  }}
                >
                  <Download size={13} /> CSV
                </button>
              )}
              <button
                type="button"
                onClick={handlePrint}
                title="Direct PDF Export: Opens browser print dialog configured to Save as PDF"
                style={{
                  height: '30px',
                  padding: '0 0.85rem',
                  backgroundColor: '#ffffff',
                  color: '#09090b',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                }}
              >
                <Printer size={13} /> PDF
              </button>
              <button
                type="button"
                onClick={handlePrint}
                title="Send report directly to physical printer"
                style={{
                  height: '30px',
                  padding: '0 0.85rem',
                  backgroundColor: '#27272a',
                  color: '#ffffff',
                  border: '1px solid #3f3f46',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                }}
              >
                <Printer size={13} /> Print
              </button>
              <button
                type="button"
                onClick={handleDownload}
                title="Download HTML file for offline archival"
                style={{
                  height: '30px',
                  padding: '0 0.85rem',
                  backgroundColor: '#27272a',
                  color: '#ffffff',
                  border: '1px solid #3f3f46',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                }}
              >
                <Download size={13} /> HTML
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  height: '30px',
                  width: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Iframe displaying the styled report inside centered A4 sheet frame */}
          <div style={{ flex: 1, backgroundColor: '#3f3f4618', padding: '1rem', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                width: '100%',
                maxWidth: '840px',
                height: '100%',
                backgroundColor: '#ffffff',
                borderRadius: '4px',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <iframe
                srcDoc={htmlContent}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  backgroundColor: '#ffffff',
                }}
                title="Report Dossier Preview"
              />
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ── Side-by-Side Planning Version Comparison Modal ───────────────────

interface PlanningCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  planningVersions: PlanningFormVersion[];
  projectTitle: string;
}

function PlanningCompareModal({ isOpen, onClose, planningVersions, projectTitle }: PlanningCompareModalProps) {
  const [verAId, setVerAId] = useState<string>(planningVersions[0]?.id || '');
  const [verBId, setVerBId] = useState<string>(planningVersions[1]?.id || planningVersions[0]?.id || '');

  useEffect(() => {
    if (planningVersions.length >= 2) {
      setVerAId(planningVersions[planningVersions.length - 2].id);
      setVerBId(planningVersions[planningVersions.length - 1].id);
    } else if (planningVersions.length === 1) {
      setVerAId(planningVersions[0].id);
      setVerBId(planningVersions[0].id);
    }
  }, [planningVersions]);

  if (!isOpen) return null;

  const verA = planningVersions.find((v) => v.id === verAId) || planningVersions[0];
  const verB = planningVersions.find((v) => v.id === verBId) || planningVersions[1] || verA;

  const pA = verA ? extractPlanningParameters(verA) : null;
  const pB = verB ? extractPlanningParameters(verB) : null;

  const compRows = [
    { label: 'Version Code', a: verA?.version_code || `V0${verA?.version_number || 1}`, b: verB?.version_code || `V0${verB?.version_number || 1}` },
    { label: 'Formulated By', a: verA?.sender === 'client' ? 'Client' : 'LATRICS Operations', b: verB?.sender === 'client' ? 'Client' : 'LATRICS Operations' },
    { label: 'Submission Timestamp', a: formatTimestamp(verA?.created_at), b: formatTimestamp(verB?.created_at) },
    { label: 'Feasibility Decision', a: pA?.decisionLabel, b: pB?.decisionLabel },
    { label: 'Planned Altitude', a: pA?.altitudeLabel, b: pB?.altitudeLabel },
    { label: 'Front / Side Overlap', a: pA?.overlapLabel, b: pB?.overlapLabel },
    { label: 'Ground Control Points (GCPs)', a: pA?.gcpLabel, b: pB?.gcpLabel },
    { label: 'Airspace Zone', a: pA?.airspaceLabel, b: pB?.airspaceLabel },
    { label: 'Delivery Turnaround SLA', a: pA?.deliveryTimelineLabel, b: pB?.deliveryTimelineLabel },
    { label: 'Client Sign-Off State', a: pA?.clientSignOffLabel, b: pB?.clientSignOffLabel },
    { label: 'Operational Remarks', a: pA?.remarksLabel, b: pB?.remarksLabel },
  ];

  return (
    <Portal>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #09090b',
            width: '100%',
            maxWidth: '920px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '0.85rem 1.25rem',
              backgroundColor: '#09090b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>Side-by-Side Planning Version Comparison</div>
              <div style={{ fontSize: '0.725rem', color: '#a1a1aa' }}>Project: {projectTitle}</div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Selectors Bar */}
          <div
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: '#fafafa',
              borderBottom: '1px solid #e4e4e7',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
            }}
          >
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#52525b', display: 'block', marginBottom: '0.25rem' }}>
                VERSION A (BASE)
              </label>
              <select
                value={verAId}
                onChange={(e) => setVerAId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.75rem',
                  borderRadius: '4px',
                  border: '1px solid #d4d4d8',
                  backgroundColor: '#ffffff',
                  fontWeight: 600,
                  color: '#09090b',
                }}
              >
                {planningVersions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.version_code || `V0${v.version_number || 1}`} ({v.sender === 'client' ? 'Client' : 'OPS'}) - {formatTimestamp(v.created_at)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#52525b', display: 'block', marginBottom: '0.25rem' }}>
                VERSION B (COMPARISON)
              </label>
              <select
                value={verBId}
                onChange={(e) => setVerBId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.75rem',
                  borderRadius: '4px',
                  border: '1px solid #d4d4d8',
                  backgroundColor: '#ffffff',
                  fontWeight: 600,
                  color: '#09090b',
                }}
              >
                {planningVersions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.version_code || `V0${v.version_number || 1}`} ({v.sender === 'client' ? 'Client' : 'OPS'}) - {formatTimestamp(v.created_at)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Comparison Table */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.775rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#09090b', color: '#ffffff', textAlign: 'left' }}>
                  <th style={{ padding: '0.65rem 0.75rem', width: '28%', border: '1px solid #09090b' }}>Calibration Parameter</th>
                  <th style={{ padding: '0.65rem 0.75rem', width: '36%', border: '1px solid #09090b' }}>
                    {verA?.version_code || 'Version A'}
                  </th>
                  <th style={{ padding: '0.65rem 0.75rem', width: '36%', border: '1px solid #09090b' }}>
                    {verB?.version_code || 'Version B'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {compRows.map((row, idx) => {
                  const isDiff = row.a !== row.b;
                  return (
                    <tr
                      key={idx}
                      style={{
                        backgroundColor: isDiff ? '#fefefe' : idx % 2 === 0 ? '#fafafa' : '#ffffff',
                        borderBottom: '1px solid #e4e4e7',
                      }}
                    >
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#09090b', borderRight: '1px solid #e4e4e7' }}>
                        {row.label}
                      </td>
                      <td
                        style={{
                          padding: '0.6rem 0.75rem',
                          color: '#09090b',
                          borderRight: '1px solid #e4e4e7',
                          backgroundColor: isDiff ? '#f4f4f5' : 'inherit',
                          fontWeight: isDiff ? 600 : 400,
                        }}
                      >
                        {row.a || '—'}
                      </td>
                      <td
                        style={{
                          padding: '0.6rem 0.75rem',
                          color: '#09090b',
                          backgroundColor: isDiff ? '#ebebeb' : 'inherit',
                          fontWeight: isDiff ? 700 : 400,
                        }}
                      >
                        {row.b || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ── Main Reports Component ──────────────────────────────────────────

function ReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Role detection
  const isOps = Boolean(user && (user.role === 'admin' || user.role === 'operations' || isLatricsRole(user.role)));
  const isPilot = user?.role?.toLowerCase() === 'pilot';
  const isClient = !isOps && !isPilot;

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('all');
  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [activePreviewTabs, setActivePreviewTabs] = useState<Record<string, 'timeline' | 'payments' | 'documents' | 'planning' | 'communications'>>({});
  const [previewModalData, setPreviewModalData] = useState<{
    isOpen: boolean;
    reportTitle: string;
    project: Project;
    companyName: string;
    sections: Array<{
      title: string;
      subtitle?: string;
      headers: string[];
      rows: (string | number | boolean | null | undefined)[][];
      customHtml?: string;
      countLabel?: string;
    }>;
    onDownloadCsv?: () => void;
  } | null>(null);

  // Loading & raw data
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [bundles, setBundles] = useState<Record<string, ProjectReportBundle>>({});

  // Company helper
  const getCompanyName = useCallback((p: Project): string => {
    const payload = (p.requirements_payload || {}) as Record<string, any>;
    return p.client_company || payload.company_name || p.client_name || 'Client Workspace';
  }, []);

  // Extract Documents from Project Payload and Planning Versions
  const extractDocuments = useCallback(
    (project: Project, planningVersions: PlanningFormVersion[] = []): FormattedDocumentItem[] => {
      const reqPayload = (project.requirements_payload || {}) as Record<string, any>;
      const docs: FormattedDocumentItem[] = [];
      const seen = new Set<string>();

      const addDoc = (
        name: string,
        category: string,
        stage: string,
        size?: string,
        date?: string,
        uploader?: string | null,
        uploaderRole?: string | null,
        desc?: string,
        url?: string
      ) => {
        if (!name || seen.has(name)) return;
        seen.add(name);
        const ext = name.includes('.') ? name.split('.').pop()?.toUpperCase() : 'DOC';
        docs.push({
          id: `doc-${project.id}-${docs.length + 1}`,
          projectId: project.id,
          projectTitle: project.title,
          name,
          category,
          stage: stage || 'Project Document',
          size: size || 'Standard File',
          uploadedBy: (uploader || project.client_name || 'LATRICS Operations'),
          uploaderRole: (uploaderRole || (uploader?.toLowerCase().includes('client') ? 'client' : 'ops')),
          uploadedOn: date || project.created_at,
          timestamp: date || project.created_at,
          description: desc || `${category} document for ${project.title}`,
          url,
          fileExt: ext,
        });
      };

      // 1. KML / Geospatial boundary files (Stage 1: Request)
      if (Array.isArray(reqPayload.kml_files)) {
        reqPayload.kml_files.forEach((f: any) => {
          const name = typeof f === 'string' ? f : f?.name;
          const size = typeof f === 'object' && f?.size ? f.size : undefined;
          const date = typeof f === 'object' && f?.date ? f.date : project.created_at;
          const url = typeof f === 'object' ? f?.url : undefined;
          addDoc(name, 'Boundary / KML', 'Stage 1: Request', size, date, project.client_name || undefined, 'client', 'Flight perimeter & geospatial survey boundary polygon', url);
        });
      }
      if (reqPayload.kml_filename && typeof reqPayload.kml_filename === 'string') {
        reqPayload.kml_filename.split(',').forEach((name: string) => {
          addDoc(name.trim(), 'Boundary / KML', 'Stage 1: Request', undefined, project.created_at, project.client_name || undefined, 'client', 'Flight boundary polygon');
        });
      }

      // 2. Scope Documents (Stage 1: Request)
      if (Array.isArray(reqPayload.scope_files)) {
        reqPayload.scope_files.forEach((f: any) => {
          const name = typeof f === 'string' ? f : f?.name;
          const size = typeof f === 'object' && f?.size ? f.size : undefined;
          const date = typeof f === 'object' && f?.date ? f.date : project.created_at;
          const url = typeof f === 'object' ? f?.url : undefined;
          addDoc(name, 'Scope Document', 'Stage 1: Request', size, date, project.client_name || undefined, 'client', 'Scope of work & survey requirements specification', url);
        });
      }
      if (reqPayload.scope_filename && typeof reqPayload.scope_filename === 'string') {
        reqPayload.scope_filename.split(',').forEach((name: string) => {
          addDoc(name.trim(), 'Scope Document', 'Stage 1: Request', undefined, project.created_at, project.client_name || undefined, 'client', 'Scope of work specification');
        });
      }

      // 3. Survey Deliverables (Stage 6: Delivered)
      if (Array.isArray(reqPayload.attachments)) {
        reqPayload.attachments.forEach((att: any) => {
          if (att && att.name) {
            addDoc(
              att.name,
              att.category || 'Deliverable / Output',
              'Stage 6: Delivered',
              att.size,
              att.date || project.created_at,
              att.uploaded_by || 'LATRICS Operations',
              att.uploaded_role || 'ops',
              att.description || 'Processed survey deliverable',
              att.url
            );
          }
        });
      }

      // 4. Project Documents & Clearances
      if (Array.isArray(reqPayload.documents)) {
        reqPayload.documents.forEach((d: any) => {
          if (d && d.name) {
            addDoc(
              d.name,
              d.category || 'Project Document',
              d.stage || 'Operational Document',
              d.size,
              d.date || project.created_at,
              d.uploaded_by || 'LATRICS Operations',
              d.uploader_role || 'ops',
              d.description,
              d.url
            );
          }
        });
      }

      // 5. Stage 3: Mobilisation Tickets, Confirmations & Advance Slips
      const mobConf = (reqPayload.mobilisationConfirmations || reqPayload.mobilisation || {}) as Record<string, any>;
      if (Array.isArray(mobConf.clientTicketsAndBills)) {
        mobConf.clientTicketsAndBills.forEach((f: any) => {
          const name = typeof f === 'string' ? f : f?.name;
          const size = typeof f === 'object' && f?.size ? f.size : 'Document';
          const date = typeof f === 'object' && (f?.date || f?.uploaded_at) ? (f.date || f.uploaded_at) : project.created_at;
          const url = typeof f === 'object' ? f?.url : undefined;
          addDoc(name, 'Travel Ticket / Bill', 'Stage 3: Mobilising', size, date, project.client_name || undefined, 'client', 'Travel tickets and booking confirmations shared by client', url);
        });
      }
      if (mobConf.latricsAdvanceSlipFile) {
        const f = mobConf.latricsAdvanceSlipFile;
        const name = typeof f === 'string' ? f : f?.name;
        const size = typeof f === 'object' && f?.size ? f.size : 'Deposit Slip';
        const date = typeof f === 'object' && (f?.date || f?.uploaded_at) ? (f.date || f.uploaded_at) : project.created_at;
        const url = typeof f === 'object' ? f?.url : undefined;
        if (name) {
          addDoc(name, 'Advance Deposit Slip', 'Stage 3: Mobilising', size, date, project.client_name || undefined, 'client', 'Advance deposit slip (₹5,000) for Latrics mobilization', url);
        }
      }

      // 6. Documents from Planning Versions (Stage 2: Planning)
      planningVersions.forEach((ver) => {
        if (ver.stage_threads && typeof ver.stage_threads === 'object') {
          Object.values(ver.stage_threads).forEach((msgs: any) => {
            if (Array.isArray(msgs)) {
              msgs.forEach((m: any) => {
                if (m.attachment?.name) {
                  addDoc(
                    m.attachment.name,
                    'Planning Attachment',
                    'Stage 2: Planning',
                    m.attachment.size || 'Attached File',
                    m.timestamp || ver.created_at,
                    m.author || 'LATRICS Ops',
                    m.role?.toLowerCase() === 'client' ? 'client' : 'ops',
                    'Attachment submitted in flight feasibility planning',
                    m.attachment.url
                  );
                }
              });
            }
          });
        }
      });

      docs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      return docs;
    },
    []
  );

  // Extract every communication channel as a de-duplicated, chronologically sortable message list.
  // Each message is emitted exactly once (keyed by its stable id), even though every planning version
  // re-saves the full thread history; `versionCode` records the version it first appeared in.
  const extractCommunications = useCallback(
    (
      project: Project,
      planningVersions: PlanningFormVersion[] = [],
      planningDraft: any = null
    ): FormattedChatMessageItem[] => {
      const reqPayload = (project.requirements_payload || {}) as Record<string, any>;
      const list: FormattedChatMessageItem[] = [];
      const seenIds = new Set<string>();
      const seenContent = new Set<string>();

      const toAttachments = (raw: any): { name: string; size?: string; url?: string }[] => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw.filter(Boolean).map((a) => (typeof a === 'string' ? { name: a } : a));
        return [typeof raw === 'string' ? { name: raw } : raw];
      };

      const tagFor = (roleLabel: string) =>
        roleLabel === 'client' || roleLabel === 'subordinate' ? '[Client]' : roleLabel === 'pilot' ? '[Flight Crew]' : '[LATRICS Ops]';

      const push = (
        item: Omit<FormattedChatMessageItem, 'projectId' | 'projectTitle' | 'senderTag' | 'timestamp' | 'timeRecorded' | 'sortTime'> & {
          rawTimeSource: { id?: string; timestamp?: string };
          fallbackTime: string;
        }
      ) => {
        const { rawTimeSource, fallbackTime, ...rest } = item;
        const message = (rest.message || '').trim();
        if (!message && (!rest.attachments || rest.attachments.length === 0)) return;

        const resolved = resolveMessageTime(rawTimeSource);
        const fallback = new Date(fallbackTime);
        const sortTime = resolved ? resolved.getTime() : Number.isNaN(fallback.getTime()) ? 0 : fallback.getTime();
        const contentKey = `${rest.groupKey}::${rest.senderName}::${message}::${resolved?.getTime() ?? ''}`;
        if (seenIds.has(rest.id) || seenContent.has(contentKey)) return;
        seenIds.add(rest.id);
        seenContent.add(contentKey);

        list.push({
          ...rest,
          message,
          projectId: project.id,
          projectTitle: project.title,
          senderTag: tagFor(rest.roleLabel),
          timestamp: resolved ? resolved.toISOString() : fallbackTime,
          timeRecorded: Boolean(resolved),
          sortTime,
        });
      };

      // ── 1. Client's initial request remarks (first message of Stage 1 · Request) ──
      const initialRemarks = reqPayload.remarks || project.description || reqPayload.survey_description;
      if (typeof initialRemarks === 'string' && initialRemarks.trim()) {
        push({
          id: `initial-req-${project.id}`,
          commType: 'chatbox',
          channel: 'chatbox',
          groupKey: 'chat-1',
          groupTitle: `Stage 1 · ${PROJECT_STAGE_TITLES['1']} — Chatbox`,
          stageKey: '1',
          stageName: 'Stage 1: Request',
          senderName: project.client_name || project.client_company || 'Client',
          senderRole: 'client',
          roleLabel: 'client',
          message: initialRemarks,
          attachments: [],
          rawTimeSource: { timestamp: project.created_at },
          fallbackTime: project.created_at,
        });
      }

      // ── 2. Project stage chatboxes (Stages 1–6) ──
      const stageAlias: Record<string, string> = {
        request: '1', planning: '2', mobilising: '3', capturing: '4', processing: '5', delivered: '6',
      };
      const stageChats = (reqPayload.stage_chats || {}) as Record<string, any[]>;
      Object.entries(stageChats).forEach(([rawKey, msgs]) => {
        if (!Array.isArray(msgs)) return;
        const stageKey = stageAlias[rawKey] || String(rawKey);
        const stageTitle = PROJECT_STAGE_TITLES[stageKey] || `Stage ${stageKey}`;
        msgs.forEach((m, idx) => {
          const roleLabel = normalizeRoleLabel(m.sender_role || m.sender_tag, 'ops');
          push({
            id: m.id || `chat-${project.id}-${stageKey}-${idx}`,
            commType: 'chatbox',
            channel: 'chatbox',
            groupKey: `chat-${stageKey}`,
            groupTitle: `Stage ${stageKey} · ${stageTitle} — Chatbox`,
            stageKey,
            stageName: `Stage ${stageKey}: ${stageTitle}`,
            senderName: m.sender_name || (roleLabel === 'client' ? 'Client' : roleLabel === 'pilot' ? 'Drone Pilot' : 'LATRICS Operations'),
            senderRole: m.sender_role || roleLabel,
            roleLabel,
            message: m.message || '',
            attachments: toAttachments(m.attachments),
            rawTimeSource: { id: m.id, timestamp: m.timestamp },
            fallbackTime: project.created_at,
          });
        });
      });

      // ── 3. Planning remarks (8 sections) & Need More Clarity threads ──
      const sources: Array<{ code: string; createdAt: string; threads: any; clarifications: any; formData: any; senderName?: string }> =
        [...planningVersions]
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((v) => ({
            code: v.version_code || `V${String(v.version_number || 1).padStart(2, '0')}`,
            createdAt: v.created_at,
            threads: v.stage_threads,
            clarifications: v.clarification_threads,
            formData: v.form_data || {},
            senderName: v.sender_name || undefined,
          }));
      if (planningDraft && (planningDraft.stage_threads || planningDraft.clarification_threads)) {
        sources.push({
          code: 'Draft',
          createdAt: planningDraft.updated_at || new Date().toISOString(),
          threads: planningDraft.stage_threads,
          clarifications: planningDraft.clarification_threads,
          formData: planningDraft.form_data || {},
        });
      }

      const planningRole = (m: any) => {
        const fallback = m.role === 'CLIENT' ? 'client' : 'admin';
        return normalizeRoleLabel(m.authorRole, fallback as 'client') || fallback;
      };

      // Index every planning message by id so reply quotes resolve even across versions / sections.
      const parentIndex = new Map<string, any>();
      sources.forEach((src) => {
        Object.values(src.threads || {}).forEach((msgs: any) =>
          Array.isArray(msgs) && msgs.forEach((m: any) => m?.id && !parentIndex.has(m.id) && parentIndex.set(m.id, m))
        );
        (Array.isArray(src.clarifications) ? src.clarifications : []).forEach((ct: any) =>
          (Array.isArray(ct?.messages) ? ct.messages : []).forEach((m: any) => m?.id && !parentIndex.has(m.id) && parentIndex.set(m.id, m))
        );
      });

      const quoteFields = (m: any) => {
        const ref = m.replyTo;
        const parentId = typeof ref === 'object' && ref ? ref.id : ref || m.replyToId;
        if (!parentId && !(typeof ref === 'object' && ref)) return {};
        const parent = parentId ? parentIndex.get(parentId) : null;
        const pTime = parent ? resolveMessageTime({ id: parent.id, timestamp: parent.timestamp }) : null;
        return {
          replyToId: parentId,
          replyToAuthor: parent?.author || ref?.author || 'Unknown',
          replyToRoleLabel: parent ? planningRole(parent) : undefined,
          replyToSnippet: parent?.content || ref?.content || '',
          replyToAttachments: parent ? toAttachments(parent.attachment || parent.attachments) : [],
          replyToTimestamp: pTime ? pTime.toISOString() : undefined,
        };
      };

      sources.forEach((src) => {
        // (a) Section remark threads
        Object.entries(src.threads || {}).forEach(([secNum, msgs]: [string, any]) => {
          if (!Array.isArray(msgs)) return;
          const title = PLANNING_SECTION_TITLES[String(secNum)] || `Section ${secNum}`;
          msgs.forEach((m: any, idx: number) => {
            const roleLabel = planningRole(m);
            push({
              id: m.id || `plan-${secNum}-${src.code}-${idx}`,
              commType: 'remark',
              channel: 'remark',
              groupKey: `remark-${secNum}`,
              groupTitle: `Section ${secNum} · ${title} — Remarks`,
              stageKey: '2',
              stageName: 'Stage 2: Planning',
              sectionNumber: String(secNum),
              sectionName: title,
              versionCode: src.code,
              senderName: m.author || (roleLabel === 'client' ? 'Client' : 'LATRICS Operations'),
              senderRole: roleLabel,
              roleLabel,
              message: m.content || m.text || m.message || '',
              attachments: toAttachments(m.attachment || m.attachments),
              rawTimeSource: { id: m.id, timestamp: m.timestamp },
              fallbackTime: src.createdAt,
              ...quoteFields(m),
            });
          });
        });

        // (b) Need More Clarity threads — current shape {id, questionTitle, messages[]}, legacy {question, reply}
        (Array.isArray(src.clarifications) ? src.clarifications : []).forEach((ct: any, cIdx: number) => {
          const question = ct.questionTitle || ct.question || `Clarification ${cIdx + 1}`;
          const groupKey = `clarify-${ct.id || cIdx}`;
          const groupTitle = `Need More Clarity — ${question}`;
          const base = {
            commType: 'remark' as const,
            channel: 'clarification' as const,
            groupKey,
            groupTitle,
            stageKey: '2',
            stageName: 'Stage 2: Planning',
            sectionName: 'Need More Clarity',
            versionCode: src.code,
          };
          if (Array.isArray(ct.messages)) {
            ct.messages.forEach((m: any, idx: number) => {
              const roleLabel = planningRole(m);
              push({
                ...base,
                id: m.id || `${groupKey}-${idx}`,
                senderName: m.author || (roleLabel === 'client' ? 'Client' : 'LATRICS Operations'),
                senderRole: roleLabel,
                roleLabel,
                message: m.content || '',
                attachments: toAttachments(m.attachment || m.attachments),
                rawTimeSource: { id: m.id, timestamp: m.timestamp },
                fallbackTime: src.createdAt,
                ...quoteFields(m),
              });
            });
          } else if (ct.reply || ct.response || ct.answer) {
            push({
              ...base,
              id: `${groupKey}-reply`,
              senderName: ct.repliedBy || project.client_name || 'Client',
              senderRole: 'client',
              roleLabel: 'client',
              message: ct.reply || ct.response || ct.answer,
              attachments: [],
              rawTimeSource: { timestamp: ct.repliedAt || ct.responseTimestamp },
              fallbackTime: src.createdAt,
            });
          }
        });

        // (c) Ops feasibility decision note — only if the app did not already post it into the Section 8 thread
        const notes = src.formData.decisionRemarks || src.formData.decision_notes;
        if (typeof notes === 'string' && notes.trim()) {
          const alreadyThreaded = (src.threads?.['8'] || []).some((m: any) => (m.content || '').trim() === notes.trim());
          if (!alreadyThreaded) {
            push({
              id: `plan-decision-${src.code}`,
              commType: 'remark',
              channel: 'remark',
              groupKey: 'remark-8',
              groupTitle: `Section 8 · ${PLANNING_SECTION_TITLES['8']} — Remarks`,
              stageKey: '2',
              stageName: 'Stage 2: Planning',
              sectionNumber: '8',
              sectionName: PLANNING_SECTION_TITLES['8'],
              versionCode: src.code,
              senderName: src.senderName || 'LATRICS Operations',
              senderRole: 'ops',
              roleLabel: 'ops',
              message: notes,
              attachments: [],
              rawTimeSource: { timestamp: src.createdAt },
              fallbackTime: src.createdAt,
            });
          }
        }
      });

      // ── 4. Mobilisation discussions — stored per sub-stage in mobilisation.stageThreads ──
      const mob = reqPayload.mobilisation || {};
      const mobThreads: Record<string, any[]> = { ...(mob.stageThreads || {}) };
      if (Array.isArray(mob.discussions)) mobThreads['general'] = mob.discussions; // legacy flat list
      Object.entries(mobThreads).forEach(([subKey, msgs]) => {
        if (!Array.isArray(msgs)) return;
        const subTitle = MOBILISATION_STAGE_TITLES[subKey] || 'General';
        msgs.forEach((m: any, idx: number) => {
          const roleLabel = normalizeRoleLabel(m.author_role || m.role, 'ops');
          push({
            id: m.id || `mob-${project.id}-${subKey}-${idx}`,
            commType: 'chatbox',
            channel: 'mobilisation',
            groupKey: `mob-${subKey}`,
            groupTitle: `Mobilisation · ${subTitle} — Discussion`,
            stageKey: '3',
            stageName: 'Stage 3: Mobilising',
            sectionName: subTitle,
            senderName: m.author || m.author_name || (roleLabel === 'client' ? 'Client' : 'LATRICS Operations'),
            senderRole: roleLabel,
            roleLabel,
            message: m.content || m.text || m.message || '',
            attachments: toAttachments(m.attachment || m.attachments),
            rawTimeSource: { id: m.id, timestamp: m.timestamp || m.created_at },
            fallbackTime: project.created_at,
          });
        });
      });

      // Section 8 (internal feasibility decision) is hidden from client-side reports, mirroring the app.
      const visible = isOps ? list : list.filter((c) => !(c.channel === 'remark' && c.sectionNumber === '8'));
      return visible.sort((a, b) => a.sortTime - b.sortTime);
    },
    [isOps]
  );

  // Fetch report data for all projects
  const loadReportsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const projList = (await projectApi.listProjects()) || [];
      setProjects(projList);

      // Initialize initial bundles
      const initialBundles: Record<string, ProjectReportBundle> = {};
      projList.forEach((p) => {
        initialBundles[p.id] = {
          project: p,
          companyName: getCompanyName(p),
          timeline: [],
          payments: [],
          planningVersions: [],
          documents: extractDocuments(p, []),
          communications: extractCommunications(p, [], null),
          costLedger: [],
          invoices: [],
          wallet: null,
          isLoadingDetails: true,
        };
      });
      setBundles(initialBundles);

      // Default expand all companies for Ops
      const compExpand: Record<string, boolean> = {};
      projList.forEach((p) => {
        const c = getCompanyName(p);
        compExpand[c] = true;
      });
      setExpandedCompanies(compExpand);

      // Fetch async details (timeline, payments, planning versions, planning draft) in parallel
      await Promise.all(
        projList.map(async (p) => {
          let timeline: TimelineEvent[] = [];
          let payments: PaymentRecord[] = [];
          let planningVersions: PlanningFormVersion[] = [];
          let planningDraft: any = null;
          let costLedger: DateWiseCostSummary[] = [];
          let invoices: Invoice[] = [];
          let wallet: ClientWalletSummary | null = null;

          try {
            timeline = (await timelineApi.getProjectTimeline(p.id, undefined, 200)) || [];
          } catch (tErr) {
            console.warn(`Timeline error for ${p.id}:`, tErr);
          }

          try {
            payments = (await paymentsApi.listProjectPayments(p.id)) || [];
          } catch (pErr) {
            console.warn(`Payments error for ${p.id}:`, pErr);
          }

          try {
            planningVersions = (await planningApi.listPlanningVersions(p.id)) || [];
          } catch (plErr) {
            console.warn(`Planning error for ${p.id}:`, plErr);
          }

          try {
            planningDraft = await planningApi.getPlanningDraft(p.id);
          } catch {}

          try {
            costLedger = (await paymentsApi.getProjectCostLedger(p.id)) || [];
          } catch (cErr) {
            console.warn(`Cost ledger error for ${p.id}:`, cErr);
          }

          try {
            invoices = (await paymentsApi.listProjectInvoices(p.id)) || [];
          } catch (iErr) {
            console.warn(`Invoices error for ${p.id}:`, iErr);
          }

          try {
            wallet = (await paymentsApi.getProjectWallet(p.id)) || null;
          } catch (wErr) {
            console.warn(`Wallet error for ${p.id}:`, wErr);
          }

          const sortedTimeline = [...timeline].sort(
            (a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
          );
          const sortedPayments = [...payments].sort(
            (a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
          );
          const sortedPlanning = [...planningVersions].sort(
            (a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
          );
          const aggregatedDocs = extractDocuments(p, sortedPlanning);
          const aggregatedComms = extractCommunications(p, sortedPlanning, planningDraft);
          const enrichedTimeline = enrichTimelineEvents(p, sortedTimeline, sortedPlanning, aggregatedDocs, sortedPayments);

          setBundles((prev) => ({
            ...prev,
            [p.id]: {
              ...prev[p.id],
              timeline: enrichedTimeline,
              payments: sortedPayments,
              planningVersions: sortedPlanning,
              documents: aggregatedDocs,
              communications: aggregatedComms,
              costLedger,
              invoices,
              wallet,
              isLoadingDetails: false,
            },
          }));
        })
      );
    } catch (err) {
      console.error('Failed to load reports data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getCompanyName, extractDocuments, extractCommunications]);

  useEffect(() => {
    loadReportsData();
  }, [loadReportsData]);

  // Group projects by Company
  const companyWiseProjects = useMemo(() => {
    const map: Record<string, Project[]> = {};
    projects.forEach((p) => {
      const c = getCompanyName(p);
      if (!map[c]) map[c] = [];
      map[c].push(p);
    });
    return map;
  }, [projects, getCompanyName]);

  const uniqueCompanies = useMemo(() => {
    return Object.keys(companyWiseProjects).sort();
  }, [companyWiseProjects]);

  // Overall Statistics for KPIs
  const stats = useMemo(() => {
    let totalEvents = 0;
    let totalPayments = 0;
    let totalPlans = 0;
    let totalDocs = 0;
    let totalChats = 0;

    Object.values(bundles).forEach((b) => {
      totalEvents += b.timeline.length;
      const projPaymentCount = Math.max(
        b.wallet?.ledger_entries?.length || 0,
        (b.invoices?.length || 0) + (b.payments?.length || 0)
      );
      totalPayments += projPaymentCount;
      totalPlans += b.planningVersions.length;
      totalDocs += b.documents.length;
      totalChats += b.communications.length;
    });

    return {
      totalProjects: projects.length,
      totalEvents,
      totalPayments,
      totalPlans,
      totalDocs,
      totalChats,
    };
  }, [projects, bundles]);

  // Toggle company accordion
  const toggleCompany = (compName: string) => {
    setExpandedCompanies((prev) => ({ ...prev, [compName]: !prev[compName] }));
  };

  // Toggle project preview
  const toggleProjectPreview = (projId: string) => {
    setExpandedProjects((prev) => {
      const next = !prev[projId];
      if (next && !activePreviewTabs[projId]) {
        setActivePreviewTabs((t) => ({ ...t, [projId]: 'timeline' }));
      }
      return { ...prev, [projId]: next };
    });
  };

  // ── Download Actions per Project ──────────────────────────────────

  const handleDownloadTimeline = (bundle: ProjectReportBundle, format: 'csv' | 'html') => {
    const { project, companyName, timeline } = bundle;
    const today = new Date().toISOString().split('T')[0];
    const slug = slugify(project.title);
    const headers = [
      'Event ID',
      'Timestamp (IST)',
      'Pipeline Stage',
      'Project ID',
      'Project Name',
      'Company Name',
      'Category',
      'Action',
      'Event Title',
      'Description / Message',
      'Actor Name',
      'Actor Role',
    ];
    const rows = timeline.map((evt) => {
      const actor = getEventActor(evt);
      const category = getEventCategory(evt);
      const stage = getEventStage(evt);
      return [
        evt.id,
        formatTimestamp(evt.created_at),
        stage.label,
        project.id,
        project.title,
        companyName,
        category,
        evt.action || 'Activity',
        formatEventTitle(evt),
        evt.description || (evt as any).message || '',
        actor.name,
        actor.role,
      ];
    });

    if (format === 'csv') {
      downloadCsv(`${slug}_Timeline_Execution_Report_${today}.csv`, headers, rows);
    } else {
      downloadHtmlReport(
        `${slug}_Timeline_Execution_Report_${today}.html`,
        'Timeline & Execution Audit Log',
        project,
        companyName,
        [
          {
            title: 'Chronological Execution & Telemetry Events',
            subtitle: 'Timestamped log of flight milestones, pilot deployments, and operational updates.',
            headers: ['Timestamp (IST)', 'Pipeline Stage', 'Category', 'Event Title', 'Description', 'Actor', 'Role'],
            rows: timeline.map((evt) => {
              const actor = getEventActor(evt);
              const category = getEventCategory(evt);
              const stage = getEventStage(evt);
              return [
                formatTimestamp(evt.created_at),
                stage.label,
                category,
                formatEventTitle(evt),
                evt.description || (evt as any).message || '',
                actor.name,
                actor.role,
              ];
            }),
          },
        ]
      );
    }
  };

  const handleDownloadPayments = (bundle: ProjectReportBundle, format: 'csv' | 'html') => {
    const { project, companyName, payments, costLedger = [] } = bundle;
    const today = new Date().toISOString().split('T')[0];
    const slug = slugify(project.title);

    if (format === 'csv') {
      if (costLedger.length > 0) {
        // Date-wise Itemized Cost Ledger CSV
        const headers = [
          'Date',
          'Timestamp (IST)',
          'Sl No',
          'Item Name',
          'Unit Quantity',
          'Price Rate (INR)',
          'Tenure',
          'Net Total Amount (INR)',
          'Invoice Ref',
          'Project ID',
          'Project Title',
          'Company Name'
        ];
        const rows: any[] = [];
        costLedger.forEach((day) => {
          day.items.forEach((item) => {
            rows.push([
              day.date,
              formatTimestamp(item.timestamp || day.timestamp),
              item.sl_no,
              item.item_name,
              item.unit,
              item.price,
              item.tenure || '',
              item.total_price,
              item.invoice_number,
              project.id,
              project.title,
              companyName
            ]);
          });
          rows.push([
            day.date,
            day.timestamp ? formatTimestamp(day.timestamp) : '',
            'TOTAL',
            `Daily Total (${day.total_items_count} items)`,
            '',
            '',
            '',
            day.day_total,
            '',
            project.id,
            project.title,
            companyName
          ]);
        });
        if (payments.length > 0) {
          payments.forEach((p) => {
            const pDate = p.verified_at ? String(p.verified_at).split('T')[0] : (p.created_at ? String(p.created_at).split('T')[0] : 'N/A');
            rows.push([
              pDate,
              formatTimestamp(p.verified_at || p.created_at),
              'REMITTANCE',
              `Payment Received (${p.milestone_name}) via ${p.payment_method || 'NEFT/RTGS'}`,
              '',
              '',
              '',
              p.amount_inr || p.amount_usd || 0,
              p.reference_code || p.bank_reference || 'N/A',
              project.id,
              project.title,
              companyName
            ]);
          });
        }
        downloadCsv(`${slug}_Date_Wise_Cost_Ledger_${today}.csv`, headers, rows);
      } else {
        const headers = [
          'Payment ID',
          'Project ID',
          'Project Name',
          'Company Name',
          'Created Timestamp (IST)',
          'Verified Timestamp (IST)',
          'Milestone Name',
          'Status',
          'Amount (INR)',
          'Amount (USD)',
          'Payment Method',
          'Reference Code / UTR',
          'Bank Reference',
          'Verified By',
          'Notes / Remarks',
        ];
        const rows = payments.map((p) => [
          p.id,
          project.id,
          project.title,
          companyName,
          formatTimestamp(p.created_at),
          formatTimestamp(p.verified_at),
          p.milestone_name,
          String(p.status).toUpperCase(),
          p.amount_inr || p.amount_usd || 0,
          p.amount_usd || 0,
          p.payment_method || 'NEFT / RTGS',
          p.reference_code || p.bank_reference || 'N/A',
          p.bank_reference || 'N/A',
          p.verified_by || 'LATRICS Finance',
          p.notes || '',
        ]);
        downloadCsv(`${slug}_Payment_Records_Ledger_${today}.csv`, headers, rows);
      }
    } else {
      downloadHtmlReport(
        `${slug}_Financial_Cost_Ledger_${today}.html`,
        'Financial & Date-wise Cost Ledger Report',
        project,
        companyName,
        buildPaymentsSections(bundle)
      );
    }
  };

  const handleDownloadDocuments = (bundle: ProjectReportBundle, format: 'csv' | 'html') => {
    const { project, companyName, documents } = bundle;
    const today = new Date().toISOString().split('T')[0];
    const slug = slugify(project.title);
    const headers = [
      'Document ID',
      'Project ID',
      'Project Name',
      'Company Name',
      'Pipeline Stage',
      'Document Category',
      'File Name',
      'File Size',
      'Uploaded By',
      'Uploader Role',
      'Upload Timestamp (IST)',
      'Description / Specification',
    ];
    const rows = documents.map((doc) => [
      doc.id,
      project.id,
      project.title,
      companyName,
      doc.stage || 'Project Document',
      doc.category,
      doc.name,
      doc.size,
      doc.uploadedBy,
      (doc.uploaderRole || 'ops').toUpperCase(),
      formatTimestamp(doc.timestamp),
      doc.description,
    ]);

    if (format === 'csv') {
      downloadCsv(`${slug}_Documentation_Manifest_${today}.csv`, headers, rows);
    } else {
      downloadHtmlReport(
        `${slug}_Documentation_Manifest_${today}.html`,
        'Project Documentation & Deliverable Manifest',
        project,
        companyName,
        [
          {
            title: 'Cataloged Boundary, Scope & Deliverable Files',
            subtitle: 'Verified file uploads, spatial boundary files, and photogrammetry deliverables.',
            headers: ['File Name', 'Category', 'Pipeline Stage', 'Upload Timestamp (IST)', 'File Size', 'Uploaded By', 'Role', 'Description'],
            rows: documents.map((doc) => [
              doc.name,
              doc.category,
              doc.stage || 'Project Document',
              formatTimestamp(doc.timestamp),
              doc.size,
              doc.uploadedBy,
              (doc.uploaderRole || 'ops').toUpperCase(),
              doc.description,
            ]),
          },
        ]
      );
    }
  };

  const handleDownloadPlanning = (bundle: ProjectReportBundle, format: 'csv' | 'html') => {
    const { project, companyName, planningVersions } = bundle;
    const today = new Date().toISOString().split('T')[0];
    const slug = slugify(project.title);
    const headers = [
      'Version ID',
      'Project ID',
      'Project Name',
      'Company Name',
      'Version Code',
      'Submission Timestamp (IST)',
      'Submitted By',
      'Author Name',
      'Status',
      'Feasibility Decision',
      'Planned Altitude',
      'Planned Landings',
      'Overlap (Front / Side)',
      'GCPs Needed',
      'Airspace Zone',
      'Operational Remarks',
    ];
    const rows = planningVersions.map((ver) => {
      const p = extractPlanningParameters(ver);
      const f = ver.form_data || {};
      const senderTag = ver.sender === 'client' ? 'CLIENT' : 'OPS';
      return [
        ver.id,
        project.id,
        project.title,
        companyName,
        ver.version_code || `V0${ver.version_number || 1}`,
        formatTimestamp(ver.created_at),
        senderTag,
        ver.sender_name || (senderTag === 'CLIENT' ? 'Client' : 'LATRICS Ops'),
        ver.status || 'Active',
        p.decisionLabel,
        p.altitudeLabel,
        f.plannedLandings ?? f.landings ?? '—',
        p.overlapLabel,
        p.gcpLabel,
        Array.isArray(f.airspace_zones) ? f.airspace_zones.join('; ') : (f.airspaceZone || 'Green Zone'),
        p.remarksLabel,
      ];
    });

    if (format === 'csv') {
      downloadCsv(`${slug}_Planning_Versions_History_${today}.csv`, headers, rows);
    } else {
      downloadHtmlReport(
        `${slug}_Planning_Versions_History_${today}.html`,
        'Operational Flight Planning Versions & Feasibility',
        project,
        companyName,
        [
          {
            title: 'Flight Feasibility & Parameter Calibration Versions',
            subtitle: 'Iterative operational planning versions, DGCA airspace clearances, and feasibility decisions.',
            headers: ['Version Code', 'Submitted (IST)', 'Sender Tag', 'Feasibility Decision', 'Altitude', 'Overlap (F/S)', 'GCPs', 'Remarks'],
            rows: planningVersions.map((ver) => {
              const p = extractPlanningParameters(ver);
              const senderTag = ver.sender === 'client' ? '[CLIENT]' : '[OPS]';
              return [
                ver.version_code || `V0${ver.version_number || 1}`,
                formatTimestamp(ver.created_at),
                senderTag,
                p.decisionLabel,
                p.altitudeLabel,
                p.overlapLabel,
                p.gcpLabel,
                p.remarksLabel,
              ];
            }),
          },
        ]
      );
    }
  };

  const handleDownloadCommunications = (bundle: ProjectReportBundle, format: 'csv' | 'html') => {
    const { project, companyName, communications } = bundle;
    const today = new Date().toISOString().split('T')[0];
    const slug = slugify(project.title);
    const remarkGroups = buildRemarkGroups(communications, isOps);
    const chatGroups = buildChatGroups(communications);

    if (format === 'csv') {
      downloadCsv(`${slug}_Communications_and_Remarks_Log_${today}.csv`, TRANSCRIPT_CSV_HEADERS, transcriptCsv(remarkGroups, chatGroups));
      return;
    }

    const count = (groups: TranscriptGroup[]) => groups.reduce((n, g) => n + g.messages.length, 0);
    downloadHtmlReport(
      `${slug}_Communications_and_Remarks_Log_${today}.html`,
      'Chats & Planning Remarks Transcript',
      project,
      companyName,
      [
        {
          title: 'A. Planning Remarks',
          subtitle: 'Discussion thread of each planning section in chronological order. Replies quote the message they answer.',
          headers: [],
          rows: [],
          countLabel: `${count(remarkGroups)} messages`,
          customHtml: transcriptSectionHtml(remarkGroups),
        },
        {
          title: 'B. Project Stage Chatbox',
          subtitle: 'Chatbox history of each project stage, including mobilisation discussions, in chronological order.',
          headers: [],
          rows: [],
          countLabel: `${count(chatGroups)} messages`,
          customHtml: transcriptSectionHtml(chatGroups),
        },
      ]
    );
  };

  const handleDownloadFullDossier = (bundle: ProjectReportBundle) => {
    const { project, companyName, timeline, payments, documents, planningVersions, communications } = bundle;
    const today = new Date().toISOString().split('T')[0];
    const slug = slugify(project.title);

    downloadHtmlReport(
      `${slug}_Complete_Project_Dossier_${today}.html`,
      'Complete Project Audit Dossier (All 5 Reports)',
      project,
      companyName,
      buildDossierSections(bundle)
    );
  };

  const renderPaymentsA4PortraitHtml = (bundle: ProjectReportBundle): string => {
    const { project, payments = [], costLedger = [], invoices = [], wallet = null } = bundle;

    // 1. Calculate executive financial metrics
    const totalInvoiced = wallet?.total_billed ?? (
      invoices.length > 0
        ? invoices.reduce((acc, inv) => acc + (inv.total_amount || 0), 0)
        : payments.reduce((acc, p) => acc + (p.amount_inr || p.amount_usd || 0), 0)
    );

    const totalPaid = wallet?.total_paid ?? (
      payments.filter((p) => p.status === 'verified').reduce((acc, p) => acc + (p.amount_inr || p.amount_usd || 0), 0)
    );

    const currentBalance = wallet?.current_balance ?? (totalInvoiced - totalPaid);
    const isDue = currentBalance > 0;
    const balanceColor = isDue ? '#dc2626' : '#16a34a';

    // 2. Aggregate all activities by calendar date
    interface DayEntry {
      date: string;
      timestamp?: string;
      items: Array<{
        sl_no: number;
        item_name: string;
        unit: number;
        price: number;
        tenure?: string;
        total_price: number;
        invoice_number: string;
        timestamp?: string;
      }>;
      payments: Array<PaymentRecord>;
      dayBilled: number;
      dayPaid: number;
    }

    const dateMap = new Map<string, DayEntry>();

    // Process Cost Ledger
    costLedger.forEach((daySummary) => {
      const dKey = daySummary.date;
      if (!dateMap.has(dKey)) {
        dateMap.set(dKey, {
          date: dKey,
          timestamp: daySummary.timestamp,
          items: [],
          payments: [],
          dayBilled: 0,
          dayPaid: 0,
        });
      }
      const entry = dateMap.get(dKey)!;
      if (daySummary.timestamp && !entry.timestamp) {
        entry.timestamp = daySummary.timestamp;
      }
      daySummary.items.forEach((item) => {
        entry.items.push({
          sl_no: item.sl_no,
          item_name: item.item_name,
          unit: item.unit,
          price: item.price,
          tenure: item.tenure,
          total_price: item.total_price,
          invoice_number: item.invoice_number,
          timestamp: item.timestamp,
        });
        entry.dayBilled += item.total_price;
      });
    });

    // Process any Invoices not already covered in costLedger
    invoices.forEach((inv) => {
      const dKey = inv.bill_date ? String(inv.bill_date).split('T')[0] : 'Unspecified Date';
      if (!dateMap.has(dKey) && inv.items && inv.items.length > 0) {
        dateMap.set(dKey, {
          date: dKey,
          timestamp: inv.created_at || (inv.bill_date ? String(inv.bill_date) : undefined),
          items: [],
          payments: [],
          dayBilled: 0,
          dayPaid: 0,
        });
        const entry = dateMap.get(dKey)!;
        inv.items.forEach((item) => {
          entry.items.push({
            sl_no: item.sl_no,
            item_name: item.item_name,
            unit: item.unit,
            price: item.price,
            tenure: item.tenure,
            total_price: item.total_price,
            invoice_number: inv.invoice_number,
            timestamp: inv.created_at || undefined,
          });
          entry.dayBilled += item.total_price;
        });
      }
    });

    // Process Payments / Bank Remittances
    payments.forEach((p) => {
      const pDateRaw = p.verified_at || p.created_at || '';
      const dKey = pDateRaw ? String(pDateRaw).split('T')[0] : 'Unspecified Date';
      if (!dateMap.has(dKey)) {
        dateMap.set(dKey, {
          date: dKey,
          timestamp: pDateRaw,
          items: [],
          payments: [],
          dayBilled: 0,
          dayPaid: 0,
        });
      }
      const entry = dateMap.get(dKey)!;
      entry.payments.push(p);
      const pAmt = p.amount_inr || p.amount_usd || 0;
      if (p.status === 'verified') {
        entry.dayPaid += pAmt;
      }
    });

    const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));
    const totalLineItems = Array.from(dateMap.values()).reduce((sum, d) => sum + d.items.length, 0);

    // 3. Assemble HTML
    let html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #09090b;">
        <!-- Executive Financial Summary KPI Cards -->
        <div class="exec-summary-grid">
          <div class="exec-card">
            <span class="exec-card-title">Total Project Invoiced</span>
            <span class="exec-card-value">₹ ${totalInvoiced.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            <span style="font-size: 0.65rem; color: #71717a;">${invoices.length} Digital Bills Issued</span>
          </div>
          <div class="exec-card">
            <span class="exec-card-title">Payments Received</span>
            <span class="exec-card-value" style="color: #16a34a;">₹ ${totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            <span style="font-size: 0.65rem; color: #71717a;">Verified Bank Remittances</span>
          </div>
          <div class="exec-card">
            <span class="exec-card-title">Outstanding Balance</span>
            <span class="exec-card-value" style="color: ${balanceColor};">
              ₹ ${Math.abs(currentBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span style="font-size: 0.65rem; font-weight: 700; color: ${balanceColor};">
              ${isDue ? 'Payment Pending' : 'Account Settled'}
            </span>
          </div>
          <div class="exec-card">
            <span class="exec-card-title">Ledger Manifest</span>
            <span class="exec-card-value" style="font-size: 0.95rem;">${sortedDates.length} Billing Day${sortedDates.length === 1 ? '' : 's'}</span>
            <span style="font-size: 0.65rem; color: #71717a;">${totalLineItems} Itemized Line Costs</span>
          </div>
        </div>
    `;

    if (sortedDates.length === 0) {
      html += `
        <div style="padding: 2.5rem; text-align: center; color: #71717a; border: 1px dashed #d4d4d8; border-radius: 6px; background: #fafafa;">
          <p style="font-weight: 700; font-size: 0.85rem; color: #09090b; margin: 0;">No Financial Records Logged</p>
          <p style="font-size: 0.725rem; color: #71717a; margin-top: 0.35rem;">When digital bills are issued or payment remittances are confirmed, day-wise records will appear here.</p>
        </div>
      </div>`;
      return html;
    }

    // Render Day Cards
    sortedDates.forEach((dKey) => {
      const entry = dateMap.get(dKey)!;
      let dateFormatted = dKey;
      try {
        const d = new Date(dKey);
        if (!isNaN(d.getTime())) {
          dateFormatted = d.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
        }
      } catch {}

      const timestampLabel = entry.timestamp ? formatTimestamp(entry.timestamp) : null;
      const invoiceRefs = Array.from(new Set(entry.items.map((i) => i.invoice_number).filter(Boolean)));

      html += `
        <div class="day-card">
          <!-- Day Banner / Bill Header Top -->
          <div class="day-header">
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span>${dateFormatted}</span>
              <span style="font-size: 0.68rem; color: #d4d4d8; font-family: monospace;">(${dKey})</span>
              ${invoiceRefs.length > 0 ? `<span style="background: #27272a; color: #38bdf8; font-family: monospace; font-size: 0.7rem; padding: 2px 7px; border-radius: 3px; font-weight: 700;">Ref: ${invoiceRefs.join(', ')}</span>` : ''}
              ${timestampLabel ? `<span class="day-ts">• ${timestampLabel}</span>` : ''}
            </div>
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <span style="font-size: 0.68rem; color: #a1a1aa; font-weight: 500;">${entry.items.length} item${entry.items.length === 1 ? '' : 's'}</span>
              <span style="font-family: monospace; font-size: 0.8rem; font-weight: 800; color: #ffffff; background: #27272a; padding: 2px 7px; border-radius: 4px;">
                Day Bill: ₹ ${entry.dayBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
      `;

      // Itemized table if items exist (Ref and time omitted as stated in bill header top)
      if (entry.items.length > 0) {
        html += `
          <table class="day-table">
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">Sl</th>
                <th>Item / Service Description</th>
                <th style="width: 75px; text-align: center;">Unit / Qty</th>
                <th style="width: 110px; text-align: right;">Rate (INR)</th>
                <th style="width: 80px; text-align: center;">Tenure</th>
                <th style="width: 125px; text-align: right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
        `;

        entry.items.forEach((item) => {
          html += `
            <tr>
              <td style="text-align: center; color: #71717a; font-family: monospace;">${item.sl_no}</td>
              <td style="font-weight: 600; color: #09090b;">
                ${item.item_name}
                ${item.tenure ? `<span style="font-size: 0.65rem; color: #64748b; background: #f1f5f9; padding: 1px 4px; border-radius: 3px; margin-left: 4px;">${item.tenure}</span>` : ''}
              </td>
              <td style="text-align: center; font-family: monospace; color: #52525b;">${item.unit}</td>
              <td style="text-align: right; font-family: monospace; color: #52525b;">₹ ${item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td style="text-align: center; color: #71717a;">${item.tenure || '—'}</td>
              <td style="text-align: right; font-weight: 700; color: #09090b; font-family: monospace;">₹ ${item.total_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          `;
        });

        html += `
            </tbody>
          </table>
        `;
      }

      // Remittance rows if payments exist
      if (entry.payments.length > 0) {
        entry.payments.forEach((p) => {
          const pAmt = p.amount_inr || p.amount_usd || 0;
          const pTs = p.verified_at ? formatTimestamp(p.verified_at) : (p.created_at ? formatTimestamp(p.created_at) : '');
          html += `
            <div style="background: #f0fdf4; border-top: 1px solid #bbf7d0; padding: 0.45rem 0.75rem; display: flex; align-items: center; justify-content: space-between; font-size: 0.725rem;">
              <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
                <span style="font-weight: 700; color: #166534;">💳 Payment Received:</span>
                <span style="color: #14532d; font-weight: 600;">${p.milestone_name}</span>
                <span style="color: #4b5563; font-size: 0.68rem;">(${p.payment_method || 'NEFT/RTGS'})</span>
                <span style="font-family: monospace; font-size: 0.68rem; color: #15803d;">Ref: ${p.reference_code || p.bank_reference || 'N/A'}</span>
              </div>
              <div style="font-family: monospace; font-weight: 800; color: #166534; font-size: 0.8rem; text-align: right;">
                + ₹ ${pAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                ${pTs ? `<br/><span style="font-size: 0.65rem; color: #15803d; font-weight: 500;">${pTs}</span>` : ''}
              </div>
            </div>
          `;
        });
      }

      // Day Footer
      const dayNet = entry.dayBilled - entry.dayPaid;
      html += `
          <div class="day-footer">
            <span style="color: #52525b; font-size: 0.7rem;">Day Summary (${dKey}):</span>
            <div style="display: flex; gap: 1rem; align-items: center; font-family: monospace; font-size: 0.725rem;">
              <span>Billed: <strong style="color: #09090b;">₹ ${entry.dayBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
              <span>Remitted: <strong style="color: #16a34a;">₹ ${entry.dayPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
              <span>Net: <strong style="color: ${dayNet > 0 ? '#dc2626' : '#16a34a'};">₹ ${Math.abs(dayNet).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
            </div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    return html;
  };

  const buildDossierSections = (bundle: ProjectReportBundle) => {
    const { project, timeline, payments, documents, planningVersions, communications } = bundle;
    return [
      {
        title: '1. Timeline & Field Execution History',
        subtitle: 'Full chronological trace of flight operations, pilot movements, and milestones.',
        headers: ['Timestamp (IST)', 'Pipeline Stage', 'Category', 'Event Title', 'Description', 'Actor', 'Role'],
        rows: timeline.map((evt) => {
          const actor = getEventActor(evt);
          const category = getEventCategory(evt);
          const stage = getEventStage(evt);
          return [
            formatTimestamp(evt.created_at),
            stage.label,
            category,
            formatEventTitle(evt),
            evt.description || (evt as any).message || '',
            actor.name,
            actor.role,
          ];
        }),
      },
      {
        title: '2. Payment Records & Financial Ledger',
        subtitle: 'Day-wise timestamped financial ledger of all billings, remittances, and cumulative balances (A4 Portrait Format).',
        headers: [],
        rows: [],
        customHtml: renderPaymentsA4PortraitHtml(bundle),
        countLabel: `${bundle.costLedger?.length || bundle.invoices?.length || bundle.payments?.length || 0} Records`,
      },
      {
        title: '3. Documentation & Deliverables Manifest',
        subtitle: 'All spatial boundary files, scope specifications, mobilisation tickets, and photogrammetry outputs.',
        headers: ['File Name', 'Category', 'Pipeline Stage', 'Upload Timestamp (IST)', 'File Size', 'Uploaded By', 'Role', 'Description'],
        rows: documents.map((doc) => [
          doc.name,
          doc.category,
          doc.stage || 'Project Document',
          formatTimestamp(doc.timestamp),
          doc.size,
          doc.uploadedBy,
          (doc.uploaderRole || 'ops').toUpperCase(),
          doc.description,
        ]),
      },
      {
        title: '4. Operational Planning & Feasibility Versions',
        subtitle: 'Iterative flight parameters, altitude, GCPs, turnaround SLA and sign-off status.',
        headers: ['Version Code', 'Submitted (IST)', 'Sender Tag', 'Feasibility Decision', 'Altitude', 'Overlap (F/S)', 'GCPs', 'Delivery SLA', 'Sign-Off', 'Remarks'],
        rows: planningVersions.map((ver) => {
          const p = extractPlanningParameters(ver);
          const senderTag = ver.sender === 'client' ? '[CLIENT]' : '[OPS]';
          return [
            ver.version_code || `V0${ver.version_number || 1}`,
            formatTimestamp(ver.created_at),
            senderTag,
            p.decisionLabel,
            p.altitudeLabel,
            p.overlapLabel,
            p.gcpLabel,
            p.deliveryTimelineLabel,
            p.clientSignOffLabel,
            p.remarksLabel,
          ];
        }),
      },
      {
        title: '5A. Planning Remarks',
        subtitle: 'Discussion thread of each planning section in chronological order. Replies quote the message they answer.',
        headers: [],
        rows: [],
        countLabel: `${communications.filter((c) => c.commType === 'remark').length} messages`,
        customHtml: transcriptSectionHtml(buildRemarkGroups(communications, isOps)),
      },
      {
        title: '5B. Project Stage Chatbox',
        subtitle: 'Chatbox history of each project stage, including mobilisation discussions, in chronological order.',
        headers: [],
        rows: [],
        countLabel: `${communications.filter((c) => c.commType === 'chatbox').length} messages`,
        customHtml: transcriptSectionHtml(buildChatGroups(communications)),
      },
    ];
  };

  const buildTimelineSections = (bundle: ProjectReportBundle) => {
    const { timeline } = bundle;
    return [
      {
        title: 'Chronological Execution & Telemetry Events',
        subtitle: 'Timestamped log of flight milestones, pilot deployments, and operational updates.',
        headers: ['Timestamp (IST)', 'Pipeline Stage', 'Category', 'Event Title', 'Description', 'Actor', 'Role'],
        rows: timeline.map((evt) => {
          const actor = getEventActor(evt);
          const category = getEventCategory(evt);
          const stage = getEventStage(evt);
          return [
            formatTimestamp(evt.created_at),
            stage.label,
            category,
            formatEventTitle(evt),
            evt.description || (evt as any).message || '',
            actor.name,
            actor.role,
          ];
        }),
      },
    ];
  };

  const buildPaymentsSections = (bundle: ProjectReportBundle) => {
    const { payments, invoices = [] } = bundle;
    const sections: any[] = [];

    // 1. Day-wise Itemized Financial Ledger (A4 Portrait Format)
    sections.push({
      title: 'Project Financial Statement & Date-wise Ledger',
      subtitle: 'Day-by-day timestamped record of digital bills, itemized line costs, payment remittances, and running balances (A4 Portrait Format).',
      headers: [],
      rows: [],
      customHtml: renderPaymentsA4PortraitHtml(bundle),
      countLabel: `${bundle.costLedger?.length || 0} Billing Days`,
    });

    // 2. Generated Digital Bills & Invoices
    if (invoices.length > 0) {
      sections.push({
        title: 'Generated Digital Bills & Invoices',
        subtitle: 'Finalized project billing invoices with cumulative wallet balance updates.',
        headers: ['Invoice No.', 'Bill Date & Time', 'Due Date', 'Items Count', 'Total Bill (INR)', 'Status', 'Generated By'],
        rows: invoices.map((inv) => [
          inv.invoice_number,
          inv.created_at ? formatTimestamp(inv.created_at) : (inv.bill_date ? String(inv.bill_date).split('T')[0] : '—'),
          inv.due_date ? String(inv.due_date).split('T')[0] : '—',
          inv.items ? inv.items.length : 0,
          `₹ ${inv.total_amount.toLocaleString('en-IN')}`,
          inv.status.toUpperCase(),
          inv.created_by || 'Ops Admin',
        ]),
      });
    }

    // 3. Milestone Payments & Disbursements
    if (payments.length > 0) {
      sections.push({
        title: 'Milestone Payments & Receipts',
        subtitle: 'Verified financial disbursements, tax receipts, and bank transaction references.',
        headers: ['Milestone Name', 'Created (IST)', 'Verified (IST)', 'Status', 'Amount (INR)', 'Reference UTR', 'Verified By'],
        rows: payments.map((p) => [
          p.milestone_name,
          formatTimestamp(p.created_at),
          formatTimestamp(p.verified_at),
          String(p.status).toUpperCase(),
          `₹ ${(p.amount_inr || p.amount_usd || 0).toLocaleString('en-IN')}`,
          p.reference_code || p.bank_reference || 'N/A',
          p.verified_by || 'LATRICS Finance',
        ]),
      });
    }

    return sections;
  };

  const buildDocumentsSections = (bundle: ProjectReportBundle) => {
    const { documents } = bundle;
    return [
      {
        title: 'Cataloged Boundary, Scope, Mobilisation & Deliverable Files',
        subtitle: 'Verified file uploads, spatial boundary files, and photogrammetry deliverables.',
        headers: ['File Name', 'Category', 'Pipeline Stage', 'Upload Timestamp (IST)', 'File Size', 'Uploaded By', 'Role', 'Description'],
        rows: documents.map((doc) => [
          doc.name,
          doc.category,
          doc.stage || 'Project Document',
          formatTimestamp(doc.timestamp),
          doc.size,
          doc.uploadedBy,
          (doc.uploaderRole || 'ops').toUpperCase(),
          doc.description,
        ]),
      },
    ];
  };

  const buildPlanningSections = (bundle: ProjectReportBundle) => {
    const { planningVersions } = bundle;
    return [
      {
        title: 'Flight Feasibility & Parameter Calibration Versions',
        subtitle: 'Iterative operational planning versions, DGCA airspace clearances, and feasibility decisions.',
        headers: ['Version Code', 'Submitted (IST)', 'Sender Tag', 'Feasibility Decision', 'Altitude', 'Overlap (F/S)', 'GCPs', 'Delivery SLA', 'Sign-Off', 'Remarks'],
        rows: planningVersions.map((ver) => {
          const p = extractPlanningParameters(ver);
          const senderTag = ver.sender === 'client' ? '[CLIENT]' : '[OPS]';
          return [
            ver.version_code || `V0${ver.version_number || 1}`,
            formatTimestamp(ver.created_at),
            senderTag,
            p.decisionLabel,
            p.altitudeLabel,
            p.overlapLabel,
            p.gcpLabel,
            p.deliveryTimelineLabel,
            p.clientSignOffLabel,
            p.remarksLabel,
          ];
        }),
      },
    ];
  };

  const buildCommunicationsSections = (bundle: ProjectReportBundle) => {
    const { communications } = bundle;
    const remarkGroups = buildRemarkGroups(communications, isOps);
    const chatGroups = buildChatGroups(communications);
    const count = (groups: TranscriptGroup[]) => groups.reduce((n, g) => n + g.messages.length, 0);
    return [
      {
        title: 'A. Planning Remarks',
        subtitle: 'Discussion thread of each planning section in chronological order. Replies quote the message they answer.',
        headers: [],
        rows: [],
        countLabel: `${count(remarkGroups)} messages`,
        customHtml: transcriptSectionHtml(remarkGroups),
      },
      {
        title: 'B. Project Stage Chatbox',
        subtitle: 'Chatbox history of each project stage, including mobilisation discussions, in chronological order.',
        headers: [],
        rows: [],
        countLabel: `${count(chatGroups)} messages`,
        customHtml: transcriptSectionHtml(chatGroups),
      },
    ];
  };

  const handlePrintFullDossier = (bundle: ProjectReportBundle) => {
    openPrintReport(
      'Complete Project Audit Dossier (All 5 Reports)',
      bundle.project,
      bundle.companyName,
      buildDossierSections(bundle)
    );
  };

  const handlePreviewFullDossier = (bundle: ProjectReportBundle) => {
    setPreviewModalData({
      isOpen: true,
      reportTitle: 'Complete Project Audit Dossier (All 5 Reports)',
      project: bundle.project,
      companyName: bundle.companyName,
      sections: buildDossierSections(bundle),
    });
  };

  const handlePrintTimeline = (bundle: ProjectReportBundle) => {
    openPrintReport('Timeline & Execution Audit Log', bundle.project, bundle.companyName, buildTimelineSections(bundle));
  };

  const handlePreviewTimeline = (bundle: ProjectReportBundle) => {
    setPreviewModalData({
      isOpen: true,
      reportTitle: 'Timeline & Execution Audit Log',
      project: bundle.project,
      companyName: bundle.companyName,
      sections: buildTimelineSections(bundle),
      onDownloadCsv: () => handleDownloadTimeline(bundle, 'csv'),
    });
  };

  const handlePrintPayments = (bundle: ProjectReportBundle) => {
    openPrintReport('Milestone Payment Records & Financial Ledger', bundle.project, bundle.companyName, buildPaymentsSections(bundle));
  };

  const handlePreviewPayments = (bundle: ProjectReportBundle) => {
    setPreviewModalData({
      isOpen: true,
      reportTitle: 'Milestone Payment Records & Financial Ledger',
      project: bundle.project,
      companyName: bundle.companyName,
      sections: buildPaymentsSections(bundle),
      onDownloadCsv: () => handleDownloadPayments(bundle, 'csv'),
    });
  };

  const handlePrintDocuments = (bundle: ProjectReportBundle) => {
    openPrintReport('Project Documentation & Deliverable Manifest', bundle.project, bundle.companyName, buildDocumentsSections(bundle));
  };

  const handlePreviewDocuments = (bundle: ProjectReportBundle) => {
    setPreviewModalData({
      isOpen: true,
      reportTitle: 'Project Documentation & Deliverable Manifest',
      project: bundle.project,
      companyName: bundle.companyName,
      sections: buildDocumentsSections(bundle),
      onDownloadCsv: () => handleDownloadDocuments(bundle, 'csv'),
    });
  };

  const handlePrintPlanning = (bundle: ProjectReportBundle) => {
    openPrintReport('Operational Flight Planning Versions & Feasibility', bundle.project, bundle.companyName, buildPlanningSections(bundle));
  };

  const handlePreviewPlanning = (bundle: ProjectReportBundle) => {
    setPreviewModalData({
      isOpen: true,
      reportTitle: 'Operational Flight Planning Versions & Feasibility',
      project: bundle.project,
      companyName: bundle.companyName,
      sections: buildPlanningSections(bundle),
      onDownloadCsv: () => handleDownloadPlanning(bundle, 'csv'),
    });
  };

  const handlePrintCommunications = (bundle: ProjectReportBundle) => {
    openPrintReport('Chats & Planning Remarks Transcript', bundle.project, bundle.companyName, buildCommunicationsSections(bundle));
  };

  const handlePreviewCommunications = (bundle: ProjectReportBundle) => {
    setPreviewModalData({
      isOpen: true,
      reportTitle: 'Chats & Planning Remarks Transcript',
      project: bundle.project,
      companyName: bundle.companyName,
      sections: buildCommunicationsSections(bundle),
      onDownloadCsv: () => handleDownloadCommunications(bundle, 'csv'),
    });
  };

  // Ops Company Master Export
  const handleExportCompanyBundle = (compName: string) => {
    const compProjects = companyWiseProjects[compName] || [];
    const today = new Date().toISOString().split('T')[0];
    const slug = slugify(compName);

    // Combine all events across all projects for this company
    const combinedRows: any[] = [];
    compProjects.forEach((p) => {
      const b = bundles[p.id];
      if (!b) return;
      b.timeline.forEach((evt) => {
        const actor = getEventActor(evt);
        const category = getEventCategory(evt);
        combinedRows.push([
          formatTimestamp(evt.created_at),
          p.title,
          'Timeline Event',
          category,
          formatEventTitle(evt),
          evt.description || (evt as any).message || '',
          `${actor.name} (${actor.role})`,
        ]);
      });
      b.payments.forEach((pay) => {
        combinedRows.push([
          formatTimestamp(pay.created_at),
          p.title,
          'Payment Record',
          String(pay.status).toUpperCase(),
          pay.milestone_name,
          `Amount: ₹${(pay.amount_inr || pay.amount_usd || 0).toLocaleString('en-IN')}`,
          pay.verified_by || 'Finance',
        ]);
      });
      b.documents.forEach((doc) => {
        combinedRows.push([
          formatTimestamp(doc.timestamp),
          p.title,
          'Document Manifest',
          doc.category,
          doc.name,
          `Size: ${doc.size}`,
          `${doc.uploadedBy} (${(doc.uploaderRole || 'ops').toUpperCase()})`,
        ]);
      });
      b.planningVersions.forEach((ver) => {
        const pl = extractPlanningParameters(ver);
        combinedRows.push([
          formatTimestamp(ver.created_at),
          p.title,
          'Planning Version',
          ver.version_code || 'V01',
          pl.decisionLabel,
          `Alt: ${pl.altitudeLabel} | Overlap: ${pl.overlapLabel} | GCPs: ${pl.gcpLabel} | ${pl.remarksLabel}`,
          ver.sender_name || (ver.sender === 'client' ? 'Client' : 'LATRICS Ops'),
        ]);
      });
      b.communications.forEach((msg) => {
        combinedRows.push([
          formatTimestamp(msg.timestamp),
          p.title,
          msg.commType === 'remark' ? 'Planning Form Remark' : 'Stage Chat Box',
          msg.commType === 'remark' ? (msg.sectionName || `Section ${msg.sectionNumber}`) : msg.stageName,
          msg.versionCode ? `${msg.versionCode} — ${msg.senderTag}` : msg.senderTag,
          msg.replyToAuthor ? `↳ In reply to ${msg.replyToAuthor}: "${msg.replyToSnippet || ''}" | ${msg.message}` : msg.message,
          msg.senderName,
        ]);
      });
    });

    // Sort all rows newest first
    combinedRows.sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());

    downloadCsv(
      `${slug}_Consolidated_Audit_Report_${today}.csv`,
      ['Timestamp (IST)', 'Project Title', 'Record Type', 'Category / Status', 'Item Name / Stage', 'Details / Message', 'Actor'],
      combinedRows
    );
  };

  // Filtered companies based on search
  const filteredCompanies = useMemo(() => {
    if (!isOps) return [];
    let list = uniqueCompanies;
    if (selectedCompanyFilter !== 'all') {
      list = list.filter((c) => c === selectedCompanyFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => {
        if (c.toLowerCase().includes(q)) return true;
        const compProjs = companyWiseProjects[c] || [];
        return compProjs.some((p) => p.title.toLowerCase().includes(q));
      });
    }
    return list;
  }, [isOps, uniqueCompanies, selectedCompanyFilter, searchQuery, companyWiseProjects]);

  // Filtered projects for Client view
  const clientProjects = useMemo(() => {
    if (isOps) return [];
    let list = projects;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.city && p.city.toLowerCase().includes(q)) ||
          (p.state && p.state.toLowerCase().includes(q))
      );
    }
    return list;
  }, [isOps, projects, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem' }}>
      {/* ── 1. Page Header with Universal PageHeader ── */}
      <PageHeader
        title="Report"
        subtitle="Timestamped project timeline logs, verified payment ledgers, documentation manifests, planning versions, and stage communication transcripts."
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {/* Real-time search */}
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              color="#71717a"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
            <input
              type="text"
              placeholder={isOps ? 'Search company or project...' : 'Search your projects...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{
                height: '36px',
                paddingLeft: '2rem',
                paddingRight: '1.75rem',
                fontSize: '0.8rem',
                borderRadius: '6px',
                border: '1px solid #e4e4e7',
                width: '230px',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#71717a',
                  padding: 0,
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Refresh action */}
          <button
            onClick={() => loadReportsData()}
            title="Refresh reports"
            style={{
              height: '36px',
              padding: '0 0.85rem',
              border: '1px solid #e4e4e7',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#09090b',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </PageHeader>

      {/* ── 2. Top Metric KPI Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#71717a' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Active Projects</span>
            <Folder size={16} />
          </div>
          <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.02em' }}>
            {stats.totalProjects}
          </span>
          <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Ready for export</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#71717a' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Timeline Events</span>
            <Clock size={16} />
          </div>
          <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.02em' }}>
            {stats.totalEvents}
          </span>
          <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Timestamped logs</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#71717a' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Payment Records</span>
            <CreditCard size={16} />
          </div>
          <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.02em' }}>
            {stats.totalPayments}
          </span>
          <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Milestones tracked</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#71717a' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Planning Versions</span>
            <Layers size={16} />
          </div>
          <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.02em' }}>
            {stats.totalPlans}
          </span>
          <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Calibrated versions</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#71717a' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Communications</span>
            <MessageSquare size={16} />
          </div>
          <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.02em' }}>
            {stats.totalChats}
          </span>
          <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Stage chat records</span>
        </div>
      </div>

      {/* ── 3. Main Report Hub View ── */}
      {isLoading ? (
        <div style={{ padding: '4rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
          <Loader2 size={32} className="animate-spin" color="#09090b" />
          <span style={{ fontSize: '0.85rem', color: '#71717a', fontWeight: 500 }}>
            Cataloging project audit reports, timeline logs &amp; financial records...
          </span>
        </div>
      ) : isOps ? (
        /* ══════════════════════════════════════════════════════════
           OPERATIONS VIEW: COMPANY WISE -> PROJECT WISE
           ══════════════════════════════════════════════════════════ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredCompanies.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e4e4e7' }}>
              <Building2 size={36} color="#a1a1aa" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b', margin: 0 }}>No Companies or Projects Found</h3>
              <p style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '0.25rem' }}>
                {searchQuery ? `No records matching "${searchQuery}".` : 'No survey projects have been registered yet.'}
              </p>
            </div>
          ) : (
            filteredCompanies.map((compName) => {
              const compProjects = (companyWiseProjects[compName] || []).filter((p) => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return p.title.toLowerCase().includes(q) || compName.toLowerCase().includes(q);
              });

              if (compProjects.length === 0) return null;
              const isExpanded = expandedCompanies[compName] !== false;

              return (
                <div
                  key={compName}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e4e4e7',
                    overflow: 'hidden',
                  }}
                >
                  {/* Company Accordion Header */}
                  <div
                    style={{
                      padding: '0.9rem 1.25rem',
                      backgroundColor: '#fafafa',
                      borderBottom: isExpanded ? '1px solid #e4e4e7' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div
                      onClick={() => toggleCompany(compName)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <Building2 size={18} color="#09090b" />
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.01em' }}>
                        {compName}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: '#f4f4f5',
                          border: '1px solid #e4e4e7',
                          color: '#09090b',
                          padding: '0.1rem 0.5rem',
                          borderRadius: '12px',
                        }}
                      >
                        {compProjects.length} {compProjects.length === 1 ? 'Project' : 'Projects'}
                      </span>
                      {isExpanded ? <ChevronDown size={16} color="#71717a" /> : <ChevronRight size={16} color="#71717a" />}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleExportCompanyBundle(compName)}
                        title="Export consolidated master CSV for all projects under this company"
                        style={{
                          height: '32px',
                          padding: '0 0.75rem',
                          backgroundColor: '#ffffff',
                          border: '1px solid #d4d4d8',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#09090b',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          cursor: 'pointer',
                        }}
                      >
                        <FileSpreadsheet size={13} color="#09090b" />
                        <span>Export All Company Reports (CSV)</span>
                      </button>
                    </div>
                  </div>

                  {/* Company Projects List */}
                  {isExpanded && (
                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {compProjects.map((p) => {
                        const b = bundles[p.id] || {
                          project: p,
                          companyName: compName,
                          timeline: [],
                          payments: [],
                          planningVersions: [],
                          documents: extractDocuments(p),
                          communications: extractCommunications(p),
                          costLedger: [],
                          invoices: [],
                          wallet: null,
                          isLoadingDetails: false,
                        };

                        return (
                          <ProjectReportCard
                            key={p.id}
                            bundle={b}
                            isPreviewOpen={Boolean(expandedProjects[p.id])}
                            isOps={isOps}
                            activeTab={activePreviewTabs[p.id] || 'timeline'}
                            onTogglePreview={() => toggleProjectPreview(p.id)}
                            onSelectTab={(tab) => setActivePreviewTabs((prev) => ({ ...prev, [p.id]: tab }))}
                            onDownloadTimeline={(fmt) => handleDownloadTimeline(b, fmt)}
                            onDownloadPayments={(fmt) => handleDownloadPayments(b, fmt)}
                            onDownloadDocuments={(fmt) => handleDownloadDocuments(b, fmt)}
                            onDownloadPlanning={(fmt) => handleDownloadPlanning(b, fmt)}
                            onDownloadCommunications={(fmt) => handleDownloadCommunications(b, fmt)}
                            onDownloadFullDossier={() => handleDownloadFullDossier(b)}
                            onPrintTimeline={() => handlePrintTimeline(b)}
                            onPrintPayments={() => handlePrintPayments(b)}
                            onPrintDocuments={() => handlePrintDocuments(b)}
                            onPrintPlanning={() => handlePrintPlanning(b)}
                            onPrintCommunications={() => handlePrintCommunications(b)}
                            onPrintFullDossier={() => handlePrintFullDossier(b)}
                            onPreviewFullDossier={() => handlePreviewFullDossier(b)}
                            onPreviewTimeline={() => handlePreviewTimeline(b)}
                            onPreviewPayments={() => handlePreviewPayments(b)}
                            onPreviewDocuments={() => handlePreviewDocuments(b)}
                            onPreviewPlanning={() => handlePreviewPlanning(b)}
                            onPreviewCommunications={() => handlePreviewCommunications(b)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════
           CLIENT VIEW: PROJECT WISE DIRECT DIRECTORY
           ══════════════════════════════════════════════════════════ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {clientProjects.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e4e4e7' }}>
              <Folder size={36} color="#a1a1aa" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b', margin: 0 }}>No Survey Projects Found</h3>
              <p style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '0.25rem' }}>
                {searchQuery ? `No projects matching "${searchQuery}".` : 'Your survey projects and downloadable reports will appear here.'}
              </p>
            </div>
          ) : (
            clientProjects.map((p) => {
              const b = bundles[p.id] || {
                project: p,
                companyName: getCompanyName(p),
                timeline: [],
                payments: [],
                planningVersions: [],
                documents: extractDocuments(p),
                communications: extractCommunications(p),
                costLedger: [],
                invoices: [],
                wallet: null,
                isLoadingDetails: false,
              };

              return (
                <ProjectReportCard
                  key={p.id}
                  bundle={b}
                  isPreviewOpen={Boolean(expandedProjects[p.id])}
                  isOps={isOps}
                  activeTab={activePreviewTabs[p.id] || 'timeline'}
                  onTogglePreview={() => toggleProjectPreview(p.id)}
                  onSelectTab={(tab) => setActivePreviewTabs((prev) => ({ ...prev, [p.id]: tab }))}
                  onDownloadTimeline={(fmt) => handleDownloadTimeline(b, fmt)}
                  onDownloadPayments={(fmt) => handleDownloadPayments(b, fmt)}
                  onDownloadDocuments={(fmt) => handleDownloadDocuments(b, fmt)}
                  onDownloadPlanning={(fmt) => handleDownloadPlanning(b, fmt)}
                  onDownloadCommunications={(fmt) => handleDownloadCommunications(b, fmt)}
                  onDownloadFullDossier={() => handleDownloadFullDossier(b)}
                  onPrintTimeline={() => handlePrintTimeline(b)}
                  onPrintPayments={() => handlePrintPayments(b)}
                  onPrintDocuments={() => handlePrintDocuments(b)}
                  onPrintPlanning={() => handlePrintPlanning(b)}
                  onPrintCommunications={() => handlePrintCommunications(b)}
                  onPrintFullDossier={() => handlePrintFullDossier(b)}
                  onPreviewFullDossier={() => handlePreviewFullDossier(b)}
                  onPreviewTimeline={() => handlePreviewTimeline(b)}
                  onPreviewPayments={() => handlePreviewPayments(b)}
                  onPreviewDocuments={() => handlePreviewDocuments(b)}
                  onPreviewPlanning={() => handlePreviewPlanning(b)}
                  onPreviewCommunications={() => handlePreviewCommunications(b)}
                />
              );
            })
          )}
        </div>
      )}

      {/* ── Document Preview Modal (In-App Vector PDF & Print Engine) ── */}
      {previewModalData && (
        <ReportPreviewModal
          isOpen={previewModalData.isOpen}
          onClose={() => setPreviewModalData(null)}
          reportTitle={previewModalData.reportTitle}
          project={previewModalData.project}
          companyName={previewModalData.companyName}
          sections={previewModalData.sections}
          onDownloadCsv={previewModalData.onDownloadCsv}
        />
      )}
    </div>
  );
}

// ── Project Report Card Component ───────────────────────────────────

interface ProjectReportCardProps {
  bundle: ProjectReportBundle;
  isPreviewOpen: boolean;
  activeTab: 'timeline' | 'payments' | 'documents' | 'planning' | 'communications';
  onTogglePreview: () => void;
  onSelectTab: (tab: 'timeline' | 'payments' | 'documents' | 'planning' | 'communications') => void;
  onDownloadTimeline: (format: 'csv' | 'html') => void;
  onDownloadPayments: (format: 'csv' | 'html') => void;
  onDownloadDocuments: (format: 'csv' | 'html') => void;
  onDownloadPlanning: (format: 'csv' | 'html') => void;
  onDownloadCommunications: (format: 'csv' | 'html') => void;
  onDownloadFullDossier: () => void;
  onPrintTimeline: () => void;
  onPrintPayments: () => void;
  onPrintDocuments: () => void;
  onPrintPlanning: () => void;
  onPrintCommunications: () => void;
  onPrintFullDossier: () => void;
  onPreviewFullDossier: () => void;
  onPreviewTimeline: () => void;
  onPreviewPayments: () => void;
  onPreviewDocuments: () => void;
  onPreviewPlanning: () => void;
  onPreviewCommunications: () => void;
  isOps: boolean;
}

function ProjectReportCard({
  bundle,
  isOps,
  isPreviewOpen,
  activeTab,
  onTogglePreview,
  onSelectTab,
  onDownloadTimeline,
  onDownloadPayments,
  onDownloadDocuments,
  onDownloadPlanning,
  onDownloadCommunications,
  onDownloadFullDossier,
  onPrintTimeline,
  onPrintPayments,
  onPrintDocuments,
  onPrintPlanning,
  onPrintCommunications,
  onPrintFullDossier,
  onPreviewFullDossier,
  onPreviewTimeline,
  onPreviewPayments,
  onPreviewDocuments,
  onPreviewPlanning,
  onPreviewCommunications,
}: ProjectReportCardProps) {
  const { project, companyName, timeline, payments, documents, planningVersions, communications, costLedger = [], invoices = [], wallet = null, isLoadingDetails } = bundle;
  const paymentRecordsCount = Math.max(
    wallet?.ledger_entries?.length || 0,
    (invoices?.length || 0) + (payments?.length || 0)
  );
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);
  const [expandedCategory, setExpandedCategory] = useState<'timeline' | 'payments' | 'documents' | 'planning' | 'communications' | null>(null);

  const categories = useMemo(
    () => [
      {
        id: 'timeline' as const,
        name: 'Timeline',
        count: isLoadingDetails ? '...' : `${timeline.length} evts`,
        icon: Clock,
        onPreview: onPreviewTimeline,
      },
      {
        id: 'payments' as const,
        name: 'Payments',
        count: isLoadingDetails ? '...' : `${paymentRecordsCount} rcrd`,
        icon: CreditCard,
        onPreview: onPreviewPayments,
      },
      {
        id: 'documents' as const,
        name: 'Documents',
        count: `${documents.length} docs`,
        icon: FileText,
        onPreview: onPreviewDocuments,
      },
      {
        id: 'planning' as const,
        name: 'Planning',
        count: isLoadingDetails ? '...' : `${planningVersions.length} vers`,
        icon: Layers,
        onPreview: onPreviewPlanning,
      },
      {
        id: 'communications' as const,
        name: 'Chats',
        count: `${communications.length} msgs`,
        icon: MessageSquare,
        onPreview: onPreviewCommunications,
      },
    ],
    [
      isLoadingDetails,
      timeline.length,
      paymentRecordsCount,
      documents.length,
      planningVersions.length,
      communications.length,
      onPreviewTimeline,
      onPreviewPayments,
      onPreviewDocuments,
      onPreviewPlanning,
      onPreviewCommunications,
    ]
  );

  const chatGroups = useMemo(() => buildChatGroups(communications), [communications]);
  const reqPayload = (project.requirements_payload || {}) as Record<string, any>;
  const locationStr = [project.city, project.state].filter(Boolean).join(', ') || project.survey_location || 'Site Location';

  // Normalize date-wise billing line items guaranteed to match generated invoices
  const normalizedDateLedger = useMemo(() => {
    if (costLedger && costLedger.length > 0) {
      return costLedger.map((d) => {
        const items = (d.items || []).map((it) => {
          let tot = it.total_price;
          const mult = it.multiply_tenure;
          const tenureVal = parseFloat(String(it.tenure || '').replace(/[^\d.]/g, '')) || 1;
          if (mult === true) {
            tot = Math.round((it.unit || 1) * (it.price || 0) * tenureVal * 100) / 100;
          } else if (mult === false) {
            tot = Math.round((it.unit || 1) * (it.price || 0) * 100) / 100;
          } else if (tot === undefined || tot === null || tot <= 0) {
            tot = Math.round((it.unit || 1) * (it.price || 0) * 100) / 100;
          }
          const itemStage = it.stage || getEventStage({ action: 'invoice', category: 'payment', created_at: it.timestamp || d.date } as any, project).label;
          return {
            ...it,
            total_price: tot,
            stage: itemStage,
          };
        });
        const dayTotal = items.reduce((acc, i) => acc + (i.total_price || 0), 0);
        return {
          ...d,
          items,
          day_total: dayTotal,
        };
      });
    }

    if (invoices && invoices.length > 0) {
      const activeInvoices = invoices.filter((inv) => (inv.status || '').toLowerCase() !== 'cancelled');
      const dateMap: Record<string, { date: string; timestamp?: string; items: any[]; day_total: number }> = {};
      activeInvoices.forEach((inv) => {
        const dStr = inv.bill_date ? String(inv.bill_date).split('T')[0] : (inv.created_at ? String(inv.created_at).split('T')[0] : 'Unspecified Date');
        if (!dateMap[dStr]) {
          dateMap[dStr] = {
            date: dStr,
            timestamp: inv.created_at || inv.bill_date || undefined,
            items: [],
            day_total: 0,
          };
        }
        const invItems = inv.items && inv.items.length > 0 ? inv.items : [
          {
            sl_no: 1,
            date: dStr,
            item_name: inv.title || `Invoice ${inv.invoice_number}`,
            unit: 1,
            price: inv.total_amount,
            tenure: '—',
            multiply_tenure: false,
            total_price: inv.total_amount,
          }
        ];
        invItems.forEach((it, idx) => {
          let tot = it.total_price;
          const mult = it.multiply_tenure;
          const tenureVal = parseFloat(String(it.tenure || '').replace(/[^\d.]/g, '')) || 1;
          if (mult === true) {
            tot = Math.round((it.unit || 1) * (it.price || 0) * tenureVal * 100) / 100;
          } else if (mult === false) {
            tot = Math.round((it.unit || 1) * (it.price || 0) * 100) / 100;
          } else if (tot === undefined || tot === null || tot <= 0) {
            tot = Math.round((it.unit || 1) * (it.price || 0) * 100) / 100;
          }
          const itemStage = getEventStage({ action: 'invoice', category: 'payment', created_at: inv.created_at || inv.bill_date } as any, project).label;
          dateMap[dStr].items.push({
            sl_no: it.sl_no || idx + 1,
            invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            project_id: project.id,
            project_title: project.title,
            item_name: it.item_name,
            unit: it.unit || 1,
            price: it.price || 0,
            tenure: it.tenure,
            multiply_tenure: it.multiply_tenure,
            total_price: tot,
            stage: itemStage,
            timestamp: inv.created_at || inv.bill_date,
          });
          dateMap[dStr].day_total += tot;
        });
      });

      return Object.values(dateMap).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return [];
  }, [costLedger, invoices, project]);

  const totalBilledAmount = useMemo(() => {
    if (normalizedDateLedger.length > 0) {
      return normalizedDateLedger.reduce((sum, d) => sum + d.day_total, 0);
    }
    return invoices.filter((i) => i.status !== 'cancelled').reduce((sum, i) => sum + (i.total_amount || 0), 0);
  }, [normalizedDateLedger, invoices]);

  const totalPaidAmount = useMemo(() => {
    return payments
      .filter((p) => p.status === 'verified')
      .reduce((sum, p) => sum + (p.amount_inr || p.amount_usd || 0), 0);
  }, [payments]);

  const currentOutstandingBalance = totalBilledAmount - totalPaidAmount;

  // Single document download handler
  const handleDownloadSingleDoc = (doc: FormattedDocumentItem) => {
    if (doc.url) {
      const a = document.createElement('a');
      a.href = doc.url;
      a.download = doc.name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const metaText = `LATRICS AEROSTAKE - PROJECT DOCUMENT RECORD\n\nProject ID: ${doc.projectId}\nProject Title: ${doc.projectTitle}\nFile Name: ${doc.name}\nPipeline Stage: ${doc.stage}\nCategory: ${doc.category}\nUploaded By: ${doc.uploadedBy} (${doc.uploaderRole})\nUpload Timestamp: ${formatTimestamp(doc.timestamp)}\nDescription: ${doc.description}\n\n[Status: Verified & Cataloged in Aerostake Audit Ledger]`;
      const blob = new Blob([metaText], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name.includes('.') ? doc.name : `${doc.name}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e4e4e7',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      {/* ── Top Project Bar with Interactive Expandable Action Toolbar ── */}
      <div
        style={{
          padding: '0.85rem 1.25rem',
          borderBottom: isPreviewOpen ? '1px solid #e4e4e7' : 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        {/* Static Partition 1: Project Name and Overview */}
        <div
          style={{
            flex: '1 1 0%',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.01em' }}>
              {project.title}
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '0.125rem 0.45rem',
                borderRadius: '4px',
                backgroundColor:
                  String(project.status) === 'completed'
                    ? '#f4f4f5'
                    : String(project.status) === 'approved' || String(project.status) === 'in_progress'
                    ? '#f4f4f5'
                    : '#f4f4f5',
                color:
                  String(project.status) === 'completed'
                    ? '#09090b'
                    : String(project.status) === 'approved' || String(project.status) === 'in_progress'
                    ? '#09090b'
                    : '#3f3f46',
                border: '1px solid currentColor',
                textTransform: 'uppercase',
              }}
            >
              {project.status || 'ACTIVE'}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            <strong style={{ color: '#09090b', fontWeight: 600 }}>Overview:</strong>
            <span>
              {project.description || (project.survey_type ? `${project.survey_type} Survey` : null) || locationStr}
            </span>
            {locationStr && project.description && <span>• {locationStr}</span>}
            {reqPayload.requested_area_sqkm && <span>• {reqPayload.requested_area_sqkm} sq.km</span>}
          </div>
        </div>

        {/* Static Divider: Fixed Partition Line (Does Not Shift) */}
        <div
          style={{
            width: '1px',
            height: '38px',
            backgroundColor: '#e4e4e7',
            flexShrink: 0,
          }}
        />

        {/* Static Partition 2: Report Toolbar Section (Fixed 540px Space) */}
        <div
          style={{
            width: '540px',
            flex: '0 0 540px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            flexShrink: 0,
          }}
        >
          {/* 5 Category Icon Buttons (Expandable) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {categories.map((cat) => {
              const isCatExpanded = expandedCategory === cat.id;
              const Icon = cat.icon;
              const isViewingThisTab = isPreviewOpen && activeTab === cat.id;

              if (isCatExpanded) {
                return (
                  <div
                    key={cat.id}
                    style={{
                      height: '42px',
                      borderRadius: '10px',
                      border: '1.5px solid #18181b',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0 0.65rem 0 0.75rem',
                      flexShrink: 0,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    {/* Text Column: Name & Count */}
                    <div
                      onClick={() => setExpandedCategory(null)}
                      title={`Click to collapse ${cat.name}`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          color: '#09090b',
                          lineHeight: 1.15,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cat.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.675rem',
                          fontWeight: 500,
                          color: '#71717a',
                          lineHeight: 1.15,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cat.count}
                      </span>
                    </div>

                    {/* Option 1: View records for this particular chosen button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isViewingThisTab) {
                          onTogglePreview();
                        } else {
                          onSelectTab(cat.id);
                          if (!isPreviewOpen) {
                            onTogglePreview();
                          }
                        }
                      }}
                      title={isViewingThisTab ? `Hide ${cat.name} Records` : `View ${cat.name} Records`}
                      style={{
                        height: '28px',
                        width: '28px',
                        borderRadius: '6px',
                        border: '1.5px solid #18181b',
                        backgroundColor: isViewingThisTab ? '#09090b' : '#ffffff',
                        color: isViewingThisTab ? '#ffffff' : '#09090b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                        padding: 0,
                      }}
                    >
                      <Eye size={14} color={isViewingThisTab ? '#ffffff' : '#09090b'} />
                    </button>

                    {/* Option 2: Download option which opens preview popup */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        cat.onPreview();
                      }}
                      title={`Download / Preview ${cat.name} Report`}
                      style={{
                        height: '28px',
                        width: '28px',
                        borderRadius: '6px',
                        border: '1.5px solid #18181b',
                        backgroundColor: '#ffffff',
                        color: '#09090b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                        padding: 0,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                    >
                      <Download size={14} color="#09090b" />
                    </button>
                  </div>
                );
              }

              // Collapsed short icon button
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setExpandedCategory(cat.id)}
                  title={`Open ${cat.name} options (${cat.count})`}
                  style={{
                    height: '42px',
                    width: '42px',
                    borderRadius: '10px',
                    border: '1.5px solid #18181b',
                    backgroundColor: isViewingThisTab ? '#fafafa' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isViewingThisTab ? '#fafafa' : '#ffffff')}
                >
                  <Icon size={18} color="#09090b" />
                  {isViewingThisTab && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '3px',
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        backgroundColor: '#09090b',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Far Right: Preview all button */}
          <button
            type="button"
            onClick={onPreviewFullDossier}
            title="Preview complete project dossier report popup"
            style={{
              height: '42px',
              padding: '0 0.95rem',
              borderRadius: '10px',
              border: '1.5px solid #18181b',
              backgroundColor: '#ffffff',
              color: '#09090b',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
          >
            <Eye size={17} color="#09090b" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#09090b', whiteSpace: 'nowrap' }}>
              Preview all
            </span>
          </button>
        </div>
      </div>

      {/* ── Expandable Interactive Live Records Preview (Only for Chosen Category) ── */}
      {isPreviewOpen && (
        <div style={{ borderTop: '1px solid #e4e4e7', backgroundColor: '#fcfcfc', padding: '1rem 1.25rem' }}>

          {/* ── Content Viewports per Tab ── */}
          {activeTab === 'timeline' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.775rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e4e4e7', textAlign: 'left', color: '#71717a' }}>
                    <th style={{ width: '32px', padding: '0.55rem 0.4rem', textAlign: 'center' }}></th>
                    <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Time</th>
                    <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Stage</th>
                    <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Category</th>
                    <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Event Title</th>
                    <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Description</th>
                    <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Actor</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#a1a1aa' }}>
                        No timeline events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    timeline.map((evt, idx) => {
                      const actor = getEventActor(evt);
                      const category = getEventCategory(evt);
                      const stage = getEventStage(evt, project);
                      const isExpanded = expandedEventId === evt.id;
                      const meta = (evt as any).event_metadata || (evt as any).metadata || {};
                      const hasMeta = Object.keys(meta).length > 0;

                      return (
                        <React.Fragment key={evt.id || idx}>
                          <tr
                            onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                            style={{
                              borderBottom: '1px solid #f4f4f5',
                              cursor: 'pointer',
                              backgroundColor: isExpanded ? '#fafafa' : '#ffffff',
                              transition: 'background-color 0.15s ease',
                            }}
                          >
                            <td style={{ padding: '0.55rem 0.4rem', textAlign: 'center', color: '#71717a' }}>
                              {isExpanded ? <ChevronDown size={14} color="#09090b" /> : <ChevronRight size={14} color="#71717a" />}
                            </td>
                            <td style={{ padding: '0.55rem 0.75rem', fontFamily: 'monospace', color: '#09090b', whiteSpace: 'nowrap' }}>
                              {formatDate(evt.created_at)}
                            </td>
                            <td style={{ padding: '0.55rem 0.75rem', fontFamily: 'monospace', color: '#71717a', whiteSpace: 'nowrap' }}>
                              {formatTime(evt.created_at)}
                            </td>
                            <td style={{ padding: '0.55rem 0.75rem', whiteSpace: 'nowrap' }}>
                              <span style={{ fontSize: '0.725rem', color: '#3f3f46', fontWeight: 500 }}>
                                {stage.label}
                              </span>
                            </td>
                            <td style={{ padding: '0.55rem 0.75rem', color: '#71717a' }}>
                              <span style={{ fontSize: '0.7rem', color: '#71717a', fontWeight: 600, textTransform: 'uppercase' }}>
                                {category}
                              </span>
                            </td>
                            <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600, color: '#09090b' }}>
                              {formatEventTitle(evt)}
                            </td>
                            <td style={{ padding: '0.55rem 0.75rem', color: '#52525b', maxWidth: '350px' }}>
                              {evt.description || (evt as any).message || '—'}
                            </td>
                            <td style={{ padding: '0.55rem 0.75rem', whiteSpace: 'nowrap' }}>
                              <span style={{ fontWeight: 600, color: '#09090b' }}>{actor.name}</span>{' '}
                              <span style={{ fontSize: '0.7rem', color: '#71717a' }}>({actor.role})</span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e4e4e7' }}>
                              <td colSpan={8} style={{ padding: '0.85rem 1.25rem 1rem 2.5rem' }}>
                                <div
                                  style={{
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e4e4e7',
                                    borderRadius: '6px',
                                    padding: '0.85rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.65rem',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 700, color: '#09090b', padding: '0.15rem 0.45rem', backgroundColor: '#f4f4f5', borderRadius: '4px' }}>
                                        ID: {evt.id}
                                      </span>
                                      <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: '#52525b', padding: '0.15rem 0.45rem', backgroundColor: '#fafafa', borderRadius: '4px', border: '1px solid #e4e4e7' }}>
                                        action: {evt.action || 'Activity'}
                                      </span>
                                    </div>
                                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
                                      Actor: <strong style={{ color: '#09090b' }}>{actor.name}</strong> • Role: <strong style={{ color: '#09090b' }}>{actor.role}</strong>
                                    </span>
                                  </div>

                                  {/* Event Metadata Chips */}
                                  {hasMeta ? (
                                    <div>
                                      <span style={{ fontSize: '0.675rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.35rem' }}>
                                        Telemetry &amp; Audit Metadata Context:
                                      </span>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                        {Object.entries(meta).map(([k, v]) => (
                                          <span
                                            key={k}
                                            style={{
                                              fontSize: '0.7rem',
                                              padding: '0.2rem 0.5rem',
                                              backgroundColor: '#f4f4f5',
                                              borderRadius: '4px',
                                              color: '#09090b',
                                              border: '1px solid #e4e4e7',
                                            }}
                                          >
                                            <strong style={{ color: '#52525b' }}>{k}:</strong> {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>
                                      No supplementary telemetry metadata recorded for this action.
                                    </span>
                                  )}

                                  <div style={{ fontSize: '0.75rem', color: '#27272a', lineHeight: 1.45, paddingTop: '0.35rem', borderTop: '1px solid #f4f4f5' }}>
                                    <strong>Message / Description:</strong> {evt.description || (evt as any).message || 'No description provided.'}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

            {activeTab === 'payments' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* Minimalist Financial Overview Strip */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: '#fafafa',
                    border: '1px solid #e4e4e7',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div>
                      <span style={{ color: '#71717a' }}>Total Invoiced: </span>
                      <strong style={{ color: '#09090b', fontFamily: 'monospace' }}>
                        ₹ {totalBilledAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#71717a' }}>Payments Cleared: </span>
                      <strong style={{ color: '#16a34a', fontFamily: 'monospace' }}>
                        ₹ {totalPaidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#71717a' }}>Outstanding Balance: </span>
                      <strong
                        style={{
                          color: currentOutstandingBalance > 0 ? '#dc2626' : '#16a34a',
                          fontFamily: 'monospace',
                        }}
                      >
                        ₹ {Math.abs(currentOutstandingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        <span style={{ fontSize: '0.7rem', fontWeight: 500, marginLeft: '0.25rem' }}>
                          ({currentOutstandingBalance > 0 ? 'Pending' : 'Settled'})
                        </span>
                      </strong>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
                    {normalizedDateLedger.length} billing date{normalizedDateLedger.length === 1 ? '' : 's'} · {normalizedDateLedger.reduce((acc, d) => acc + d.items.length, 0)} itemized lines
                  </span>
                </div>

                {/* Date-wise Itemized Billing Table */}
                <div style={{ overflowX: 'auto', border: '1px solid #e4e4e7', borderRadius: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.775rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e4e4e7', textAlign: 'left', color: '#71717a' }}>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Date</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Time</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Stage</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600, width: '40px', textAlign: 'center' }}>Sl</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Item Description &amp; Fare Breakup</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Unit / Qty</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Unit Price (INR)</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Tenure</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Net Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {normalizedDateLedger.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: '#a1a1aa' }}>
                            No billing cost items recorded for this project yet.
                          </td>
                        </tr>
                      ) : (
                        normalizedDateLedger.map((day, dIdx) => (
                          <React.Fragment key={day.date}>
                            {day.items.map((item, iIdx) => {
                              const itemDate = formatDate(item.timestamp || day.timestamp || day.date);
                              const itemTime = formatTime(item.timestamp || day.timestamp);
                              const itemStage = item.stage || getEventStage({ action: 'invoice', category: 'payment', created_at: item.timestamp || day.date } as any, project).label;

                              return (
                                <tr key={`${day.date}-${item.invoice_id || dIdx}-${iIdx}`} style={{ borderBottom: '1px solid #f4f4f5' }}>
                                  <td style={{ padding: '0.55rem 0.75rem', fontFamily: 'monospace', color: '#09090b', whiteSpace: 'nowrap' }}>
                                    {iIdx === 0 ? itemDate : ''}
                                  </td>
                                  <td style={{ padding: '0.55rem 0.75rem', fontFamily: 'monospace', color: '#71717a', whiteSpace: 'nowrap' }}>
                                    {itemTime}
                                  </td>
                                  <td style={{ padding: '0.55rem 0.75rem', whiteSpace: 'nowrap' }}>
                                    <span style={{ fontSize: '0.725rem', color: '#3f3f46', fontWeight: 500 }}>
                                      {itemStage}
                                    </span>
                                  </td>
                                  <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center', color: '#71717a', fontFamily: 'monospace' }}>
                                    {item.sl_no || iIdx + 1}
                                  </td>
                                  <td style={{ padding: '0.55rem 0.75rem', color: '#09090b', fontWeight: 500 }}>
                                    {item.item_name}
                                    {item.invoice_number && (
                                      <span style={{ marginLeft: '0.4rem', fontSize: '0.675rem', color: '#71717a' }}>
                                        (Bill #{item.invoice_number})
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center', fontFamily: 'monospace', color: '#3f3f46' }}>
                                    {item.unit}
                                  </td>
                                  <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontFamily: 'monospace', color: '#3f3f46' }}>
                                    ₹ {item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center', color: '#71717a' }}>
                                    {item.tenure || '—'}
                                  </td>
                                  <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', color: '#09090b' }}>
                                    ₹ {item.total_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              );
                            })}
                            {/* Day Subtotal Row */}
                            <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e4e4e7' }}>
                              <td colSpan={8} style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontWeight: 600, color: '#52525b', fontSize: '0.725rem' }}>
                                Subtotal for {formatDate(day.date)}:
                              </td>
                              <td style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: '#09090b', fontSize: '0.75rem' }}>
                                ₹ {day.day_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                    {normalizedDateLedger.length > 0 && (
                      <tfoot>
                        <tr style={{ backgroundColor: '#f4f4f5', borderTop: '2px solid #e4e4e7' }}>
                          <td colSpan={8} style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#09090b' }}>
                            Total Billed Amount:
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 800, fontFamily: 'monospace', color: '#09090b', fontSize: '0.85rem' }}>
                            ₹ {totalBilledAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Cleared Payments / Remittances Table */}
                {payments.length > 0 && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#09090b' }}>
                      Cleared Remittances &amp; Verified Payments ({payments.length})
                    </span>
                    <div style={{ overflowX: 'auto', border: '1px solid #e4e4e7', borderRadius: '6px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.775rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e4e4e7', textAlign: 'left', color: '#71717a' }}>
                            <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Date</th>
                            <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Time</th>
                            <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Stage</th>
                            <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Milestone / Description</th>
                            <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Reference UTR</th>
                            <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Status</th>
                            <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Amount Cleared (INR)</th>
                            <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Verified By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((p, idx) => {
                            const pStage = getEventStage({ action: 'payment_verified', category: 'payment', created_at: p.verified_at || p.created_at } as any, project);
                            return (
                              <tr key={p.id || idx} style={{ borderBottom: '1px solid #f4f4f5' }}>
                                <td style={{ padding: '0.55rem 0.75rem', fontFamily: 'monospace', color: '#09090b', whiteSpace: 'nowrap' }}>
                                  {formatDate(p.verified_at || p.created_at)}
                                </td>
                                <td style={{ padding: '0.55rem 0.75rem', fontFamily: 'monospace', color: '#71717a', whiteSpace: 'nowrap' }}>
                                  {formatTime(p.verified_at || p.created_at)}
                                </td>
                                <td style={{ padding: '0.55rem 0.75rem', whiteSpace: 'nowrap' }}>
                                  <span style={{ fontSize: '0.725rem', color: '#3f3f46', fontWeight: 500 }}>
                                    {pStage.label}
                                  </span>
                                </td>
                                <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600, color: '#09090b' }}>
                                  {p.milestone_name}
                                </td>
                                <td style={{ padding: '0.55rem 0.75rem', fontFamily: 'monospace', color: '#71717a' }}>
                                  {p.reference_code || p.bank_reference || '—'}
                                </td>
                                <td style={{ padding: '0.55rem 0.75rem' }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#16a34a' }}>
                                    {String(p.status).toUpperCase()}
                                  </span>
                                </td>
                                <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600, fontFamily: 'monospace', color: '#16a34a', textAlign: 'right' }}>
                                  ₹ {(p.amount_inr || p.amount_usd || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td style={{ padding: '0.55rem 0.75rem', color: '#52525b' }}>
                                  {p.verified_by || 'LATRICS Finance'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'documents' && (
              <div>
                {/* Minimalist Document Catalog Header */}
                <div
                  style={{
                    padding: '0.55rem 0.75rem',
                    borderBottom: '1px solid #e4e4e7',
                    backgroundColor: '#fafafa',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#09090b' }}>
                    Verified Document Catalog ({documents.length} files)
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#71717a' }}>
                    Includes KML boundaries, scopes, Stage 3 mobilisation tickets &amp; deliverables
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.775rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e4e4e7', textAlign: 'left', color: '#71717a' }}>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Date</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Time</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Stage</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Category</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>File Name</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Size</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Uploaded By</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#a1a1aa' }}>
                            No documents or boundary files uploaded yet.
                          </td>
                        </tr>
                      ) : (
                        documents.map((doc, idx) => (
                          <tr key={doc.id || idx} style={{ borderBottom: '1px solid #f4f4f5' }}>
                            <td style={{ padding: '0.55rem 0.75rem', fontFamily: 'monospace', color: '#09090b', whiteSpace: 'nowrap' }}>
                              {formatDate(doc.timestamp)}
                            </td>
                            <td style={{ padding: '0.55rem 0.75rem', fontFamily: 'monospace', color: '#71717a', whiteSpace: 'nowrap' }}>
                              {formatTime(doc.timestamp)}
                            </td>
                            <td style={{ padding: '0.55rem 0.75rem', whiteSpace: 'nowrap' }}>
                              <span style={{ fontSize: '0.725rem', color: '#3f3f46', fontWeight: 500 }}>
                                {doc.stage || 'Project Document'}
                              </span>
                            </td>
                            <td style={{ padding: '0.55rem 0.75rem' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#71717a' }}>
                                {doc.category}
                              </span>
                            </td>
                            <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600, color: '#09090b' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span
                                  style={{
                                    fontSize: '0.625rem',
                                    padding: '0.1rem 0.35rem',
                                    borderRadius: '3px',
                                    backgroundColor: '#f4f4f5',
                                    color: '#27272a',
                                    fontFamily: 'monospace',
                                    fontWeight: 600,
                                    border: '1px solid #e4e4e7',
                                  }}
                                >
                                  {doc.fileExt || 'DOC'}
                                </span>
                                <span>{doc.name}</span>
                              </div>
                            </td>
                            <td style={{ padding: '0.55rem 0.75rem', color: '#71717a' }}>
                              {doc.size}
                            </td>
                            <td style={{ padding: '0.55rem 0.75rem', color: '#52525b' }}>
                              {doc.uploadedBy}
                            </td>
                            <td style={{ padding: '0.55rem 0.75rem' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#71717a' }}>
                                {doc.uploaderRole?.toUpperCase() || 'OPS'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'planning' && (
              <div>
                {/* Module 4: Top Action Bar with Version Comparison */}
                <div
                  style={{
                    padding: '0.55rem 0.75rem',
                    borderBottom: '1px solid #e4e4e7',
                    backgroundColor: '#fafafa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#09090b' }}>
                      Operational Flight Planning Versions ({planningVersions.length} iterations)
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#71717a' }}>
                      Flight parameters, altitude, DGCA zone calibration &amp; client sign-offs
                    </span>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => setIsCompareModalOpen(true)}
                      style={{
                        height: '28px',
                        padding: '0 0.65rem',
                        backgroundColor: '#ffffff',
                        color: '#09090b',
                        border: '1px solid #09090b',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <Scale size={12} /> Compare Planning Versions
                    </button>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.775rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e4e4e7', textAlign: 'left', color: '#71717a' }}>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Version</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Date</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Time</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Sender</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Decision</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Altitude</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Overlap (F/S)</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>GCPs</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Delivery SLA</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Client Sign-Off</th>
                        <th style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {planningVersions.length === 0 ? (
                        <tr>
                          <td colSpan={11} style={{ padding: '2rem', textAlign: 'center', color: '#a1a1aa' }}>
                            No planning versions submitted yet.
                          </td>
                        </tr>
                      ) : (
                        planningVersions.map((ver, idx) => {
                          const p = extractPlanningParameters(ver);
                          const isClientSender = ver.sender === 'client';
                          return (
                            <tr key={ver.id || idx} style={{ borderBottom: '1px solid #f4f4f5' }}>
                              <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600, color: '#09090b' }}>
                                {ver.version_code || `V0${ver.version_number || 1}`}
                              </td>
                              <td style={{ padding: '0.55rem 0.75rem', fontFamily: 'monospace', color: '#09090b', whiteSpace: 'nowrap' }}>
                                {formatDate(ver.created_at)}
                              </td>
                              <td style={{ padding: '0.55rem 0.75rem', fontFamily: 'monospace', color: '#71717a', whiteSpace: 'nowrap' }}>
                                {formatTime(ver.created_at)}
                              </td>
                              <td style={{ padding: '0.55rem 0.75rem' }}>
                                <span style={{ fontSize: '0.725rem', color: '#3f3f46', fontWeight: 500 }}>
                                  {isClientSender ? 'Client' : 'LATRICS Ops'}
                                </span>
                              </td>
                              <td style={{ padding: '0.55rem 0.75rem' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: p.decisionLabel === 'FEASIBLE' ? '#16a34a' : '#09090b' }}>
                                  {p.decisionLabel}
                                </span>
                              </td>
                              <td style={{ padding: '0.55rem 0.75rem', color: '#09090b' }}>
                                {p.altitudeLabel}
                              </td>
                              <td style={{ padding: '0.55rem 0.75rem', color: '#52525b' }}>
                                {p.overlapLabel}
                              </td>
                              <td style={{ padding: '0.55rem 0.75rem', color: '#52525b' }}>
                                {p.gcpLabel}
                              </td>
                              <td style={{ padding: '0.55rem 0.75rem', color: '#09090b' }}>
                                {p.deliveryTimelineLabel}
                              </td>
                              <td style={{ padding: '0.55rem 0.75rem' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: p.clientSignOffLabel === 'APPROVED' ? '#16a34a' : '#71717a' }}>
                                  {p.clientSignOffLabel}
                                </span>
                              </td>
                              <td style={{ padding: '0.55rem 0.75rem', color: '#52525b', maxWidth: '280px', lineHeight: 1.35 }}>
                                {p.remarksLabel}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Side-by-Side Planning Comparison Modal */}
                <PlanningCompareModal
                  isOpen={isCompareModalOpen}
                  onClose={() => setIsCompareModalOpen(false)}
                  planningVersions={planningVersions}
                  projectTitle={project.title}
                />
              </div>
            )}

            {activeTab === 'communications' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {(() => {
                  const activeGroups = chatGroups.filter((g) => g.messages.length > 0);
                  if (activeGroups.length === 0) {
                    return (
                      <div
                        style={{
                          padding: '2.5rem',
                          textAlign: 'center',
                          color: '#a1a1aa',
                          fontSize: '0.8rem',
                          backgroundColor: '#ffffff',
                          borderRadius: '6px',
                          border: '1px solid #e4e4e7',
                        }}
                      >
                        No communication messages or remarks recorded for this project yet.
                      </div>
                    );
                  }
                  return activeGroups.map((g) => <ChatTranscript key={g.key} group={g} />);
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
