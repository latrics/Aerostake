'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Save,
  ArrowLeft,
  Check,
  ChevronRight,
  Lock,
  History,
} from 'lucide-react';
import { requestApi } from '@/modules/requests/api';
import { projectApi } from '@/modules/projects/api';
import { planningApi } from '@/modules/planning/api';
import { markPlanningVersionAsSeen } from '@/modules/requests/notifications';
import { useAuth } from '@/lib/auth';
import { Role, isLatricsRole } from '@/lib/role';
import { formatDateTimeDDMMYYYY } from '@/lib/date';
import { Portal } from '@/components/Portal';

import {
  PlanningFormData,
  ThreadMessage,
  ClarificationThread,
  FeasibilityStageItem,
} from './feasibility/types';
import { StageDiscussionThread } from './feasibility/StageDiscussionThread';
import { Stage1KmlFindings } from './feasibility/Stage1KmlFindings';
import { Stage2Airspace } from './feasibility/Stage2Airspace';
import { Stage3Accessibility } from './feasibility/Stage3Accessibility';
import { Stage4Obstacles } from './feasibility/Stage4Obstacles';
import { Stage5GcpPlanning } from './feasibility/Stage5GcpPlanning';
import { Stage6FlightPlanning } from './feasibility/Stage6FlightPlanning';
import { Stage7ExpectedTimelines } from './feasibility/Stage7ExpectedTimelines';
import { Stage8FeasibleDecision } from './feasibility/Stage8FeasibleDecision';
import { FeasibilityStepNavigation } from './feasibility/FeasibilityStepNavigation';
import { FeasibilityRequestSummary } from './feasibility/FeasibilityRequestSummary';
import { FeasibilityBottomBar } from './feasibility/FeasibilityBottomBar';
import { FeasibilityHistoryModal } from './feasibility/FeasibilityHistoryModal';
import { FeasibilityPreviewModal } from './feasibility/FeasibilityPreviewModal';
import { ClientMobilizationCard } from './feasibility/ClientMobilizationCard';
import { FeasibilityWorkflowBanners } from './feasibility/FeasibilityWorkflowBanners';

