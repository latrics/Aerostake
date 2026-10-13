'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileEdit,
  CheckCircle2,
  Lock,
  Plane,
  FileText,
  FileCheck,
  Handshake,
  BarChart3,
  Search,
  Plus,
  Minus,
  Layers,
  Maximize2,
  Eye,
  MoreVertical,
  Info,
  List,
  SlidersHorizontal,
  RotateCcw,
  MessageSquare,
  Check,
  User,
  Cpu,
  Calendar,
  Filter,
  LayoutGrid,
  Folder,
  Loader2,
  Clock,
  ShieldAlert,
  Inbox,
  UploadCloud,
  Upload,
  X,
  Trash2,
  Paperclip,
  Copy,
  ExternalLink,
  MapPin,
  Building2,
  Mail,
  Phone,
  Camera,
  Globe,
  ClipboardList,
  Compass,
  FileSpreadsheet,
  Users,
  ArrowRight,
  ShieldCheck,
  Award,
  IdCard,
  Home,
  Flag,
  Settings,
} from 'lucide-react';
import { SubmitRequestModal } from '@/modules/requests/components/SubmitRequestModal';
import { Portal } from '@/components/Portal';
import { StageChatBox, StageChatMessage } from '@/modules/projects/components/StageChatBox';
import { projectApi } from '@/modules/projects/api';
import { sectorApi } from '@/modules/sectors/api';
import { timelineApi } from '@/modules/timeline/api';
import { planningApi } from '@/modules/planning/api';
import { paymentsApi } from '@/modules/payments/api';
import { requestApi } from '@/modules/requests/api';
import { usersApi } from '@/modules/users/api';
import { UserProfile } from '@/modules/users/types';
import { PilotCrewMember } from '@/modules/mobilisation/types';
import { isLatricsRole } from '@/lib/role';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Project } from '@/modules/projects/types';
import { Sector } from '@/modules/sectors/types';
import { TimelineEvent } from '@/modules/timeline/types';
import { OperationalPlan, PlannedProjectTenure } from '@/modules/planning/types';
import { PaymentRecord, Invoice, ClientWalletSummary } from '@/modules/payments/types';
import { RequestVersion } from '@/modules/requests/types';
import { CapturingStageWorkspace } from '@/modules/sectors/components/CapturingStageWorkspace';
import { ProcessingStageWorkspace } from '@/modules/processing/components/ProcessingStageWorkspace';
import { DeliveredStageWorkspace } from '@/modules/delivery/components/DeliveredStageWorkspace';
import { MobilisationConfirmationSection } from '@/modules/mobilisation/components/MobilisationConfirmationSection';
import { downloadDocument } from '@/lib/document-utils';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '@/lib/date';

const PIPELINE_STAGES = [
  { id: 1, key: 'request', name: 'Request', label: '1. Request', desc: 'Requirements & AOI' },
  { id: 2, key: 'planning', name: 'Planning', label: '2. Planning', desc: 'Feasibility & Plan' },
  { id: 3, key: 'mobilising', name: 'Mobilising', label: '3. Mobilising', desc: 'Flight Crew Mobilisation' },
  { id: 4, key: 'capturing', name: 'Capturing', label: '4. Capturing', desc: 'Flight Execution' },
  { id: 5, key: 'processing', name: 'Processing', label: '5. Processing', desc: 'Deliverables & Outputs' },
  { id: 6, key: 'delivered', name: 'Delivered', label: '6. Delivered', desc: 'Handover & Sign-Off' },
];

export default function ProjectOverviewPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <Loader2 size={32} className="animate-spin" color="#09090b" />
        </div>
      }
    >
      <ProjectOverviewContent />
    </Suspense>
  );
}

function ProjectOverviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const projectId = (params?.id as string) || '';
  const { user } = useAuth();

  // Live Backend Data States
  const [liveProject, setLiveProject] = useState<Project | null>(null);
  const [liveSectors, setLiveSectors] = useState<Sector[]>([]);
  const [liveTimeline, setLiveTimeline] = useState<TimelineEvent[]>([]);
  const [livePlan, setLivePlan] = useState<OperationalPlan | null>(null);
  const [livePayments, setLivePayments] = useState<PaymentRecord[]>([]);
  const [liveWallet, setLiveWallet] = useState<ClientWalletSummary | null>(null);
  const [liveInvoices, setLiveInvoices] = useState<Invoice[]>([]);
  const [liveRequests, setLiveRequests] = useState<RequestVersion[]>([]);
  const [livePlanningVersions, setLivePlanningVersions] = useState<any[]>([]);
  const [allDirectoryUsers, setAllDirectoryUsers] = useState<UserProfile[]>([]);
  const [orgMembers, setOrgMembers] = useState<UserProfile[]>([]);
  const [staffUsers, setStaffUsers] = useState<UserProfile[]>([]);
  const [pilotUsers, setPilotUsers] = useState<UserProfile[]>([]);
  const [planningDraftData, setPlanningDraftData] = useState<any>(null);
  const [livePlanningDraft, setLivePlanningDraft] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialLoadedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const idKey = projectId || 'default';
      const saved =
        localStorage.getItem(`latrics_planning_draft_${idKey}`) ||
        localStorage.getItem(`latrics_planning_draft_default`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData) {
          setPlanningDraftData(parsed.formData);
        }
      }
    } catch {}
  }, [projectId]);

  const fetchProjectOverview = useCallback(async () => {
    if (!projectId) return;
    if (!hasInitialLoadedRef.current) {
      setIsLoading(true);
    }
    try {
      const [
        projRes,
        secRes,
        timeRes,
        planRes,
        payRes,
        walletRes,
        invoicesRes,
        reqsRes,
        planVersRes,
        planDraftRes,
        orgMemRes,
        opsUsersRes,
        adminUsersRes,
        pilotsRes,
        allUsersRes,
      ] = await Promise.allSettled([
        projectApi.getProject(projectId),
        sectorApi.listProjectSectors(projectId),
        timelineApi.getProjectTimeline(projectId),
        planningApi.getActivePlan(projectId),
        paymentsApi.listProjectPayments(projectId),
        paymentsApi.getProjectWallet(projectId).catch(() => null),
        paymentsApi.listProjectInvoices(projectId).catch(() => []),
        requestApi.listProjectRequests(projectId),
        planningApi.listPlanningVersions(projectId),
        planningApi.getPlanningDraft(projectId).catch(() => null),
        usersApi.getOrganizationMembers().catch(() => []),
        usersApi.listUsers('operations').catch(() => []),
        usersApi.listUsers('admin').catch(() => []),
        usersApi.listUsers('pilot').catch(() => []),
        usersApi.listUsers().catch(() => []),
      ]);

      if (projRes.status === 'fulfilled') setLiveProject(projRes.value);
      if (secRes.status === 'fulfilled') setLiveSectors(secRes.value || []);
      if (timeRes.status === 'fulfilled') setLiveTimeline(timeRes.value || []);
      if (planRes.status === 'fulfilled') setLivePlan(planRes.value);
      if (payRes.status === 'fulfilled') setLivePayments(payRes.value || []);
      if (walletRes.status === 'fulfilled') setLiveWallet(walletRes.value);
      if (invoicesRes.status === 'fulfilled') setLiveInvoices(invoicesRes.value || []);
      if (reqsRes.status === 'fulfilled') setLiveRequests(reqsRes.value || []);
      if (planVersRes.status === 'fulfilled') setLivePlanningVersions(planVersRes.value || []);
      if (planDraftRes.status === 'fulfilled') setLivePlanningDraft(planDraftRes.value);

      const knownMap = new Map<string, UserProfile>();

      if (orgMemRes.status === 'fulfilled' && Array.isArray(orgMemRes.value)) {
        orgMemRes.value.forEach((u) => {
          if (u?.id) knownMap.set(u.id, u);
        });
        setOrgMembers(orgMemRes.value);
      }

      const combinedStaff: UserProfile[] = [];
      if (opsUsersRes.status === 'fulfilled' && Array.isArray(opsUsersRes.value)) {
        opsUsersRes.value.forEach((u) => {
          if (u?.id) knownMap.set(u.id, u);
          combinedStaff.push(u);
        });
      }
      if (adminUsersRes.status === 'fulfilled' && Array.isArray(adminUsersRes.value)) {
        adminUsersRes.value.forEach((u) => {
          if (u?.id) knownMap.set(u.id, u);
          combinedStaff.push(u);
        });
      }
      setStaffUsers(combinedStaff);

      if (pilotsRes.status === 'fulfilled' && Array.isArray(pilotsRes.value)) {
        pilotsRes.value.forEach((u) => {
          if (u?.id) knownMap.set(u.id, u);
        });
        setPilotUsers(pilotsRes.value || []);
      }

      if (allUsersRes.status === 'fulfilled' && Array.isArray(allUsersRes.value)) {
        allUsersRes.value.forEach((u) => {
          if (u?.id) knownMap.set(u.id, u);
        });
      }

      setAllDirectoryUsers(Array.from(knownMap.values()));
    } catch (err) {
      console.error('Error fetching project overview:', err);
    } finally {
      hasInitialLoadedRef.current = true;
      setIsLoading(false);
    }
  }, [projectId]);

  const refreshSectors = useCallback(async () => {
    if (!projectId) return;
    try {
      const secRes = await sectorApi.listProjectSectors(projectId);
      setLiveSectors(secRes || []);
    } catch (err) {
      console.error('Error silently refreshing sectors:', err);
    }
  }, [projectId]);

  // Extract planned project tenure (Section 7 Expected Timelines)
  const plannedTenure: PlannedProjectTenure | null = useMemo(() => {
    // 1. From livePlanningDraft
    const draftFd = livePlanningDraft?.form_data || {};
    if (draftFd.expectedStartDate || draftFd.expectedEndDate || draftFd.expectedSurveyDays) {
      return {
        expectedStartDate: draftFd.expectedStartDate || '',
        expectedEndDate: draftFd.expectedEndDate || '',
        expectedSurveyDays: draftFd.expectedSurveyDays || '',
        pilotTravelDate: draftFd.pilotTravelDate || '',
        dataDeliveryTimelineDays: draftFd.dataDeliveryTimelineDays || '',
      };
    }

    // 2. From latest livePlanningVersions
    if (livePlanningVersions && livePlanningVersions.length > 0) {
      for (const ver of livePlanningVersions) {
        const verFd = ver.form_data || {};
        if (verFd.expectedStartDate || verFd.expectedEndDate || verFd.expectedSurveyDays) {
          return {
            expectedStartDate: verFd.expectedStartDate || '',
            expectedEndDate: verFd.expectedEndDate || '',
            expectedSurveyDays: verFd.expectedSurveyDays || '',
            pilotTravelDate: verFd.pilotTravelDate || '',
            dataDeliveryTimelineDays: verFd.dataDeliveryTimelineDays || '',
          };
        }
      }
    }

    // 3. From planningDraftData (localStorage cache)
    if (planningDraftData && (planningDraftData.expectedStartDate || planningDraftData.expectedEndDate)) {
      return {
        expectedStartDate: planningDraftData.expectedStartDate || '',
        expectedEndDate: planningDraftData.expectedEndDate || '',
        expectedSurveyDays: planningDraftData.expectedSurveyDays || '',
        pilotTravelDate: planningDraftData.pilotTravelDate || '',
        dataDeliveryTimelineDays: planningDraftData.dataDeliveryTimelineDays || '',
      };
    }

    // 4. From liveProject requirements payload
    const reqPayload = (liveProject?.requirements_payload || {}) as Record<string, any>;
    const pl = reqPayload.planning || reqPayload.form_data || reqPayload.feasibility || {};
    if (pl.expectedStartDate || pl.expectedEndDate) {
      return {
        expectedStartDate: pl.expectedStartDate || '',
        expectedEndDate: pl.expectedEndDate || '',
        expectedSurveyDays: pl.expectedSurveyDays || '',
        pilotTravelDate: pl.pilotTravelDate || '',
        dataDeliveryTimelineDays: pl.dataDeliveryTimelineDays || '',
      };
    }

    return null;
  }, [livePlanningDraft, livePlanningVersions, planningDraftData, liveProject]);

  useEffect(() => {
    fetchProjectOverview();
  }, [fetchProjectOverview]);

  const tabParam = searchParams?.get('tab');
  const [selectedStageId, setSelectedStageId] = useState<number>(2);
  const [activeTab, setActiveTab] = useState<'stage' | 'overview'>('overview');

  useEffect(() => {
    if (tabParam) {
      if (tabParam === 'timeline') {
        router.replace(`/activity-logs?projectId=${projectId}&tab=timeline`);
      } else if (tabParam === 'documents' || tabParam === 'document') {
        router.replace(`/activity-logs?projectId=${projectId}&tab=documents`);
      } else if (tabParam === 'stage' || tabParam === 'overview') {
        setActiveTab(tabParam as any);
      } else if (tabParam === 'request') {
        setSelectedStageId(1);
        setActiveTab('stage');
      } else if (tabParam === 'planning') {
        setSelectedStageId(2);
        setActiveTab('stage');
      } else if (tabParam === 'capturing') {
        setSelectedStageId(4);
        setActiveTab('stage');
      }
    }
  }, [tabParam, projectId, router]);
  const [selectedSectorId, setSelectedSectorId] = useState<number | null>(null);
  const [sectorSearchQuery, setSectorSearchQuery] = useState('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);

  // Stage 4 Capturing State & Forms
  const [isOpsPlanningModalOpen, setIsOpsPlanningModalOpen] = useState(false);
  const [selectedPlanningSector, setSelectedPlanningSector] = useState<Sector | null>(null);
  const [isPilotDailyModalOpen, setIsPilotDailyModalOpen] = useState(false);
  const [selectedLogSectorId, setSelectedLogSectorId] = useState<string | null>(null);
  const [hoveredSector, setHoveredSector] = useState<Sector | null>(null);
  const [tooltipCoords, setTooltipCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [capturingMapMode, setCapturingMapMode] = useState<'satellite' | 'map'>('satellite');
  const [expandedSectorCodes, setExpandedSectorCodes] = useState<Record<string, boolean>>({});
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  // Timeline Tab State
  const [timelineSearch, setTimelineSearch] = useState('');
  const [timelineTypeFilter, setTimelineTypeFilter] = useState('all');
  const [timelineDateFilter, setTimelineDateFilter] = useState('all_time');
  const [timelineViewMode, setTimelineViewMode] = useState<'list' | 'tree'>('list');

  // Documents Tab State
  const [docCategoryFilter, setDocCategoryFilter] = useState('all');
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docViewMode, setDocViewMode] = useState<'list' | 'grid'>('list');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  // Documents Upload Modal State (Multiple Files Support)
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const [docUploadQueue, setDocUploadQueue] = useState<File[]>([]);
  const [docUploadCategory, setDocUploadCategory] = useState('Scope Document');
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);
  const [isDraggingModalDocs, setIsDraggingModalDocs] = useState(false);
  const modalDocInputRef = React.useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleAddModalDocs = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    setDocUploadQueue((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const filtered = incoming.filter((f) => !existingNames.has(f.name));
      return [...prev, ...filtered];
    });
  };

  const handleRemoveModalDoc = (index: number) => {
    setDocUploadQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmUploadDocs = async () => {
    if (!liveProject || docUploadQueue.length === 0) return;
    setIsUploadingDocs(true);
    setDocUploadError(null);
    try {
      const currentPayload = (liveProject.requirements_payload || {}) as Record<string, any>;
      const existingAttachments = Array.isArray(currentPayload.attachments) ? currentPayload.attachments : [];

      const newAttachments = docUploadQueue.map((f) => ({
        name: f.name,
        size: formatFileSize(f.size),
        type: f.name.endsWith('.pdf')
          ? 'PDF'
          : f.name.endsWith('.kml') || f.name.endsWith('.kmz')
          ? 'KML'
          : f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv')
          ? 'Spreadsheet'
          : 'Document',
        category: docUploadCategory,
        date: new Date().toISOString().split('T')[0],
      }));

      const updatedPayload = {
        ...currentPayload,
        attachments: [...existingAttachments, ...newAttachments],
      };

      await projectApi.updateProject(liveProject.id, {
        requirements_payload: updatedPayload,
      });

      await fetchProjectOverview();
      setDocUploadQueue([]);
      setIsUploadDocModalOpen(false);
    } catch (err: any) {
      setDocUploadError(err.message || 'Failed to upload documents');
    } finally {
      setIsUploadingDocs(false);
    }
  };

  // Team Tab State
  const [pilotSearchQuery, setPilotSearchQuery] = useState('');
  const [pilotViewMode, setPilotViewMode] = useState<'list' | 'grid'>('list');
  const [droneSearchQuery, setDroneSearchQuery] = useState('');
  const [droneViewMode, setDroneViewMode] = useState<'list' | 'grid'>('list');
  const [copiedId, setCopiedId] = useState(false);

  const isPilot = Boolean(user && user.role?.toLowerCase() === 'pilot');
  const isOps = Boolean(user && (user.role === 'admin' || user.role === 'operations'));
  const isClient = Boolean(user && !isLatricsRole(user.role));

  // Mobilisation Contact & Stage Progression Modals
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [isEditOpsModalOpen, setIsEditOpsModalOpen] = useState(false);
  const [isProceedStageModalOpen, setIsProceedStageModalOpen] = useState(false);
  const [isSavingContacts, setIsSavingContacts] = useState(false);
  const [isProceedingStage, setIsProceedingStage] = useState(false);

  // Client Contacts Draft Form
  const [editPrimaryName, setEditPrimaryName] = useState('');
  const [editPrimaryEmail, setEditPrimaryEmail] = useState('');
  const [editPrimaryPhone, setEditPrimaryPhone] = useState('');
  const [editSubName, setEditSubName] = useState('');
  const [editSubEmail, setEditSubEmail] = useState('');
  const [editSubPhone, setEditSubPhone] = useState('');
  const [editSubDesignation, setEditSubDesignation] = useState('');
  const [orgSubordinates, setOrgSubordinates] = useState<UserProfile[]>([]);
  const [selectedSubUserId, setSelectedSubUserId] = useState('');

  // LATRICS Ops & Pilot Allocation Draft Form
  const [editOpsName, setEditOpsName] = useState('');
  const [editOpsEmail, setEditOpsEmail] = useState('');
  const [editOpsPhone, setEditOpsPhone] = useState('');
  const [editPilotsList, setEditPilotsList] = useState<PilotCrewMember[]>([]);
  const [availablePilots, setAvailablePilots] = useState<UserProfile[]>([]);
  const [newPilotName, setNewPilotName] = useState('');
  const [newPilotEmail, setNewPilotEmail] = useState('');
  const [newPilotLicense, setNewPilotLicense] = useState('');
  const [newPilotPhone, setNewPilotPhone] = useState('');
  const [newPilotRole, setNewPilotRole] = useState('Lead Remote Pilot');
  const [newPilotAge, setNewPilotAge] = useState('');
  const [newPilotAadhaar, setNewPilotAadhaar] = useState('');
  const [selectedDirPilotId, setSelectedDirPilotId] = useState('');

  const handleCopyId = () => {
    if (!projectDetails.id) return;
    navigator.clipboard.writeText(projectDetails.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Phase Determination:
  // Scenario 1: Request / Planning phase (status is draft, submitted, planning, or no approved operational plan)
  // Scenario 2: Plan is published / approved / execution phase
  const isPlanningPhase = useMemo(() => {
    if (!liveProject) return true;
    const s = liveProject.status?.toLowerCase();
    return s === 'draft' || s === 'submitted' || s === 'planning' || !livePlan;
  }, [liveProject, livePlan]);

  const formatDate = useCallback((dateStr?: string | null) => {
    return formatDateDDMMYYYY(dateStr);
  }, []);

  const projectDetails = useMemo(() => {
    if (!liveProject) {
      return {
        id: projectId,
        title: 'Survey Project',
        status: 'Submitted',
        location: '—',
        startDate: '—',
        createdDate: '—',
        teamSize: 1,
        description: '—',
        totalArea: '—',
        totalSectors: 0,
        approvedPlanDate: '—',
        estCompletion: '—',
        overallProgress: 0,
        projectManager: 'LATRICS Operations',
        primaryContact: user?.full_name || user?.email || '—',
      };
    }

    const reqPayload = (liveProject.requirements_payload || {}) as Record<string, any>;
    const planningCalculatedArea =
      (livePlanningVersions?.[0]?.form_data?.kmlCalculatedArea ? Number(livePlanningVersions[0].form_data.kmlCalculatedArea) : null) ||
      (planningDraftData?.kmlCalculatedArea ? Number(planningDraftData.kmlCalculatedArea) : null);
    const areaVal =
      planningCalculatedArea ||
      liveProject.target_area_sqkm ||
      reqPayload.requested_area_sqkm ||
      reqPayload.target_area_sqkm;
    const areaStr = areaVal ? `${areaVal} sq. km` : '—';

    const startDateRaw = reqPayload.start_date || liveProject.created_at;
    const completedCount = liveSectors.filter((s) => s.status === 'completed' || s.status === 'verified').length;
    const overallProgress = liveSectors.length > 0 ? Math.round((completedCount / liveSectors.length) * 100) : (liveProject.status === 'completed' ? 100 : 0);

    const rawLoc = (liveProject.survey_location || '').trim();
    const isCompanyOrTitle =
      !rawLoc ||
      (user?.company_name && rawLoc.toLowerCase() === user.company_name.toLowerCase()) ||
      (liveProject.title && rawLoc.toLowerCase() === liveProject.title.toLowerCase()) ||
      rawLoc.toLowerCase() === 'survey area' ||
      rawLoc.toLowerCase() === 'survey location site';

    const safeLocation =
      reqPayload.address ||
      reqPayload.location_address ||
      reqPayload.site_address ||
      (!isCompanyOrTitle && rawLoc ? rawLoc : null) ||
      (reqPayload.city && reqPayload.state ? `${reqPayload.city}, ${reqPayload.state}` : '—');

    const pilotsCount = Array.isArray(reqPayload.mobilisation?.pilots) ? reqPayload.mobilisation.pilots.length : 0;

    return {
      id: liveProject.id,
      title: liveProject.title,
      status: liveProject.status,
      location: safeLocation,
      startDate: formatDate(startDateRaw),
      createdDate: formatDate(liveProject.created_at),
      teamSize: pilotsCount > 0 ? pilotsCount + 1 : 1,
      description: liveProject.description || reqPayload.remarks || '—',
      totalArea: areaStr,
      totalSectors: liveSectors.length,
      approvedPlanDate: livePlan?.created_at ? formatDate(livePlan.created_at) : '—',
      estCompletion: '—',
      overallProgress,
      projectManager: 'LATRICS Operations',
      primaryContact: user?.full_name || liveProject.client_name || user?.company_name || '—',
    };
  }, [liveProject, livePlan, liveSectors, projectId, user, formatDate, livePlanningVersions, planningDraftData?.kmlCalculatedArea]);

  // Helper to dynamically match a profile from all directory users, org members, and current session
  const findMatchingProfile = useCallback(
    (candidates: (string | undefined | null)[]): UserProfile | null => {
      const pool = allDirectoryUsers.length > 0 ? allDirectoryUsers : orgMembers;
      for (const raw of candidates) {
        if (!raw) continue;
        const c = String(raw).trim().toLowerCase();
        if (!c || c === '—' || c === 'null' || c === 'undefined') continue;

        // 1. Match by exact ID
        const byId = pool.find((u) => u.id === raw);
        if (byId) return byId;

        // 2. Match by Email
        const byEmail = pool.find((u) => u.email?.toLowerCase() === c);
        if (byEmail) return byEmail;

        // 3. Match by Full Name
        const byName = pool.find((u) => u.full_name?.toLowerCase() === c);
        if (byName) return byName;
      }
      return null;
    },
    [allDirectoryUsers, orgMembers]
  );

  // Stakeholder & Mobilisation Contact Details - Automatically synced with live user profiles
  const primaryContact = useMemo(() => {
    const reqPayload = (liveProject?.requirements_payload || {}) as Record<string, any>;
    const p = reqPayload.primary_contact || {};
    const mob = reqPayload.mobilisation || {};

    // Match profile from live database profiles
    const matchedProfile = findMatchingProfile([
      liveProject?.client_id,
      p.id,
      p.email,
      liveProject?.client_email,
      mob.clientCoordinatorEmail,
      p.name,
      liveProject?.client_name,
      mob.clientCoordinatorName,
    ]);

    const realUser = matchedProfile || (isClient && user ? user : null);
    const rawPhone = realUser?.phone_number || p.phone || mob.clientCoordinatorPhone;
    const safePhone = rawPhone && typeof rawPhone === 'string' && !rawPhone.includes('@') && rawPhone.trim().length >= 5 ? rawPhone.trim() : null;

    return {
      name: realUser?.full_name || liveProject?.client_name || p.name || mob.clientCoordinatorName || (isClient ? user?.full_name : null) || 'Client Representative',
      email: realUser?.email || liveProject?.client_email || p.email || mob.clientCoordinatorEmail || (isClient ? user?.email : null) || '—',
      phone: safePhone || '—',
      company: realUser?.company_name || liveProject?.client_company || user?.company_name || reqPayload.company_name || 'Client Organization',
      designation: realUser?.designation || (realUser?.company_profile as any)?.designation || 'Primary Client',
    };
  }, [liveProject, user, isClient, findMatchingProfile]);

  const appointedSubordinate = useMemo(() => {
    const reqPayload = (liveProject?.requirements_payload || {}) as Record<string, any>;
    const sub = reqPayload.appointed_subordinate || {};
    const mob = reqPayload.mobilisation || {};
    const firstComm = Array.isArray(reqPayload.communication_contacts) && reqPayload.communication_contacts[0];
    const commName = typeof firstComm === 'string' ? firstComm : firstComm?.name;
    const commEmail = typeof firstComm === 'object' ? firstComm?.email : undefined;

    const targetId = sub.id || sub.user_id || mob.clientLocalPocUserId;
    const targetEmail = sub.email || mob.clientCoordinatorEmail || commEmail;
    const targetName = sub.name || mob.clientLocalPocName || commName;

    // Search real profile from known users
    const matchedProfile = findMatchingProfile([
      targetId,
      targetEmail,
      targetName,
    ]);

    if (matchedProfile) {
      const rawPhone = matchedProfile.phone_number || sub.phone || mob.clientLocalPocPhone;
      const safePhone = rawPhone && typeof rawPhone === 'string' && !rawPhone.includes('@') && rawPhone.trim().length >= 5 ? rawPhone.trim() : null;
      return {
        name: matchedProfile.full_name || targetName,
        email: matchedProfile.email || '—',
        phone: safePhone || '—',
        designation: matchedProfile.designation || (matchedProfile.company_profile as any)?.designation || sub.designation || mob.clientLocalPocDesignation || 'Project Coordinator / Subordinate',
      };
    }

    if (targetName && targetName !== 'None Appointed' && targetName !== '—') {
      const rawPhone = sub.phone || mob.clientLocalPocPhone;
      const safePhone = rawPhone && typeof rawPhone === 'string' && !rawPhone.includes('@') && rawPhone.trim().length >= 5 ? rawPhone.trim() : null;
      return {
        name: targetName,
        email: targetEmail || '—',
        phone: safePhone || '—',
        designation: sub.designation || mob.clientLocalPocDesignation || 'Local Point of Contact',
      };
    }

    return {
      name: 'None Appointed',
      email: '—',
      phone: '—',
      designation: 'No subordinate assigned yet',
    };
  }, [liveProject, findMatchingProfile]);

  const opsHandler = useMemo(() => {
    const reqPayload = (liveProject?.requirements_payload || {}) as Record<string, any>;
    const ops = reqPayload.ops_handler || {};
    const mob = reqPayload.mobilisation || {};

    const targetId = ops.id || ops.user_id || mob.latricsOpsUserId;
    const targetEmail = ops.email || mob.latricsOpsPocEmail;
    const targetName = ops.name || mob.latricsOpsPocName;

    // Search real staff from known users or staff
    const matchedProfile = findMatchingProfile([
      targetId,
      targetEmail,
      targetName,
    ]);

    const realStaff = matchedProfile || (isOps && user ? user : (staffUsers.length > 0 ? staffUsers[0] : null));
    const rawPhone = realStaff?.phone_number || ops.phone || mob.latricsOpsPocPhone;
    const safePhone = rawPhone && typeof rawPhone === 'string' && !rawPhone.includes('@') && rawPhone.trim().length >= 5 ? rawPhone.trim() : null;

    return {
      name: realStaff?.full_name || targetName || (isOps ? user?.full_name : null) || 'LATRICS Operations Lead',
      email: realStaff?.email || targetEmail || (isOps ? user?.email : null) || 'ops@latrics.com',
      phone: safePhone || '—',
      role: realStaff?.designation || (realStaff?.company_profile as any)?.designation || 'Operations Flight Manager',
    };
  }, [liveProject, staffUsers, isOps, user, findMatchingProfile]);

  const assignedPilots = useMemo<PilotCrewMember[]>(() => {
    // 1. Raw entries from mobilisation requirements payload
    const reqPayload = (liveProject?.requirements_payload || {}) as Record<string, any>;
    const mob = reqPayload.mobilisation || {};
    const rawPilots: any[] = Array.isArray(mob.pilots) ? [...mob.pilots] : [];

    // 2. Also collect pilots assigned across liveSectors
    if (Array.isArray(liveSectors)) {
      liveSectors.forEach((sec) => {
        const planning = sec.planning || (sec.polygon_coordinates as any)?.planning || {};
        if (Array.isArray(planning.assigned_pilots) && planning.assigned_pilots.length > 0) {
          planning.assigned_pilots.forEach((ap: any) => {
            if (ap && (ap.name || ap.email)) {
              rawPilots.push({
                id: ap.id,
                name: ap.name,
                email: ap.email,
                contactNo: ap.phone || ap.contactNo,
                is_pending_invite: ap.status === 'pending_invite' || planning.is_pending_invite,
              });
            }
          });
        } else if (planning.assigned_pilot) {
          rawPilots.push({
            id: planning.assigned_pilot_id,
            name: planning.assigned_pilot,
            email: planning.pilot_email,
            contactNo: planning.pilot_phone,
            is_pending_invite: planning.is_pending_invite,
          });
        }
      });
    }

    if (rawPilots.length === 0) return [];

    // 3. Deduplicate raw pilots
    const deduplicated: any[] = [];
    rawPilots.forEach((p) => {
      if (!p || (!p.name && !p.email && !p.id)) return;
      const cleanEmail = p.email ? p.email.trim().toLowerCase() : null;
      const cleanName = p.name ? p.name.trim().toLowerCase() : null;
      const cleanId = p.id ? String(p.id).trim() : null;

      const existingIndex = deduplicated.findIndex((e) => {
        if (cleanId && e.id && String(e.id).trim() === cleanId) return true;
        if (cleanEmail && e.email && e.email.trim().toLowerCase() === cleanEmail) return true;
        if (cleanName && e.name && e.name.trim().toLowerCase() === cleanName) return true;
        return false;
      });

      if (existingIndex >= 0) {
        const existing = deduplicated[existingIndex];
        if (!existing.email && cleanEmail) existing.email = p.email;
        if ((!existing.contactNo || existing.contactNo === '—') && p.contactNo) existing.contactNo = p.contactNo;
        if (p.is_pending_invite !== undefined) {
          existing.is_pending_invite = existing.is_pending_invite || p.is_pending_invite;
        }
        if (p.age && !existing.age) existing.age = p.age;
        if (p.aadhaarNo && !existing.aadhaarNo) existing.aadhaarNo = p.aadhaarNo;
        if (p.dgcaLicenseNo && !existing.dgcaLicenseNo) existing.dgcaLicenseNo = p.dgcaLicenseNo;
      } else {
        deduplicated.push({ ...p });
      }
    });

    // 4. Map each deduplicated pilot with matched profile from directory
    return deduplicated.map((p: any) => {
      const matchedPilot =
        findMatchingProfile([p.id, p.user_id, p.email, p.name]) ||
        pilotUsers.find(
          (u) =>
            (p.id && u.id === p.id) ||
            (p.email && u.email?.toLowerCase() === p.email.toLowerCase()) ||
            (p.name && u.full_name?.toLowerCase() === p.name.toLowerCase())
        ) ||
        allDirectoryUsers.find(
          (u) =>
            (p.id && u.id === p.id) ||
            (p.email && u.email?.toLowerCase() === p.email.toLowerCase()) ||
            (p.name && u.full_name?.toLowerCase() === p.name.toLowerCase())
        );

      const pilotProfile = (matchedPilot?.pilot_profile || (matchedPilot?.company_profile as any)?.pilot_profile || {}) as Record<string, any>;

      // Check if user has authenticated & filled their profile in directory
      const hasDirectoryProfile = Boolean(
        pilotProfile.dgca_license_number ||
        pilotProfile.aadhaar_number ||
        pilotProfile.age
      );

      const isRegistered = Boolean(matchedPilot && matchedPilot.id);
      const isPendingInvite = Boolean(p.is_pending_invite && !isRegistered);

      const rawPhone = matchedPilot?.phone_number || p.contactNo || p.phone;
      const safePhone = rawPhone && typeof rawPhone === 'string' && !rawPhone.includes('@') && rawPhone.trim().length >= 5 ? rawPhone.trim() : null;

      // When pilot hasn't authenticated / registered yet, or hasn't updated profile:
      // display ONLY what Ops filled (name, email, phone) and rest remain blank!
      const age = hasDirectoryProfile && pilotProfile.age
        ? String(pilotProfile.age)
        : (!isPendingInvite && !p.is_pending_invite && p.age ? String(p.age) : undefined);

      const aadhaarNo = hasDirectoryProfile && pilotProfile.aadhaar_number
        ? pilotProfile.aadhaar_number
        : (!isPendingInvite && !p.is_pending_invite && p.aadhaarNo ? p.aadhaarNo : undefined);

      const dgcaLicenseNo = hasDirectoryProfile && pilotProfile.dgca_license_number
        ? pilotProfile.dgca_license_number
        : (!isPendingInvite && !p.is_pending_invite && p.dgcaLicenseNo && p.dgcaLicenseNo !== 'DGCA Verified' ? p.dgcaLicenseNo : undefined);

      const isProfileCompleted = Boolean(hasDirectoryProfile || (dgcaLicenseNo && !isPendingInvite && !p.is_pending_invite));

      return {
        id: p.id || matchedPilot?.id || `pilot_${p.email || p.name || Date.now()}`,
        name: matchedPilot?.full_name || p.name || 'Certified Pilot',
        email: matchedPilot?.email || p.email,
        role: isPendingInvite
          ? 'Remote Pilot (Invited)'
          : isProfileCompleted
          ? (matchedPilot?.designation || p.role || 'Certified Remote Pilot')
          : 'Assigned Remote Pilot',
        contactNo: safePhone || (p.contactNo && p.contactNo !== '—' ? p.contactNo : '—'),
        age,
        aadhaarNo,
        dgcaLicenseNo,
        insuranceActive: p.insuranceActive ?? true,
        isPendingInvite,
        isProfileCompleted,
      };
    });
  }, [liveProject, liveSectors, pilotUsers, allDirectoryUsers, findMatchingProfile]);

  const handleOpenEditClientModal = async () => {
    setEditPrimaryName(primaryContact.name !== 'Primary Client' ? primaryContact.name : user?.full_name || '');
    setEditPrimaryEmail(primaryContact.email !== '—' ? primaryContact.email : user?.email || '');
    setEditPrimaryPhone(primaryContact.phone !== '—' ? primaryContact.phone : user?.phone_number || '');
    setEditSubName(appointedSubordinate.name !== 'None Appointed' ? appointedSubordinate.name : '');
    setEditSubEmail(appointedSubordinate.email !== '—' ? appointedSubordinate.email : '');
    setEditSubPhone(appointedSubordinate.phone !== '—' ? appointedSubordinate.phone : '');
    setEditSubDesignation(
      appointedSubordinate.designation !== 'No subordinate assigned yet' && appointedSubordinate.designation !== 'Appointed Subordinate (from Request)'
        ? appointedSubordinate.designation
        : 'Project Coordinator'
    );
    setSelectedSubUserId('');
    setIsEditClientModalOpen(true);
    try {
      const members = await usersApi.getOrganizationMembers();
      setOrgSubordinates(members.filter((m) => m.id !== user?.id));
    } catch {
      setOrgSubordinates([]);
    }
  };

  const handleSelectSubMember = (userId: string) => {
    setSelectedSubUserId(userId);
    if (!userId) return;
    const found = orgSubordinates.find((m) => m.id === userId);
    if (found) {
      setEditSubName(found.full_name || '');
      setEditSubEmail(found.email || '');
      setEditSubPhone(found.phone_number || '');
      setEditSubDesignation(found.designation || 'Project Coordinator / Subordinate');
    }
  };

  const handleSaveClientContacts = async () => {
    if (!liveProject || getStepStatus(3) === 'completed' || isPilot) return;
    setIsSavingContacts(true);
    try {
      const currentPayload = (liveProject.requirements_payload || {}) as Record<string, any>;
      const updatedPayload = {
        ...currentPayload,
        primary_contact: {
          name: editPrimaryName.trim() || primaryContact.name,
          email: editPrimaryEmail.trim() || primaryContact.email,
          phone: editPrimaryPhone.trim() || primaryContact.phone,
        },
        appointed_subordinate: {
          name: editSubName.trim(),
          email: editSubEmail.trim(),
          phone: editSubPhone.trim(),
          designation: editSubDesignation.trim() || 'Project Coordinator',
        },
        communication_contacts: [
          {
            name: editSubName.trim(),
            email: editSubEmail.trim(),
            phone: editSubPhone.trim(),
            designation: editSubDesignation.trim() || 'Project Coordinator',
          },
        ],
        mobilisation: {
          ...(currentPayload.mobilisation || {}),
          clientCoordinatorName: editPrimaryName.trim(),
          clientCoordinatorEmail: editPrimaryEmail.trim(),
          clientCoordinatorPhone: editPrimaryPhone.trim(),
          clientLocalPocName: editSubName.trim(),
          clientLocalPocPhone: editSubPhone.trim(),
          clientLocalPocDesignation: editSubDesignation.trim() || 'Project Coordinator',
        },
      };

      await projectApi.updateProject(projectId, {
        requirements_payload: updatedPayload,
      });

      await fetchProjectOverview();
      setIsEditClientModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update client contacts');
    } finally {
      setIsSavingContacts(false);
    }
  };

  const handleOpenEditOpsModal = async () => {
    setEditOpsName(opsHandler.name);
    setEditOpsEmail(opsHandler.email);
    setEditOpsPhone(opsHandler.phone);
    setEditPilotsList([...assignedPilots]);
    setNewPilotName('');
    setNewPilotEmail('');
    setNewPilotLicense('');
    setNewPilotPhone('');
    setNewPilotRole('Lead Remote Pilot');
    setNewPilotAge('');
    setNewPilotAadhaar('');
    setSelectedDirPilotId('');
    setIsEditOpsModalOpen(true);
    try {
      const pUsers = await usersApi.listUsers('pilot');
      setAvailablePilots(pUsers);
    } catch {
      setAvailablePilots([]);
    }
  };

  const handleAddPilotFromDirectory = (pilotUserId: string) => {
    if (!pilotUserId) return;
    const found = availablePilots.find((p) => p.id === pilotUserId);
    if (!found) return;
    const already = editPilotsList.some((p) => p.id === found.id || p.name.toLowerCase() === found.full_name?.toLowerCase());
    if (already) {
      alert('This pilot is already assigned to the project.');
      return;
    }
    const pilotProfile = found.pilot_profile || {};
    const newEntry: PilotCrewMember = {
      id: found.id || `pilot_${Date.now()}`,
      name: found.full_name || 'Certified Pilot',
      email: found.email || undefined,
      role: editPilotsList.length === 0 ? 'Lead Remote Pilot' : 'Co-Pilot / Drone Operator',
      contactNo: found.phone_number || '—',
      age: pilotProfile.age ? String(pilotProfile.age) : undefined,
      aadhaarNo: pilotProfile.aadhaar_number || undefined,
      dgcaLicenseNo: pilotProfile.dgca_license_number || undefined,
      insuranceActive: true,
    };
    setEditPilotsList((prev) => [...prev, newEntry]);
    setSelectedDirPilotId('');
  };

  const handleAddCustomPilot = () => {
    if (!newPilotName.trim()) {
      alert('Please enter pilot name');
      return;
    }
    const newEntry: PilotCrewMember = {
      id: `pilot_${Date.now()}`,
      name: newPilotName.trim(),
      email: newPilotEmail.trim() || undefined,
      role: newPilotRole || 'Lead Remote Pilot',
      contactNo: newPilotPhone.trim() || '—',
      age: newPilotAge.trim() || undefined,
      aadhaarNo: newPilotAadhaar.trim() || undefined,
      dgcaLicenseNo: newPilotLicense.trim() || undefined,
      insuranceActive: true,
    };
    setEditPilotsList((prev) => [...prev, newEntry]);
    setNewPilotName('');
    setNewPilotEmail('');
    setNewPilotLicense('');
    setNewPilotPhone('');
    setNewPilotAge('');
    setNewPilotAadhaar('');
  };

  const handleRemovePilot = (pilotId: string) => {
    setEditPilotsList((prev) => prev.filter((p) => p.id !== pilotId));
  };

  const handleSaveOpsAndPilots = async () => {
    if (!liveProject || getStepStatus(3) === 'completed' || !isOps) return;
    setIsSavingContacts(true);
    try {
      const currentPayload = (liveProject.requirements_payload || {}) as Record<string, any>;
      const updatedPayload = {
        ...currentPayload,
        ops_handler: {
          name: editOpsName.trim() || opsHandler.name,
          email: editOpsEmail.trim() || opsHandler.email,
          phone: editOpsPhone.trim() || opsHandler.phone,
        },
        mobilisation: {
          ...(currentPayload.mobilisation || {}),
          latricsOpsPocName: editOpsName.trim() || opsHandler.name,
          latricsOpsPocEmail: editOpsEmail.trim() || opsHandler.email,
          latricsOpsPocPhone: editOpsPhone.trim() || opsHandler.phone,
          pilots: editPilotsList,
        },
      };

      await projectApi.updateProject(projectId, {
        requirements_payload: updatedPayload,
      });

      await fetchProjectOverview();
      setIsEditOpsModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update operations and pilot assignments');
    } finally {
      setIsSavingContacts(false);
    }
  };

  const isMobilisationGatePassed = useMemo(() => {
    if (!liveProject) return false;
    const reqPayload = (liveProject.requirements_payload || {}) as Record<string, any>;
    const mob = (reqPayload.mobilisation || {}) as Record<string, any>;
    const resp = mob.responsibility || mob.mobilisationResponsibility;
    if (resp === 'CLIENT') {
      return (mob.clientTicketApprovalStatus || mob.client_ticket_approval_status) === 'APPROVED';
    }
    if (resp === 'LATRICS') {
      return (mob.latricsAdvancePaymentStatus || mob.latrics_advance_payment_status) === 'VERIFIED';
    }
    return false;
  }, [liveProject]);

  const handleConfirmProceedToNextStage = async () => {
    if (!liveProject || getStepStatus(3) === 'completed' || !isOps) return;
    if (!isMobilisationGatePassed) {
      alert(
        'Cannot advance to Stage 4 (Capturing): Required mobilization gate is locked.\n\n' +
        '• If Client responsibility: Travel tickets and bills must be approved & validated as genuine by Operations.\n' +
        '• If Latrics responsibility: The ₹5,000 advance payment transaction slip must be verified by Operations.'
      );
      return;
    }
    setIsProceedingStage(true);
    try {
      await projectApi.updateProject(projectId, {
        status: 'active' as any,
      });

      await fetchProjectOverview();
      setIsProceedStageModalOpen(false);
      setSelectedStageId(4);
      setActiveTab('stage');
    } catch (err: any) {
      alert(err.message || 'Failed to advance project to next stage');
    } finally {
      setIsProceedingStage(false);
    }
  };

  const activeRequest = useMemo(() => {
    return liveRequests && liveRequests.length > 0 ? liveRequests[0] : null;
  }, [liveRequests]);

  const isRequestFilled = useMemo(() => {
    // 1. If project has a formal RequestVersion record
    if (liveRequests && liveRequests.length > 0) return true;

    if (!liveProject) return false;

    // 2. If project is in submitted, planning, approved, active, or completed status
    const status = (liveProject.status || '').toLowerCase();
    if (['submitted', 'planning', 'approved', 'active', 'completed'].includes(status)) {
      return true;
    }

    // 3. Inspect requirements_payload for completed form
    const payload = (liveProject.requirements_payload || {}) as Record<string, any>;
    if (payload.is_draft === true) {
      return false;
    }

    const hasSensor = Boolean(payload.payload_sensor || liveProject.payload || liveProject.survey_type);
    const hasDeliverables = Boolean(
      (Array.isArray(payload.deliverables) && payload.deliverables.length > 0) ||
      (payload.post_deliverables && Object.values(payload.post_deliverables).some(Boolean)) ||
      (payload.pre_deliverables && Object.values(payload.pre_deliverables).some(Boolean))
    );
    const hasLocation = Boolean(payload.address || payload.location_address || payload.city || payload.state || liveProject.survey_location);

    return Boolean(hasSensor && (hasDeliverables || hasLocation));
  }, [liveRequests, liveProject]);

  const reqFormDetails = useMemo(() => {
    const payload = (liveProject?.requirements_payload || activeRequest?.requirements_payload || {}) as Record<string, any>;

    // Location & Area
    const rawLoc =
      projectDetails.location && projectDetails.location !== '—'
        ? projectDetails.location
        : payload.address || payload.location_address || liveProject?.survey_location || '—';
    const city = payload.city || liveProject?.city || '—';
    const state = payload.state || liveProject?.state || '—';
    const planningCalculatedArea =
      (livePlanningVersions?.[0]?.form_data?.kmlCalculatedArea ? Number(livePlanningVersions[0].form_data.kmlCalculatedArea) : null) ||
      (planningDraftData?.kmlCalculatedArea ? Number(planningDraftData.kmlCalculatedArea) : null);
    const area =
      planningCalculatedArea
        ? `${planningCalculatedArea} sq. km`
        : projectDetails.totalArea && projectDetails.totalArea !== '—'
        ? projectDetails.totalArea
        : payload.target_area_sqkm || payload.requested_area_sqkm
        ? `${payload.target_area_sqkm || payload.requested_area_sqkm} sq. km`
        : '—';

    // Dates
    const startDate = payload.start_date ? formatDate(payload.start_date) : projectDetails.startDate;
    const endDate = payload.end_date
      ? formatDate(payload.end_date)
      : payload.tenure_days
      ? `${payload.tenure_days} days tenure`
      : '—';
    const submissionDate = projectDetails.createdDate;

    // Contact
    const company = payload.company_name || liveProject?.client_company || user?.company_name || '—';
    const primaryName = payload.primary_contact?.name || liveProject?.client_name || user?.full_name || 'Client Contact';
    const primaryEmail = payload.primary_contact?.email || liveProject?.client_email || user?.email || '—';
    const primaryPhone = payload.primary_contact?.phone || user?.phone_number || '—';
    const commContacts: string[] = Array.isArray(payload.communication_contacts)
      ? payload.communication_contacts.map((c: any) => (typeof c === 'string' ? c : c.name || String(c)))
      : [];

    // Payload Sensor
    const rawSensor = String(payload.payload_sensor || liveProject?.payload || liveProject?.survey_type || '61mp_camera').toLowerCase();
    let sensorLabel = '61MP Camera (RGB Photogrammetry)';
    let sensorDesc = 'Full-frame 61MP optical sensor for high-fidelity orthomosaics and 3D terrain modeling.';
    if (rawSensor.includes('lidar')) {
      sensorLabel = 'LiDAR Sensor';
      sensorDesc = 'High-density laser scanning for digital elevation models and vegetation penetration.';
    } else if (rawSensor.includes('oblique')) {
      sensorLabel = 'Oblique Camera';
      sensorDesc = 'Multi-angle aerial imagery for complex 3D facades and structural reconstruction.';
    } else if (rawSensor.includes('thermal')) {
      sensorLabel = 'Thermal IR Sensor';
      sensorDesc = 'Infrared thermography for thermal anomaly inspection and solar analysis.';
    }

    // Processing Modes
    const modes: string[] = [];
    if (Array.isArray(payload.processing_modes) && payload.processing_modes.length > 0) {
      if (payload.processing_modes.includes('pre_processing')) modes.push('Pre-Processing');
      if (payload.processing_modes.includes('post_processing')) modes.push('Post-Processing');
    } else if (payload.processing_mode === 'both') {
      modes.push('Pre-Processing', 'Post-Processing');
    } else if (payload.processing_mode === 'pre_processing') {
      modes.push('Pre-Processing');
    } else {
      modes.push('Post-Processing');
    }

    const isProcessingType = (val: string) => {
      const clean = val.trim().toLowerCase().replace(/[\s-_]/g, '');
      return (
        clean === 'preprocessing' ||
        clean === 'postprocessing' ||
        clean === 'pre' ||
        clean === 'post' ||
        clean === 'both' ||
        clean === 'processing'
      );
    };

    // Deliverables
    const deliverablesList: string[] = [];
    if (Array.isArray(payload.deliverables) && payload.deliverables.length > 0) {
      payload.deliverables.forEach((d: string) => {
        if (typeof d === 'string' && d.trim()) {
          const clean = d.replace(/_/g, ' ');
          if (!isProcessingType(clean) && !deliverablesList.some((item) => item.toLowerCase() === clean.toLowerCase())) {
            deliverablesList.push(clean);
          }
        }
      });
    }
    if (payload.post_deliverables && typeof payload.post_deliverables === 'object') {
      Object.entries(payload.post_deliverables).forEach(([k, v]) => {
        if (v) {
          const cleanK = k.replace(/_/g, ' ');
          if (!isProcessingType(cleanK) && !deliverablesList.some((item) => item.toLowerCase() === cleanK.toLowerCase())) {
            deliverablesList.push(cleanK);
          }
        }
      });
    }
    if (payload.pre_deliverables && typeof payload.pre_deliverables === 'object') {
      Object.entries(payload.pre_deliverables).forEach(([k, v]) => {
        if (v) {
          const cleanK = k.replace(/_/g, ' ');
          if (!isProcessingType(cleanK) && !deliverablesList.some((item) => item.toLowerCase() === cleanK.toLowerCase())) {
            deliverablesList.push(cleanK);
          }
        }
      });
    }
    if (deliverablesList.length === 0) {
      deliverablesList.push('Orthomosaic', 'DEM', 'DSM', 'Point Cloud');
    }

    // Boundary & Scope Files
    const boundaryObj =
      (Array.isArray(payload.attachments) &&
        payload.attachments.find((a: any) => (a.type || '').includes('KML') || (a.category || '').includes('Boundary') || (a.name || '').endsWith('.kml') || (a.name || '').endsWith('.kmz'))) ||
      (Array.isArray(payload.kml_files) && payload.kml_files[0]) ||
      null;

    const boundaryFilename =
      payload.kml_filename ||
      boundaryObj?.name ||
      'Survey_Boundary.kml';

    const boundaryDataUrl = boundaryObj?.dataUrl || null;

    const scopeObj =
      (Array.isArray(payload.attachments) &&
        payload.attachments.find((a: any) => (a.type || '').includes('PDF') || (a.category || '').includes('Scope') || (a.name || '').endsWith('.pdf'))) ||
      (Array.isArray(payload.scope_files) && payload.scope_files[0]) ||
      null;

    const scopeFilename =
      payload.scope_filename ||
      scopeObj?.name ||
      null;

    const scopeDataUrl = scopeObj?.dataUrl || null;

    // Remarks: strictly client-entered remarks, no auto-generated text
    const remarks = (payload.remarks || payload.client_notes || '').trim() || null;

    return {
      rawLoc,
      city,
      state,
      area,
      startDate,
      endDate,
      submissionDate,
      company,
      primaryName,
      primaryEmail,
      primaryPhone,
      commContacts,
      sensorLabel,
      sensorDesc,
      modes,
      deliverablesList,
      boundaryFilename,
      boundaryDataUrl,
      scopeFilename,
      scopeDataUrl,
      remarks,
      version: activeRequest?.version || 1,
    };
  }, [liveProject, activeRequest, projectDetails, user, formatDate, livePlanningVersions, planningDraftData?.kmlCalculatedArea]);

  const isPlanningFilled = useMemo(() => {
    // 1. If project has a formal PlanningFormVersion record with populated data
    if (livePlanningVersions && livePlanningVersions.length > 0) {
      const fd = livePlanningVersions[0]?.form_data;
      if (fd && typeof fd === 'object' && Object.keys(fd).length > 0) {
        const hasData = Boolean(
          fd.feasibilityDecision ||
          fd.expectedSurveyDays ||
          fd.kmlCalculatedArea ||
          fd.plannedAltitudeMeters ||
          (Array.isArray(fd.airspaceZones) && fd.airspaceZones.length > 0) ||
          (Array.isArray(fd.terrainTypes) && fd.terrainTypes.length > 0) ||
          fd.gcpsNeeded ||
          fd.numberOfLandings
        );
        if (hasData) return true;
      }
    }

    // 2. If local planning draft has populated data
    if (planningDraftData && Object.keys(planningDraftData).length > 0) {
      const hasDraftData = Boolean(
        planningDraftData.feasibilityDecision ||
        planningDraftData.expectedSurveyDays ||
        planningDraftData.kmlCalculatedArea ||
        planningDraftData.plannedAltitudeMeters ||
        (Array.isArray(planningDraftData.airspaceZones) && planningDraftData.airspaceZones.length > 0) ||
        (Array.isArray(planningDraftData.terrainTypes) && planningDraftData.terrainTypes.length > 0) ||
        planningDraftData.gcpsNeeded ||
        planningDraftData.numberOfLandings
      );
      if (hasDraftData) return true;
    }

    // 3. If project status has progressed beyond planning
    const status = (liveProject?.status || '').toLowerCase();
    if (['approved', 'active', 'completed', 'mobilising', 'surveying'].includes(status)) {
      return true;
    }

    return false;
  }, [livePlanningVersions, planningDraftData, liveProject]);

  const isProjectOnHoldOrCancelled = useMemo(() => {
    const s = (liveProject?.status || '').toLowerCase();
    return ['hold', 'on_hold', 'cancelled', 'rejected'].includes(s);
  }, [liveProject?.status]);

  const canOpsReopenStage = useMemo(() => {
    // Only and only when planning or requests are put on Hold or Cancelled can Ops reopen
    // Once project moved to Mobilisation (or approved, active, completed), previous stages can NEVER be reopened!
    return isProjectOnHoldOrCancelled && (user?.role === 'admin' || user?.role === 'operations');
  }, [isProjectOnHoldOrCancelled, user?.role]);

  const [isReopeningStage, setIsReopeningStage] = useState(false);
  const handleReopenStage = async (stageId: number) => {
    if (!liveProject) return;
    const stageObj = PIPELINE_STAGES.find((s) => s.id === stageId);
    const stageName = stageObj ? stageObj.name : `Stage ${stageId}`;
    const confirmed = window.confirm(
      `Are you sure you want to reopen ${stageName}? Reopening will unlock this on-hold/cancelled stage and resume the operational workflow.`
    );
    if (!confirmed) return;

    setIsReopeningStage(true);
    try {
      let targetStatus = 'submitted';
      if (stageId === 1) targetStatus = 'submitted';
      else if (stageId === 2) targetStatus = 'planning';
      else if (stageId === 3) targetStatus = 'approved';
      else if (stageId === 4) targetStatus = 'active';

      await projectApi.updateProject(liveProject.id, {
        status: targetStatus as any,
      });

      await fetchProjectOverview();
    } catch (err: any) {
      alert(`Failed to reopen stage: ${err.message || 'Unknown error'}`);
    } finally {
      setIsReopeningStage(false);
    }
  };

  const planningDetails = useMemo(() => {
    // Priority: local draft -> latest saved planning version from backend -> empty
    const backendFormData =
      livePlanningVersions && livePlanningVersions.length > 0
        ? livePlanningVersions[0].form_data || {}
        : {};
    const formData =
      planningDraftData && Object.keys(planningDraftData).length > 0
        ? planningDraftData
        : backendFormData;

    const reqPayload = (liveProject?.requirements_payload || {}) as Record<string, any>;

    // 1. KML Findings & Boundary Demarcation
    const kmlFile =
      formData.kmlFileName ||
      reqFormDetails.boundaryFilename ||
      (Array.isArray(reqPayload.kml_files) && reqPayload.kml_files[0]?.name) ||
      reqPayload.kml_filename ||
      '—';
    const kmlSize = formData.kmlFileSize || '—';
    const calculatedArea = formData.kmlCalculatedArea ? `${formData.kmlCalculatedArea} sq. km` : '—';
    const requestedArea = formData.kmlRequestedArea
      ? `${formData.kmlRequestedArea} sq. km`
      : liveProject?.target_area_sqkm
      ? `${liveProject.target_area_sqkm} sq. km`
      : reqFormDetails.area !== '—'
      ? reqFormDetails.area
      : '—';
    const boundaryNotes = formData.kmlBoundaryStatus || '—';

    // 2. Regularity and Airspace Classification
    const airspaceZones =
      Array.isArray(formData.airspaceZones) && formData.airspaceZones.length > 0
        ? formData.airspaceZones.join(', ')
        : '—';
    const dgcaClearance = formData.dgcaClearanceRequired || '—';
    const airportProximity = formData.airportProximityKm ? `${formData.airportProximityKm} km` : '—';
    const nearestAerodrome = formData.nearestAerodrome || '—';
    const policeIntimation = formData.policeIntimationRequired || '—';

    // 3. Accessibility & Terrain Feasibility
    const terrain =
      Array.isArray(formData.terrainTypes) && formData.terrainTypes.length > 0
        ? formData.terrainTypes.join(', ')
        : formData.terrainType || '—';
    const weather =
      Array.isArray(formData.weatherConditions) && formData.weatherConditions.length > 0
        ? formData.weatherConditions.join(', ')
        : '—';
    const elevationVariation = formData.elevationVariationMeters
      ? `${formData.elevationVariationMeters} m`
      : '—';
    const fieldAccess =
      formData.fieldAccessIdentified === true
        ? 'Identified & Confirmed'
        : formData.fieldAccessIdentified === false
        ? 'Not Identified'
        : '—';
    const stagingNotes = formData.fieldAccessNotes || '—';

    // 4. Obstacles and Hazards Assessment
    const hazards =
      Array.isArray(formData.hazards) && formData.hazards.length > 0
        ? formData.hazards.join(', ')
        : '—';
    const maxObstacleHeight = formData.maxObstacleHeightMeters
      ? `${formData.maxObstacleHeightMeters} m`
      : '—';
    const safetyBuffer = formData.safetyBufferDistanceMeters
      ? `${formData.safetyBufferDistanceMeters} m`
      : '—';
    const hazardMitigation = formData.hazardMitigationNotes || '—';

    // 5. Ground Control Points (GCP) Planning
    const gcpsNeeded = formData.gcpsNeeded ? `${formData.gcpsNeeded} Targets` : '—';
    const checkpoints = formData.checkpointsNeeded ? `${formData.checkpointsNeeded} Checkpoints` : '—';
    const targetSize = formData.gcpTargetSizeCm ? `${formData.gcpTargetSizeCm} cm` : '—';
    const targetMaterial = formData.gcpTargetMaterial || '—';
    const baseStation = formData.baseStationSetup || '—';
    const gcpFile = formData.gcpLocationFile || formData.gcpFileAttached || '—';

    // 6. Flight Planning & Telemetry Design
    const plannedAltitude = formData.plannedAltitudeMeters
      ? `${formData.plannedAltitudeMeters} m AGL`
      : '—';
    const gsd = formData.estimatedGsdCm ? `${formData.estimatedGsdCm} cm/px` : '—';
    const overlapRatio =
      formData.frontOverlapPercent && formData.sideOverlapPercent
        ? `${formData.frontOverlapPercent}% / ${formData.sideOverlapPercent}%`
        : formData.frontOverlapPercent
        ? `${formData.frontOverlapPercent}%`
        : '—';
    const totalFlightDuration = formData.flightDurationMinutes
      ? `${formData.flightDurationMinutes} mins`
      : '—';
    const landings = formData.numberOfLandings ? `${formData.numberOfLandings} Flights` : '—';
    const batterySets = formData.batterySetsRequired ? `${formData.batterySetsRequired} Sets` : '—';

    // 7. Expected Operational Timelines
    const surveyDays = formData.expectedSurveyDays ? `${formData.expectedSurveyDays} Days` : '—';
    const targetWindow =
      formData.expectedStartDate || formData.expectedEndDate
        ? `${formData.expectedStartDate || '—'} → ${formData.expectedEndDate || '—'}`
        : reqFormDetails.startDate !== '—' && reqFormDetails.endDate !== '—'
        ? `${reqFormDetails.startDate} → ${reqFormDetails.endDate}`
        : '—';
    const pilotTravelDate = formData.pilotTravelDate || '—';
    const weatherContingency = formData.weatherContingencyDays ? `${formData.weatherContingencyDays} Days` : '—';
    const deliveryTimeline = formData.dataDeliveryTimelineDays
      ? `${formData.dataDeliveryTimelineDays} Business Days Post-Flight`
      : '—';

    // 8. Feasible to Proceed & Operations Sign-off
    const decision =
      formData.feasibilityDecision === 'yes'
        ? 'Feasible to Proceed'
        : formData.feasibilityDecision === 'no'
        ? 'Not Feasible'
        : formData.feasibilityDecision === 'need_clarity'
        ? 'Need More Clarity'
        : '—';
    const reviewConfirmed =
      formData.reviewConfirmed === true
        ? 'Certified by LATRICS Operations'
        : '—';
    const decisionRemarks = formData.decisionRemarks || '—';
    const version = livePlanningVersions[0]?.version_number || 1;

    return {
      kmlFile,
      kmlSize,
      calculatedArea,
      requestedArea,
      boundaryNotes,
      airspaceZones,
      dgcaClearance,
      airportProximity,
      nearestAerodrome,
      policeIntimation,
      terrain,
      weather,
      elevationVariation,
      fieldAccess,
      stagingNotes,
      hazards,
      maxObstacleHeight,
      safetyBuffer,
      hazardMitigation,
      gcpsNeeded,
      checkpoints,
      targetSize,
      targetMaterial,
      baseStation,
      gcpFile,
      plannedAltitude,
      gsd,
      overlapRatio,
      totalFlightDuration,
      landings,
      batterySets,
      surveyDays,
      targetWindow,
      pilotTravelDate,
      weatherContingency,
      deliveryTimeline,
      decision,
      reviewConfirmed,
      decisionRemarks,
      version,
    };
  }, [livePlanningVersions, planningDraftData, liveProject, reqFormDetails]);

  // 6-Step Lifecycle Status Resolver
  const getStepStatus = useCallback((step: number): 'completed' | 'active' | 'pending' => {
    const s = liveProject?.status?.toLowerCase() || 'submitted';
    if (s === 'completed') return 'completed';
    if (s === 'active') {
      const payload = (liveProject?.requirements_payload || {}) as Record<string, any>;
      const procDeliv = (payload.processing_deliverables || {}) as Record<string, any>;
      const isDeliveredReady = Boolean(
        procDeliv.cleared_for_delivered_at ||
        payload.formal_acceptance?.accepted
      );
      const isCapturingDone = Boolean(
        payload.stage_progression?.capturing_completed ||
        (liveSectors.length > 0 && liveSectors.every((sec) => sec.status === 'completed' || sec.status === 'surveyed'))
      );

      if (isDeliveredReady) {
        if (step <= 5) return 'completed';
        if (step === 6) return 'active';
        return 'pending';
      }
      if (isCapturingDone) {
        if (step <= 4) return 'completed';
        if (step === 5) return 'active';
        return 'pending';
      }
      return step <= 3 ? 'completed' : step === 4 ? 'active' : 'pending';
    }
    if (s === 'approved') {
      return step <= 2 ? 'completed' : step === 3 ? 'active' : 'pending';
    }
    if (s === 'planning') {
      return step === 1 ? 'completed' : step === 2 ? 'active' : 'pending';
    }
    if (s === 'submitted' || s === 'draft') {
      return step === 1 ? 'active' : 'pending';
    }
    return step === 1 ? 'active' : 'pending';
  }, [liveProject, liveSectors]);

  const currentActiveStageNumber = useMemo(() => {
    for (let s = 1; s <= 6; s++) {
      if (getStepStatus(s) === 'active') return s;
    }
    return 6;
  }, [getStepStatus]);

  useEffect(() => {
    if (currentActiveStageNumber) {
      setSelectedStageId(currentActiveStageNumber);
    }
  }, [currentActiveStageNumber]);

  const selectedStage = useMemo(() => {
    return PIPELINE_STAGES.find((s) => s.id === selectedStageId) || PIPELINE_STAGES[0];
  }, [selectedStageId]);

  // 6-Step Lifecycle Steps (Exact Match to User UI Screenshot)
  const lifecycleSteps = useMemo(() => {
    return PIPELINE_STAGES.map((st) => ({
      step: st.id,
      label: st.label,
      name: st.name,
      desc: st.desc,
      date:
        st.id === 1
          ? projectDetails.createdDate !== '—'
            ? projectDetails.createdDate
            : '10/09/2026'
          : st.id === 2 && livePlan?.created_at
          ? formatDate(livePlan.created_at)
          : '—',
      status: getStepStatus(st.id),
      icon:
        st.id === 1
          ? ClipboardList
          : st.id === 2
          ? Compass
          : st.id === 3
          ? Users
          : st.id === 4
          ? Plane
          : st.id === 5
          ? Cpu
          : Award,
    }));
  }, [projectDetails, livePlan, getStepStatus, formatDate]);

  const stageChats = useMemo(() => {
    const payload = (liveProject?.requirements_payload || {}) as Record<string, any>;
    return (payload.stage_chats || {}) as Record<string | number, StageChatMessage[]>;
  }, [liveProject]);

  const currentStageMessages = useMemo(() => {
    const list = stageChats[selectedStageId];
    if (Array.isArray(list) && list.length > 0) return list;
    return [];
  }, [stageChats, selectedStageId]);

  const handleSendStageMessage = async (text: string, attachments?: { name: string; size?: string }[]) => {
    if (!liveProject) return;
    const stageStatus = getStepStatus(selectedStageId);
    if (stageStatus === 'completed') {
      alert('This stage is closed. Remarks and messages are permanently sealed and cannot be added from either side.');
      return;
    }
    const senderRole = user?.role || 'client';
    const isPilotSender = senderRole.toLowerCase() === 'pilot';
    if (isPilotSender && selectedStageId !== 4) {
      alert('Drone pilots only have chat write access during Stage 4 (Capturing).');
      return;
    }
    const isClient = senderRole === 'client' || senderRole === 'client_primary' || senderRole === 'client_sub';
    const senderTag = isPilotSender ? '[Pilot]' : isClient ? '[Client]' : '[LATRICS Ops]';
    const senderName = user?.full_name || (isPilotSender ? 'Drone Pilot' : isClient ? 'Client' : 'LATRICS Operations');
    const timestamp = new Date().toISOString();

    const newMessage: StageChatMessage = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      sender_name: senderName,
      sender_role: senderRole,
      sender_tag: senderTag,
      message: text,
      timestamp,
      attachments,
    };

    const currentPayload = (liveProject.requirements_payload || {}) as Record<string, any>;
    const currentChats = (currentPayload.stage_chats || {}) as Record<string, any>;
    const existingList = Array.isArray(currentChats[selectedStageId])
      ? currentChats[selectedStageId]
      : [];

    const updatedChats = {
      ...currentChats,
      [selectedStageId]: [...existingList, newMessage],
    };

    const updatedPayload = {
      ...currentPayload,
      stage_chats: updatedChats,
    };

    setLiveProject((prev) => (prev ? { ...prev, requirements_payload: updatedPayload } : null));

    await projectApi.updateProject(liveProject.id, {
      requirements_payload: updatedPayload,
    });
  };

  // Dynamic Sectors Dataset
  const sectorsData = useMemo(() => {
    if (liveSectors.length === 0) return [];
    return liveSectors.map((sec, idx) => ({
      id: idx + 1,
      name: sec.sector_code || sec.name || `Sector ${idx + 1}`,
      status:
        sec.status === 'completed' || sec.status === 'verified'
          ? 'Completed'
          : sec.status === 'in_progress'
          ? 'In Progress'
          : 'Planned',
      area: sec.target_area_sqkm || 50,
      coverage:
        sec.status === 'completed' || sec.status === 'verified'
          ? '100%'
          : sec.status === 'in_progress'
          ? '50%'
          : '0%',
      dataCaptured: sec.status === 'completed' ? '12.4 GB' : '—',
      lastUpdated: sec.updated_at ? formatDateDDMMYYYY(sec.updated_at) : '—',
      polygonSvg: 'M 40,110 L 85,110 L 85,140 L 105,140 L 105,185 L 75,185 L 75,210 L 45,210 L 30,170 Z',
      labelPos: { x: 62, y: 155 },
    }));
  }, [liveSectors]);

  // Timeline dataset
  const timelineEvents = useMemo(() => {
    if (liveTimeline.length > 0) {
      return liveTimeline.map((evt) => ({
        id: evt.id,
        title: evt.title || (evt.action ? evt.action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Activity Event'),
        description: evt.description || evt.message || 'Event logged',
        date: evt.created_at
          ? formatDateTimeDDMMYYYY(evt.created_at)
          : '—',
        actor: evt.actor_name || 'LATRICS Operations',
        actorType: evt.actor_role || 'system',
        type: evt.category || 'request',
        icon: evt.category === 'approval' ? Check : evt.category === 'plan' ? FileCheck : FileText,
      }));
    }
    return [];
  }, [liveTimeline]);

  // Documents Dataset strictly from backend data
  const projectDocuments = useMemo(() => {
    const docs: Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      uploadedBy: string;
      uploadedOn: string;
      size: string;
    }> = [];

    const reqPayload = (liveProject?.requirements_payload || {}) as Record<string, any>;
    const seenNames = new Set<string>();

    // 1. Files from attachments array (populated by upload modal, intake form, latrics requests)
    if (Array.isArray(reqPayload.attachments)) {
      reqPayload.attachments.forEach((att: any, idx: number) => {
        if (att && att.name && !seenNames.has(att.name)) {
          seenNames.add(att.name);
          docs.push({
            id: `doc-att-${idx}-${att.name}`,
            name: att.name,
            description: att.description || `${att.category || 'Uploaded document'} for survey execution`,
            category: att.category || 'Document',
            uploadedBy: att.uploadedBy || projectDetails.primaryContact || 'Client',
            uploadedOn: att.date || formatDate(liveProject?.created_at),
            size: att.size || '—',
          });
        }
      });
    }

    // 2. Multi-file KML / Boundary files
    if (Array.isArray(reqPayload.kml_files)) {
      reqPayload.kml_files.forEach((kml: any, idx: number) => {
        if (kml && kml.name && !seenNames.has(kml.name)) {
          seenNames.add(kml.name);
          docs.push({
            id: `doc-kml-${idx}-${kml.name}`,
            name: kml.name,
            description: 'Survey boundary polygon / AOI geospatial data',
            category: 'Boundary / KML',
            uploadedBy: projectDetails.primaryContact || 'Client',
            uploadedOn: formatDate(liveProject?.created_at),
            size: kml.size || '—',
          });
        }
      });
    }

    // 3. Multi-file Scope documents
    if (Array.isArray(reqPayload.scope_files)) {
      reqPayload.scope_files.forEach((sc: any, idx: number) => {
        if (sc && sc.name && !seenNames.has(sc.name)) {
          seenNames.add(sc.name);
          docs.push({
            id: `doc-scope-${idx}-${sc.name}`,
            name: sc.name,
            description: 'Technical statement of work & deliverable specifications',
            category: 'Scope Document',
            uploadedBy: projectDetails.primaryContact || 'Client',
            uploadedOn: formatDate(liveProject?.created_at),
            size: sc.size || '—',
          });
        }
      });
    }

    // 4. Legacy single filenames if not already captured
    if (reqPayload.kml_filename && typeof reqPayload.kml_filename === 'string') {
      const names = reqPayload.kml_filename.split(',').map((s: string) => s.trim()).filter(Boolean);
      names.forEach((nm: string, idx: number) => {
        if (!seenNames.has(nm)) {
          seenNames.add(nm);
          docs.push({
            id: `doc-legacy-kml-${idx}-${nm}`,
            name: nm,
            description: 'Survey boundary polygon / AOI geospatial data',
            category: 'Boundary / KML',
            uploadedBy: projectDetails.primaryContact || 'Client',
            uploadedOn: formatDate(liveProject?.created_at),
            size: '—',
          });
        }
      });
    }

    if (reqPayload.scope_filename && typeof reqPayload.scope_filename === 'string') {
      const names = reqPayload.scope_filename.split(',').map((s: string) => s.trim()).filter(Boolean);
      names.forEach((nm: string, idx: number) => {
        if (!seenNames.has(nm)) {
          seenNames.add(nm);
          docs.push({
            id: `doc-legacy-scope-${idx}-${nm}`,
            name: nm,
            description: 'Technical statement of work & deliverable specifications',
            category: 'Scope Document',
            uploadedBy: projectDetails.primaryContact || 'Client',
            uploadedOn: formatDate(liveProject?.created_at),
            size: '—',
          });
        }
      });
    }

    // 5. Generated Request Spec and Plan Spec
    if (liveProject?.latest_request) {
      docs.push({
        id: `doc-req-${liveProject.id}`,
        name: `${projectDetails.title} - Project Request Specifications.pdf`,
        description: 'Client-submitted survey requirements, polygon boundaries, and payload parameters.',
        category: 'Request',
        uploadedBy: projectDetails.primaryContact,
        uploadedOn: formatDate(liveProject.created_at),
        size: '1.2 MB',
      });
    }

    if (livePlan) {
      docs.push({
        id: `doc-plan-${livePlan.id}`,
        name: `${projectDetails.title} - Operational Survey Plan.pdf`,
        description: `Operational flight plan (${livePlan.estimated_flight_hours} flight hours, ${livePlan.required_pilots_count} pilots, ${livePlan.required_drones_count} drones).`,
        category: 'Plan',
        uploadedBy: 'LATRICS Operations',
        uploadedOn: formatDate(livePlan.created_at),
        size: '3.4 MB',
      });
    }

    return docs;
  }, [liveProject, livePlan, projectDetails, formatDate]);

  // Pilots dataset (Hydrated strictly from live project database)
  const pilotsData = useMemo(() => {
    const reqPayload = (liveProject?.requirements_payload || {}) as Record<string, any>;
    const mob = reqPayload.mobilisation;
    if (mob && Array.isArray(mob.pilots) && mob.pilots.length > 0) {
      return mob.pilots.map((p: any, idx: number) => ({
        id: p.id || `PIL-${idx + 1}`,
        name: p.name || `Pilot ${idx + 1}`,
        role: p.role || 'Drone Pilot',
        licenseNo: p.dgcaLicenseNo || '—',
        experience: p.age ? `${p.age} yrs` : '—',
        certifications: p.dgcaLicenseNo ? ['DGCA Certified'] : [],
        assignedOn: projectDetails.startDate !== '—' ? projectDetails.startDate : 'Active',
        status: p.insuranceActive ? 'Active' : 'Pending',
      }));
    }
    return [];
  }, [liveProject, projectDetails]);

  // Drone assets dataset (Hydrated strictly from live project database)
  const droneAssetsData = useMemo(() => {
    const reqPayload = (liveProject?.requirements_payload || {}) as Record<string, any>;
    const mob = reqPayload.mobilisation;
    if (mob && mob.hardware && (mob.hardware.droneModel || mob.hardware.dgcaUin)) {
      return [
        {
          id: 'DRN-01',
          name: mob.hardware.droneModel || 'Survey Drone',
          model: mob.hardware.droneModel || '—',
          serialNo: mob.hardware.dgcaUin || '—',
          payload: mob.hardware.sensorPayload || liveProject?.payload || '—',
          endurance: mob.hardware.batterySetsCount ? `${mob.hardware.batterySetsCount} battery sets` : '—',
          lastService: mob.hardware.powerSetup || '—',
          assignedOn: projectDetails.startDate !== '—' ? projectDetails.startDate : 'Active',
          status: 'Active',
        },
      ];
    }
    return [];
  }, [liveProject, projectDetails]);

  const filteredDocuments = projectDocuments.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
      doc.uploadedBy.toLowerCase().includes(docSearchQuery.toLowerCase());

    const matchesCategory =
      docCategoryFilter === 'all' || doc.category.toLowerCase() === docCategoryFilter.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const filteredTimelineEvents = timelineEvents.filter((evt) => {
    const matchesSearch =
      evt.title.toLowerCase().includes(timelineSearch.toLowerCase()) ||
      evt.description.toLowerCase().includes(timelineSearch.toLowerCase()) ||
      evt.actor.toLowerCase().includes(timelineSearch.toLowerCase());

    const matchesType = timelineTypeFilter === 'all' || evt.type === timelineTypeFilter;
    return matchesSearch && matchesType;
  });

  const toggleSelectAllDocs = () => {
    if (selectedDocIds.length === filteredDocuments.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(filteredDocuments.map((d) => d.id));
    }
  };

  const toggleSelectDoc = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const currentActiveStageName = useMemo(() => {
    const active = PIPELINE_STAGES.find((s) => s.id === currentActiveStageNumber);
    return active ? active.name : 'Capturing';
  }, [currentActiveStageNumber]);

  const statusStyle = useMemo(() => {
    const s = (liveProject?.status || '').toLowerCase();
    if (s === 'active' || s === 'in_progress') {
      return {
        label: 'Active Flight',
        bg: '#f4f4f5',
        color: '#18181b',
        dotColor: '#18181b',
        border: 'none',
      };
    }
    if (s === 'approved') {
      return {
        label: 'Approved',
        bg: '#ecfdf5',
        color: '#065f46',
        dotColor: '#10b981',
        border: '1px solid #a7f3d0',
      };
    }
    if (s === 'planning' || s === 'under_review') {
      return {
        label: 'In Planning',
        bg: '#fefce8',
        color: '#854d0e',
        dotColor: '#eab308',
        border: '1px solid #fef08a',
      };
    }
    if (s === 'completed') {
      return {
        label: 'Completed',
        bg: '#f4f4f5',
        color: '#18181b',
        dotColor: '#18181b',
        border: 'none',
      };
    }
    if (s === 'submitted') {
      return {
        label: 'Request Submitted',
        bg: '#eff6ff',
        color: '#1d4ed8',
        dotColor: '#3b82f6',
        border: 'none',
      };
    }
    return {
      label: liveProject?.status
        ? liveProject.status.charAt(0).toUpperCase() + liveProject.status.slice(1)
        : 'Draft',
      bg: '#f4f4f5',
      color: '#52525b',
      dotColor: '#71717a',
      border: 'none',
    };
  }, [liveProject?.status]);

  const projectMetaItems = useMemo(() => {
    const items: Array<{ id: string; icon: React.ReactNode; label: string }> = [];

    // 1. Location (only if available and not a generic placeholder)
    const reqPayload = (liveProject?.requirements_payload || {}) as Record<string, any>;
    const addr = (reqPayload.address || reqPayload.location_address || reqPayload.site_address || '').trim();
    const rawLoc = (liveProject?.survey_location || '').trim();
    const isPlaceholder =
      !rawLoc ||
      rawLoc.toLowerCase() === 'survey area' ||
      rawLoc.toLowerCase() === 'survey location site' ||
      (user?.company_name && rawLoc.toLowerCase() === user.company_name.toLowerCase()) ||
      (liveProject?.title && rawLoc.toLowerCase() === liveProject.title.toLowerCase());

    let finalLoc: string | null = null;
    if (addr && addr !== '—') {
      finalLoc = addr;
    } else if (rawLoc && !isPlaceholder && rawLoc !== '—') {
      finalLoc = rawLoc;
    } else {
      const city = (reqPayload.city || liveProject?.city || '').trim();
      const state = (reqPayload.state || liveProject?.state || '').trim();
      if (city && state) finalLoc = `${city}, ${state}`;
      else if (city) finalLoc = city;
      else if (state) finalLoc = state;
    }

    if (finalLoc) {
      items.push({
        id: 'location',
        icon: <MapPin size={15} color="#6b7280" />,
        label: finalLoc,
      });
    }

    // 2. Target Area (only if available and > 0)
    const planningCalculatedArea =
      (livePlanningVersions?.[0]?.form_data?.kmlCalculatedArea ? Number(livePlanningVersions[0].form_data.kmlCalculatedArea) : null) ||
      (planningDraftData?.kmlCalculatedArea ? Number(planningDraftData.kmlCalculatedArea) : null);
    const areaVal =
      planningCalculatedArea ||
      liveProject?.target_area_sqkm ||
      reqPayload.requested_area_sqkm ||
      reqPayload.target_area_sqkm;
    if (areaVal && Number(areaVal) > 0) {
      items.push({
        id: 'area',
        icon: <Compass size={15} color="#6b7280" />,
        label: `${areaVal} sq. km`,
      });
    }

    // 3. Sensor / Payload (only if available and not placeholder)
    const sensorVal =
      liveProject?.payload ||
      reqPayload.payload_sensor ||
      reqPayload.sensor ||
      reqPayload.payload ||
      reqPayload.mobilisation?.hardware?.sensorPayload ||
      liveProject?.survey_type ||
      reqPayload.survey_type;
    if (sensorVal && typeof sensorVal === 'string' && sensorVal.trim() && sensorVal !== '—') {
      items.push({
        id: 'sensor',
        icon: <Camera size={15} color="#6b7280" />,
        label: sensorVal.replace(/_/g, ' ').trim(),
      });
    }

    // 4. Created Date (only if available from backend)
    if (liveProject?.created_at) {
      try {
        const d = new Date(liveProject.created_at);
        if (!isNaN(d.getTime())) {
          const formatted = formatDateDDMMYYYY(d);
          items.push({
            id: 'created',
            icon: <Calendar size={15} color="#6b7280" />,
            label: `Created ${formatted}`,
          });
        }
      } catch {}
    }

    return items;
  }, [liveProject, user, livePlanningVersions, planningDraftData?.kmlCalculatedArea]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '0.75rem' }}>
        <Loader2 size={32} className="spinner" color="#09090b" />
        <span style={{ fontSize: '0.85rem', color: '#71717a' }}>Loading project overview...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── UNIFIED EXECUTIVE PROJECT CONTROL & LIFECYCLE STAGES PIPELINE ── */}
      <div
        className="wf-card"
        style={{
          padding: '1.5rem 1.75rem',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Top Partition: Breadcrumbs, Project Identity, Dynamic Badges & Action Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* Left Column: Breadcrumb + Project Title + Status Pill + Metadata */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', minWidth: 0, flex: '1 1 340px' }}>
            {/* Breadcrumb Navigation Trail */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', color: '#6b7280' }}>
              <Link
                href="/projects"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: '#9ca3af',
                  textDecoration: 'none',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#111827')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
              >
                <Home size={15} />
              </Link>
              <ChevronRight size={13} color="#9ca3af" />
              <Link
                href="/projects"
                style={{
                  color: '#6b7280',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#111827')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
              >
                Projects
              </Link>
              <ChevronRight size={13} color="#9ca3af" />
              <span style={{ color: '#111827', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {liveProject?.title || projectDetails.title}
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px',
                  backgroundColor: '#f3f4f6',
                  color: '#6b7280',
                  fontFamily: 'monospace',
                  letterSpacing: '0.03em',
                  marginLeft: '0.2rem',
                }}
              >
                PROJ-{(liveProject?.id || projectId).slice(0, 8).toUpperCase()}
              </span>
            </div>

            {/* Title & Status Badge Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
                {liveProject?.title || projectDetails.title}
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  backgroundColor: statusStyle.bg,
                  color: statusStyle.color,
                  border: statusStyle.border,
                  letterSpacing: '0.01em',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusStyle.dotColor }} />
                {statusStyle.label}
              </span>
            </div>

            {/* Dynamic Metadata Row (Only displaying data present in backend) */}
            {projectMetaItems.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.2rem', marginTop: '0.15rem' }}>
                {projectMetaItems.map((item, idx) => (
                  <React.Fragment key={item.id}>
                    {idx > 0 && <span style={{ color: '#d1d5db', margin: '0 0.5rem' }}>|</span>}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#4b5563', fontWeight: 500 }}>
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Structural Divider */}
        <div style={{ height: '1px', backgroundColor: '#f3f4f6', margin: '1.25rem 0 1rem 0' }} />

        {/* Bottom Partition: Project Stages Stepper */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Stepper Header Strip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6b7280' }}>
              Project Stage
            </span>
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              Stage {currentActiveStageNumber} of 6
              <span style={{ color: '#d1d5db', margin: '0 0.5rem' }}>•</span>
              <strong style={{ color: '#111827', fontWeight: 700 }}>{currentActiveStageName}</strong>
            </span>
          </div>

          {/* 6-Stage Stepper Track with Connected Line Connectors */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              position: 'relative',
              width: '100%',
              padding: '0 0.5rem',
            }}
          >
            {PIPELINE_STAGES.map((st, idx) => {
              const isLast = idx === PIPELINE_STAGES.length - 1;
              const status = getStepStatus(st.id);
              const isCompleted = status === 'completed';
              const isActive = status === 'active';
              const isUpcoming = status === 'pending';
              const isSelected = selectedStageId === st.id;

              const StageIcon =
                st.id === 1
                  ? FileText
                  : st.id === 2
                  ? FileText
                  : st.id === 3
                  ? Users
                  : st.id === 4
                  ? Plane
                  : st.id === 5
                  ? Settings
                  : Flag;

              const nextStatus = !isLast ? getStepStatus(PIPELINE_STAGES[idx + 1].id) : null;
              let connectorStyle: React.CSSProperties = {
                borderTop: '2px dashed #d1d5db',
              };
              if (isCompleted && nextStatus === 'completed') {
                connectorStyle = { borderTop: '2.5px solid #16a34a' };
              } else if (isCompleted && nextStatus === 'active') {
                connectorStyle = { borderTop: '2.5px solid #18181b' };
              }

              return (
                <div
                  key={st.id}
                  onClick={() => {
                    setSelectedStageId(st.id);
                    setActiveTab('stage');
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    position: 'relative',
                    cursor: 'pointer',
                  }}
                >
                  {/* Connecting Line to next stage */}
                  {!isLast && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '24px',
                        left: '50%',
                        width: '100%',
                        height: '0px',
                        zIndex: 1,
                        transform: 'translateY(-50%)',
                        ...connectorStyle,
                      }}
                    />
                  )}

                  {/* Node Circle */}
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      backgroundColor: isCompleted
                        ? '#e8f8f0'
                        : isActive
                        ? '#18181b'
                        : '#f3f4f6',
                      boxShadow: isActive
                        ? '0 0 0 6px #f4f4f5'
                        : isSelected
                        ? '0 0 0 4px #e4e4e7'
                        : 'none',
                    }}
                  >
                    <StageIcon
                      size={20}
                      color={isCompleted ? '#16a34a' : isActive ? '#ffffff' : '#6b7280'}
                      strokeWidth={isActive ? 2.2 : 2}
                    />

                    {/* Green Checkmark Badge for Completed Stages */}
                    {isCompleted && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '-2px',
                          right: '-2px',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: '#16a34a',
                          border: '2px solid #ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={9} strokeWidth={3.5} color="#ffffff" />
                      </div>
                    )}
                  </div>

                  {/* Stage Details Below Circle */}
                  <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', lineHeight: 1 }}>
                      0{st.id}
                    </span>
                    <span
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: '#111827',
                        marginTop: '0.25rem',
                        lineHeight: 1.2,
                      }}
                    >
                      {st.name}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: isCompleted ? '#6b7280' : isActive ? '#6b7280' : '#9ca3af',
                        marginTop: '0.15rem',
                        lineHeight: 1.2,
                      }}
                    >
                      {isCompleted ? 'Completed' : isActive ? 'In Progress' : 'Upcoming'}
                    </span>
                    {isSelected && (
                      <div
                        style={{
                          width: '16px',
                          height: '3px',
                          borderRadius: '2px',
                          backgroundColor: '#18181b',
                          marginTop: '0.35rem',
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 4. Standard Sections per Stage Navigation Bar: [current stage], overview ── */}
      <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
        {[
          { id: 'stage', label: selectedStage.name },
          { id: 'overview', label: 'Overview' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #09090b' : '2px solid transparent',
              padding: '0.5rem 0.25rem',
              fontSize: '0.85rem',
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? '#09090b' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 5. SECTION 1: [CURRENT STAGE] DEDICATED WORKSPACE ── */}
      {activeTab === 'stage' && selectedStage.id === 4 ? (
        <CapturingStageWorkspace
          project={liveProject}
          sectors={liveSectors}
          plannedTenure={plannedTenure}
          onRefresh={fetchProjectOverview}
          onSectorsRefresh={refreshSectors}
          onAdvanceStage={(st) => {
            setSelectedStageId(st);
            setActiveTab('stage');
          }}
          availablePilots={pilotUsers.map((p) => ({ id: p.id, name: p.full_name || p.email || 'Pilot', email: p.email }))}
          availableDrones={['DJI Matrice 350 RTK', 'Zenmuse P1', 'DJI Mavic 3 Enterprise', 'WingtraOne GEN II']}
          userRole={user?.role}
          userName={user?.full_name || user?.company_name || 'User'}
          stageMessages={currentStageMessages}
          onSendMessage={handleSendStageMessage}
        />
      ) : activeTab === 'stage' && selectedStage.id === 5 ? (
        <ProcessingStageWorkspace
          project={liveProject}
          onRefresh={fetchProjectOverview}
          onAdvanceStage={(st) => {
            setSelectedStageId(st);
            setActiveTab('stage');
          }}
          userRole={user?.role}
          userName={user?.full_name || user?.company_name || 'User'}
          stageMessages={currentStageMessages}
          onSendMessage={handleSendStageMessage}
        />
      ) : activeTab === 'stage' && selectedStage.id === 6 ? (
        <DeliveredStageWorkspace
          project={liveProject}
          payments={livePayments}
          wallet={liveWallet}
          invoices={liveInvoices}
          onRefresh={fetchProjectOverview}
          userRole={user?.role}
          userName={user?.full_name || user?.company_name || 'User'}
          stageMessages={currentStageMessages}
          onSendMessage={handleSendStageMessage}
        />
      ) : activeTab === 'stage' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.25rem', alignItems: 'stretch' }}>
          {/* Left: Current Stage Details & Context Card */}
          <div
            className="wf-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              minHeight: '620px',
              maxHeight: '620px',
              overflow: 'hidden',
              padding: 0,
            }}
          >
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
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <h2 className="wf-title" style={{ margin: 0 }}>
                  Stage {selectedStage.id}: {selectedStage.name}
                  {(selectedStage.id === 1 || selectedStage.id === 2) ? ' Form Preview' : ''}
                </h2>

                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: '#f4f4f5',
                    color: '#18181b',
                    border: '1px solid #d4d4d8',
                  }}
                >
                  {getStepStatus(selectedStage.id) === 'completed'
                    ? 'Closed & Archived'
                    : getStepStatus(selectedStage.id) === 'active'
                    ? 'Active Stage'
                    : 'Upcoming'}
                </span>

                {selectedStage.id === 1 && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      backgroundColor: '#f4f4f5',
                      color: '#18181b',
                      border: '1px solid #e4e4e7',
                    }}
                  >
                    v{reqFormDetails.version}.0
                  </span>
                )}

                {selectedStage.id === 2 && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      backgroundColor: '#f4f4f5',
                      color: '#18181b',
                      border: '1px solid #e4e4e7',
                    }}
                  >
                    v{planningDetails.version}.0
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {selectedStage.id === 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {canOpsReopenStage && (
                      <button
                        onClick={() => handleReopenStage(1)}
                        disabled={isReopeningStage}
                        className="btn btn-secondary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          height: '32px',
                          padding: '0 0.75rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          backgroundColor: '#ffffff',
                          color: '#09090b',
                          border: '1px solid #d4d4d8',
                        }}
                        title="Reopen on-hold / cancelled request"
                      >
                        <RotateCcw size={12} /> {isReopeningStage ? 'Reopening...' : 'Reopen Request'}
                      </button>
                    )}
                    <button
                      onClick={() => router.push(`/projects/new?projectId=${projectId}`)}
                      className={getStepStatus(1) === 'completed' ? 'btn btn-secondary' : 'btn btn-primary'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        height: '32px',
                        padding: '0 0.85rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        backgroundColor: getStepStatus(1) === 'completed' ? '#ffffff' : '#09090b',
                        color: getStepStatus(1) === 'completed' ? '#09090b' : '#ffffff',
                        border: getStepStatus(1) === 'completed' ? '1px solid #d4d4d8' : '1px solid #09090b',
                      }}
                      title={getStepStatus(1) === 'completed' ? 'View sealed request form' : (isRequestFilled || isPilot) ? 'View request form' : 'Open and fill request form'}
                    >
                      {getStepStatus(1) === 'completed' ? <Lock size={12} /> : <ExternalLink size={13} />}
                      {getStepStatus(1) === 'completed'
                        ? 'View Request Form (Sealed)'
                        : (isRequestFilled || isPilot)
                        ? 'View Request Form'
                        : 'Fill Request Form'}
                    </button>
                  </div>
                )}

                {selectedStage.id === 2 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {canOpsReopenStage && (
                      <button
                        onClick={() => handleReopenStage(2)}
                        disabled={isReopeningStage}
                        className="btn btn-secondary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          height: '32px',
                          padding: '0 0.75rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          backgroundColor: '#ffffff',
                          color: '#09090b',
                          border: '1px solid #d4d4d8',
                        }}
                        title="Reopen on-hold / cancelled planning"
                      >
                        <RotateCcw size={12} /> {isReopeningStage ? 'Reopening...' : 'Reopen Planning'}
                      </button>
                    )}
                    <button
                      onClick={() => router.push(`/projects/${projectId}/plan-review`)}
                      className={getStepStatus(2) === 'completed' ? 'btn btn-secondary' : 'btn btn-primary'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        height: '32px',
                        padding: '0 0.85rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        backgroundColor: getStepStatus(2) === 'completed' ? '#ffffff' : '#09090b',
                        color: getStepStatus(2) === 'completed' ? '#09090b' : '#ffffff',
                        border: getStepStatus(2) === 'completed' ? '1px solid #d4d4d8' : '1px solid #09090b',
                      }}
                      title={getStepStatus(2) === 'completed' ? 'View sealed planning form' : (isPlanningFilled || isPilot) ? 'View planning form' : 'Open and fill planning form'}
                    >
                      {getStepStatus(2) === 'completed' ? <Lock size={12} /> : <ExternalLink size={13} />}
                      {getStepStatus(2) === 'completed'
                        ? 'View Planning Form (Sealed)'
                        : (isPlanningFilled || isPilot)
                        ? 'View Planning Form'
                        : 'Fill Planning Form'}
                    </button>
                  </div>
                )}

                {selectedStage.id === 6 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      onClick={() => router.push(`/activity-logs?projectId=${projectId}&tab=documents`)}
                      className={projectDetails.status === 'completed' ? 'btn btn-primary' : 'btn btn-secondary'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        height: '32px',
                        padding: '0 0.85rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        backgroundColor: projectDetails.status === 'completed' ? '#09090b' : '#ffffff',
                        color: projectDetails.status === 'completed' ? '#ffffff' : '#09090b',
                        border: projectDetails.status === 'completed' ? '1px solid #09090b' : '1px solid #d4d4d8',
                        borderRadius: '4px',
                      }}
                      title="Access all survey deliverables and flight documents"
                    >
                      <Download size={13} />
                      Access Deliverables
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Stage 1: Request Workspace */}
            {selectedStage.id === 1 && (
              !isRequestFilled ? (
                /* ── State 2: Request form is NOT filled up ── */
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '2rem 1.5rem',
                    gap: '1.25rem',
                  }}
                >
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '12px',
                      backgroundColor: '#fafafa',
                      border: '1px solid #e4e4e7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#09090b',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    }}
                  >
                    <ClipboardList size={30} strokeWidth={1.75} />
                  </div>

                  <div style={{ maxWidth: '460px' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                      Fill up the Request Form
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.45rem', lineHeight: 1.55 }}>
                      The survey request form for this project has not been filled up yet. Specify your survey location, boundary AOI polygon, sensor payload, and deliverables package to initiate feasibility analysis and flight planning.
                    </p>
                  </div>

                  {/* 4 Feature Badges */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '0.75rem',
                      width: '100%',
                      maxWidth: '500px',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ padding: '0.7rem 0.85rem', backgroundColor: '#fafafa', border: '1px solid #f4f4f5', borderRadius: '6px', fontSize: '0.75rem' }}>
                      <div style={{ fontWeight: 700, color: '#09090b' }}>📍 Survey Location &amp; AOI</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.15rem' }}>Site address &amp; boundary KML</div>
                    </div>
                    <div style={{ padding: '0.7rem 0.85rem', backgroundColor: '#fafafa', border: '1px solid #f4f4f5', borderRadius: '6px', fontSize: '0.75rem' }}>
                      <div style={{ fontWeight: 700, color: '#09090b' }}>📷 Sensor Payload</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.15rem' }}>61MP RGB, LiDAR, Oblique</div>
                    </div>
                    <div style={{ padding: '0.7rem 0.85rem', backgroundColor: '#fafafa', border: '1px solid #f4f4f5', borderRadius: '6px', fontSize: '0.75rem' }}>
                      <div style={{ fontWeight: 700, color: '#09090b' }}>⚙️ Processing &amp; Deliverables</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.15rem' }}>Orthomosaic, DEM, CAD, etc.</div>
                    </div>
                    <div style={{ padding: '0.7rem 0.85rem', backgroundColor: '#fafafa', border: '1px solid #f4f4f5', borderRadius: '6px', fontSize: '0.75rem' }}>
                      <div style={{ fontWeight: 700, color: '#09090b' }}>📅 Timeline &amp; Coordinators</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.15rem' }}>Expected dates &amp; point of contact</div>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push(`/projects/new?projectId=${projectId}`)}
                    className="btn btn-primary"
                    style={{
                      padding: '0.65rem 1.6rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      marginTop: '0.25rem',
                    }}
                  >
                    {isPilot ? <FileText size={16} /> : <FileEdit size={16} />}
                    {isPilot ? 'View Request Form' : 'Fill up Request Form'}
                  </button>
                </div>
              ) : (
                /* ── State 1: Scrollable Request Form Preview ── */
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  {/* Section 1: Project & Survey Location */}
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                      <MapPin size={15} color="#09090b" />
                      <h4 style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                        1. Project &amp; Survey Location Information
                      </h4>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem 1rem', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Project Title</span>
                        <strong style={{ color: '#09090b' }}>{projectDetails.title}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Survey Location / Address</span>
                        <strong style={{ color: '#09090b' }}>{reqFormDetails.rawLoc}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>City / State</span>
                        <strong style={{ color: '#09090b' }}>
                          {reqFormDetails.city !== '—' && reqFormDetails.state !== '—'
                            ? `${reqFormDetails.city}, ${reqFormDetails.state}`
                            : reqFormDetails.city !== '—'
                            ? reqFormDetails.city
                            : reqFormDetails.state}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Target Survey Area</span>
                        <strong style={{ color: '#09090b', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span>{reqFormDetails.area}</span>
                          {(livePlanningVersions?.[0]?.form_data?.kmlCalculatedArea || planningDraftData?.kmlCalculatedArea) && (
                            <span style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: 600, backgroundColor: '#f0fdf4', padding: '1px 5px', borderRadius: '3px', border: '1px solid #bbf7d0' }}>
                              Calculated by Latrics
                            </span>
                          )}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Submission Date</span>
                        <strong style={{ color: '#09090b' }}>{reqFormDetails.submissionDate}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Target Schedule</span>
                        <strong style={{ color: '#09090b' }}>
                          {reqFormDetails.startDate !== '—'
                            ? `${reqFormDetails.startDate} → ${reqFormDetails.endDate}`
                            : reqFormDetails.endDate}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Client & Contact Details */}
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                      <Building2 size={15} color="#09090b" />
                      <h4 style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                        2. Client &amp; Point of Contact
                      </h4>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem 1rem', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Client Company</span>
                        <strong style={{ color: '#09090b' }}>{reqFormDetails.company}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Primary Contact</span>
                        <strong style={{ color: '#09090b' }}>{reqFormDetails.primaryName}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Contact Email &amp; Phone</span>
                        <span style={{ color: '#09090b', fontWeight: 600 }}>
                          {reqFormDetails.primaryEmail} {reqFormDetails.primaryPhone !== '—' ? `(${reqFormDetails.primaryPhone})` : ''}
                        </span>
                      </div>
                    </div>

                    {reqFormDetails.commContacts.length > 0 && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px dashed #f4f4f5', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Additional Coordinators:</span>
                        {reqFormDetails.commContacts.map((c, i) => (
                          <span key={i} style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', backgroundColor: '#f4f4f5', borderRadius: '4px', border: '1px solid #e4e4e7', color: '#09090b', fontWeight: 500 }}>
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section 3: Sensor Payload Specification */}
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                      <Camera size={15} color="#09090b" />
                      <h4 style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                        3. Sensor Payload Specification
                      </h4>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', backgroundColor: '#fafafa', border: '1.5px solid #09090b', borderRadius: '6px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#09090b', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Camera size={18} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <strong style={{ fontSize: '0.85rem', color: '#09090b' }}>{reqFormDetails.sensorLabel}</strong>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', backgroundColor: '#09090b', color: '#ffffff', borderRadius: '3px' }}>
                            Selected &amp; Active
                          </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                          {reqFormDetails.sensorDesc}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Processing Modes & Deliverables */}
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <SlidersHorizontal size={15} color="#09090b" />
                        <h4 style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                          4. Processing Modes &amp; Deliverables Package
                        </h4>
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {reqFormDetails.modes.map((m, i) => (
                          <span key={i} style={{ fontSize: '0.675rem', fontWeight: 700, padding: '0.15rem 0.45rem', backgroundColor: '#09090b', color: '#ffffff', borderRadius: '4px' }}>
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                      {reqFormDetails.deliverablesList.map((d, i) => (
                        <span
                          key={i}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.3rem 0.65rem',
                            backgroundColor: '#fafafa',
                            border: '1px solid #d4d4d8',
                            borderRadius: '5px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#09090b',
                            textTransform: 'capitalize',
                          }}
                        >
                          <Check size={12} color="#09090b" strokeWidth={2.5} />
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Section 5: Survey Boundary & Scope Files */}
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                      <Paperclip size={15} color="#09090b" />
                      <h4 style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                        5. Survey Boundary &amp; Scope Documents
                      </h4>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div
                        onClick={() => {
                          downloadDocument({
                            name: reqFormDetails.boundaryFilename,
                            dataUrl: reqFormDetails.boundaryDataUrl || undefined,
                            type: reqFormDetails.boundaryFilename.endsWith('.kmz') ? 'KMZ' : 'KML',
                            projectTitle: liveProject?.title,
                          });
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.65rem',
                          padding: '0.65rem 0.85rem',
                          backgroundColor: '#fafafa',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'border-color 0.15s ease, background-color 0.15s ease',
                        }}
                        title={`Click to download ${reqFormDetails.boundaryFilename} directly`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0, flex: 1 }}>
                          <FileText size={18} color="#09090b" style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                              {reqFormDetails.boundaryFilename}
                            </div>
                            <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>Survey Boundary File (KML/KMZ)</span>
                          </div>
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              downloadDocument({
                                name: reqFormDetails.boundaryFilename,
                                dataUrl: reqFormDetails.boundaryDataUrl || undefined,
                                type: reqFormDetails.boundaryFilename.endsWith('.kmz') ? 'KMZ' : 'KML',
                                projectTitle: liveProject?.title,
                              });
                            }}
                            title="Download boundary file directly"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.3rem 0.65rem',
                              fontSize: '0.725rem',
                              fontWeight: 600,
                              color: '#ffffff',
                              backgroundColor: '#09090b',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              transition: 'background-color 0.15s ease',
                            }}
                          >
                            <Download size={13} />
                            Download
                          </button>
                        </div>
                      </div>

                      {reqFormDetails.scopeFilename ? (
                        <div
                          onClick={() => {
                            downloadDocument({
                              name: reqFormDetails.scopeFilename!,
                              dataUrl: reqFormDetails.scopeDataUrl || undefined,
                              type: 'PDF',
                              projectTitle: liveProject?.title,
                            });
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.65rem',
                            padding: '0.65rem 0.85rem',
                            backgroundColor: '#fafafa',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'border-color 0.15s ease, background-color 0.15s ease',
                          }}
                          title={`Click to download ${reqFormDetails.scopeFilename} directly`}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0, flex: 1 }}>
                            <FileText size={18} color="#09090b" style={{ flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                                {reqFormDetails.scopeFilename}
                              </div>
                              <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>Scope Specification Document</span>
                            </div>
                          </div>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                downloadDocument({
                                  name: reqFormDetails.scopeFilename!,
                                  dataUrl: reqFormDetails.scopeDataUrl || undefined,
                                  type: 'PDF',
                                  projectTitle: liveProject?.title,
                                });
                              }}
                              title="Download scope document directly"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.3rem 0.65rem',
                                fontSize: '0.725rem',
                                fontWeight: 600,
                                color: '#ffffff',
                                backgroundColor: '#09090b',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'background-color 0.15s ease',
                              }}
                            >
                              <Download size={13} />
                              Download
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 0.85rem', backgroundColor: '#fafafa', border: '1px dashed var(--border-color)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          <Info size={16} />
                          <span>No auxiliary scope document attached.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 6: Client Remarks / Special Instructions */}
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                      <Info size={15} color="#09090b" />
                      <h4 style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                        6. Remarks &amp; Special Site Instructions
                      </h4>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: reqFormDetails.remarks ? '#09090b' : 'var(--text-secondary)', margin: 0, lineHeight: 1.5, fontStyle: reqFormDetails.remarks ? 'normal' : 'italic' }}>
                      {reqFormDetails.remarks ? reqFormDetails.remarks : 'No special remarks or site instructions provided.'}
                    </p>
                  </div>
                </div>
              )
            )}

            {/* Stage 2: Planning Details & Form Preview (All 8 Sections) */}
            {selectedStage.id === 2 && (
              !isPlanningFilled && getStepStatus(2) !== 'completed' ? (
                /* ── State 2: Planning form is NOT filled up ── */
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '2rem 1.5rem',
                    gap: '1.25rem',
                  }}
                >
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '12px',
                      backgroundColor: '#fafafa',
                      border: '1px solid #e4e4e7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#09090b',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    }}
                  >
                    <FileSpreadsheet size={30} strokeWidth={1.75} />
                  </div>

                  <div style={{ maxWidth: '460px' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                      {isOps && getStepStatus(2) !== 'completed' ? 'Fill up the Planning Form' : 'Operational Planning & Feasibility'}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.45rem', lineHeight: 1.55 }}>
                      The operational planning and feasibility assessment for this project has not been filled up yet. Latrics Operations and technical teams calibrate airspace zones, terrain hazards, ground control points, and flight telemetry across 8 assessment stages.
                    </p>
                  </div>

                  {/* 4 Wireframe Feature Badges */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '0.75rem',
                      width: '100%',
                      maxWidth: '500px',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ padding: '0.7rem 0.85rem', backgroundColor: '#fafafa', border: '1px solid #f4f4f5', borderRadius: '6px', fontSize: '0.75rem' }}>
                      <div style={{ fontWeight: 700, color: '#09090b' }}>🌐 Airspace &amp; Regulatory</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.15rem' }}>DGCA zones &amp; clearances</div>
                    </div>
                    <div style={{ padding: '0.7rem 0.85rem', backgroundColor: '#fafafa', border: '1px solid #f4f4f5', borderRadius: '6px', fontSize: '0.75rem' }}>
                      <div style={{ fontWeight: 700, color: '#09090b' }}>⛰️ Terrain &amp; Accessibility</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.15rem' }}>Elevation, weather &amp; field staging</div>
                    </div>
                    <div style={{ padding: '0.7rem 0.85rem', backgroundColor: '#fafafa', border: '1px solid #f4f4f5', borderRadius: '6px', fontSize: '0.75rem' }}>
                      <div style={{ fontWeight: 700, color: '#09090b' }}>🎯 GCP &amp; Telemetry</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.15rem' }}>Target network, altitude &amp; overlap</div>
                    </div>
                    <div style={{ padding: '0.7rem 0.85rem', backgroundColor: '#fafafa', border: '1px solid #f4f4f5', borderRadius: '6px', fontSize: '0.75rem' }}>
                      <div style={{ fontWeight: 700, color: '#09090b' }}>⏱️ Timelines &amp; Sign-off</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.15rem' }}>Survey window, SLA &amp; operations seal</div>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push(`/projects/${projectId}/plan-review`)}
                    className="btn btn-primary"
                    style={{
                      padding: '0.65rem 1.6rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      marginTop: '0.25rem',
                      backgroundColor: '#09090b',
                      color: '#ffffff',
                      border: '1px solid #09090b',
                    }}
                  >
                    <ExternalLink size={15} /> {isOps && getStepStatus(2) !== 'completed' ? 'Fill up Planning Form' : 'View Planning Form'}
                  </button>
                </div>
              ) : (
                /* ── State 1: Scrollable Planning Form Preview (All 8 Sections) ── */
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  {/* 1. KML Findings & Boundary Demarcation */}
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                      <MapPin size={15} color="#09090b" />
                      <h4 style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                        1. KML Findings &amp; Boundary Demarcation
                      </h4>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem 1rem', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>KML Boundary File</span>
                        <strong style={{ color: '#09090b' }}>
                          {planningDetails.kmlFile} {planningDetails.kmlSize !== '—' ? `(${planningDetails.kmlSize})` : ''}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Calculated Survey Area</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.calculatedArea}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Requested Area</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.requestedArea}</strong>
                      </div>
                      <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Boundary Demarcation Status / Notes</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.boundaryNotes}</strong>
                      </div>
                    </div>
                  </div>

                  {/* 2. Regularity and Airspace Classification */}
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                      <Globe size={15} color="#09090b" />
                      <h4 style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                        2. Regularity and Airspace Classification
                      </h4>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem 1rem', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>DigitalSky Airspace Classification</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.airspaceZones}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>DGCA Clearance Status</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.dgcaClearance}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Airport Proximity</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.airportProximity}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Nearest Aerodrome</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.nearestAerodrome}</strong>
                      </div>
                      <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Local Police &amp; Authority Intimation</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.policeIntimation}</strong>
                      </div>
                    </div>
                  </div>

                  {/* 3. Accessibility & Terrain Feasibility */}
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                      <Layers size={15} color="#09090b" />
                      <h4 style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                        3. Accessibility &amp; Terrain Feasibility
                      </h4>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem 1rem', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Terrain Classification</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.terrain}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Elevation Variation</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.elevationVariation}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Field Access Identified</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.fieldAccess}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Weather &amp; Operating Conditions</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.weather}</strong>
                      </div>
                      <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Access &amp; Staging Notes</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.stagingNotes}</strong>
                      </div>
                    </div>
                  </div>

                  {/* 4. Obstacles and Hazards Assessment */}
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                      <ShieldAlert size={15} color="#09090b" />
                      <h4 style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                        4. Obstacles and Hazards Assessment
                      </h4>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem 1rem', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Aerial Hazards Identified</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.hazards}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Max Obstacle Height</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.maxObstacleHeight}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Safety Buffer Distance</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.safetyBuffer}</strong>
                      </div>
                      <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Hazard Mitigation Strategy</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.hazardMitigation}</strong>
                      </div>
                    </div>
                  </div>

                  {/* 5. Ground Control Points (GCP) Planning */}
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                      <Maximize2 size={15} color="#09090b" />
                      <h4 style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                        5. Ground Control Points (GCP) Planning
                      </h4>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem 1rem', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>GCP Targets Required</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.gcpsNeeded}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Independent Checkpoints</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.checkpoints}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Target Size &amp; Material</span>
                        <strong style={{ color: '#09090b' }}>
                          {planningDetails.targetSize !== '—' ? planningDetails.targetSize : ''}
                          {planningDetails.targetSize !== '—' && planningDetails.targetMaterial !== '—' ? ' • ' : ''}
                          {planningDetails.targetMaterial !== '—' ? planningDetails.targetMaterial : ''}
                          {planningDetails.targetSize === '—' && planningDetails.targetMaterial === '—' ? '—' : ''}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Base Station Configuration</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.baseStation}</strong>
                      </div>
                      <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>GCP Target Coordinates File</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.gcpFile}</strong>
                      </div>
                    </div>
                  </div>

                  {/* 6. Flight Planning & Telemetry Design */}
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                      <Plane size={15} color="#09090b" />
                      <h4 style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                        6. Flight Planning &amp; Telemetry Design
                      </h4>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem 1rem', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Planned Flight Altitude</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.plannedAltitude}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ground Sampling Distance (GSD)</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.gsd}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Overlap Ratio (Front / Side)</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.overlapRatio}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Flight Duration</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.totalFlightDuration}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Mission Flights / Landings</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.landings}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Battery Sets Required</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.batterySets}</strong>
                      </div>
                    </div>
                  </div>

                  {/* 7. Expected Operational Timelines */}
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                      <Calendar size={15} color="#09090b" />
                      <h4 style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                        7. Expected Operational Timelines
                      </h4>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem 1rem', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Field Survey Duration</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.surveyDays}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Target Survey Window</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.targetWindow}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pilot Crew Mobilization Date</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.pilotTravelDate}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Weather Contingency Allowance</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.weatherContingency}</strong>
                      </div>
                      <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Final Data Delivery SLA</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.deliveryTimeline}</strong>
                      </div>
                    </div>
                  </div>

                  {/* 8. Feasible to Proceed & Operations Sign-off */}
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                      <CheckCircle2 size={15} color="#09090b" />
                      <h4 style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                        8. Feasible to Proceed &amp; Operations Sign-off
                      </h4>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem 1rem', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Feasibility Determination</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.decision}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Operations Certification</span>
                        <strong style={{ color: '#09090b' }}>{planningDetails.reviewConfirmed}</strong>
                      </div>
                      <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Operations Strategy &amp; Remarks</span>
                        <p style={{ fontSize: '0.8rem', color: '#09090b', margin: 0, lineHeight: 1.5 }}>
                          {planningDetails.decisionRemarks}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}

            {/* Stage 3: Mobilising Details */}
            {selectedStage.id === 3 && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* 2-Column Grid: Left = Client Contacts, Right = LATRICS Operations & Flight Crew */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'stretch' }}>
                  {/* Column 1: Client Parameter */}
                  <div
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '1rem',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building2 size={16} color="#09090b" style={{ flexShrink: 0 }} />
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b', margin: 0, whiteSpace: 'nowrap' }}>
                          Client Project Stakeholders
                        </h4>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        {getStepStatus(3) === 'completed' ? (
                          <span
                            style={{
                              fontSize: '0.675rem',
                              fontWeight: 600,
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              backgroundColor: '#f4f4f5',
                              color: '#71717a',
                              border: '1px solid #e4e4e7',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <Lock size={11} /> Locked &amp; Sealed
                          </span>
                        ) : isClient ? (
                          <>
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                backgroundColor: '#f4f4f5',
                                color: '#09090b',
                                border: '1px solid #d4d4d8',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Your Parameter
                            </span>
                            <button
                              onClick={handleOpenEditClientModal}
                              type="button"
                              style={{
                                height: '32px',
                                padding: '0 0.85rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                backgroundColor: '#09090b',
                                color: '#ffffff',
                                border: '1px solid #09090b',
                                borderRadius: '6px',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#27272a';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#09090b';
                              }}
                            >
                              <FileEdit size={13} />
                              <span>Edit Contacts</span>
                            </button>
                          </>
                        ) : (
                          <span
                            title="Client manages their own contact details"
                            style={{
                              fontSize: '0.675rem',
                              fontWeight: 600,
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              backgroundColor: '#f4f4f5',
                              color: '#71717a',
                              border: '1px solid #e4e4e7',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <Lock size={11} /> Client Managed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Primary Client Card */}
                    <div style={{ backgroundColor: '#fafafa', border: '1px solid #f4f4f5', borderRadius: '6px', padding: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Primary Client Contact
                        </span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#09090b', backgroundColor: '#f4f4f5', padding: '0.1rem 0.35rem', borderRadius: '3px', border: '1px solid #d4d4d8' }}>
                          Primary Account
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>
                        {primaryContact.name}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Mail size={13} color="var(--text-muted)" />
                          <span>{primaryContact.email}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Phone size={13} color="var(--text-muted)" />
                          <span>{primaryContact.phone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Appointed Subordinate Card */}
                    <div style={{ backgroundColor: '#fafafa', border: '1px solid #f4f4f5', borderRadius: '6px', padding: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Appointed Subordinate (Project In-Charge)
                        </span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#09090b', backgroundColor: '#f4f4f5', padding: '0.1rem 0.35rem', borderRadius: '3px', border: '1px solid #d4d4d8' }}>
                          From Request Form
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>
                        {appointedSubordinate.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem', fontWeight: 500 }}>
                        {appointedSubordinate.designation}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Mail size={13} color="var(--text-muted)" />
                          <span>{appointedSubordinate.email}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Phone size={13} color="var(--text-muted)" />
                          <span>{appointedSubordinate.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4, padding: '0 0.2rem' }}>
                      * The appointed subordinate coordinates site access, security gate permits, and local ground verification with the LATRICS flight crew.
                    </div>
                  </div>

                  {/* Column 2: LATRICS Parameter */}
                  <div
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '1rem',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Plane size={16} color="#09090b" style={{ flexShrink: 0 }} />
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b', margin: 0, whiteSpace: 'nowrap' }}>
                          LATRICS Flight Operations &amp; Roster
                        </h4>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        {getStepStatus(3) === 'completed' ? (
                          <span
                            style={{
                              fontSize: '0.675rem',
                              fontWeight: 600,
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              backgroundColor: '#f4f4f5',
                              color: '#71717a',
                              border: '1px solid #e4e4e7',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <Lock size={11} /> Locked &amp; Sealed
                          </span>
                        ) : isOps ? (
                          <>
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                backgroundColor: '#f4f4f5',
                                color: '#09090b',
                                border: '1px solid #d4d4d8',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Your Parameter
                            </span>
                            <button
                              onClick={handleOpenEditOpsModal}
                              type="button"
                              style={{
                                height: '32px',
                                padding: '0 0.85rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                backgroundColor: '#09090b',
                                color: '#ffffff',
                                border: '1px solid #09090b',
                                borderRadius: '6px',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#27272a';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#09090b';
                              }}
                            >
                              <FileEdit size={13} />
                              <span>Edit &amp; Assign Pilots</span>
                            </button>
                          </>
                        ) : (
                          <span
                            title="LATRICS Operations manages staff and pilots"
                            style={{
                              fontSize: '0.675rem',
                              fontWeight: 600,
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              backgroundColor: '#f4f4f5',
                              color: '#71717a',
                              border: '1px solid #e4e4e7',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <Lock size={11} /> LATRICS Managed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Operations Handler Card */}
                    <div style={{ backgroundColor: '#fafafa', border: '1px solid #f4f4f5', borderRadius: '6px', padding: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Operations Project Handler
                        </span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#09090b', backgroundColor: '#f4f4f5', padding: '0.1rem 0.35rem', borderRadius: '3px', border: '1px solid #d4d4d8' }}>
                          LATRICS Back-Office
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>
                        {opsHandler.name}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Mail size={13} color="var(--text-muted)" />
                          <span>{opsHandler.email}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Phone size={13} color="var(--text-muted)" />
                          <span>{opsHandler.phone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Assigned Pilots Card */}
                    <div style={{ backgroundColor: '#fafafa', border: '1px solid #f4f4f5', borderRadius: '6px', padding: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Assigned Flight Crew ({assignedPilots.length})
                        </span>
                        {isOps && getStepStatus(3) !== 'completed' && (
                          <button
                            onClick={handleOpenEditOpsModal}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#09090b',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              padding: 0,
                            }}
                          >
                            <Plus size={12} /> Assign Pilot
                          </button>
                        )}
                      </div>

                      {assignedPilots.length === 0 ? (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.35rem 0', fontStyle: 'italic' }}>
                          No flight crew assigned yet. {isOps ? 'Click Edit & Assign Pilots to allocate certified DGCA pilots.' : 'LATRICS Operations will assign certified pilots.'}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                          {assignedPilots.map((p, idx) => (
                            <div
                              key={p.id || idx}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.45rem',
                                padding: '0.65rem 0.75rem',
                                backgroundColor: '#ffffff',
                                border: '1px solid #e4e4e7',
                                borderRadius: '6px',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.35rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <User size={13} color="#09090b" />
                                  <span style={{ fontWeight: 700, color: '#09090b', fontSize: '0.8rem' }}>
                                    {p.name}
                                  </span>
                                </div>
                                {p.isPendingInvite ? (
                                  <span
                                    style={{
                                      fontSize: '0.65rem',
                                      fontWeight: 700,
                                      color: '#b45309',
                                      backgroundColor: '#fef3c7',
                                      padding: '0.1rem 0.35rem',
                                      borderRadius: '3px',
                                      border: '1px solid #fde68a',
                                      flexShrink: 0,
                                    }}
                                  >
                                    🟡 Pending Invite
                                  </span>
                                ) : !p.isProfileCompleted ? (
                                  <span
                                    style={{
                                      fontSize: '0.65rem',
                                      fontWeight: 700,
                                      color: '#71717a',
                                      backgroundColor: '#f4f4f5',
                                      padding: '0.1rem 0.35rem',
                                      borderRadius: '3px',
                                      border: '1px solid #d4d4d8',
                                      flexShrink: 0,
                                    }}
                                  >
                                    Profile Pending
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: '0.65rem',
                                      fontWeight: 700,
                                      color: '#09090b',
                                      backgroundColor: '#f4f4f5',
                                      padding: '0.1rem 0.35rem',
                                      borderRadius: '3px',
                                      border: '1px solid #d4d4d8',
                                      flexShrink: 0,
                                    }}
                                  >
                                    DGCA Certified
                                  </span>
                                )}
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem 0.6rem', fontSize: '0.725rem' }}>
                                <div>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', display: 'block' }}>Contact Number</span>
                                  <span style={{ fontWeight: 600, color: '#09090b', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Phone size={11} color="var(--text-muted)" /> {p.contactNo || '—'}
                                  </span>
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', display: 'block' }}>Email Address (Login)</span>
                                  <span style={{ fontWeight: 600, color: '#09090b', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }} title={p.email}>
                                    <Mail size={11} color="var(--text-muted)" /> {p.email || '—'}
                                  </span>
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', display: 'block' }}>Age (Years)</span>
                                  <span style={{ fontWeight: 600, color: '#09090b', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Calendar size={11} color="var(--text-muted)" /> {p.age ? `${p.age} yrs` : '—'}
                                  </span>
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', display: 'block' }}>DGCA License No. (RPC)</span>
                                  <span style={{ fontWeight: 600, color: '#09090b', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                                    <Award size={11} color="#09090b" /> {p.dgcaLicenseNo || '—'}
                                  </span>
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', display: 'block' }}>Aadhaar Number</span>
                                  <span style={{ fontWeight: 600, color: '#09090b', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', letterSpacing: '0.04em' }}>
                                    <IdCard size={11} color="var(--text-muted)" /> {p.aadhaarNo || '—'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4, padding: '0 0.2rem' }}>
                      * Pilots hold DGCA certified remote pilot certificates and mandatory third-party liability insurance.
                    </div>
                  </div>
                </div>

                {/* Mobilisation Confirmation Section (Client responsibility vs Latrics Advance Verification) */}
                {liveProject && (
                  <MobilisationConfirmationSection
                    project={liveProject}
                    isClient={isClient}
                    isOps={isOps}
                    isCompleted={getStepStatus(3) === 'completed'}
                    onUpdated={fetchProjectOverview}
                  />
                )}

                {/* Bottom Action / Progression Bar */}
                <div
                  style={{
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                    {isOps
                      ? 'Confirm stakeholder contacts, flight crew allocations, and clear mobilization verification gate before advancing to Stage 4.'
                      : 'Stage 3 Field Mobilisation in progress. Ensure mobilization confirmation requirements are fulfilled to advance to Stage 4 Capturing.'}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    {getStepStatus(3) === 'completed' ? (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#09090b',
                          backgroundColor: '#f4f4f5',
                          border: '1px solid #d4d4d8',
                          borderRadius: '4px',
                          padding: '0.35rem 0.65rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontWeight: 600,
                        }}
                      >
                        <CheckCircle2 size={13} /> Stage 3 Completed &amp; Mobilised
                      </div>
                    ) : isOps ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {!isMobilisationGatePassed && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              color: '#71717a',
                              backgroundColor: '#f4f4f5',
                              border: '1px solid #d4d4d8',
                              borderRadius: '4px',
                              padding: '0.25rem 0.5rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontWeight: 600,
                            }}
                          >
                            <Lock size={12} /> Gate Approval Required
                          </span>
                        )}
                        <button
                          onClick={() => setIsProceedStageModalOpen(true)}
                          className="btn btn-primary"
                          style={{
                            fontSize: '0.775rem',
                            height: '34px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            backgroundColor: '#09090b',
                            color: '#ffffff',
                            border: '1px solid #09090b',
                            padding: '0 1rem',
                            fontWeight: 700,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                            cursor: 'pointer',
                          }}
                        >
                          Proceed to Next Stage (Capturing) <ArrowRight size={14} />
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#71717a',
                          backgroundColor: '#f4f4f5',
                          border: '1px solid #e4e4e7',
                          borderRadius: '4px',
                          padding: '0.35rem 0.65rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontWeight: 600,
                        }}
                      >
                        {isMobilisationGatePassed ? (
                          <>
                            <CheckCircle2 size={13} /> Mobilisation Gate Cleared — Awaiting Dispatch
                          </>
                        ) : (
                          <>
                            <Clock size={13} /> Mobilisation Confirmation Pending Ops Verification
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Stage 4: Capturing Details */}
            {selectedStage.id === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Survey Sectors</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{sectorsData.length || 0} Sectors</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Completed Sectors</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{sectorsData.filter((s) => s.status === 'Completed').length} / {sectorsData.length || 1}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Area Surveyed</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{projectDetails.totalArea}</span>
                  </div>
                </div>

                {/* Sectors Table Preview */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                  <table className="wf-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Sector</th>
                        <th>Status</th>
                        <th>Coverage</th>
                        <th>Data Captured</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectorsData.slice(0, 4).map((sec) => (
                        <tr key={sec.id}>
                          <td style={{ fontWeight: 700 }}>{sec.name}</td>
                          <td>
                            <span
                              style={{
                                fontSize: '0.725rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: sec.status === 'Completed' ? 'rgba(22, 163, 74, 0.15)' : '#f4f4f5',
                                color: sec.status === 'Completed' ? '#16a34a' : '#52525b',
                                border: sec.status === 'Completed' ? '1px solid #22c55e' : '1px solid #d4d4d8',
                              }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: sec.status === 'Completed' ? '#16a34a' : '#71717a',
                                }}
                              />
                              {sec.status}
                            </span>
                          </td>
                          <td>{sec.coverage}</td>
                          <td>{sec.dataCaptured}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Stage 5: Processing Details */}
            {selectedStage.id === 5 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Photogrammetry Engine</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Pix4D / Agisoft Cluster</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Resolution / GSD</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{(livePlan as any)?.parameters?.gsd_cm_px || '2.5'} cm/px Orthomosaic</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Elevation Extraction</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>DEM &amp; DSM (1m grid)</span>
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.85rem', backgroundColor: '#fafafa', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Deliverables Ingest &amp; Quality Check</span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    Raw sensor imagery ingested and cross-calibrated against ground control targets. Georeferenced orthomosaics and 3D dense point clouds generated upon sector completion.
                  </p>
                </div>
              </div>
            )}

            {/* Stage 6: Delivered Details (matching Stages 1, 2, 3 rich structured card layout) */}
            {selectedStage.id === 6 && (
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                {/* Section 1: Project Handover & Certification */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                    <CheckCircle2 size={15} color="#09090b" />
                    <h4 style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                      1. Project Handover &amp; Final Certification
                    </h4>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem 1rem', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Project Handover Status</span>
                      <strong style={{ color: projectDetails.status === 'completed' ? '#059669' : '#09090b' }}>
                        {projectDetails.status === 'completed' ? 'Completed & Handed Over' : 'Pending Data Clearance'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Inspection Certificate</span>
                      <strong style={{ color: '#09090b' }}>
                        {projectDetails.status === 'completed' ? 'Certified & Sealed' : 'In Preparation'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Final Package Package</span>
                      <strong style={{ color: '#09090b' }}>Orthomosaic + DEM + CAD + LAS</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Operations Delivery Lead</span>
                      <strong style={{ color: '#09090b' }}>LATRICS Flight Operations</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Client Verification</span>
                      <strong style={{ color: '#09090b' }}>Verified by Client Primary</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Audit Record Status</span>
                      <strong style={{ color: '#09090b' }}>Permanently Archived</strong>
                    </div>
                  </div>
                </div>

                {/* Section 2: Verified Survey Deliverables Package */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                    <Layers size={15} color="#09090b" />
                    <h4 style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                      2. Verified Deliverables &amp; Downloads
                    </h4>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', backgroundColor: '#fafafa', border: '1px solid #f4f4f5', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <FileText size={15} color="#09090b" />
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>High-Resolution Orthomosaic (GeoTIFF)</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Calibrated 2D orthophoto map referenced to WGS84</div>
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(`/activity-logs?projectId=${projectId}&tab=documents`)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.725rem', height: '28px', padding: '0 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Download size={12} /> Download
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', backgroundColor: '#fafafa', border: '1px solid #f4f4f5', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <FileText size={15} color="#09090b" />
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>Digital Elevation Model &amp; Surface Model (DEM/DSM)</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Topographic 3D elevation surface model and raster contour grid</div>
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(`/activity-logs?projectId=${projectId}&tab=documents`)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.725rem', height: '28px', padding: '0 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Download size={12} /> Download
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', backgroundColor: '#fafafa', border: '1px solid #f4f4f5', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <FileText size={15} color="#09090b" />
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>3D Dense Point Cloud (LAS) &amp; CAD Contours (DXF)</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Classified LiDAR / photogrammetric point cloud and vector topography</div>
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(`/activity-logs?projectId=${projectId}&tab=documents`)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.725rem', height: '28px', padding: '0 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Download size={12} /> Download
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 3: Project Archive & Audit Notice */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <ShieldCheck size={15} color="#09090b" />
                    <h4 style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                      3. Immutable Project Audit &amp; Archival Record
                    </h4>
                  </div>
                  <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    This project has concluded all field captures, photogrammetry processing, quality clearances, and client handovers. All flight paths, timestamps, coordinate demarctions, and chat communications are preserved as a sealed, immutable audit record.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Stage Chat Box */}
          <StageChatBox
            projectId={projectId}
            stageId={selectedStage.id}
            stageName={selectedStage.name}
            stageStatus={getStepStatus(selectedStage.id)}
            messages={currentStageMessages}
            onSendMessage={handleSendStageMessage}
            currentUserName={user?.full_name || user?.company_name || 'User'}
            currentUserRole={user?.role || 'client'}
          />
        </div>
      ) : null}

      {/* ── 6. SECTION 2: OVERVIEW TAB CONTENT (Summary on Left & Stage Chat Box on Right replacing Quick Actions) ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
          {/* Left: Streamlined Overview Dashboard (Zero redundancy, pure stage reflection) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* ── 1. Survey Specifications & Geospatial AOI Card ── */}
            <div className="wf-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Folder size={18} color="#09090b" />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    Mission Specifications &amp; Geospatial Parameters
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>ID: {projectDetails.id}</span>
                  {projectDetails.id && (
                    <button
                      type="button"
                      onClick={handleCopyId}
                      title={copiedId ? 'Copied to clipboard!' : 'Copy Project ID'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', display: 'inline-flex', alignItems: 'center' }}
                    >
                      {copiedId ? <Check size={13} color="#09090b" /> : <Copy size={13} color="#71717a" />}
                    </button>
                  )}
                </div>
              </div>

              {/* 3 Parameter Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                {/* Location & Site */}
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Survey Location &amp; Site
                  </span>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', marginTop: '0.3rem' }}>
                    <MapPin size={15} color="#09090b" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#09090b' }}>
                        {reqFormDetails.rawLoc !== '—' ? reqFormDetails.rawLoc : projectDetails.location}
                      </span>
                      {(reqFormDetails.city !== '—' || reqFormDetails.state !== '—') && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                          {[reqFormDetails.city !== '—' ? reqFormDetails.city : '', reqFormDetails.state !== '—' ? reqFormDetails.state : ''].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Target Area & Scheduled Window */}
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Target Area &amp; Schedule
                  </span>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', marginTop: '0.3rem' }}>
                    <Layers size={15} color="#09090b" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#09090b' }}>
                        {projectDetails.totalArea}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                        {reqFormDetails.startDate !== '—' && reqFormDetails.endDate !== '—'
                          ? `${reqFormDetails.startDate} → ${reqFormDetails.endDate}`
                          : reqFormDetails.startDate !== '—'
                          ? `Starts: ${reqFormDetails.startDate}`
                          : `Created: ${projectDetails.createdDate}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sensor & Processing Mode */}
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Sensor &amp; Calibration
                  </span>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', marginTop: '0.3rem' }}>
                    <Cpu size={15} color="#09090b" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#09090b' }}>
                        {reqFormDetails.sensorLabel}
                      </span>
                      <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '0.1rem', lineHeight: 1.3 }}>
                        {reqFormDetails.sensorDesc}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deliverables */}
              <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Requested Deliverables &amp; Photogrammetry Outputs
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                  {reqFormDetails.deliverablesList.map((d, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        backgroundColor: '#f4f4f5',
                        border: '1px solid #d4d4d8',
                        color: '#09090b',
                        textTransform: 'capitalize',
                      }}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              {/* Remarks / Scope Note */}
              {reqFormDetails.remarks && (
                <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Client Scope Instructions
                  </span>
                  <p style={{ fontSize: '0.775rem', color: '#3f3f46', margin: '0.2rem 0 0', lineHeight: 1.4 }}>
                    &ldquo;{reqFormDetails.remarks}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {/* ── 2. Live Mission Execution & Operational Parameters Card ── */}
            <div className="wf-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={18} color="#09090b" />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    Operational Execution &amp; Sector Progress
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#09090b' }}>
                    Overall Progress: {projectDetails.overallProgress}%
                  </span>
                  <div className="wf-progress-track" style={{ width: '80px', height: '6px' }}>
                    <div className="wf-progress-fill" style={{ width: `${projectDetails.overallProgress}%`, backgroundColor: '#09090b' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                {/* Sector Grid Breakdown */}
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Sector Grid Breakdown
                  </span>
                  <div style={{ marginTop: '0.25rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>
                      {liveSectors.length > 0 ? `${liveSectors.length} Sectors Registered` : 'Single Area Grid'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                      {liveSectors.filter((s) => s.status === 'completed' || s.status === 'verified').length} completed,{' '}
                      {liveSectors.filter((s) => s.status === 'in_progress').length} in progress
                    </div>
                  </div>
                </div>

                {/* Operational Plan Feasibility */}
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Operational Plan Status
                  </span>
                  <div style={{ marginTop: '0.25rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>
                      {livePlan ? `${livePlan.estimated_flight_hours} Flight Hours` : 'Feasibility Calibrated'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                      {livePlan ? `Plan Status: ${livePlan.status.toUpperCase()}` : 'DGCA compliance checked'}
                    </div>
                  </div>
                </div>

                {/* Flight Crew & Deployed Assets */}
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Deployed Flight Assets &amp; Crew
                  </span>
                  <div style={{ marginTop: '0.25rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>
                      {assignedPilots.length > 0 ? `${assignedPilots.length} Pilot(s) Assigned` : 'Field Team Assigned'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                      {assignedPilots.length > 0 ? assignedPilots.map((p) => p.name).join(', ') : 'LATRICS Operations'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 3. Key Stakeholders Directory Card (Read-only overview) ── */}
            <div className="wf-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={18} color="#09090b" />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    Key Stakeholders &amp; Communication Directory
                  </h3>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
                {/* Contact 1: Primary Client (Required User) */}
                <div style={{ padding: '0.85rem', backgroundColor: '#fafafa', borderRadius: '6px', border: '1px solid #e4e4e7', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                    <Building2 size={14} color="#71717a" />
                    <span style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Client Organization
                    </span>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
                    {primaryContact.name}
                  </span>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                    {reqFormDetails.company !== '—' ? reqFormDetails.company : user?.company_name || 'Client Workspace'}
                  </span>
                  {primaryContact.email && primaryContact.email !== '—' && (
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                      {primaryContact.email}
                    </span>
                  )}
                  {primaryContact.phone && primaryContact.phone !== '—' && (
                    <span style={{ fontSize: '0.725rem', color: '#71717a' }}>
                      Tel: {primaryContact.phone}
                    </span>
                  )}
                </div>

                {/* Contact 2: Appointed Subordinate / Local POC (Chosen / Mentioned User) */}
                <div style={{ padding: '0.85rem', backgroundColor: '#fafafa', borderRadius: '6px', border: '1px solid #e4e4e7', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                    <User size={14} color="#71717a" />
                    <span style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Local POC / Subordinate
                    </span>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
                    {appointedSubordinate.name}
                  </span>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                    {appointedSubordinate.designation}
                  </span>
                  {appointedSubordinate.email && appointedSubordinate.email !== '—' && (
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                      {appointedSubordinate.email}
                    </span>
                  )}
                  {appointedSubordinate.phone && appointedSubordinate.phone !== '—' && (
                    <span style={{ fontSize: '0.725rem', color: '#71717a' }}>
                      Tel: {appointedSubordinate.phone}
                    </span>
                  )}
                </div>

                {/* Contact 3: LATRICS Operations Lead (Required / Assigned User) */}
                <div style={{ padding: '0.85rem', backgroundColor: '#fafafa', borderRadius: '6px', border: '1px solid #e4e4e7', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                    <ShieldCheck size={14} color="#09090b" />
                    <span style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      LATRICS Operations Lead
                    </span>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
                    {opsHandler.name}
                  </span>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                    {opsHandler.role || 'Operations Flight Manager'}
                  </span>
                  {opsHandler.email && opsHandler.email !== '—' && (
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                      {opsHandler.email}
                    </span>
                  )}
                  {opsHandler.phone && opsHandler.phone !== '—' && (
                    <span style={{ fontSize: '0.725rem', color: '#71717a' }}>
                      Tel: {opsHandler.phone}
                    </span>
                  )}
                </div>

                {/* Contact 4: Assigned Flight Crew / Remote Pilot(s) */}
                {assignedPilots.length === 0 ? (
                  <div style={{ padding: '0.85rem', backgroundColor: '#fafafa', borderRadius: '6px', border: '1px solid #e4e4e7', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                      <Plane size={14} color="#09090b" />
                      <span style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Assigned Flight Crew
                      </span>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
                      Pending Mobilisation
                    </span>
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                      DGCA Flight Crew &amp; Pilots
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.15rem' }}>
                      Dispatched during Mobilising stage
                    </span>
                  </div>
                ) : (
                  assignedPilots.map((pilot, pIdx) => (
                    <div
                      key={pilot.id || pIdx}
                      style={{
                        padding: '0.85rem',
                        backgroundColor: '#fafafa',
                        borderRadius: '6px',
                        border: '1px solid #e4e4e7',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Plane size={14} color="#09090b" />
                          <span style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            Assigned Flight Crew {assignedPilots.length > 1 ? `(${pIdx + 1})` : ''}
                          </span>
                        </div>
                        {pilot.isPendingInvite ? (
                          <span
                            style={{
                              fontSize: '0.625rem',
                              fontWeight: 700,
                              color: '#b45309',
                              backgroundColor: '#fef3c7',
                              padding: '0.05rem 0.35rem',
                              borderRadius: '3px',
                              border: '1px solid #fde68a',
                            }}
                          >
                            🟡 Invited
                          </span>
                        ) : pilot.dgcaLicenseNo ? (
                          <span
                            style={{
                              fontSize: '0.625rem',
                              fontWeight: 700,
                              color: '#09090b',
                              backgroundColor: '#f4f4f5',
                              padding: '0.05rem 0.35rem',
                              borderRadius: '3px',
                              border: '1px solid #d4d4d8',
                            }}
                          >
                            DGCA Certified
                          </span>
                        ) : null}
                      </div>

                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
                        {pilot.name}
                      </span>
                      <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                        {pilot.isPendingInvite
                          ? 'Remote Pilot (Invitation Pending)'
                          : pilot.dgcaLicenseNo
                          ? `${pilot.role} • ${pilot.dgcaLicenseNo}`
                          : pilot.role}
                      </span>
                      {pilot.email && (
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                          {pilot.email}
                        </span>
                      )}
                      {pilot.contactNo && pilot.contactNo !== '—' && (
                        <span style={{ fontSize: '0.725rem', color: '#71717a' }}>
                          Tel: {pilot.contactNo}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>


          </div>

          {/* Right: Stage Chat Box replacing Quick Actions Card */}
          <StageChatBox
            projectId={projectId}
            stageId={selectedStage.id}
            stageName={selectedStage.name}
            stageStatus={getStepStatus(selectedStage.id)}
            messages={currentStageMessages}
            onSendMessage={handleSendStageMessage}
            currentUserName={user?.full_name || user?.company_name || 'User'}
            currentUserRole={user?.role || 'client'}
          />
        </div>
      )}




      {/* Requirement / Revision Modal */}
      <SubmitRequestModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        currentVersionNumber={1}
        onSubmit={async () => {
          setIsSubmitModalOpen(false);
          fetchProjectOverview();
        }}
      />

      {/* Multi-File Upload Documents Modal */}
      {isUploadDocModalOpen && (
        <Portal>
          <div
            className="viewport-modal-backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(2px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              padding: '1rem',
            }}
            onClick={() => {
              if (!isUploadingDocs) setIsUploadDocModalOpen(false);
            }}
          >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #f4f4f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#09090b' }}>
                  Upload Project Documents
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                  Attach multiple documents, specifications, boundaries, or reports to this project.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isUploadingDocs && setIsUploadDocModalOpen(false)}
                disabled={isUploadingDocs}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.35rem',
                  cursor: isUploadingDocs ? 'not-allowed' : 'pointer',
                  color: '#71717a',
                  borderRadius: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Category Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#09090b', marginBottom: '0.4rem' }}>
                  Document Category
                </label>
                <select
                  value={docUploadCategory}
                  onChange={(e) => setDocUploadCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.8rem',
                    borderRadius: '6px',
                    border: '1px solid #d4d4d8',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                >
                  <option value="Scope Document">Scope Document / Statement of Work</option>
                  <option value="Boundary / KML">Boundary / KML / AOI Polygon</option>
                  <option value="Site Survey Report">Site Survey Report</option>
                  <option value="DGCA / Flight Permission">DGCA / Flight Permission</option>
                  <option value="Deliverable Output">Deliverable Output</option>
                  <option value="Invoice / Payment Proof">Invoice / Payment Proof</option>
                  <option value="General Document">General Reference Document</option>
                </select>
              </div>

              {/* Multi-file Drag & Drop Area */}
              <div>
                <input
                  ref={modalDocInputRef}
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleAddModalDocs(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingModalDocs(true);
                  }}
                  onDragLeave={() => setIsDraggingModalDocs(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingModalDocs(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleAddModalDocs(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => modalDocInputRef.current?.click()}
                  style={{
                    border: isDraggingModalDocs ? '2px dashed #09090b' : '2px dashed #d4d4d8',
                    backgroundColor: isDraggingModalDocs ? '#f4f4f5' : '#fafafa',
                    borderRadius: '8px',
                    padding: '1.75rem 1rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <UploadCloud size={32} color="#71717a" style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ margin: 0, fontSize: '0.825rem', fontWeight: 600, color: '#09090b' }}>
                    Click to browse or drag &amp; drop multiple files
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.725rem', color: '#71717a' }}>
                    PDF, KML, KMZ, ZIP, DWG, XLSX, CSV, JPG, PNG (Max 50MB per file)
                  </p>
                </div>
              </div>

              {/* Upload Queue List */}
              {docUploadQueue.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#09090b' }}>
                      Selected Files ({docUploadQueue.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setDocUploadQueue([])}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '0.725rem',
                        color: '#71717a',
                        cursor: 'pointer',
                        fontWeight: 600,
                        padding: 0,
                      }}
                    >
                      Clear All
                    </button>
                  </div>

                  <div
                    style={{
                      maxHeight: '180px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      paddingRight: '0.25rem',
                    }}
                  >
                    {docUploadQueue.map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.5rem 0.75rem',
                          backgroundColor: '#f4f4f5',
                          borderRadius: '6px',
                          border: '1px solid #e4e4e7',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                          <Paperclip size={14} color="#71717a" style={{ flexShrink: 0 }} />
                          <span
                            style={{
                              fontSize: '0.775rem',
                              fontWeight: 600,
                              color: '#09090b',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '320px',
                            }}
                          >
                            {file.name}
                          </span>
                          <span style={{ fontSize: '0.675rem', color: '#71717a', flexShrink: 0 }}>
                            ({formatFileSize(file.size)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveModalDoc(idx);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#71717a',
                            padding: '0.2rem',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => modalDocInputRef.current?.click()}
                    style={{
                      alignSelf: 'flex-start',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: 'none',
                      border: 'none',
                      color: '#09090b',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '0.25rem 0',
                    }}
                  >
                    <Plus size={13} />
                    <span>Add more files</span>
                  </button>
                </div>
              )}

              {/* Error Alert */}
              {docUploadError && (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    backgroundColor: '#f4f4f5',
                    border: '1px solid #d4d4d8',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    color: '#09090b',
                  }}
                >
                  {docUploadError}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #f4f4f5',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                backgroundColor: '#fafafa',
              }}
            >
              <button
                type="button"
                onClick={() => setIsUploadDocModalOpen(false)}
                disabled={isUploadingDocs}
                className="wf-btn"
                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUploadDocs}
                disabled={isUploadingDocs || docUploadQueue.length === 0}
                className="wf-btn wf-btn-primary"
                style={{
                  fontSize: '0.8rem',
                  padding: '0.5rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  opacity: docUploadQueue.length === 0 || isUploadingDocs ? 0.6 : 1,
                  cursor: docUploadQueue.length === 0 || isUploadingDocs ? 'not-allowed' : 'pointer',
                }}
              >
                {isUploadingDocs ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>Upload {docUploadQueue.length > 0 ? `(${docUploadQueue.length})` : ''}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </Portal>
    )}

      {/* ── 1. Modal: Edit Client Project Contacts (Client Only) ── */}
      {isEditClientModalOpen && (
        <Portal>
          <div
            className="viewport-modal-backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(2px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              padding: '1.5rem',
            }}
          >
            <div
              className="wf-card"
              style={{
                width: '100%',
                maxWidth: '560px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#ffffff',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '1.15rem 1.5rem',
                  borderBottom: '1px solid #f4f4f5',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#09090b' }}>
                    Edit Client Project Contacts
                  </h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Update Primary Client contact information and appointed subordinate details for field coordination.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditClientModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#71717a',
                    cursor: 'pointer',
                    padding: '0.35rem',
                    borderRadius: '4px',
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Section A: Primary Client Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.4rem' }}>
                    <User size={15} color="#09090b" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                      Primary Client Details
                    </span>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Full Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editPrimaryName}
                      onChange={(e) => setEditPrimaryName(e.target.value)}
                      placeholder="Client Full Name"
                      style={{ fontSize: '0.8rem' }}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Email Address *</label>
                      <input
                        type="email"
                        className="form-input"
                        value={editPrimaryEmail}
                        onChange={(e) => setEditPrimaryEmail(e.target.value)}
                        placeholder="client@organization.com"
                        style={{ fontSize: '0.8rem' }}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Phone Number *</label>
                      <input
                        type="tel"
                        className="form-input"
                        value={editPrimaryPhone}
                        onChange={(e) => setEditPrimaryPhone(e.target.value)}
                        placeholder="Phone Number"
                        style={{ fontSize: '0.8rem' }}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Section B: Appointed Subordinate */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid #f4f4f5', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Users size={15} color="#09090b" />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                        Appointed Subordinate (Project In-Charge)
                      </span>
                    </div>
                    <span style={{ fontSize: '0.675rem', color: '#09090b', backgroundColor: '#f4f4f5', padding: '0.1rem 0.35rem', borderRadius: '3px', fontWeight: 600 }}>
                      Request Form Appointment
                    </span>
                  </div>

                  {orgSubordinates.length > 0 && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                        Quick Select from Team Members:
                      </label>
                      <select
                        className="form-input"
                        value={selectedSubUserId}
                        onChange={(e) => handleSelectSubMember(e.target.value)}
                        style={{ fontSize: '0.8rem' }}
                      >
                        <option value="">-- Choose registered team member or enter manually --</option>
                        {orgSubordinates.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.full_name} ({m.email}) {m.designation ? `• ${m.designation}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Subordinate Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editSubName}
                        onChange={(e) => setEditSubName(e.target.value)}
                        placeholder="Subordinate Full Name"
                        style={{ fontSize: '0.8rem' }}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Designation / Title</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editSubDesignation}
                        onChange={(e) => setEditSubDesignation(e.target.value)}
                        placeholder="e.g. Project Coordinator"
                        style={{ fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Email Address</label>
                      <input
                        type="email"
                        className="form-input"
                        value={editSubEmail}
                        onChange={(e) => setEditSubEmail(e.target.value)}
                        placeholder="subordinate@organization.com"
                        style={{ fontSize: '0.8rem' }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Phone Number *</label>
                      <input
                        type="tel"
                        className="form-input"
                        value={editSubPhone}
                        onChange={(e) => setEditSubPhone(e.target.value)}
                        placeholder="Phone Number"
                        style={{ fontSize: '0.8rem' }}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderTop: '1px solid #f4f4f5',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  backgroundColor: '#fafafa',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsEditClientModalOpen(false)}
                  disabled={isSavingContacts}
                  className="wf-btn"
                  style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveClientContacts}
                  disabled={isSavingContacts || !editPrimaryName.trim()}
                  className="wf-btn wf-btn-primary"
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.5rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    border: '1px solid #09090b',
                  }}
                >
                  {isSavingContacts ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Contact Changes</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ── 2. Modal: Edit LATRICS Operations & Flight Crew Roster (LATRICS Ops Only) ── */}
      {isEditOpsModalOpen && (
        <Portal>
          <div
            className="viewport-modal-backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(2px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              padding: '1.5rem',
            }}
          >
            <div
              className="wf-card"
              style={{
                width: '100%',
                maxWidth: '650px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#ffffff',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '1.15rem 1.5rem',
                  borderBottom: '1px solid #f4f4f5',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#09090b' }}>
                    LATRICS Operations &amp; Flight Crew Roster
                  </h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Update LATRICS project handler details and assign certified DGCA pilots for field mobilization.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditOpsModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#71717a',
                    cursor: 'pointer',
                    padding: '0.35rem',
                    borderRadius: '4px',
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Section A: Operations Handler */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.4rem' }}>
                    <ShieldCheck size={15} color="#09090b" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                      LATRICS Project Handler
                    </span>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Handler Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editOpsName}
                      onChange={(e) => setEditOpsName(e.target.value)}
                      placeholder="e.g. LATRICS Operations Project Lead"
                      style={{ fontSize: '0.8rem' }}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Email Address *</label>
                      <input
                        type="email"
                        className="form-input"
                        value={editOpsEmail}
                        onChange={(e) => setEditOpsEmail(e.target.value)}
                        placeholder="ops@latrics.com"
                        style={{ fontSize: '0.8rem' }}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Contact Phone *</label>
                      <input
                        type="tel"
                        className="form-input"
                        value={editOpsPhone}
                        onChange={(e) => setEditOpsPhone(e.target.value)}
                        placeholder="Phone Number"
                        style={{ fontSize: '0.8rem' }}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Section B: Assigned Flight Crew */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid #f4f4f5', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Plane size={15} color="#09090b" />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                        Assigned Certified Flight Crew ({editPilotsList.length})
                      </span>
                    </div>
                    <span style={{ fontSize: '0.675rem', color: '#09090b', backgroundColor: '#f4f4f5', padding: '0.1rem 0.35rem', borderRadius: '3px', fontWeight: 600 }}>
                      DGCA Drone Crew
                    </span>
                  </div>

                  {/* Directory Quick-Add Dropdown */}
                  {availablePilots.length > 0 && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                        Assign Registered Pilot from Directory:
                      </label>
                      <select
                        className="form-input"
                        value={selectedDirPilotId}
                        onChange={(e) => handleAddPilotFromDirectory(e.target.value)}
                        style={{ fontSize: '0.8rem' }}
                      >
                        <option value="">-- Choose certified pilot from system directory --</option>
                        {availablePilots.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.full_name} ({p.email}) {p.pilot_profile?.dgca_license_number ? `• DGCA: ${p.pilot_profile.dgca_license_number}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Pilots Roster List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '190px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                    {editPilotsList.length === 0 ? (
                      <div style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: '#fafafa', border: '1px dashed #e4e4e7', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        No pilots assigned yet. Select from directory or add a pilot manually below.
                      </div>
                    ) : (
                      editPilotsList.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            padding: '0.5rem 0.65rem',
                            backgroundColor: '#fafafa',
                            border: '1px solid #e4e4e7',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            gap: '0.5rem',
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, color: '#09090b' }}>{p.name}</span>
                              {p.age && (
                                <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)', backgroundColor: '#f4f4f5', padding: '0.05rem 0.35rem', borderRadius: '3px' }}>
                                  {p.age} yrs
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.675rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                              {p.contactNo && <span>Phone: <b>{p.contactNo}</b></span>}
                              {p.email && <span>Email: <b>{p.email}</b></span>}
                            </div>
                            <div style={{ fontSize: '0.675rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                              {p.dgcaLicenseNo && <span>DGCA: <b style={{ fontFamily: 'monospace' }}>{p.dgcaLicenseNo}</b></span>}
                              {p.aadhaarNo && <span>Aadhaar: <b>{p.aadhaarNo}</b></span>}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemovePilot(p.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#09090b',
                              cursor: 'pointer',
                              padding: '0.2rem',
                            }}
                            title="Remove pilot from project"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Pilot Manually Box */}
                  <div style={{ backgroundColor: '#fcfcfc', border: '1px solid #f4f4f5', borderRadius: '6px', padding: '0.75rem', marginTop: '0.25rem' }}>
                    <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#09090b', marginBottom: '0.45rem' }}>
                      + Add Flight Crew Member Manually
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.675rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Pilot Full Name *</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Apurva"
                          value={newPilotName}
                          onChange={(e) => setNewPilotName(e.target.value)}
                          style={{ fontSize: '0.75rem', height: '30px', width: '100%' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.675rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Email Address (Login Credential) *</label>
                        <input
                          type="email"
                          className="form-input"
                          placeholder="e.g. pilot1@email.com"
                          value={newPilotEmail}
                          onChange={(e) => setNewPilotEmail(e.target.value)}
                          style={{ fontSize: '0.75rem', height: '30px', width: '100%' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.675rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Contact Number *</label>
                        <input
                          type="tel"
                          className="form-input"
                          placeholder="Phone Number"
                          value={newPilotPhone}
                          onChange={(e) => setNewPilotPhone(e.target.value)}
                          style={{ fontSize: '0.75rem', height: '30px', width: '100%' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.675rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Age (Years) *</label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="e.g. 26"
                          value={newPilotAge}
                          onChange={(e) => setNewPilotAge(e.target.value)}
                          style={{ fontSize: '0.75rem', height: '30px', width: '100%' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.675rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Aadhaar Number *</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="12-digit UIDAI"
                          value={newPilotAadhaar}
                          onChange={(e) => setNewPilotAadhaar(e.target.value)}
                          style={{ fontSize: '0.75rem', height: '30px', width: '100%' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.65rem', alignItems: 'flex-end' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.675rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>DGCA License No. (RPC) *</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. LAPL-0876-0998"
                          value={newPilotLicense}
                          onChange={(e) => setNewPilotLicense(e.target.value)}
                          style={{ fontSize: '0.75rem', height: '32px', width: '100%' }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCustomPilot}
                        style={{
                          height: '32px',
                          fontSize: '0.75rem',
                          whiteSpace: 'nowrap',
                          padding: '0 1rem',
                          fontWeight: 600,
                          backgroundColor: '#09090b',
                          color: '#ffffff',
                          border: '1px solid #09090b',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={13} />
                        <span>Add to Roster</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderTop: '1px solid #f4f4f5',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  backgroundColor: '#fafafa',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsEditOpsModalOpen(false)}
                  disabled={isSavingContacts}
                  className="wf-btn"
                  style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveOpsAndPilots}
                  disabled={isSavingContacts || !editOpsName.trim()}
                  className="wf-btn wf-btn-primary"
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.5rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    border: '1px solid #09090b',
                  }}
                >
                  {isSavingContacts ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Operations &amp; Roster</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ── 3. Modal: Proceed to Next Stage Confirmation (LATRICS Ops Only) ── */}
      {isProceedStageModalOpen && (
        <Portal>
          <div
            className="viewport-modal-backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(2px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              padding: '1.5rem',
            }}
          >
            <div
              className="wf-card"
              style={{
                width: '100%',
                maxWidth: '480px',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#ffffff',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
              }}
            >
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: '#f4f4f5',
                      color: '#09090b',
                      border: '1px solid #d4d4d8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#09090b' }}>
                      Advance to Stage 4: Capturing
                    </h3>
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                      Complete mobilization and activate aerial survey flight operations
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
                  You are about to advance this project from <strong>Stage 3: Mobilising</strong> to <strong>Stage 4: Capturing</strong>.
                  This indicates that hardware dispatch and flight crew mobilization are complete and telemetry capture has commenced.
                </p>

                <div style={{ backgroundColor: '#fafafa', border: '1px solid #f4f4f5', borderRadius: '6px', padding: '0.75rem', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Primary Client:</span>
                    <strong>{primaryContact.name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Appointed Subordinate:</span>
                    <strong>{appointedSubordinate.name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>LATRICS Operations Handler:</span>
                    <strong>{opsHandler.name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Flight Crew Roster:</span>
                    <strong>{assignedPilots.length} Certified Pilot(s)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Mobilisation Gate:</span>
                    <strong style={{ color: isMobilisationGatePassed ? '#09090b' : '#71717a' }}>
                      {isMobilisationGatePassed ? '✓ Cleared & Verified' : '⚠ Locked (Verification Required)'}
                    </strong>
                  </div>
                </div>

                {!isMobilisationGatePassed && (
                  <div
                    style={{
                      padding: '0.65rem 0.85rem',
                      backgroundColor: '#f4f4f5',
                      border: '1px solid #d4d4d8',
                      borderRadius: '6px',
                      fontSize: '0.725rem',
                      color: '#09090b',
                      lineHeight: 1.45,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <Lock size={15} style={{ flexShrink: 0 }} />
                    <span>
                      <strong>Gate Locked:</strong> Operational verification required. Either approve client&apos;s genuine tickets/bills or verify client&apos;s ₹5,000 advance payment slip before proceeding.
                    </span>
                  </div>
                )}
              </div>

              <div
                style={{
                  padding: '0.85rem 1.5rem',
                  borderTop: '1px solid #f4f4f5',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.65rem',
                  backgroundColor: '#fafafa',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsProceedStageModalOpen(false)}
                  disabled={isProceedingStage}
                  className="wf-btn"
                  style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmProceedToNextStage}
                  disabled={isProceedingStage || !isMobilisationGatePassed}
                  className="wf-btn wf-btn-primary"
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.45rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    backgroundColor: !isMobilisationGatePassed ? '#71717a' : '#09090b',
                    color: '#ffffff',
                    border: '1px solid #09090b',
                    cursor: !isMobilisationGatePassed ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isProceedingStage ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Advancing...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm &amp; Advance to Capturing</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
