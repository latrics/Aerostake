'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { requestApi } from '@/modules/requests/api';
import { projectApi } from '@/modules/projects/api';
import { planningApi } from '@/modules/planning/api';
import { RequestVersion } from '@/modules/requests/types';
import { Project } from '@/modules/projects/types';
import { OperationalPlan } from '@/modules/planning/types';
import { useAuth } from '@/lib/auth';
import { isLatricsRole } from '@/lib/role';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '@/lib/date';
import {
  ArrowRight,
  Clock,
  Eye,
  Download,
  CheckCircle2,
  Camera,
  Layers,
  Box,
  Map,
  Mountain,
  Cpu,
  Navigation,
  FileSpreadsheet,
  Boxes,
  Activity,
  FileText,
  Sparkles,
  Check,
  Home,
  ChevronRight,
  MapPin,
  Compass,
  Calendar,
  Users,
  Plane,
  Settings,
  Flag,
} from 'lucide-react';
import { downloadDocument } from '@/lib/document-utils';
import {
  markRequestAsSeen,
  markPlanningVersionAsSeen,
} from '@/modules/requests/notifications';

interface ContactItem {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
}

export default function RequestOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = (params?.id as string) || '';
  const { user } = useAuth();
  const isOps = Boolean(user && isLatricsRole(user.role));
  const isClient = Boolean(user && !isLatricsRole(user.role));

  // Data State
  const [requestData, setRequestData] = useState<RequestVersion | null>(null);
  const [projectData, setProjectData] = useState<Project | null>(null);
  const [planningVersions, setPlanningVersions] = useState<any[]>([]);
  const [activePlan, setActivePlan] = useState<OperationalPlan | null>(null);
  const [planningDraft, setPlanningDraft] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active Section Tab: 'request' (Request Overview) or 'planning' (Planning Overview)
  const tabFromQuery = searchParams?.get('tab');
  const [activeTab, setActiveTab] = useState<'request' | 'planning'>(
    tabFromQuery === 'planning' ? 'planning' : 'request'
  );

  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam === 'planning') {
      setActiveTab('planning');
    } else if (tabParam === 'request') {
      setActiveTab('request');
    }
  }, [searchParams]);

  // Fetch live request and associated project info

  // Fetch live request and associated project info
  const loadRequestDetails = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // 1. Try finding in list of all requests
      const allReqs = await requestApi.listAllRequests().catch(() => []);
      let foundReq = allReqs.find(
        (r) => r.id === requestId || String(r.version) === requestId || r.project_id === requestId
      );

      let foundProj: Project | null = null;

      if (!foundReq && requestId) {
        // Try fetching project directly if ID is project UUID
        try {
          foundProj = await projectApi.getProject(requestId).catch(() => null);
          const pReqs = await requestApi.listProjectRequests(requestId).catch(() => []);
          if (pReqs && pReqs.length > 0) {
            foundReq = pReqs[0];
          }
        } catch {
          // Ignore
        }
      }

      if (foundReq) {
        setRequestData(foundReq);
        markRequestAsSeen(foundReq.id);
        if (foundReq.project_id) {
          markRequestAsSeen(foundReq.project_id);
          foundProj = await projectApi.getProject(foundReq.project_id).catch(() => null);
        }
      }

      if (foundProj) {
        setProjectData(foundProj);
      }

      // Fetch planning versions, active operational plan, and planning draft
      const targetProjId = foundProj?.id || foundReq?.project_id || (foundReq ? foundReq.id : requestId);
      if (targetProjId) {
        try {
          const [pVersRes, aPlanRes, pDraftRes] = await Promise.allSettled([
            planningApi.listPlanningVersions(targetProjId).catch(() => []),
            planningApi.getActivePlan(targetProjId).catch(() => null),
            planningApi.getPlanningDraft(targetProjId).catch(() => null),
          ]);
          if (pVersRes.status === 'fulfilled' && Array.isArray(pVersRes.value)) {
            setPlanningVersions(pVersRes.value);
            if (pVersRes.value.length > 0) {
              const latest = pVersRes.value[0];
              markPlanningVersionAsSeen(targetProjId, latest.version_code, latest.created_at);
            }
          }
          if (aPlanRes.status === 'fulfilled') {
            setActivePlan(aPlanRes.value);
          }
          if (pDraftRes.status === 'fulfilled') {
            setPlanningDraft(pDraftRes.value);
          }
        } catch {
          // Ignore planning fetch failures
        }
      }
    } catch (err: any) {
      console.error('Failed to load request details:', err);
      setErrorMsg(err.message || 'Failed to fetch request information');
    } finally {
      setIsLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    loadRequestDetails();
  }, [loadRequestDetails]);

  // Extract accurately from client's submitted request and project payload
  const reqPayload = useMemo(() => {
    return (requestData?.requirements_payload || projectData?.requirements_payload || {}) as Record<string, any>;
  }, [requestData?.requirements_payload, projectData?.requirements_payload]);

  const displayVersionNumber = requestData?.version ?? 1;
  const displayVersionString = `${displayVersionNumber}`;
  const displayProjectTitle =
    requestData?.project_title ||
    projectData?.title ||
    reqPayload.project_name ||
    'Survey Project';

  const displayClientCompany =
    reqPayload.company_name ||
    reqPayload.primary_contact?.company ||
    requestData?.client_company ||
    projectData?.client_company ||
    'Client Company';

  const displayCity = useMemo(() => {
    return (
      reqPayload.city ||
      reqPayload.survey_city ||
      reqPayload.primary_contact?.city ||
      reqPayload.address?.city ||
      '—'
    );
  }, [reqPayload]);

  const displayState = useMemo(() => {
    return (
      reqPayload.state ||
      reqPayload.survey_state ||
      reqPayload.primary_contact?.state ||
      reqPayload.address?.state ||
      '—'
    );
  }, [reqPayload]);

  const displayLocation = useMemo(() => {
    const explicitAddress =
      reqPayload.address ||
      reqPayload.site_address ||
      reqPayload.location_address ||
      reqPayload.survey_address ||
      reqPayload.location;
    if (explicitAddress && typeof explicitAddress === 'string' && explicitAddress.trim()) {
      return explicitAddress.trim();
    }

    const rawLoc = (
      requestData?.survey_location ||
      projectData?.survey_location ||
      reqPayload.survey_location ||
      ''
    ).trim();

    const company = (displayClientCompany || '').trim().toLowerCase();
    const projTitle = (displayProjectTitle || '').trim().toLowerCase();
    const current = rawLoc.toLowerCase();

    const isCompanyOrTitle =
      !rawLoc ||
      (company && current === company) ||
      (projTitle && current === projTitle) ||
      current === 'survey area' ||
      current === 'survey location site';

    if (isCompanyOrTitle) {
      if (reqPayload.city && reqPayload.state) {
        return `${reqPayload.city}, ${reqPayload.state}`;
      }
      return '—';
    }

    return rawLoc;
  }, [reqPayload, requestData?.survey_location, projectData?.survey_location, displayClientCompany, displayProjectTitle]);

  const displayPayload = useMemo(() => {
    const raw =
      reqPayload.payload_sensor ||
      reqPayload.sensor ||
      reqPayload.sensor_payload ||
      requestData?.survey_type ||
      projectData?.survey_type ||
      '';
    const norm = String(raw).toLowerCase().trim();
    if (norm === '61mp_camera' || norm === '61mp' || norm.includes('61mp')) return '61MP Camera (RGB)';
    if (norm === 'lidar' || norm.includes('lidar')) return 'LiDAR';
    if (norm === 'oblique_camera' || norm === 'oblique' || norm.includes('oblique')) return 'Oblique Camera';
    if (norm === 'thermal' || norm.includes('thermal')) return 'Thermal IR';
    if (norm === 'topography' || norm.includes('topograph')) return 'Topographical LiDAR';
    if (norm === 'multispectral' || norm.includes('multispectral')) return 'Multispectral';
    return raw || '61MP Camera (RGB)';
  }, [reqPayload, requestData?.survey_type, projectData?.survey_type]);

  const displayArea = useMemo(() => {
    const calculatedArea =
      (planningVersions?.[0]?.form_data?.kmlCalculatedArea ? Number(planningVersions[0].form_data.kmlCalculatedArea) : null);
    const area =
      calculatedArea ||
      projectData?.target_area_sqkm ||
      requestData?.target_area_sqkm ||
      reqPayload.requested_area_sqkm ||
      reqPayload.target_area_sqkm;
    return area ? `${area} sq. Km` : '—';
  }, [planningVersions, requestData?.target_area_sqkm, projectData?.target_area_sqkm, reqPayload.requested_area_sqkm, reqPayload.target_area_sqkm]);

  const formatDateString = (dateVal?: string | null) => {
    return formatDateDDMMYYYY(dateVal);
  };

  const formatDateTimeString = (dateVal?: string | null) => {
    return formatDateTimeDDMMYYYY(dateVal);
  };

  const displayStartDate = reqPayload.start_date ? formatDateString(reqPayload.start_date) : '—';
  const displayEndDate = reqPayload.end_date ? formatDateString(reqPayload.end_date) : '—';
  const displayReceivedOn = formatDateTimeString(requestData?.created_at || projectData?.created_at);

  const displayStatus = (
    requestData?.project_status ||
    projectData?.status ||
    'submitted'
  ).toLowerCase();

  // Primary Client Contact Details
  const displayClientName =
    reqPayload.primary_contact?.name ||
    requestData?.client_name ||
    projectData?.client_name ||
    projectData?.creator_name ||
    '—';

  const displayClientEmail =
    reqPayload.primary_contact?.email ||
    requestData?.client_email ||
    projectData?.client_email ||
    projectData?.creator_email ||
    '—';

  const displayClientPhone =
    reqPayload.primary_contact?.phone ||
    reqPayload.primary_contact?.phone_number ||
    '—';

  const displayClientDepartment =
    reqPayload.primary_contact?.department ||
    'Operations';

  // Additional Contacts list
  const additionalContacts: ContactItem[] = useMemo(() => {
    const raw =
      reqPayload.communication_contacts ||
      reqPayload.assigned_contacts ||
      reqPayload.additional_contacts;

    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      return [];
    }

    return raw.map((item: any) => {
      if (typeof item === 'string') {
        return {
          name: item,
          role: 'Project Coordinator',
          email: `${item.toLowerCase().replace(/[^a-z0-9]/g, '')}@${(displayClientCompany || 'client').toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          phone: '—',
        };
      }
      if (typeof item === 'object' && item !== null) {
        return {
          name: item.name || item.full_name || 'Contact Person',
          role: item.role || item.designation || 'Project Coordinator',
          email: item.email || '—',
          phone: item.phone || item.phoneNumber || '—',
        };
      }
      return {
        name: String(item),
        role: 'Project Coordinator',
      };
    });
  }, [reqPayload.communication_contacts, reqPayload.assigned_contacts, reqPayload.additional_contacts, displayClientCompany]);

  // Attachments List - Strictly deduplicated so each file appears only once with authentic metadata
  const attachments = useMemo(() => {
    const list: Array<{ id: number; name: string; type: string; size: string; date: string; dataUrl?: string }> = [];
    const seenNames = new Set<string>();

    const normalize = (n: string) => n.trim().toLowerCase();

    // 1. Process structured attachments list from client upload first
    if (Array.isArray(reqPayload.attachments)) {
      reqPayload.attachments.forEach((att: any) => {
        const name = typeof att === 'string' ? att : att?.name;
        if (!name || seenNames.has(normalize(name))) return;
        seenNames.add(normalize(name));

        const type =
          typeof att === 'object' && att?.type
            ? att.type
            : name.endsWith('.kml') || name.endsWith('.kmz')
            ? 'KML'
            : name.endsWith('.pdf')
            ? 'PDF'
            : 'Document';

        const size =
          typeof att === 'object' && att?.size && att.size !== '—'
            ? att.size
            : '—';

        const date =
          typeof att === 'object' && att?.date
            ? formatDateString(att.date)
            : formatDateString(requestData?.created_at || projectData?.created_at);

        list.push({
          id: list.length + 1,
          name,
          type,
          size,
          date,
          dataUrl: typeof att === 'object' ? att?.dataUrl : undefined,
        });
      });
    }

    // 2. Check kml_files / scope_files arrays if not already captured
    const extraArrays = [
      ...(Array.isArray(reqPayload.kml_files) ? reqPayload.kml_files : []),
      ...(Array.isArray(reqPayload.scope_files) ? reqPayload.scope_files : []),
    ];
    extraArrays.forEach((file: any) => {
      const name = typeof file === 'string' ? file : file?.name;
      if (!name || seenNames.has(normalize(name))) return;
      seenNames.add(normalize(name));
      list.push({
        id: list.length + 1,
        name,
        type: file.type || (name.endsWith('.kml') ? 'KML' : 'PDF'),
        size: file.size || '—',
        date: file.date ? formatDateString(file.date) : formatDateString(requestData?.created_at || projectData?.created_at),
        dataUrl: typeof file === 'object' ? file?.dataUrl : undefined,
      });
    });

    // 3. Fallback for single kml_filename / scope_filename only if not already in list
    if (reqPayload.kml_filename && typeof reqPayload.kml_filename === 'string') {
      const names = reqPayload.kml_filename.split(',').map((s: string) => s.trim()).filter(Boolean);
      names.forEach((name: string) => {
        if (!seenNames.has(normalize(name))) {
          seenNames.add(normalize(name));
          list.push({
            id: list.length + 1,
            name,
            type: 'KML',
            size: reqPayload.kml_size || '—',
            date: formatDateString(requestData?.created_at || projectData?.created_at),
          });
        }
      });
    }

    if (reqPayload.scope_filename && typeof reqPayload.scope_filename === 'string') {
      const names = reqPayload.scope_filename.split(',').map((s: string) => s.trim()).filter(Boolean);
      names.forEach((name: string) => {
        if (!seenNames.has(normalize(name))) {
          seenNames.add(normalize(name));
          list.push({
            id: list.length + 1,
            name,
            type: 'Document',
            size: reqPayload.scope_size || '—',
            date: formatDateString(requestData?.created_at || projectData?.created_at),
          });
        }
      });
    }

    return list;
  }, [reqPayload, requestData?.created_at, projectData?.created_at]);



  // Client Requirement Specifications
  const rawSensor = (
    reqPayload.payload_sensor ||
    reqPayload.sensor ||
    requestData?.survey_type ||
    projectData?.survey_type ||
    ''
  ).toLowerCase();
  const isLidar = rawSensor.includes('lidar') || rawSensor.includes('topograph');
  const isOblique = rawSensor.includes('oblique');
  const is61MP = !isLidar && !isOblique;

  const processingModesArray: string[] = Array.isArray(reqPayload.processing_modes)
    ? reqPayload.processing_modes
    : [];
  const rawProcessingMode = (reqPayload.processing_mode || reqPayload.processing_type || '').toLowerCase();
  const optPreProcessing =
    processingModesArray.includes('pre_processing') ||
    rawProcessingMode === 'pre_processing' ||
    rawProcessingMode === 'both' ||
    rawProcessingMode.includes('pre');
  const optPostProcessing =
    processingModesArray.includes('post_processing') ||
    rawProcessingMode === 'post_processing' ||
    rawProcessingMode === 'both' ||
    (!optPreProcessing && !processingModesArray.length);

  const rawDeliverablesList: string[] = Array.isArray(reqPayload.deliverables) ? reqPayload.deliverables : [];
  const preDelivObj: Record<string, boolean> = reqPayload.pre_deliverables || {};
  const postDelivObj: Record<string, boolean> = reqPayload.post_deliverables || {};

  const isPreDelivSelected = (key: string) => {
    if (preDelivObj[key] !== undefined) return Boolean(preDelivObj[key]);
    return rawDeliverablesList.some((d) => {
      if (typeof d !== 'string') return false;
      const norm = d.toLowerCase().trim();
      return norm === key.toLowerCase() || norm === key.toLowerCase().replace(/_/g, ' ');
    });
  };

  const isPostDelivSelected = (key: string) => {
    if (postDelivObj[key] !== undefined) return Boolean(postDelivObj[key]);
    return rawDeliverablesList.some((d) => {
      if (typeof d !== 'string') return false;
      const norm = d.toLowerCase().trim();
      return (
        norm === key.toLowerCase() ||
        norm === key.toLowerCase().replace(/_/g, ' ') ||
        (key === '3d_model' && (norm === '3d model' || norm === 'mesh3d' || norm === 'model_3d')) ||
        (key === 'volumetric_analysis' && (norm === 'volumetric' || norm === 'volumetric analysis'))
      );
    });
  };

  const preOtherCustomText =
    reqPayload.pre_other_text ||
    reqPayload.preOtherText ||
    rawDeliverablesList.find((d) => typeof d === 'string' && d.toLowerCase().startsWith('pre other:'))?.replace(/^pre other:\s*/i, '') ||
    '';

  const postOtherCustomText =
    reqPayload.post_other_text ||
    reqPayload.postOtherText ||
    reqPayload.other_text ||
    rawDeliverablesList.find((d) => typeof d === 'string' && d.toLowerCase().startsWith('other:'))?.replace(/^other:\s*/i, '') ||
    '';

  // ── Planning Assessment Determination ──
  const isPlanningFilled = useMemo(() => {
    if (planningVersions && planningVersions.length > 0) {
      const fd = planningVersions[0]?.form_data;
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
    if (activePlan) return true;
    return false;
  }, [planningVersions, activePlan]);

  // ── Unfinished Planning Draft Determination (Ops continuation) ──
  const hasDraftInProgress = useMemo(() => {
    if (!isOps) return false;

    const hasFormDataContent = (fd: any) => {
      if (!fd || typeof fd !== 'object') return false;
      return Object.entries(fd).some(([key, val]) => {
        if (key === 'kmlFileName' || key === 'kmlFileSize') return false;
        if (Array.isArray(val)) return val.length > 0;
        if (typeof val === 'string') return val.trim().length > 0 && val !== '—';
        if (typeof val === 'boolean') return val === true;
        if (typeof val === 'number') return true;
        return false;
      });
    };

    const hasThreadsContent = (threads: any) => {
      if (!threads || typeof threads !== 'object') return false;
      return Object.values(threads).some((list: any) => Array.isArray(list) && list.length > 0);
    };

    let hasData = false;

    // 1. Check backend draft
    if (planningDraft) {
      if (hasFormDataContent(planningDraft.form_data)) hasData = true;
      if (!hasData && hasThreadsContent(planningDraft.stage_threads)) hasData = true;
      if (!hasData && Array.isArray(planningDraft.clarification_threads) && planningDraft.clarification_threads.length > 0) hasData = true;
      if (!hasData && planningDraft.stage_draft_saved && typeof planningDraft.stage_draft_saved === 'object') {
        hasData = Object.values(planningDraft.stage_draft_saved).some(Boolean);
      }
    }

    // 2. Fallback check localStorage
    if (!hasData && typeof window !== 'undefined') {
      try {
        const targetProjId = projectData?.id || requestData?.project_id || (requestData ? requestData.id : requestId);
        const keys = [
          targetProjId ? `latrics_planning_draft_${targetProjId}` : null,
          requestId ? `latrics_planning_draft_${requestId}` : null,
          requestId ? `latrics_planning_draft_${requestId.replace('#', '')}` : null,
          requestData?.version ? `latrics_planning_draft_${String(requestData.version).padStart(3, '0')}` : null,
          requestData?.id ? `latrics_planning_draft_${requestData.id}` : null,
          'latrics_planning_draft_default',
        ].filter(Boolean) as string[];

        for (const k of keys) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (hasFormDataContent(parsed.formData || parsed.form_data)) {
              hasData = true;
              break;
            }
            if (hasThreadsContent(parsed.stageThreads || parsed.stage_threads)) {
              hasData = true;
              break;
            }
          }
        }
      } catch {}
    }

    if (!hasData) return false;

    // If no submitted planning versions exist, any draft data means planning is in progress
    if (!planningVersions || planningVersions.length === 0) {
      return true;
    }

    // If submitted versions exist, check if draft was updated after latest submitted version
    const latestVer = planningVersions[0];
    if (planningDraft?.updated_at && latestVer?.created_at) {
      const draftTime = new Date(planningDraft.updated_at).getTime();
      const verTime = new Date(latestVer.created_at).getTime();
      if (draftTime > verTime + 2000) {
        return true;
      }
    }

    return false;
  }, [isOps, planningDraft, planningVersions, projectData?.id, requestData, requestId]);

  const planningDetails = useMemo(() => {
    const backendFormData = planningVersions && planningVersions.length > 0 ? planningVersions[0].form_data || {} : {};
    const formData = backendFormData;
    const versionNum = planningVersions.length > 0 ? planningVersions[0].version_number || 1 : 1;
    const versionCode = planningVersions.length > 0 ? planningVersions[0].version_code || `V${versionNum}.0` : 'V1.0';
    const planStatus = planningVersions.length > 0 ? planningVersions[0].status || 'Under Review' : 'Under Review';
    const updatedBy = planningVersions.length > 0 ? planningVersions[0].sender_name || 'LATRICS Operations Lead' : 'LATRICS Operations';
    const updatedAt = planningVersions.length > 0 ? formatDateString(planningVersions[0].created_at) : '—';

    return {
      versionNum,
      versionCode,
      planStatus,
      updatedBy,
      updatedAt,
      kmlFile: formData.kmlFileName || reqPayload.kml_filename || '—',
      kmlSize: formData.kmlFileSize || '—',
      calculatedArea: formData.kmlCalculatedArea ? `${formData.kmlCalculatedArea} sq. km` : '—',
      requestedArea: formData.kmlRequestedArea ? `${formData.kmlRequestedArea} sq. km` : (displayArea || '—'),
      boundaryNotes: formData.kmlBoundaryStatus || '—',
      airspaceZones: Array.isArray(formData.airspaceZones) && formData.airspaceZones.length > 0 ? formData.airspaceZones.join(', ') : '—',
      dgcaClearance: formData.dgcaClearanceRequired || '—',
      airportProximity: formData.airportProximityKm ? `${formData.airportProximityKm} km` : '—',
      nearestAerodrome: formData.nearestAerodrome || '—',
      policeIntimation: formData.policeIntimationRequired || '—',
      terrain: Array.isArray(formData.terrainTypes) && formData.terrainTypes.length > 0 ? formData.terrainTypes.join(', ') : (formData.terrainType || '—'),
      elevationVariation: formData.elevationVariationMeters ? `${formData.elevationVariationMeters} m` : '—',
      fieldAccess: formData.fieldAccessIdentified === true ? 'Identified & Confirmed' : formData.fieldAccessIdentified === false ? 'Not Identified' : '—',
      weather: Array.isArray(formData.weatherConditions) && formData.weatherConditions.length > 0 ? formData.weatherConditions.join(', ') : '—',
      stagingNotes: formData.fieldAccessNotes || '—',
      hazards: Array.isArray(formData.hazards) && formData.hazards.length > 0 ? formData.hazards.join(', ') : '—',
      maxObstacleHeight: formData.maxObstacleHeightMeters ? `${formData.maxObstacleHeightMeters} m` : '—',
      safetyBuffer: formData.safetyBufferDistanceMeters ? `${formData.safetyBufferDistanceMeters} m` : '—',
      hazardMitigation: formData.hazardMitigationNotes || '—',
      gcpsNeeded: formData.gcpsNeeded ? `${formData.gcpsNeeded} Targets` : '—',
      checkpoints: formData.checkpointsNeeded ? `${formData.checkpointsNeeded} Checkpoints` : '—',
      targetSize: formData.gcpTargetSizeCm ? `${formData.gcpTargetSizeCm} cm` : '—',
      targetMaterial: formData.gcpTargetMaterial || '—',
      baseStation: formData.baseStationSetup || '—',
      gcpFile: formData.gcpLocationFile || formData.gcpFileAttached || '—',
      plannedAltitude: formData.plannedAltitudeMeters ? `${formData.plannedAltitudeMeters} m AGL` : '—',
      gsd: formData.estimatedGsdCm ? `${formData.estimatedGsdCm} cm/px` : '—',
      overlapRatio: formData.frontOverlapPercent && formData.sideOverlapPercent ? `${formData.frontOverlapPercent}% / ${formData.sideOverlapPercent}%` : (formData.frontOverlapPercent ? `${formData.frontOverlapPercent}%` : '—'),
      totalFlightDuration: formData.flightDurationMinutes ? `${formData.flightDurationMinutes} mins` : '—',
      landings: formData.numberOfLandings ? `${formData.numberOfLandings} Flights` : '—',
      batterySets: formData.batterySetsRequired ? `${formData.batterySetsRequired} Sets` : '—',
      surveyDays: formData.expectedSurveyDays ? `${formData.expectedSurveyDays} Days` : '—',
      targetWindow: formData.expectedStartDate || formData.expectedEndDate ? `${formData.expectedStartDate || '—'} → ${formData.expectedEndDate || '—'}` : (displayStartDate !== '—' && displayEndDate !== '—' ? `${displayStartDate} → ${displayEndDate}` : '—'),
      pilotTravelDate: formData.pilotTravelDate || '—',
      weatherContingency: formData.weatherContingencyDays ? `${formData.weatherContingencyDays} Days` : '—',
      deliveryTimeline: formData.dataDeliveryTimelineDays ? `${formData.dataDeliveryTimelineDays} Business Days Post-Flight` : '—',
      decision: formData.feasibilityDecision ? String(formData.feasibilityDecision).toUpperCase() : '—',
      reviewConfirmed: formData.reviewConfirmed ? 'Confirmed & Validated' : '—',
      decisionRemarks: formData.decisionRemarks || 'No operational decision remarks recorded.',
    };
  }, [planningVersions, reqPayload, displayArea, displayStartDate, displayEndDate]);

  const getStepStatus = useCallback((step: number): 'completed' | 'active' | 'pending' => {
    const s = displayStatus.toLowerCase();
    if (s === 'completed') return 'completed';
    if (s === 'active' || s === 'in_progress') {
      return step <= 3 ? 'completed' : step === 4 ? 'active' : 'pending';
    }
    if (s === 'approved') {
      return step <= 2 ? 'completed' : step === 3 ? 'active' : 'pending';
    }
    if (s === 'planning' || s === 'under_review') {
      return step === 1 ? 'completed' : step === 2 ? 'active' : 'pending';
    }
    if (s === 'submitted' || s === 'draft') {
      return step === 1 ? 'active' : 'pending';
    }
    return step === 1 ? 'active' : 'pending';
  }, [displayStatus]);

  const currentActiveStageNumber = useMemo(() => {
    for (let s = 1; s <= 6; s++) {
      if (getStepStatus(s) === 'active') return s;
    }
    return 6;
  }, [getStepStatus]);

  const currentActiveStageName = useMemo(() => {
    const names = ['Request', 'Planning', 'Mobilising', 'Capturing', 'Processing', 'Delivered'];
    return names[currentActiveStageNumber - 1] || 'Planning';
  }, [currentActiveStageNumber]);

  const statusStyle = useMemo(() => {
    const s = displayStatus.toLowerCase();
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
      label: displayStatus ? displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1) : 'Draft',
      bg: '#f4f4f5',
      color: '#52525b',
      dotColor: '#71717a',
      border: 'none',
    };
  }, [displayStatus]);

  const requestMetaItems = useMemo(() => {
    const items: Array<{ id: string; icon: React.ReactNode; label: string }> = [];

    // 1. Location (only if available and not a placeholder)
    if (displayLocation && displayLocation !== '—') {
      items.push({
        id: 'location',
        icon: <MapPin size={15} color="#6b7280" />,
        label: displayLocation,
      });
    }

    // 2. Target Area (only if available)
    if (displayArea && displayArea !== '—') {
      items.push({
        id: 'area',
        icon: <Compass size={15} color="#6b7280" />,
        label: displayArea,
      });
    }

    // 3. Sensor / Payload (only if available)
    if (displayPayload && displayPayload !== '—') {
      items.push({
        id: 'sensor',
        icon: <Camera size={15} color="#6b7280" />,
        label: displayPayload,
      });
    }

    // 4. Received Date (only if available from backend)
    const rawDate = requestData?.created_at || projectData?.created_at;
    if (rawDate) {
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          const formatted = formatDateDDMMYYYY(d);
          items.push({
            id: 'created',
            icon: <Calendar size={15} color="#6b7280" />,
            label: `Received ${formatted}`,
          });
        }
      } catch {}
    }

    return items;
  }, [displayLocation, displayArea, displayPayload, requestData?.created_at, projectData?.created_at]);

  const handleDownloadPdf = () => {
    window.print();
  };

  const handleGoToPlanning = () => {
    router.push(`/requests/${requestId}/planning`);
  };

  if (isLoading) {
    return (
      <div style={{ padding: '5rem 1rem', textAlign: 'center', color: '#52525b' }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Loading request data from client submission...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem' }}>
      {/* ── UNIFIED EXECUTIVE REQUEST HERO & LIFECYCLE STAGES PIPELINE ── */}
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
        {/* Top Partition: Breadcrumbs, Request Identity, Dynamic Badges & Action Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* Left Column: Breadcrumb + Request Title + Status Pill + Metadata */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', minWidth: 0, flex: '1 1 340px' }}>
            {/* Breadcrumb Navigation Trail */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', color: '#6b7280' }}>
              <Link
                href="/requests"
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
                href="/requests"
                style={{
                  color: '#6b7280',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#111827')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
              >
                Requests
              </Link>
              {displayClientCompany && (
                <>
                  <ChevronRight size={13} color="#9ca3af" />
                  <span style={{ color: '#6b7280', fontWeight: 500 }}>{displayClientCompany}</span>
                </>
              )}
              <ChevronRight size={13} color="#9ca3af" />
              <span style={{ color: '#111827', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayProjectTitle ? `${displayProjectTitle}` : `Request ${displayVersionString}`}
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
                REQ-V{displayVersionString}
              </span>
            </div>

            {/* Title & Status Badge Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
                {displayProjectTitle ? `${displayProjectTitle} (Request ${displayVersionString})` : `Request ${displayVersionString}`}
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
            {requestMetaItems.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.2rem', marginTop: '0.15rem' }}>
                {requestMetaItems.map((item, idx) => (
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

        {/* Bottom Partition: Stages Stepper */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Stepper Header Strip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6b7280' }}>
              Request Stage
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
            {[
              { id: 1, name: 'Request' },
              { id: 2, name: 'Planning' },
              { id: 3, name: 'Mobilising' },
              { id: 4, name: 'Capturing' },
              { id: 5, name: 'Processing' },
              { id: 6, name: 'Delivered' },
            ].map((st, idx, arr) => {
              const isLast = idx === arr.length - 1;
              const status = getStepStatus(st.id);
              const isCompleted = status === 'completed';
              const isActive = status === 'active';

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

              const nextStatus = !isLast ? getStepStatus(arr[idx + 1].id) : null;
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
                    if (st.id === 2) setActiveTab('planning');
                    else if (st.id === 1) setActiveTab('request');
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    position: 'relative',
                    cursor: st.id <= 2 ? 'pointer' : 'default',
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

        {/* ── Two Primary Sections: Request Overview & Planning Overview ── */}
        <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid #e4e4e7', marginTop: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('request')}
            style={{
              padding: '0.5rem 0.25rem 0.75rem',
              fontSize: '0.875rem',
              fontWeight: activeTab === 'request' ? 700 : 500,
              color: activeTab === 'request' ? '#09090b' : '#71717a',
              borderBottom: activeTab === 'request' ? '2.5px solid #09090b' : '2.5px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Request Overview
          </button>

          <button
            onClick={() => setActiveTab('planning')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.25rem 0.75rem',
              fontSize: '0.875rem',
              fontWeight: activeTab === 'planning' ? 700 : 500,
              color: activeTab === 'planning' ? '#09090b' : '#71717a',
              borderBottom: activeTab === 'planning' ? '2.5px solid #09090b' : '2.5px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Planning Overview</span>
          </button>
        </div>

      {/* ========================================================================= */}
      {/* ── SECTION 1: REQUEST OVERVIEW (PREVIEW STYLE REQUEST FORM - NO CREATE PLAN) ── */}
      {/* ========================================================================= */}
      {activeTab === 'request' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top Row: Project Overview (Left) & Client Contact (Right) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)', gap: '1.25rem', alignItems: 'stretch' }}>
            {/* Project Overview Card */}
            <div className="wf-card" style={{ padding: '1.35rem 1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.25rem', backgroundColor: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', margin: 0 }}>Project Overview</h3>
                  <p style={{ fontSize: '0.775rem', color: '#52525b', marginTop: '0.15rem' }}>
                    Key parameters and summary of the client&apos;s request.
                  </p>
                </div>

                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #d4d4d8',
                    backgroundColor: '#ffffff',
                    color: '#09090b',
                  }}
                >
                  Version {displayVersionString}
                </span>
              </div>

              {/* 2-Column Key Value Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.25rem 2rem',
                  fontSize: '0.825rem',
                  flex: 1,
                  paddingTop: '0.5rem',
                }}
              >
                {/* Left Column Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.15rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ color: '#52525b', minWidth: '120px' }}>Project Title</span>
                    <strong style={{ color: '#09090b', wordBreak: 'break-word' }}>{displayProjectTitle}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ color: '#52525b', minWidth: '120px' }}>Client Company</span>
                    <strong style={{ color: '#09090b', wordBreak: 'break-word' }}>{displayClientCompany}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                    <span style={{ color: '#52525b', minWidth: '120px' }}>Project Location</span>
                    <strong style={{ color: '#09090b', lineHeight: 1.35, wordBreak: 'break-word' }}>{displayLocation}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ color: '#52525b', minWidth: '120px' }}>City</span>
                    <strong style={{ color: '#09090b', wordBreak: 'break-word' }}>{displayCity}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ color: '#52525b', minWidth: '120px' }}>State</span>
                    <strong style={{ color: '#09090b', wordBreak: 'break-word' }}>{displayState}</strong>
                  </div>
                </div>

                {/* Right Column Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.15rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ color: '#52525b', minWidth: '135px' }}>Payload</span>
                    <strong style={{ color: '#09090b', wordBreak: 'break-word' }}>{displayPayload}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ color: '#52525b', minWidth: '135px' }}>Total Area</span>
                    <strong style={{ color: '#09090b', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>{displayArea}</span>
                      {planningVersions?.[0]?.form_data?.kmlCalculatedArea && (
                        <span style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: 600, backgroundColor: '#f0fdf4', padding: '1px 5px', borderRadius: '3px', border: '1px solid #bbf7d0' }}>
                          Calculated by Latrics
                        </span>
                      )}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ color: '#52525b', minWidth: '135px' }}>Expected Start Date</span>
                    <strong style={{ color: '#09090b' }}>{displayStartDate}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ color: '#52525b', minWidth: '135px' }}>Expected Completion</span>
                    <strong style={{ color: '#09090b' }}>{displayEndDate}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ color: '#52525b', minWidth: '135px' }}>Received On</span>
                    <strong style={{ color: '#09090b' }}>{displayReceivedOn}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ color: '#52525b', minWidth: '135px' }}>Current Status</span>
                    <span
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        border: '1px solid #d4d4d8',
                        backgroundColor: '#f4f4f5',
                        color: '#09090b',
                        textTransform: 'capitalize',
                      }}
                    >
                      {displayStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Client Contact Card */}
            <div className="wf-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.15rem', backgroundColor: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '8px' }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', margin: 0 }}>Client Contact</h3>
                <p style={{ fontSize: '0.775rem', color: '#52525b', marginTop: '0.15rem' }}>
                  Primary point of contact for this request.
                </p>
              </div>

              {/* Primary Contact Details List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ color: '#52525b', minWidth: '90px' }}>Name</span>
                  <strong style={{ color: '#09090b' }}>{displayClientName}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ color: '#52525b', minWidth: '90px' }}>Email</span>
                  <span style={{ color: '#09090b', fontWeight: 500 }}>{displayClientEmail}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ color: '#52525b', minWidth: '90px' }}>Phone</span>
                  <span style={{ color: '#09090b', fontWeight: 500 }}>{displayClientPhone}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ color: '#52525b', minWidth: '90px' }}>Company</span>
                  <strong style={{ color: '#09090b' }}>{displayClientCompany}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ color: '#52525b', minWidth: '90px' }}>Department</span>
                  <span style={{ color: '#09090b', fontWeight: 500 }}>{displayClientDepartment}</span>
                </div>
              </div>

              {/* Additional Contacts Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>Additional Contacts</span>
                {additionalContacts.length === 0 ? (
                  <div
                    style={{
                      padding: '0.75rem 0.85rem',
                      backgroundColor: '#fafafa',
                      border: '1px dashed #d4d4d8',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      color: '#71717a',
                      textAlign: 'center',
                    }}
                  >
                    No additional communication contacts specified by client.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {additionalContacts.map((contact, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.75rem 0.85rem',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e4e4e7',
                          borderRadius: '6px',
                          gap: '0.5rem',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>{contact.name}</div>
                          <div style={{ fontSize: '0.725rem', color: '#52525b' }}>{contact.role || 'Project Coordinator'}</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.725rem' }}>
                          {contact.email && <span style={{ color: '#09090b', fontWeight: 500 }}>{contact.email}</span>}
                          {contact.phone && <span style={{ color: '#52525b' }}>{contact.phone}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>



          {/* Survey Requirements Card (3 Columns: Payload, Processing, Deliverables) */}
          <div className="wf-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', margin: 0 }}>Survey Specifications</h3>
                <p style={{ fontSize: '0.775rem', color: '#52525b', marginTop: '0.15rem' }}>
                  Sensor payload, processing modes, and client requested survey deliverables.
                </p>
              </div>

              <span
                style={{
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  border: '1px solid #d4d4d8',
                  backgroundColor: '#f4f4f5',
                  color: '#52525b',
                  letterSpacing: '0.02em',
                }}
              >
                CLIENT SUBMISSION SPECIFICATION
              </span>
            </div>

            {/* 3-Column Requirements Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '1.25rem', alignItems: 'start' }}>
              {/* Column 1: Payload / Sensor */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b' }}>Payload / Sensor</span>
                  <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Selected by Client</span>
                </div>

                {/* Option 1: 61MP Camera */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 0.85rem',
                    borderRadius: '6px',
                    border: is61MP ? '1.5px solid #09090b' : '1px solid #e4e4e7',
                    backgroundColor: is61MP ? '#ffffff' : '#fafafa',
                    opacity: is61MP ? 1 : 0.55,
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: is61MP ? '2px solid #09090b' : '1.5px solid #a1a1aa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {is61MP && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#09090b' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.825rem', fontWeight: is61MP ? 800 : 600, color: is61MP ? '#09090b' : '#71717a' }}>
                        61MP Camera
                      </span>
                      {is61MP && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', backgroundColor: '#09090b', color: '#ffffff', borderRadius: '3px' }}>
                          Active
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: '#52525b' }}>High resolution RGB imagery</div>
                  </div>
                </div>

                {/* Option 2: LiDAR */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 0.85rem',
                    borderRadius: '6px',
                    border: isLidar ? '1.5px solid #09090b' : '1px solid #e4e4e7',
                    backgroundColor: isLidar ? '#ffffff' : '#fafafa',
                    opacity: isLidar ? 1 : 0.55,
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: isLidar ? '2px solid #09090b' : '1.5px solid #a1a1aa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {isLidar && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#09090b' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.825rem', fontWeight: isLidar ? 800 : 600, color: isLidar ? '#09090b' : '#71717a' }}>
                        LiDAR
                      </span>
                      {isLidar && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', backgroundColor: '#09090b', color: '#ffffff', borderRadius: '3px' }}>
                          Active
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: '#52525b' }}>3D spatial point cloud data</div>
                  </div>
                </div>

                {/* Option 3: Oblique Camera */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 0.85rem',
                    borderRadius: '6px',
                    border: isOblique ? '1.5px solid #09090b' : '1px solid #e4e4e7',
                    backgroundColor: isOblique ? '#ffffff' : '#fafafa',
                    opacity: isOblique ? 1 : 0.55,
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: isOblique ? '2px solid #09090b' : '1.5px solid #a1a1aa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {isOblique && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#09090b' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.825rem', fontWeight: isOblique ? 800 : 600, color: isOblique ? '#09090b' : '#71717a' }}>
                        Oblique Camera
                      </span>
                      {isOblique && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', backgroundColor: '#09090b', color: '#ffffff', borderRadius: '3px' }}>
                          Active
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: '#52525b' }}>Multi-angle facade imagery</div>
                  </div>
                </div>
              </div>

              {/* Column 2: Processing Type */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b' }}>Processing Mode</span>
                  {optPreProcessing && optPostProcessing && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#09090b' }}>Both Modes Opted</span>
                  )}
                </div>

                {/* Pre Processing Card */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 0.85rem',
                    borderRadius: '6px',
                    border: optPreProcessing ? '1.5px solid #09090b' : '1px solid #e4e4e7',
                    backgroundColor: optPreProcessing ? '#ffffff' : '#fafafa',
                    opacity: optPreProcessing ? 1 : 0.55,
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      backgroundColor: optPreProcessing ? '#09090b' : '#ffffff',
                      border: optPreProcessing ? '1px solid #09090b' : '1.5px solid #a1a1aa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 800,
                    }}
                  >
                    {optPreProcessing ? '✓' : ''}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.825rem', fontWeight: optPreProcessing ? 800 : 600, color: optPreProcessing ? '#09090b' : '#71717a' }}>
                        Pre Processing
                      </span>
                      {optPreProcessing && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', backgroundColor: '#09090b', color: '#ffffff', borderRadius: '3px' }}>
                          Opted
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: '#52525b' }}>Raw data and basic telemetry outputs</div>
                  </div>
                </div>

                {/* Post Processing Card */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 0.85rem',
                    borderRadius: '6px',
                    border: optPostProcessing ? '1.5px solid #09090b' : '1px solid #e4e4e7',
                    backgroundColor: optPostProcessing ? '#ffffff' : '#fafafa',
                    opacity: optPostProcessing ? 1 : 0.55,
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      backgroundColor: optPostProcessing ? '#09090b' : '#ffffff',
                      border: optPostProcessing ? '1px solid #09090b' : '1.5px solid #a1a1aa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 800,
                    }}
                  >
                    {optPostProcessing ? '✓' : ''}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.825rem', fontWeight: optPostProcessing ? 800 : 600, color: optPostProcessing ? '#09090b' : '#71717a' }}>
                        Post Processing
                      </span>
                      {optPostProcessing && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', backgroundColor: '#09090b', color: '#ffffff', borderRadius: '3px' }}>
                          Opted
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: '#52525b' }}>Value added products and photogrammetry</div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.6rem 0.75rem',
                    backgroundColor: '#fafafa',
                    border: '1px solid #e4e4e7',
                    borderRadius: '6px',
                    fontSize: '0.725rem',
                    color: '#52525b',
                    lineHeight: 1.4,
                  }}
                >
                  Mode configuration: <strong style={{ color: '#09090b' }}>{optPreProcessing && optPostProcessing ? 'Pre & Post Processing' : optPreProcessing ? 'Pre-Processing Only' : 'Post-Processing Only'}</strong>
                </div>
              </div>

              {/* Column 3: Requested Deliverables */}
              {(() => {
                const allPreCatalog = [
                  { id: 'geo_tagged_image', label: 'Geo Tagged Images', format: 'RAW / JPG', icon: Camera, desc: 'Positioned drone captures with RTK metadata' },
                  { id: 'event_files', label: 'Event Logs', format: 'CSV / TXT', icon: FileSpreadsheet, desc: 'Sensor shutter timing & trigger timestamps' },
                  { id: 'point_cloud', label: 'LiDAR Point Cloud', format: 'LAS / LAZ', icon: Cpu, desc: 'Raw sensor LiDAR point cloud data' },
                  { id: 'trajectory_files', label: 'Flight Trajectory', format: 'POS / SBET', icon: Navigation, desc: 'Kinematic trajectory solution data' },
                ];

                const allPostCatalog = [
                  { id: 'orthomosaic', label: 'Orthomosaic Map', format: 'GeoTIFF', icon: Layers, desc: 'High-res geometrically corrected aerial mosaic' },
                  { id: 'topographic_map', label: 'Topographic Map', format: 'DWG / PDF', icon: Map, desc: 'Contour lines, elevations & spot features' },
                  { id: 'dem', label: 'Digital Elevation Model', format: 'GeoTIFF / DEM', icon: Mountain, desc: 'Bare-earth surface terrain elevation model' },
                  { id: 'dsm', label: 'Digital Surface Model', format: 'GeoTIFF', icon: Mountain, desc: 'Surface elevations including vegetation & built assets' },
                  { id: 'point_cloud', label: 'RGB Point Cloud', format: 'LAS / PLY', icon: Boxes, desc: 'Colorized densified 3D point cloud classification' },
                  { id: '3d_model', label: '3D Mesh Model', format: 'OBJ / FBX', icon: Box, desc: 'Textured photogrammetric 3D reality mesh' },
                  { id: 'cad', label: 'CAD Vector Plan', format: 'DWG / DXF', icon: Cpu, desc: '2D/3D digitized planimetric linework' },
                  { id: 'volumetric_analysis', label: 'Volumetric Report', format: 'PDF / XLS', icon: Activity, desc: 'Stockpile cut/fill volumetric computation' },
                  { id: 'contour', label: 'Elevation Contours', format: 'SHP / DXF', icon: Activity, desc: 'Topographic index & intermediate vector contours' },
                ];

                const selectedPreList = allPreCatalog.filter((item) => isPreDelivSelected(item.id));
                const selectedPostList = allPostCatalog.filter((item) => isPostDelivSelected(item.id));
                const totalCount = selectedPreList.length + selectedPostList.length + (preOtherCustomText ? 1 : 0) + (postOtherCustomText ? 1 : 0);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.45rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b' }}>Requested Deliverables</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.12rem 0.5rem', backgroundColor: '#09090b', color: '#ffffff', borderRadius: '12px' }}>
                          {totalCount} Selected
                        </span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Output Specifications</span>
                    </div>

                    {/* Pre-Processing Section */}
                    {optPreProcessing && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                            Pre-Processing Deliverables
                          </span>
                          <span style={{ fontSize: '0.675rem', color: '#71717a' }}>{selectedPreList.length} items</span>
                        </div>

                        {selectedPreList.length === 0 && !preOtherCustomText ? (
                          <div style={{ padding: '0.5rem 0.65rem', backgroundColor: '#fafafa', border: '1px dashed #d4d4d8', borderRadius: '6px', fontSize: '0.725rem', color: '#71717a' }}>
                            No pre-processing deliverables selected
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {selectedPreList.map((item) => {
                              const IconComp = item.icon;
                              return (
                                <div
                                  key={item.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '0.6rem',
                                    padding: '0.45rem 0.65rem',
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #18181b',
                                    borderRadius: '6px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                                    <div style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#09090b', flexShrink: 0 }}>
                                      <IconComp size={13} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                      <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#09090b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.label}
                                      </span>
                                      <span style={{ fontSize: '0.65rem', color: '#71717a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.desc}
                                      </span>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.12rem 0.4rem', backgroundColor: '#f4f4f5', color: '#09090b', borderRadius: '4px', border: '1px solid #e4e4e7' }}>
                                      {item.format}
                                    </span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.65rem', fontWeight: 700, color: '#16a34a' }}>
                                      <CheckCircle2 size={12} />
                                      Opted
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                            {preOtherCustomText && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 0.65rem', backgroundColor: '#f4f4f5', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.725rem' }}>
                                <Sparkles size={13} color="#09090b" style={{ flexShrink: 0 }} />
                                <strong style={{ color: '#09090b' }}>Custom:</strong>
                                <span style={{ color: '#27272a' }}>{preOtherCustomText}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Post-Processing Section */}
                    {optPostProcessing && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: optPreProcessing ? '0.25rem' : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                            Post-Processing Deliverables
                          </span>
                          <span style={{ fontSize: '0.675rem', color: '#71717a' }}>{selectedPostList.length} items</span>
                        </div>

                        {selectedPostList.length === 0 && !postOtherCustomText ? (
                          <div style={{ padding: '0.5rem 0.65rem', backgroundColor: '#fafafa', border: '1px dashed #d4d4d8', borderRadius: '6px', fontSize: '0.725rem', color: '#71717a' }}>
                            No post-processing deliverables selected
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {selectedPostList.map((item) => {
                              const IconComp = item.icon;
                              return (
                                <div
                                  key={item.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '0.6rem',
                                    padding: '0.45rem 0.65rem',
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #18181b',
                                    borderRadius: '6px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                                    <div style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#09090b', flexShrink: 0 }}>
                                      <IconComp size={13} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                      <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#09090b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.label}
                                      </span>
                                      <span style={{ fontSize: '0.65rem', color: '#71717a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.desc}
                                      </span>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.12rem 0.4rem', backgroundColor: '#f4f4f5', color: '#09090b', borderRadius: '4px', border: '1px solid #e4e4e7' }}>
                                      {item.format}
                                    </span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.65rem', fontWeight: 700, color: '#16a34a' }}>
                                      <CheckCircle2 size={12} />
                                      Opted
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                            {postOtherCustomText && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 0.65rem', backgroundColor: '#f4f4f5', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.725rem' }}>
                                <Sparkles size={13} color="#09090b" style={{ flexShrink: 0 }} />
                                <strong style={{ color: '#09090b' }}>Custom:</strong>
                                <span style={{ color: '#27272a' }}>{postOtherCustomText}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Bottom Row: Attachments (Left) & Client Remarks (Right) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)', gap: '1.25rem', alignItems: 'stretch' }}>
            {/* Attachments Card - Deduplicated & Real Count */}
            <div className="wf-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '8px' }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                  Attachments ({attachments.length})
                </h3>
                <p style={{ fontSize: '0.775rem', color: '#52525b', marginTop: '0.15rem' }}>
                  Files uploaded by the client (KML boundary, scope of work, technical references).
                </p>
              </div>

              {attachments.length === 0 ? (
                <div
                  style={{
                    padding: '2rem',
                    textAlign: 'center',
                    backgroundColor: '#fafafa',
                    border: '1px dashed #d4d4d8',
                    borderRadius: '6px',
                    color: '#71717a',
                    fontSize: '0.8rem',
                  }}
                >
                  No attachment files uploaded with this request.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #e4e4e7', borderRadius: '6px' }}>
                  <table className="wf-table" style={{ margin: 0, width: '100%' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#fafafa' }}>
                        <th style={{ width: '6%', textAlign: 'center' }}>#</th>
                        <th style={{ width: '38%' }}>File Name</th>
                        <th style={{ width: '14%' }}>Type</th>
                        <th style={{ width: '14%' }}>Size</th>
                        <th style={{ width: '14%', textAlign: 'center' }}>Uploaded</th>
                        <th style={{ width: '14%', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attachments.map((file) => (
                        <tr
                          key={file.id}
                          onClick={() => {
                            downloadDocument({
                              name: file.name,
                              dataUrl: file.dataUrl,
                              type: file.type,
                              projectTitle: projectData?.title || requestData?.project_title || undefined,
                            });
                          }}
                          style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                          title={`Click to download ${file.name} directly`}
                        >
                          <td style={{ textAlign: 'center', color: '#71717a', fontSize: '0.75rem' }}>{file.id}</td>
                          <td style={{ fontWeight: 600, color: '#09090b', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <FileText size={14} color="#09090b" style={{ flexShrink: 0 }} />
                              <span style={{ textDecoration: 'underline', textUnderlineOffset: '2px' }}>{file.name}</span>
                            </div>
                          </td>
                          <td style={{ fontSize: '0.75rem', color: '#52525b' }}>
                            <span style={{ padding: '0.12rem 0.4rem', backgroundColor: '#f4f4f5', borderRadius: '4px', fontWeight: 600, fontSize: '0.7rem' }}>
                              {file.type}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.75rem', color: '#52525b' }}>{file.size}</td>
                          <td style={{ fontSize: '0.75rem', color: '#52525b', textAlign: 'center' }}>{file.date}</td>
                          <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  downloadDocument({
                                    name: file.name,
                                    dataUrl: file.dataUrl,
                                    type: file.type,
                                    projectTitle: projectData?.title || requestData?.project_title || undefined,
                                  });
                                }}
                                title="Download authentic file directly"
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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Client Remarks Card */}
            <div className="wf-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '8px' }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', margin: 0 }}>Client Remarks</h3>
                <p style={{ fontSize: '0.775rem', color: '#52525b', marginTop: '0.15rem' }}>
                  Operational notes and special instructions from client.
                </p>
              </div>

              <div
                style={{
                  backgroundColor: '#fafafa',
                  border: '1px solid #e4e4e7',
                  borderRadius: '6px',
                  padding: '1.25rem',
                  fontSize: '0.825rem',
                  color: '#09090b',
                  lineHeight: 1.6,
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {reqPayload.remarks?.trim() ||
                  reqPayload.client_notes?.trim() ||
                  'No special remarks or operational instructions provided by the client.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ── SECTION 2: PLANNING OVERVIEW (FEASIBILITY & OPERATIONAL PLAN) ── */}
      {/* ========================================================================= */}
      {activeTab === 'planning' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {!isPlanningFilled ? (
            /* ── STATE A: YET TO BE PLANNED / CONTINUE PLANNING ── */
            <div
              className="wf-card"
              style={{
                padding: '3.5rem 1.5rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.25rem',
                backgroundColor: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  backgroundColor: (isOps && hasDraftInProgress) ? '#09090b' : '#f4f4f5',
                  border: (isOps && hasDraftInProgress) ? '1px solid #09090b' : '1px solid #d4d4d8',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: (isOps && hasDraftInProgress) ? '#ffffff' : '#09090b',
                }}
              >
                {isOps && hasDraftInProgress ? 'Planning in Progress' : 'Yet to be planned'}
              </div>

              <div style={{ maxWidth: '520px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                  {isOps && hasDraftInProgress
                    ? 'Operational Planning in Progress'
                    : 'Operational Plan Yet to be Formulated'}
                </h3>
                <p style={{ fontSize: '0.825rem', color: '#52525b', marginTop: '0.5rem', lineHeight: 1.6 }}>
                  {isOps && hasDraftInProgress
                    ? 'An operational planning draft is in progress with saved parameters and remarks. You can resume calibration from your previous session.'
                    : 'The operational planning and feasibility assessment for this survey request has not been submitted yet. Latrics Operations engineers calibrate airspace zones, terrain hazards, ground control points, and flight telemetry across 8 assessment stages.'}
                </p>
              </div>

              {isOps ? (
                <button
                  onClick={handleGoToPlanning}
                  className="btn btn-primary"
                  style={{
                    padding: '0.75rem 2rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    border: '1px solid #09090b',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                >
                  <span>{hasDraftInProgress ? 'Continue Planning' : 'Create Plan'}</span>
                  <ArrowRight size={15} />
                </button>
              ) : (
                <div
                  style={{
                    padding: '0.65rem 1.25rem',
                    backgroundColor: '#f4f4f5',
                    border: '1px solid #d4d4d8',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: '#09090b',
                    fontWeight: 600,
                  }}
                >
                  Operational plan is under formulation by LATRICS Operations. You will be able to review, add remarks, and attach documents once submitted.
                </div>
              )}
            </div>
          ) : (
            /* ── STATE B: PLANNING FORM OVERVIEW (8 ASSESSMENT STAGES) ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Ops Unfinished Draft Continuation Banner (shown ONLY to Ops when unsubmitted draft changes exist) */}
              {isOps && hasDraftInProgress && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.9rem 1.25rem',
                    backgroundColor: '#fafafa',
                    border: '1.5px solid #09090b',
                    borderRadius: '8px',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#09090b',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Clock size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
                        Unfinished Planning Draft
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#52525b', marginTop: '0.1rem' }}>
                        You have unsubmitted draft modifications for this plan. You can resume editing from the exact state you left off.
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleGoToPlanning}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.5rem 1.15rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      backgroundColor: '#09090b',
                      color: '#ffffff',
                      border: '1px solid #09090b',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <span>Continue Planning</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}

              {/* Client Clarification Request Banner */}
              {isClient && (planningDetails.decision === 'NEED_CLARITY' || planningDetails.planStatus === 'awaiting_clarity') && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.9rem 1.25rem',
                    backgroundColor: '#fafafa',
                    border: '1.5px solid #09090b',
                    borderRadius: '8px',
                    gap: '1rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#09090b',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontWeight: 800,
                        fontSize: '0.9rem',
                      }}
                    >
                      ?
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
                        Clarifications Requested by LATRICS Operations
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#52525b', marginTop: '0.1rem' }}>
                        LATRICS Operations reviewed this planning form and marked it as &ldquo;Need More Clarity&rdquo;. Please open the planning form to inspect flight parameters (read-only) and reply directly to Operations remarks.
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleGoToPlanning}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.5rem 1.15rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      backgroundColor: '#09090b',
                      color: '#ffffff',
                      border: '1px solid #09090b',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <span>Review &amp; Respond</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}

              {/* Planning Form Overview Header Card */}
              <div
                className="wf-card"
                style={{
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e4e4e7',
                  borderRadius: '8px',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                      Planning Form Overview
                    </h3>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: '#09090b',
                        color: '#ffffff',
                      }}
                    >
                      {planningDetails.versionCode}
                    </span>
                    <span
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: '#f4f4f5',
                        border: '1px solid #d4d4d8',
                        color: '#09090b',
                        textTransform: 'capitalize',
                      }}
                    >
                      {planningDetails.planStatus.replace('_', ' ')}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.785rem', color: '#52525b', marginTop: '0.25rem', margin: 0 }}>
                    Formulated by <strong style={{ color: '#09090b' }}>{planningDetails.updatedBy}</strong> on {planningDetails.updatedAt}
                  </p>
                </div>

                <button
                  onClick={handleGoToPlanning}
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    height: '36px',
                    padding: '0 1rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    borderRadius: '6px',
                    border: '1px solid #09090b',
                    cursor: 'pointer',
                  }}
                >
                  <span>
                    {isOps
                      ? hasDraftInProgress
                        ? 'Continue Planning'
                        : 'Edit Planning Form'
                      : planningDetails.decision === 'NEED_CLARITY' || planningDetails.planStatus === 'awaiting_clarity'
                      ? 'Review & Respond to Remarks'
                      : 'View Planning Form'}
                  </span>
                  <ArrowRight size={13} />
                </button>
              </div>

              {/* 1. KML Findings & Boundary Demarcation */}
              <div className="wf-card" style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#ffffff' }}>
                <div style={{ marginBottom: '0.85rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    1. KML Findings &amp; Boundary Demarcation
                  </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem 1rem', fontSize: '0.825rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>KML Boundary File</span>
                    <strong style={{ color: '#09090b' }}>
                      {planningDetails.kmlFile} {planningDetails.kmlSize !== '—' ? `(${planningDetails.kmlSize})` : ''}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Calculated Survey Area</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.calculatedArea}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Requested Area</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.requestedArea}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Boundary Demarcation Status / Notes</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.boundaryNotes}</strong>
                  </div>
                </div>
              </div>

              {/* 2. Regularity and Airspace Classification */}
              <div className="wf-card" style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#ffffff' }}>
                <div style={{ marginBottom: '0.85rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    2. Regularity and Airspace Classification
                  </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem 1rem', fontSize: '0.825rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>DigitalSky Airspace Classification</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.airspaceZones}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>DGCA Clearance Required</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.dgcaClearance}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Airport Proximity</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.airportProximity}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Nearest Aerodrome / Runway</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.nearestAerodrome}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Police &amp; Local Administration Intimation</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.policeIntimation}</strong>
                  </div>
                </div>
              </div>

              {/* 3. Accessibility & Terrain Feasibility */}
              <div className="wf-card" style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#ffffff' }}>
                <div style={{ marginBottom: '0.85rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    3. Accessibility &amp; Terrain Feasibility
                  </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem 1rem', fontSize: '0.825rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Terrain Classification</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.terrain}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Elevation Variation</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.elevationVariation}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Field Take-off / Landing Access</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.fieldAccess}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Operational Weather Limits</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.weather}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Staging &amp; Ground Access Notes</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.stagingNotes}</strong>
                  </div>
                </div>
              </div>

              {/* 4. Obstacles and Hazards Assessment */}
              <div className="wf-card" style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#ffffff' }}>
                <div style={{ marginBottom: '0.85rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    4. Obstacles &amp; Hazards Assessment
                  </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem 1rem', fontSize: '0.825rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Identified Hazards</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.hazards}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Max Obstacle Height</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.maxObstacleHeight}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Safety Buffer Distance</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.safetyBuffer}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Mitigation &amp; Safety Protocol</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.hazardMitigation}</strong>
                  </div>
                </div>
              </div>

              {/* 5. Ground Control Points (GCP) Planning */}
              <div className="wf-card" style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#ffffff' }}>
                <div style={{ marginBottom: '0.85rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    5. Ground Control Points (GCP) Planning
                  </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem 1rem', fontSize: '0.825rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>GCPs Required</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.gcpsNeeded}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Checkpoints Required</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.checkpoints}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Target Size &amp; Material</span>
                    <strong style={{ color: '#09090b' }}>
                      {planningDetails.targetSize !== '—' ? planningDetails.targetSize : ''}
                      {planningDetails.targetSize !== '—' && planningDetails.targetMaterial !== '—' ? ' • ' : ''}
                      {planningDetails.targetMaterial !== '—' ? planningDetails.targetMaterial : ''}
                      {planningDetails.targetSize === '—' && planningDetails.targetMaterial === '—' ? '—' : ''}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Base Station Setup</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.baseStation}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>GCP Locations / Coordinate File</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.gcpFile}</strong>
                  </div>
                </div>
              </div>

              {/* 6. Flight Planning & Telemetry Design */}
              <div className="wf-card" style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#ffffff' }}>
                <div style={{ marginBottom: '0.85rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    6. Flight Planning &amp; Telemetry Design
                  </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem 1rem', fontSize: '0.825rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Planned Flight Altitude</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.plannedAltitude}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Estimated Ground Sampling Distance (GSD)</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.gsd}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Overlap Ratio (Front / Side)</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.overlapRatio}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Total Flight Airtime Duration</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.totalFlightDuration}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Number of Flights / Landings</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.landings}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Battery Sets Required</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.batterySets}</strong>
                  </div>
                </div>
              </div>

              {/* 7. Expected Operational Timelines */}
              <div className="wf-card" style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#ffffff' }}>
                <div style={{ marginBottom: '0.85rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    7. Expected Operational Timelines
                  </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem 1rem', fontSize: '0.825rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Expected Survey Days</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.surveyDays}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Target Operational Window</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.targetWindow}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Pilot &amp; Crew Travel Date</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.pilotTravelDate}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Weather Contingency Days</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.weatherContingency}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Data Delivery Timeline</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.deliveryTimeline}</strong>
                  </div>
                </div>
              </div>

              {/* 8. Feasible to Proceed & Operations Sign-off */}
              <div className="wf-card" style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#ffffff' }}>
                <div style={{ marginBottom: '0.85rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    8. Feasible to Proceed &amp; Operations Sign-off
                  </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem 1rem', fontSize: '0.825rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Feasibility Decision</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.decision}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Review Confirmation</span>
                    <strong style={{ color: '#09090b' }}>{planningDetails.reviewConfirmed}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Lead Operations Engineer Remarks</span>
                    <div
                      style={{
                        padding: '0.65rem 0.85rem',
                        backgroundColor: '#fafafa',
                        border: '1px solid #e4e4e7',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        color: '#09090b',
                        marginTop: '0.2rem',
                        lineHeight: 1.5,
                      }}
                    >
                      {planningDetails.decisionRemarks}
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Published Strategy & Quotation (if published) */}
              {activePlan && (
                <div className="wf-card" style={{ padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e4e4e7' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                        Active Operational Plan Quotation &amp; Fleet Strategy
                      </h4>
                      <p style={{ fontSize: '0.785rem', color: '#52525b', marginTop: '0.2rem', margin: 0 }}>
                        Published milestone pricing and resource allocations.
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        backgroundColor: '#09090b',
                        color: '#ffffff',
                      }}
                    >
                      {activePlan.status}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: '#fafafa', borderRadius: '6px', border: '1px solid #f4f4f5' }}>
                      <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 600 }}>Total Flight Airtime</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#09090b', marginTop: '0.25rem' }}>
                        {activePlan.estimated_flight_hours} hrs
                      </div>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: '#fafafa', borderRadius: '6px', border: '1px solid #f4f4f5' }}>
                      <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 600 }}>Required Pilots</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#09090b', marginTop: '0.25rem' }}>
                        {activePlan.required_pilots_count} Crew
                      </div>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: '#fafafa', borderRadius: '6px', border: '1px solid #f4f4f5' }}>
                      <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 600 }}>Drone Units</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#09090b', marginTop: '0.25rem' }}>
                        {activePlan.required_drones_count} Units
                      </div>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: '#fafafa', borderRadius: '6px', border: '1px solid #f4f4f5' }}>
                      <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 600 }}>Total Quotation</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#09090b', marginTop: '0.25rem' }}>
                        ${activePlan.estimated_cost_usd?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
