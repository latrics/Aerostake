'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Save,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Upload,
  MessageSquare,
  Paperclip,
  MoreVertical,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  HelpCircle,
  FileCheck,
  Plane,
  Compass,
  AlertTriangle,
  Calendar,
  ChevronRight,
  X,
  Lock,
  CornerDownRight,
  Download,
  Loader2,
  History,
  RefreshCw,
} from 'lucide-react';
import { requestApi } from '@/modules/requests/api';
import { projectApi } from '@/modules/projects/api';
import { planningApi } from '@/modules/planning/api';
import { markPlanningVersionAsSeen } from '@/modules/requests/notifications';
import { useAuth } from '@/lib/auth';
import { Role, isLatricsRole } from '@/lib/role';
import { Portal } from '@/components/Portal';
import { formatMessageStamp } from '@/lib/message-time';

export interface ThreadMessage {
  id: string;
  author: string;
  role: 'LATRICS' | 'CLIENT';
  authorRole?: 'admin' | 'ops' | 'client' | 'subordinate';
  authorDesignation?: string;
  timestamp: string;
  content: string;
  attachment?: {
    name: string;
    size: string;
  };
  replyTo?: {
    id: string;
    author: string;
    content: string;
  };
}

export interface ClarificationThread {
  id: string;
  questionTitle: string;
  messages: ThreadMessage[];
}

export interface PlanningFormData {
  // Stage 1
  kmlFileName: string;
  kmlFileSize: string;
  kmlCalculatedArea: string;
  kmlRequestedArea: string;
  kmlBoundaryStatus: string;

  // Stage 2
  airspaceZones: string[];
  dgcaClearanceRequired?: string;
  airportProximityKm?: string;
  nearestAerodrome?: string;
  policeIntimationRequired?: string;

  // Stage 3
  terrainTypes: string[];
  terrainType?: string;
  elevationVariationMeters: string;
  weatherConditions: string[];
  fieldAccessIdentified: boolean;
  fieldAccessNotes: string;

  // Stage 4
  hazards: string[];
  maxObstacleHeightMeters: string;
  safetyBufferDistanceMeters: string;
  hazardMitigationNotes: string;

  // Stage 5
  gcpsNeeded: string;
  gcpTargetSizeCm: string;
  gcpTargetMaterial: string;
  gcpLocationFile: string;
  checkpointsNeeded?: string;
  baseStationSetup?: string;
  gcpFileAttached?: string;

  // Stage 6
  numberOfLandings: string;
  plannedAltitudeMeters: string;
  frontOverlapPercent: string;
  sideOverlapPercent: string;
  estimatedGsdCm?: string;
  flightDurationMinutes?: string;
  batterySetsRequired?: string;

  // Stage 7
  expectedSurveyDays: string;
  expectedStartDate: string;
  expectedEndDate: string;
  pilotTravelDate: string;
  dataDeliveryTimelineDays: string;
  weatherContingencyDays?: string;

  // Stage 8
  feasibilityDecision: 'yes' | 'no' | 'need_clarity' | '';
  decisionRemarks: string;
  reviewConfirmed: boolean;
}

interface Props {
  requestId?: string;
  projectId?: string;
  clientCompany?: string;
  projectName?: string;
  role?: 'ops' | 'client';
}

