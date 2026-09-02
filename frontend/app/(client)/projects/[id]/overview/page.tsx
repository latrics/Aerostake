'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import WireframeBox from '@/components/WireframeBox';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileEdit,
  CheckCircle2,
  Lock,
  Plane,
  Flag,
  FileText,
  FileCheck,
  Handshake,
  BarChart3,
  ChevronDown,
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
} from 'lucide-react';
import { SubmitRequestModal } from '@/modules/requests/components/SubmitRequestModal';

export default function ProjectOverviewPage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'PRJ-001';

  const [activeTab, setActiveTab] = useState<'overview' | 'visuals' | 'timeline' | 'documents' | 'team'>('overview');
  const [selectedSectorId, setSelectedSectorId] = useState<number | null>(null);
  const [sectorSearchQuery, setSectorSearchQuery] = useState('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isPaymentsCollapsed, setIsPaymentsCollapsed] = useState(false);
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

  // Team Tab State
  const [pilotSearchQuery, setPilotSearchQuery] = useState('');
  const [pilotViewMode, setPilotViewMode] = useState<'list' | 'grid'>('list');
  const [droneSearchQuery, setDroneSearchQuery] = useState('');
  const [droneViewMode, setDroneViewMode] = useState<'list' | 'grid'>('list');

  // Dynamic projects database for matching route param
  const projectsDirectory: Record<string, any> = {
    'PRJ-001': {
      id: 'PRJ-001',
      title: 'North Zone Survey',
      status: 'In Progress',
      location: 'Kutch, Gujarat',
      startDate: '12 Aug 2024',
      createdDate: '10 May 2025',
      teamSize: 4,
      description: 'High resolution mapping and analytics for designated north zone area.',
      totalArea: '512.3 sq. km',
      totalSectors: 9,
      approvedPlanDate: '19 May 2025',
      estCompletion: '15 Jun 2025',
      overallProgress: 58,
      projectManager: 'Rohit Sharma',
      primaryContact: 'Amit Raj',
    },
    'PRJ-002': {
      id: 'PRJ-002',
      title: 'East Corridor Mapping',
      status: 'In Progress',
      location: 'Bikaner, Rajasthan',
      startDate: '05 Aug 2024',
      createdDate: '15 May 2025',
      teamSize: 3,
      description: 'Orthomosaic topography and transmission line clearance inspection.',
      totalArea: '380.0 sq. km',
      totalSectors: 9,
      approvedPlanDate: '12 May 2025',
      estCompletion: '20 Jun 2025',
      overallProgress: 42,
      projectManager: 'Rohit Sharma',
      primaryContact: 'Kavita Singh',
    },
    'PRJ-003': {
      id: 'PRJ-003',
      title: 'Industrial Site Survey',
      status: 'In Progress',
      location: 'Dahej, Gujarat',
      startDate: '20 Jul 2024',
      createdDate: '01 May 2025',
      teamSize: 5,
      description: 'Thermal thermography inspection across solar farm sectors.',
      totalArea: '440.5 sq. km',
      totalSectors: 9,
      approvedPlanDate: '08 May 2025',
      estCompletion: '10 Jun 2025',
      overallProgress: 85,
      projectManager: 'Vikram Mehta',
      primaryContact: 'Amit Raj',
    },
    'PRJ-004': {
      id: 'PRJ-004',
      title: 'Coastal Area Mapping',
      status: 'Completed',
      location: 'Mundra, Gujarat',
      startDate: '10 Jun 2024',
      createdDate: '15 Apr 2025',
      teamSize: 4,
      description: 'Coastal erosion modeling and solar panel degradation study.',
      totalArea: '620.0 sq. km',
      totalSectors: 9,
      approvedPlanDate: '20 Apr 2025',
      estCompletion: '15 Aug 2024',
      overallProgress: 100,
      projectManager: 'Rohit Sharma',
      primaryContact: 'Deepak Patel',
    },
    'PRJ-005': {
      id: 'PRJ-005',
      title: 'Urban Development Survey',
      status: 'Completed',
      location: 'Ahmedabad, Gujarat',
      startDate: '25 Jun 2024',
      createdDate: '10 Apr 2025',
      teamSize: 3,
      description: 'Rooftop solar potential and structural integrity LiDAR inspection.',
      totalArea: '290.0 sq. km',
      totalSectors: 9,
      approvedPlanDate: '15 Apr 2025',
      estCompletion: '02 Aug 2024',
      overallProgress: 100,
      projectManager: 'Vikram Mehta',
      primaryContact: 'Neha Verma',
    },
  };

  const projectDetails = projectsDirectory[projectId] || projectsDirectory['PRJ-001'];

  // 7-Step Lifecycle data
  const lifecycleSteps = [
    { step: 1, label: '1. Request Submitted', date: '10 May 2025', status: 'completed', icon: CheckCircle2 },
    { step: 2, label: '2. Plan Published', date: '16 May 2025', status: 'completed', icon: CheckCircle2 },
    { step: 3, label: '3. Client Review', date: '18 May 2025', status: 'completed', icon: CheckCircle2 },
    { step: 4, label: '4. Approved', date: '19 May 2025', status: 'completed', icon: CheckCircle2 },
    { step: 5, label: '5. Resources Allocated', date: '20 May 2025', status: 'completed', icon: Lock },
    { step: 6, label: '6. In Execution', date: '20 May 2025', status: 'active', icon: Plane },
    { step: 7, label: '7. Completed', date: '—', status: 'pending', icon: Flag },
  ];

  // 9 Sectors dataset matching the exact Figma Visuals mockup
  const sectorsData = [
    {
      id: 1,
      name: 'Sector 1',
      status: 'Completed',
      area: 58.4,
      coverage: '100%',
      dataCaptured: '12.4 GB',
      lastUpdated: '18 May 2025',
      polygonSvg: 'M 40,110 L 85,110 L 85,140 L 105,140 L 105,185 L 75,185 L 75,210 L 45,210 L 30,170 Z',
      labelPos: { x: 62, y: 155 },
    },
    {
      id: 2,
      name: 'Sector 2',
      status: 'In Progress',
      area: 62.7,
      coverage: '75%',
      dataCaptured: '9.1 GB',
      lastUpdated: '20 May 2025',
      polygonSvg: 'M 90,145 L 140,145 L 140,185 L 130,225 L 90,225 L 90,190 L 80,190 Z',
      labelPos: { x: 112, y: 182 },
    },
    {
      id: 3,
      name: 'Sector 3',
      status: 'In Progress',
      area: 49.1,
      coverage: '60%',
      dataCaptured: '6.2 GB',
      lastUpdated: '20 May 2025',
      polygonSvg: 'M 85,60 L 130,60 L 130,140 L 85,140 Z',
      labelPos: { x: 107, y: 95 },
    },
    {
      id: 4,
      name: 'Sector 4',
      status: 'Planned',
      area: 55.3,
      coverage: '25%',
      dataCaptured: '2.1 GB',
      lastUpdated: '16 May 2025',
      polygonSvg: 'M 75,215 L 125,215 L 125,275 L 75,275 Z',
      labelPos: { x: 100, y: 248 },
    },
    {
      id: 5,
      name: 'Sector 5',
      status: 'In Progress',
      area: 51.2,
      coverage: '40%',
      dataCaptured: '4.0 GB',
      lastUpdated: '20 May 2025',
      polygonSvg: 'M 150,55 L 205,55 L 205,120 L 150,120 Z',
      labelPos: { x: 177, y: 90 },
    },
    {
      id: 6,
      name: 'Sector 6',
      status: 'Planned',
      area: 48.6,
      coverage: '—',
      dataCaptured: '—',
      lastUpdated: '—',
      polygonSvg: 'M 155,125 L 215,125 L 225,170 L 155,170 Z',
      labelPos: { x: 190, y: 148 },
    },
    {
      id: 7,
      name: 'Sector 7',
      status: 'Not Started',
      area: 53.8,
      coverage: '0%',
      dataCaptured: '—',
      lastUpdated: '—',
      polygonSvg: 'M 145,175 L 180,175 L 180,240 L 145,240 Z',
      labelPos: { x: 162, y: 208 },
    },
    {
      id: 8,
      name: 'Sector 8',
      status: 'Not Started',
      area: 47.2,
      coverage: '0%',
      dataCaptured: '—',
      lastUpdated: '—',
      polygonSvg: 'M 185,175 L 230,175 L 230,240 L 185,240 Z',
      labelPos: { x: 207, y: 208 },
    },
    {
      id: 9,
      name: 'Sector 9',
      status: 'Not Started',
      area: 46.0,
      coverage: '0%',
      dataCaptured: '—',
      lastUpdated: '—',
      polygonSvg: 'M 185,215 L 225,215 L 220,265 L 175,265 Z',
      labelPos: { x: 200, y: 242 },
    },
  ];

  // Detailed Timeline dataset
  const timelineEvents = [
    {
      id: 'evt-1',
      title: 'Request Submitted',
      description: 'Project request has been submitted by client.',
      date: '10 May 2025, 10:15 AM',
      actor: 'Amit Raj',
      actorType: 'user',
      type: 'request',
      icon: FileText,
    },
    {
      id: 'evt-2',
      title: 'Plan Published',
      description: 'Project plan and scope has been published.',
      date: '16 May 2025, 11:20 AM',
      actor: 'Latrics Ops',
      actorType: 'ops',
      type: 'plan',
      icon: FileCheck,
    },
    {
      id: 'evt-3',
      title: 'Client Review',
      description: 'Client has reviewed the plan.',
      date: '18 May 2025, 03:45 PM',
      actor: 'John Doe',
      actorType: 'client',
      type: 'review',
      icon: MessageSquare,
    },
    {
      id: 'evt-4',
      title: 'Approved by Client',
      description: 'Project plan has been approved by the client.',
      date: '19 May 2025, 11:20 AM',
      actor: 'John Doe',
      actorType: 'client',
      type: 'approval',
      icon: Check,
    },
    {
      id: 'evt-5',
      title: 'Resources Allocated',
      description: 'Field resources and drones allocated for execution.',
      date: '20 May 2025, 09:45 AM',
      actor: 'Latrics Ops',
      actorType: 'ops',
      type: 'allocation',
      icon: Lock,
    },
    {
      id: 'evt-6',
      title: 'Execution Started',
      description: 'Survey execution has been started.',
      date: '20 May 2025, 02:30 PM',
      actor: 'Pilot: Vikram Singh',
      actorType: 'pilot',
      type: 'execution',
      icon: Plane,
    },
    {
      id: 'evt-7',
      title: 'Sector 2 Progress Updated to 75%',
      description: 'Progress update by field team.',
      date: '21 May 2025, 10:30 AM',
      actor: 'Field Team',
      actorType: 'field',
      type: 'progress',
      icon: BarChart3,
    },
    {
      id: 'evt-8',
      title: 'Project in Progress',
      description: 'Project is currently in execution phase.',
      date: '21 May 2025, 10:30 AM',
      actor: 'System',
      actorType: 'system',
      type: 'status',
      icon: Flag,
    },
  ];

  // Detailed Documents dataset
  const projectDocuments = [
    {
      id: 'doc-1',
      name: 'Project Request Form.pdf',
      description: 'Initial project request submitted by client.',
      category: 'Request',
      uploadedBy: 'Amit Raj',
      uploadedOn: '10 May 2025, 10:15 AM',
      size: '1.2 MB',
    },
    {
      id: 'doc-2',
      name: 'Survey Plan v1.0.pdf',
      description: 'Detailed survey plan and scope.',
      category: 'Plan',
      uploadedBy: 'Latrics Ops',
      uploadedOn: '16 May 2025, 11:20 AM',
      size: '3.4 MB',
    },
    {
      id: 'doc-3',
      name: 'Client Review Comments.pdf',
      description: 'Client feedback and comments.',
      category: 'Review',
      uploadedBy: 'John Doe',
      uploadedOn: '18 May 2025, 03:45 PM',
      size: '1.1 MB',
    },
    {
      id: 'doc-4',
      name: 'Plan Approval.pdf',
      description: 'Approved project plan by client.',
      category: 'Approval',
      uploadedBy: 'John Doe',
      uploadedOn: '19 May 2025, 11:20 AM',
      size: '0.9 MB',
    },
    {
      id: 'doc-5',
      name: 'Resource Allocation Sheet.xlsx',
      description: 'Resources and drones allocation details.',
      category: 'Report',
      uploadedBy: 'Latrics Ops',
      uploadedOn: '20 May 2025, 09:45 AM',
      size: '2.1 MB',
    },
    {
      id: 'doc-6',
      name: 'NDA Agreement.pdf',
      description: 'Non-disclosure agreement.',
      category: 'Agreement',
      uploadedBy: 'John Doe',
      uploadedOn: '12 May 2025, 02:10 PM',
      size: '0.8 MB',
    },
    {
      id: 'doc-7',
      name: 'Execution Log - Day 1.pdf',
      description: 'Execution log for 20 May 2025.',
      category: 'Report',
      uploadedBy: 'Pilot: Vikram Singh',
      uploadedOn: '20 May 2025, 05:30 PM',
      size: '2.6 MB',
    },
    {
      id: 'doc-8',
      name: 'Sector 2 Progress Report.pdf',
      description: 'Progress report for sector 2.',
      category: 'Report',
      uploadedBy: 'Field Team',
      uploadedOn: '21 May 2025, 10:30 AM',
      size: '1.7 MB',
    },
  ];

  // Detailed Team & Pilots dataset matching exact Figma Team mockup
  const pilotsData = [
    {
      id: 'PIL-001',
      name: 'Vikram Singh',
      role: 'Lead Pilot',
      licenseNo: 'DGCA/PL/12345',
      experience: '6+ years',
      certifications: ['DGCA Remote Pilot', 'Night Operations'],
      assignedOn: '12 Aug 2024',
      status: 'Active',
    },
    {
      id: 'PIL-002',
      name: 'Amit Raj',
      role: 'Co-Pilot',
      licenseNo: 'DGCA/PL/23456',
      experience: '4+ years',
      certifications: ['DGCA Remote Pilot'],
      assignedOn: '12 Aug 2024',
      status: 'Active',
    },
    {
      id: 'PIL-003',
      name: 'Rohit Das',
      role: 'Payload Operator',
      licenseNo: 'DGCA/PL/34567',
      experience: '3+ years',
      certifications: ['Payload Specialist'],
      assignedOn: '16 Aug 2024',
      status: 'Active',
    },
    {
      id: 'PIL-004',
      name: 'Neha Patel',
      role: 'Data Analyst',
      licenseNo: '-',
      experience: '5+ years',
      certifications: ['GIS Specialist', 'Data Processing'],
      assignedOn: '18 Aug 2024',
      status: 'Active',
    },
  ];

  // Detailed Drone Hardware Assets dataset matching exact Figma Team mockup
  const droneAssetsData = [
    {
      id: 'DRN-01',
      name: 'Drone-01',
      model: 'DJI Matrice 300 RTK',
      serialNo: 'M300RTK-00123',
      payload: 'Zenmuse P1 (45 MP)',
      endurance: '55 min',
      lastService: '05 May 2025',
      assignedOn: '12 Aug 2024',
      status: 'Active',
    },
    {
      id: 'DRN-02',
      name: 'Drone-02',
      model: 'DJI Matrice 300 RTK',
      serialNo: 'M300RTK-00124',
      payload: 'Zenmuse L1 (LiDAR)',
      endurance: '50 min',
      lastService: '03 May 2025',
      assignedOn: '12 Aug 2024',
      status: 'Active',
    },
    {
      id: 'DRN-03',
      name: 'Drone-03',
      model: 'DJI Phantom 4 RTK',
      serialNo: 'P4RTK-00987',
      payload: 'RGB Camera (20 MP)',
      endurance: '30 min',
      lastService: '28 Apr 2025',
      assignedOn: '16 Aug 2024',
      status: 'Active',
    },
  ];

  const docCategoryCounts = {
    all: 32,
    request: 6,
    approval: 5,
    agreement: 7,
    plan: 8,
    report: 6,
  };

  const filteredDocuments = projectDocuments.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
      doc.uploadedBy.toLowerCase().includes(docSearchQuery.toLowerCase());

    const matchesCategory =
      docCategoryFilter === 'all' ||
      doc.category.toLowerCase() === docCategoryFilter.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const filteredTimelineEvents = timelineEvents.filter((evt) => {
    const matchesSearch =
      evt.title.toLowerCase().includes(timelineSearch.toLowerCase()) ||
      evt.description.toLowerCase().includes(timelineSearch.toLowerCase()) ||
      evt.actor.toLowerCase().includes(timelineSearch.toLowerCase());

    const matchesType =
      timelineTypeFilter === 'all' || evt.type === timelineTypeFilter;

    return matchesSearch && matchesType;
  });

  const filteredPilots = pilotsData.filter((p) =>
    p.name.toLowerCase().includes(pilotSearchQuery.toLowerCase()) ||
    p.role.toLowerCase().includes(pilotSearchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(pilotSearchQuery.toLowerCase())
  );

  const filteredDrones = droneAssetsData.filter((d) =>
    d.name.toLowerCase().includes(droneSearchQuery.toLowerCase()) ||
    d.model.toLowerCase().includes(droneSearchQuery.toLowerCase()) ||
    d.payload.toLowerCase().includes(droneSearchQuery.toLowerCase())
  );

  const filteredSectors = sectorsData.filter((sec) =>
    sec.name.toLowerCase().includes(sectorSearchQuery.toLowerCase()) ||
    sec.status.toLowerCase().includes(sectorSearchQuery.toLowerCase())
  );

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── 1. Top Breadcrumbs ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem' }}>
        <Link
          href="/projects"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#09090b', fontWeight: 600 }}
        >
          <ChevronLeft size={14} /> Projects
        </Link>
        <span style={{ color: 'var(--text-muted)' }}>&gt;</span>
        <span style={{ color: 'var(--text-secondary)' }}>{projectDetails.title}</span>
      </div>

      {/* ── 2. Project Hero Header Card ── */}
      <div className="wf-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <WireframeBox width={64} height={64} style={{ borderRadius: '4px', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#09090b', lineHeight: 1.2 }}>
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

              {/* Subtitle */}
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
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
              onClick={() => setIsSubmitModalOpen(true)}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', height: '36px' }}
            >
              <FileEdit size={14} /> Request Revision
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. 7-Step Lifecycle Horizontal Stepper Bar ── */}
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

      {/* ── 5. TAB 1: OVERVIEW TAB CONTENT ── */}
      {activeTab === 'overview' && (
        <>
          {/* Middle Section: Summary & Quick Actions */}
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
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{projectDetails.id}</div>
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
                  onClick={() => setActiveTab('overview')}
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

          {/* Bottom Section: Milestone / Payment Overview & Recent Logs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {/* Left: Milestone / Payment Overview */}
            <div className="wf-card">
              <div
                className="wf-card-header"
                style={{ cursor: 'pointer', marginBottom: isPaymentsCollapsed ? 0 : '0.85rem' }}
                onClick={() => setIsPaymentsCollapsed(!isPaymentsCollapsed)}
              >
                <h2 className="wf-title">Milestone / Payment Overview</h2>
                <ChevronDown size={18} />
              </div>

              {!isPaymentsCollapsed && (
                <>
                  {/* 4 Summary Stats */}
                  <div className="grid-4" style={{ marginBottom: '1rem' }}>
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.55rem' }}>
                      <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>Approved Estimate</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '0.15rem' }}>₹12.40L</div>
                    </div>
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.55rem' }}>
                      <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>Paid / Verified</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '0.15rem' }}>₹7.60L</div>
                    </div>
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.55rem' }}>
                      <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>Outstanding</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '0.15rem' }}>-₹4.80L</div>
                    </div>
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.55rem' }}>
                      <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>Payment Status</div>
                      <div style={{ marginTop: '0.2rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.4rem', backgroundColor: '#f4f4f5', borderRadius: '4px', border: '1px solid #d4d4d8' }}>
                          Partially Paid
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Milestone Schedule Table */}
                  <table className="wf-table" style={{ marginBottom: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Milestone</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Verified On</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Milestone 01</td>
                        <td>₹4.00L</td>
                        <td>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>Verified</span>
                        </td>
                        <td>12 Aug 2024</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Milestone 02</td>
                        <td>₹3.60L</td>
                        <td>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>Verified</span>
                        </td>
                        <td>20 Aug 2024</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Milestone 03</td>
                        <td>₹4.80L</td>
                        <td>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#71717a' }}>Pending</span>
                        </td>
                        <td>—</td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={{ textAlign: 'left', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                    <Link
                      href="/payments"
                      style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      View all payments <ChevronRight size={12} />
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Right: Recent Logs */}
            <div className="wf-card">
              <div className="wf-card-header">
                <h2 className="wf-title">Recent Logs</h2>
                <button
                  onClick={() => setActiveTab('timeline')}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.725rem',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                  }}
                >
                  View all logs <ChevronDown size={12} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <WireframeBox width={32} height={32} style={{ borderRadius: '4px', flexShrink: 0 }} />
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Plan Approved by Client</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      Project plan has been approved by the client.
                    </div>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    19 May 2025, 11:20 AM
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <WireframeBox width={32} height={32} style={{ borderRadius: '4px', flexShrink: 0 }} />
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Resources Allocated</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      Field resources and drones allocated for execution.
                    </div>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    20 May 2025, 09:45 AM
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <WireframeBox width={32} height={32} style={{ borderRadius: '4px', flexShrink: 0 }} />
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Execution Started</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      Survey execution has been started.
                    </div>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    20 May 2025, 02:30 PM
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <WireframeBox width={32} height={32} style={{ borderRadius: '4px', flexShrink: 0 }} />
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Sector 2 progress updated to 75%</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      Progress update by field team.
                    </div>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    21 May 2025, 10:30 AM
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── 6. TAB 2: VISUALS TAB CONTENT (EXACT WIREFRAME MATCH) ── */}
      {activeTab === 'visuals' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '1.25rem', alignItems: 'start' }}>
          {/* Left Panel: Project Map */}
          <div className="wf-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="wf-card-header" style={{ marginBottom: 0 }}>
              <h2 className="wf-title">Project Map</h2>
            </div>

            {/* Interactive Vector Map Container */}
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
                <button
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
                  <Layers size={15} />
                </button>
              </div>

              {/* Bottom Left Fullscreen Button */}
              <button
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  cursor: 'pointer',
                  zIndex: 10,
                }}
              >
                <Maximize2 size={13} /> Fullscreen
              </button>

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
                {/* Background Grid Pattern Lines */}
                <defs>
                  <pattern id="wfGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f2" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#wfGrid)" />

                {/* 9 Sector Polygons */}
                {sectorsData.map((sec) => {
                  const isSelected = selectedSectorId === sec.id;
                  const isCompleted = sec.status === 'Completed';
                  const isInProgress = sec.status === 'In Progress';
                  const isPlanned = sec.status === 'Planned';

                  const fillColor = isSelected
                    ? '#09090b'
                    : isCompleted
                    ? '#ffffff'
                    : isInProgress
                    ? '#f4f4f5'
                    : isPlanned
                    ? '#fafafa'
                    : '#fbfbfb';

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
                        strokeDasharray={isPlanned ? '3,2' : undefined}
                        style={{ transition: 'all 0.15s ease' }}
                      />
                      {/* Sector Number Node Box */}
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

            {/* Map Legend Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1.25rem',
                fontSize: '0.725rem',
                color: 'var(--text-secondary)',
                paddingTop: '0.35rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '12px', height: '12px', border: '1px solid #09090b', backgroundColor: '#ffffff', display: 'inline-block' }} />
                <span>Completed</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '12px', height: '12px', border: '1px solid #09090b', backgroundColor: '#e4e4e7', display: 'inline-block' }} />
                <span>In Progress</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '12px', height: '12px', border: '1px dashed #71717a', backgroundColor: '#fafafa', display: 'inline-block' }} />
                <span>Planned</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '12px', height: '12px', border: '1px solid #d4d4d8', backgroundColor: '#f4f4f5', display: 'inline-block' }} />
                <span>Not Started</span>
              </div>
            </div>

            {/* Bottom Tip Footnote */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              <Info size={13} />
              <span>Click on any sector to view details and analytics.</span>
            </div>
          </div>

          {/* Right Panel: Sectors (9) Grid & Sector Details Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Top: Sectors (9) Cards Grid */}
            <div className="wf-card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
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

              {/* 3x3 Grid of 9 Sector Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                {filteredSectors.map((sec) => {
                  const isSelected = selectedSectorId === sec.id;
                  return (
                    <div
                      key={sec.id}
                      onClick={() => setSelectedSectorId(sec.id === selectedSectorId ? null : sec.id)}
                      style={{
                        border: isSelected ? '1.5px solid #09090b' : '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '0.7rem',
                        backgroundColor: isSelected ? '#fafafa' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Card Header: Sector ID + Status Pill + More Action */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span
                            style={{
                              width: '18px',
                              height: '18px',
                              border: '1px solid #09090b',
                              borderRadius: '3px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                            }}
                          >
                            {sec.id}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{sec.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              padding: '0.1rem 0.35rem',
                              borderRadius: '3px',
                              border: '1px solid #d4d4d8',
                              backgroundColor: '#f4f4f5',
                              fontWeight: 600,
                            }}
                          >
                            {sec.status}
                          </span>
                          <MoreVertical size={13} color="#71717a" />
                        </div>
                      </div>

                      {/* Card Body Key-Values */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.675rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Area</span>
                          <span style={{ fontWeight: 600 }}>{sec.area} sq. km</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Coverage</span>
                          <span style={{ fontWeight: 600 }}>{sec.coverage}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Last Updated</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{sec.lastUpdated}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom: Sector Details Table */}
            <div className="wf-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
                <h2 className="wf-title" style={{ fontSize: '0.875rem' }}>Sector Details</h2>
              </div>

              <table className="wf-table">
                <thead>
                  <tr>
                    <th>Sector ID</th>
                    <th>Status</th>
                    <th>Area (sq. km)</th>
                    <th>Coverage</th>
                    <th>Data Captured</th>
                    <th>Last Updated</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sectorsData.slice(0, 5).map((sec) => (
                    <tr
                      key={sec.id}
                      style={{
                        backgroundColor: selectedSectorId === sec.id ? '#fafafa' : 'transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => setSelectedSectorId(sec.id === selectedSectorId ? null : sec.id)}
                    >
                      <td style={{ fontWeight: 700 }}>{sec.id}</td>
                      <td>
                        <span style={{ fontSize: '0.725rem', padding: '0.15rem 0.45rem', border: '1px solid #d4d4d8', borderRadius: '3px', backgroundColor: '#f4f4f5' }}>
                          {sec.status}
                        </span>
                      </td>
                      <td>{sec.area}</td>
                      <td style={{ fontWeight: 700 }}>{sec.coverage}</td>
                      <td>{sec.dataCaptured}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{sec.lastUpdated}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          href={`/projects/${projectDetails.id}/sectors/${sec.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '26px',
                            height: '26px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            color: '#09090b',
                          }}
                        >
                          <Eye size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ padding: '0.65rem 1.25rem', borderTop: '1px solid var(--border-color)' }}>
                <Link
                  href={`/projects/${projectDetails.id}/sectors`}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#09090b',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  View all sectors <ChevronRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. TAB 3: TIMELINE TAB CONTENT (EXACT FIGMA WIREFRAME MATCH) ── */}
      {activeTab === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Subheader Title & View Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b' }}>Project Timeline</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Complete activity log and timeline for this project.
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
              <button
                onClick={() => setTimelineViewMode('tree')}
                style={{
                  width: '30px',
                  height: '30px',
                  border: timelineViewMode === 'tree' ? '1px solid #09090b' : '1px solid var(--border-color)',
                  backgroundColor: timelineViewMode === 'tree' ? '#f4f4f5' : '#ffffff',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <SlidersHorizontal size={15} />
              </button>
            </div>
          </div>

          {/* 2-Column Split: Filters & Timeline Activity Feed */}
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.25rem', alignItems: 'start' }}>
            {/* Left Column: Filters Card */}
            <div className="wf-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="wf-card-header" style={{ marginBottom: 0 }}>
                <h3 className="wf-title" style={{ fontSize: '0.9rem' }}>Filters</h3>
              </div>

              {/* Search Logs Input */}
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

              {/* Log Type Select */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>Log Type</label>
                <select
                  value={timelineTypeFilter}
                  onChange={(e) => setTimelineTypeFilter(e.target.value)}
                  className="form-select"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.65rem' }}
                >
                  <option value="all">All Types</option>
                  <option value="request">Request Submissions</option>
                  <option value="plan">Plan Publications</option>
                  <option value="review">Client Reviews</option>
                  <option value="approval">Approvals</option>
                  <option value="allocation">Resource Allocations</option>
                  <option value="execution">Execution Sorties</option>
                  <option value="progress">Progress Updates</option>
                  <option value="status">Status Changes</option>
                </select>
              </div>

              {/* Date Range Select */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>Date Range</label>
                <select
                  value={timelineDateFilter}
                  onChange={(e) => setTimelineDateFilter(e.target.value)}
                  className="form-select"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.65rem' }}
                >
                  <option value="all_time">All Time</option>
                  <option value="today">Today</option>
                  <option value="last_7_days">Last 7 Days</option>
                  <option value="last_30_days">Last 30 Days</option>
                  <option value="this_month">This Month</option>
                </select>
              </div>

              {/* Clear Filters Button */}
              <button
                onClick={() => {
                  setTimelineSearch('');
                  setTimelineTypeFilter('all');
                  setTimelineDateFilter('all_time');
                }}
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  fontSize: '0.75rem',
                  padding: '0.45rem 0.75rem',
                }}
              >
                <RotateCcw size={13} /> Clear Filters
              </button>
            </div>

            {/* Right Column: Timeline Log Stream */}
            <div className="wf-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Continuous Vertical Timeline Line */}
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    bottom: '16px',
                    left: '16px',
                    width: '2px',
                    backgroundColor: '#e4e4e7',
                    zIndex: 1,
                  }}
                />

                {filteredTimelineEvents.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No matching activity logs found.
                  </div>
                ) : (
                  filteredTimelineEvents.map((evt) => {
                    const Icon = evt.icon;
                    return (
                      <div
                        key={evt.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          position: 'relative',
                          zIndex: 2,
                          gap: '1rem',
                        }}
                      >
                        {/* Left Node & Text */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1 }}>
                          {/* Circular Icon Node */}
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
                            <Icon size={15} color="#09090b" />
                          </div>

                          {/* Event Title & Subtitle */}
                          <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '0.15rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b', lineHeight: 1.3 }}>
                              {evt.title}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                              {evt.description}
                            </span>
                          </div>
                        </div>

                        {/* Right Timestamp & Actor */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1.5rem',
                            fontSize: '0.725rem',
                            color: 'var(--text-secondary)',
                            flexShrink: 0,
                            paddingTop: '0.2rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Calendar size={13} color="#71717a" />
                            <span>{evt.date}</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: '95px' }}>
                            {evt.actorType === 'system' ? (
                              <Cpu size={13} color="#71717a" />
                            ) : (
                              <User size={13} color="#71717a" />
                            )}
                            <span style={{ fontWeight: 600, color: '#09090b' }}>{evt.actor}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* End of Log Stream Notice */}
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '0.725rem',
                  color: 'var(--text-muted)',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--border-color)',
                  marginTop: '0.5rem',
                }}
              >
                No more logs to load
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. TAB 4: DOCUMENTS TAB CONTENT (EXACT FIGMA WIREFRAME MATCH) ── */}
      {activeTab === 'documents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Subheader Title & Action Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b' }}>Project Documents</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                All documents, requests, approvals and agreements related to this project.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              {/* Search Box */}
              <div style={{ position: 'relative', width: '220px' }}>
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.75rem', height: '32px', paddingRight: '1.8rem' }}
                />
                <Search size={13} color="#71717a" style={{ position: 'absolute', right: '8px', top: '9px' }} />
              </div>

              {/* Filter Button */}
              <button
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', height: '32px', fontSize: '0.75rem' }}
              >
                <Filter size={13} /> Filter
              </button>

              {/* View Switchers */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button
                  onClick={() => setDocViewMode('list')}
                  style={{
                    width: '30px',
                    height: '30px',
                    border: docViewMode === 'list' ? '1px solid #09090b' : '1px solid var(--border-color)',
                    backgroundColor: docViewMode === 'list' ? '#f4f4f5' : '#ffffff',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <List size={14} />
                </button>
                <button
                  onClick={() => setDocViewMode('grid')}
                  style={{
                    width: '30px',
                    height: '30px',
                    border: docViewMode === 'grid' ? '1px solid #09090b' : '1px solid var(--border-color)',
                    backgroundColor: docViewMode === 'grid' ? '#f4f4f5' : '#ffffff',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <LayoutGrid size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* 2-Column Split: Category Sidebar Folders & Documents Table */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.25rem', alignItems: 'start' }}>
            {/* Left Column: Category Folder List */}
            <div className="wf-card" style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {[
                { id: 'all', label: 'All Documents', count: docCategoryCounts.all, icon: Folder },
                { id: 'request', label: 'Requests', count: docCategoryCounts.request, icon: FileText },
                { id: 'approval', label: 'Approvals', count: docCategoryCounts.approval, icon: MessageSquare },
                { id: 'agreement', label: 'Agreements', count: docCategoryCounts.agreement, icon: Handshake },
                { id: 'plan', label: 'Plans', count: docCategoryCounts.plan, icon: FileCheck },
                { id: 'report', label: 'Reports', count: docCategoryCounts.report, icon: BarChart3 },
              ].map((cat) => {
                const Icon = cat.icon;
                const isActive = docCategoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setDocCategoryFilter(cat.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: isActive ? '#f4f4f5' : 'transparent',
                      color: isActive ? '#09090b' : 'var(--text-secondary)',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Icon size={14} />
                      <span>{cat.label}</span>
                    </div>
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{cat.count}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Documents Table */}
            <div className="wf-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="wf-table">
                <thead>
                  <tr>
                    <th style={{ width: '38px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedDocIds.length > 0 && selectedDocIds.length === filteredDocuments.length}
                        onChange={toggleSelectAllDocs}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ width: '38%' }}>Document Name</th>
                    <th style={{ width: '12%' }}>Category</th>
                    <th style={{ width: '15%' }}>Uploaded By</th>
                    <th style={{ width: '18%' }}>Uploaded On</th>
                    <th style={{ width: '8%' }}>Size</th>
                    <th style={{ width: '9%', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No matching documents found.
                      </td>
                    </tr>
                  ) : (
                    filteredDocuments.map((doc) => {
                      const isSelected = selectedDocIds.includes(doc.id);
                      return (
                        <tr
                          key={doc.id}
                          style={{
                            backgroundColor: isSelected ? '#fafafa' : 'transparent',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          {/* Checkbox */}
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectDoc(doc.id)}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>

                          {/* Document Name & Description */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <FileText size={16} color="#71717a" style={{ flexShrink: 0 }} />
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.825rem', color: '#09090b', lineHeight: 1.3 }}>
                                  {doc.name}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                                  {doc.description}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Category Badge */}
                          <td>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                padding: '0.15rem 0.45rem',
                                borderRadius: '3px',
                                border: '1px solid #d4d4d8',
                                backgroundColor: '#f4f4f5',
                                display: 'inline-block',
                              }}
                            >
                              {doc.category}
                            </span>
                          </td>

                          {/* Uploaded By */}
                          <td>
                            <span style={{ fontSize: '0.75rem', color: '#09090b', fontWeight: 500 }}>
                              {doc.uploadedBy}
                            </span>
                          </td>

                          {/* Uploaded On */}
                          <td>
                            <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                              {doc.uploadedOn}
                            </span>
                          </td>

                          {/* Size */}
                          <td>
                            <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                              {doc.size}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <button
                                title="View Document"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '0.2rem',
                                  color: '#71717a',
                                }}
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                title="Download Document"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '0.2rem',
                                  color: '#71717a',
                                }}
                              >
                                <Download size={14} />
                              </button>
                              <button
                                title="More Actions"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '0.2rem',
                                  color: '#71717a',
                                }}
                              >
                                <MoreVertical size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Table Footer / Pagination */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1.25rem',
                  borderTop: '1px solid var(--border-color)',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <span>Showing 1 to {filteredDocuments.length} of {docCategoryCounts.all} documents</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <button
                    style={{
                      width: '26px',
                      height: '26px',
                      border: '1px solid #09090b',
                      backgroundColor: '#09090b',
                      color: '#ffffff',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    1
                  </button>
                  <button
                    style={{
                      width: '26px',
                      height: '26px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: '#ffffff',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      color: '#71717a',
                    }}
                  >
                    2
                  </button>
                  <button
                    style={{
                      width: '26px',
                      height: '26px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: '#ffffff',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      color: '#71717a',
                    }}
                  >
                    3
                  </button>
                  <button
                    style={{
                      width: '26px',
                      height: '26px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: '#ffffff',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      color: '#71717a',
                    }}
                  >
                    4
                  </button>
                  <button
                    style={{
                      width: '26px',
                      height: '26px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: '#ffffff',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#71717a',
                    }}
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Help Tip Footnote */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
            <Info size={13} />
            <span>Can&apos;t find a document? Contact Latrics Ops or raise a request.</span>
          </div>
        </div>
      )}

      {/* ── 9. TAB 5: TEAM TAB CONTENT (EXACT FIGMA WIREFRAME MATCH) ── */}
      {activeTab === 'team' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Subheader Title */}
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b' }}>Project Team &amp; Assets</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Pilots and drone assets assigned to this project.
            </p>
          </div>

          {/* ── Section 1: Assigned Pilots ── */}
          <div className="wf-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Header: Title + Badge + Search & Filter */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1.25rem',
                borderBottom: '1px solid var(--border-color)',
                flexWrap: 'wrap',
                gap: '0.65rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 className="wf-title" style={{ fontSize: '0.9rem' }}>Assigned Pilots</h3>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.45rem',
                    borderRadius: '10px',
                    backgroundColor: '#f4f4f5',
                    border: '1px solid #d4d4d8',
                    color: '#09090b',
                  }}
                >
                  {pilotsData.length}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                {/* Search Box */}
                <div style={{ position: 'relative', width: '200px' }}>
                  <input
                    type="text"
                    placeholder="Search pilots..."
                    value={pilotSearchQuery}
                    onChange={(e) => setPilotSearchQuery(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.75rem', height: '32px', paddingRight: '1.8rem' }}
                  />
                  <Search size={13} color="#71717a" style={{ position: 'absolute', right: '8px', top: '9px' }} />
                </div>

                {/* Filter Button */}
                <button
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', height: '32px', fontSize: '0.75rem' }}
                >
                  <Filter size={13} /> Filter
                </button>

                {/* View Switchers */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <button
                    onClick={() => setPilotViewMode('list')}
                    style={{
                      width: '30px',
                      height: '30px',
                      border: pilotViewMode === 'list' ? '1px solid #09090b' : '1px solid var(--border-color)',
                      backgroundColor: pilotViewMode === 'list' ? '#f4f4f5' : '#ffffff',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <List size={14} />
                  </button>
                  <button
                    onClick={() => setPilotViewMode('grid')}
                    style={{
                      width: '30px',
                      height: '30px',
                      border: pilotViewMode === 'grid' ? '1px solid #09090b' : '1px solid var(--border-color)',
                      backgroundColor: pilotViewMode === 'grid' ? '#f4f4f5' : '#ffffff',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <LayoutGrid size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Pilots Table */}
            <table className="wf-table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Pilot</th>
                  <th style={{ width: '14%' }}>Role</th>
                  <th style={{ width: '14%' }}>License No.</th>
                  <th style={{ width: '10%' }}>Experience</th>
                  <th style={{ width: '20%' }}>Certifications</th>
                  <th style={{ width: '10%' }}>Assigned On</th>
                  <th style={{ width: '7%' }}>Status</th>
                  <th style={{ width: '3%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPilots.map((pilot) => (
                  <tr key={pilot.id}>
                    {/* Pilot Avatar + Name */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            border: '1px solid var(--border-color)',
                            backgroundColor: '#fafafa',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <User size={15} color="#71717a" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.825rem', color: '#09090b' }}>
                            {pilot.name}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            ID: {pilot.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td style={{ fontSize: '0.8rem', color: '#09090b', fontWeight: 500 }}>
                      {pilot.role}
                    </td>

                    {/* License No */}
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {pilot.licenseNo}
                    </td>

                    {/* Experience */}
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {pilot.experience}
                    </td>

                    {/* Certifications Badges */}
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {pilot.certifications.map((cert, cIdx) => (
                          <span
                            key={cIdx}
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              padding: '0.1rem 0.4rem',
                              borderRadius: '3px',
                              border: '1px solid #d4d4d8',
                              backgroundColor: '#f4f4f5',
                              color: '#09090b',
                            }}
                          >
                            {cert}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Assigned On */}
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {pilot.assignedOn}
                    </td>

                    {/* Status */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600 }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#09090b', display: 'inline-block' }} />
                        <span>{pilot.status}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', color: '#71717a' }}>
                        <MoreVertical size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Table Footer */}
            <div style={{ padding: '0.65rem 1.25rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Showing 1 to {filteredPilots.length} of {pilotsData.length} pilots
            </div>
          </div>

          {/* ── Section 2: Assigned Drone Assets ── */}
          <div className="wf-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Header: Title + Badge + Search & Filter */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1.25rem',
                borderBottom: '1px solid var(--border-color)',
                flexWrap: 'wrap',
                gap: '0.65rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 className="wf-title" style={{ fontSize: '0.9rem' }}>Assigned Drone Assets</h3>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.45rem',
                    borderRadius: '10px',
                    backgroundColor: '#f4f4f5',
                    border: '1px solid #d4d4d8',
                    color: '#09090b',
                  }}
                >
                  {droneAssetsData.length}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                {/* Search Box */}
                <div style={{ position: 'relative', width: '200px' }}>
                  <input
                    type="text"
                    placeholder="Search drones..."
                    value={droneSearchQuery}
                    onChange={(e) => setDroneSearchQuery(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.75rem', height: '32px', paddingRight: '1.8rem' }}
                  />
                  <Search size={13} color="#71717a" style={{ position: 'absolute', right: '8px', top: '9px' }} />
                </div>

                {/* Filter Button */}
                <button
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', height: '32px', fontSize: '0.75rem' }}
                >
                  <Filter size={13} /> Filter
                </button>

                {/* View Switchers */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <button
                    onClick={() => setDroneViewMode('list')}
                    style={{
                      width: '30px',
                      height: '30px',
                      border: droneViewMode === 'list' ? '1px solid #09090b' : '1px solid var(--border-color)',
                      backgroundColor: droneViewMode === 'list' ? '#f4f4f5' : '#ffffff',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <List size={14} />
                  </button>
                  <button
                    onClick={() => setDroneViewMode('grid')}
                    style={{
                      width: '30px',
                      height: '30px',
                      border: droneViewMode === 'grid' ? '1px solid #09090b' : '1px solid var(--border-color)',
                      backgroundColor: droneViewMode === 'grid' ? '#f4f4f5' : '#ffffff',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <LayoutGrid size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Drones Table */}
            <table className="wf-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Drone</th>
                  <th style={{ width: '18%' }}>Model</th>
                  <th style={{ width: '14%' }}>Serial No.</th>
                  <th style={{ width: '16%' }}>Payload</th>
                  <th style={{ width: '10%' }}>Endurance</th>
                  <th style={{ width: '10%' }}>Last Service</th>
                  <th style={{ width: '10%' }}>Assigned On</th>
                  <th style={{ width: '5%' }}>Status</th>
                  <th style={{ width: '2%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrones.map((drone) => (
                  <tr key={drone.id}>
                    {/* Drone Icon + Name */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                        <WireframeBox width={26} height={26} style={{ borderRadius: '3px', flexShrink: 0 }}>
                          <Plane size={13} color="#71717a" />
                        </WireframeBox>
                        <span style={{ fontWeight: 700, fontSize: '0.825rem', color: '#09090b' }}>
                          {drone.name}
                        </span>
                      </div>
                    </td>

                    {/* Model */}
                    <td style={{ fontSize: '0.8rem', color: '#09090b', fontWeight: 500 }}>
                      {drone.model}
                    </td>

                    {/* Serial No */}
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {drone.serialNo}
                    </td>

                    {/* Payload */}
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {drone.payload}
                    </td>

                    {/* Endurance */}
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {drone.endurance}
                    </td>

                    {/* Last Service */}
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {drone.lastService}
                    </td>

                    {/* Assigned On */}
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {drone.assignedOn}
                    </td>

                    {/* Status */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600 }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#09090b', display: 'inline-block' }} />
                        <span>{drone.status}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', color: '#71717a' }}>
                        <MoreVertical size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Table Footer */}
            <div style={{ padding: '0.65rem 1.25rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Showing 1 to {filteredDrones.length} of {droneAssetsData.length} drones
            </div>
          </div>

          {/* Bottom Help Tip Footnote */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
            <Info size={13} />
            <span>For changes to team or assets, please raise a request.</span>
          </div>
        </div>
      )}

      {/* Requirement / Revision Modal */}
      <SubmitRequestModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        currentVersionNumber={1}
        onSubmit={async () => {
          setIsSubmitModalOpen(false);
        }}
      />
    </div>
  );
}