export type { ThreadMessage, ClarificationThread, PlanningFormData } from './feasibility/types';

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

  // Backend Loaded Request Information
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
  const [planningWorkflowStatus, setPlanningWorkflowStatus] = useState<string>('draft');

  // Client declaration confirmation state
  const [clientDeclarationConfirmed, setClientDeclarationConfirmed] = useState<boolean>(false);
  const [isMobilizingTransitioning, setIsMobilizingTransitioning] = useState<boolean>(false);

  // Stage 8 Full Form Preview Popup state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState<boolean>(false);

  // Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Info popup hover state
  const [showInfoTooltip, setShowInfoTooltip] = useState<boolean>(false);

  // Form Data
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

  // Stage 3 Clarification Threads
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
  ]);

  // 1. Fetch backend data
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

            const latestVer = versions && versions.length > 0 ? versions[0] : null;
            if (latestVer) {
              setActiveVersionCode(latestVer.version_code);
              setLatestSender(latestVer.sender);
              if (latestVer.status) {
                setPlanningWorkflowStatus(latestVer.status);
              }
              markPlanningVersionAsSeen(targetProjId, latestVer.version_code, latestVer.created_at);
            }

            if (isOps) {
              const mergedThreads = mergeStageThreads(latestVer?.stage_threads, dbDraft?.stage_threads);
              if (Object.values(mergedThreads).some((arr) => arr.length > 0)) {
                setStageThreads(mergedThreads);
              } else if (latestVer?.stage_threads) {
                setStageThreads(latestVer.stage_threads);
              }

              const clar =
                dbDraft?.clarification_threads && dbDraft.clarification_threads.length > 0
                  ? dbDraft.clarification_threads
                  : (latestVer?.clarification_threads || null);
              if (clar && clar.length > 0) {
                setClarificationThreads(clar);
              }

              const formSource =
                dbDraft?.form_data && Object.keys(dbDraft.form_data).length > 0
                  ? dbDraft.form_data
                  : latestVer?.form_data;
              if (formSource && Object.keys(formSource).length > 0) {
                setFormData((prev) => ({ ...prev, ...formSource }));
              }

              if (dbDraft?.stage_draft_saved && Object.keys(dbDraft.stage_draft_saved).length > 0) {
                setStageDraftSaved(dbDraft.stage_draft_saved);
              }

              if (dbDraft?.status) {
                setPlanningWorkflowStatus(dbDraft.status);
              } else if (latestVer?.status) {
                setPlanningWorkflowStatus(latestVer.status);
              }
            } else {
              if (latestVer?.stage_threads) {
                setStageThreads(latestVer.stage_threads);
              }
              if (latestVer?.clarification_threads && latestVer.clarification_threads.length > 0) {
                setClarificationThreads(latestVer.clarification_threads);
              }
              if (latestVer?.form_data && Object.keys(latestVer.form_data).length > 0) {
                setFormData((prev) => ({ ...prev, ...latestVer.form_data }));
              }
              if (latestVer?.status) {
                setPlanningWorkflowStatus(latestVer.status);
              }
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
  }, [propRequestId, propProjectId, isOps, mergeStageThreads]);

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
    formData.kmlCalculatedArea
      ? `${formData.kmlCalculatedArea} sq km`
      : activeProject?.target_area_sqkm || activeProject?.calculated_area_sqkm || reqPayload.target_area_sqkm || reqPayload.requested_area_sqkm || reqPayload.area || reqPayload.area_sq_km || activeProject?.area_sq_km
      ? `${activeProject?.target_area_sqkm || activeProject?.calculated_area_sqkm || reqPayload.target_area_sqkm || reqPayload.requested_area_sqkm || reqPayload.area || reqPayload.area_sq_km || activeProject?.area_sq_km} sq km`
      : '—';

  const displayPayload =
    reqPayload.payload_sensor ||
    reqPayload.sensor ||
    activeRequest?.survey_type ||
    activeProject?.survey_type ||
    '—';

  const displayDeliverables = useMemo(() => {
    const raw = reqPayload.post_processing_deliverables || reqPayload.deliverables;
    if (Array.isArray(raw) && raw.length > 0) return raw.join(', ');
    if (typeof raw === 'string' && raw.trim()) return raw;
    return '—';
  }, [reqPayload]);

  const displayStatus = activeRequest?.project_status || activeProject?.status || 'Under Planning';

  const displaySubmittedDate = useMemo(() => {
    const dateVal = activeRequest?.created_at || activeProject?.created_at;
    if (!dateVal) return '—';
    return formatDateTimeDDMMYYYY(dateVal);
  }, [activeRequest?.created_at, activeProject?.created_at]);

  const clientRequestedTenureDays = useMemo(() => {
    const raw = reqPayload.tenure_days ?? reqPayload.tenure ?? activeProject?.tenure_days ?? activeRequest?.tenure_days;
    if (raw !== undefined && raw !== null && raw !== '') {
      const num = Number(raw);
      if (!isNaN(num) && num > 0) return num;
    }
    const sDate = reqPayload.start_date || reqPayload.startDate || activeProject?.start_date || activeRequest?.start_date;
    const eDate = reqPayload.end_date || reqPayload.endDate || activeProject?.end_date || activeRequest?.end_date;
    if (sDate && eDate) {
      try {
        const d1 = new Date(sDate);
        const d2 = new Date(eDate);
        const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
        if (diff > 0) return diff;
      } catch {}
    }
    return null;
  }, [reqPayload, activeProject, activeRequest]);

  const clientRequestedStartDate = useMemo(() => {
    return (
      reqPayload.start_date ||
      reqPayload.startDate ||
      activeProject?.start_date ||
      activeRequest?.start_date ||
      null
    );
  }, [reqPayload, activeProject, activeRequest]);

  const clientRequestedEndDate = useMemo(() => {
    return (
      reqPayload.end_date ||
      reqPayload.endDate ||
      activeProject?.end_date ||
      activeRequest?.end_date ||
      null
    );
  }, [reqPayload, activeProject, activeRequest]);

  const isNotFeasible = useMemo(() => {
    return (
      planningWorkflowStatus === 'not_feasible' ||
      planningWorkflowStatus === 'no' ||
      activeProject?.status === 'cancelled' ||
      activeRequest?.project_status === 'cancelled'
    );
  }, [planningWorkflowStatus, activeProject?.status, activeRequest?.project_status]);

  const isClosed = useMemo(() => {
    if (planningVersions.length === 0 && !planningWorkflowStatus) return false;
    const pStatus = activeProject?.status?.toLowerCase();
    const rStatus = activeRequest?.project_status?.toLowerCase();
    const wStatus = planningWorkflowStatus?.toLowerCase();
    const closedStatuses = ['mobilising', 'active', 'in_progress', 'completed', 'approved'];

    if (pStatus === 'submitted' || pStatus === 'draft' || pStatus === 'planning' || rStatus === 'submitted' || rStatus === 'draft') {
      return closedStatuses.includes(wStatus || '');
    }

    return (
      closedStatuses.includes(pStatus || '') ||
      closedStatuses.includes(rStatus || '') ||
      closedStatuses.includes(wStatus || '')
    );
  }, [planningWorkflowStatus, activeProject?.status, activeRequest?.project_status, planningVersions.length]);

  useEffect(() => {
    if (!isClient && !isClosed) {
      setFormData((prev) => {
        let changed = false;
        const next = { ...prev };
        if (!next.expectedSurveyDays && clientRequestedTenureDays) {
          next.expectedSurveyDays = String(clientRequestedTenureDays);
          changed = true;
        }
        if (!next.expectedStartDate && clientRequestedStartDate) {
          next.expectedStartDate = clientRequestedStartDate;
          changed = true;
        }
        if (!next.expectedEndDate && clientRequestedEndDate) {
          next.expectedEndDate = clientRequestedEndDate;
          changed = true;
        }
        return changed ? next : prev;
      });
    }
  }, [clientRequestedTenureDays, clientRequestedStartDate, clientRequestedEndDate, isClient, isClosed]);

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

  // Purge stale dummy seed data
  useEffect(() => {
    if (typeof window === 'undefined') return;
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
    } catch {}

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

  // Sync to Backend Planning Draft
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

  // Version Polling
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
        const vers = await planningApi.listPlanningVersions(targetProjId).catch(() => []);
        if (vers && vers.length > 0) {
          const latest = vers[0];
          if (latest.version_code !== activeVersionCodeRef.current) {
            activeVersionCodeRef.current = latest.version_code;
            setActiveVersionCode(latest.version_code);
            setLatestSender(latest.sender);
            setPlanningVersions(vers);
            if (latest.status) setPlanningWorkflowStatus(latest.status);

            if (latest.stage_threads) {
              setStageThreads(latest.stage_threads);
            }
            if (latest.clarification_threads) {
              setClarificationThreads(latest.clarification_threads);
            }
            if (latest.form_data && Object.keys(latest.form_data).length > 0) {
              setFormData((prev) => ({ ...prev, ...latest.form_data }));
            }
          }
        }
      } catch {}
    }, 4000);

    return () => clearInterval(interval);
  }, [activeProject?.id, activeRequest?.project_id, propProjectId]);

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

  // Auto-save draft on modification for Ops
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
      if (targetProjId && isOps) {
        draftData = await planningApi.getPlanningDraft(targetProjId).catch(() => null);
      }
      let versions: any[] = [];
      if (targetProjId) {
        versions = await planningApi.listPlanningVersions(targetProjId).catch(() => []);
      }

      const latestVer = versions && versions.length > 0 ? versions[0] : null;

      if (isOps) {
        const merged = mergeStageThreads(latestVer?.stage_threads, draftData?.stage_threads || stageThreads);
        if (Object.values(merged).some((arr) => arr.length > 0)) {
          setStageThreads(merged);
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
      } else {
        if (latestVer?.stage_threads) {
          setStageThreads(latestVer.stage_threads);
        }
        if (latestVer?.clarification_threads && latestVer.clarification_threads.length > 0) {
          setClarificationThreads(latestVer.clarification_threads);
        }
        if (latestVer?.form_data && Object.keys(latestVer.form_data).length > 0) {
          setFormData((prev) => ({ ...prev, ...latestVer.form_data }));
        }
        if (latestVer?.status) {
          setPlanningWorkflowStatus(latestVer.status);
        }
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
      isPendingSubmit: true,
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

    await syncToBackend(updatedThreads, clarificationThreads, formData, planningWorkflowStatus);
    showToast(
      isSubordinate
        ? `Subordinate remark posted. Will reflect across application once planning form is submitted.`
        : role === 'client'
        ? `Response posted. Will reflect across application once form is submitted.`
        : `Remark posted for Stage ${stageNum}. Will reflect across application once the 8-stage planning form is submitted.`
    );
  };

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
      isPendingSubmit: true,
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

    await syncToBackend(updatedThreads, clarificationThreads, formData, planningWorkflowStatus);
    showToast(`Reply posted. Will reflect across application once the 8-stage planning form is submitted.`);
  };

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
      }
    }

    const finalizedThreads: Record<number, ThreadMessage[]> = {};
    for (let s = 1; s <= 8; s++) {
      finalizedThreads[s] = (updatedThreads[s] || []).map((m) => ({
        ...m,
        isPendingSubmit: false,
      }));
    }
    setStageThreads(finalizedThreads);

    try {
      const targetProjId = activeProject?.id || propProjectId || activeRequest?.project_id;
      if (targetProjId) {
        const newVer = await planningApi.createPlanningVersion(targetProjId, {
          sender: 'ops',
          sender_name: user?.full_name || 'Admin (LATRICS Ops)',
          form_data: formData,
          stage_threads: finalizedThreads,
          clarification_threads: clarificationThreads,
          status: nextStatus,
        });
        setActiveVersionCode(newVer.version_code);
        setLatestSender(newVer.sender);
        setPlanningVersions((prev) => [newVer, ...prev]);
        await syncToBackend(finalizedThreads, clarificationThreads, formData, nextStatus, { ...stageDraftSaved, 8: true });
        showToast(
          nextStatus === 'awaiting_clarity'
            ? 'Clarification request dispatched to Client with your remarks.'
            : nextStatus === 'feasible_pending_client_confirmation'
            ? 'Plan marked as Feasible! Sent to Client for agreement sign-off.'
            : 'Operational plan marked as Not Feasible.'
        );

        const targetReqId = activeRequest?.id || (propRequestId ? propRequestId.replace('#', '') : '') || targetProjId;
        setTimeout(() => {
          setIsSubmittedSuccess(false);
          if (targetReqId) {
            router.push(`/requests/${targetReqId}?tab=planning`);
          } else {
            router.push('/requests');
          }
        }, 1800);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to submit planning form.');
    }
  };

  const handleSubmitClarificationsToOps = async () => {
    if (isClient && isNotFeasible) {
      showToast('Project is marked Not Feasible. Submission is locked.');
      return;
    }
    const nextStatus = 'clarification_submitted';
    setPlanningWorkflowStatus(nextStatus);

    const finalizedThreads: Record<number, ThreadMessage[]> = {};
    for (let s = 1; s <= 8; s++) {
      finalizedThreads[s] = (stageThreads[s] || []).map((m) => ({
        ...m,
        isPendingSubmit: false,
      }));
    }
    const finalizedClarifications = clarificationThreads.map((thread) => ({
      ...thread,
      messages: thread.messages.map((m) => ({ ...m, isPendingSubmit: false })),
    }));
    setStageThreads(finalizedThreads);
    setClarificationThreads(finalizedClarifications);

    try {
      const targetProjId = activeProject?.id || propProjectId || activeRequest?.project_id;
      if (targetProjId) {
        const authorName = user?.full_name || activeProject?.client_name || propClientCompany || 'Client Organization';
        const newVer = await planningApi.createPlanningVersion(targetProjId, {
          sender: 'client',
          sender_name: authorName,
          form_data: formData,
          stage_threads: finalizedThreads,
          clarification_threads: finalizedClarifications,
          status: nextStatus,
        });
        setActiveVersionCode(newVer.version_code);
        setLatestSender(newVer.sender);
        setPlanningVersions((prev) => [newVer, ...prev]);
        await syncToBackend(finalizedThreads, finalizedClarifications, formData, nextStatus);
        showToast('Clarifications submitted successfully to LATRICS Ops! All remarks and responses are now published.');
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

  const stages: FeasibilityStageItem[] = useMemo(() => [
    { num: 1, title: 'KML Findings' },
    { num: 2, title: 'Regularity and Airspace' },
    { num: 3, title: 'Accessibility and Feasibility' },
    { num: 4, title: 'Obstacles and Hazards' },
    { num: 5, title: 'GCP Planning' },
    { num: 6, title: 'Flight Planning' },
    { num: 7, title: 'Expected Timelines' },
    { num: 8, title: 'Feasible to Proceed' },
  ], []);

  const isCurrentStageSaved = stageDraftSaved[currentStage] && !isCurrentStageDirty;

  const renderDiscussionThread = (stageNum: number, stageName: string) => (
    <StageDiscussionThread
      stageNum={stageNum}
      stageName={stageName}
      threads={stageThreads[stageNum] || []}
      draftText={stageDraftTexts[stageNum] || ''}
      attachedFile={stageAttachedFiles[stageNum] || null}
      isAddingRemark={!!stageAddingRemark[stageNum]}
      onSetDraftText={(text) => setStageDraftTexts((prev) => ({ ...prev, [stageNum]: text }))}
      onSetAttachedFile={(file) => setStageAttachedFiles((prev) => ({ ...prev, [stageNum]: file }))}
      onSetAddingRemark={(adding) => setStageAddingRemark((prev) => ({ ...prev, [stageNum]: adding }))}
      onPostReview={handlePostReview}
      onReplyToMessage={handleReplyToMessage}
      onRefreshThreads={handleRefreshThreadsFromServer}
      isRefreshing={isRefreshingThreads}
      isClosed={isClosed}
      isPilot={isPilot}
      role={role}
      isSubordinate={isSubordinate}
      threadReplyInputs={threadReplyInputs}
      onSetThreadReplyInput={(id, text) => setThreadReplyInputs((prev) => ({ ...prev, [id]: text }))}
      threadReplyAttachments={threadReplyAttachments}
      onSetThreadReplyAttachment={(id, file) => setThreadReplyAttachments((prev) => ({ ...prev, [id]: file }))}
      activeReplyBoxId={activeReplyBoxId}
      setActiveReplyBoxId={setActiveReplyBoxId}
      onShowToast={showToast}
    />
  );

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
            {/* Information Hover Tooltip */}
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

            {/* Request History Button */}
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
                type="button"
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
                  type="button"
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
                  type="button"
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

      {/* ── Workflow Status Alert Banners ── */}
      <FeasibilityWorkflowBanners
        isViewingHistorical={isViewingHistorical}
        activeVersionCode={activeVersionCode}
        latestSender={latestSender}
        onReturnToActiveVersion={() => {
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
        planningWorkflowStatus={planningWorkflowStatus}
        isNotFeasible={isNotFeasible}
        isClosed={isClosed}
        isClient={isClient}
        role={role}
        formData={formData}
        handleSubmitClarificationsToOps={handleSubmitClarificationsToOps}
        handleOpsResumePlanning={handleOpsResumePlanning}
        planningVersionsCount={planningVersions.length}
        hasStageThreads={Object.values(stageThreads).some((t) => t.length > 0)}
      />

      {/* ── Client Acknowledgement & Mobilization Sign-off Card ── */}
      {planningVersions.length > 0 &&
        !isNotFeasible &&
        (formData.feasibilityDecision === 'yes' ||
          planningWorkflowStatus === 'feasible_pending_client_confirmation' ||
          isClosed) && (
          <ClientMobilizationCard
            formData={formData}
            displayArea={displayArea}
            isClosed={isClosed}
            role={role}
            clientDeclarationConfirmed={clientDeclarationConfirmed}
            setClientDeclarationConfirmed={setClientDeclarationConfirmed}
            isMobilizingTransitioning={isMobilizingTransitioning}
            handleConfirmClientDeclaration={handleConfirmClientDeclaration}
          />
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
        {/* Column 1: Vertical 8-Stage Step Navigation */}
        <FeasibilityStepNavigation
          stages={stages}
          currentStage={currentStage}
          setCurrentStage={setCurrentStage}
          isStageParametersFilled={isStageParametersFilled}
          isClosed={isClosed}
        />

        {/* Column 2: Active Stage Workspace */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {currentStage === 1 && (
              <Stage1KmlFindings
                formData={formData}
                updateField={updateField}
                backendKmlFile={backendKmlFile}
                isClient={isClient}
                isClosed={isClosed}
                onShowToast={showToast}
              >
                {renderDiscussionThread(1, 'KML Findings')}
              </Stage1KmlFindings>
            )}

            {currentStage === 2 && (
              <Stage2Airspace
                formData={formData}
                toggleArrayItem={toggleArrayItem}
                isClient={isClient}
              >
                {renderDiscussionThread(2, 'Regularity and Airspace')}
              </Stage2Airspace>
            )}

            {currentStage === 3 && (
              <Stage3Accessibility
                formData={formData}
                updateField={updateField}
                toggleArrayItem={toggleArrayItem}
                isClient={isClient}
                isClosed={isClosed}
              >
                {renderDiscussionThread(3, 'Accessibility and Feasibility')}
              </Stage3Accessibility>
            )}

            {currentStage === 4 && (
              <Stage4Obstacles
                formData={formData}
                updateField={updateField}
                toggleArrayItem={toggleArrayItem}
                isClient={isClient}
                isClosed={isClosed}
              >
                {renderDiscussionThread(4, 'Obstacles and Hazards')}
              </Stage4Obstacles>
            )}

            {currentStage === 5 && (
              <Stage5GcpPlanning
                formData={formData}
                updateField={updateField}
                isClient={isClient}
                isClosed={isClosed}
              >
                {renderDiscussionThread(5, 'GCP Planning')}
              </Stage5GcpPlanning>
            )}

            {currentStage === 6 && (
              <Stage6FlightPlanning
                formData={formData}
                updateField={updateField}
                isClient={isClient}
                isClosed={isClosed}
              >
                {renderDiscussionThread(6, 'Flight Planning')}
              </Stage6FlightPlanning>
            )}

            {currentStage === 7 && (
              <Stage7ExpectedTimelines
                formData={formData}
                updateField={updateField}
                isClient={isClient}
                isClosed={isClosed}
                clientRequestedTenureDays={clientRequestedTenureDays}
                clientRequestedStartDate={clientRequestedStartDate}
                clientRequestedEndDate={clientRequestedEndDate}
              >
                {renderDiscussionThread(7, 'Expected Timelines')}
              </Stage7ExpectedTimelines>
            )}

            {currentStage === 8 && (
              <Stage8FeasibleDecision
                formData={formData}
                updateField={updateField}
                isClient={isClient}
                isClosed={isClosed}
                role={role}
                handleSelectFeasibilityOption={handleSelectFeasibilityOption}
                setIsPreviewModalOpen={setIsPreviewModalOpen}
                onReplyToOpsRemarks={() => {
                  setStageAddingRemark((prev) => ({ ...prev, [8]: true }));
                  setStageDraftTexts((prev) => ({
                    ...prev,
                    [8]: prev[8] || 'Regarding Operations Decision Remarks: ',
                  }));
                }}
              >
                {renderDiscussionThread(8, 'Feasible to Proceed')}
              </Stage8FeasibleDecision>
            )}
          </div>

          {/* Bottom Action Navigation Bar */}
          <FeasibilityBottomBar
            currentStage={currentStage}
            setCurrentStage={setCurrentStage}
            role={role}
            isClosed={isClosed}
            isPilot={isPilot}
            isClient={isClient}
            isCurrentStageSaved={isCurrentStageSaved}
            handleSaveDraft={handleSaveDraft}
            handleProceedNextSection={handleProceedNextSection}
            handleSubmitClarificationsToOps={handleSubmitClarificationsToOps}
            planningWorkflowStatus={planningWorkflowStatus}
            setIsPreviewModalOpen={setIsPreviewModalOpen}
            feasibilityDecision={formData.feasibilityDecision}
            onShowToast={showToast}
            activeProject={activeProject}
            propProjectId={propProjectId}
            router={router}
          />
        </div>

        {/* Column 3: Request Summary Panel */}
        <FeasibilityRequestSummary
          displayRequestId={displayRequestId}
          displayProjectName={displayProjectName}
          displayClientCompany={displayClientCompany}
          displayLocation={displayLocation}
          displayArea={displayArea}
          displayPayload={displayPayload}
          displayDeliverables={displayDeliverables}
          displayStatus={displayStatus}
          role={role}
          onShowToast={showToast}
        />
      </div>

      {/* ── Request History Modal Dialog ── */}
      <FeasibilityHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        planningVersions={planningVersions}
        activeVersionCode={activeVersionCode}
        displayProjectName={displayProjectName}
        onSelectVersion={(ver, isHistorical) => {
          setActiveVersionCode(ver.version_code);
          setLatestSender(ver.sender);
          if (ver.form_data) setFormData(ver.form_data);
          if (ver.stage_threads) setStageThreads(ver.stage_threads);
          if (ver.clarification_threads) setClarificationThreads(ver.clarification_threads);
          setIsViewingHistorical(isHistorical);
          setHistoryModalOpen(false);
        }}
      />

      {/* ── 8-Stage Full Form Preview Popup Modal ── */}
      <FeasibilityPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        formData={formData}
        updateField={updateField}
        stageThreads={stageThreads}
        handleConfirmFinalSubmit={handleConfirmFinalSubmit}
        backendKmlFile={backendKmlFile}
        displayProjectName={displayProjectName}
        displayRequestId={displayRequestId}
        displayClientCompany={displayClientCompany}
      />

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
                type="button"
                onClick={() => {
                  setIsSubmittedSuccess(false);
                  const targetReqId = activeRequest?.id || (propRequestId ? propRequestId.replace('#', '') : '') || activeProject?.id || propProjectId;
                  if (targetReqId) {
                    router.push(`/requests/${targetReqId}?tab=planning`);
                  } else {
                    router.push('/requests');
                  }
                }}
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
                Go to Planning Overview
              </button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