export function ProjectPlanningFeasibilityView({
  requestId: propRequestId,
  projectId: propProjectId,
  clientCompany: propClientCompany,
  projectName: propProjectName,
  role: propRole,
}: Props) {
  const router = useRouter();
  const { user } = useAuth();

  const isPilot = Boolean(user && user.role?.toLowerCase() === 'pilot');
  const userRoleStr = (user?.role || '').toLowerCase();
  const isSubordinate = Boolean(
    user && (
      userRoleStr === 'client_sub' ||
      userRoleStr === Role.CLIENT_SUB ||
      userRoleStr.includes('sub') ||
      (user as any).designation?.toLowerCase().includes('subordinate')
    )
  );
  const role = isPilot ? 'pilot' : (propRole || (user && !isLatricsRole(user.role) ? 'client' : 'ops'));
  const isClient = role === 'client';
  const isOps = role === 'ops';

  // Active Stage (1 to 8)
  const [currentStage, setCurrentStage] = useState<number>(1);

  // Backend Loaded Request Information (No hardcoded frontend seed data)
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [isLoadingBackend, setIsLoadingBackend] = useState<boolean>(true);

  // Versioning state
  const [planningVersions, setPlanningVersions] = useState<any[]>([]);
  const [activeVersionCode, setActiveVersionCode] = useState<string | null>(null);
  const [latestSender, setLatestSender] = useState<'ops' | 'client' | null>(null);
  const [isViewingHistorical, setIsViewingHistorical] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Per-stage draft preservation tracking
  const [stageDraftSaved, setStageDraftSaved] = useState<Record<number, boolean>>({});
  const [isCurrentStageDirty, setIsCurrentStageDirty] = useState<boolean>(false);

  // Clarification cycle & workflow status
  // 'draft' | 'awaiting_clarity' | 'clarification_submitted' | 'feasible_pending_client_confirmation' | 'mobilising' | 'not_feasible'
  const [planningWorkflowStatus, setPlanningWorkflowStatus] = useState<string>('draft');

  // Client declaration confirmation state
  const [clientDeclarationConfirmed, setClientDeclarationConfirmed] = useState<boolean>(false);
  const [isMobilizingTransitioning, setIsMobilizingTransitioning] = useState<boolean>(false);

  // Stage 8 Full Form Preview Popup state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState<boolean>(false);

  // Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Info popup hover state (5th image info)
  const [showInfoTooltip, setShowInfoTooltip] = useState<boolean>(false);

  // Pure Empty Form Data (no static frontend seeded numbers or fake strings)
  const [formData, setFormData] = useState<PlanningFormData>({
    kmlFileName: '',
    kmlFileSize: '',
    kmlCalculatedArea: '',
    kmlRequestedArea: '',
    kmlBoundaryStatus: '',

    airspaceZones: [],
    dgcaClearanceRequired: '',
    airportProximityKm: '',
    nearestAerodrome: '',
    policeIntimationRequired: '',

    terrainTypes: [],
    terrainType: '',
    elevationVariationMeters: '',
    weatherConditions: [],
    fieldAccessIdentified: false,
    fieldAccessNotes: '',

    hazards: [],
    maxObstacleHeightMeters: '',
    safetyBufferDistanceMeters: '',
    hazardMitigationNotes: '',

    gcpsNeeded: '',
    gcpTargetSizeCm: '',
    gcpTargetMaterial: '',
    gcpLocationFile: '',
    checkpointsNeeded: '',
    baseStationSetup: '',
    gcpFileAttached: '',

    numberOfLandings: '',
    plannedAltitudeMeters: '',
    frontOverlapPercent: '',
    sideOverlapPercent: '',
    estimatedGsdCm: '',
    flightDurationMinutes: '',
    batterySetsRequired: '',

    expectedSurveyDays: '',
    expectedStartDate: '',
    expectedEndDate: '',
    pilotTravelDate: '',
    dataDeliveryTimelineDays: '',
    weatherContingencyDays: '',

    feasibilityDecision: '',
    decisionRemarks: '',
    reviewConfirmed: false,
  });

  // ── Universal Remarks, Attachments & Discussion Threads across ALL 8 STAGES (Pure backend loaded) ──
  const defaultStageThreads: Record<number, ThreadMessage[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
    7: [],
    8: [],
  };

  const mergeStageThreads = useCallback(
    (
      a?: Record<string | number, ThreadMessage[]> | null,
      b?: Record<string | number, ThreadMessage[]> | null
    ): Record<number, ThreadMessage[]> => {
      const result: Record<number, ThreadMessage[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] };
      for (let s = 1; s <= 8; s++) {
        const map = new Map<string, ThreadMessage>();
        const listA = (a && ((a as any)[s] || (a as any)[String(s)])) || [];
        const listB = (b && ((b as any)[s] || (b as any)[String(s)])) || [];
        for (const msg of listA) {
          if (msg && msg.id) map.set(msg.id, msg);
        }
        for (const msg of listB) {
          if (msg && msg.id) map.set(msg.id, msg);
        }
        result[s] = Array.from(map.values());
      }
      return result;
    },
    []
  );

  const [stageThreads, setStageThreads] = useState<Record<number, ThreadMessage[]>>(defaultStageThreads);
  const [stageAddingRemark, setStageAddingRemark] = useState<Record<number, boolean>>({});

  const [stageDraftTexts, setStageDraftTexts] = useState<Record<number, string>>({
    1: '',
    2: '',
    3: '',
    4: '',
    5: '',
    6: '',
    7: '',
    8: '',
  });

  const [stageAttachedFiles, setStageAttachedFiles] = useState<Record<number, string | null>>({
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
    6: null,
    7: null,
    8: null,
  });

  // Reply inputs per message in threads
  const [threadReplyInputs, setThreadReplyInputs] = useState<Record<string, string>>({});
  const [threadReplyAttachments, setThreadReplyAttachments] = useState<Record<string, string | null>>({});
  const [activeReplyBoxId, setActiveReplyBoxId] = useState<string | null>(null);

  // Stage 3: Three Mandatory Clarification Threads
  const [clarificationThreads, setClarificationThreads] = useState<ClarificationThread[]>([
    {
      id: 'thread-power',
      questionTitle: 'Power source available for charging?',
      messages: [],
    },
    {
      id: 'thread-poc',
      questionTitle: 'Local point of contact?',
      messages: [],
    },
    {
      id: 'thread-vehicle',
      questionTitle: 'Vehicle assigned?',
      messages: [],
    },
  ]);
  const [clarificationReplies, setClarificationReplies] = useState<Record<string, string>>({});

  // ── 1. Fetch authentic backend request & project data ──
  useEffect(() => {
    async function loadBackendData() {
      setIsLoadingBackend(true);
      try {
        let matchedReq = null;
        let matchedProj = null;

        const isUUID = (str?: string | null) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

        if (propProjectId && isUUID(propProjectId)) {
          matchedProj = await projectApi.getProject(propProjectId).catch(() => null);
          if (matchedProj) {
            setActiveProject(matchedProj);
            const projReqs = await requestApi.listProjectRequests(matchedProj.id).catch(() => []);
            if (projReqs.length > 0) {
              const sorted = [...projReqs].sort((a, b) => b.version - a.version);
              matchedReq = sorted[0];
              setActiveRequest(matchedReq);
            }
          }
        }

        if (!matchedProj) {
          const reqs = await requestApi.listAllRequests().catch(() => []);
          const searchKey = (propRequestId || propProjectId || '').replace(/^#/, '').trim().toLowerCase();

          if (searchKey) {
            matchedReq = reqs.find((r) => {
              if (r.id && r.id.toLowerCase() === searchKey) return true;
              if (r.project_id && r.project_id.toLowerCase() === searchKey) return true;
              if (String(r.version) === searchKey) return true;
              if (String(r.version).padStart(3, '0') === searchKey.padStart(3, '0')) return true;
              return false;
            });
          }

          if (!matchedReq && reqs.length > 0) {
            matchedReq = reqs[0];
          }

          if (matchedReq) {
            setActiveRequest(matchedReq);
            if (matchedReq.project_id) {
              matchedProj = await projectApi.getProject(matchedReq.project_id).catch(() => null);
              if (matchedProj) {
                setActiveProject(matchedProj);
              }
            }
          }
        }

        const targetProj = matchedProj;
        const targetProjId = targetProj?.id || matchedReq?.project_id;
        if (targetProjId) {
          try {
            const [versions, dbDraft] = await Promise.all([
              planningApi.listPlanningVersions(targetProjId).catch(() => []),
              planningApi.getPlanningDraft(targetProjId).catch(() => null),
            ]);
            setPlanningVersions(versions || []);

            // Unified data hydration for both Ops and Client:
            const latestVer = versions && versions.length > 0 ? versions[0] : null;
            if (latestVer) {
              setActiveVersionCode(latestVer.version_code);
              setLatestSender(latestVer.sender);
              if (latestVer.status) {
                setPlanningWorkflowStatus(latestVer.status);
              }
              markPlanningVersionAsSeen(targetProjId, latestVer.version_code, latestVer.created_at);
            }

            // Always merge stage threads between latest version snapshot and database draft
            const mergedThreads = mergeStageThreads(latestVer?.stage_threads, dbDraft?.stage_threads);
            if (Object.values(mergedThreads).some((arr) => arr.length > 0)) {
              setStageThreads(mergedThreads);
            }

            // Merge clarification threads
            const clar =
              dbDraft?.clarification_threads && dbDraft.clarification_threads.length > 0
                ? dbDraft.clarification_threads
                : (latestVer?.clarification_threads || null);
            if (clar && clar.length > 0) {
              setClarificationThreads(clar);
            }

            // Form parameters:
            // For Client: read-only from latest version snapshot, fallback to dbDraft
            // For Ops: load from dbDraft if present (preserving in-progress parameter edits), fallback to latest version
            const formSource = isClient
              ? (latestVer?.form_data && Object.keys(latestVer.form_data).length > 0 ? latestVer.form_data : dbDraft?.form_data)
              : (dbDraft?.form_data && Object.keys(dbDraft.form_data).length > 0 ? dbDraft.form_data : latestVer?.form_data);
            if (formSource && Object.keys(formSource).length > 0) {
              setFormData((prev) => ({ ...prev, ...formSource }));
            }

            if (dbDraft?.stage_draft_saved && Object.keys(dbDraft.stage_draft_saved).length > 0) {
              setStageDraftSaved(dbDraft.stage_draft_saved);
            }

            // Workflow status: prefer dbDraft.status if present, otherwise latestVer.status
            if (dbDraft?.status) {
              setPlanningWorkflowStatus(dbDraft.status);
            } else if (latestVer?.status) {
              setPlanningWorkflowStatus(latestVer.status);
            }
          } catch (verErr) {
            console.warn('Could not load planning versions or draft:', verErr);
          }
        }
      } catch (err) {
        console.error('Failed to load backend request for planning:', err);
      } finally {
        setIsLoadingBackend(false);
      }
    }

    loadBackendData();
  }, [propRequestId, propProjectId]);

  // Extract real metadata from activeRequest and activeProject
  const reqPayload = (activeRequest?.requirements_payload || activeProject?.requirements_payload || {}) as Record<string, any>;

  const displayRequestId = activeRequest?.version
    ? `#${String(activeRequest.version).padStart(3, '0')}`
    : propRequestId || '—';

  const displayProjectName =
    activeRequest?.project_title ||
    activeProject?.title ||
    reqPayload.project_name ||
    propProjectName ||
    '—';

  const displayClientCompany =
    reqPayload.company_name ||
    reqPayload.primary_contact?.company ||
    activeRequest?.client_company ||
    activeProject?.client_company ||
    propClientCompany ||
    '—';

  const displayLocation =
    reqPayload.address ||
    reqPayload.site_address ||
    reqPayload.location ||
    activeRequest?.survey_location ||
    activeProject?.survey_location ||
    '—';

  const displayArea =
    reqPayload.area ||
    reqPayload.area_sq_km ||
    activeProject?.area_sq_km
      ? `${reqPayload.area || reqPayload.area_sq_km || activeProject?.area_sq_km} sq km`
      : '—';

  const displayPayload =
    reqPayload.payload_sensor ||
    reqPayload.sensor ||
    activeRequest?.survey_type ||
    activeProject?.survey_type ||
    '—';

  const displayDeliverables = useMemo(() => {
    const raw = reqPayload.post_processing_deliverables || reqPayload.deliverables;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.join(', ');
    }
    if (typeof raw === 'string' && raw.trim()) {
      return raw;
    }
    return '—';
  }, [reqPayload]);

  const displayStatus =
    activeRequest?.project_status ||
    activeProject?.status ||
    'Under Planning';

  const displaySubmittedDate = useMemo(() => {
    const dateVal = activeRequest?.created_at || activeProject?.created_at;
    if (!dateVal) return '—';
    try {
      return new Date(dateVal).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(dateVal);
    }
  }, [activeRequest?.created_at, activeProject?.created_at]);

  const isNotFeasible = useMemo(() => {
    return (
      planningWorkflowStatus === 'not_feasible' ||
      planningWorkflowStatus === 'no' ||
      activeProject?.status === 'cancelled' ||
      activeRequest?.project_status === 'cancelled'
    );
  }, [planningWorkflowStatus, activeProject?.status, activeRequest?.project_status]);

  const isClosed = useMemo(() => {
    // If no planning version has ever been created or submitted, it can NEVER be closed or agreed upon
    if (planningVersions.length === 0 && !planningWorkflowStatus) {
      return false;
    }

    const pStatus = activeProject?.status?.toLowerCase();
    const rStatus = activeRequest?.project_status?.toLowerCase();
    const wStatus = planningWorkflowStatus?.toLowerCase();

    const closedStatuses = ['mobilising', 'active', 'in_progress', 'completed', 'approved'];

    // If still in draft or submitted or planning, it is NOT closed unless workflow status is explicitly closed
    if (pStatus === 'submitted' || pStatus === 'draft' || pStatus === 'planning' || rStatus === 'submitted' || rStatus === 'draft') {
      return closedStatuses.includes(wStatus || '');
    }

    return (
      closedStatuses.includes(pStatus || '') ||
      closedStatuses.includes(rStatus || '') ||
      closedStatuses.includes(wStatus || '')
    );
  }, [planningWorkflowStatus, activeProject?.status, activeRequest?.project_status, planningVersions.length]);

  const backendKmlFile = useMemo(() => {
    const name =
      reqPayload.kml_filename ||
      reqPayload.kml_files?.[0]?.name ||
      (Array.isArray(reqPayload.attachments)
        ? reqPayload.attachments.find((a: any) => a.name?.toLowerCase().endsWith('.kml'))?.name
        : null);

    const size =
      reqPayload.kml_files?.[0]?.size ||
      (Array.isArray(reqPayload.attachments)
        ? reqPayload.attachments.find((a: any) => a.name?.toLowerCase().endsWith('.kml'))?.size
        : null) ||
      '';

    return name ? { name, size } : null;
  }, [reqPayload]);

  const storageDraftKey = useMemo(() => {
    const idKey = activeProject?.id || propProjectId || activeRequest?.project_id || activeRequest?.id || propRequestId || 'default';
    return `latrics_planning_draft_${idKey}`;
  }, [activeProject?.id, propProjectId, activeRequest?.project_id, activeRequest?.id, propRequestId]);

  // ── 2. Purge stale seeded dummy data & hydrate pure backend area / KML ──
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Purge any stale dummy seed data from localStorage
    try {
      const keysToClean = [
        storageDraftKey,
        activeProject?.id ? `latrics_planning_draft_${activeProject.id}` : null,
        propProjectId ? `latrics_planning_draft_${propProjectId}` : null,
        activeRequest?.id ? `latrics_planning_draft_${activeRequest.id}` : null,
        propRequestId ? `latrics_planning_draft_${propRequestId.replace('#', '')}` : null,
        'latrics_planning_draft_default',
        'latrics_planning_draft_001',
      ].filter(Boolean) as string[];

      for (const k of keysToClean) {
        const val = localStorage.getItem(k);
        if (
          val &&
          (val.includes('Suresh Kumar') ||
            val.includes('demarcation') ||
            val.includes('northern ridge') ||
            val.includes('site_access_guidelines') ||
            val.includes('seed-'))
        ) {
          localStorage.removeItem(k);
        }
      }
    } catch {
      // Ignore storage errors
    }

    if (backendKmlFile) {
      setFormData((prev) => ({
        ...prev,
        kmlFileName: backendKmlFile.name,
        kmlFileSize: backendKmlFile.size || '—',
      }));
    }

    const rawArea =
      reqPayload.requested_area_sqkm ||
      reqPayload.target_area_sqkm ||
      reqPayload.area ||
      reqPayload.area_sq_km ||
      activeProject?.target_area_sqkm ||
      activeProject?.area_sq_km;

    if (rawArea) {
      setFormData((prev) => ({
        ...prev,
        kmlRequestedArea: String(rawArea),
      }));
    }
  }, [storageDraftKey, backendKmlFile, reqPayload.requested_area_sqkm, reqPayload.target_area_sqkm, reqPayload.area, reqPayload.area_sq_km, activeProject?.target_area_sqkm, activeProject?.area_sq_km, planningVersions]);

  const updateField = (field: keyof PlanningFormData, value: any) => {
    // Security Guard: Client cannot mutate operational planning parameters
    if (isClient) return;
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      try {
        const payloadToSave = {
          formData: updated,
          stageThreads,
          clarificationThreads,
          stageDraftSaved,
          planningWorkflowStatus,
          savedAt: new Date().toISOString(),
        };
        const targetProjId = activeProject?.id || propProjectId || activeRequest?.project_id;
        if (storageDraftKey) {
          localStorage.setItem(storageDraftKey, JSON.stringify(payloadToSave));
        }
        if (targetProjId) {
          localStorage.setItem(`latrics_planning_draft_${targetProjId}`, JSON.stringify(payloadToSave));
        }
        if (activeProject?.id) {
          localStorage.setItem(`latrics_planning_draft_${activeProject.id}`, JSON.stringify(payloadToSave));
        }
      } catch {}
      return updated;
    });
    setIsCurrentStageDirty(true);
    setStageDraftSaved((prev) => ({ ...prev, [currentStage]: false }));
  };

  const toggleArrayItem = (field: 'airspaceZones' | 'weatherConditions' | 'hazards' | 'terrainTypes', item: string) => {
    // Security Guard: Client cannot mutate operational planning parameters
    if (isClient) return;
    setFormData((prev) => {
      const list = (prev[field] as string[]) || [];
      const exists = list.includes(item);
      const updated = exists ? list.filter((x) => x !== item) : [...list, item];
      const newFormData = { ...prev, [field]: updated };
      try {
        const payloadToSave = {
          formData: newFormData,
          stageThreads,
          clarificationThreads,
          stageDraftSaved,
          planningWorkflowStatus,
          savedAt: new Date().toISOString(),
        };
        const targetProjId = activeProject?.id || propProjectId || activeRequest?.project_id;
        if (storageDraftKey) {
          localStorage.setItem(storageDraftKey, JSON.stringify(payloadToSave));
        }
        if (targetProjId) {
          localStorage.setItem(`latrics_planning_draft_${targetProjId}`, JSON.stringify(payloadToSave));
        }
      } catch {}
      return newFormData;
    });
    setIsCurrentStageDirty(true);
    setStageDraftSaved((prev) => ({ ...prev, [currentStage]: false }));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ── Sync Remarks and Form Snapshot to Backend Planning Draft (Background Database Persistence) ──
  const syncToBackend = async (
    threadsToSync = stageThreads,
    clarificationsToSync = clarificationThreads,
    formToSync = formData,
    statusToSync = planningWorkflowStatus,
    stageDraftSavedToSync = stageDraftSaved
  ) => {
    let targetProjId =
      activeProject?.id ||
      activeRequest?.project_id ||
      (propProjectId && propProjectId.length > 20 ? propProjectId : null);

    if (!targetProjId) {
      try {
        const reqs = await requestApi.listAllRequests();
        const searchKey = (propRequestId || propProjectId || '').replace(/^#/, '').trim().toLowerCase();
        const found =
          reqs.find((r) => {
            if (r.id && r.id.toLowerCase() === searchKey) return true;
            if (r.project_id && r.project_id.toLowerCase() === searchKey) return true;
            if (String(r.version) === searchKey) return true;
            if (String(r.version).padStart(3, '0') === searchKey.padStart(3, '0')) return true;
            return false;
          }) || reqs[0];
        if (found?.project_id) {
          targetProjId = found.project_id;
        }
      } catch {}
    }

    if (!targetProjId || isPilot) return null;

    try {
      // Save draft in the database in the background without creating a history version snapshot
      const draftResult = await planningApi.savePlanningDraft(targetProjId, {
        form_data: formToSync,
        stage_threads: threadsToSync,
        clarification_threads: clarificationsToSync,
        stage_draft_saved: stageDraftSavedToSync,
        status: statusToSync,
      });
      return draftResult;
    } catch (err) {
      console.warn('Backend planning draft sync notice:', err);
    }
    return null;
  };

  // ── Auto-sync polling every 4 seconds for real-time collaborative discussion ──
  const activeVersionCodeRef = useRef(activeVersionCode);
  activeVersionCodeRef.current = activeVersionCode;

  useEffect(() => {
    let targetProjId =
      activeProject?.id ||
      activeRequest?.project_id ||
      (propProjectId && propProjectId.length > 20 ? propProjectId : null);

    if (!targetProjId) return;

    const interval = setInterval(async () => {
      try {
        // Poll draft for live conversation threads and remarks
        const draft = await planningApi.getPlanningDraft(targetProjId).catch(() => null);
        if (draft && draft.stage_threads && Object.keys(draft.stage_threads).length > 0) {
          setStageThreads((prev) => {
            const merged = mergeStageThreads(prev, draft.stage_threads);
            if (JSON.stringify(prev) !== JSON.stringify(merged)) {
              return merged;
            }
            return prev;
          });
        }
        if (draft && draft.clarification_threads && draft.clarification_threads.length > 0) {
          setClarificationThreads((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(draft.clarification_threads)) {
              return draft.clarification_threads;
            }
            return prev;
          });
        }

        // Also poll versions for official status or version snapshot updates
        const vers = await planningApi.listPlanningVersions(targetProjId).catch(() => []);
        if (vers && vers.length > 0) {
          const latest = vers[0];
          if (latest.version_code !== activeVersionCodeRef.current) {
            activeVersionCodeRef.current = latest.version_code;
            setActiveVersionCode(latest.version_code);
            setLatestSender(latest.sender);
            setPlanningVersions(vers);
            if (latest.status) setPlanningWorkflowStatus(latest.status);
          }
        }
      } catch {}
    }, 4000);

    return () => clearInterval(interval);
  }, [activeProject?.id, activeRequest?.project_id, propProjectId]);

  // ── Stage Completion Verification (Parameters only - remarks skipped) ──
  const isStageParametersFilled = useCallback(
    (stageNum: number): boolean => {
      switch (stageNum) {
        case 1:
          return Boolean(
            formData.kmlCalculatedArea?.toString().trim() &&
            formData.kmlRequestedArea?.toString().trim() &&
            formData.kmlBoundaryStatus?.toString().trim()
          );
        case 2:
          return Boolean(
            formData.airspaceZones &&
            Array.isArray(formData.airspaceZones) &&
            formData.airspaceZones.length > 0
          );
        case 3:
          return Boolean(
            formData.terrainTypes &&
            Array.isArray(formData.terrainTypes) &&
            formData.terrainTypes.length > 0 &&
            formData.weatherConditions &&
            Array.isArray(formData.weatherConditions) &&
            formData.weatherConditions.length > 0 &&
            formData.elevationVariationMeters?.toString().trim() &&
            formData.fieldAccessIdentified
          );
        case 4:
          return Boolean(
            formData.hazards &&
            Array.isArray(formData.hazards) &&
            formData.hazards.length > 0 &&
            formData.maxObstacleHeightMeters?.toString().trim() &&
            formData.safetyBufferDistanceMeters?.toString().trim()
          );
        case 5: {
          const gcpCount = formData.gcpsNeeded?.toString().trim();
          const hasFile = gcpCount === '0' || Boolean(formData.gcpLocationFile?.toString().trim());
          return Boolean(
            gcpCount &&
            formData.gcpTargetSizeCm?.toString().trim() &&
            formData.gcpTargetMaterial?.toString().trim() &&
            hasFile
          );
        }
        case 6:
          return Boolean(
            formData.numberOfLandings?.toString().trim() &&
            formData.plannedAltitudeMeters?.toString().trim() &&
            formData.frontOverlapPercent?.toString().trim() &&
            formData.sideOverlapPercent?.toString().trim()
          );
        case 7:
          return Boolean(
            formData.expectedSurveyDays?.toString().trim() &&
            formData.expectedStartDate?.toString().trim() &&
            formData.expectedEndDate?.toString().trim() &&
            formData.pilotTravelDate?.toString().trim() &&
            formData.dataDeliveryTimelineDays?.toString().trim()
          );
        case 8:
          return Boolean(formData.feasibilityDecision);
        default:
          return false;
      }
    },
    [formData]
  );

  // ── Auto-save draft on form parameter or thread modification for Ops ──
  useEffect(() => {
    if (isClient || isLoadingBackend) return;

    const hasAnyContent = Boolean(
      formData.kmlCalculatedArea ||
      formData.kmlBoundaryStatus ||
      (formData.airspaceZones && formData.airspaceZones.length > 0) ||
      (formData.terrainTypes && formData.terrainTypes.length > 0) ||
      formData.elevationVariationMeters ||
      formData.fieldAccessIdentified ||
      (formData.hazards && formData.hazards.length > 0) ||
      formData.maxObstacleHeightMeters ||
      formData.safetyBufferDistanceMeters ||
      formData.gcpsNeeded ||
      formData.gcpTargetSizeCm ||
      formData.gcpTargetMaterial ||
      formData.gcpLocationFile ||
      formData.numberOfLandings ||
      formData.plannedAltitudeMeters ||
      formData.frontOverlapPercent ||
      formData.sideOverlapPercent ||
      formData.expectedSurveyDays ||
      formData.expectedStartDate ||
      formData.expectedEndDate ||
      formData.pilotTravelDate ||
      formData.dataDeliveryTimelineDays ||
      formData.feasibilityDecision ||
      formData.decisionRemarks ||
      Object.values(stageThreads).some((threads) => threads.length > 0)
    );

    if (!hasAnyContent) return;

    // Save immediately to local storage
    try {
      const payloadToSave = {
        formData,
        stageThreads,
        clarificationThreads,
        stageDraftSaved,
        planningWorkflowStatus,
        savedAt: new Date().toISOString(),
      };
      if (storageDraftKey) {
        localStorage.setItem(storageDraftKey, JSON.stringify(payloadToSave));
      }
      if (activeProject?.id) {
        localStorage.setItem(`latrics_planning_draft_${activeProject.id}`, JSON.stringify(payloadToSave));
      }
    } catch {}

    // Debounced sync to backend
    const timer = setTimeout(() => {
      syncToBackend(stageThreads, clarificationThreads, formData, planningWorkflowStatus, stageDraftSaved);
    }, 800);

    return () => clearTimeout(timer);
  }, [
    formData,
    stageThreads,
    clarificationThreads,
    stageDraftSaved,
    planningWorkflowStatus,
    isClient,
    isLoadingBackend,
    storageDraftKey,
    activeProject?.id,
  ]);

  // ── Requirement 2: Save Draft per stage to preserve inputs & persist version snapshot ──
  const handleSaveDraft = useCallback(async () => {
    try {
      const payloadToSave = {
        formData,
        stageThreads,
        clarificationThreads,
        stageDraftSaved: {
          ...stageDraftSaved,
          [currentStage]: true,
        },
        savedAt: new Date().toISOString(),
      };
      const targetProjId = activeProject?.id || propProjectId || activeRequest?.project_id;
      if (storageDraftKey) {
        localStorage.setItem(storageDraftKey, JSON.stringify(payloadToSave));
      }
      if (targetProjId) {
        localStorage.setItem(`latrics_planning_draft_${targetProjId}`, JSON.stringify(payloadToSave));
      }
      if (activeProject?.id) {
        localStorage.setItem(`latrics_planning_draft_${activeProject.id}`, JSON.stringify(payloadToSave));
      }
      const updatedSaved = {
        ...stageDraftSaved,
        [currentStage]: true,
      };
      setStageDraftSaved(updatedSaved);
      setIsCurrentStageDirty(false);
      await syncToBackend(stageThreads, clarificationThreads, formData, planningWorkflowStatus, updatedSaved);
      showToast('Draft saved in background.');
    } catch {
      showToast('Draft saved locally.');
    }
  }, [
    formData,
    stageThreads,
    clarificationThreads,
    stageDraftSaved,
    currentStage,
    storageDraftKey,
    activeProject?.id,
    activeRequest?.project_id,
    propProjectId,
    planningWorkflowStatus,
  ]);

  const [isRefreshingThreads, setIsRefreshingThreads] = useState(false);
  const handleRefreshThreadsFromServer = async () => {
    let targetProjId =
      activeProject?.id ||
      activeRequest?.project_id ||
      (propProjectId && propProjectId.length > 20 ? propProjectId : null);

    if (!targetProjId) {
      try {
        const reqs = await requestApi.listAllRequests();
        const searchKey = (propRequestId || propProjectId || '').replace(/^#/, '').trim().toLowerCase();
        const found =
          reqs.find((r) => {
            if (r.id && r.id.toLowerCase() === searchKey) return true;
            if (r.project_id && r.project_id.toLowerCase() === searchKey) return true;
            if (String(r.version) === searchKey) return true;
            if (String(r.version).padStart(3, '0') === searchKey.padStart(3, '0')) return true;
            return false;
          }) || reqs[0];
        if (found?.project_id) {
          targetProjId = found.project_id;
        }
      } catch {}
    }

    setIsRefreshingThreads(true);
    try {
      let draftData: any = null;
      if (targetProjId) {
        draftData = await planningApi.getPlanningDraft(targetProjId).catch(() => null);
      }
      let versions: any[] = [];
      if (targetProjId) {
        versions = await planningApi.listPlanningVersions(targetProjId).catch(() => []);
      }

      let updated = false;

      // 1. Merge latest draft stage threads and version snapshot threads
      const latestVer = versions && versions.length > 0 ? versions[0] : null;
      const merged = mergeStageThreads(latestVer?.stage_threads, draftData?.stage_threads);
      if (Object.values(merged).some((arr) => arr.length > 0)) {
        setStageThreads(merged);
        updated = true;
      }

      const clar =
        draftData?.clarification_threads && draftData.clarification_threads.length > 0
          ? draftData.clarification_threads
          : latestVer?.clarification_threads || null;
      if (clar && clar.length > 0) {
        setClarificationThreads(clar);
      }

      if (draftData?.status) {
        setPlanningWorkflowStatus(draftData.status);
      } else if (latestVer?.status) {
        setPlanningWorkflowStatus(latestVer.status);
      }

      // 2. Local storage fallback if offline
      if (!updated && storageDraftKey) {
        try {
          const raw = localStorage.getItem(storageDraftKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.stageThreads && Object.keys(parsed.stageThreads).length > 0) {
              setStageThreads(parsed.stageThreads);
              updated = true;
            }
          }
        } catch {}
      }

      showToast('Discussion threads synchronized from server.');
    } catch {
      showToast('Could not synchronize discussion from server.');
    } finally {
      setIsRefreshingThreads(false);
    }
  };

  const handleProceedNextSection = async () => {
    if (isClient) {
      if (currentStage < 8) {
        setCurrentStage((prev) => prev + 1);
      }
      return;
    }
    // For Ops: automatically preserve draft and sync to backend database when moving to next stage
    try {
      const updatedSaved = { ...stageDraftSaved, [currentStage]: true };
      setStageDraftSaved(updatedSaved);
      setIsCurrentStageDirty(false);
      await syncToBackend(stageThreads, clarificationThreads, formData, planningWorkflowStatus, updatedSaved);
    } catch {}
    if (currentStage < 8) {
      setCurrentStage((prev) => prev + 1);
      setIsCurrentStageDirty(false);
    }
  };

  // ── Universal Post Review Handler for any Stage ──
  const handlePostReview = async (stageNum: number) => {
    if (isClosed) {
      showToast('This stage is closed. Remarks are permanently sealed and cannot be added from either side.');
      return;
    }
    if (isPilot) {
      showToast('Drone pilots have view-only access to planning. Posting remarks is restricted.');
      return;
    }
    const text = stageDraftTexts[stageNum]?.trim();
    if (!text) return;

    // Determine author name and role badge
    const authorName =
      role === 'client'
        ? (user?.full_name || (isSubordinate ? 'Appointed Subordinate' : (activeProject?.client_name || propClientCompany || 'Client Organization')))
        : (user?.full_name || 'Admin (LATRICS Ops)');

    const authorRoleTag: 'admin' | 'ops' | 'client' | 'subordinate' =
      role === 'client'
        ? (isSubordinate ? 'subordinate' : 'client')
        : 'admin';

    const newMsg: ThreadMessage = {
      id: `msg-${stageNum}-${Date.now()}`,
      author: authorName,
      role: role === 'client' ? 'CLIENT' : 'LATRICS',
      authorRole: authorRoleTag,
      timestamp: new Date().toISOString(),
      content: text,
      attachment: stageAttachedFiles[stageNum]
        ? { name: stageAttachedFiles[stageNum]!, size: 'Uploaded Document' }
        : undefined,
    };

    const updatedThreads = {
      ...stageThreads,
      [stageNum]: [...(stageThreads[stageNum] || []), newMsg],
    };

    setStageThreads(updatedThreads);
    setStageDraftTexts((prev) => ({ ...prev, [stageNum]: '' }));
    setStageAttachedFiles((prev) => ({ ...prev, [stageNum]: null }));
    setStageAddingRemark((prev) => ({ ...prev, [stageNum]: false }));
    setIsCurrentStageDirty(true);
    setStageDraftSaved((prev) => ({ ...prev, [stageNum]: false }));

    try {
      const payloadToSave = {
        formData,
        stageThreads: updatedThreads,
        clarificationThreads,
        stageDraftSaved,
        planningWorkflowStatus,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(storageDraftKey, JSON.stringify(payloadToSave));
      if (activeProject?.id) {
        localStorage.setItem(`latrics_planning_draft_${activeProject.id}`, JSON.stringify(payloadToSave));
      }
    } catch {}

    // Persist immediately to backend so Client / Ops / Subordinate can trace remarks in real-time
    await syncToBackend(updatedThreads, clarificationThreads, formData, planningWorkflowStatus);
    showToast(
      isSubordinate
        ? `Subordinate remark added to Stage ${stageNum} thread.`
        : role === 'client'
        ? `Response added to Stage ${stageNum} thread.`
        : `Remark added to Stage ${stageNum} discussion thread.`
    );
  };

  // Reply handler inside any discussion thread
  const handleReplyToMessage = async (stageNum: number, parentMessageId: string) => {
    if (isClosed) {
      showToast('This stage is closed. Remarks are permanently sealed and cannot be added from either side.');
      return;
    }
    if (isPilot) {
      showToast('Drone pilots have view-only access to planning. Posting replies is restricted.');
      return;
    }
    const replyText = threadReplyInputs[parentMessageId]?.trim();
    const replyFile = threadReplyAttachments[parentMessageId] || null;
    if (!replyText && !replyFile) return;

    const parentMsg = (stageThreads[stageNum] || []).find((m) => m.id === parentMessageId);
    const authorName =
      role === 'client'
        ? (user?.full_name || (isSubordinate ? 'Appointed Subordinate' : (activeProject?.client_name || propClientCompany || 'Client Organization')))
        : (user?.full_name || 'Admin (LATRICS Ops)');

    const authorRoleTag: 'admin' | 'ops' | 'client' | 'subordinate' =
      role === 'client'
        ? (isSubordinate ? 'subordinate' : 'client')
        : 'admin';

    const newMsg: ThreadMessage = {
      id: `reply-${stageNum}-${Date.now()}`,
      author: authorName,
      role: role === 'client' ? 'CLIENT' : 'LATRICS',
      authorRole: authorRoleTag,
      timestamp: new Date().toISOString(),
      content: replyText || 'Supporting attachment uploaded.',
      attachment: replyFile ? { name: replyFile, size: 'Uploaded Document' } : undefined,
      replyTo: parentMsg
        ? {
            id: parentMsg.id,
            author: parentMsg.author,
            content: parentMsg.content.length > 80 ? `${parentMsg.content.slice(0, 80)}...` : parentMsg.content,
          }
        : undefined,
    };

    const updatedThreads = {
      ...stageThreads,
      [stageNum]: [...(stageThreads[stageNum] || []), newMsg],
    };

    setStageThreads(updatedThreads);
    setThreadReplyInputs((prev) => ({ ...prev, [parentMessageId]: '' }));
    setThreadReplyAttachments((prev) => ({ ...prev, [parentMessageId]: null }));
    setActiveReplyBoxId(null);
    setIsCurrentStageDirty(true);
    setStageDraftSaved((prev) => ({ ...prev, [stageNum]: false }));

    try {
      const payloadToSave = {
        formData,
        stageThreads: updatedThreads,
        clarificationThreads,
        stageDraftSaved,
        planningWorkflowStatus,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(storageDraftKey, JSON.stringify(payloadToSave));
      if (activeProject?.id) {
        localStorage.setItem(`latrics_planning_draft_${activeProject.id}`, JSON.stringify(payloadToSave));
      }
    } catch {}

    // Persist immediately to backend so Client / Subordinate / Ops can trace replies in real-time
    await syncToBackend(updatedThreads, clarificationThreads, formData, planningWorkflowStatus);
    showToast(`Reply posted to Stage ${stageNum} thread.`);
  };

  // Clarification reply (Stage 3)
  const handleReplyClarification = async (threadId: string) => {
    if (isClosed) {
      showToast('This stage is closed. Remarks are permanently sealed and cannot be added from either side.');
      return;
    }
    const text = clarificationReplies[threadId]?.trim();
    if (!text) return;

    const authorName =
      role === 'client'
        ? (user?.full_name || (isSubordinate ? 'Appointed Subordinate' : (activeProject?.client_name || propClientCompany || 'Client Organization')))
        : (user?.full_name || 'Admin (LATRICS Ops)');

    const authorRoleTag: 'admin' | 'ops' | 'client' | 'subordinate' =
      role === 'client'
        ? (isSubordinate ? 'subordinate' : 'client')
        : 'admin';

    const updatedClarifications = clarificationThreads.map((thread) => {
      if (thread.id === threadId) {
        const newMsg: ThreadMessage = {
          id: `c-${Date.now()}`,
          author: authorName,
          role: role === 'client' ? 'CLIENT' : 'LATRICS',
          authorRole: authorRoleTag,
          timestamp: new Date().toISOString(),
          content: text,
        };
        return { ...thread, messages: [...thread.messages, newMsg] };
      }
      return thread;
    });

    setClarificationThreads(updatedClarifications);
    setClarificationReplies((prev) => ({ ...prev, [threadId]: '' }));
    setIsCurrentStageDirty(true);
    setStageDraftSaved((prev) => ({ ...prev, [3]: false }));

    // Persist immediately to backend so Client / Ops can trace clarification responses in real-time
    await syncToBackend(stageThreads, updatedClarifications, formData, planningWorkflowStatus);
    showToast('Clarification reply recorded.');
  };

  // ── Requirement 1: Stage 8 Option selection triggers full preview popup (LATRICS Ops only) ──
  const handleSelectFeasibilityOption = (option: 'yes' | 'no' | 'need_clarity') => {
    if (isClient) return;
    updateField('feasibilityDecision', option);
    setIsPreviewModalOpen(true);
  };

  const handleConfirmFinalSubmit = async () => {
    if (!formData.reviewConfirmed) return;
    setIsPreviewModalOpen(false);
    setIsSubmittedSuccess(true);

    let nextStatus = 'under_review';
    if (formData.feasibilityDecision === 'need_clarity') {
      nextStatus = 'awaiting_clarity';
    } else if (formData.feasibilityDecision === 'yes') {
      nextStatus = 'feasible_pending_client_confirmation';
    } else if (formData.feasibilityDecision === 'no') {
      nextStatus = 'not_feasible';
    }

    setPlanningWorkflowStatus(nextStatus);

    let updatedThreads = stageThreads;
    if (formData.decisionRemarks?.trim()) {
      const alreadyInThread = (stageThreads[8] || []).some(
        (m) => m.content.trim() === formData.decisionRemarks.trim()
      );
      if (!alreadyInThread) {
        const opsMsg: ThreadMessage = {
          id: `ops-decision-${Date.now()}`,
          author: user?.full_name || 'Admin (LATRICS Ops)',
          role: 'LATRICS',
          timestamp: new Date().toISOString(),
          content: formData.decisionRemarks.trim(),
        };
        updatedThreads = {
          ...stageThreads,
          [8]: [...(stageThreads[8] || []), opsMsg],
        };
        setStageThreads(updatedThreads);
      }
    }

    try {
      const targetProjId = activeProject?.id || propProjectId || activeRequest?.project_id;
      if (targetProjId) {
        const newVer = await planningApi.createPlanningVersion(targetProjId, {
          sender: 'ops',
          sender_name: user?.full_name || 'Admin (LATRICS Ops)',
          form_data: formData,
          stage_threads: updatedThreads,
          clarification_threads: clarificationThreads,
          status: nextStatus,
        });
        setActiveVersionCode(newVer.version_code);
        setLatestSender(newVer.sender);
        setPlanningVersions((prev) => [newVer, ...prev]);
        await syncToBackend(updatedThreads, clarificationThreads, formData, nextStatus, { ...stageDraftSaved, 8: true });
        showToast(
          nextStatus === 'awaiting_clarity'
            ? 'Clarification request dispatched to Client with your remarks.'
            : nextStatus === 'feasible_pending_client_confirmation'
            ? 'Plan marked as Feasible! Sent to Client for agreement sign-off.'
            : 'Operational plan marked as Not Feasible.'
        );
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to submit planning form.');
    }
  };

  // ── Client Actions: Clarification Submission & Mobilization Sign-off ──
  const handleSubmitClarificationsToOps = async () => {
    if (isClient && isNotFeasible) {
      showToast('Project is marked Not Feasible. Submission is locked.');
      return;
    }
    const nextStatus = 'clarification_submitted';
    setPlanningWorkflowStatus(nextStatus);
    try {
      const targetProjId = activeProject?.id || propProjectId || activeRequest?.project_id;
      if (targetProjId) {
        const authorName = user?.full_name || activeProject?.client_name || propClientCompany || 'Client Organization';
        const newVer = await planningApi.createPlanningVersion(targetProjId, {
          sender: 'client',
          sender_name: authorName,
          form_data: formData,
          stage_threads: stageThreads,
          clarification_threads: clarificationThreads,
          status: nextStatus,
        });
        setActiveVersionCode(newVer.version_code);
        setLatestSender(newVer.sender);
        setPlanningVersions((prev) => [newVer, ...prev]);
        await syncToBackend(stageThreads, clarificationThreads, formData, nextStatus);
        showToast('Clarifications submitted successfully to LATRICS Ops!');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to submit clarifications.');
    }
  };

  const handleOpsResumePlanning = async () => {
    const nextStatus = 'awaiting_clarity';
    setPlanningWorkflowStatus(nextStatus);
    const updatedFormData: PlanningFormData = {
      ...formData,
      feasibilityDecision: 'need_clarity',
      reviewConfirmed: true,
    };
    setFormData(updatedFormData);

    try {
      const payloadToSave = {
        formData: updatedFormData,
        stageThreads,
        clarificationThreads,
        stageDraftSaved: { ...stageDraftSaved, 8: true },
        planningWorkflowStatus: nextStatus,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(storageDraftKey, JSON.stringify(payloadToSave));
      if (activeProject?.id) {
        localStorage.setItem(`latrics_planning_draft_${activeProject.id}`, JSON.stringify(payloadToSave));
      }

      const targetProjId = activeProject?.id || propProjectId || activeRequest?.project_id;
      if (targetProjId) {
        const newVer = await planningApi.createPlanningVersion(targetProjId, {
          sender: 'ops',
          sender_name: user?.full_name || 'Admin (LATRICS Ops)',
          form_data: updatedFormData,
          stage_threads: stageThreads,
          clarification_threads: clarificationThreads,
          status: nextStatus,
        });
        setActiveVersionCode(newVer.version_code);
        setLatestSender(newVer.sender);
        setPlanningVersions((prev) => [newVer, ...prev]);
        if (activeProject) {
          setActiveProject((prev: any) => (prev ? { ...prev, status: 'planning' } : prev));
        }
      }
    } catch (e) {
      console.error(e);
    }
    showToast('Planning resumed with "Need More Clarity". Client can now respond.');
  };

  const handleConfirmClientDeclaration = async () => {
    if (isClient && isNotFeasible) {
      showToast('Project is marked Not Feasible. Mobilization declaration is locked.');
      return;
    }
    if (!clientDeclarationConfirmed) return;
    setIsMobilizingTransitioning(true);
    try {
      const nextStatus = 'mobilising';
      setPlanningWorkflowStatus(nextStatus);

      const payloadToSave = {
        formData,
        stageThreads,
        clarificationThreads,
        stageDraftSaved,
        planningWorkflowStatus: nextStatus,
        declarationConfirmedAt: new Date().toISOString(),
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(storageDraftKey, JSON.stringify(payloadToSave));
      if (activeProject?.id) {
        localStorage.setItem(`latrics_planning_draft_${activeProject.id}`, JSON.stringify(payloadToSave));
      }

      let targetProjId =
        activeProject?.id ||
        activeRequest?.project_id ||
        (propProjectId && propProjectId.length > 20 ? propProjectId : null);
      if (!targetProjId) {
        try {
          const reqs = await requestApi.listAllRequests();
          const searchKey = (propRequestId || propProjectId || '').replace(/^#/, '').trim().toLowerCase();
          const found =
            reqs.find((r) => {
              if (r.id && r.id.toLowerCase() === searchKey) return true;
              if (r.project_id && r.project_id.toLowerCase() === searchKey) return true;
              if (String(r.version) === searchKey) return true;
              if (String(r.version).padStart(3, '0') === searchKey.padStart(3, '0')) return true;
              return false;
            }) || reqs[0];
          if (found?.project_id) {
            targetProjId = found.project_id;
          }
        } catch {}
      }

      if (targetProjId) {
        await planningApi.createPlanningVersion(targetProjId, {
          sender: 'client',
          sender_name: activeProject?.client_name || propClientCompany || user?.full_name || 'Client',
          form_data: formData,
          stage_threads: stageThreads,
          clarification_threads: clarificationThreads,
          status: 'mobilising',
        });
        await projectApi.updateProject(targetProjId, { status: 'approved' as any }).catch(() => {});
      }

      showToast('Agreement confirmed! Project is advancing to Mobilizing Phase.');
      setTimeout(() => {
        if (targetProjId) {
          router.push(`/projects/${targetProjId}/overview`);
        } else {
          router.push('/projects');
        }
      }, 1200);
    } catch (err: any) {
      showToast(err.message || 'Failed to confirm mobilization agreement.');
    } finally {
      setIsMobilizingTransitioning(false);
    }
  };

  const stages = useMemo(() => {
    const allStages = [
      { num: 1, title: 'KML Findings' },
      { num: 2, title: 'Regularity and Airspace' },
      { num: 3, title: 'Accessibility and Feasibility' },
      { num: 4, title: 'Obstacles and Hazards' },
      { num: 5, title: 'GCP Planning' },
      { num: 6, title: 'Flight Planning' },
      { num: 7, title: 'Expected Timelines' },
      { num: 8, title: 'Feasible to Proceed' },
    ];
    return allStages;
  }, []);

  const isCurrentStageSaved = stageDraftSaved[currentStage] && !isCurrentStageDirty;

  // ── Reusable Component: Stage Review, Attachment, and Discussion Thread ──
  const renderStageReviewSection = (stageNum: number, stageName: string) => {
    const threads = stageThreads[stageNum] || [];
    const draftText = stageDraftTexts[stageNum] || '';
    const attachedFile = stageAttachedFiles[stageNum] || null;
    const isComposing = !!stageAddingRemark[stageNum] || !!draftText.trim() || !!attachedFile;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          borderTop: '1px solid #e4e4e7',
          paddingTop: '1.25rem',
        }}
      >
        {/* ── Section Header matching User Screenshot ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'nowrap',
            gap: '0.75rem',
            paddingBottom: '0.85rem',
            borderBottom: '1px solid #f4f4f5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#f4f4f5',
                border: '1px solid #d4d4d8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#09090b',
                flexShrink: 0,
              }}
            >
              <MessageSquare size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b', lineHeight: 1.2 }}>
                Discussion Thread
              </div>
              <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '2px' }}>
                All remarks, questions and responses for this section. Each message is immutable.
              </div>
            </div>
          </div>

          {/* Top Right Action Button: toggles between '+ Add Remark' and solid 'Post' */}
          {isPilot ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.725rem',
                color: '#71717a',
                backgroundColor: '#f4f4f5',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid #e4e4e7',
                fontWeight: 600,
              }}
            >
              <Lock size={12} /> Read-Only for Pilots
            </span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
              <button
                type="button"
                onClick={handleRefreshThreadsFromServer}
                disabled={isRefreshingThreads}
                title="Synchronize latest discussion and remarks from backend"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  height: '34px',
                  padding: '0 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  color: '#09090b',
                  border: '1px solid #d4d4d8',
                  borderRadius: '6px',
                  cursor: isRefreshingThreads ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <RefreshCw size={13} className={isRefreshingThreads ? 'animate-spin' : ''} />
                <span>Sync</span>
              </button>
              {!isClosed && (
                isComposing ? (
                  <button
                    type="button"
                    onClick={() => handlePostReview(stageNum)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '34px',
                      padding: '0 1.25rem',
                      fontSize: '0.775rem',
                      fontWeight: 700,
                      backgroundColor: '#09090b',
                      color: '#ffffff',
                      border: '1px solid #09090b',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Post
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStageAddingRemark((prev) => ({ ...prev, [stageNum]: true }))}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      height: '34px',
                      padding: '0 0.95rem',
                      fontSize: '0.775rem',
                      fontWeight: 600,
                      backgroundColor: '#ffffff',
                      color: '#09090b',
                      border: '1px solid #d4d4d8',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    + Add Remark
                  </button>
                )
              )}
            </div>
          )}

          {isClosed && (
            <div style={{ flexShrink: 0 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  height: '32px',
                  padding: '0 0.75rem',
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  backgroundColor: '#f4f4f5',
                  color: '#52525b',
                  border: '1px solid #d4d4d8',
                  borderRadius: '6px',
                }}
              >
                <Lock size={12} /> Stage Closed (Locked)
              </span>
            </div>
          )}
        </div>

        {/* Closed warning if stage is closed */}
        {isClosed && (
          <div
            style={{
              padding: '0.85rem 1.15rem',
              backgroundColor: '#f4f4f5',
              border: '1px solid #e4e4e7',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: '#71717a',
            }}
          >
            <Lock size={16} color="#09090b" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.775rem', lineHeight: 1.45 }}>
              <strong style={{ color: '#09090b', display: 'block', marginBottom: '0.1rem' }}>
                Stage Concluded — Discussion Closed
              </strong>
              This stage has concluded. Remarks and discussion threads are permanently sealed as immutable audit records and cannot be added or modified from either side.
            </div>
          </div>
        )}

        {/* ── Vertical Timeline List with Connecting Line & Avatars ── */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {threads.length === 0 && !isComposing ? (
            <div
              style={{
                padding: '1.25rem 1.25rem',
                textAlign: 'center',
                backgroundColor: '#fafafa',
                border: '1px dashed #e4e4e7',
                borderRadius: '8px',
                color: '#71717a',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span>No remarks or clarifications recorded yet for {stageName}.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {threads.map((msg, idx) => {
                const isLatrics = msg.role === 'LATRICS' || msg.author.toLowerCase().includes('admin');
                const msgRoleTag = msg.authorRole || (isLatrics ? 'admin' : (msg.author.toLowerCase().includes('subordinate') ? 'subordinate' : 'client'));
                const isSubTag = msgRoleTag === 'subordinate';
                const isLast = idx === threads.length - 1;
                const showBottomLine = !isLast || isComposing;
                const isReplying = activeReplyBoxId === msg.id;

                return (
                  <div key={msg.id} style={{ display: 'flex', position: 'relative', gap: '1rem', paddingBottom: '1.25rem' }}>
                    {/* Left Column: Avatar and Vertical Connector Line */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '28px', flexShrink: 0, position: 'relative' }}>
                      {/* Avatar Circle */}
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: isLatrics ? '#09090b' : (isSubTag ? '#09090b' : '#3f3f46'),
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          flexShrink: 0,
                          zIndex: 2,
                        }}
                      >
                        {isLatrics ? 'A' : (isSubTag ? 'S' : 'C')}
                      </div>

                      {/* Continuous Connector Line */}
                      {showBottomLine && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '28px',
                            bottom: '-1.25rem',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '2px',
                            backgroundColor: '#e4e4e7',
                            zIndex: 1,
                          }}
                        />
                      )}
                    </div>

                    {/* Right Column: Message Card */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0 }}>
                      {/* Author Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#09090b' }}>
                            {msg.author}
                          </span>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              padding: '0.1rem 0.45rem',
                              borderRadius: '4px',
                              backgroundColor: isSubTag ? '#f4f4f5' : (isLatrics ? '#f4f4f5' : '#f4f4f5'),
                              color: isSubTag ? '#27272a' : (isLatrics ? '#3f3f46' : '#09090b'),
                              textTransform: 'lowercase',
                              border: `1px solid ${isSubTag ? '#d4d4d8' : (isLatrics ? '#e4e4e7' : '#d4d4d8')}`,
                            }}
                          >
                            {msgRoleTag}
                          </span>
                          <span style={{ fontSize: '0.725rem', color: '#52525b' }}>
                            • {formatMessageStamp(msg)}
                          </span>
                        </div>

                        {/* Visible Reply Button */}
                        {!isClosed && !isPilot && (
                          <button
                            type="button"
                            onClick={() => setActiveReplyBoxId(activeReplyBoxId === msg.id ? null : msg.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              backgroundColor: activeReplyBoxId === msg.id ? '#09090b' : '#ffffff',
                              color: activeReplyBoxId === msg.id ? '#ffffff' : '#09090b',
                              border: '1px solid #d4d4d8',
                              borderRadius: '4px',
                              padding: '0.2rem 0.6rem',
                              fontSize: '0.725rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            title="Reply to this remark"
                          >
                            <CornerDownRight size={11} />
                            <span>{activeReplyBoxId === msg.id ? 'Replying...' : 'Reply'}</span>
                          </button>
                        )}
                      </div>

                      {/* Quoted Reply Reference */}
                      {msg.replyTo && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '4px',
                            backgroundColor: '#f4f4f5',
                            borderLeft: '3px solid #09090b',
                            fontSize: '0.72rem',
                            color: '#52525b',
                            marginBottom: '0.2rem',
                          }}
                        >
                          <CornerDownRight size={11} color="#09090b" />
                          <span>
                            Replying to <strong>{msg.replyTo.author}</strong>: &ldquo;{msg.replyTo.content}&rdquo;
                          </span>
                        </div>
                      )}

                      {/* Message Content */}
                      <p style={{ fontSize: '0.825rem', color: '#27272a', lineHeight: 1.5, margin: 0, wordBreak: 'break-word' }}>
                        {msg.content}
                      </p>

                      {/* Downloadable Attachment Card matching Screenshot */}
                      {msg.attachment && (
                        <div
                          onClick={() => {
                            const blob = new Blob([`Aerostake Survey Attachment: ${msg.attachment?.name}\nAuthor: ${msg.author}\nTimestamp: ${formatMessageStamp(msg)}`], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = msg.attachment?.name || 'attachment.txt';
                            a.click();
                            URL.revokeObjectURL(url);
                            showToast(`Downloaded ${msg.attachment?.name}`);
                          }}
                          title="Click to download attachment"
                          style={{
                            marginTop: '0.4rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1.25rem',
                            padding: '0.5rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #e4e4e7',
                            backgroundColor: '#fafafa',
                            cursor: 'pointer',
                            width: 'fit-content',
                            maxWidth: '100%',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#d4d4d8';
                            e.currentTarget.style.backgroundColor = '#f4f4f5';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#e4e4e7';
                            e.currentTarget.style.backgroundColor = '#fafafa';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                            <FileText size={16} color="#09090b" style={{ flexShrink: 0 }} />
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                              <span style={{ fontSize: '0.775rem', fontWeight: 600, color: '#09090b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {msg.attachment.name}
                              </span>
                              <span style={{ fontSize: '0.675rem', color: '#52525b' }}>
                                {msg.attachment.size}
                              </span>
                            </div>
                          </div>
                          <Download size={14} color="#52525b" style={{ flexShrink: 0 }} />
                        </div>
                      )}

                      {/* Inline Reply Composer if toggled */}
                      {isReplying && !isClosed && (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.45rem',
                            marginTop: '0.5rem',
                            backgroundColor: '#fafafa',
                            border: '1px solid #d4d4d8',
                            borderRadius: '6px',
                            padding: '0.75rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#09090b', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <CornerDownRight size={12} />
                              <span>Replying to {msg.author}</span>
                            </span>
                            <span style={{ fontSize: '0.675rem', color: '#71717a' }}>{msg.role === 'LATRICS' ? 'Operations Remark' : 'Client Remark'}</span>
                          </div>
                          <textarea
                            rows={2}
                            value={threadReplyInputs[msg.id] || ''}
                            onChange={(e) =>
                              setThreadReplyInputs((prev) => ({
                                ...prev,
                                [msg.id]: e.target.value,
                              }))
                            }
                            placeholder={
                              role === 'client'
                                ? (isSubordinate
                                    ? 'Provide subordinate clarification or coordination response...'
                                    : 'Provide clarification response regarding this remark...')
                                : 'Provide follow-up question or clarification note...'
                            }
                            style={{
                              width: '100%',
                              padding: '0.55rem',
                              fontSize: '0.775rem',
                              border: '1px solid #d4d4d8',
                              borderRadius: '4px',
                              backgroundColor: '#ffffff',
                              fontFamily: 'inherit',
                              resize: 'vertical',
                              outline: 'none',
                            }}
                          />

                          {threadReplyAttachments[msg.id] && (
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.2rem 0.5rem',
                                backgroundColor: '#ffffff',
                                border: '1px solid #09090b',
                                borderRadius: '4px',
                                fontSize: '0.725rem',
                                fontWeight: 600,
                                width: 'fit-content',
                              }}
                            >
                              <Paperclip size={12} />
                              <span>{threadReplyAttachments[msg.id]}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setThreadReplyAttachments((prev) => ({
                                    ...prev,
                                    [msg.id]: null,
                                  }))
                                }
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <label
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                background: '#ffffff',
                                border: '1px solid #d4d4d8',
                                borderRadius: '4px',
                                padding: '0.25rem 0.55rem',
                                fontSize: '0.725rem',
                                fontWeight: 600,
                                color: '#09090b',
                                cursor: 'pointer',
                              }}
                            >
                              <span>Attach Document</span>
                              <input
                                type="file"
                                accept=".pdf,.kml,.kmz,.zip,.jpg,.jpeg,.png,.doc,.docx"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setThreadReplyAttachments((prev) => ({
                                      ...prev,
                                      [msg.id]: file.name,
                                    }));
                                  }
                                }}
                              />
                            </label>

                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button
                                type="button"
                                onClick={() => setActiveReplyBoxId(null)}
                                style={{
                                  height: '28px',
                                  padding: '0 0.75rem',
                                  fontSize: '0.725rem',
                                  fontWeight: 600,
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #d4d4d8',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >
                                Cancel
                              </button>

                                <button
                                  type="button"
                                  onClick={() => handleReplyToMessage(stageNum, msg.id)}
                                  style={{
                                    height: '28px',
                                    padding: '0 0.85rem',
                                    fontSize: '0.725rem',
                                    fontWeight: 700,
                                    backgroundColor: '#09090b',
                                    color: '#ffffff',
                                    border: '1px solid #09090b',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Post Reply
                                </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Rich Composer matching User Screenshot ── */}
          {isComposing && !isClosed && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: threads.length > 0 ? '0.25rem' : '0' }}>
              {/* Left Column: Avatar for current user */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '28px', flexShrink: 0 }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: role === 'client' ? (isSubordinate ? '#09090b' : '#3f3f46') : '#09090b',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {role === 'client' ? (isSubordinate ? 'S' : 'C') : 'A'}
                </div>
              </div>

              {/* Right Column: Composer Card */}
              <div
                style={{
                  flex: 1,
                  borderRadius: '8px',
                  border: '1px solid #d4d4d8',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Toolbar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.4rem 0.65rem',
                    backgroundColor: '#fafafa',
                    borderBottom: '1px solid #e4e4e7',
                  }}
                >
                  {/* Formatting Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <button
                      type="button"
                      onClick={() =>
                        setStageDraftTexts((prev) => ({
                          ...prev,
                          [stageNum]: prev[stageNum] ? `**${prev[stageNum]}**` : '**bold text**',
                        }))
                      }
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '3px 5px',
                        color: '#27272a',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        borderRadius: '3px',
                      }}
                      title="Bold"
                    >
                      <Bold size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setStageDraftTexts((prev) => ({
                          ...prev,
                          [stageNum]: prev[stageNum] ? `*${prev[stageNum]}*` : '*italic text*',
                        }))
                      }
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '3px 5px',
                        color: '#27272a',
                        borderRadius: '3px',
                      }}
                      title="Italic"
                    >
                      <Italic size={13} />
                    </button>
                    <span style={{ color: '#d4d4d8', margin: '0 2px' }}>|</span>
                    <button
                      type="button"
                      onClick={() =>
                        setStageDraftTexts((prev) => ({
                          ...prev,
                          [stageNum]: (prev[stageNum] ? `${prev[stageNum]}\n` : '') + '• ',
                        }))
                      }
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '3px 5px',
                        color: '#27272a',
                        borderRadius: '3px',
                      }}
                      title="Bullet list"
                    >
                      <List size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setStageDraftTexts((prev) => ({
                          ...prev,
                          [stageNum]: (prev[stageNum] ? `${prev[stageNum]}\n` : '') + '1. ',
                        }))
                      }
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '3px 5px',
                        color: '#27272a',
                        borderRadius: '3px',
                      }}
                      title="Numbered list"
                    >
                      <ListOrdered size={13} />
                    </button>
                    <span style={{ color: '#d4d4d8', margin: '0 2px' }}>|</span>
                    <button
                      type="button"
                      onClick={() =>
                        setStageDraftTexts((prev) => ({
                          ...prev,
                          [stageNum]: (prev[stageNum] ? `${prev[stageNum]} ` : '') + '[link](url)',
                        }))
                      }
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '3px 5px',
                        color: '#27272a',
                        borderRadius: '3px',
                      }}
                      title="Insert link"
                    >
                      <LinkIcon size={13} />
                    </button>
                  </div>

                  {/* Attach File Option at Right of Toolbar */}
                  <div>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        cursor: 'pointer',
                        fontSize: '0.725rem',
                        fontWeight: 600,
                        color: '#09090b',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        border: '1px solid #d4d4d8',
                        backgroundColor: '#ffffff',
                        transition: 'all 0.15s ease',
                      }}
                      title="Attach file (PDF, KML, ZIP, Images)"
                    >
                      <Paperclip size={12} color="#09090b" />
                      <span>Attach File</span>
                      <input
                        type="file"
                        accept=".pdf,.kml,.kmz,.zip,.jpg,.jpeg,.png,.doc,.docx"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setStageAttachedFiles((prev) => ({
                              ...prev,
                              [stageNum]: file.name,
                            }));
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  rows={3}
                  value={draftText}
                  onChange={(e) =>
                    setStageDraftTexts((prev) => ({
                      ...prev,
                      [stageNum]: e.target.value,
                    }))
                  }
                  placeholder={
                    role === 'client'
                      ? (isSubordinate
                          ? 'Add subordinate remarks, site coordination notes, or flight questions...'
                          : 'Add client remarks, questions, or clarification notes for this section...')
                      : 'Record section remarks or survey feasibility review notes...'
                  }
                  style={{
                    width: '100%',
                    minHeight: '85px',
                    padding: '0.75rem',
                    border: 'none',
                    outline: 'none',
                    fontSize: '0.8rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    backgroundColor: '#ffffff',
                    color: '#09090b',
                    lineHeight: 1.45,
                  }}
                />

                {/* Attached file chip */}
                {attachedFile && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.35rem 0.75rem',
                      backgroundColor: '#f4f4f5',
                      borderTop: '1px solid #e4e4e7',
                      fontSize: '0.725rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#09090b', fontWeight: 600 }}>
                      <Paperclip size={12} color="#52525b" />
                      <span>Attached: <strong>{attachedFile}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setStageAttachedFiles((prev) => ({
                          ...prev,
                          [stageNum]: null,
                        }))
                      }
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#71717a',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                      }}
                    >
                      <X size={12} />
                      <span>Remove</span>
                    </button>
                  </div>
                )}

                {/* Bottom Bar: Character Count and Action Buttons */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.4rem 0.75rem',
                    backgroundColor: '#ffffff',
                    borderTop: '1px solid #f4f4f5',
                  }}
                >
                  <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
                    {draftText.length}/1000
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setStageAddingRemark((prev) => ({ ...prev, [stageNum]: false }));
                        setStageDraftTexts((prev) => ({ ...prev, [stageNum]: '' }));
                        setStageAttachedFiles((prev) => ({ ...prev, [stageNum]: null }));
                      }}
                      style={{
                        height: '28px',
                        padding: '0 0.75rem',
                        fontSize: '0.725rem',
                        fontWeight: 600,
                        backgroundColor: '#ffffff',
                        border: '1px solid #d4d4d8',
                        color: '#3f3f46',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePostReview(stageNum)}
                      style={{
                        height: '28px',
                        padding: '0 0.95rem',
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        backgroundColor: '#09090b',
                        color: '#ffffff',
                        border: '1px solid #09090b',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Post Remark
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: '#09090b',
            color: '#ffffff',
            padding: '0.75rem 1.25rem',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Top Header & Breadcrumb ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {role !== 'client' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: '#71717a' }}>
              <Link href="/requests" style={{ color: '#71717a', textDecoration: 'none' }}>
                Requests
              </Link>
              <ChevronRight size={14} color="#a1a1aa" />
              <span>{displayClientCompany}</span>
              <ChevronRight size={14} color="#a1a1aa" />
              <Link
                href={activeRequest ? `/requests/${activeRequest.id}` : '/requests'}
                style={{ color: '#71717a', textDecoration: 'none' }}
              >
                {displayProjectName}
              </Link>
              <ChevronRight size={14} color="#a1a1aa" />
              <strong style={{ color: '#09090b' }}>Planning</strong>
            </div>
          </div>
        )}

        {/* Page Title & Top Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid #e4e4e7',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#09090b', margin: 0 }}>
                {role === 'client' ? `Plan Review — ${displayProjectName}` : `Planning for ${displayProjectName}`}
              </h1>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.65rem',
                  borderRadius: '4px',
                  border: '1px solid #d4d4d8',
                  backgroundColor: '#f4f4f5',
                  color: '#09090b',
                }}
              >
                {planningWorkflowStatus === 'awaiting_clarity'
                  ? 'Clarification Requested'
                  : planningWorkflowStatus === 'clarification_submitted'
                  ? 'Clarifications Submitted'
                  : planningWorkflowStatus === 'feasible_pending_client_confirmation'
                  ? 'Feasible — Awaiting Confirmation'
                  : planningWorkflowStatus === 'mobilising'
                  ? 'Mobilizing'
                  : displayStatus}
              </span>

              {activeVersionCode && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.65rem',
                    borderRadius: '4px',
                    border: '1px solid #18181b',
                    backgroundColor: '#18181b',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span>{activeVersionCode}</span>
                  {latestSender && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        padding: '0.05rem 0.35rem',
                        borderRadius: '3px',
                        backgroundColor: latestSender === 'client' ? '#18181b' : '#52525b',
                        color: '#ffffff',
                        fontWeight: 700,
                      }}
                    >
                      {latestSender === 'client' ? '[Client]' : '[LATRICS Ops]'}
                    </span>
                  )}
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.825rem', color: '#71717a', marginTop: '0.35rem' }}>
              Request <strong style={{ color: '#09090b' }}>{displayRequestId}</strong>
              <span style={{ margin: '0 0.5rem', color: '#d4d4d8' }}>|</span>
              <strong style={{ color: '#09090b' }}>{displayClientCompany}</strong>
              <span style={{ margin: '0 0.5rem', color: '#d4d4d8' }}>|</span>
              Submitted on {displaySubmittedDate}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* Information Hover Tooltip Icon (5th image info) - placed at the left of Request History button */}
            <div
              style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
              onMouseEnter={() => setShowInfoTooltip(true)}
              onMouseLeave={() => setShowInfoTooltip(false)}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  border: '1px solid #d4d4d8',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: '#09090b',
                  cursor: 'help',
                  userSelect: 'none',
                  transition: 'all 0.15s ease',
                }}
                title="Client Plan Review Mode Information"
              >
                ⓘ
              </div>

              {showInfoTooltip && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '360px',
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #09090b',
                    borderRadius: '8px',
                    padding: '1rem 1.15rem',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    zIndex: 100,
                    pointerEvents: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '4px',
                        backgroundColor: '#09090b',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '1px',
                      }}
                    >
                      <Lock size={14} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b', lineHeight: 1.3 }}>
                        Client Plan Review Mode — Parameters Sealed by LATRICS Ops
                      </span>
                      <p style={{ fontSize: '0.735rem', color: '#52525b', lineHeight: 1.45, margin: 0 }}>
                        Operational flight parameters across Sections 1–8 are strictly read-only. Once submitted, all remarks, attachments, and thread discussions are permanently sealed as immutable audit records and cannot be altered. To request parameter changes or clarifications, please post in the stage discussion threads below.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Request History Button: ALWAYS visible for audit & version inspection */}
            <button
              type="button"
              onClick={() => setHistoryModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                height: '36px',
                padding: '0 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                backgroundColor: '#ffffff',
                border: '1px solid #d4d4d8',
                borderRadius: '6px',
                color: '#09090b',
                cursor: 'pointer',
              }}
            >
              <History size={14} />
              <span>Request History ({planningVersions.length})</span>
            </button>

            {role === 'client' || isPilot || isClosed ? (
              <button
                onClick={() => router.push(`/projects/${propProjectId || activeProject?.id || ''}/overview`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  height: '36px',
                  padding: '0 1rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  border: '1px solid #d4d4d8',
                  borderRadius: '6px',
                  color: '#09090b',
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft size={14} />
                <span>Back to Overview</span>
              </button>
            ) : (
              <>
                <button
                  onClick={async () => {
                    if (role === 'ops' && !isClosed) {
                      try {
                        const payloadToSave = {
                          formData,
                          stageThreads,
                          clarificationThreads,
                          stageDraftSaved,
                          planningWorkflowStatus,
                          savedAt: new Date().toISOString(),
                        };
                        const targetProjId = activeProject?.id || propProjectId || activeRequest?.project_id;
                        if (storageDraftKey) {
                          localStorage.setItem(storageDraftKey, JSON.stringify(payloadToSave));
                        }
                        if (targetProjId) {
                          localStorage.setItem(`latrics_planning_draft_${targetProjId}`, JSON.stringify(payloadToSave));
                        }
                        if (activeProject?.id) {
                          localStorage.setItem(`latrics_planning_draft_${activeProject.id}`, JSON.stringify(payloadToSave));
                        }
                        await syncToBackend(stageThreads, clarificationThreads, formData, planningWorkflowStatus, stageDraftSaved);
                      } catch {}
                    }
                    const targetPath = activeRequest?.id
                      ? `/requests/${activeRequest.id}`
                      : propRequestId
                      ? `/requests/${propRequestId.replace('#', '')}`
                      : '/requests';
                    router.push(targetPath);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    height: '36px',
                    padding: '0 0.9rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    backgroundColor: '#ffffff',
                    border: '1px solid #d4d4d8',
                    borderRadius: '6px',
                    color: '#09090b',
                    cursor: 'pointer',
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Back to Request</span>
                </button>

                <button
                  onClick={handleSaveDraft}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    height: '36px',
                    padding: '0 1rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    backgroundColor: '#ffffff',
                    border: isCurrentStageSaved ? '1px solid #d4d4d8' : '1.5px solid #09090b',
                    borderRadius: '6px',
                    color: '#09090b',
                    cursor: 'pointer',
                  }}
                >
                  <Save size={14} />
                  <span>Save Draft</span>
                  {isCurrentStageSaved && <Check size={13} strokeWidth={3} />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Historical Version Alert Banner ── */}
      {isViewingHistorical && (
        <div
          style={{
            backgroundColor: '#f4f4f5',
            border: '1px solid #d4d4d8',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.825rem',
            color: '#09090b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} />
            <span>
              <strong>Historical Snapshot:</strong> You are reviewing <strong>{activeVersionCode}</strong> submitted by [<strong>{latestSender === 'client' ? 'Client' : 'LATRICS Ops'}</strong>]. This snapshot is read-only.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (planningVersions.length > 0) {
                const latest = planningVersions[0];
                setActiveVersionCode(latest.version_code);
                setLatestSender(latest.sender);
                if (latest.form_data) setFormData(latest.form_data);
                if (latest.stage_threads) setStageThreads(latest.stage_threads);
                if (latest.clarification_threads) setClarificationThreads(latest.clarification_threads);
                setIsViewingHistorical(false);
              }
            }}
            style={{
              padding: '0.3rem 0.75rem',
              backgroundColor: '#09090b',
              color: '#ffffff',
              borderRadius: '4px',
              border: 'none',
              fontSize: '0.775rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Return to Active Version
          </button>
        </div>
      )}

      {/* ── Request History Modal Dialog ── */}
      {historyModalOpen && (
        <Portal>
          <div
            className="viewport-modal-backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 99999,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
            }}
            onClick={() => setHistoryModalOpen(false)}
          >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>Request History</h2>
                <p style={{ fontSize: '0.775rem', color: '#71717a', marginTop: '0.2rem' }}>
                  Chronological timeline of all planning versions and updates for {displayProjectName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={18} color="#71717a" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {planningVersions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#71717a' }}>
                  <History size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.35, display: 'block' }} />
                  <div style={{ fontWeight: 800, color: '#09090b', marginBottom: '0.35rem', fontSize: '0.95rem' }}>
                    No Submitted Versions Recorded
                  </div>
                  <div style={{ fontSize: '0.785rem', color: '#71717a', maxWidth: '380px', margin: '0 auto', lineHeight: 1.5 }}>
                    Request history only counts and archives planning versions once they are formally submitted. Draft saves are preserved in the background and are not recorded as history versions.
                  </div>
                </div>
              ) : (
                planningVersions.map((ver, idx) => {
                const isCurrent = ver.version_code === activeVersionCode;
                const isClientVer = ver.sender === 'client';
                const createdDate = ver.created_at ? new Date(ver.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Initial';

                return (
                  <div
                    key={ver.id || idx}
                    style={{
                      border: isCurrent ? '1.5px solid #09090b' : '1px solid #e4e4e7',
                      borderRadius: '6px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: isCurrent ? '#f4f4f5' : '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
                          {ver.version_code || `Version ${ver.version_number}`}
                        </span>
                        <span
                          style={{
                            fontSize: '0.675rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.4rem',
                            borderRadius: '3px',
                            backgroundColor: isClientVer ? '#f4f4f5' : '#18181b',
                            color: isClientVer ? '#18181b' : '#ffffff',
                            border: `1px solid ${isClientVer ? '#d4d4d8' : '#27272a'}`,
                          }}
                        >
                          {isClientVer ? '[Client]' : '[LATRICS Ops]'}
                        </span>
                        {idx === 0 && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.05rem 0.35rem', borderRadius: '3px', backgroundColor: '#09090b', color: '#ffffff' }}>
                            Latest
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#71717a' }}>
                        Updated by: <strong>{ver.sender_name || (isClientVer ? 'Client' : 'LATRICS Ops')}</strong> • {createdDate}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveVersionCode(ver.version_code);
                        setLatestSender(ver.sender);
                        if (ver.form_data) setFormData(ver.form_data);
                        if (ver.stage_threads) setStageThreads(ver.stage_threads);
                        if (ver.clarification_threads) setClarificationThreads(ver.clarification_threads);
                        setIsViewingHistorical(idx !== 0);
                        setHistoryModalOpen(false);
                      }}
                      style={{
                        padding: '0.35rem 0.85rem',
                        fontSize: '0.775rem',
                        fontWeight: 700,
                        backgroundColor: isCurrent ? '#09090b' : '#ffffff',
                        color: isCurrent ? '#ffffff' : '#09090b',
                        border: '1px solid #09090b',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      {isCurrent ? 'Current' : 'View Snapshot'}
                    </button>
                  </div>
                );
              }))}
            </div>
          </div>
        </div>
      </Portal>
    )}

      {/* ── Clarification Requested Status Alert Banner ── */}
      {(planningWorkflowStatus === 'awaiting_clarity' || (!isNotFeasible && formData.feasibilityDecision === 'need_clarity' && planningWorkflowStatus !== 'clarification_submitted')) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '1rem 1.25rem',
            backgroundColor: '#fafafa',
            border: '1.5px solid #09090b',
            borderRadius: '6px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <HelpCircle size={22} color="#09090b" style={{ flexShrink: 0 }} />
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
                {isClient
                  ? 'Clarification Requested by LATRICS Operations'
                  : 'Planning Form Submitted — Awaiting Client Clarification'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#52525b', display: 'block', marginTop: '0.15rem' }}>
                {isClient
                  ? 'LATRICS Operations reviewed this plan and requested additional clarifications. Parameters are read-only. Please inspect Operations remarks in each section, reply directly to their remarks or add new remarks, and submit your responses.'
                  : 'You have submitted this operational plan with "Need More Clarity". Client can review flight parameters (read-only), reply to your section remarks, and submit their responses back.'}
              </span>
            </div>
          </div>
          {isClient && (
            <button
              onClick={handleSubmitClarificationsToOps}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                height: '34px',
                padding: '0 1rem',
                fontSize: '0.775rem',
                fontWeight: 700,
                backgroundColor: '#09090b',
                color: '#ffffff',
                border: '1px solid #09090b',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <Check size={14} strokeWidth={3} />
              <span>Submit Clarifications</span>
            </button>
          )}
        </div>
      )}

      {/* ── Clarifications Submitted Status Alert Banner ── */}
      {planningWorkflowStatus === 'clarification_submitted' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.85rem 1.25rem',
            backgroundColor: '#fafafa',
            border: '1px solid #09090b',
            borderRadius: '6px',
          }}
        >
          <CheckCircle2 size={20} color="#09090b" style={{ flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
              {role === 'client' ? 'Clarifications Submitted' : 'Client Clarifications Received'}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#52525b', display: 'block' }}>
              {role === 'client'
                ? 'Your clarification responses and uploaded attachments have been delivered to LATRICS Ops for review.'
                : 'The client has responded to review remarks. Inspect the discussion threads in Sections 1–7, reply if further clarification is needed, or proceed to final decision.'}
            </span>
          </div>
        </div>
      )}

      {/* ── Not Feasible Workflow Status Alert Banner ── */}
      {isNotFeasible && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            backgroundColor: '#fafafa',
            border: '2px solid #09090b',
            borderRadius: '6px',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={22} color="#09090b" style={{ flexShrink: 0 }} />
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
                {isClient
                  ? 'Project Marked Not Feasible — Flight Parameters Locked'
                  : 'Project Marked Not Feasible — Resumption Available'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#52525b', display: 'block', marginTop: '0.15rem' }}>
                {isClient
                  ? 'LATRICS Operations reviewed this survey request as not feasible under initial parameters. Flight parameters are locked. You and your appointed subordinate can reply to remarks or post new remarks in the discussion threads below to discuss adjustments or request reconsideration.'
                  : 'This survey request is currently marked Not Feasible (Cancelled / Hold). Flight parameters are locked. Operations and client team can continue coordination via the discussion threads below, or you can recalibrate parameters and resume planning.'}
              </span>
            </div>
          </div>

          {!isClient && (
            <button
              onClick={handleOpsResumePlanning}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 1.15rem',
                fontSize: '0.775rem',
                fontWeight: 700,
                backgroundColor: '#09090b',
                color: '#ffffff',
                border: '1px solid #09090b',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <History size={14} />
              <span>Resume with "Need More Clarity"</span>
            </button>
          )}
        </div>
      )}

      {/* ── Client Acknowledgement & Mobilization Sign-off Card ── */}
      {planningVersions.length > 0 &&
        !isNotFeasible &&
        (formData.feasibilityDecision === 'yes' ||
          planningWorkflowStatus === 'feasible_pending_client_confirmation' ||
          isClosed) && (
          <div
            style={{
              backgroundColor: '#ffffff',
              border: isClosed ? '1.5px solid #09090b' : '2px solid #09090b',
              borderRadius: '8px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <CheckCircle2 size={20} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                      Client Acknowledgement &amp; Mobilization Sign-off
                    </h3>
                    {isClosed && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          backgroundColor: '#f4f4f5',
                          color: '#09090b',
                          border: '1px solid #d4d4d8',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <Check size={12} strokeWidth={3} /> Confirmed &amp; Signed
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#71717a', margin: '0.2rem 0 0' }}>
                    {isClosed
                      ? 'The client reviewed and confirmed agreement to the operational plan (Sections 1–7), scope parameters, safety mitigations, and mobilization terms. This project was officially approved and advanced to the Mobilizing Phase.'
                      : 'LATRICS Ops has verified Sections 1–7 and determined this project is feasible to proceed. Please review the operational parameters below and confirm agreement to initiate the Mobilizing Phase.'}
                  </p>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1rem',
                backgroundColor: '#fafafa',
                border: '1px solid #e4e4e7',
                borderRadius: '6px',
                padding: '1rem',
              }}
            >
              <div>
                <span style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>Survey Area</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#09090b', display: 'block', marginTop: '0.15rem' }}>
                  {formData.kmlCalculatedArea ? `${formData.kmlCalculatedArea} sq km` : displayArea}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>Planned Altitude</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#09090b', display: 'block', marginTop: '0.15rem' }}>
                  {formData.plannedAltitudeMeters ? `${formData.plannedAltitudeMeters} m AGL` : '—'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>Estimated Field Days</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#09090b', display: 'block', marginTop: '0.15rem' }}>
                  {formData.expectedSurveyDays ? `${formData.expectedSurveyDays} Days` : '—'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>Deliverable Timeline</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#09090b', display: 'block', marginTop: '0.15rem' }}>
                  {formData.dataDeliveryTimelineDays ? `${formData.dataDeliveryTimelineDays} Days Post-Flight` : '—'}
                </span>
              </div>
            </div>

            {isClosed ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1.15rem',
                  border: '1.5px solid #09090b',
                  borderRadius: '6px',
                  backgroundColor: '#fafafa',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '4px',
                      backgroundColor: '#09090b',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#09090b' }}>
                    Client Confirmed: Complete operational plan (Sections 1–7) reviewed and agreed to parameters, scopes, safety mitigations, and mobilization terms.
                  </span>
                </div>

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '4px',
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.01em',
                  }}
                >
                  <Lock size={12} /> Agreed &amp; Mobilized
                </span>
              </div>
            ) : role === 'client' ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    border: '1.5px dashed #09090b',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <input
                    type="checkbox"
                    id="client-declaration-check"
                    checked={clientDeclarationConfirmed}
                    onChange={(e) => setClientDeclarationConfirmed(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#09090b' }}
                  />
                  <label htmlFor="client-declaration-check" style={{ fontSize: '0.825rem', fontWeight: 700, color: '#09090b', cursor: 'pointer' }}>
                    I confirm that I have reviewed the complete operational plan (Sections 1–7) and agree to the planning parameters, scopes, safety mitigations, and mobilization terms.
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    disabled={!clientDeclarationConfirmed || isMobilizingTransitioning}
                    onClick={handleConfirmClientDeclaration}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      height: '40px',
                      padding: '0 1.5rem',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      backgroundColor: clientDeclarationConfirmed ? '#09090b' : '#f4f4f5',
                      color: clientDeclarationConfirmed ? '#ffffff' : '#a1a1aa',
                      border: clientDeclarationConfirmed ? '1px solid #09090b' : '1px solid #d4d4d8',
                      borderRadius: '6px',
                      cursor: clientDeclarationConfirmed ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {isMobilizingTransitioning ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
                    <span>{isMobilizingTransitioning ? 'Advancing to Mobilization...' : 'Confirm Agreement & Proceed to Mobilizing Phase'}</span>
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}

      {/* ── Client Pending Formulation Notice ── */}
      {role === 'client' && planningVersions.length === 0 && !Object.values(stageThreads).some((t) => t.length > 0) && (
        <div
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: '#fafafa',
            border: '1px solid #e4e4e7',
            borderRadius: '8px',
            marginBottom: '0.75rem',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#09090b' }}>
            Operational Plan Under Formulation by LATRICS Operations
          </div>
          <div style={{ fontSize: '0.8rem', color: '#52525b', marginTop: '0.35rem', lineHeight: 1.5 }}>
            LATRICS Operations has not yet published an operational plan for this survey request. Once Operations completes the airspace, terrain, GCP targets, and flight telemetry assessment, the formulated plan will appear here for your review and sign-off.
          </div>
        </div>
      )}

      {/* ── Planning Form Closed & Sealed Banner ── */}
      {isClosed && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#fafafa',
            border: '1.5px solid #09090b',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '0.5rem',
          }}
        >
          <Lock size={18} color="#09090b" style={{ flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
              Operational Planning Finalised &amp; Sealed — Read-Only Mode
            </span>
            <span style={{ fontSize: '0.75rem', color: '#52525b', display: 'block', marginTop: '0.15rem' }}>
              This project has been agreed upon by both Client and Operations and has converted to an active Project. All planning specifications, sensor parameters, boundaries, and feasibility decisions are permanently locked as an immutable audit record.
            </span>
          </div>
        </div>
      )}

      {/* ── Main 3-Column Layout ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '230px minmax(0, 1fr) 280px',
          gap: '1.25rem',
          alignItems: 'start',
        }}
      >
        {/* ── Column 1: Vertical 8-Stage Step Navigation ── */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '8px',
            padding: '1rem 0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ padding: '0 0.5rem 0.5rem', borderBottom: '1px solid #e4e4e7', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#09090b', letterSpacing: '0.02em' }}>
              Planning Stages
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {stages.map((stage, idx) => {
              const isActive = currentStage === stage.num;
              const isStageFilled = isStageParametersFilled(stage.num);
              const isStepDone = !isActive && (isClosed || isStageFilled);
              const isStageComplete = isClosed || isStageFilled;

              return (
                <div key={stage.num} style={{ position: 'relative' }}>
                  {idx < stages.length - 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '18px',
                        top: '32px',
                        width: '1.5px',
                        height: '24px',
                        backgroundColor: isStageComplete ? '#09090b' : '#e4e4e7',
                        zIndex: 1,
                      }}
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStage(stage.num);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      width: '100%',
                      padding: '0.55rem 0.65rem',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: isActive ? '#f4f4f5' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      position: 'relative',
                      zIndex: 2,
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: isActive ? '1.5px solid #09090b' : (isStepDone ? '1px solid #09090b' : '1px solid #d4d4d8'),
                        backgroundColor: isActive ? '#09090b' : (isStepDone ? '#09090b' : '#ffffff'),
                        color: isActive || isStepDone ? '#ffffff' : '#71717a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {isStepDone ? <Check size={12} strokeWidth={3} /> : stage.num}
                    </div>

                    <span
                      style={{
                        fontSize: '0.775rem',
                        fontWeight: isActive ? 800 : 500,
                        color: isActive ? '#09090b' : (isStageComplete ? '#09090b' : '#52525b'),
                        lineHeight: 1.25,
                      }}
                    >
                      {stage.title}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Column 2: Active Stage Workspace ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
          {/* ========================================================================= */}
          {/* STAGE 1: KML Findings */}
          {/* ========================================================================= */}
          {currentStage === 1 && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '8px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    border: '1px solid #d4d4d8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <FileText size={18} color="#09090b" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    1. KML Findings
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '0.2rem' }}>
                    Review the submitted KML and verify area, boundaries and any anomalies.
                  </p>
                </div>
              </div>

              {/* Client Submitted KML Reference Card */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                  Client Submitted KML
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid #e4e4e7',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '4px',
                        border: '1px solid #d4d4d8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <Paperclip size={15} color="#09090b" />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#09090b', display: 'block' }}>
                        {formData.kmlFileName || backendKmlFile?.name || 'No KML file submitted by client'}
                      </span>
                      <span style={{ fontSize: '0.725rem', color: '#71717a' }}>
                        {formData.kmlFileSize || backendKmlFile?.size || '—'}
                      </span>
                    </div>
                  </div>

                  {formData.kmlFileName || backendKmlFile?.name ? (
                    <button
                      onClick={() => showToast('Opening client submitted KML file...')}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: '#ffffff',
                        border: '1px solid #09090b',
                        borderRadius: '4px',
                        color: '#09090b',
                        cursor: 'pointer',
                      }}
                    >
                      View File
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Background Verification Input Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                  LATRICS Background Verification Check
                </span>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.85rem',
                    padding: '1rem',
                    borderRadius: '6px',
                    border: '1px solid #e4e4e7',
                    backgroundColor: isClient ? '#fafafa' : '#ffffff',
                  }}
                >
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span>Calculated Area (sq km)</span>
                      {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
                    </label>
                    {isClient || isClosed ? (
                      <div
                        style={{
                          width: '100%',
                          minHeight: '34px',
                          padding: '0.45rem 0.65rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          border: '1px solid #e4e4e7',
                          borderRadius: '4px',
                          backgroundColor: '#fafafa',
                          color: '#09090b',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'default',
                        }}
                      >
                        {formData.kmlCalculatedArea ? `${formData.kmlCalculatedArea} sq km` : '—'}
                      </div>
                    ) : (
                      <input
                        type="number"
                        value={formData.kmlCalculatedArea}
                        onChange={(e) => updateField('kmlCalculatedArea', e.target.value)}
                        placeholder="—"
                        style={{
                          width: '100%',
                          height: '34px',
                          padding: '0 0.65rem',
                          fontSize: '0.8rem',
                          border: '1px solid #d4d4d8',
                          borderRadius: '4px',
                          backgroundColor: '#ffffff',
                          color: '#09090b',
                        }}
                      />
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span>Requested Area (sq km)</span>
                      {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
                    </label>
                    {isClient || isClosed ? (
                      <div
                        style={{
                          width: '100%',
                          minHeight: '34px',
                          padding: '0.45rem 0.65rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          border: '1px solid #e4e4e7',
                          borderRadius: '4px',
                          backgroundColor: '#fafafa',
                          color: '#09090b',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'default',
                        }}
                      >
                        {formData.kmlRequestedArea ? `${formData.kmlRequestedArea} sq km` : '—'}
                      </div>
                    ) : (
                      <input
                        type="number"
                        value={formData.kmlRequestedArea}
                        onChange={(e) => updateField('kmlRequestedArea', e.target.value)}
                        placeholder="—"
                        style={{
                          width: '100%',
                          height: '34px',
                          padding: '0 0.65rem',
                          fontSize: '0.8rem',
                          border: '1px solid #d4d4d8',
                          borderRadius: '4px',
                          backgroundColor: '#ffffff',
                          color: '#09090b',
                        }}
                      />
                    )}
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span>Boundary &amp; Dispute Notes</span>
                      {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
                    </label>
                    {isClient || isClosed ? (
                      <div
                        style={{
                          width: '100%',
                          minHeight: '34px',
                          padding: '0.45rem 0.65rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          border: '1px solid #e4e4e7',
                          borderRadius: '4px',
                          backgroundColor: '#fafafa',
                          color: '#09090b',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'default',
                        }}
                      >
                        {formData.kmlBoundaryStatus || '—'}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={formData.kmlBoundaryStatus}
                        onChange={(e) => updateField('kmlBoundaryStatus', e.target.value)}
                        placeholder="Enter verified boundary observations or dispute findings..."
                        style={{
                          width: '100%',
                          height: '34px',
                          padding: '0 0.65rem',
                          fontSize: '0.8rem',
                          border: '1px solid #d4d4d8',
                          borderRadius: '4px',
                          backgroundColor: '#ffffff',
                          color: '#09090b',
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Universal Remarks & Discussion Thread for Stage 1 */}
              {renderStageReviewSection(1, 'KML Findings')}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 2: Regularity & Airspace */}
          {/* ========================================================================= */}
          {currentStage === 2 && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '8px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    border: '1px solid #d4d4d8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <Plane size={18} color="#09090b" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    2. Regularity & Airspace
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '0.2rem' }}>
                    Verify DGCA Digital Sky airspace classification and clearance prerequisites for the flight perimeter.
                  </p>
                </div>
              </div>

              {/* Airspace Zones */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                  DGCA Airspace Zone Classification
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
                  {[
                    { name: 'Green Zone', desc: 'Up to 400 ft AGL. No prior DGCA flight permission required.' },
                    { name: 'Yellow Zone', desc: 'Controlled airspace. Prior Air Traffic Control (ATC) clearance required.' },
                    { name: 'Red Zone', desc: 'Restricted / Prohibited airspace. Central MoD clearance required.' },
                  ].map((zone) => {
                    const isSelected = formData.airspaceZones.includes(zone.name);
                    return (
                      <div
                        key={zone.name}
                        onClick={() => !isClient && toggleArrayItem('airspaceZones', zone.name)}
                        style={{
                          border: isSelected ? '1.5px solid #09090b' : '1px solid #e4e4e7',
                          backgroundColor: isSelected ? '#fafafa' : '#ffffff',
                          borderRadius: '6px',
                          padding: '0.85rem',
                          cursor: isClient ? 'default' : 'pointer',
                          opacity: isClient && !isSelected ? 0.65 : 1,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>
                            {zone.name}
                          </span>
                          <div
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '3px',
                              border: isSelected ? '1.5px solid #09090b' : '1px solid #d4d4d8',
                              backgroundColor: isSelected ? '#09090b' : '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {isSelected && <Check size={11} color="#ffffff" strokeWidth={3} />}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.725rem', color: '#71717a', lineHeight: 1.35 }}>
                          {zone.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Universal Remarks & Discussion Thread for Stage 2 (COMPULSORY) */}
              {renderStageReviewSection(2, 'Regularity and Airspace')}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 3: Accessibility & Feasibility */}
          {/* ========================================================================= */}
          {currentStage === 3 && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '8px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    border: '1px solid #d4d4d8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <Compass size={18} color="#09090b" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    3. Accessibility & Feasibility
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '0.2rem' }}>
                    Physical terrain, elevation variation, weather conditions, and mandatory client clarifications.
                  </p>
                </div>
              </div>

              {/* Terrain, Elevation, Weather & Access Grid */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                  padding: '1.25rem',
                  borderRadius: '6px',
                  border: '1px solid #e4e4e7',
                  backgroundColor: '#ffffff',
                }}
              >
                {/* Row 1: Aligned Two-Column Section for Multi-Selects */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1.25rem',
                  }}
                >
                  {/* Left: Terrain Type (Multiple selection) */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                      padding: '1rem',
                      borderRadius: '6px',
                      border: '1px solid #e4e4e7',
                      backgroundColor: '#fafafa',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                        Terrain Type
                      </label>
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#71717a', backgroundColor: '#ffffff', padding: '0.15rem 0.5rem', borderRadius: '3px', border: '1px solid #e4e4e7' }}>
                        Multiple Selection
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '0.5rem',
                      }}
                    >
                      {['Flat', 'Hilly', 'Urban', 'Forest', 'Mixed'].map((item) => {
                        const isSel = (formData.terrainTypes || []).includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            disabled={isClient}
                            onClick={() => !isClient && toggleArrayItem('terrainTypes', item)}
                            style={{
                              height: '34px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              fontSize: '0.775rem',
                              borderRadius: '4px',
                              border: isSel ? '1.5px solid #09090b' : '1px solid #d4d4d8',
                              backgroundColor: isSel ? '#09090b' : '#ffffff',
                              color: isSel ? '#ffffff' : '#09090b',
                              fontWeight: isSel ? 700 : 500,
                              cursor: isClient ? 'default' : 'pointer',
                              opacity: isClient && !isSel ? 0.65 : 1,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {isSel && <Check size={12} color="#ffffff" strokeWidth={3} />}
                            <span>{item}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: Weather Conditions (Multiple selection) */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                      padding: '1rem',
                      borderRadius: '6px',
                      border: '1px solid #e4e4e7',
                      backgroundColor: '#fafafa',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                        Weather Conditions
                      </label>
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#71717a', backgroundColor: '#ffffff', padding: '0.15rem 0.5rem', borderRadius: '3px', border: '1px solid #e4e4e7' }}>
                        Multiple Selection
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '0.5rem',
                      }}
                    >
                      {['Rainy', 'Foggy', 'Extreme Temp', 'Windy', 'Mixed'].map((item) => {
                        const isSel = (formData.weatherConditions || []).includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            disabled={isClient}
                            onClick={() => !isClient && toggleArrayItem('weatherConditions', item)}
                            style={{
                              height: '34px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              fontSize: '0.775rem',
                              borderRadius: '4px',
                              border: isSel ? '1.5px solid #09090b' : '1px solid #d4d4d8',
                              backgroundColor: isSel ? '#09090b' : '#ffffff',
                              color: isSel ? '#ffffff' : '#09090b',
                              fontWeight: isSel ? 700 : 500,
                              cursor: isClient ? 'default' : 'pointer',
                              opacity: isClient && !isSel ? 0.65 : 1,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {isSel && <Check size={12} color="#ffffff" strokeWidth={3} />}
                            <span>{item}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Row 2: Aligned Two-Column Section for Metrics & Site Access */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1.25rem',
                  }}
                >
                  {/* Left: Elevation Variation */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Elevation Variation (meters)</span>
                      {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
                    </label>
                    {isClient || isClosed ? (
                      <div
                        style={{
                          width: '100%',
                          minHeight: '38px',
                          padding: '0 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          border: '1px solid #e4e4e7',
                          borderRadius: '4px',
                          backgroundColor: '#fafafa',
                          color: '#09090b',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'default',
                        }}
                      >
                        {formData.elevationVariationMeters ? `${formData.elevationVariationMeters} meters` : '—'}
                      </div>
                    ) : (
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          value={formData.elevationVariationMeters}
                          onChange={(e) => updateField('elevationVariationMeters', e.target.value)}
                          placeholder="—"
                          style={{
                            width: '100%',
                            height: '38px',
                            padding: '0 3.5rem 0 0.75rem',
                            fontSize: '0.8rem',
                            border: '1px solid #d4d4d8',
                            borderRadius: '4px',
                            backgroundColor: '#ffffff',
                            color: '#09090b',
                            outline: 'none',
                          }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            color: '#71717a',
                          }}
                        >
                          meters
                        </span>
                      </div>
                    )}
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
                      Estimated maximum height delta across survey boundary.
                    </span>
                  </div>

                  {/* Right: Take-off & Landing Access */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Site Access &amp; Launch Safety</span>
                      {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
                    </label>
                    {isClient || isClosed ? (
                      <div
                        style={{
                          height: '38px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          padding: '0 0.85rem',
                          borderRadius: '4px',
                          border: '1px solid #e4e4e7',
                          backgroundColor: '#fafafa',
                          cursor: 'default',
                        }}
                      >
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '3px',
                            border: formData.fieldAccessIdentified ? '1.5px solid #09090b' : '1px solid #d4d4d8',
                            backgroundColor: formData.fieldAccessIdentified ? '#09090b' : '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {formData.fieldAccessIdentified && <Check size={11} color="#ffffff" strokeWidth={3} />}
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#09090b' }}>
                          {formData.fieldAccessIdentified ? 'Take-off and Landing Access Identified (Verified)' : 'Take-off and Landing Access Not Identified'}
                        </span>
                      </div>
                    ) : (
                      <label
                        htmlFor="field-access-check"
                        style={{
                          height: '38px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          padding: '0 0.85rem',
                          borderRadius: '4px',
                          border: formData.fieldAccessIdentified ? '1.5px solid #09090b' : '1px solid #d4d4d8',
                          backgroundColor: formData.fieldAccessIdentified ? '#fafafa' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          id="field-access-check"
                          checked={formData.fieldAccessIdentified}
                          onChange={(e) => updateField('fieldAccessIdentified', e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#09090b' }}
                        />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#09090b' }}>
                          Take-off and Landing Access Identified
                        </span>
                      </label>
                    )}
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
                      Designated clear radius for safe drone takeoff and recovery.
                    </span>
                  </div>
                </div>
              </div>

              {/* Universal Remarks & Discussion Thread for Stage 3 */}
              {renderStageReviewSection(3, 'Accessibility and Feasibility')}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 4: Obstacles & Hazards */}
          {/* ========================================================================= */}
          {currentStage === 4 && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '8px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    border: '1px solid #d4d4d8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <AlertTriangle size={18} color="#09090b" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    4. Obstacles & Hazards
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '0.2rem' }}>
                    Identify vertical physical obstacles, high-tension electrical hazards, and canopy blockages.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                  Corridor Hazards Identification
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
                  {[
                    'Powerline / High-Tension Towers',
                    'Tall Structures',
                    'Tree Canopy',
                    'High Building Density',
                    'Other Moving Obstacles',
                    'Mixed',
                  ].map((hazard) => {
                    const isSelected = formData.hazards.includes(hazard);
                    return (
                      <div
                        key={hazard}
                        onClick={() => !isClient && toggleArrayItem('hazards', hazard)}
                        style={{
                          border: isSelected ? '1.5px solid #09090b' : '1px solid #e4e4e7',
                          backgroundColor: isSelected ? '#fafafa' : '#ffffff',
                          borderRadius: '6px',
                          padding: '0.85rem',
                          cursor: isClient ? 'default' : 'pointer',
                          opacity: isClient && !isSelected ? 0.65 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                        }}
                      >
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#09090b' }}>
                          {hazard}
                        </span>
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '3px',
                            border: isSelected ? '1.5px solid #09090b' : '1px solid #d4d4d8',
                            backgroundColor: isSelected ? '#09090b' : '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isSelected && <Check size={11} color="#ffffff" strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  padding: '1rem',
                  borderRadius: '6px',
                  border: '1px solid #e4e4e7',
                  backgroundColor: isClient ? '#fafafa' : '#ffffff',
                }}
              >
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Max Obstacle Height (meters)</span>
                    {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
                  </label>
                  {isClient || isClosed ? (
                    <div
                      style={{
                        width: '100%',
                        minHeight: '34px',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: '1px solid #e4e4e7',
                        borderRadius: '4px',
                        backgroundColor: '#fafafa',
                        color: '#09090b',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'default',
                      }}
                    >
                      {formData.maxObstacleHeightMeters ? `${formData.maxObstacleHeightMeters} meters` : '—'}
                    </div>
                  ) : (
                    <input
                      type="number"
                      value={formData.maxObstacleHeightMeters}
                      onChange={(e) => updateField('maxObstacleHeightMeters', e.target.value)}
                      placeholder="—"
                      style={{
                        width: '100%',
                        height: '34px',
                        padding: '0 0.65rem',
                        fontSize: '0.8rem',
                        border: '1px solid #d4d4d8',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#09090b',
                      }}
                    />
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Safety Buffer Distance (meters)</span>
                    {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
                  </label>
                  {isClient || isClosed ? (
                    <div
                      style={{
                        width: '100%',
                        minHeight: '34px',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: '1px solid #e4e4e7',
                        borderRadius: '4px',
                        backgroundColor: '#fafafa',
                        color: '#09090b',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'default',
                      }}
                    >
                      {formData.safetyBufferDistanceMeters ? `${formData.safetyBufferDistanceMeters} meters` : '—'}
                    </div>
                  ) : (
                    <input
                      type="number"
                      value={formData.safetyBufferDistanceMeters}
                      onChange={(e) => updateField('safetyBufferDistanceMeters', e.target.value)}
                      placeholder="—"
                      style={{
                        width: '100%',
                        height: '34px',
                        padding: '0 0.65rem',
                        fontSize: '0.8rem',
                        border: '1px solid #d4d4d8',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#09090b',
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Universal Remarks & Discussion Thread for Stage 4 (COMPULSORY) */}
              {renderStageReviewSection(4, 'Obstacles and Hazards')}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 5: GCP Planning */}
          {/* ========================================================================= */}
          {currentStage === 5 && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '8px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    border: '1px solid #d4d4d8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <MapPin size={18} color="#09090b" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    5. GCP Planning
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '0.2rem' }}>
                    Ground Control Points network, target specifications, and base station benchmark setup.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                  padding: '1.25rem',
                  borderRadius: '6px',
                  border: '1px solid #e4e4e7',
                  backgroundColor: '#ffffff',
                }}
              >
                {/* Top 3 fields: No. of GCP needed, GCP target size in cm, GCP material (String input type) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span>No. of GCP needed</span>
                      {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
                    </label>
                    {isClient || isClosed ? (
                      <div
                        style={{
                          width: '100%',
                          minHeight: '36px',
                          padding: '0 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          border: '1px solid #e4e4e7',
                          borderRadius: '4px',
                          backgroundColor: '#fafafa',
                          color: '#09090b',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'default',
                        }}
                      >
                        {formData.gcpsNeeded || '—'}
                      </div>
                    ) : (
                      <input
                        type="number"
                        value={formData.gcpsNeeded}
                        onChange={(e) => updateField('gcpsNeeded', e.target.value)}
                        placeholder="—"
                        style={{
                          width: '100%',
                          height: '36px',
                          padding: '0 0.75rem',
                          fontSize: '0.8rem',
                          border: '1px solid #d4d4d8',
                          borderRadius: '4px',
                          backgroundColor: '#ffffff',
                          color: '#09090b',
                          outline: 'none',
                        }}
                      />
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span>GCP target size in cm</span>
                      {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
                    </label>
                    {isClient || isClosed ? (
                      <div
                        style={{
                          width: '100%',
                          minHeight: '36px',
                          padding: '0 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          border: '1px solid #e4e4e7',
                          borderRadius: '4px',
                          backgroundColor: '#fafafa',
                          color: '#09090b',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'default',
                        }}
                      >
                        {formData.gcpTargetSizeCm ? `${formData.gcpTargetSizeCm} cm` : '—'}
                      </div>
                    ) : (
                      <input
                        type="number"
                        value={formData.gcpTargetSizeCm}
                        onChange={(e) => updateField('gcpTargetSizeCm', e.target.value)}
                        placeholder="—"
                        style={{
                          width: '100%',
                          height: '36px',
                          padding: '0 0.75rem',
                          fontSize: '0.8rem',
                          border: '1px solid #d4d4d8',
                          borderRadius: '4px',
                          backgroundColor: '#ffffff',
                          color: '#09090b',
                          outline: 'none',
                        }}
                      />
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span>GCP material</span>
                      {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
                    </label>
                    {isClient || isClosed ? (
                      <div
                        style={{
                          width: '100%',
                          minHeight: '36px',
                          padding: '0 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          border: '1px solid #e4e4e7',
                          borderRadius: '4px',
                          backgroundColor: '#fafafa',
                          color: '#09090b',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'default',
                        }}
                      >
                        {formData.gcpTargetMaterial || '—'}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={formData.gcpTargetMaterial}
                        onChange={(e) => updateField('gcpTargetMaterial', e.target.value)}
                        placeholder="—"
                        style={{
                          width: '100%',
                          height: '36px',
                          padding: '0 0.75rem',
                          fontSize: '0.8rem',
                          border: '1px solid #d4d4d8',
                          borderRadius: '4px',
                          backgroundColor: '#ffffff',
                          color: '#09090b',
                          outline: 'none',
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Field 4: GCP location : (Attachments input type) */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span>GCP location (Attachments)</span>
                    {isClient && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
                  </label>

                  {formData.gcpLocationFile ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        border: '1px solid #18181b',
                        borderRadius: '4px',
                        backgroundColor: '#fafafa',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '4px',
                            border: '1px solid #d4d4d8',
                            backgroundColor: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Paperclip size={14} color="#09090b" />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                            {formData.gcpLocationFile}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#71717a' }}>
                            GCP Location File attached
                          </div>
                        </div>
                      </div>

                      {isClient ? (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            border: '1px solid #d4d4d8',
                            borderRadius: '4px',
                            padding: '0.3rem 0.6rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#09090b',
                            backgroundColor: '#ffffff',
                          }}
                        >
                          <Download size={13} />
                          Attached
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updateField('gcpLocationFile', '')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: 'none',
                            border: '1px solid #e4e4e7',
                            borderRadius: '4px',
                            padding: '0.3rem 0.6rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#09090b',
                          }}
                        >
                          <X size={13} />
                          Remove
                        </button>
                      )}
                    </div>
                  ) : isClient ? (
                    <div
                      style={{
                        padding: '1.25rem 1rem',
                        borderRadius: '6px',
                        border: '1px dashed #d4d4d8',
                        backgroundColor: '#fafafa',
                        textAlign: 'center',
                        color: '#71717a',
                        fontSize: '0.775rem',
                      }}
                    >
                      No GCP location coordinates file attached by LATRICS Operations for this survey.
                    </div>
                  ) : (
                    <label
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.5rem 1rem',
                        border: '1.5px dashed #d4d4d8',
                        borderRadius: '6px',
                        backgroundColor: '#fafafa',
                        cursor: 'pointer',
                        gap: '0.4rem',
                      }}
                    >
                      <input
                        type="file"
                        accept=".csv,.kml,.kmz,.geojson,.txt,.pdf,.xlsx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            updateField('gcpLocationFile', file.name);
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          border: '1px solid #e4e4e7',
                          backgroundColor: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Upload size={16} color="#09090b" />
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#09090b' }}>
                        Click to upload GCP location file or drag and drop
                      </div>
                      <div style={{ fontSize: '0.725rem', color: '#71717a' }}>
                        Supports CSV, KML, KMZ, GeoJSON, TXT, or coordinates sheet
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Universal Remarks & Discussion Thread for Stage 5 (COMPULSORY) */}
              {renderStageReviewSection(5, 'GCP Planning')}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 6: Flight Planning */}
          {/* ========================================================================= */}
          {currentStage === 6 && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '8px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    border: '1px solid #d4d4d8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <Plane size={18} color="#09090b" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    6. Flight Planning
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '0.2rem' }}>
                    Drone flight altitude, overlaps, and mission sorties.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '1rem',
                  padding: '1rem',
                  borderRadius: '6px',
                  border: '1px solid #e4e4e7',
                  backgroundColor: isClient ? '#fafafa' : '#ffffff',
                  alignItems: 'stretch',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', minHeight: '2.2rem', lineHeight: 1.35, marginBottom: '0.35rem' }}>
                    <span>No. of Landings</span>
                    {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
                  </label>
                  {isClient || isClosed ? (
                    <div
                      style={{
                        width: '100%',
                        minHeight: '34px',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: '1px solid #e4e4e7',
                        borderRadius: '4px',
                        backgroundColor: '#fafafa',
                        color: '#09090b',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'default',
                      }}
                    >
                      {formData.numberOfLandings || '—'}
                    </div>
                  ) : (
                    <input
                      type="number"
                      value={formData.numberOfLandings}
                      onChange={(e) => updateField('numberOfLandings', e.target.value)}
                      placeholder="—"
                      style={{
                        width: '100%',
                        height: '34px',
                        padding: '0 0.65rem',
                        fontSize: '0.8rem',
                        border: '1px solid #d4d4d8',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#09090b',
                      }}
                    />
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', minHeight: '2.2rem', lineHeight: 1.35, marginBottom: '0.35rem' }}>
                    <span>Planned Altitude (m AGL)</span>
                    {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
                  </label>
                  {isClient || isClosed ? (
                    <div
                      style={{
                        width: '100%',
                        minHeight: '34px',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: '1px solid #e4e4e7',
                        borderRadius: '4px',
                        backgroundColor: '#fafafa',
                        color: '#09090b',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'default',
                      }}
                    >
                      {formData.plannedAltitudeMeters ? `${formData.plannedAltitudeMeters} m AGL` : '—'}
                    </div>
                  ) : (
                    <input
                      type="number"
                      value={formData.plannedAltitudeMeters}
                      onChange={(e) => updateField('plannedAltitudeMeters', e.target.value)}
                      placeholder="—"
                      style={{
                        width: '100%',
                        height: '34px',
                        padding: '0 0.65rem',
                        fontSize: '0.8rem',
                        border: '1px solid #d4d4d8',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#09090b',
                      }}
                    />
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', minHeight: '2.2rem', lineHeight: 1.35, marginBottom: '0.35rem' }}>
                    <span>Front Overlap (%)</span>
                    {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
                  </label>
                  {isClient || isClosed ? (
                    <div
                      style={{
                        width: '100%',
                        minHeight: '34px',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: '1px solid #e4e4e7',
                        borderRadius: '4px',
                        backgroundColor: '#fafafa',
                        color: '#09090b',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'default',
                      }}
                    >
                      {formData.frontOverlapPercent ? `${formData.frontOverlapPercent}%` : '—'}
                    </div>
                  ) : (
                    <input
                      type="number"
                      value={formData.frontOverlapPercent}
                      onChange={(e) => updateField('frontOverlapPercent', e.target.value)}
                      placeholder="—"
                      style={{
                        width: '100%',
                        height: '34px',
                        padding: '0 0.65rem',
                        fontSize: '0.8rem',
                        border: '1px solid #d4d4d8',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#09090b',
                      }}
                    />
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', minHeight: '2.2rem', lineHeight: 1.35, marginBottom: '0.35rem' }}>
                    <span>Side Overlap (%)</span>
                    {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
                  </label>
                  {isClient || isClosed ? (
                    <div
                      style={{
                        width: '100%',
                        minHeight: '34px',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: '1px solid #e4e4e7',
                        borderRadius: '4px',
                        backgroundColor: '#fafafa',
                        color: '#09090b',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'default',
                      }}
                    >
                      {formData.sideOverlapPercent ? `${formData.sideOverlapPercent}%` : '—'}
                    </div>
                  ) : (
                    <input
                      type="number"
                      value={formData.sideOverlapPercent}
                      onChange={(e) => updateField('sideOverlapPercent', e.target.value)}
                      placeholder="—"
                      style={{
                        width: '100%',
                        height: '34px',
                        padding: '0 0.65rem',
                        fontSize: '0.8rem',
                        border: '1px solid #d4d4d8',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#09090b',
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Universal Remarks & Discussion Thread for Stage 6 (COMPULSORY) */}
              {renderStageReviewSection(6, 'Flight Planning')}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 7: Expected Timelines */}
          {/* ========================================================================= */}
          {currentStage === 7 && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '8px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    border: '1px solid #d4d4d8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <Calendar size={18} color="#09090b" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    7. Expected Timelines
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '0.2rem' }}>
                    Survey days, mission start/end dates, pilot travel, and post-processing delivery dates.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1rem',
                  padding: '1rem',
                  borderRadius: '6px',
                  border: '1px solid #e4e4e7',
                  backgroundColor: isClient ? '#fafafa' : '#ffffff',
                }}
              >
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Expected Survey Days</span>
                    {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
                  </label>
                  {isClient || isClosed ? (
                    <div
                      style={{
                        width: '100%',
                        minHeight: '34px',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: '1px solid #e4e4e7',
                        borderRadius: '4px',
                        backgroundColor: '#fafafa',
                        color: '#09090b',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'default',
                      }}
                    >
                      {formData.expectedSurveyDays ? `${formData.expectedSurveyDays} Days` : '—'}
                    </div>
                  ) : (
                    <input
                      type="number"
                      value={formData.expectedSurveyDays}
                      onChange={(e) => updateField('expectedSurveyDays', e.target.value)}
                      placeholder="—"
                      style={{
                        width: '100%',
                        height: '34px',
                        padding: '0 0.65rem',
                        fontSize: '0.8rem',
                        border: '1px solid #d4d4d8',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#09090b',
                      }}
                    />
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Expected Starting Date</span>
                    {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
                  </label>
                  {isClient || isClosed ? (
                    <div
                      style={{
                        width: '100%',
                        minHeight: '34px',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: '1px solid #e4e4e7',
                        borderRadius: '4px',
                        backgroundColor: '#fafafa',
                        color: '#09090b',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'default',
                      }}
                    >
                      {formData.expectedStartDate || '—'}
                    </div>
                  ) : (
                    <input
                      type="date"
                      value={formData.expectedStartDate}
                      onChange={(e) => updateField('expectedStartDate', e.target.value)}
                      style={{
                        width: '100%',
                        height: '34px',
                        padding: '0 0.65rem',
                        fontSize: '0.8rem',
                        border: '1px solid #d4d4d8',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#09090b',
                      }}
                    />
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Expected Ending Date</span>
                    {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
                  </label>
                  {isClient || isClosed ? (
                    <div
                      style={{
                        width: '100%',
                        minHeight: '34px',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: '1px solid #e4e4e7',
                        borderRadius: '4px',
                        backgroundColor: '#fafafa',
                        color: '#09090b',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'default',
                      }}
                    >
                      {formData.expectedEndDate || '—'}
                    </div>
                  ) : (
                    <input
                      type="date"
                      value={formData.expectedEndDate}
                      onChange={(e) => updateField('expectedEndDate', e.target.value)}
                      style={{
                        width: '100%',
                        height: '34px',
                        padding: '0 0.65rem',
                        fontSize: '0.8rem',
                        border: '1px solid #d4d4d8',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#09090b',
                      }}
                    />
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Pilot Travel Date</span>
                    {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
                  </label>
                  {isClient || isClosed ? (
                    <div
                      style={{
                        width: '100%',
                        minHeight: '34px',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: '1px solid #e4e4e7',
                        borderRadius: '4px',
                        backgroundColor: '#fafafa',
                        color: '#09090b',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'default',
                      }}
                    >
                      {formData.pilotTravelDate || '—'}
                    </div>
                  ) : (
                    <input
                      type="date"
                      value={formData.pilotTravelDate}
                      onChange={(e) => updateField('pilotTravelDate', e.target.value)}
                      style={{
                        width: '100%',
                        height: '34px',
                        padding: '0 0.65rem',
                        fontSize: '0.8rem',
                        border: '1px solid #d4d4d8',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#09090b',
                      }}
                    />
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Data Processing Timeline (Days)</span>
                    {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
                  </label>
                  {isClient || isClosed ? (
                    <div
                      style={{
                        width: '100%',
                        minHeight: '34px',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: '1px solid #e4e4e7',
                        borderRadius: '4px',
                        backgroundColor: '#fafafa',
                        color: '#09090b',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'default',
                      }}
                    >
                      {formData.dataDeliveryTimelineDays ? `${formData.dataDeliveryTimelineDays} Days` : '—'}
                    </div>
                  ) : (
                    <input
                      type="number"
                      value={formData.dataDeliveryTimelineDays}
                      onChange={(e) => updateField('dataDeliveryTimelineDays', e.target.value)}
                      placeholder="—"
                      style={{
                        width: '100%',
                        height: '34px',
                        padding: '0 0.65rem',
                        fontSize: '0.8rem',
                        border: '1px solid #d4d4d8',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#09090b',
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Universal Remarks & Discussion Thread for Stage 7 (COMPULSORY) */}
              {renderStageReviewSection(7, 'Expected Timelines')}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 8: Feasible to Proceed */}
          {/* ========================================================================= */}
          {currentStage === 8 && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '8px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    border: '1px solid #d4d4d8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <FileCheck size={18} color="#09090b" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    8. Feasible to Proceed
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '0.2rem' }}>
                    Choose an operational feasibility determination. Selecting an option opens the full 8-stage verification review popup.
                  </p>
                </div>
              </div>

              {/* Three Mutually Exclusive Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                    Operational Feasibility Determination {isClient && <span style={{ fontSize: '0.72rem', color: '#71717a' }}>(Formulated by LATRICS Ops)</span>}
                  </span>
                  {isClient && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#71717a', backgroundColor: '#f4f4f5', padding: '0.15rem 0.5rem', borderRadius: '4px', border: '1px solid #e4e4e7' }}>
                      <Lock size={11} />
                      <span>Read-Only for Client</span>
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
                  {[
                    {
                      key: 'yes' as const,
                      title: 'Yes (Feasible)',
                      subtext: 'An acknowledgement form will subsequently appear on the Client side for sign-off.',
                    },
                    {
                      key: 'no' as const,
                      title: 'No (Not Feasible)',
                      subtext: 'The request will be closed and formal rejection rationale recorded.',
                    },
                    {
                      key: 'need_clarity' as const,
                      title: 'Need More Clarity',
                      subtext: 'The request will be returned to the Client for responses to the individual LATRICS remarks threads.',
                    },
                  ].map((opt) => {
                    const isSelected = formData.feasibilityDecision === opt.key;
                    return (
                      <div
                        key={opt.key}
                        onClick={() => !isClient && handleSelectFeasibilityOption(opt.key)}
                        style={{
                          border: isSelected ? '2px solid #09090b' : '1px solid #e4e4e7',
                          backgroundColor: isSelected ? '#fafafa' : '#ffffff',
                          borderRadius: '6px',
                          padding: '1rem',
                          cursor: isClient ? 'default' : 'pointer',
                          opacity: isClient && !isSelected ? 0.6 : 1,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.45rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#09090b' }}>
                            {opt.title}
                          </span>
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              border: isSelected ? '5px solid #09090b' : '1.5px solid #d4d4d8',
                              backgroundColor: '#ffffff',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.725rem', color: '#71717a', lineHeight: 1.4 }}>
                          {opt.subtext}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Large LATRICS Remarks Area */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                    Final LATRICS Operational Remarks {isClient && <span style={{ fontSize: '0.72rem', color: '#71717a' }}>(Ops Sealed Record)</span>}
                  </label>
                  {isClient && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#71717a', backgroundColor: '#f4f4f5', padding: '0.15rem 0.5rem', borderRadius: '4px', border: '1px solid #e4e4e7' }}>
                      <Lock size={11} />
                      <span>Read-Only</span>
                    </span>
                  )}
                </div>
                <textarea
                  rows={4}
                  disabled={isClient}
                  readOnly={isClient}
                  value={formData.decisionRemarks}
                  onChange={(e) => updateField('decisionRemarks', e.target.value)}
                  placeholder={
                    isClient
                      ? 'No final operational remarks entered by LATRICS Ops yet.'
                      : 'Enter final operational findings, engineering justification, or missing clarity items...'
                  }
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.8rem',
                    border: '1px solid #d4d4d8',
                    borderRadius: '6px',
                    fontFamily: 'inherit',
                    backgroundColor: isClient ? '#f4f4f5' : '#ffffff',
                    cursor: isClient ? 'default' : 'text',
                    color: '#09090b',
                  }}
                />
                {isClient && formData.decisionRemarks && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setStageAddingRemark((prev) => ({ ...prev, [8]: true }));
                        setStageDraftTexts((prev) => ({
                          ...prev,
                          [8]: prev[8] || `Regarding Operations Decision Remarks: `,
                        }));
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.85rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: '#ffffff',
                        color: '#09090b',
                        border: '1px solid #09090b',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      <CornerDownRight size={13} />
                      <span>Reply to Operations Remarks</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Universal Remarks & Discussion Thread for Stage 8 (COMPULSORY) */}
              {renderStageReviewSection(8, 'Feasible to Proceed')}

              {/* Review Popup Trigger banner - Ops Only */}
              {role === 'ops' && !isClosed && formData.feasibilityDecision && (
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '6px',
                    border: '1.5px solid #09090b',
                    backgroundColor: '#fafafa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b', display: 'block' }}>
                      Feasibility Decision Selected: {formData.feasibilityDecision.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#71717a' }}>
                      Open the complete 8-stage preview popup to review all details, confirm verification, and submit.
                    </span>
                  </div>

                  <button
                    onClick={() => setIsPreviewModalOpen(true)}
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      backgroundColor: '#09090b',
                      color: '#ffffff',
                      border: '1px solid #09090b',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Open Full Review Popup
                  </button>
                </div>
              )}
            </div>
          )}
          </div>

          {/* ── Bottom Action Navigation Bar ── */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: '8px',
              padding: '0.85rem 1.25rem',
            }}
          >
            {/* Previous */}
            <button
              disabled={currentStage === 1}
              onClick={() => setCurrentStage((p) => Math.max(1, p - 1))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                height: '36px',
                padding: '0 1rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                backgroundColor: currentStage === 1 ? '#f4f4f5' : '#ffffff',
                border: '1px solid #d4d4d8',
                borderRadius: '6px',
                color: currentStage === 1 ? '#a1a1aa' : '#09090b',
                cursor: currentStage === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ArrowLeft size={14} />
              <span>Previous</span>
            </button>

            {/* Right: Next Section, Save Draft, or Submit */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {role === 'ops' && !isClosed && (
                <button
                  onClick={handleSaveDraft}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    height: '36px',
                    padding: '0 1.15rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    backgroundColor: '#ffffff',
                    border: isCurrentStageSaved ? '1px solid #09090b' : '2px solid #09090b',
                    borderRadius: '6px',
                    color: '#09090b',
                    cursor: 'pointer',
                  }}
                >
                  <Save size={14} />
                  <span>Save Draft</span>
                  {isCurrentStageSaved && <Check size={13} strokeWidth={3} />}
                </button>
              )}

              {isClosed ? (
                currentStage < 8 ? (
                  <button
                    onClick={() => setCurrentStage((p) => Math.min(8, p + 1))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      height: '36px',
                      padding: '0 1.25rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      backgroundColor: '#09090b',
                      color: '#ffffff',
                      border: '1px solid #09090b',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <span>Next Section</span>
                    <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    onClick={() => router.push(`/projects/${propProjectId || activeProject?.id || ''}/overview`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      height: '36px',
                      padding: '0 1.25rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      backgroundColor: '#09090b',
                      color: '#ffffff',
                      border: '1px solid #09090b',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Overview</span>
                  </button>
                )
              ) : isPilot ? (
                currentStage < 8 ? (
                  <button
                    onClick={() => setCurrentStage((p) => Math.min(8, p + 1))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      height: '36px',
                      padding: '0 1.25rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      backgroundColor: '#09090b',
                      color: '#ffffff',
                      border: '1px solid #09090b',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <span>Next Section</span>
                    <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    onClick={() => router.push(`/projects/${propProjectId || activeProject?.id || ''}/overview`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      height: '36px',
                      padding: '0 1.25rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      backgroundColor: '#09090b',
                      color: '#ffffff',
                      border: '1px solid #09090b',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Overview</span>
                  </button>
                )
              ) : isClient ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  {currentStage < 8 && (
                    <button
                      onClick={() => setCurrentStage((p) => Math.min(8, p + 1))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        height: '36px',
                        padding: '0 1.25rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        backgroundColor: '#09090b',
                        color: '#ffffff',
                        border: '1px solid #09090b',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      <span>Next Section</span>
                      <ArrowRight size={14} />
                    </button>
                  )}
                  {(planningWorkflowStatus === 'awaiting_clarity' || planningWorkflowStatus === 'clarification_submitted') && (
                    <button
                      onClick={handleSubmitClarificationsToOps}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        height: '36px',
                        padding: '0 1.25rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        backgroundColor: currentStage === 8 ? '#09090b' : '#ffffff',
                        color: currentStage === 8 ? '#ffffff' : '#09090b',
                        border: '1px solid #09090b',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      <Check size={14} strokeWidth={3} />
                      <span>Submit Clarifications to LATRICS Ops</span>
                    </button>
                  )}
                </div>
              ) : currentStage < 8 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={handleProceedNextSection}
                    title="Proceed to next section"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      height: '36px',
                      padding: '0 1.25rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      backgroundColor: '#09090b',
                      color: '#ffffff',
                      border: '1px solid #09090b',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <span>Next Section</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (!formData.feasibilityDecision) {
                      showToast('Please select a Feasibility Determination option.');
                      return;
                    }
                    setIsPreviewModalOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    height: '36px',
                    padding: '0 1.35rem',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    border: '1px solid #09090b',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <FileCheck size={14} />
                  <span>Review &amp; Submit Planning</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Column 3: Request Summary Panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: '8px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.65rem' }}>
              <FileText size={16} color="#09090b" />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
                Request Summary
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.775rem' }}>
              <div>
                <span style={{ color: '#71717a', display: 'block', fontSize: '0.7rem' }}>Request ID</span>
                <strong style={{ color: '#09090b' }}>{displayRequestId}</strong>
              </div>

              <div>
                <span style={{ color: '#71717a', display: 'block', fontSize: '0.7rem' }}>Project Name</span>
                <strong style={{ color: '#09090b' }}>{displayProjectName}</strong>
              </div>

              <div>
                <span style={{ color: '#71717a', display: 'block', fontSize: '0.7rem' }}>Client Company</span>
                <strong style={{ color: '#09090b' }}>{displayClientCompany}</strong>
              </div>

              <div>
                <span style={{ color: '#71717a', display: 'block', fontSize: '0.7rem' }}>Location</span>
                <strong style={{ color: '#09090b', lineHeight: 1.3, display: 'block' }}>
                  {displayLocation}
                </strong>
              </div>

              <div>
                <span style={{ color: '#71717a', display: 'block', fontSize: '0.7rem' }}>Area to Cover</span>
                <strong style={{ color: '#09090b' }}>{displayArea}</strong>
              </div>

              <div>
                <span style={{ color: '#71717a', display: 'block', fontSize: '0.7rem' }}>Requested Payload</span>
                <strong style={{ color: '#09090b' }}>{displayPayload}</strong>
              </div>

              <div>
                <span style={{ color: '#71717a', display: 'block', fontSize: '0.7rem' }}>Requested Deliverables</span>
                <strong style={{ color: '#09090b' }}>{displayDeliverables}</strong>
              </div>

              <div style={{ paddingTop: '0.25rem' }}>
                <span style={{ color: '#71717a', display: 'block', fontSize: '0.7rem', marginBottom: '0.25rem' }}>Current Status</span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #d4d4d8',
                    backgroundColor: '#f4f4f5',
                    color: '#09090b',
                    display: 'inline-block',
                  }}
                >
                  {displayStatus}
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: '8px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={15} color="#09090b" />
              <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b' }}>
                Need Help?
              </span>
            </div>

            <p style={{ fontSize: '0.725rem', color: '#71717a', lineHeight: 1.35, margin: 0 }}>
              {role === 'client'
                ? 'Have questions about these planning stages? Reply directly in the remark threads or contact LATRICS support.'
                : 'If you need additional information, you can request clarification or contact the client.'}
            </p>

            <button
              onClick={() => showToast(role === 'client' ? 'Support contact request noted.' : 'Internal note modal requested.')}
              style={{
                width: '100%',
                padding: '0.45rem 0.5rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: '#ffffff',
                border: '1px solid #09090b',
                borderRadius: '6px',
                color: '#09090b',
                cursor: 'pointer',
              }}
            >
              {role === 'client' ? 'Contact Support' : 'Add Internal Note'}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── FULL FORM SCROLLABLE PREVIEW POPUP (STAGES 1 TO 8) ── */}
      {/* ========================================================================= */}
      {isPreviewModalOpen && (
        <Portal>
          <div
            className="viewport-modal-backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              padding: '1.5rem',
            }}
          >
          <div
            style={{
              width: '100%',
              maxWidth: '860px',
              backgroundColor: '#ffffff',
              border: '2px solid #09090b',
              borderRadius: '8px',
              boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e4e4e7',
                backgroundColor: '#fafafa',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                  {formData.feasibilityDecision === 'need_clarity'
                    ? 'Planning Preview — Send Clarification Request'
                    : 'Planning & Feasibility Full Review (Stages 1 — 8)'}
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#71717a', margin: '0.2rem 0 0' }}>
                  {formData.feasibilityDecision === 'need_clarity'
                    ? 'Review all entered parameters, remarks, and attached files below before dispatching the clarification request to the client.'
                    : 'Scroll from top to bottom to inspect all stage entries, remarks, and feasibility determination before confirming submission.'}
                </p>
              </div>

              <button
                onClick={() => setIsPreviewModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#09090b',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div
              style={{
                padding: '1.5rem',
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              {/* Project Header Card in Preview */}
              <div
                style={{
                  padding: '0.85rem 1rem',
                  border: '1px solid #09090b',
                  borderRadius: '6px',
                  backgroundColor: '#f4f4f5',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.8rem',
                }}
              >
                <div>
                  <strong>{displayProjectName}</strong> ({displayRequestId}) | <span>{displayClientCompany}</span>
                </div>
                <div style={{ fontWeight: 800, textTransform: 'uppercase' }}>
                  Decision: {formData.feasibilityDecision || 'Pending'}
                </div>
              </div>

              {/* Stage 1 Section */}
              <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
                <strong style={{ fontSize: '0.85rem', color: '#09090b', display: 'block', marginBottom: '0.5rem' }}>
                  1. KML Findings
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.775rem', color: '#52525b' }}>
                  <div>Client KML: <strong style={{ color: '#09090b' }}>{formData.kmlFileName || backendKmlFile?.name || '—'}</strong> ({formData.kmlFileSize || backendKmlFile?.size || '—'})</div>
                  <div>Calculated Area: <strong style={{ color: '#09090b' }}>{formData.kmlCalculatedArea ? `${formData.kmlCalculatedArea} sq km` : '—'}</strong></div>
                  <div>Requested Area: <strong style={{ color: '#09090b' }}>{formData.kmlRequestedArea ? `${formData.kmlRequestedArea} sq km` : '—'}</strong></div>
                  <div>Dispute & Boundary: <strong style={{ color: '#09090b' }}>{formData.kmlBoundaryStatus || '—'}</strong></div>
                </div>
                {(stageThreads[1] || []).length > 0 && (
                  <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #e4e4e7', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: '#09090b' }}>Stage 1 Remarks ({stageThreads[1].length}):</span>
                    {stageThreads[1].map((t) => (
                      <div key={t.id} style={{ marginTop: '0.35rem', color: '#52525b' }}>
                        • <strong>{t.author}</strong> ({t.role}): {t.content} {t.attachment && `[Attached: ${t.attachment.name}]`}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stage 2 Section */}
              <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
                <strong style={{ fontSize: '0.85rem', color: '#09090b', display: 'block', marginBottom: '0.5rem' }}>
                  2. Regularity and Airspace
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.775rem', color: '#52525b' }}>
                  <div>Zones: <strong style={{ color: '#09090b' }}>{formData.airspaceZones.join(', ') || 'None selected'}</strong></div>
                  <div>Police Intimation: <strong style={{ color: '#09090b' }}>{formData.policeIntimationRequired || '—'}</strong></div>
                </div>
                {(stageThreads[2] || []).length > 0 && (
                  <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #e4e4e7', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: '#09090b' }}>Stage 2 Remarks ({stageThreads[2].length}):</span>
                    {stageThreads[2].map((t) => (
                      <div key={t.id} style={{ marginTop: '0.35rem', color: '#52525b' }}>
                        • <strong>{t.author}</strong> ({t.role}): {t.content} {t.attachment && `[Attached: ${t.attachment.name}]`}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stage 3 Section */}
              <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
                <strong style={{ fontSize: '0.85rem', color: '#09090b', display: 'block', marginBottom: '0.5rem' }}>
                  3. Accessibility and Feasibility
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.775rem', color: '#52525b' }}>
                  <div>Terrain Types: <strong style={{ color: '#09090b' }}>{formData.terrainTypes.join(', ') || formData.terrainType || '—'}</strong></div>
                  <div>Elevation: <strong style={{ color: '#09090b' }}>{formData.elevationVariationMeters ? `${formData.elevationVariationMeters} m` : '—'}</strong></div>
                  <div>Weather: <strong style={{ color: '#09090b' }}>{formData.weatherConditions.join(', ') || 'None'}</strong></div>
                  <div>Field Access Identified: <strong style={{ color: '#09090b' }}>{formData.fieldAccessIdentified ? 'Yes' : 'No'}</strong></div>
                </div>
                {(stageThreads[3] || []).length > 0 && (
                  <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #e4e4e7', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: '#09090b' }}>Stage 3 Remarks ({stageThreads[3].length}):</span>
                    {stageThreads[3].map((t) => (
                      <div key={t.id} style={{ marginTop: '0.35rem', color: '#52525b' }}>
                        • <strong>{t.author}</strong> ({t.role}): {t.content} {t.attachment && `[Attached: ${t.attachment.name}]`}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stage 4 Section */}
              <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
                <strong style={{ fontSize: '0.85rem', color: '#09090b', display: 'block', marginBottom: '0.5rem' }}>
                  4. Obstacles and Hazards
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.775rem', color: '#52525b' }}>
                  <div>Identified Hazards: <strong style={{ color: '#09090b' }}>{formData.hazards.join(', ') || 'None reported'}</strong></div>
                  <div>Max Obstacle Height: <strong style={{ color: '#09090b' }}>{formData.maxObstacleHeightMeters ? `${formData.maxObstacleHeightMeters} m` : '—'}</strong></div>
                  <div>Safety Buffer Distance: <strong style={{ color: '#09090b' }}>{formData.safetyBufferDistanceMeters ? `${formData.safetyBufferDistanceMeters} m` : '—'}</strong></div>
                </div>
                {(stageThreads[4] || []).length > 0 && (
                  <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #e4e4e7', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: '#09090b' }}>Stage 4 Remarks ({stageThreads[4].length}):</span>
                    {stageThreads[4].map((t) => (
                      <div key={t.id} style={{ marginTop: '0.35rem', color: '#52525b' }}>
                        • <strong>{t.author}</strong> ({t.role}): {t.content} {t.attachment && `[Attached: ${t.attachment.name}]`}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stage 5 Section */}
              <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
                <strong style={{ fontSize: '0.85rem', color: '#09090b', display: 'block', marginBottom: '0.5rem' }}>
                  5. GCP Planning
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.775rem', color: '#52525b' }}>
                  <div>GCPs Needed: <strong style={{ color: '#09090b' }}>{formData.gcpsNeeded || '—'}</strong></div>
                  <div>GCP Target Size: <strong style={{ color: '#09090b' }}>{formData.gcpTargetSizeCm ? `${formData.gcpTargetSizeCm} cm` : '—'}</strong></div>
                  <div>GCP Material: <strong style={{ color: '#09090b' }}>{formData.gcpTargetMaterial || '—'}</strong></div>
                  <div>GCP Location Attachment: <strong style={{ color: '#09090b' }}>{formData.gcpLocationFile || '—'}</strong></div>
                </div>
                {(stageThreads[5] || []).length > 0 && (
                  <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #e4e4e7', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: '#09090b' }}>Stage 5 Remarks ({stageThreads[5].length}):</span>
                    {stageThreads[5].map((t) => (
                      <div key={t.id} style={{ marginTop: '0.35rem', color: '#52525b' }}>
                        • <strong>{t.author}</strong> ({t.role}): {t.content} {t.attachment && `[Attached: ${t.attachment.name}]`}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stage 6 Section */}
              <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
                <strong style={{ fontSize: '0.85rem', color: '#09090b', display: 'block', marginBottom: '0.5rem' }}>
                  6. Flight Planning
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.775rem', color: '#52525b' }}>
                  <div>Number of Landings: <strong style={{ color: '#09090b' }}>{formData.numberOfLandings || '—'}</strong></div>
                  <div>Planned Altitude: <strong style={{ color: '#09090b' }}>{formData.plannedAltitudeMeters ? `${formData.plannedAltitudeMeters} m AGL` : '—'}</strong></div>
                  <div>Front Overlap: <strong style={{ color: '#09090b' }}>{formData.frontOverlapPercent ? `${formData.frontOverlapPercent}%` : '—'}</strong></div>
                  <div>Side Overlap: <strong style={{ color: '#09090b' }}>{formData.sideOverlapPercent ? `${formData.sideOverlapPercent}%` : '—'}</strong></div>
                </div>
                {(stageThreads[6] || []).length > 0 && (
                  <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #e4e4e7', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: '#09090b' }}>Stage 6 Remarks ({stageThreads[6].length}):</span>
                    {stageThreads[6].map((t) => (
                      <div key={t.id} style={{ marginTop: '0.35rem', color: '#52525b' }}>
                        • <strong>{t.author}</strong> ({t.role}): {t.content} {t.attachment && `[Attached: ${t.attachment.name}]`}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stage 7 Section */}
              <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
                <strong style={{ fontSize: '0.85rem', color: '#09090b', display: 'block', marginBottom: '0.5rem' }}>
                  7. Expected Timelines
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.775rem', color: '#52525b' }}>
                  <div>Survey Days: <strong style={{ color: '#09090b' }}>{formData.expectedSurveyDays || '—'}</strong></div>
                  <div>Expected Start: <strong style={{ color: '#09090b' }}>{formData.expectedStartDate || '—'}</strong></div>
                  <div>Expected End: <strong style={{ color: '#09090b' }}>{formData.expectedEndDate || '—'}</strong></div>
                  <div>Pilot Travel: <strong style={{ color: '#09090b' }}>{formData.pilotTravelDate || '—'}</strong></div>
                  <div>Data Delivery: <strong style={{ color: '#09090b' }}>{formData.dataDeliveryTimelineDays ? `${formData.dataDeliveryTimelineDays} days` : '—'}</strong></div>
                </div>
                {(stageThreads[7] || []).length > 0 && (
                  <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #e4e4e7', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: '#09090b' }}>Stage 7 Remarks ({stageThreads[7].length}):</span>
                    {stageThreads[7].map((t) => (
                      <div key={t.id} style={{ marginTop: '0.35rem', color: '#52525b' }}>
                        • <strong>{t.author}</strong> ({t.role}): {t.content} {t.attachment && `[Attached: ${t.attachment.name}]`}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stage 8 Section */}
              <div style={{ border: '2px solid #09090b', borderRadius: '6px', padding: '1rem', backgroundColor: '#fafafa' }}>
                <strong style={{ fontSize: '0.85rem', color: '#09090b', display: 'block', marginBottom: '0.5rem' }}>
                  8. Feasible to Proceed
                </strong>
                <div style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Decision: {formData.feasibilityDecision || 'None Selected'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#52525b', marginBottom: '0.5rem' }}>
                  LATRICS Operational Remarks: {formData.decisionRemarks || 'No formal remarks provided.'}
                </div>
                {(stageThreads[8] || []).length > 0 && (
                  <div style={{ marginTop: '0.5rem', borderTop: '1px dashed #d4d4d8', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: '#09090b' }}>Stage 8 Discussion Remarks ({stageThreads[8].length}):</span>
                    {stageThreads[8].map((t) => (
                      <div key={t.id} style={{ marginTop: '0.35rem', color: '#52525b' }}>
                        • <strong>{t.author}</strong> ({t.role}): {t.content} {t.attachment && `[Attached: ${t.attachment.name}]`}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mandatory Confirmation Checkbox inside scrollable popup */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  borderRadius: '6px',
                  border: '1.5px dashed #09090b',
                  backgroundColor: '#ffffff',
                }}
              >
                <input
                  type="checkbox"
                  id="popup-confirm-check"
                  checked={formData.reviewConfirmed}
                  onChange={(e) => updateField('reviewConfirmed', e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#09090b' }}
                />
                <label htmlFor="popup-confirm-check" style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b', cursor: 'pointer' }}>
                  {formData.feasibilityDecision === 'need_clarity'
                    ? 'I have reviewed Sections 1–7 and confirm dispatching this clarification request and remarks to the client.'
                    : formData.feasibilityDecision === 'yes'
                    ? 'I confirm that all stages are verified and this survey plan is feasible to proceed for client sign-off.'
                    : 'I have reviewed all stages from top to bottom and confirm these operational planning determinations.'}
                </label>
              </div>
            </div>

            {/* Modal Footer with Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.5rem',
                borderTop: '1px solid #e4e4e7',
                backgroundColor: '#fafafa',
              }}
            >
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                style={{
                  height: '36px',
                  padding: '0 1rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  border: '1px solid #d4d4d8',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Close &amp; Modify Form
              </button>

              <button
                disabled={!formData.reviewConfirmed}
                onClick={handleConfirmFinalSubmit}
                style={{
                  height: '36px',
                  padding: '0 1.5rem',
                  fontSize: '0.825rem',
                  fontWeight: 800,
                  backgroundColor: formData.reviewConfirmed ? '#09090b' : '#f4f4f5',
                  color: formData.reviewConfirmed ? '#ffffff' : '#a1a1aa',
                  border: formData.reviewConfirmed ? '1px solid #09090b' : '1px solid #d4d4d8',
                  borderRadius: '4px',
                  cursor: formData.reviewConfirmed ? 'pointer' : 'not-allowed',
                }}
              >
                {formData.feasibilityDecision === 'need_clarity'
                  ? 'Confirm & Send Clarification Request to Client'
                  : formData.feasibilityDecision === 'yes'
                  ? 'Confirm Feasibility & Request Client Agreement'
                  : 'Confirm & Submit Determination'}
              </button>
            </div>
          </div>
        </div>
      </Portal>
    )}

      {/* ── Submission Confirmation Success Modal ── */}
      {isSubmittedSuccess && (
        <Portal>
          <div
            className="viewport-modal-backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '480px',
                backgroundColor: '#ffffff',
                border: '2px solid #09090b',
                borderRadius: '8px',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  border: '2px solid #09090b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#fafafa',
                }}
              >
                <Check size={24} color="#09090b" strokeWidth={3} />
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                {formData.feasibilityDecision === 'need_clarity'
                  ? 'Clarification Request Dispatched'
                  : formData.feasibilityDecision === 'yes'
                  ? 'Operational Plan Marked Feasible'
                  : 'Planning Determination Submitted'}
              </h3>

              <p style={{ fontSize: '0.825rem', color: '#52525b', lineHeight: 1.5, margin: 0 }}>
                {formData.feasibilityDecision === 'need_clarity'
                  ? 'Sections 1–7 remarks and clarification points have been sent to the client. The client can now review and respond directly from their Plan Review portal.'
                  : formData.feasibilityDecision === 'yes'
                  ? 'Plan feasibility has been confirmed. The plan is now available for client sign-off and progression to the mobilization phase.'
                  : 'Your planning decisions and remarks have been successfully recorded in the central audit ledger.'}
              </p>

              <button
                onClick={() => setIsSubmittedSuccess(false)}
                style={{
                  marginTop: '0.75rem',
                  height: '38px',
                  padding: '0 1.5rem',
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
