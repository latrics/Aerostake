'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from 'lucide-react';
import { requestApi } from '@/modules/requests/api';
import { projectApi } from '@/modules/projects/api';

export interface ThreadMessage {
  id: string;
  author: string;
  role: 'LATRICS' | 'CLIENT';
  timestamp: string;
  content: string;
  attachment?: {
    name: string;
    size: string;
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
  clientCompany?: string;
  projectName?: string;
}

export function ProjectPlanningFeasibilityView({
  requestId: propRequestId,
  clientCompany: propClientCompany,
  projectName: propProjectName,
}: Props) {
  const router = useRouter();

  // Active Stage (1 to 8)
  const [currentStage, setCurrentStage] = useState<number>(1);

  // Backend Loaded Request Information (No hardcoded frontend seed data)
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [isLoadingBackend, setIsLoadingBackend] = useState<boolean>(true);

  // Per-stage draft preservation tracking
  const [stageDraftSaved, setStageDraftSaved] = useState<Record<number, boolean>>({});
  const [isCurrentStageDirty, setIsCurrentStageDirty] = useState<boolean>(false);

  // Stage 8 Full Form Preview Popup state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState<boolean>(false);

  // Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // ── Universal Remarks, Attachments & Discussion Threads across ALL 8 STAGES ──
  const [stageThreads, setStageThreads] = useState<Record<number, ThreadMessage[]>>({
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
    7: [],
    8: [],
  });

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
        const reqs = await requestApi.listAllRequests().catch(() => []);
        let matchedReq = null;
        let matchedProj = null;

        if (propRequestId) {
          const cleanId = propRequestId.replace('#', '').trim();
          matchedReq = reqs.find(
            (r) =>
              r.id === cleanId ||
              String(r.version) === cleanId ||
              `00${r.version}`.endsWith(cleanId)
          );
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
        } else if (propRequestId) {
          matchedProj = await projectApi.getProject(propRequestId).catch(() => null);
          if (matchedProj) {
            setActiveProject(matchedProj);
            const projReqs = await requestApi.listProjectRequests(matchedProj.id).catch(() => []);
            if (projReqs.length > 0) {
              setActiveRequest(projReqs[0]);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load backend request for planning:', err);
      } finally {
        setIsLoadingBackend(false);
      }
    }

    loadBackendData();
  }, [propRequestId]);

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
    const idKey = activeRequest?.id || activeProject?.id || propRequestId || 'default';
    return `latrics_planning_draft_${idKey}`;
  }, [activeRequest?.id, activeProject?.id, propRequestId]);

  // ── 2. Hydrate from localStorage or populate backend requested area / KML ──
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(storageDraftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData) {
          const loadedData = parsed.formData;
          if ((!loadedData.terrainTypes || loadedData.terrainTypes.length === 0) && loadedData.terrainType) {
            loadedData.terrainTypes = [loadedData.terrainType];
          }
          setFormData((prev) => ({ ...prev, ...loadedData }));
        }
        if (parsed.stageThreads) setStageThreads(parsed.stageThreads);
        if (parsed.clarificationThreads) setClarificationThreads(parsed.clarificationThreads);
        if (parsed.stageDraftSaved) setStageDraftSaved(parsed.stageDraftSaved);
        return;
      }
    } catch {
      // Ignore parse error
    }

    if (backendKmlFile) {
      setFormData((prev) => ({
        ...prev,
        kmlFileName: backendKmlFile.name,
        kmlFileSize: backendKmlFile.size || '—',
      }));
    }

    const rawArea = reqPayload.area || reqPayload.area_sq_km || activeProject?.area_sq_km;
    if (rawArea) {
      setFormData((prev) => ({
        ...prev,
        kmlRequestedArea: String(rawArea),
      }));
    }
  }, [storageDraftKey, backendKmlFile, reqPayload.area, reqPayload.area_sq_km, activeProject?.area_sq_km]);

  const updateField = (field: keyof PlanningFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsCurrentStageDirty(true);
    setStageDraftSaved((prev) => ({ ...prev, [currentStage]: false }));
  };

  const toggleArrayItem = (field: 'airspaceZones' | 'weatherConditions' | 'hazards' | 'terrainTypes', item: string) => {
    setFormData((prev) => {
      const list = (prev[field] as string[]) || [];
      const exists = list.includes(item);
      const updated = exists ? list.filter((x) => x !== item) : [...list, item];
      return { ...prev, [field]: updated };
    });
    setIsCurrentStageDirty(true);
    setStageDraftSaved((prev) => ({ ...prev, [currentStage]: false }));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ── Requirement 2: Save Draft per stage to preserve inputs ──
  const handleSaveDraft = useCallback(() => {
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
      localStorage.setItem(storageDraftKey, JSON.stringify(payloadToSave));
      setStageDraftSaved((prev) => ({ ...prev, [currentStage]: true }));
      setIsCurrentStageDirty(false);
      showToast(`Draft preserved for Stage ${currentStage}.`);
    } catch {
      showToast('Draft saved locally.');
    }
  }, [formData, stageThreads, clarificationThreads, stageDraftSaved, currentStage, storageDraftKey]);

  const handleProceedNextSection = () => {
    const isSaved = stageDraftSaved[currentStage] && !isCurrentStageDirty;
    if (!isSaved) {
      showToast(`Please click 'Save Draft' to preserve Stage ${currentStage} before proceeding.`);
      return;
    }
    if (currentStage < 8) {
      setCurrentStage((prev) => prev + 1);
    }
  };

  // ── Universal Post Review Handler for any Stage ──
  const handlePostReview = (stageNum: number) => {
    const text = stageDraftTexts[stageNum]?.trim();
    if (!text) return;

    const newMsg: ThreadMessage = {
      id: `msg-${stageNum}-${Date.now()}`,
      author: 'Admin (LATRICS Ops)',
      role: 'LATRICS',
      timestamp: 'Just now',
      content: text,
      attachment: stageAttachedFiles[stageNum]
        ? { name: stageAttachedFiles[stageNum]!, size: 'Uploaded Document' }
        : undefined,
    };

    setStageThreads((prev) => ({
      ...prev,
      [stageNum]: [...(prev[stageNum] || []), newMsg],
    }));

    setStageDraftTexts((prev) => ({ ...prev, [stageNum]: '' }));
    setStageAttachedFiles((prev) => ({ ...prev, [stageNum]: null }));
    setIsCurrentStageDirty(true);
    setStageDraftSaved((prev) => ({ ...prev, [stageNum]: false }));
    showToast(`Remark added to Stage ${stageNum} discussion thread.`);
  };

  // Reply handler inside any discussion thread
  const handleReplyToMessage = (stageNum: number, parentMessageId: string) => {
    const replyText = threadReplyInputs[parentMessageId]?.trim();
    if (!replyText) return;

    const newMsg: ThreadMessage = {
      id: `reply-${stageNum}-${Date.now()}`,
      author: 'Admin (LATRICS Ops)',
      role: 'LATRICS',
      timestamp: 'Just now',
      content: replyText,
    };

    setStageThreads((prev) => ({
      ...prev,
      [stageNum]: [...(prev[stageNum] || []), newMsg],
    }));

    setThreadReplyInputs((prev) => ({ ...prev, [parentMessageId]: '' }));
    setActiveReplyBoxId(null);
    setIsCurrentStageDirty(true);
    setStageDraftSaved((prev) => ({ ...prev, [stageNum]: false }));
    showToast(`Reply posted to Stage ${stageNum} thread.`);
  };

  // Clarification reply (Stage 3)
  const handleReplyClarification = (threadId: string) => {
    const text = clarificationReplies[threadId]?.trim();
    if (!text) return;

    setClarificationThreads((prev) =>
      prev.map((thread) => {
        if (thread.id === threadId) {
          const newMsg: ThreadMessage = {
            id: `c-${Date.now()}`,
            author: 'Admin (LATRICS Ops)',
            role: 'LATRICS',
            timestamp: 'Just now',
            content: text,
          };
          return { ...thread, messages: [...thread.messages, newMsg] };
        }
        return thread;
      })
    );

    setClarificationReplies((prev) => ({ ...prev, [threadId]: '' }));
    setIsCurrentStageDirty(true);
    setStageDraftSaved((prev) => ({ ...prev, [3]: false }));
    showToast('Clarification reply recorded.');
  };

  // ── Requirement 1: Stage 8 Option selection triggers full preview popup ──
  const handleSelectFeasibilityOption = (option: 'yes' | 'no' | 'need_clarity') => {
    updateField('feasibilityDecision', option);
    setIsPreviewModalOpen(true);
  };

  const handleConfirmFinalSubmit = () => {
    if (!formData.reviewConfirmed) return;
    setIsPreviewModalOpen(false);
    setIsSubmittedSuccess(true);
    try {
      localStorage.removeItem(storageDraftKey);
    } catch {
      // Ignore
    }
  };

  const stages = [
    { num: 1, title: 'KML Findings' },
    { num: 2, title: 'Regularity and Airspace' },
    { num: 3, title: 'Accessibility and Feasibility' },
    { num: 4, title: 'Obstacles and Hazards' },
    { num: 5, title: 'GCP Planning' },
    { num: 6, title: 'Flight Planning' },
    { num: 7, title: 'Expected Timelines' },
    { num: 8, title: 'Feasible to Proceed' },
  ];

  const isCurrentStageSaved = stageDraftSaved[currentStage] && !isCurrentStageDirty;

  // ── Reusable Component: Stage Review, Attachment, and Discussion Thread ──
  const renderStageReviewSection = (stageNum: number, stageName: string) => {
    const threads = stageThreads[stageNum] || [];
    const draftText = stageDraftTexts[stageNum] || '';
    const attachedFile = stageAttachedFiles[stageNum] || null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderTop: '1px solid #e4e4e7', paddingTop: '1.25rem' }}>
        {/* Section Heading */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={16} color="#09090b" />
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
            LATRICS Review, Remarks & Attachments ({stageName})
          </span>
        </div>

        {/* Add Review / Question Composer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
            Add Review / Question (LATRICS)
          </span>

          <div
            style={{
              border: '1px solid #d4d4d8',
              borderRadius: '6px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
            }}
          >
            {/* Toolbar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 0.65rem',
                backgroundColor: '#fafafa',
                borderBottom: '1px solid #e4e4e7',
              }}
            >
              <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#09090b' }}>
                <Bold size={13} />
              </button>
              <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#09090b' }}>
                <Italic size={13} />
              </button>
              <span style={{ color: '#d4d4d8' }}>|</span>
              <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#09090b' }}>
                <List size={13} />
              </button>
              <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#09090b' }}>
                <ListOrdered size={13} />
              </button>
              <span style={{ color: '#d4d4d8' }}>|</span>
              <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#09090b' }}>
                <LinkIcon size={13} />
              </button>
            </div>

            <textarea
              rows={3}
              value={draftText}
              onChange={(e) =>
                setStageDraftTexts((prev) => ({
                  ...prev,
                  [stageNum]: e.target.value,
                }))
              }
              placeholder={`Write findings, remarks, questions, or notes regarding ${stageName}...`}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: 'none',
                outline: 'none',
                fontSize: '0.8rem',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
            <div style={{ textAlign: 'right', padding: '0.25rem 0.75rem', fontSize: '0.7rem', color: '#a1a1aa' }}>
              {draftText.length}/1000
            </div>
          </div>
        </div>

        {/* Attach Files Dropzone */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
            Attach Files (Optional)
          </span>

          <div
            onClick={() =>
              setStageAttachedFiles((prev) => ({
                ...prev,
                [stageNum]: `stage_${stageNum}_attachment.pdf`,
              }))
            }
            style={{
              border: '1.5px dashed #d4d4d8',
              borderRadius: '6px',
              padding: '1rem',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <Upload size={16} color="#71717a" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#09090b' }}>
              {attachedFile ? `Attached: ${attachedFile}` : 'Click to upload or drag and drop'}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
              PDF, KML, ZIP, JPG, PNG (Max 50 MB each)
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.35rem' }}>
            <button
              onClick={() => handlePostReview(stageNum)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                height: '34px',
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
              Post Review
            </button>
          </div>
        </div>

        {/* Discussion Thread Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
            Discussion Thread ({threads.length})
          </span>
          <p style={{ fontSize: '0.725rem', color: '#71717a', margin: 0 }}>
            All remarks and responses for this section are immutable logs.
          </p>

          {threads.length === 0 ? (
            <div
              style={{
                padding: '1rem',
                textAlign: 'center',
                backgroundColor: '#fafafa',
                border: '1px dashed #d4d4d8',
                borderRadius: '6px',
                color: '#71717a',
                fontSize: '0.775rem',
              }}
            >
              No remarks recorded yet for {stageName}. Enter observations above to begin an immutable thread.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.35rem' }}>
              {threads.map((msg) => {
                const isLatrics = msg.role === 'LATRICS';
                const isReplying = activeReplyBoxId === msg.id;

                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          border: '1px solid #09090b',
                          backgroundColor: isLatrics ? '#f4f4f5' : '#ffffff',
                          color: '#09090b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        {isLatrics ? 'A' : 'C'}
                      </div>

                      <div
                        style={{
                          flex: 1,
                          backgroundColor: '#fafafa',
                          border: '1px solid #e4e4e7',
                          borderRadius: '6px',
                          padding: '0.75rem 0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                            {msg.author}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
                            {msg.timestamp}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#27272a', lineHeight: 1.4, margin: 0 }}>
                          {msg.content}
                        </p>
                        {msg.attachment && (
                          <div
                            style={{
                              marginTop: '0.25rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              border: '1px solid #d4d4d8',
                              backgroundColor: '#ffffff',
                              fontSize: '0.725rem',
                              fontWeight: 600,
                              width: 'fit-content',
                            }}
                          >
                            <Paperclip size={12} />
                            <span>{msg.attachment.name}</span>
                          </div>
                        )}

                        {/* Reply trigger link */}
                        <div style={{ marginTop: '0.35rem', display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => setActiveReplyBoxId(isReplying ? null : msg.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '0.725rem',
                              fontWeight: 600,
                              color: '#09090b',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <CornerDownRight size={12} />
                            <span>{isReplying ? 'Cancel' : 'Reply'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Inline Reply Composer */}
                    {isReplying && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '2.5rem' }}>
                        <input
                          type="text"
                          value={threadReplyInputs[msg.id] || ''}
                          onChange={(e) =>
                            setThreadReplyInputs((prev) => ({
                              ...prev,
                              [msg.id]: e.target.value,
                            }))
                          }
                          placeholder="Type follow-up reply..."
                          style={{
                            flex: 1,
                            height: '32px',
                            padding: '0 0.65rem',
                            fontSize: '0.775rem',
                            border: '1px solid #d4d4d8',
                            borderRadius: '4px',
                            backgroundColor: '#ffffff',
                          }}
                        />
                        <button
                          onClick={() => handleReplyToMessage(stageNum, msg.id)}
                          style={{
                            height: '32px',
                            padding: '0 0.85rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: '#09090b',
                            color: '#ffffff',
                            border: '1px solid #09090b',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Reply
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1px solid #d4d4d8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff',
                color: '#09090b',
              }}
            >
              <HelpCircle size={15} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1.5px solid #09090b',
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                }}
              >
                A
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#09090b' }}>Admin</span>
                <span style={{ fontSize: '0.7rem', color: '#71717a' }}>LATRICS Ops</span>
              </div>
            </div>
          </div>
        </div>

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
                Planning for {displayProjectName}
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
                {displayStatus}
              </span>
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
            <button
              onClick={() => router.push(activeRequest ? `/requests/${activeRequest.id}` : '/requests')}
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
          </div>
        </div>
      </div>

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
              const isPast = currentStage > stage.num;
              const isStageSaved = stageDraftSaved[stage.num];

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
                        backgroundColor: isPast ? '#09090b' : '#e4e4e7',
                        zIndex: 1,
                      }}
                    />
                  )}

                  <button
                    onClick={() => {
                      if (stage.num <= currentStage || stageDraftSaved[currentStage]) {
                        setCurrentStage(stage.num);
                      } else {
                        showToast(`Please save Stage ${currentStage} draft before navigating.`);
                      }
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
                        border: isActive ? '1.5px solid #09090b' : '1px solid #d4d4d8',
                        backgroundColor: isActive ? '#09090b' : isStageSaved ? '#09090b' : '#ffffff',
                        color: isActive || isStageSaved ? '#ffffff' : '#71717a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {isStageSaved && !isActive ? <Check size={12} strokeWidth={3} /> : stage.num}
                    </div>

                    <span
                      style={{
                        fontSize: '0.775rem',
                        fontWeight: isActive ? 800 : 500,
                        color: isActive ? '#09090b' : isPast ? '#09090b' : '#52525b',
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
                    backgroundColor: '#ffffff',
                  }}
                >
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'block', marginBottom: '0.25rem' }}>
                      Calculated Area (sq km)
                    </label>
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
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'block', marginBottom: '0.25rem' }}>
                      Requested Area (sq km)
                    </label>
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
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'block', marginBottom: '0.25rem' }}>
                      Boundary & Dispute Notes
                    </label>
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
                      }}
                    />
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
                        onClick={() => toggleArrayItem('airspaceZones', zone.name)}
                        style={{
                          border: isSelected ? '1.5px solid #09090b' : '1px solid #e4e4e7',
                          backgroundColor: isSelected ? '#fafafa' : '#ffffff',
                          borderRadius: '6px',
                          padding: '0.85rem',
                          cursor: 'pointer',
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
                            onClick={() => toggleArrayItem('terrainTypes', item)}
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
                              cursor: 'pointer',
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
                            onClick={() => toggleArrayItem('weatherConditions', item)}
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
                              cursor: 'pointer',
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
                    <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#09090b' }}>
                      Elevation Variation (meters)
                    </label>
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
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
                      Estimated maximum height delta across survey boundary.
                    </span>
                  </div>

                  {/* Right: Take-off & Landing Access */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#09090b' }}>
                      Site Access & Launch Safety
                    </label>
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
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
                      Designated clear radius for safe drone takeoff and recovery.
                    </span>
                  </div>
                </div>
              </div>

              {/* THREE MANDATORY CLARIFICATION THREADS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
                  Mandatory Client Clarification Threads (3)
                </span>
                <p style={{ fontSize: '0.75rem', color: '#71717a', margin: '0.15rem 0 0' }}>
                  Clarification threads dispatched by LATRICS to the Client. Enter a remark to dispatch or record reply.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {clarificationThreads.map((thread, index) => (
                    <div
                      key={thread.id}
                      style={{
                        border: '1px solid #d4d4d8',
                        borderRadius: '6px',
                        padding: '1rem',
                        backgroundColor: '#fafafa',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#09090b',
                            color: '#ffffff',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {index + 1}
                        </span>
                        <strong style={{ fontSize: '0.85rem', color: '#09090b' }}>
                          {thread.questionTitle}
                        </strong>
                      </div>

                      {thread.messages.length === 0 ? (
                        <div style={{ fontSize: '0.75rem', color: '#71717a', fontStyle: 'italic', padding: '0.5rem 0' }}>
                          No responses recorded in this thread yet.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          {thread.messages.map((m) => (
                            <div
                              key={m.id}
                              style={{
                                display: 'flex',
                                gap: '0.65rem',
                                backgroundColor: '#ffffff',
                                border: '1px solid #e4e4e7',
                                borderRadius: '6px',
                                padding: '0.65rem 0.75rem',
                              }}
                            >
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#09090b' }}>
                                    {m.author}
                                  </span>
                                  <span style={{ fontSize: '0.675rem', color: '#71717a' }}>
                                    {m.timestamp}
                                  </span>
                                </div>
                                <p style={{ fontSize: '0.775rem', color: '#27272a', margin: 0 }}>
                                  {m.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <input
                          type="text"
                          value={clarificationReplies[thread.id] || ''}
                          onChange={(e) =>
                            setClarificationReplies((prev) => ({
                              ...prev,
                              [thread.id]: e.target.value,
                            }))
                          }
                          placeholder={`Enter clarification message regarding "${thread.questionTitle}"...`}
                          style={{
                            flex: 1,
                            height: '32px',
                            padding: '0 0.65rem',
                            fontSize: '0.775rem',
                            border: '1px solid #d4d4d8',
                            borderRadius: '4px',
                            backgroundColor: '#ffffff',
                          }}
                        />
                        <button
                          onClick={() => handleReplyClarification(thread.id)}
                          style={{
                            height: '32px',
                            padding: '0 0.85rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: '#09090b',
                            color: '#ffffff',
                            border: '1px solid #09090b',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Universal Remarks & Discussion Thread for Stage 3 (COMPULSORY) */}
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
                        onClick={() => toggleArrayItem('hazards', hazard)}
                        style={{
                          border: isSelected ? '1.5px solid #09090b' : '1px solid #e4e4e7',
                          backgroundColor: isSelected ? '#fafafa' : '#ffffff',
                          borderRadius: '6px',
                          padding: '0.85rem',
                          cursor: 'pointer',
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
                  backgroundColor: '#ffffff',
                }}
              >
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'block', marginBottom: '0.25rem' }}>
                    Max Obstacle Height (meters)
                  </label>
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
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'block', marginBottom: '0.25rem' }}>
                    Safety Buffer Distance (meters)
                  </label>
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
                    }}
                  />
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
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b', display: 'block', marginBottom: '0.35rem' }}>
                      No. of GCP needed
                    </label>
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
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b', display: 'block', marginBottom: '0.35rem' }}>
                      GCP target size in cm
                    </label>
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
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b', display: 'block', marginBottom: '0.35rem' }}>
                      GCP material
                    </label>
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
                  </div>
                </div>

                {/* Field 4: GCP location : (Attachments input type) */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b', display: 'block', marginBottom: '0.35rem' }}>
                    GCP location (Attachments)
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
                  backgroundColor: '#ffffff',
                }}
              >
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'block', marginBottom: '0.25rem' }}>
                    No. of Landings
                  </label>
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
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'block', marginBottom: '0.25rem' }}>
                    Planned Altitude (m AGL)
                  </label>
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
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'block', marginBottom: '0.25rem' }}>
                    Front Overlap (%)
                  </label>
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
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'block', marginBottom: '0.25rem' }}>
                    Side Overlap (%)
                  </label>
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
                    }}
                  />
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
                  backgroundColor: '#ffffff',
                }}
              >
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'block', marginBottom: '0.25rem' }}>
                    Expected Survey Days
                  </label>
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
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'block', marginBottom: '0.25rem' }}>
                    Expected Starting Date
                  </label>
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
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'block', marginBottom: '0.25rem' }}>
                    Expected Ending Date
                  </label>
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
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'block', marginBottom: '0.25rem' }}>
                    Pilot Travel Date
                  </label>
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
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'block', marginBottom: '0.25rem' }}>
                    Data Processing Timeline (Days)
                  </label>
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
                    }}
                  />
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
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                  Operational Feasibility Determination
                </span>

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
                      subtext: 'The request will be returned to the Client for responses to the individual LATRICS review threads.',
                    },
                  ].map((opt) => {
                    const isSelected = formData.feasibilityDecision === opt.key;
                    return (
                      <div
                        key={opt.key}
                        onClick={() => handleSelectFeasibilityOption(opt.key)}
                        style={{
                          border: isSelected ? '2px solid #09090b' : '1px solid #e4e4e7',
                          backgroundColor: isSelected ? '#fafafa' : '#ffffff',
                          borderRadius: '6px',
                          padding: '1rem',
                          cursor: 'pointer',
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
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                  Final LATRICS Operational Remarks
                </label>
                <textarea
                  rows={4}
                  value={formData.decisionRemarks}
                  onChange={(e) => updateField('decisionRemarks', e.target.value)}
                  placeholder="Enter final operational findings, engineering justification, or missing clarity items..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.8rem',
                    border: '1px solid #d4d4d8',
                    borderRadius: '6px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Universal Remarks & Discussion Thread for Stage 8 (COMPULSORY) */}
              {renderStageReviewSection(8, 'Feasible to Proceed')}

              {/* Review Popup Trigger banner */}
              {formData.feasibilityDecision && (
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

            {/* Right: Save Draft & Next / Submit Planning */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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

              {currentStage < 8 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    disabled={!isCurrentStageSaved}
                    onClick={handleProceedNextSection}
                    title={
                      isCurrentStageSaved
                        ? 'Proceed to next stage'
                        : `Please click 'Save Draft' to preserve Stage ${currentStage} before proceeding`
                    }
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      height: '36px',
                      padding: '0 1.25rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      backgroundColor: isCurrentStageSaved ? '#09090b' : '#f4f4f5',
                      color: isCurrentStageSaved ? '#ffffff' : '#a1a1aa',
                      border: isCurrentStageSaved ? '1px solid #09090b' : '1px solid #d4d4d8',
                      borderRadius: '6px',
                      cursor: isCurrentStageSaved ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {!isCurrentStageSaved && <Lock size={12} />}
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
                  <FileCheck size={15} />
                  <span>Review & Submit Planning</span>
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
              If you need additional information, you can raise an internal note or contact the client.
            </p>

            <button
              onClick={() => showToast('Internal note modal requested.')}
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
              Add Internal Note
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── FULL FORM SCROLLABLE PREVIEW POPUP (STAGES 1 TO 8) ── */}
      {/* ========================================================================= */}
      {isPreviewModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
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
                  Planning & Feasibility Full Review (Stages 1 — 8)
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#71717a', margin: '0.2rem 0 0' }}>
                  Scroll from top to bottom to inspect all stage entries, remarks, and feasibility determination before confirming submission.
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
                        • <strong>{t.author}</strong>: {t.content} {t.attachment && `[Attached: ${t.attachment.name}]`}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stage 2 Section */}
              <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
                <strong style={{ fontSize: '0.85rem', color: '#09090b', display: 'block', marginBottom: '0.5rem' }}>
                  2. Regularity & Airspace
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', fontSize: '0.775rem', color: '#52525b' }}>
                  <div>Airspace Zones: <strong style={{ color: '#09090b' }}>{formData.airspaceZones.length > 0 ? formData.airspaceZones.join(', ') : '—'}</strong></div>
                </div>
                {(stageThreads[2] || []).length > 0 && (
                  <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #e4e4e7', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: '#09090b' }}>Stage 2 Remarks ({stageThreads[2].length}):</span>
                    {stageThreads[2].map((t) => (
                      <div key={t.id} style={{ marginTop: '0.35rem', color: '#52525b' }}>
                        • <strong>{t.author}</strong>: {t.content} {t.attachment && `[Attached: ${t.attachment.name}]`}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stage 3 Section */}
              <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
                <strong style={{ fontSize: '0.85rem', color: '#09090b', display: 'block', marginBottom: '0.5rem' }}>
                  3. Accessibility & Mandatory Clarifications
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.775rem', color: '#52525b' }}>
                  <div>Terrain: <strong style={{ color: '#09090b' }}>{(formData.terrainTypes && formData.terrainTypes.length > 0) ? formData.terrainTypes.join(', ') : (formData.terrainType || '—')}</strong></div>
                  <div>Elevation Variation: <strong style={{ color: '#09090b' }}>{formData.elevationVariationMeters ? `${formData.elevationVariationMeters} meters` : '—'}</strong></div>
                  <div>Weather: <strong style={{ color: '#09090b' }}>{formData.weatherConditions.length > 0 ? formData.weatherConditions.join(', ') : '—'}</strong></div>
                  <div>Field Access Identified: <strong style={{ color: '#09090b' }}>{formData.fieldAccessIdentified ? 'Yes' : 'No'}</strong></div>
                </div>
                <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #e4e4e7', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: '#09090b' }}>3 Mandatory Clarification Threads:</span>
                  {clarificationThreads.map((ct) => (
                    <div key={ct.id} style={{ marginTop: '0.35rem', color: '#52525b' }}>
                      • <strong>{ct.questionTitle}</strong>: {ct.messages.length > 0 ? `${ct.messages.length} messages logged` : 'Pending'}
                    </div>
                  ))}
                </div>
                {(stageThreads[3] || []).length > 0 && (
                  <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #e4e4e7', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: '#09090b' }}>Stage 3 General Remarks ({stageThreads[3].length}):</span>
                    {stageThreads[3].map((t) => (
                      <div key={t.id} style={{ marginTop: '0.35rem', color: '#52525b' }}>
                        • <strong>{t.author}</strong>: {t.content} {t.attachment && `[Attached: ${t.attachment.name}]`}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stage 4 Section */}
              <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
                <strong style={{ fontSize: '0.85rem', color: '#09090b', display: 'block', marginBottom: '0.5rem' }}>
                  4. Obstacles & Hazards
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.775rem', color: '#52525b' }}>
                  <div>Identified Hazards: <strong style={{ color: '#09090b' }}>{formData.hazards.length > 0 ? formData.hazards.join(', ') : 'None'}</strong></div>
                  <div>Max Height: <strong style={{ color: '#09090b' }}>{formData.maxObstacleHeightMeters ? `${formData.maxObstacleHeightMeters}m` : '—'}</strong></div>
                  <div>Safety Buffer: <strong style={{ color: '#09090b' }}>{formData.safetyBufferDistanceMeters ? `${formData.safetyBufferDistanceMeters}m` : '—'}</strong></div>
                </div>
                {(stageThreads[4] || []).length > 0 && (
                  <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #e4e4e7', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: '#09090b' }}>Stage 4 Remarks ({stageThreads[4].length}):</span>
                    {stageThreads[4].map((t) => (
                      <div key={t.id} style={{ marginTop: '0.35rem', color: '#52525b' }}>
                        • <strong>{t.author}</strong>: {t.content} {t.attachment && `[Attached: ${t.attachment.name}]`}
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
                  <div>No. of GCP needed: <strong style={{ color: '#09090b' }}>{formData.gcpsNeeded || '—'}</strong></div>
                  <div>GCP target size: <strong style={{ color: '#09090b' }}>{formData.gcpTargetSizeCm ? `${formData.gcpTargetSizeCm} cm` : '—'}</strong></div>
                  <div>GCP material: <strong style={{ color: '#09090b' }}>{formData.gcpTargetMaterial || '—'}</strong></div>
                  <div>GCP location: <strong style={{ color: '#09090b' }}>{formData.gcpLocationFile ? `Attached (${formData.gcpLocationFile})` : '—'}</strong></div>
                </div>
                {(stageThreads[5] || []).length > 0 && (
                  <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #e4e4e7', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: '#09090b' }}>Stage 5 Remarks ({stageThreads[5].length}):</span>
                    {stageThreads[5].map((t) => (
                      <div key={t.id} style={{ marginTop: '0.35rem', color: '#52525b' }}>
                        • <strong>{t.author}</strong>: {t.content} {t.attachment && `[Attached: ${t.attachment.name}]`}
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
                  <div>Planned Altitude: <strong style={{ color: '#09090b' }}>{formData.plannedAltitudeMeters ? `${formData.plannedAltitudeMeters} m AGL` : '—'}</strong></div>
                  <div>Landings: <strong style={{ color: '#09090b' }}>{formData.numberOfLandings || '—'}</strong></div>
                  <div>Front Overlap: <strong style={{ color: '#09090b' }}>{formData.frontOverlapPercent ? `${formData.frontOverlapPercent}%` : '—'}</strong></div>
                  <div>Side Overlap: <strong style={{ color: '#09090b' }}>{formData.sideOverlapPercent ? `${formData.sideOverlapPercent}%` : '—'}</strong></div>
                </div>
                {(stageThreads[6] || []).length > 0 && (
                  <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #e4e4e7', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: '#09090b' }}>Stage 6 Remarks ({stageThreads[6].length}):</span>
                    {stageThreads[6].map((t) => (
                      <div key={t.id} style={{ marginTop: '0.35rem', color: '#52525b' }}>
                        • <strong>{t.author}</strong>: {t.content} {t.attachment && `[Attached: ${t.attachment.name}]`}
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
                  <div>Survey Days: <strong style={{ color: '#09090b' }}>{formData.expectedSurveyDays ? `${formData.expectedSurveyDays} days` : '—'}</strong></div>
                  <div>Mission Dates: <strong style={{ color: '#09090b' }}>{formData.expectedStartDate || '—'} to {formData.expectedEndDate || '—'}</strong></div>
                  <div>Pilot Travel: <strong style={{ color: '#09090b' }}>{formData.pilotTravelDate || '—'}</strong></div>
                  <div>Delivery Timeline: <strong style={{ color: '#09090b' }}>{formData.dataDeliveryTimelineDays ? `${formData.dataDeliveryTimelineDays} days` : '—'}</strong></div>
                </div>
                {(stageThreads[7] || []).length > 0 && (
                  <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #e4e4e7', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: '#09090b' }}>Stage 7 Remarks ({stageThreads[7].length}):</span>
                    {stageThreads[7].map((t) => (
                      <div key={t.id} style={{ marginTop: '0.35rem', color: '#52525b' }}>
                        • <strong>{t.author}</strong>: {t.content} {t.attachment && `[Attached: ${t.attachment.name}]`}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stage 8 Section */}
              <div style={{ border: '2px solid #09090b', borderRadius: '6px', padding: '1rem', backgroundColor: '#f4f4f5' }}>
                <strong style={{ fontSize: '0.85rem', color: '#09090b', display: 'block', marginBottom: '0.35rem' }}>
                  8. Feasibility Determination & Remarks
                </strong>
                <div style={{ fontSize: '0.8rem', color: '#09090b', marginBottom: '0.35rem' }}>
                  Feasible to Proceed: <strong style={{ textTransform: 'uppercase' }}>{formData.feasibilityDecision || 'PENDING'}</strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#52525b', marginBottom: '0.5rem' }}>
                  LATRICS Operational Remarks: {formData.decisionRemarks || 'No formal remarks provided.'}
                </div>
                {(stageThreads[8] || []).length > 0 && (
                  <div style={{ marginTop: '0.5rem', borderTop: '1px dashed #d4d4d8', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: '#09090b' }}>Stage 8 Discussion Remarks ({stageThreads[8].length}):</span>
                    {stageThreads[8].map((t) => (
                      <div key={t.id} style={{ marginTop: '0.35rem', color: '#52525b' }}>
                        • <strong>{t.author}</strong>: {t.content} {t.attachment && `[Attached: ${t.attachment.name}]`}
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
                  I have reviewed all 8 stages from top to bottom and confirm these operational planning parameters and remarks.
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
                Close & Modify Form
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
                SUBMIT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Submission Confirmation Success Modal ── */}
      {isSubmittedSuccess && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
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
              Planning Submitted Successfully
            </h3>

            <p style={{ fontSize: '0.825rem', color: '#52525b', lineHeight: 1.4 }}>
              The 8-stage feasibility and operational plan for <strong>{displayProjectName}</strong> ({displayRequestId}) has been finalized.
              <br />
              Determination: <strong style={{ textTransform: 'uppercase' }}>{formData.feasibilityDecision}</strong>.
            </p>

            <button
              onClick={() => router.push('/requests')}
              style={{
                height: '38px',
                padding: '0 1.5rem',
                fontSize: '0.825rem',
                fontWeight: 700,
                backgroundColor: '#09090b',
                color: '#ffffff',
                border: '1px solid #09090b',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '0.5rem',
              }}
            >
              Return to Requests
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
