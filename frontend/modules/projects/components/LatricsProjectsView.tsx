'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import WireframeBox from '@/components/WireframeBox';
import {
  Search,
  Filter,
  Download,
  Calendar,
  Folder,
  PlayCircle,
  CheckCircle2,
  Clock,
  Users,
  MoreVertical,
  X,
  MapPin,
  Building2,
  Layers,
  FileText,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  Inbox,
  AlertCircle,
  RotateCcw,
  ExternalLink,
  Check,
  List,
  LayoutList,
} from 'lucide-react';
import { projectApi } from '@/modules/projects/api';
import { requestApi } from '@/modules/requests/api';
import { Project, ProjectStatus } from '@/modules/projects/types';

export default function LatricsProjectsView() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [totalRequestsCount, setTotalRequestsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & State
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'on_hold'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');

  // Company Grouping & Accordion State (Default to Grouped by Company)
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});

  // Selected Checkboxes & Active Project Detail Drawer
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [activeDrawerProjectId, setActiveDrawerProjectId] = useState<string | null>(null);
  const [drawerActiveTab, setDrawerActiveTab] = useState<'overview' | 'deliverables' | 'team' | 'files'>('overview');

  // Row actions menu open state
  const [openMenuProjectId, setOpenMenuProjectId] = useState<string | null>(null);

  // Pagination (used for flat table)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [projData, reqsData] = await Promise.all([
        projectApi.listProjects(),
        requestApi.listAllRequests().catch(() => []),
      ]);
      setProjects(projData || []);
      setTotalRequestsCount(Array.isArray(reqsData) ? reqsData.length : 0);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch projects from server');
    } finally {
      setIsLoading(false);
    }
  };

  // Distinct client organizations derived strictly from database
  const distinctClientOptions = useMemo(() => {
    const clients = new Set<string>();
    projects.forEach((p) => {
      const clientLabel = p.client_company || p.client_name;
      if (clientLabel) clients.add(clientLabel);
    });
    return Array.from(clients).sort();
  }, [projects]);

  // Dynamic KPI counts computed from real database state
  const totalProjectsCount = projects.length;
  const activeProjectsCount = projects.filter((p) =>
    ['active', 'planning', 'approved', 'submitted'].includes(p.status)
  ).length;
  const completedProjectsCount = projects.filter((p) => p.status === 'completed').length;
  const draftsOnHoldCount = projects.filter((p) =>
    ['draft', 'cancelled'].includes(p.status)
  ).length;
  const clientOrgsCount = distinctClientOptions.length;

  // Filtering Logic
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // 1. Tab filter
      if (activeTab === 'active' && !['active', 'planning', 'approved', 'submitted'].includes(p.status)) {
        return false;
      }
      if (activeTab === 'completed' && p.status !== 'completed') {
        return false;
      }
      if (activeTab === 'on_hold' && !['draft', 'cancelled'].includes(p.status)) {
        return false;
      }

      // 2. Status dropdown filter
      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }

      // 3. Client dropdown filter
      if (clientFilter !== 'all') {
        const clientLabel = p.client_company || p.client_name || '';
        if (clientLabel !== clientFilter) return false;
      }

      // 4. Date range filter
      if (dateRangeFilter !== 'all') {
        const pDate = new Date(p.created_at).getTime();
        const now = Date.now();
        if (dateRangeFilter === '7d' && now - pDate > 7 * 24 * 60 * 60 * 1000) return false;
        if (dateRangeFilter === '30d' && now - pDate > 30 * 24 * 60 * 60 * 1000) return false;
        if (dateRangeFilter === 'year') {
          const pYear = new Date(p.created_at).getFullYear();
          const currentYear = new Date().getFullYear();
          if (pYear !== currentYear) return false;
        }
      }

      // 5. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchClient = (p.client_company || p.client_name || '').toLowerCase().includes(q);
        const matchLocation = (p.survey_location || '').toLowerCase().includes(q);
        const matchId = p.id.toLowerCase().includes(q);
        if (!matchTitle && !matchClient && !matchLocation && !matchId) return false;
      }

      return true;
    });
  }, [projects, activeTab, statusFilter, clientFilter, dateRangeFilter, searchQuery]);

  // Dynamic Company Groups derived from filtered projects
  const companyGroups = useMemo(() => {
    const map: Record<string, Project[]> = {};
    filteredProjects.forEach((p) => {
      const company = p.client_company || p.client_name || 'General / Unassigned Client';
      if (!map[company]) {
        map[company] = [];
      }
      map[company].push(p);
    });

    return Object.entries(map).map(([companyName, companyProjects]) => {
      const activeCount = companyProjects.filter((p) =>
        ['active', 'planning', 'approved', 'submitted'].includes(p.status)
      ).length;
      const completedCount = companyProjects.filter((p) => p.status === 'completed').length;
      return {
        companyName,
        projects: companyProjects,
        totalCount: companyProjects.length,
        activeCount,
        completedCount,
      };
    });
  }, [filteredProjects]);

  // Keep all companies expanded by default when projects are fetched
  useEffect(() => {
    if (projects.length > 0) {
      const initExpanded: Record<string, boolean> = {};
      projects.forEach((p) => {
        const cName = p.client_company || p.client_name || 'General / Unassigned Client';
        initExpanded[cName] = true;
      });
      setExpandedCompanies((prev) => ({ ...initExpanded, ...prev }));
    }
  }, [projects]);

  const toggleCompany = (companyName: string) => {
    setExpandedCompanies((prev) => ({
      ...prev,
      [companyName]: !(prev[companyName] ?? true),
    }));
  };

  const handleToggleAllCompanies = () => {
    const allExpanded = companyGroups.every((g) => expandedCompanies[g.companyName] ?? true);
    const updated: Record<string, boolean> = {};
    companyGroups.forEach((g) => {
      updated[g.companyName] = !allExpanded;
    });
    setExpandedCompanies(updated);
  };

  const formatLocation = (project: Project) => {
    const req = project.requirements_payload || {};
    const city = project.city || req.city;
    const state = project.state || req.state;
    const address = req.location_address || req.address || project.survey_location;

    if (city && state) {
      if (address && address !== city && address !== `${city}, ${state}`) {
        return `${address}, ${city}, ${state}`;
      }
      return `${city}, ${state}`;
    }
    if (city) {
      return address && address !== city ? `${address}, ${city}` : city;
    }
    return address || '—';
  };

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + pageSize);
  const displayStart = filteredProjects.length === 0 ? 0 : startIndex + 1;
  const displayEnd = Math.min(filteredProjects.length, startIndex + pageSize);

  // Active drawer project
  const selectedProject = projects.find((p) => p.id === activeDrawerProjectId) || null;

  // Handle select all checkbox
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedProjectIds(paginatedProjects.map((p) => p.id));
    } else {
      setSelectedProjectIds([]);
    }
  };

  const handleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setClientFilter('all');
    setDateRangeFilter('all');
    setActiveTab('all');
    setCurrentPage(1);
  };

  // CSV Exporter
  const handleExportCSV = () => {
    if (filteredProjects.length === 0) return;
    const headers = ['Project Name', 'Client', 'Location', 'Status', 'Start Date', 'End Date', 'Progress %', 'Created At'];
    const rows = filteredProjects.map((p) => [
      `"${p.title.replace(/"/g, '""')}"`,
      `"${(p.client_company || p.client_name || '—').replace(/"/g, '""')}"`,
      `"${(p.survey_location || '—').replace(/"/g, '""')}"`,
      p.status,
      p.requirements_payload?.timeline_start || p.created_at?.split('T')[0] || '—',
      p.requirements_payload?.timeline_end || '—',
      `${p.progress_pct ?? p.overall_progress_pct ?? (p.status === 'completed' ? 100 : 0)}%`,
      p.created_at || '—',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `latrics_projects_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: ProjectStatus | string) => {
    const s = String(status).toLowerCase();
    switch (s) {
      case 'active':
        return <span className="status-badge status-active">Active</span>;
      case 'planning':
        return <span className="status-badge" style={{ backgroundColor: '#f4f4f5', color: '#18181b', border: '1px solid #d4d4d8' }}>Planning</span>;
      case 'submitted':
        return <span className="status-badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>Submitted</span>;
      case 'approved':
        return <span className="status-badge" style={{ backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>Approved</span>;
      case 'completed':
        return <span className="status-badge status-verified">Completed</span>;
      case 'cancelled':
        return <span className="status-badge status-flagged">Cancelled</span>;
      case 'draft':
      default:
        return <span className="status-badge status-pending">Draft</span>;
    }
  };

  // Deliverables tags list
  const getDeliverablesList = (project: Project): string[] => {
    if (project.requirements_payload?.deliverables && Array.isArray(project.requirements_payload.deliverables)) {
      return project.requirements_payload.deliverables;
    }
    if (project.survey_type) {
      return [project.survey_type.toUpperCase()];
    }
    return ['Standard Survey'];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── 1. Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#09090b', letterSpacing: '-0.02em', margin: 0 }}>
            Projects
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem', marginBottom: 0 }}>
            View and track all survey projects, their status, scope, deliverables and timelines.
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#991b1b',
            fontSize: '0.825rem',
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── 2. Top KPI Strip (5 Cards) ── */}
      <div className="grid-5">
        {/* Card 1: Total Project */}
        <div className="wf-card" style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
          <WireframeBox width={36} height={36} style={{ flexShrink: 0, borderRadius: '4px' }}>
            <Folder size={18} color="#71717a" />
          </WireframeBox>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Total Project
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2, margin: '0.15rem 0' }}>
              {isLoading ? '—' : totalProjectsCount}
            </span>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
              All time
            </span>
          </div>
        </div>

        {/* Card 2: Active Project */}
        <div className="wf-card" style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
          <WireframeBox width={36} height={36} style={{ flexShrink: 0, borderRadius: '4px' }}>
            <PlayCircle size={18} color="#71717a" />
          </WireframeBox>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Active Project
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2, margin: '0.15rem 0' }}>
              {isLoading ? '—' : activeProjectsCount}
            </span>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
              Ongoing
            </span>
          </div>
        </div>

        {/* Card 3: Completed Project */}
        <div className="wf-card" style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
          <WireframeBox width={36} height={36} style={{ flexShrink: 0, borderRadius: '4px' }}>
            <CheckCircle2 size={18} color="#71717a" />
          </WireframeBox>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Completed Project
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2, margin: '0.15rem 0' }}>
              {isLoading ? '—' : completedProjectsCount}
            </span>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
              Finished
            </span>
          </div>
        </div>

        {/* Card 4: Draft/Hold */}
        <div className="wf-card" style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
          <WireframeBox width={36} height={36} style={{ flexShrink: 0, borderRadius: '4px' }}>
            <Clock size={18} color="#71717a" />
          </WireframeBox>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Draft/Hold
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2, margin: '0.15rem 0' }}>
              {isLoading ? '—' : draftsOnHoldCount}
            </span>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
              Pending action
            </span>
          </div>
        </div>

        {/* Card 5: Total Requests */}
        <div className="wf-card" style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
          <WireframeBox width={36} height={36} style={{ flexShrink: 0, borderRadius: '4px' }}>
            <FileText size={18} color="#71717a" />
          </WireframeBox>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Total Requests
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2, margin: '0.15rem 0' }}>
              {isLoading ? '—' : totalRequestsCount}
            </span>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
              Submitted
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Tab Bar & Actions Row ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.25rem',
        }}
      >
        <div style={{ display: 'flex', gap: '1.25rem' }}>
          {[
            { id: 'all', label: 'All Projects' },
            { id: 'active', label: 'Active' },
            { id: 'completed', label: 'Completed' },
            { id: 'on_hold', label: 'Draft/Hold' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setCurrentPage(1);
              }}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #09090b' : '2px solid transparent',
                padding: '0.5rem 0.2rem',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={handleExportCSV}
            disabled={filteredProjects.length === 0}
            className="btn btn-outline"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              height: '34px',
              fontSize: '0.8rem',
              padding: '0 0.85rem',
              opacity: filteredProjects.length === 0 ? 0.5 : 1,
              cursor: filteredProjects.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <Download size={14} /> Export
          </button>
          <button
            onClick={() => fetchProjects()}
            title="Refresh list"
            style={{
              width: '34px',
              height: '34px',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} color="#09090b" className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── 4. Main Container: Table + Right Detail Drawer ── */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
        {/* Table Card */}
        <div className="wf-card" style={{ flexGrow: 1, padding: 0, overflow: 'hidden', minWidth: 0 }}>
          {/* Filter Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1.25rem',
              borderBottom: '1px solid var(--border-color)',
              flexWrap: 'wrap',
              gap: '0.75rem',
              backgroundColor: '#ffffff',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', width: '280px', minWidth: '200px' }}>
              <Search size={14} color="#71717a" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search by project name, client, location..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="form-input"
                style={{ paddingLeft: '2rem', fontSize: '0.8rem', height: '34px', width: '100%' }}
              />
            </div>

            {/* Filter Dropdowns */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {/* Status Dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="form-select"
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', height: '34px', width: 'auto' }}
              >
                <option value="all">Status: All</option>
                <option value="active">Active</option>
                <option value="planning">Planning</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
                <option value="draft">Draft</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {/* Client Dropdown */}
              <select
                value={clientFilter}
                onChange={(e) => {
                  setClientFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="form-select"
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', height: '34px', width: 'auto' }}
              >
                <option value="all">Client: All</option>
                {distinctClientOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Date Range Dropdown */}
              <select
                value={dateRangeFilter}
                onChange={(e) => {
                  setDateRangeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="form-select"
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', height: '34px', width: 'auto' }}
              >
                <option value="all">Date Range: All</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="year">This Year</option>
              </select>

              {/* Clear Filters */}
              {(searchQuery || statusFilter !== 'all' || clientFilter !== 'all' || dateRangeFilter !== 'all') && (
                <button
                  onClick={handleClearFilters}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '0.775rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '0.2rem 0.4rem',
                  }}
                >
                  Clear Filters
                </button>
              )}

              {/* Expand All / Collapse All (Grouped Mode Only) */}
              {viewMode === 'grouped' && companyGroups.length > 0 && (
                <button
                  onClick={handleToggleAllCompanies}
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#09090b',
                    fontSize: '0.775rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '0.2rem 0.4rem',
                  }}
                >
                  {companyGroups.every((g) => expandedCompanies[g.companyName] ?? true)
                    ? 'Collapse All'
                    : 'Expand All'}
                </button>
              )}

              {/* View Mode Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  backgroundColor: '#f4f4f5',
                  padding: '2px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode('grouped')}
                  title="Group by Company"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.25rem 0.55rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: viewMode === 'grouped' ? '#ffffff' : 'transparent',
                    color: viewMode === 'grouped' ? '#09090b' : 'var(--text-secondary)',
                    fontWeight: viewMode === 'grouped' ? 700 : 500,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    boxShadow: viewMode === 'grouped' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  }}
                >
                  <LayoutList size={13} /> Grouped
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('flat')}
                  title="Flat Table View"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.25rem 0.55rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: viewMode === 'flat' ? '#ffffff' : 'transparent',
                    color: viewMode === 'flat' ? '#09090b' : 'var(--text-secondary)',
                    fontWeight: viewMode === 'flat' ? 700 : 500,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    boxShadow: viewMode === 'flat' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  }}
                >
                  <List size={13} /> Flat List
                </button>
              </div>
            </div>
          </div>

          {/* Table Body */}
          {isLoading ? (
            <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
              <p style={{ fontSize: '0.85rem' }}>Loading projects from database...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                textAlign: 'center',
                backgroundColor: '#fafafa',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#f4f4f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#71717a',
                }}
              >
                <Inbox size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', marginBottom: '0.25rem' }}>
                  No Projects Available
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: 1.4, margin: '0 auto' }}>
                  {searchQuery || statusFilter !== 'all' || clientFilter !== 'all'
                    ? 'No survey projects match the selected filters.'
                    : 'No survey projects have been submitted by clients yet. When clients submit project requests, they will appear here for flight planning and execution.'}
                </p>
              </div>
            </div>
          ) : viewMode === 'grouped' ? (
            /* ── GROUPED BY COMPANY ACCORDION VIEW ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
              {companyGroups.map((group) => {
                const isExpanded = expandedCompanies[group.companyName] ?? true;

                return (
                  <div
                    key={group.companyName}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    {/* Accordion Company Header */}
                    <div
                      onClick={() => toggleCompany(group.companyName)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        backgroundColor: '#fafafa',
                        cursor: 'pointer',
                        borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                        userSelect: 'none',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fafafa')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{ color: '#09090b', display: 'flex', alignItems: 'center' }}>
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            backgroundColor: '#e4e4e7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#18181b',
                          }}
                        >
                          <Building2 size={15} />
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#09090b' }}>
                          {group.companyName}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {group.activeCount > 0 && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '12px',
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                            }}
                          >
                            {group.activeCount} Active
                          </span>
                        )}
                        {group.completedCount > 0 && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '12px',
                              backgroundColor: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                            }}
                          >
                            {group.completedCount} Completed
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.55rem',
                            borderRadius: '12px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #d4d4d8',
                            color: '#09090b',
                          }}
                        >
                          {group.totalCount} {group.totalCount === 1 ? 'Project' : 'Projects'}
                        </span>
                      </div>
                    </div>

                    {/* Company Projects Table */}
                    {isExpanded && (
                      <table className="wf-table" style={{ margin: 0 }}>
                        <thead>
                          <tr>
                            <th style={{ width: '40px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={
                                  group.projects.length > 0 &&
                                  group.projects.every((p) => selectedProjectIds.includes(p.id))
                                }
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedProjectIds((prev) => [
                                      ...prev,
                                      ...group.projects.map((p) => p.id).filter((id) => !prev.includes(id)),
                                    ]);
                                  } else {
                                    const groupIds = new Set(group.projects.map((p) => p.id));
                                    setSelectedProjectIds((prev) => prev.filter((id) => !groupIds.has(id)));
                                  }
                                }}
                                style={{ cursor: 'pointer' }}
                              />
                            </th>
                            <th style={{ width: '25%' }}>Project Name</th>
                            <th style={{ width: '22%' }}>Location</th>
                            <th style={{ width: '13%' }}>Status</th>
                            <th style={{ width: '12%' }}>Start Date</th>
                            <th style={{ width: '12%' }}>End Date</th>
                            <th style={{ width: '12%' }}>Progress</th>
                            <th style={{ width: '40px', textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.projects.map((project) => {
                            const isSelected = selectedProjectIds.includes(project.id);
                            const isActiveRow = activeDrawerProjectId === project.id;
                            const progressPct =
                              project.progress_pct ??
                              project.overall_progress_pct ??
                              (project.status === 'completed' ? 100 : 0);
                            const startDate = project.requirements_payload?.timeline_start || project.created_at;
                            const endDate = project.requirements_payload?.timeline_end || null;
                            const locationDisplay = formatLocation(project);

                            return (
                              <tr
                                key={project.id}
                                onClick={() => setActiveDrawerProjectId(project.id)}
                                style={{
                                  cursor: 'pointer',
                                  backgroundColor: isActiveRow ? '#f4f4f5' : isSelected ? '#fafafa' : '#ffffff',
                                  transition: 'background-color 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  if (!isActiveRow && !isSelected) e.currentTarget.style.backgroundColor = '#fafafa';
                                }}
                                onMouseLeave={(e) => {
                                  if (!isActiveRow && !isSelected) e.currentTarget.style.backgroundColor = '#ffffff';
                                }}
                              >
                                {/* Checkbox */}
                                <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => handleSelectOne(project.id, e as any)}
                                    style={{ cursor: 'pointer' }}
                                  />
                                </td>

                                {/* Project Name */}
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 700, color: '#09090b', fontSize: '0.85rem' }}>
                                      {project.title}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                      ID: {project.id.slice(0, 8)}...
                                    </span>
                                  </div>
                                </td>

                                {/* Location */}
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <MapPin size={12} color="#71717a" style={{ flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                      {locationDisplay}
                                    </span>
                                  </div>
                                </td>

                                {/* Status */}
                                <td>{getStatusBadge(project.status)}</td>

                                {/* Start Date */}
                                <td>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    {formatDate(startDate)}
                                  </span>
                                </td>

                                {/* End Date */}
                                <td>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    {formatDate(endDate)}
                                  </span>
                                </td>

                                {/* Progress */}
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                                    <div
                                      style={{
                                        flexGrow: 1,
                                        height: '6px',
                                        backgroundColor: '#e4e4e7',
                                        borderRadius: '3px',
                                        overflow: 'hidden',
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: `${progressPct}%`,
                                          height: '100%',
                                          backgroundColor: progressPct === 100 ? '#10b981' : '#18181b',
                                          transition: 'width 0.3s ease',
                                        }}
                                      />
                                    </div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b', width: '32px', textAlign: 'right' }}>
                                      {progressPct}%
                                    </span>
                                  </div>
                                </td>

                                {/* Actions Menu */}
                                <td style={{ textAlign: 'center', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => setOpenMenuProjectId(openMenuProjectId === project.id ? null : project.id)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: '#71717a',
                                      padding: '4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <MoreVertical size={16} />
                                  </button>

                                  {openMenuProjectId === project.id && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        right: '10px',
                                        top: '30px',
                                        backgroundColor: '#ffffff',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        zIndex: 50,
                                        minWidth: '175px',
                                        textAlign: 'left',
                                        padding: '0.35rem 0',
                                      }}
                                    >
                                      <button
                                        onClick={() => {
                                          setActiveDrawerProjectId(project.id);
                                          setOpenMenuProjectId(null);
                                        }}
                                        style={{
                                          width: '100%',
                                          padding: '0.45rem 0.85rem',
                                          fontSize: '0.775rem',
                                          background: 'none',
                                          border: 'none',
                                          textAlign: 'left',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.4rem',
                                          color: '#09090b',
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                      >
                                        <FileText size={13} /> View Quick Overview
                                      </button>
                                      <button
                                        onClick={() => {
                                          router.push(`/projects/${project.id}/overview`);
                                          setOpenMenuProjectId(null);
                                        }}
                                        style={{
                                          width: '100%',
                                          padding: '0.45rem 0.85rem',
                                          fontSize: '0.775rem',
                                          background: 'none',
                                          border: 'none',
                                          textAlign: 'left',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.4rem',
                                          color: '#09090b',
                                          fontWeight: 700,
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                      >
                                        <ExternalLink size={13} /> View Full Details
                                      </button>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard?.writeText(project.id);
                                          setOpenMenuProjectId(null);
                                        }}
                                        style={{
                                          width: '100%',
                                          padding: '0.45rem 0.85rem',
                                          fontSize: '0.775rem',
                                          background: 'none',
                                          border: 'none',
                                          textAlign: 'left',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.4rem',
                                          color: '#09090b',
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                      >
                                        <Check size={13} /> Copy ID
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── FLAT TABLE VIEW ── */
            <table className="wf-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={
                        paginatedProjects.length > 0 &&
                        paginatedProjects.every((p) => selectedProjectIds.includes(p.id))
                      }
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ width: '22%' }}>Project Name</th>
                  <th style={{ width: '16%' }}>Client</th>
                  <th style={{ width: '15%' }}>Location</th>
                  <th style={{ width: '12%' }}>Status</th>
                  <th style={{ width: '11%' }}>Start Date</th>
                  <th style={{ width: '11%' }}>End Date</th>
                  <th style={{ width: '14%' }}>Progress</th>
                  <th style={{ width: '40px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProjects.map((project) => {
                  const isSelected = selectedProjectIds.includes(project.id);
                  const isActiveRow = activeDrawerProjectId === project.id;
                  const progressPct =
                    project.progress_pct ??
                    project.overall_progress_pct ??
                    (project.status === 'completed' ? 100 : 0);
                  const startDate = project.requirements_payload?.timeline_start || project.created_at;
                  const endDate = project.requirements_payload?.timeline_end || null;
                  const clientLabel = project.client_company || project.client_name || '—';
                  const locationDisplay = formatLocation(project);

                  return (
                    <tr
                      key={project.id}
                      onClick={() => setActiveDrawerProjectId(project.id)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: isActiveRow ? '#f4f4f5' : isSelected ? '#fafafa' : '#ffffff',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActiveRow && !isSelected) e.currentTarget.style.backgroundColor = '#fafafa';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActiveRow && !isSelected) e.currentTarget.style.backgroundColor = '#ffffff';
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectOne(project.id, e as any)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* Project Name */}
                      <td>
                        <span style={{ fontWeight: 700, color: '#09090b', fontSize: '0.85rem' }}>
                          {project.title}
                        </span>
                      </td>

                      {/* Client */}
                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#18181b', fontWeight: 500 }}>
                          {clientLabel}
                        </span>
                      </td>

                      {/* Location */}
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {locationDisplay}
                        </span>
                      </td>

                      {/* Status */}
                      <td>{getStatusBadge(project.status)}</td>

                      {/* Start Date */}
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {formatDate(startDate)}
                        </span>
                      </td>

                      {/* End Date */}
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {formatDate(endDate)}
                        </span>
                      </td>

                      {/* Progress */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                          <div
                            style={{
                              flexGrow: 1,
                              height: '6px',
                              backgroundColor: '#e4e4e7',
                              borderRadius: '3px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${progressPct}%`,
                                height: '100%',
                                backgroundColor: progressPct === 100 ? '#10b981' : '#18181b',
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b', width: '32px', textAlign: 'right' }}>
                            {progressPct}%
                          </span>
                        </div>
                      </td>

                      {/* Row Actions Menu */}
                      <td style={{ textAlign: 'center', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenMenuProjectId(openMenuProjectId === project.id ? null : project.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#71717a',
                            padding: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>

                        {/* Actions Dropdown */}
                        {openMenuProjectId === project.id && (
                          <div
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: '30px',
                              backgroundColor: '#ffffff',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              zIndex: 50,
                              minWidth: '175px',
                              textAlign: 'left',
                              padding: '0.35rem 0',
                            }}
                          >
                            <button
                              onClick={() => {
                                setActiveDrawerProjectId(project.id);
                                setOpenMenuProjectId(null);
                              }}
                              style={{
                                width: '100%',
                                padding: '0.45rem 0.85rem',
                                fontSize: '0.775rem',
                                background: 'none',
                                border: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                color: '#09090b',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <FileText size={13} /> View Quick Details
                            </button>
                            <button
                              onClick={() => {
                                router.push(`/projects/${project.id}/overview`);
                                setOpenMenuProjectId(null);
                              }}
                              style={{
                                width: '100%',
                                padding: '0.45rem 0.85rem',
                                fontSize: '0.775rem',
                                background: 'none',
                                border: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                color: '#09090b',
                                fontWeight: 700,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <ExternalLink size={13} /> View Full Details
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard?.writeText(project.id);
                                setOpenMenuProjectId(null);
                              }}
                              style={{
                                width: '100%',
                                padding: '0.45rem 0.85rem',
                                fontSize: '0.775rem',
                                background: 'none',
                                border: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                color: '#09090b',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <Check size={13} /> Copy ID
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* ── 5. Pagination Footer ── */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 1.25rem',
              borderTop: '1px solid var(--border-color)',
              flexWrap: 'wrap',
              gap: '0.75rem',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              backgroundColor: '#ffffff',
            }}
          >
            {viewMode === 'grouped' ? (
              <span>
                Showing {filteredProjects.length} projects across {companyGroups.length} {companyGroups.length === 1 ? 'company' : 'companies'}
              </span>
            ) : (
              <span>
                Showing {displayStart}–{displayEnd} of {filteredProjects.length} projects
              </span>
            )}

            {/* Page Buttons (used in flat mode) */}
            {viewMode === 'flat' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.4 : 1,
                  }}
                >
                  <ChevronLeft size={14} />
                </button>

                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  const isActive = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '4px',
                        border: isActive ? '1px solid #09090b' : '1px solid var(--border-color)',
                        backgroundColor: isActive ? '#09090b' : '#ffffff',
                        color: isActive ? '#ffffff' : '#09090b',
                        fontSize: '0.775rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages || totalPages === 0 ? 0.4 : 1,
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── 6. Right Side Detail Drawer Panel ── */}
        {selectedProject && (
          <div
            className="wf-card"
            style={{
              width: '400px',
              minWidth: '380px',
              maxWidth: '420px',
              padding: 0,
              flexShrink: 0,
              backgroundColor: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                    {selectedProject.title}
                  </h3>
                  {getStatusBadge(selectedProject.status)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() => router.push(`/projects/${selectedProject.id}/overview`)}
                    title="Open Project Overview Page"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#09090b',
                      padding: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      borderRadius: '4px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <ExternalLink size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDrawerProjectId(null)}
                    title="Close Drawer"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#71717a',
                      padding: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      borderRadius: '4px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Sub-info: Client and Location */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', color: '#18181b', fontWeight: 600 }}>
                  <Building2 size={14} color="#71717a" />
                  <span>{selectedProject.client_company || selectedProject.client_name || 'Client Unassigned'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                  <MapPin size={14} color="#71717a" />
                  <span>{formatLocation(selectedProject)}</span>
                </div>
              </div>
            </div>

            {/* Drawer Tabs */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: '#fafafa',
                padding: '0 1rem',
              }}
            >
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'deliverables', label: 'Deliverables' },
                { id: 'team', label: 'Team' },
                { id: 'files', label: 'Files' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDrawerActiveTab(tab.id as any)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: drawerActiveTab === tab.id ? '2px solid #09090b' : '2px solid transparent',
                    padding: '0.55rem 0.65rem',
                    fontSize: '0.775rem',
                    fontWeight: drawerActiveTab === tab.id ? 700 : 500,
                    color: drawerActiveTab === tab.id ? '#09090b' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Drawer Body Content */}
            <div style={{ padding: '1.25rem', flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {drawerActiveTab === 'overview' && (
                <>
                  {/* Project Description */}
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Project Description
                    </span>
                    <p style={{ fontSize: '0.825rem', color: '#18181b', lineHeight: 1.45, marginTop: '0.35rem', marginBottom: 0 }}>
                      {selectedProject.description || 'No detailed description provided for this project.'}
                    </p>
                  </div>

                  {/* Start Date & End Date Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Start Date
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem', fontSize: '0.8rem', fontWeight: 600, color: '#09090b' }}>
                        <Calendar size={13} color="#71717a" />
                        <span>{formatDate(selectedProject.requirements_payload?.timeline_start || selectedProject.created_at)}</span>
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        End Date
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem', fontSize: '0.8rem', fontWeight: 600, color: '#09090b' }}>
                        <Calendar size={13} color="#71717a" />
                        <span>{formatDate(selectedProject.requirements_payload?.timeline_end)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Scope */}
                  <div>
                    <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Scope
                    </span>
                    <p style={{ fontSize: '0.825rem', fontWeight: 600, color: '#09090b', marginTop: '0.25rem', marginBottom: 0 }}>
                      {selectedProject.target_area_sqkm
                        ? `~ ${selectedProject.target_area_sqkm} sq. km`
                        : 'Area specified in sector plans'}
                    </p>
                  </div>

                  {/* Deliverables Tags */}
                  <div>
                    <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Deliverables
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.35rem' }}>
                      {getDeliverablesList(selectedProject).map((tag, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: '#f4f4f5',
                            border: '1px solid #e4e4e7',
                            color: '#18181b',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Assigned Team */}
                  <div>
                    <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Assigned Team
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          backgroundColor: '#09090b',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                        }}
                      >
                        OP
                      </div>
                      <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                        Flight team managed in Planning & Allocations
                      </span>
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.25rem 0' }} />

                  {/* Created By */}
                  <div>
                    <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Created By
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.3rem' }}>
                      <UserIcon size={14} color="#71717a" />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                          {selectedProject.creator_name || selectedProject.client_name || 'Client'}{' '}
                          <span style={{ fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            ({selectedProject.creator_role ? selectedProject.creator_role.toUpperCase() : 'CLIENT'})
                          </span>
                        </span>
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                          {formatDateTime(selectedProject.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Last Updated */}
                  <div>
                    <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Last Updated
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.3rem' }}>
                      <Clock size={14} color="#71717a" />
                      <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                        {formatDateTime(selectedProject.updated_at || selectedProject.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* View Full Details Button */}
                  <button
                    type="button"
                    onClick={() => router.push(`/projects/${selectedProject.id}/overview`)}
                    className="btn btn-primary"
                    style={{
                      marginTop: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem',
                      fontSize: '0.825rem',
                      fontWeight: 700,
                      width: '100%',
                      height: '38px',
                      backgroundColor: '#09090b',
                      color: '#ffffff',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    View Full Details <ExternalLink size={14} />
                  </button>
                </>
              )}

              {drawerActiveTab === 'deliverables' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Specified Deliverables & Sensor Payload
                  </span>
                  <div style={{ padding: '0.75rem', backgroundColor: '#fafafa', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>Deliverable Package:</p>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)' }}>
                      {getDeliverablesList(selectedProject).map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                  {selectedProject.requirements_payload?.sensor_payload && (
                    <div style={{ padding: '0.75rem', backgroundColor: '#fafafa', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600 }}>Sensor / Hardware Payload:</p>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {JSON.stringify(selectedProject.requirements_payload.sensor_payload)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {drawerActiveTab === 'team' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Flight Crew & Pilot Allocations
                  </span>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Sector-specific flight crew assignments are managed in the Planning & Allocations module.
                  </p>
                  <Link href="/planning" className="btn btn-outline" style={{ fontSize: '0.775rem', textAlign: 'center', textDecoration: 'none' }}>
                    Open Flight Planning
                  </Link>
                </div>
              )}

              {drawerActiveTab === 'files' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Project Documents & Artifacts
                  </span>
                  <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: '#fafafa', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <Layers size={20} color="#71717a" style={{ margin: '0 auto 0.5rem' }} />
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.775rem' }}>
                      Document storage and delivery packages will appear here once flight processing is complete (Phase 2B).
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
