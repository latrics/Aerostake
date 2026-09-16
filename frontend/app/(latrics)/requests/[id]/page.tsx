'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  Download,
  FileText,
  Calendar,
  Building2,
  MapPin,
  Clock,
  Flag,
  Scan,
  Maximize2,
  Camera,
  SlidersHorizontal,
  Layers,
  Globe,
  Paperclip,
  MessageSquare,
  User,
  Mail,
  Phone,
  Users,
  Check,
  Eye,
  Loader2,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  Settings,
  FileCheck,
  CheckSquare,
  Square,
  Sparkles,
  ExternalLink,
  Building,
} from 'lucide-react';
import { requestApi } from '@/modules/requests/api';
import { projectApi } from '@/modules/projects/api';
import { planningApi } from '@/modules/planning/api';
import { RequestVersion } from '@/modules/requests/types';
import { Project } from '@/modules/projects/types';
import { PlanPublishModal } from '@/modules/planning/components/PlanPublishModal';

interface ContactItem {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
}

export default function RequestOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = (params?.id as string) || '';

  // Data State
  const [requestData, setRequestData] = useState<RequestVersion | null>(null);
  const [projectData, setProjectData] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active Tab: 'overview' or 'planning'
  const [activeTab, setActiveTab] = useState<'overview' | 'planning'>('overview');

  // Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

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
        if (foundReq.project_id) {
          foundProj = await projectApi.getProject(foundReq.project_id).catch(() => null);
        }
      }

      if (foundProj) {
        setProjectData(foundProj);
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
  const reqPayload = (requestData?.requirements_payload || projectData?.requirements_payload || {}) as Record<string, any>;

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
    // 1. Explicit address field from requirements_payload
    const explicitAddress =
      reqPayload.address ||
      reqPayload.site_address ||
      reqPayload.location_address ||
      reqPayload.survey_address ||
      reqPayload.location;
    if (explicitAddress && typeof explicitAddress === 'string' && explicitAddress.trim()) {
      return explicitAddress.trim();
    }

    // 2. Raw survey location from request or project
    const rawLoc = (
      requestData?.survey_location ||
      projectData?.survey_location ||
      reqPayload.survey_location ||
      ''
    ).trim();

    // Check if rawLoc is mistakenly set to company name or project title
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
    const area = requestData?.target_area_sqkm || projectData?.target_area_sqkm || reqPayload.target_area_sqkm;
    return area ? `${area} sq km` : '—';
  }, [requestData?.target_area_sqkm, projectData?.target_area_sqkm, reqPayload.target_area_sqkm]);

  const formatDateString = (dateVal?: string | null) => {
    if (!dateVal) return '—';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return dateVal;
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateVal;
    }
  };

  const formatDateTimeString = (dateVal?: string | null) => {
    if (!dateVal) return '—';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return dateVal;
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateVal;
    }
  };

  const displayStartDate = reqPayload.start_date ? formatDateString(reqPayload.start_date) : '—';
  const displayEndDate = reqPayload.end_date ? formatDateString(reqPayload.end_date) : '—';
  const displayReceivedOn = formatDateTimeString(requestData?.created_at || projectData?.created_at);

  const displayStatus = (
    requestData?.project_status ||
    projectData?.status ||
    'submitted'
  ).toLowerCase();

  const displayPriority = reqPayload.priority || 'Medium';

  const displayDescription =
    reqPayload.remarks ||
    reqPayload.description ||
    reqPayload.client_notes ||
    projectData?.description ||
    'No project description provided by client.';

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

  // Additional / Communication Contacts list
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

  // Attachments List dynamically extracted from client upload metadata
  const attachments = useMemo(() => {
    const list: Array<{ id: number; name: string; type: string; size: string; date: string }> = [];
    let count = 1;

    if (reqPayload.kml_filename) {
      list.push({
        id: count++,
        name: reqPayload.kml_filename,
        type: 'KML',
        size: '2.4 MB',
        date: formatDateString(requestData?.created_at || projectData?.created_at),
      });
    }

    if (reqPayload.scope_filename) {
      list.push({
        id: count++,
        name: reqPayload.scope_filename,
        type: 'Document',
        size: '1.1 MB',
        date: formatDateString(requestData?.created_at || projectData?.created_at),
      });
    }

    if (Array.isArray(reqPayload.attachments)) {
      reqPayload.attachments.forEach((att: any) => {
        if (typeof att === 'string') {
          list.push({
            id: count++,
            name: att,
            type: att.endsWith('.kml') ? 'KML' : att.endsWith('.pdf') ? 'Document' : 'File',
            size: '—',
            date: formatDateString(requestData?.created_at || projectData?.created_at),
          });
        } else if (typeof att === 'object' && att?.name) {
          list.push({
            id: count++,
            name: att.name,
            type: att.type || 'File',
            size: att.size || '—',
            date: att.date || formatDateString(requestData?.created_at || projectData?.created_at),
          });
        }
      });
    }

    return list;
  }, [reqPayload.kml_filename, reqPayload.scope_filename, reqPayload.attachments, requestData?.created_at, projectData?.created_at]);

  // Dynamic Pipeline Stage Completion
  const pipelineStages = useMemo(() => {
    const s = displayStatus.toLowerCase();
    const isSubmitted = s === 'submitted' || s === 'draft';
    const isPlanning = s === 'planning';
    const isApproved = s === 'approved';
    const isInProgress = s === 'active' || s === 'in_progress';
    const isCompleted = s === 'completed';

    return [
      {
        step: 1,
        title: 'Request Submitted',
        date: displayReceivedOn !== '—' ? displayReceivedOn : '',
        active: isSubmitted,
        completed: true,
      },
      {
        step: 2,
        title: 'Under Review',
        active: isSubmitted || isPlanning,
        completed: isPlanning || isApproved || isInProgress || isCompleted,
      },
      {
        step: 3,
        title: 'Planning',
        active: isPlanning,
        completed: isApproved || isInProgress || isCompleted,
      },
      {
        step: 4,
        title: 'Approved',
        active: isApproved,
        completed: isApproved || isInProgress || isCompleted,
      },
      {
        step: 5,
        title: 'In Progress',
        active: isInProgress,
        completed: isCompleted,
      },
      {
        step: 6,
        title: 'Completed',
        active: isCompleted,
        completed: isCompleted,
      },
    ];
  }, [displayStatus, displayReceivedOn]);

  // Client Requirement Specifications (Immutable Read-Only extraction)
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

  // Processing modes: multi-type selection (client can choose Pre, Post, or Both)
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

  // Deliverables extraction
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

  const handleDownloadPdf = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div style={{ padding: '5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
        <p style={{ fontSize: '0.875rem' }}>Loading request data from client submission...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem' }}>
      {/* ── 1. Top Breadcrumb & Actions Bar ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Breadcrumb path */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Link href="/requests" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>
            Requests
          </Link>
          <ChevronRight size={14} color="#a1a1aa" />
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{displayClientCompany}</span>
          <ChevronRight size={14} color="#a1a1aa" />
          <span style={{ color: '#09090b', fontWeight: 700 }}>
            {displayVersionString} – {displayProjectTitle}
          </span>
        </div>

        {/* Page Title & Action Buttons Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.02em', margin: 0 }}>
                Request {displayVersionString}
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
                  textTransform: 'capitalize',
                }}
              >
                {displayStatus}
              </span>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              Submitted by <strong style={{ color: '#09090b' }}>{displayClientCompany}</strong> on {displayReceivedOn}
            </p>
          </div>

          {/* Action Buttons Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <Link
              href="/requests"
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                height: '38px',
                padding: '0 0.9rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: '#09090b',
                textDecoration: 'none',
              }}
            >
              <ArrowLeft size={15} />
              <span>Back to Requests</span>
            </Link>

            <button
              onClick={() => setIsPlanModalOpen(true)}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                height: '38px',
                padding: '0 1rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                backgroundColor: '#09090b',
                color: '#ffffff',
                borderRadius: '6px',
                border: '1px solid #09090b',
                cursor: 'pointer',
              }}
            >
              <Upload size={15} />
              <span>Upload Plan</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                height: '38px',
                padding: '0 0.9rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: '#09090b',
                cursor: 'pointer',
              }}
            >
              <Download size={15} />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Overview / Planning) */}
        <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '0.5rem 0.25rem 0.75rem',
              fontSize: '0.875rem',
              fontWeight: activeTab === 'overview' ? 700 : 500,
              color: activeTab === 'overview' ? '#09090b' : 'var(--text-muted)',
              borderBottom: activeTab === 'overview' ? '2.5px solid #09090b' : '2.5px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Overview
          </button>
          <button
            onClick={() => {
              router.push(`/requests/${requestId}/planning`);
            }}
            style={{
              padding: '0.5rem 0.25rem 0.75rem',
              fontSize: '0.875rem',
              fontWeight: activeTab === 'planning' ? 700 : 500,
              color: activeTab === 'planning' ? '#09090b' : 'var(--text-muted)',
              borderBottom: activeTab === 'planning' ? '2.5px solid #09090b' : '2.5px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Planning
          </button>
        </div>
      </div>

      {/* ── 2. Top Row: Project Overview (Left) & Client Contact (Right) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)', gap: '1.25rem', alignItems: 'stretch' }}>
        {/* Project Overview Card */}
        <div className="wf-card" style={{ padding: '1.35rem 1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#fafafa',
                  color: '#09090b',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                <FileText size={17} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', margin: 0 }}>Project Overview</h3>
                <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Key information and summary of the client&apos;s request.
                </p>
              </div>
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
              {displayVersionString}
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
                <FileText size={15} color="#71717a" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', minWidth: '120px' }}>Project Title</span>
                <strong style={{ color: '#09090b', wordBreak: 'break-word' }}>{displayProjectTitle}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Building2 size={15} color="#71717a" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', minWidth: '120px' }}>Client Company</span>
                <strong style={{ color: '#09090b', wordBreak: 'break-word' }}>{displayClientCompany}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                <MapPin size={15} color="#71717a" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ color: 'var(--text-secondary)', minWidth: '120px' }}>Project Location</span>
                <strong style={{ color: '#09090b', lineHeight: 1.35, wordBreak: 'break-word' }}>{displayLocation}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Building size={15} color="#71717a" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', minWidth: '120px' }}>City</span>
                <strong style={{ color: '#09090b', wordBreak: 'break-word' }}>{displayCity}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Globe size={15} color="#71717a" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', minWidth: '120px' }}>State</span>
                <strong style={{ color: '#09090b', wordBreak: 'break-word' }}>{displayState}</strong>
              </div>
            </div>

            {/* Right Column Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Camera size={15} color="#71717a" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', minWidth: '135px' }}>Payload</span>
                <strong style={{ color: '#09090b', wordBreak: 'break-word' }}>{displayPayload}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Maximize2 size={15} color="#71717a" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', minWidth: '135px' }}>Area to Cover</span>
                <strong style={{ color: '#09090b' }}>{displayArea}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Calendar size={15} color="#71717a" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', minWidth: '135px' }}>Expected Start Date</span>
                <strong style={{ color: '#09090b' }}>{displayStartDate}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Calendar size={15} color="#71717a" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', minWidth: '135px' }}>Expected Completion</span>
                <strong style={{ color: '#09090b' }}>{displayEndDate}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Clock size={15} color="#71717a" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', minWidth: '135px' }}>Received On</span>
                <strong style={{ color: '#09090b' }}>{displayReceivedOn}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <FileCheck size={15} color="#71717a" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', minWidth: '135px' }}>Current Status</span>
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
        <div className="wf-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fafafa',
                color: '#09090b',
                flexShrink: 0,
                marginTop: '2px',
              }}
            >
              <User size={17} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', margin: 0 }}>Client Contact</h3>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Primary point of contact for this request.
              </p>
            </div>
          </div>

          {/* Primary Contact Details List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <User size={15} color="#71717a" style={{ flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)', minWidth: '90px' }}>Name</span>
              <strong style={{ color: '#09090b' }}>{displayClientName}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Mail size={15} color="#71717a" style={{ flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)', minWidth: '90px' }}>Email</span>
              <span style={{ color: '#09090b', fontWeight: 500 }}>{displayClientEmail}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Phone size={15} color="#71717a" style={{ flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)', minWidth: '90px' }}>Phone</span>
              <span style={{ color: '#09090b', fontWeight: 500 }}>{displayClientPhone}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Building2 size={15} color="#71717a" style={{ flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)', minWidth: '90px' }}>Company</span>
              <strong style={{ color: '#09090b' }}>{displayClientCompany}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Users size={15} color="#71717a" style={{ flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)', minWidth: '90px' }}>Department</span>
              <span style={{ color: '#09090b', fontWeight: 500 }}>{displayClientDepartment}</span>
            </div>
          </div>

          {/* Additional Contacts Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>Additional Contacts (if any)</span>
            {additionalContacts.length === 0 ? (
              <div
                style={{
                  padding: '0.75rem 0.85rem',
                  backgroundColor: '#fafafa',
                  border: '1px dashed var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
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
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#f4f4f5',
                          color: '#71717a',
                          flexShrink: 0,
                        }}
                      >
                        <User size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>{contact.name}</div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>{contact.role || 'Project Coordinator'}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.725rem' }}>
                      {contact.email && <span style={{ color: '#09090b', fontWeight: 500 }}>{contact.email}</span>}
                      {contact.phone && <span style={{ color: 'var(--text-secondary)' }}>{contact.phone}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Request Pipeline Stepper Card ── */}
      <div className="wf-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fafafa',
              color: '#09090b',
              flexShrink: 0,
            }}
          >
            <TrendingUp size={17} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', margin: 0 }}>Request Pipeline</h3>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Current stage and progress of this request.
            </p>
          </div>
        </div>

        {/* Stepper Flow Container */}
        <div style={{ position: 'relative', width: '100%', padding: '0.5rem 1rem 1rem' }}>
          {/* Horizontal Connecting Line */}
          <div
            style={{
              position: 'absolute',
              top: '25px',
              left: '5%',
              right: '5%',
              height: '2px',
              backgroundColor: '#d4d4d8',
              zIndex: 1,
            }}
          />

          {/* Stepper Points Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              position: 'relative',
              zIndex: 2,
            }}
          >
            {pipelineStages.map((stage) => {
              const isFilled = stage.completed || stage.active;
              return (
                <div
                  key={stage.step}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '0.45rem',
                  }}
                >
                  {/* Step Circle Indicator */}
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      backgroundColor: isFilled ? '#09090b' : '#ffffff',
                      color: isFilled ? '#ffffff' : '#09090b',
                      border: isFilled ? '2px solid #09090b' : '2px solid #a1a1aa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    }}
                  >
                    {stage.step}
                  </div>

                  {/* Stage Label & Optional Timestamp */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: isFilled ? 800 : 500,
                        color: isFilled ? '#09090b' : '#71717a',
                      }}
                    >
                      {stage.title}
                    </span>
                    {stage.date && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{stage.date}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 4. Survey Requirements Card (3 Columns: Payload, Processing, Deliverables) ── */}
      <div className="wf-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fafafa',
                color: '#09090b',
                flexShrink: 0,
              }}
            >
              <Settings size={17} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', margin: 0 }}>Survey Requirements</h3>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Sensors, processing modes, and deliverables submitted by the client.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
              IMMUTABLE CLIENT SUBMISSION (READ-ONLY)
            </span>
          </div>
        </div>

        {/* 3-Column Requirements Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '1.25rem', alignItems: 'start' }}>
          {/* Column 1: Payload / Sensor (Read-Only) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Camera size={15} color="#09090b" />
                <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b' }}>Payload / Sensor</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Selected by Client</span>
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
                transition: 'all 0.15s ease',
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
                {is61MP && (
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#09090b' }} />
                )}
              </div>
              <Camera size={20} color={is61MP ? '#09090b' : '#71717a'} style={{ flexShrink: 0 }} />
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
                <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>High resolution RGB imagery</div>
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
                transition: 'all 0.15s ease',
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
                {isLidar && (
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#09090b' }} />
                )}
              </div>
              <Layers size={20} color={isLidar ? '#09090b' : '#71717a'} style={{ flexShrink: 0 }} />
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
                <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>3D spatial data capture</div>
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
                transition: 'all 0.15s ease',
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
                {isOblique && (
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#09090b' }} />
                )}
              </div>
              <Globe size={20} color={isOblique ? '#09090b' : '#71717a'} style={{ flexShrink: 0 }} />
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
                <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>Multi-angle imagery</div>
              </div>
            </div>
          </div>

          {/* Column 2: Processing Type (Supports Multi-Selection: Pre, Post, or Both) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <SlidersHorizontal size={15} color="#09090b" />
                <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b' }}>Processing Mode</span>
              </div>
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
                transition: 'all 0.15s ease',
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
                }}
              >
                {optPreProcessing && <Check size={12} color="#ffffff" strokeWidth={3} />}
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
                <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>Raw data and basic outputs</div>
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
                transition: 'all 0.15s ease',
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
                }}
              >
                {optPostProcessing && <Check size={12} color="#ffffff" strokeWidth={3} />}
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
                <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>Value added products and analysis</div>
              </div>
            </div>

            {/* Summary Information Callout */}
            <div
              style={{
                padding: '0.6rem 0.75rem',
                backgroundColor: '#f8f9fa',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '0.725rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.4,
              }}
            >
              Mode configuration: <strong style={{ color: '#09090b' }}>{optPreProcessing && optPostProcessing ? 'Pre & Post Processing' : optPreProcessing ? 'Pre-Processing Only' : 'Post-Processing Only'}</strong>
            </div>
          </div>

          {/* Column 3: Requested Deliverables (Read-Only) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <FileText size={15} color="#09090b" />
                <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b' }}>Requested Deliverables</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Read-Only Specifications</span>
            </div>

            {/* Pre-Processing Deliverables List (if opted) */}
            {optPreProcessing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#09090b' }}>
                  Pre-Processing Deliverables
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 0.65rem' }}>
                  {[
                    { id: 'geo_tagged_image', label: 'Geo Tagged Image' },
                    { id: 'event_files', label: 'Event Files' },
                    { id: 'point_cloud', label: 'Point Cloud' },
                    { id: 'trajectory_files', label: 'Trajectory Files' },
                  ].map((item) => {
                    const checked = isPreDelivSelected(item.id);
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          padding: '0.4rem 0.55rem',
                          backgroundColor: checked ? '#ffffff' : '#fafafa',
                          border: checked ? '1px solid #09090b' : '1px solid #e4e4e7',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: checked ? 700 : 400,
                          color: checked ? '#09090b' : '#71717a',
                          opacity: checked ? 1 : 0.6,
                        }}
                      >
                        <div
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '3px',
                            backgroundColor: checked ? '#09090b' : '#ffffff',
                            border: checked ? '1px solid #09090b' : '1px solid #d4d4d8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {checked && <Check size={10} color="#ffffff" strokeWidth={3} />}
                        </div>
                        <span>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
                {preOtherCustomText && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.35rem 0.6rem',
                      backgroundColor: '#f4f4f5',
                      border: '1px solid #d4d4d8',
                      borderRadius: '4px',
                      fontSize: '0.725rem',
                    }}
                  >
                    <strong style={{ color: '#09090b' }}>Pre-Processing Custom:</strong>
                    <span style={{ color: '#27272a' }}>{preOtherCustomText}</span>
                  </div>
                )}
              </div>
            )}

            {/* Post-Processing Deliverables List (if opted) */}
            {optPostProcessing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: optPreProcessing ? '0.35rem' : 0 }}>
                <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#09090b' }}>
                  Post-Processing Deliverables
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 0.65rem' }}>
                  {[
                    { id: 'orthomosaic', label: 'Orthomosaic' },
                    { id: 'topographic_map', label: 'Topographic Map' },
                    { id: 'dem', label: 'DEM' },
                    { id: 'dsm', label: 'DSM' },
                    { id: 'point_cloud', label: 'Point Cloud' },
                    { id: '3d_model', label: '3D Model' },
                    { id: 'cad', label: 'CAD' },
                    { id: 'volumetric_analysis', label: 'Volumetric Analysis' },
                    { id: 'contour', label: 'Contour' },
                  ].map((item) => {
                    const checked = isPostDelivSelected(item.id);
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          padding: '0.4rem 0.55rem',
                          backgroundColor: checked ? '#ffffff' : '#fafafa',
                          border: checked ? '1px solid #09090b' : '1px solid #e4e4e7',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: checked ? 700 : 400,
                          color: checked ? '#09090b' : '#71717a',
                          opacity: checked ? 1 : 0.6,
                        }}
                      >
                        <div
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '3px',
                            backgroundColor: checked ? '#09090b' : '#ffffff',
                            border: checked ? '1px solid #09090b' : '1px solid #d4d4d8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {checked && <Check size={10} color="#ffffff" strokeWidth={3} />}
                        </div>
                        <span>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
                {postOtherCustomText && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.35rem 0.6rem',
                      backgroundColor: '#f4f4f5',
                      border: '1px solid #d4d4d8',
                      borderRadius: '4px',
                      fontSize: '0.725rem',
                    }}
                  >
                    <strong style={{ color: '#09090b' }}>Post-Processing Custom:</strong>
                    <span style={{ color: '#27272a' }}>{postOtherCustomText}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 5. Bottom Row: Attachments (Left) & Client Remarks (Right) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)', gap: '1.25rem', alignItems: 'stretch' }}>
        {/* Attachments Card */}
        <div className="wf-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#fafafa',
                  color: '#09090b',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                <Paperclip size={17} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                  Attachments ({attachments.length})
                </h3>
                <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Files uploaded by the client (e.g., KML, scope of work, reference files).
                </p>
              </div>
            </div>

            {attachments.length > 0 && (
              <button
                style={{
                  fontSize: '0.775rem',
                  fontWeight: 700,
                  color: '#09090b',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                View All
              </button>
            )}
          </div>

          {/* Attachments Table or Clean Empty State */}
          {attachments.length === 0 ? (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                backgroundColor: '#fafafa',
                border: '1px dashed var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
              }}
            >
              No attachment files uploaded with this request.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              <table className="wf-table" style={{ margin: 0, width: '100%' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fafafa' }}>
                    <th style={{ width: '8%', textAlign: 'center' }}>#</th>
                    <th style={{ width: '38%' }}>File Name</th>
                    <th style={{ width: '18%' }}>Type</th>
                    <th style={{ width: '14%' }}>Size</th>
                    <th style={{ width: '14%' }}>Uploaded On</th>
                    <th style={{ width: '8%', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {attachments.map((file) => (
                    <tr key={file.id}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{file.id}</td>
                      <td style={{ fontWeight: 600, color: '#09090b', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                        {file.name}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{file.type}</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{file.size}</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{file.date}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          title={`Download ${file.name}`}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#09090b',
                            padding: '0.2rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Download size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Client Remarks Card */}
        <div className="wf-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fafafa',
                color: '#09090b',
                flexShrink: 0,
                marginTop: '2px',
              }}
            >
              <MessageSquare size={17} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', margin: 0 }}>Client Remarks</h3>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Operational notes and special instructions.
              </p>
            </div>
          </div>

          {/* Formatted Shaded Remarks Box */}
          <div
            style={{
              backgroundColor: '#f8f9fa',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '1.25rem',
              fontSize: '0.825rem',
              color: 'var(--text-primary)',
              lineHeight: 1.6,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              whiteSpace: 'pre-wrap',
            }}
          >
            {reqPayload.remarks ||
              reqPayload.client_notes ||
              projectData?.description ||
              'No special remarks or operational instructions provided by the client.'}
          </div>
        </div>
      </div>

      {/* Plan Publish Modal */}
      {isPlanModalOpen && (
        <PlanPublishModal
          isOpen={isPlanModalOpen}
          requestVersionId={requestData?.id || requestId}
          versionNumber={displayVersionNumber}
          projectName={displayProjectTitle}
          onClose={() => setIsPlanModalOpen(false)}
          onSubmit={async (rId, planData) => {
            await planningApi.publishPlan(rId, planData);
            setIsPlanModalOpen(false);
            loadRequestDetails();
          }}
        />
      )}
    </div>
  );
}
