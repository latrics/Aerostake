'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import WireframeBox from '@/components/WireframeBox';
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
} from 'lucide-react';
import { SubmitRequestModal } from '@/modules/requests/components/SubmitRequestModal';
import { projectApi } from '@/modules/projects/api';
import { sectorApi } from '@/modules/sectors/api';
import { timelineApi } from '@/modules/timeline/api';
import { planningApi } from '@/modules/planning/api';
import { paymentsApi } from '@/modules/payments/api';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Project } from '@/modules/projects/types';
import { Sector } from '@/modules/sectors/types';
import { TimelineEvent } from '@/modules/timeline/types';
import { OperationalPlan } from '@/modules/planning/types';
import { PaymentRecord } from '@/modules/payments/types';

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
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjectOverview = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const [projRes, secRes, timeRes, planRes, payRes] = await Promise.allSettled([
        projectApi.getProject(projectId),
        sectorApi.listProjectSectors(projectId),
        timelineApi.getProjectTimeline(projectId),
        planningApi.getActivePlan(projectId),
        paymentsApi.listProjectPayments(projectId),
      ]);

      if (projRes.status === 'fulfilled') setLiveProject(projRes.value);
      if (secRes.status === 'fulfilled') setLiveSectors(secRes.value || []);
      if (timeRes.status === 'fulfilled') setLiveTimeline(timeRes.value || []);
      if (planRes.status === 'fulfilled') setLivePlan(planRes.value);
      if (payRes.status === 'fulfilled') setLivePayments(payRes.value || []);
    } catch (err) {
      console.error('Error fetching project overview:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectOverview();
  }, [fetchProjectOverview]);

  const tabParam = searchParams?.get('tab');
  const [activeTab, setActiveTab] = useState<'overview' | 'visuals' | 'timeline' | 'documents' | 'team'>('overview');

  useEffect(() => {
    if (tabParam && ['overview', 'visuals', 'timeline', 'documents', 'team'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);
  const [selectedSectorId, setSelectedSectorId] = useState<number | null>(null);
  const [sectorSearchQuery, setSectorSearchQuery] = useState('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);

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

  // Phase Determination:
  // Scenario 1: Request / Planning phase (status is draft, submitted, planning, or no approved operational plan)
  // Scenario 2: Plan is published / approved / execution phase
  const isPlanningPhase = useMemo(() => {
    if (!liveProject) return true;
    const s = liveProject.status?.toLowerCase();
    return s === 'draft' || s === 'submitted' || s === 'planning' || !livePlan;
  }, [liveProject, livePlan]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const projectDetails = useMemo(() => {
    if (!liveProject) {
      return {
        id: projectId,
        title: 'Survey Project',
        status: 'Submitted',
        location: '—',
        startDate: '—',
        createdDate: '—',
        teamSize: 4,
        description: 'Initial survey request submitted by client.',
        totalArea: '—',
        totalSectors: 0,
        approvedPlanDate: '—',
        estCompletion: '—',
        overallProgress: 0,
        projectManager: 'LATRICS Operations',
        primaryContact: user?.full_name || user?.email || '—',
      };
    }

    const reqPayload = liveProject.requirements_payload || {};
    const areaVal = liveProject.target_area_sqkm || reqPayload.target_area_sqkm;
    const areaStr = areaVal ? `${areaVal} sq. km` : '25 sq. km';

    const startDateRaw = reqPayload.start_date || liveProject.created_at;
    const completedCount = liveSectors.filter((s) => s.status === 'completed' || s.status === 'verified').length;
    const overallProgress = liveSectors.length > 0 ? Math.round((completedCount / liveSectors.length) * 100) : 0;

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
      (!isCompanyOrTitle ? rawLoc : null) ||
      (reqPayload.city && reqPayload.state ? `${reqPayload.city}, ${reqPayload.state}` : '—');

    return {
      id: liveProject.id,
      title: liveProject.title,
      status: liveProject.status,
      location: safeLocation,
      startDate: formatDate(startDateRaw),
      createdDate: formatDate(liveProject.created_at),
      teamSize: 4,
      description: liveProject.description || reqPayload.remarks || 'Please help me',
      totalArea: areaStr,
      totalSectors: liveSectors.length,
      approvedPlanDate: livePlan?.created_at ? formatDate(livePlan.created_at) : '—',
      estCompletion: '—',
      overallProgress,
      projectManager: 'LATRICS Operations',
      primaryContact: user?.full_name || liveProject.client_name || user?.company_name || 'client1',
    };
  }, [liveProject, livePlan, liveSectors, projectId, user]);

  // 6-Step Lifecycle Status Resolver
  const getStepStatus = (step: number): 'completed' | 'active' | 'pending' => {
    const s = liveProject?.status?.toLowerCase() || 'submitted';
    if (s === 'completed') return 'completed';
    if (s === 'active') {
      const allDone = liveSectors.length > 0 && liveSectors.every((sec) => sec.status === 'completed');
      if (allDone) return step <= 5 ? 'completed' : 'active';
      return step <= 3 ? 'completed' : step === 4 ? 'active' : 'pending';
    }
    if (s === 'approved') {
      return step <= 2 ? 'completed' : step === 3 ? 'active' : 'pending';
    }
    if (s === 'planning') {
      return step === 1 ? 'completed' : step === 2 ? 'active' : 'pending';
    }
    if (s === 'submitted' || s === 'draft') {
      return step === 1 ? 'completed' : step === 2 ? 'active' : 'pending';
    }
    return step === 1 ? 'active' : 'pending';
  };

  // 6-Step Lifecycle Steps (Exact Match to User UI Screenshot)
  const lifecycleSteps = useMemo(() => {
    return [
      {
        step: 1,
        label: '1. Request',
        date: projectDetails.createdDate !== '—' ? projectDetails.createdDate : '10/09/2026',
        status: getStepStatus(1),
        icon: CheckCircle2,
      },
      {
        step: 2,
        label: '2. Planning',
        date: livePlan?.created_at ? formatDate(livePlan.created_at) : '—',
        status: getStepStatus(2),
        icon: CheckCircle2,
      },
      {
        step: 3,
        label: '3. Mobilising',
        date: '—',
        status: getStepStatus(3),
        icon: CheckCircle2,
      },
      {
        step: 4,
        label: '4. Capturing',
        date: '—',
        status: getStepStatus(4),
        icon: CheckCircle2,
      },
      {
        step: 5,
        label: '5. Processing',
        date: '—',
        status: getStepStatus(5),
        icon: Lock,
      },
      {
        step: 6,
        label: '6. Delivered',
        date: '—',
        status: getStepStatus(6),
        icon: Plane,
      },
    ];
  }, [projectDetails, livePlan, liveProject, liveSectors]);

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
      lastUpdated: sec.updated_at ? formatDate(sec.updated_at) : '—',
      polygonSvg: 'M 40,110 L 85,110 L 85,140 L 105,140 L 105,185 L 75,185 L 75,210 L 45,210 L 30,170 Z',
      labelPos: { x: 62, y: 155 },
    }));
  }, [liveSectors]);

  // Timeline dataset
  const timelineEvents = useMemo(() => {
    if (liveTimeline.length > 0) {
      return liveTimeline.map((evt) => ({
        id: evt.id,
        title: evt.title || evt.action?.replace(/_/g, ' ') || 'Activity Event',
        description: evt.description || evt.message || 'Event logged',
        date: evt.created_at
          ? new Date(evt.created_at).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
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

  // Pilots dataset (Visible only when planning phase is completed)
  const pilotsData = useMemo(() => {
    if (isPlanningPhase) return [];
    return [
      {
        id: 'PIL-001',
        name: 'Vikram Singh',
        role: 'Lead Pilot',
        licenseNo: 'DGCA/PL/12345',
        experience: '6+ years',
        certifications: ['DGCA Remote Pilot', 'Night Operations'],
        assignedOn: projectDetails.startDate !== '—' ? projectDetails.startDate : 'Active',
        status: 'Active',
      },
      {
        id: 'PIL-002',
        name: 'Amit Raj',
        role: 'Co-Pilot',
        licenseNo: 'DGCA/PL/23456',
        experience: '4+ years',
        certifications: ['DGCA Remote Pilot'],
        assignedOn: projectDetails.startDate !== '—' ? projectDetails.startDate : 'Active',
        status: 'Active',
      },
    ];
  }, [isPlanningPhase, projectDetails]);

  // Drone assets dataset (Visible only when planning phase is completed)
  const droneAssetsData = useMemo(() => {
    if (isPlanningPhase) return [];
    return [
      {
        id: 'DRN-01',
        name: 'Drone-01',
        model: 'DJI Matrice 300 RTK',
        serialNo: 'M300RTK-00123',
        payload: 'Zenmuse P1 (45 MP)',
        endurance: '55 min',
        lastService: 'Recently',
        assignedOn: projectDetails.startDate !== '—' ? projectDetails.startDate : 'Active',
        status: 'Active',
      },
      {
        id: 'DRN-02',
        name: 'Drone-02',
        model: 'DJI Matrice 300 RTK',
        serialNo: 'M300RTK-00124',
        payload: 'Zenmuse L1 (LiDAR)',
        endurance: '50 min',
        lastService: 'Recently',
        assignedOn: projectDetails.startDate !== '—' ? projectDetails.startDate : 'Active',
        status: 'Active',
      },
    ];
  }, [isPlanningPhase, projectDetails]);

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
      {/* ── 1. Top Breadcrumbs ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem' }}>
        <Link
          href="/projects"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#09090b', fontWeight: 600, textDecoration: 'none' }}
        >
          <ChevronLeft size={14} /> Projects
        </Link>
        <span style={{ color: 'var(--text-muted)' }}>&gt;</span>
        <span style={{ color: 'var(--text-secondary)' }}>{projectDetails.title}</span>
      </div>

      {/* ── 2. Project Hero Header Card (Matches Screenshot) ── */}
      <div className="wf-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <WireframeBox width={64} height={64} style={{ borderRadius: '4px', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#09090b', lineHeight: 1.2, margin: 0 }}>
                  {projectDetails.title}
                </h1>
                <span
                  style={{
                    fontSize: '0.725rem',
                    fontWeight: 600,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #09090b',
                    backgroundColor: '#ffffff',
                    textTransform: 'lowercase',
                  }}
                >
                  {projectDetails.status}
                </span>
              </div>

              {/* Metadata Badges */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  fontSize: '0.725rem',
                  color: 'var(--text-secondary)',
                  flexWrap: 'wrap',
                }}
              >
                <span>Project ID: {projectDetails.id}</span>
                <span>Location: {projectDetails.location}</span>
                <span>Start Date: {projectDetails.startDate}</span>
                <span>Created on: {projectDetails.createdDate}</span>
                <span>Team Size: {projectDetails.teamSize}</span>
              </div>

              {/* Subtitle / Description */}
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem', margin: 0 }}>
                {projectDetails.description}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', height: '36px' }}
            >
              <Download size={14} /> Export Report
            </button>
            <button
              onClick={() => router.push(`/projects/new?projectId=${projectId}`)}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', height: '36px' }}
            >
              <FileEdit size={14} /> Request Revision
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. 6-Step Lifecycle Horizontal Stepper Bar (Exact Match to Screenshot) ── */}
      <div className="wf-card" style={{ padding: '1rem 1.25rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            overflowX: 'auto',
            padding: '0.5rem 0',
          }}
        >
          {lifecycleSteps.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = step.status === 'completed';
            const isActive = step.status === 'active';

            return (
              <div
                key={step.step}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  minWidth: '110px',
                  flex: 1,
                  position: 'relative',
                }}
              >
                {/* Horizontal Connector Line */}
                {idx < lifecycleSteps.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '14px',
                      left: '50%',
                      width: '100%',
                      height: '2px',
                      backgroundColor: isCompleted ? '#09090b' : '#e4e4e7',
                      zIndex: 1,
                    }}
                  />
                )}

                {/* Step Node Icon Circle */}
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    border: '1.5px solid #09090b',
                    backgroundColor: isCompleted || isActive ? '#ffffff' : '#fafafa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                    marginBottom: '0.4rem',
                    color: isCompleted ? '#09090b' : isActive ? '#09090b' : '#a1a1aa',
                  }}
                >
                  <Icon size={14} strokeWidth={isCompleted || isActive ? 2.5 : 1.5} />
                </div>

                {/* Step Text Label */}
                <span
                  style={{
                    fontSize: '0.725rem',
                    fontWeight: isCompleted || isActive ? 700 : 500,
                    color: isCompleted || isActive ? '#09090b' : 'var(--text-muted)',
                    lineHeight: 1.2,
                  }}
                >
                  {step.label}
                </span>

                {/* Step Date Subtitle */}
                <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  {step.date}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. Tab Navigation Bar ── */}
      <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'visuals', label: 'Visuals' },
          { id: 'timeline', label: 'Timeline' },
          { id: 'documents', label: 'Documents' },
          { id: 'team', label: 'Team' },
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

      {/* ── 5. TAB 1: OVERVIEW TAB CONTENT (Summary & Quick Actions only, Milestone and Recent Logs Removed) ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
          {/* Left: Summary Card */}
          <div className="wf-card">
            <div className="wf-card-header">
              <h2 className="wf-title">Summary</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', gap: '1.5rem' }}>
              {/* Column 1 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Area</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{projectDetails.totalArea}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Sectors</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{projectDetails.totalSectors}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Approved Plan Date</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{projectDetails.approvedPlanDate}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Est. Completion</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{projectDetails.estCompletion}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Progress (Overall)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <div className="wf-progress-track" style={{ height: '6px', maxWidth: '100px' }}>
                      <div
                        className="wf-progress-fill"
                        style={{ width: `${projectDetails.overallProgress}%`, backgroundColor: '#09090b' }}
                      />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>{projectDetails.overallProgress}%</span>
                  </div>
                </div>
              </div>

              {/* Column 2 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Project ID</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, wordBreak: 'break-all' }}>{projectDetails.id}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Location</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{projectDetails.location}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Start Date</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{projectDetails.startDate}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Created on</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{projectDetails.createdDate}</div>
                </div>
              </div>

              {/* Column 3 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Project Manager (Latrics)</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{projectDetails.projectManager}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Primary Contact</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{projectDetails.primaryContact}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Team Size</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{projectDetails.teamSize}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Quick Actions Card */}
          <div className="wf-card">
            <div className="wf-card-header">
              <h2 className="wf-title">Quick Actions</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <button
                onClick={() => setActiveTab('documents')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0.85rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <FileText size={16} />
                  <span>View Project Documents</span>
                </div>
                <ChevronRight size={16} color="#71717a" />
              </button>

              <button
                onClick={() => setIsSubmitModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0.85rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <FileCheck size={16} />
                  <span>Requests &amp; Approvals</span>
                </div>
                <ChevronRight size={16} color="#71717a" />
              </button>

              <button
                onClick={() => setActiveTab('documents')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0.85rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Handshake size={16} />
                  <span>Agreements &amp; Plans</span>
                </div>
                <ChevronRight size={16} color="#71717a" />
              </button>

              <button
                onClick={() => setActiveTab('documents')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0.85rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <BarChart3 size={16} />
                  <span>Project Reports</span>
                </div>
                <ChevronRight size={16} color="#71717a" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. TAB 2: VISUALS TAB CONTENT ── */}
      {activeTab === 'visuals' && (
        <>
          {isPlanningPhase || sectorsData.length === 0 ? (
            /* Scenario 1: Planning / Scoping phase empty state */
            <div
              className="wf-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                textAlign: 'center',
                backgroundColor: '#fafafa',
                gap: '1rem',
                minHeight: '380px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#f4f4f5',
                  border: '1px solid #e4e4e7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#71717a',
                }}
              >
                <Layers size={28} />
              </div>
              <div>
                <div style={{ display: 'inline-block', marginBottom: '0.5rem' }}>
                  <span
                    style={{
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #09090b',
                      color: '#09090b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Planning &amp; Scoping Phase
                  </span>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#09090b', margin: '0.25rem 0' }}>
                  Sector Boundaries &amp; Visuals Under Preparation
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '480px', lineHeight: 1.5, margin: '0.5rem auto 0' }}>
                  Your project is currently in the operational planning phase. Interactive GIS maps, vector polygon boundaries, and sector progress indicators will become visible here once Latrics Operations generates and publishes the operational survey plan.
                </p>
              </div>
            </div>
          ) : (
            /* Scenario 2: Active Plan Published */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '1.25rem', alignItems: 'start' }}>
              {/* Left Panel: Project Map */}
              <div className="wf-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="wf-card-header" style={{ marginBottom: 0 }}>
                  <h2 className="wf-title">Project Map</h2>
                </div>

                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '380px',
                    backgroundColor: '#fafafa',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Top Right Zoom / Map Controls */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      zIndex: 10,
                    }}
                  >
                    <button
                      onClick={() => setMapZoom((prev) => Math.min(prev + 0.2, 1.8))}
                      style={{
                        width: '30px',
                        height: '30px',
                        backgroundColor: '#ffffff',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={15} />
                    </button>
                    <button
                      onClick={() => setMapZoom((prev) => Math.max(prev - 0.2, 0.8))}
                      style={{
                        width: '30px',
                        height: '30px',
                        backgroundColor: '#ffffff',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Minus size={15} />
                    </button>
                  </div>

                  {/* SVG Sectors Vector Canvas */}
                  <svg
                    viewBox="0 0 260 300"
                    style={{
                      width: '90%',
                      height: '90%',
                      transform: `scale(${mapZoom})`,
                      transition: 'transform 0.2s ease',
                      cursor: 'pointer',
                    }}
                  >
                    {sectorsData.map((sec) => {
                      const isSelected = selectedSectorId === sec.id;
                      const isCompleted = sec.status === 'Completed';
                      const isInProgress = sec.status === 'In Progress';

                      const fillColor = isSelected
                        ? '#09090b'
                        : isCompleted
                        ? '#ffffff'
                        : isInProgress
                        ? '#f4f4f5'
                        : '#fafafa';

                      const strokeColor = isSelected ? '#09090b' : '#27272a';
                      const strokeWidth = isSelected ? 2.5 : 1.2;

                      return (
                        <g
                          key={sec.id}
                          onClick={() => setSelectedSectorId(sec.id === selectedSectorId ? null : sec.id)}
                        >
                          <path
                            d={sec.polygonSvg}
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                            style={{ transition: 'all 0.15s ease' }}
                          />
                          <rect
                            x={sec.labelPos.x - 7}
                            y={sec.labelPos.y - 7}
                            width="14"
                            height="14"
                            fill={isSelected ? '#ffffff' : '#f4f4f5'}
                            stroke="#09090b"
                            strokeWidth="1"
                            rx="2"
                          />
                          <text
                            x={sec.labelPos.x}
                            y={sec.labelPos.y + 3.5}
                            textAnchor="middle"
                            fontSize="8.5"
                            fontWeight="800"
                            fill="#09090b"
                          >
                            {sec.id}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Right Panel: Sectors Grid */}
              <div className="wf-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 className="wf-title">Sectors ({sectorsData.length})</h2>
                  <div style={{ position: 'relative', width: '180px' }}>
                    <input
                      type="text"
                      placeholder="Search sectors..."
                      value={sectorSearchQuery}
                      onChange={(e) => setSectorSearchQuery(e.target.value)}
                      className="form-input"
                      style={{ fontSize: '0.75rem', height: '30px', paddingRight: '1.8rem' }}
                    />
                    <Search size={13} color="#71717a" style={{ position: 'absolute', right: '8px', top: '8px' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                  {sectorsData.map((sec) => (
                    <div
                      key={sec.id}
                      style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '0.7rem',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{sec.name}</span>
                        <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '3px', border: '1px solid #d4d4d8', backgroundColor: '#f4f4f5' }}>
                          {sec.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        Area: {sec.area} sq. km
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── 7. TAB 3: TIMELINE TAB CONTENT ── */}
      {activeTab === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>Project Timeline</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                Complete activity log and milestone stream for this project.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>View:</span>
              <button
                onClick={() => setTimelineViewMode('list')}
                style={{
                  width: '30px',
                  height: '30px',
                  border: timelineViewMode === 'list' ? '1px solid #09090b' : '1px solid var(--border-color)',
                  backgroundColor: timelineViewMode === 'list' ? '#f4f4f5' : '#ffffff',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <List size={15} />
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.25rem', alignItems: 'start' }}>
            {/* Filters */}
            <div className="wf-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 className="wf-title" style={{ fontSize: '0.9rem' }}>Filters</h3>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={timelineSearch}
                  onChange={(e) => setTimelineSearch(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.8rem', height: '34px', paddingRight: '2rem' }}
                />
                <Search size={14} color="#71717a" style={{ position: 'absolute', right: '10px', top: '10px' }} />
              </div>
            </div>

            {/* Timeline Stream */}
            <div className="wf-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {filteredTimelineEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-secondary)' }}>
                  <Inbox size={26} color="#71717a" style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0 }}>No activity logs recorded yet for this project.</p>
                </div>
              ) : (
                filteredTimelineEvents.map((evt) => {
                  const Icon = evt.icon;
                  return (
                    <div key={evt.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', paddingBottom: '0.85rem', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: '1.5px solid #09090b',
                            backgroundColor: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={14} color="#09090b" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>{evt.title}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{evt.description}</span>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {evt.date}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 8. TAB 4: DOCUMENTS TAB CONTENT ── */}
      {activeTab === 'documents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>Project Documents</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                All survey request forms, operational plans, scope documents, and reports.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => {
                  setDocUploadQueue([]);
                  setDocUploadError(null);
                  setIsUploadDocModalOpen(true);
                }}
                className="wf-btn wf-btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.8rem',
                  padding: '0.5rem 0.9rem',
                  borderRadius: '6px',
                }}
              >
                <Upload size={14} />
                <span>Upload Documents</span>
              </button>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={14} color="#71717a" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search documents by title, description or uploader..."
                value={docSearchQuery}
                onChange={(e) => setDocSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem 0.45rem 2.2rem',
                  fontSize: '0.8rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                }}
              />
            </div>
            <select
              value={docCategoryFilter}
              onChange={(e) => setDocCategoryFilter(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                fontSize: '0.8rem',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                color: '#09090b',
                outline: 'none',
              }}
            >
              <option value="all">All Categories</option>
              <option value="Scope Document">Scope Document</option>
              <option value="Boundary / KML">Boundary / KML</option>
              <option value="Request">Request Specifications</option>
              <option value="Plan">Operational Plan</option>
              <option value="Document">General Document</option>
            </select>
          </div>

          {isPlanningPhase && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.75rem 1rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '0.775rem',
                color: '#475569',
              }}
            >
              <Info size={16} color="#09090b" style={{ flexShrink: 0 }} />
              <span>
                <strong>Planning in Progress:</strong> Operational flight plans, resource allocation sheets, and survey outputs will be published here as milestones advance.
              </span>
            </div>
          )}

          <div className="wf-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="wf-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Document Name</th>
                  <th style={{ width: '15%' }}>Category</th>
                  <th style={{ width: '15%' }}>Size</th>
                  <th style={{ width: '15%' }}>Uploaded By</th>
                  <th style={{ width: '15%' }}>Uploaded On</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-secondary)' }}>
                      <Inbox size={26} color="#71717a" style={{ margin: '0 auto 0.5rem' }} />
                      <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0 }}>No documents match the criteria.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setDocUploadQueue([]);
                          setDocUploadError(null);
                          setIsUploadDocModalOpen(true);
                        }}
                        className="wf-btn"
                        style={{ marginTop: '0.75rem', fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                      >
                        Upload First Document
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <FileText size={16} color="#71717a" style={{ flexShrink: 0 }} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.825rem', color: '#09090b' }}>{doc.name}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{doc.description}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.45rem', borderRadius: '3px', border: '1px solid #d4d4d8', backgroundColor: '#f4f4f5' }}>
                          {doc.category}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.725rem', color: '#52525b', fontWeight: 500 }}>{doc.size}</td>
                      <td style={{ fontSize: '0.75rem', fontWeight: 500 }}>{doc.uploadedBy}</td>
                      <td style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>{doc.uploadedOn}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 9. TAB 5: TEAM TAB CONTENT ── */}
      {activeTab === 'team' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>Project Team &amp; Assets</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
              Assigned certified flight crew and deployed drone hardware.
            </p>
          </div>

          {isPlanningPhase ? (
            /* Scenario 1: Planning / Scoping phase empty state */
            <div
              className="wf-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                textAlign: 'center',
                backgroundColor: '#fafafa',
                gap: '1rem',
                minHeight: '320px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#f4f4f5',
                  border: '1px solid #e4e4e7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#71717a',
                }}
              >
                <User size={28} />
              </div>
              <div>
                <div style={{ display: 'inline-block', marginBottom: '0.5rem' }}>
                  <span
                    style={{
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #09090b',
                      color: '#09090b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Resource Allocation in Scoping
                  </span>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#09090b', margin: '0.25rem 0' }}>
                  Pilots &amp; Hardware Assets Not Yet Dispatched
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '480px', lineHeight: 1.5, margin: '0.5rem auto 0' }}>
                  DGCA-certified drone pilots, payload operators, and hardware airframes will be allocated and scheduled once the operational survey plan is published and approved.
                </p>
              </div>
            </div>
          ) : (
            /* Scenario 2: Active Plan Published */
            <>
              {/* Pilots Table */}
              <div className="wf-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
                  <h3 className="wf-title" style={{ fontSize: '0.9rem' }}>Assigned Pilots ({pilotsData.length})</h3>
                </div>
                <table className="wf-table">
                  <thead>
                    <tr>
                      <th>Pilot</th>
                      <th>Role</th>
                      <th>License No.</th>
                      <th>Experience</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pilotsData.map((pilot) => (
                      <tr key={pilot.id}>
                        <td style={{ fontWeight: 700 }}>{pilot.name}</td>
                        <td>{pilot.role}</td>
                        <td>{pilot.licenseNo}</td>
                        <td>{pilot.experience}</td>
                        <td>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>● {pilot.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Drones Table */}
              <div className="wf-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
                  <h3 className="wf-title" style={{ fontSize: '0.9rem' }}>Assigned Drone Assets ({droneAssetsData.length})</h3>
                </div>
                <table className="wf-table">
                  <thead>
                    <tr>
                      <th>Drone</th>
                      <th>Model</th>
                      <th>Serial No.</th>
                      <th>Payload</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {droneAssetsData.map((drone) => (
                      <tr key={drone.id}>
                        <td style={{ fontWeight: 700 }}>{drone.name}</td>
                        <td>{drone.model}</td>
                        <td>{drone.serialNo}</td>
                        <td>{drone.payload}</td>
                        <td>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>● {drone.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
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
                        color: '#ef4444',
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
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    color: '#991b1b',
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
      )}
    </div>
  );
}
