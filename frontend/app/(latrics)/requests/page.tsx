'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FilePlus,
  Clock,
  Info,
  FileEdit,
  Folder,
  Calendar,
  Filter,
  RotateCcw,
  Search,
  List,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  Eye,
  Settings,
  Bell,
  User,
  ChevronLeft,
} from 'lucide-react';
import { PlanPublishModal } from '@/modules/planning/components/PlanPublishModal';
import { MilestoneChargeModal } from '@/modules/payments/components/MilestoneChargeModal';

export default function RequestsOverviewPage() {
  const router = useRouter();
  // Common Search & Filter states
  const [topSearch, setTopSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'clients' | 'projects'>('clients');
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [sortOption, setSortOption] = useState('received_newest');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [dateRange, setDateRange] = useState('01 May 2025 – 31 May 2025');

  // Modals state
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [activeRequestForPlan, setActiveRequestForPlan] = useState<any>(null);
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Accordion open/close state for all client groups (GeoBuild and GreenField open by default, all expandable/collapsible)
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({
    'c-1': true, // GeoBuild Pvt. Ltd. (9)
    'c-2': true, // GreenField Infra (6)
    'c-3': true, // Acme Infra (7)
    'c-4': false, // BuildRight Ltd. (5)
    'c-5': false, // Skyline Developers (4)
    'c-6': false, // Prime Constructions (6)
    'c-7': false, // Urban Spaces Pvt. Ltd. (3)
    'c-8': false, // InfraVista (2)
  });

  const toggleClientGroup = (clientId: string) => {
    setExpandedClients((prev) => ({
      ...prev,
      [clientId]: !prev[clientId],
    }));
  };

  // 5 KPI Summary Metrics
  const adminKpis = [
    { title: 'New Requests', count: 8, icon: FilePlus },
    { title: 'Under Review', count: 4, icon: Clock },
    { title: 'Information Requested', count: 3, icon: Info },
    { title: 'Revision', count: 2, icon: FileEdit },
    { title: 'Total Requests', count: 42, icon: Folder },
  ];

  // Client Directory dataset
  const clientDirectory = [
    { id: 'all', name: 'All Clients', count: 42 },
    { id: 'c-1', name: 'GeoBuild Pvt. Ltd.', count: 9 },
    { id: 'c-2', name: 'GreenField Infra', count: 6 },
    { id: 'c-3', name: 'Acme Infra', count: 7 },
    { id: 'c-4', name: 'BuildRight Ltd.', count: 5 },
    { id: 'c-5', name: 'Skyline Developers', count: 4 },
    { id: 'c-6', name: 'Prime Constructions', count: 6 },
    { id: 'c-7', name: 'Urban Spaces Pvt. Ltd.', count: 3 },
    { id: 'c-8', name: 'InfraVista', count: 2 },
  ];

  // Complete 42 Requests Dataset Grouped by Client (Exact Counts)
  const adminRequestsGroups = [
    {
      clientId: 'c-1',
      clientName: 'GeoBuild Pvt. Ltd.',
      count: 9,
      requests: [
        {
          id: 'REQ-1023',
          project: 'P-1024 - River Mapping',
          client: 'GeoBuild Pvt. Ltd.',
          receivedOn: '20 May 2025, 11:30 AM',
          status: 'New',
          priority: 'High',
          assignee: '—',
        },
        {
          id: 'REQ-1022',
          project: 'P-1024 - Land Survey',
          client: 'GeoBuild Pvt. Ltd.',
          receivedOn: '19 May 2025, 04:15 PM',
          status: 'Under Review',
          priority: 'Medium',
          assignee: 'John Smith',
        },
        {
          id: 'REQ-1018',
          project: 'P-1023 - Topo Survey',
          client: 'GeoBuild Pvt. Ltd.',
          receivedOn: '17 May 2025, 09:20 AM',
          status: 'Revision',
          priority: 'High',
          assignee: 'John Smith',
        },
        {
          id: 'REQ-1014',
          project: 'P-1021 - Canal Alignment Survey',
          client: 'GeoBuild Pvt. Ltd.',
          receivedOn: '15 May 2025, 02:10 PM',
          status: 'Under Review',
          priority: 'Medium',
          assignee: 'Sarah Lee',
        },
        {
          id: 'REQ-1010',
          project: 'P-1018 - Dam Reservoir Bathymetry',
          client: 'GeoBuild Pvt. Ltd.',
          receivedOn: '12 May 2025, 10:45 AM',
          status: 'Approved',
          priority: 'High',
          assignee: 'John Smith',
        },
        {
          id: 'REQ-1008',
          project: 'P-1016 - Flood Plain Contour LiDAR',
          client: 'GeoBuild Pvt. Ltd.',
          receivedOn: '10 May 2025, 03:00 PM',
          status: 'Under Review',
          priority: 'Medium',
          assignee: 'Sarah Lee',
        },
        {
          id: 'REQ-1005',
          project: 'P-1014 - Embankment Stability Scan',
          client: 'GeoBuild Pvt. Ltd.',
          receivedOn: '08 May 2025, 11:15 AM',
          status: 'New',
          priority: 'Low',
          assignee: '—',
        },
        {
          id: 'REQ-1003',
          project: 'P-1011 - Bridge Pier Scour Inspection',
          client: 'GeoBuild Pvt. Ltd.',
          receivedOn: '05 May 2025, 01:25 PM',
          status: 'Approved',
          priority: 'High',
          assignee: 'David Clark',
        },
        {
          id: 'REQ-1001',
          project: 'P-1008 - Watershed Basin Modeling',
          client: 'GeoBuild Pvt. Ltd.',
          receivedOn: '02 May 2025, 09:00 AM',
          status: 'Under Review',
          priority: 'Medium',
          assignee: 'John Smith',
        },
      ],
    },
    {
      clientId: 'c-2',
      clientName: 'GreenField Infra',
      count: 6,
      requests: [
        {
          id: 'REQ-1021',
          project: 'P-1023 - Volume Calc.',
          client: 'GreenField Infra',
          receivedOn: '19 May 2025, 02:10 PM',
          status: 'Information Requested',
          priority: 'Medium',
          assignee: 'Sarah Lee',
        },
        {
          id: 'REQ-1015',
          project: 'P-1022 - Site Mapping',
          client: 'GreenField Infra',
          receivedOn: '16 May 2025, 10:05 AM',
          status: 'Under Review',
          priority: 'Medium',
          assignee: 'Sarah Lee',
        },
        {
          id: 'REQ-1013',
          project: 'P-1020 - Solar Farm Terrain Topo',
          client: 'GreenField Infra',
          receivedOn: '14 May 2025, 04:30 PM',
          status: 'Approved',
          priority: 'High',
          assignee: 'David Clark',
        },
        {
          id: 'REQ-1007',
          project: 'P-1015 - Wind Turbine Blade Thermography',
          client: 'GreenField Infra',
          receivedOn: '09 May 2025, 11:20 AM',
          status: 'Under Review',
          priority: 'Medium',
          assignee: 'Sarah Lee',
        },
        {
          id: 'REQ-1004',
          project: 'P-1012 - Access Road Alignment',
          client: 'GreenField Infra',
          receivedOn: '06 May 2025, 02:50 PM',
          status: 'New',
          priority: 'Low',
          assignee: '—',
        },
        {
          id: 'REQ-1002',
          project: 'P-1009 - Transmission Corridor Clearance',
          client: 'GreenField Infra',
          receivedOn: '03 May 2025, 10:15 AM',
          status: 'Approved',
          priority: 'High',
          assignee: 'David Clark',
        },
      ],
    },
    {
      clientId: 'c-3',
      clientName: 'Acme Infra',
      count: 7,
      requests: [
        {
          id: 'REQ-1020',
          project: 'P-1020 - Solar Field Inspection',
          client: 'Acme Infra',
          receivedOn: '18 May 2025, 11:00 AM',
          status: 'Under Review',
          priority: 'High',
          assignee: 'David Clark',
        },
        {
          id: 'REQ-1019',
          project: 'P-1019 - Thermal Hotspot Classification',
          client: 'Acme Infra',
          receivedOn: '17 May 2025, 03:40 PM',
          status: 'Revision',
          priority: 'High',
          assignee: 'John Smith',
        },
        {
          id: 'REQ-1017',
          project: 'P-1017 - Substation Boundary LiDAR',
          client: 'Acme Infra',
          receivedOn: '16 May 2025, 09:15 AM',
          status: 'Approved',
          priority: 'Medium',
          assignee: 'Sarah Lee',
        },
        {
          id: 'REQ-1011',
          project: 'P-1013 - High-Voltage Tower Scan',
          client: 'Acme Infra',
          receivedOn: '13 May 2025, 01:20 PM',
          status: 'Under Review',
          priority: 'Medium',
          assignee: 'David Clark',
        },
        {
          id: 'REQ-1009',
          project: 'P-1010 - Inverter Station Thermography',
          client: 'Acme Infra',
          receivedOn: '11 May 2025, 10:30 AM',
          status: 'New',
          priority: 'High',
          assignee: '—',
        },
        {
          id: 'REQ-1006',
          project: 'P-1007 - Drainage Basin Orthomosaic',
          client: 'Acme Infra',
          receivedOn: '08 May 2025, 04:00 PM',
          status: 'Approved',
          priority: 'Medium',
          assignee: 'John Smith',
        },
        {
          id: 'REQ-1000',
          project: 'P-1005 - Perimeter Security Mapping',
          client: 'Acme Infra',
          receivedOn: '01 May 2025, 11:45 AM',
          status: 'Under Review',
          priority: 'Low',
          assignee: 'Sarah Lee',
        },
      ],
    },
    {
      clientId: 'c-4',
      clientName: 'BuildRight Ltd.',
      count: 5,
      requests: [
        {
          id: 'REQ-1016',
          project: 'P-1019 - Highway Alignment',
          client: 'BuildRight Ltd.',
          receivedOn: '16 May 2025, 03:30 PM',
          status: 'New',
          priority: 'Medium',
          assignee: '—',
        },
        {
          id: 'REQ-1012',
          project: 'P-1015 - Earthwork Cut-and-Fill',
          client: 'BuildRight Ltd.',
          receivedOn: '14 May 2025, 10:15 AM',
          status: 'Under Review',
          priority: 'High',
          assignee: 'David Clark',
        },
        {
          id: 'REQ-1008',
          project: 'P-1011 - Flyover Pier Verticality Scan',
          client: 'BuildRight Ltd.',
          receivedOn: '10 May 2025, 02:40 PM',
          status: 'Approved',
          priority: 'Medium',
          assignee: 'John Smith',
        },
        {
          id: 'REQ-1005',
          project: 'P-1008 - As-Built Roadway Profiling',
          client: 'BuildRight Ltd.',
          receivedOn: '07 May 2025, 09:20 AM',
          status: 'Information Requested',
          priority: 'High',
          assignee: 'Sarah Lee',
        },
        {
          id: 'REQ-1002',
          project: 'P-1004 - Bridge Abutment Inspection',
          client: 'BuildRight Ltd.',
          receivedOn: '03 May 2025, 01:10 PM',
          status: 'Approved',
          priority: 'Low',
          assignee: 'David Clark',
        },
      ],
    },
    {
      clientId: 'c-5',
      clientName: 'Skyline Developers',
      count: 4,
      requests: [
        {
          id: 'REQ-1018',
          project: 'P-1017 - Urban Highrise Survey',
          client: 'Skyline Developers',
          receivedOn: '17 May 2025, 09:15 AM',
          status: 'Under Review',
          priority: 'High',
          assignee: 'Sarah Lee',
        },
        {
          id: 'REQ-1014',
          project: 'P-1013 - Facade Thermal Leakage Study',
          client: 'Skyline Developers',
          receivedOn: '15 May 2025, 03:50 PM',
          status: 'New',
          priority: 'Medium',
          assignee: '—',
        },
        {
          id: 'REQ-1009',
          project: 'P-1009 - Rooftop Solar Potential Scan',
          client: 'Skyline Developers',
          receivedOn: '11 May 2025, 11:05 AM',
          status: 'Approved',
          priority: 'High',
          assignee: 'John Smith',
        },
        {
          id: 'REQ-1003',
          project: 'P-1003 - Master Plan 3D Mesh',
          client: 'Skyline Developers',
          receivedOn: '04 May 2025, 02:30 PM',
          status: 'Under Review',
          priority: 'Medium',
          assignee: 'Sarah Lee',
        },
      ],
    },
    {
      clientId: 'c-6',
      clientName: 'Prime Constructions',
      count: 6,
      requests: [
        {
          id: 'REQ-1019',
          project: 'P-1015 - Bridge Inspection',
          client: 'Prime Constructions',
          receivedOn: '17 May 2025, 01:45 PM',
          status: 'Approved',
          priority: 'Medium',
          assignee: 'John Smith',
        },
        {
          id: 'REQ-1015',
          project: 'P-1012 - Girder Deflection LiDAR',
          client: 'Prime Constructions',
          receivedOn: '15 May 2025, 10:20 AM',
          status: 'Under Review',
          priority: 'High',
          assignee: 'David Clark',
        },
        {
          id: 'REQ-1011',
          project: 'P-1008 - Tunnel Portal Orthomosaic',
          client: 'Prime Constructions',
          receivedOn: '12 May 2025, 04:15 PM',
          status: 'Information Requested',
          priority: 'Medium',
          assignee: 'Sarah Lee',
        },
        {
          id: 'REQ-1007',
          project: 'P-1005 - Foundation Concrete Defect Scan',
          client: 'Prime Constructions',
          receivedOn: '09 May 2025, 09:40 AM',
          status: 'New',
          priority: 'High',
          assignee: '—',
        },
        {
          id: 'REQ-1004',
          project: 'P-1002 - Steel Truss Thermography',
          client: 'Prime Constructions',
          receivedOn: '06 May 2025, 03:10 PM',
          status: 'Revision',
          priority: 'High',
          assignee: 'John Smith',
        },
        {
          id: 'REQ-1001',
          project: 'P-1000 - Retaining Wall Topography',
          client: 'Prime Constructions',
          receivedOn: '02 May 2025, 11:30 AM',
          status: 'Approved',
          priority: 'Low',
          assignee: 'David Clark',
        },
      ],
    },
    {
      clientId: 'c-7',
      clientName: 'Urban Spaces Pvt. Ltd.',
      count: 3,
      requests: [
        {
          id: 'REQ-1017',
          project: 'P-1012 - Smart City Grid',
          client: 'Urban Spaces Pvt. Ltd.',
          receivedOn: '16 May 2025, 10:20 AM',
          status: 'Under Review',
          priority: 'Medium',
          assignee: 'David Clark',
        },
        {
          id: 'REQ-1010',
          project: 'P-1006 - Drainage Culvert Thermal Scan',
          client: 'Urban Spaces Pvt. Ltd.',
          receivedOn: '12 May 2025, 02:15 PM',
          status: 'Approved',
          priority: 'High',
          assignee: 'Sarah Lee',
        },
        {
          id: 'REQ-1003',
          project: 'P-1001 - Encroachment Detection Map',
          client: 'Urban Spaces Pvt. Ltd.',
          receivedOn: '04 May 2025, 09:30 AM',
          status: 'New',
          priority: 'Low',
          assignee: '—',
        },
      ],
    },
    {
      clientId: 'c-8',
      clientName: 'InfraVista',
      count: 2,
      requests: [
        {
          id: 'REQ-1013',
          project: 'P-1010 - Pipeline Corridors',
          client: 'InfraVista',
          receivedOn: '14 May 2025, 04:00 PM',
          status: 'Under Review',
          priority: 'High',
          assignee: 'Sarah Lee',
        },
        {
          id: 'REQ-1006',
          project: 'P-1004 - Gas Pipeline Thermal Leak Scan',
          client: 'InfraVista',
          receivedOn: '08 May 2025, 11:10 AM',
          status: 'Approved',
          priority: 'Medium',
          assignee: 'David Clark',
        },
      ],
    },
  ];

  // Filtering for Client Directory in Left Panel
  const filteredClients = clientDirectory.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  // Filtering request groups based on selected client or search
  const filteredAdminGroups = adminRequestsGroups.filter((grp) => {
    if (selectedClientId !== 'all' && grp.clientId !== selectedClientId) {
      return false;
    }
    if (topSearch) {
      const matchClient = grp.clientName.toLowerCase().includes(topSearch.toLowerCase());
      const matchRequests = grp.requests.some(
        (r) =>
          r.id.toLowerCase().includes(topSearch.toLowerCase()) ||
          r.project.toLowerCase().includes(topSearch.toLowerCase())
      );
      return matchClient || matchRequests;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── 1. Top Header Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 900, letterSpacing: '0.02em', color: '#09090b', textTransform: 'uppercase' }}>
            Requests Overview
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Track and manage all client requests across projects
          </p>
        </div>

        {/* Universal Search & Notification Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ position: 'relative', width: '340px' }}>
            <input
              type="text"
              placeholder="Search by project, request ID, or client name..."
              value={topSearch}
              onChange={(e) => setTopSearch(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.775rem', height: '36px', paddingRight: '2rem' }}
            />
            <Search size={14} color="#71717a" style={{ position: 'absolute', right: '10px', top: '11px' }} />
          </div>

          {/* Bell with counter badge 3 */}
          <button
            style={{
              position: 'relative',
              width: '36px',
              height: '36px',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Bell size={16} color="#09090b" />
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: '#09090b',
                color: '#ffffff',
                fontSize: '0.625rem',
                fontWeight: 800,
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              3
            </span>
          </button>

          {/* Profile Avatar */}
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '1px solid var(--border-color)',
              backgroundColor: '#fafafa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <User size={18} color="#09090b" />
          </div>
        </div>
      </div>

      {/* ── 2. 5 KPI Summary Cards ── */}
      <div className="grid-5" style={{ gap: '1rem' }}>
        {adminKpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="wf-card"
              style={{
                padding: '1rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: '0.35rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Icon size={16} color="#09090b" />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>{kpi.title}</span>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#09090b', lineHeight: 1.1 }}>
                {kpi.count}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 3. Date Range & Filter Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.45rem 0.85rem',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            backgroundColor: '#ffffff',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Calendar size={14} color="#09090b" />
          <span>{dateRange}</span>
          <ChevronDown size={14} color="#71717a" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', height: '34px', fontSize: '0.775rem' }}
          >
            <Filter size={13} /> Filter
          </button>
          <button
            onClick={() => {
              setTopSearch('');
              setClientSearch('');
              setSelectedClientId('all');
            }}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', height: '34px', fontSize: '0.775rem' }}
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </div>

      {/* ── 4. Main 2-Column Split: Client Switcher & Grouped Requests Accordion ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.25rem', alignItems: 'start' }}>
        {/* Left Column: Clients / Projects Switcher (Defaults to Clients) */}
        <div className="wf-card" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Switcher Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', gap: '1rem' }}>
            <button
              onClick={() => setActiveTab('clients')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'clients' ? '2px solid #09090b' : '2px solid transparent',
                padding: '0.2rem 0.25rem',
                fontSize: '0.825rem',
                fontWeight: activeTab === 'clients' ? 800 : 500,
                color: activeTab === 'clients' ? '#09090b' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Clients
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'projects' ? '2px solid #09090b' : '2px solid transparent',
                padding: '0.2rem 0.25rem',
                fontSize: '0.825rem',
                fontWeight: activeTab === 'projects' ? 800 : 500,
                color: activeTab === 'projects' ? '#09090b' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Projects
            </button>
          </div>

          {/* Search Clients Box */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search clients..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.75rem', height: '32px', paddingRight: '1.8rem' }}
            />
            <Search size={13} color="#71717a" style={{ position: 'absolute', right: '8px', top: '9px' }} />
          </div>

          {/* Client List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {filteredClients.map((client) => {
              const isSelected = selectedClientId === client.id;
              return (
                <button
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.65rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: isSelected ? '#f4f4f5' : 'transparent',
                    color: isSelected ? '#09090b' : 'var(--text-secondary)',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.775rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {client.name}
                  </span>
                  <span style={{ fontSize: '0.725rem', color: isSelected ? '#09090b' : 'var(--text-muted)' }}>
                    {client.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bottom Action */}
          <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
            <button
              className="btn btn-secondary btn-block"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                fontSize: '0.75rem',
                height: '32px',
              }}
            >
              <Settings size={13} /> Manage Clients
            </button>
          </div>
        </div>

        {/* Right Column: Grouped Requests Accordion Table */}
        <div className="wf-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Header Row: Title & View Mode & Sorting in Single Line */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '1rem' }}>
            <h2 className="wf-title" style={{ fontSize: '1rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
              Requests ({adminRequestsGroups.reduce((acc, grp) => acc + grp.count, 0)})
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'nowrap', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                <button
                  onClick={() => setViewMode('list')}
                  title="List View"
                  style={{
                    width: '30px',
                    height: '30px',
                    border: viewMode === 'list' ? '1px solid #09090b' : '1px solid var(--border-color)',
                    backgroundColor: viewMode === 'list' ? '#f4f4f5' : '#ffffff',
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
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                  style={{
                    width: '30px',
                    height: '30px',
                    border: viewMode === 'grid' ? '1px solid #09090b' : '1px solid var(--border-color)',
                    backgroundColor: viewMode === 'grid' ? '#f4f4f5' : '#ffffff',
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

              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="form-select"
                style={{ fontSize: '0.75rem', height: '30px', padding: '0.2rem 0.5rem', whiteSpace: 'nowrap' }}
              >
                <option value="received_newest">Sort by: Received On (Newest)</option>
                <option value="received_oldest">Sort by: Received On (Oldest)</option>
                <option value="priority_high">Sort by: Priority (High)</option>
              </select>
            </div>
          </div>

          {/* Grouped Table Accordions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {filteredAdminGroups.map((group) => {
              const isExpanded = expandedClients[group.clientId] ?? false;

              return (
                <div
                  key={group.clientId}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    overflow: 'hidden',
                  }}
                >
                  {/* Accordion Header */}
                  <div
                    onClick={() => toggleClientGroup(group.clientId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 1rem',
                      backgroundColor: '#fafafa',
                      cursor: 'pointer',
                      borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isExpanded ? <ChevronDown size={15} color="#09090b" /> : <ChevronRight size={15} color="#71717a" />}
                      <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b' }}>
                        {group.clientName} ({group.count} Requests)
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.45rem',
                        borderRadius: '3px',
                        border: '1px solid #d4d4d8',
                        backgroundColor: '#ffffff',
                        color: '#09090b',
                      }}
                    >
                      {group.count}
                    </span>
                  </div>

                  {/* Accordion Table (Renders all exact items for this client when expanded) */}
                  {isExpanded && (
                    <table className="wf-table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th style={{ width: '12%' }}>Request ID</th>
                          <th style={{ width: '22%' }}>Project</th>
                          <th style={{ width: '18%' }}>Client</th>
                          <th style={{ width: '18%' }}>Received On</th>
                          <th style={{ width: '12%' }}>Status</th>
                          <th style={{ width: '8%' }}>Priority</th>
                          <th style={{ width: '12%' }}>Assignee</th>
                          <th style={{ width: '4%', textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.requests.map((req) => (
                          <tr
                            key={req.id}
                            style={{ cursor: 'pointer' }}
                            onClick={() => router.push('/requests/new')}
                          >
                            <td style={{ fontWeight: 700 }}>{req.id}</td>
                            <td style={{ fontWeight: 600, color: '#09090b' }}>{req.project}</td>
                            <td style={{ color: 'var(--text-secondary)' }}>{req.client}</td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.725rem' }}>{req.receivedOn}</td>
                            <td>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '3px',
                                  border: '1px solid #d4d4d8',
                                  backgroundColor: req.status === 'Approved' ? '#ffffff' : '#f4f4f5',
                                  color: '#09090b',
                                  display: 'inline-block',
                                }}
                              >
                                {req.status}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: req.priority === 'High' ? '#09090b' : 'var(--text-secondary)' }}>
                                {req.priority}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                              {req.assignee}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                title="Inspect & Edit Request"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push('/requests/new');
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '0.2rem',
                                  color: '#09090b',
                                }}
                              >
                                <Eye size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '0.85rem',
              borderTop: '1px solid var(--border-color)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <span>Showing 1 to 10 of 42 requests</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button style={{ width: '26px', height: '26px', border: '1px solid var(--border-color)', backgroundColor: '#ffffff', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a' }}>
                <ChevronLeft size={13} />
              </button>
              <button style={{ width: '26px', height: '26px', border: '1px solid #09090b', backgroundColor: '#09090b', color: '#ffffff', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>
                1
              </button>
              <button style={{ width: '26px', height: '26px', border: '1px solid var(--border-color)', backgroundColor: '#ffffff', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#71717a' }}>
                2
              </button>
              <button style={{ width: '26px', height: '26px', border: '1px solid var(--border-color)', backgroundColor: '#ffffff', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#71717a' }}>
                3
              </button>
              <button style={{ width: '26px', height: '26px', border: '1px solid var(--border-color)', backgroundColor: '#ffffff', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#71717a' }}>
                4
              </button>
              <button style={{ width: '26px', height: '26px', border: '1px solid var(--border-color)', backgroundColor: '#ffffff', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#71717a' }}>
                5
              </button>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>...</span>
              <button style={{ width: '26px', height: '26px', border: '1px solid var(--border-color)', backgroundColor: '#ffffff', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a' }}>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Publish Modal */}
      {activeRequestForPlan && (
        <PlanPublishModal
          isOpen={publishModalOpen}
          requestVersionId={activeRequestForPlan.id}
          versionNumber={activeRequestForPlan.version}
          projectName={activeRequestForPlan.project}
          onClose={() => setPublishModalOpen(false)}
          onSubmit={async () => {
            setPublishModalOpen(false);
          }}
        />
      )}

      {/* Milestone Charge Modal */}
      {selectedProjectId && (
        <MilestoneChargeModal
          isOpen={chargeModalOpen}
          projectId={selectedProjectId}
          projectName="Project"
          onClose={() => setChargeModalOpen(false)}
          onSubmit={async () => {
            setChargeModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
