'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PlanPublishModal } from '@/modules/planning/components/PlanPublishModal';
import { MilestoneChargeModal } from '@/modules/payments/components/MilestoneChargeModal';
import { requestApi } from '@/modules/requests/api';
import { planningApi } from '@/modules/planning/api';
import { RequestVersion } from '@/modules/requests/types';
import { useAuth } from '@/lib/auth';
import { isLatricsRole } from '@/lib/role';
import { PageHeader } from '@/components/PageHeader';
import {
  calculateRequestsNotificationCount,
  isRequestUnseen,
  isPlanningVersionUnseen,
  markRequestAsSeen,
  markPlanningVersionAsSeen,
  markAllRequestsAsSeen,
  NOTIFICATIONS_CHANGED_EVENT,
} from '@/modules/requests/notifications';

export default function RequestsOverviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isClient = Boolean(user && !isLatricsRole(user.role));

  // Data fetching & loading states
  const [requests, setRequests] = useState<RequestVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Notification Counts State
  const [notificationCounts, setNotificationCounts] = useState({
    newRequestsCount: 0,
    unseenPlanningCount: 0,
    totalBadgeCount: 0,
    unseenRequestIds: [] as string[],
    unseenPlanningProjectIds: [] as string[],
  });

  // Common Search & Filter states
  const [topSearch, setTopSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'clients' | 'projects'>('clients');
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [sortOption, setSortOption] = useState('received_newest');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [dateRange, setDateRange] = useState('All Time');

  // 6 Functional KPI State: New Requests, Under Review, Converted Requests, Cancelled/Hold, Total Requests, Request History
  const [selectedKpi, setSelectedKpi] = useState<'new' | 'under_review' | 'converted' | 'cancelled' | 'total' | 'history'>('new');
  const [projectVersionsMap, setProjectVersionsMap] = useState<Record<string, any[]>>({});

  // Modals state
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [activeRequestForPlan, setActiveRequestForPlan] = useState<any>(null);
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Accordion state
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await requestApi.listAllRequests();
      setRequests(data || []);
      // Open all client accordions by default
      const initialExpanded: Record<string, boolean> = {};
      (data || []).forEach((r) => {
        const cKey = r.client_company || r.client_name || r.client_email || 'General Clients';
        initialExpanded[cKey] = true;
      });
      setExpandedClients(initialExpanded);

      // Fetch version history snapshots for each project
      const uniqueProjectIds = Array.from(new Set((data || []).map((r) => r.project_id).filter(Boolean)));
      const vMap: Record<string, any[]> = {};
      await Promise.all(
        uniqueProjectIds.map(async (pId) => {
          try {
            const vers = await planningApi.listPlanningVersions(pId);
            if (vers && vers.length > 0) {
              vMap[pId] = vers;
            }
          } catch {}
        })
      );
      setProjectVersionsMap(vMap);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load requests from server');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleClientGroup = (clientId: string) => {
    setExpandedClients((prev) => ({
      ...prev,
      [clientId]: !prev[clientId],
    }));
  };

  // Converted statuses list across project lifecycle and planning sign-off
  const convertedStatuses = ['approved', 'in_progress', 'capturing', 'mobilising', 'mobilizing', 'completed', 'active'];

  // 1. New Requests: Newly submitted requests with 0 planning versions
  const newRequests = requests.filter(
    (r) =>
      (!r.planning_versions_count || r.planning_versions_count === 0) &&
      (!r.project_status || r.project_status === 'draft' || r.project_status === 'submitted')
  );

  // 2. Under Review: Requests with planning versions in review or planning status (not cancelled or converted)
  const underReviewRequests = requests.filter((r) => {
    const pStatus = (r.project_status || '').toLowerCase();
    const planStatus = (r.latest_planning_status || '').toLowerCase();
    const isConverted =
      convertedStatuses.includes(pStatus) ||
      convertedStatuses.includes(planStatus) ||
      planStatus === 'approved';
    const isCancelled =
      pStatus === 'cancelled' ||
      planStatus === 'not_feasible' ||
      planStatus === 'no';
    if (isConverted || isCancelled) return false;
    return (
      (r.planning_versions_count && r.planning_versions_count > 0) ||
      pStatus === 'planning'
    );
  });

  // 3. Converted Requests: Requests converted to active Projects (approved, mobilising, capturing, in_progress, completed)
  // Only latest version of each converted request is counted and displayed
  const convertedMap = new Map<string, RequestVersion>();
  requests.forEach((r) => {
    const pStatus = (r.project_status || '').toLowerCase();
    const planStatus = (r.latest_planning_status || '').toLowerCase();
    const isConverted =
      convertedStatuses.includes(pStatus) ||
      convertedStatuses.includes(planStatus) ||
      planStatus === 'approved';
    if (isConverted && (r.project_id || r.id)) {
      const key = r.project_id || r.id;
      const existing = convertedMap.get(key);
      if (!existing || (r.version || 0) > (existing.version || 0)) {
        convertedMap.set(key, r);
      }
    }
  });
  const convertedRequests = Array.from(convertedMap.values());

  // 4. Cancelled / Hold: Requests marked cancelled / rejected
  const cancelledRequests = requests.filter(
    (r) => r.project_status === 'cancelled' || r.latest_planning_status === 'not_feasible' || r.latest_planning_status === 'no'
  );
  // 5. Total Requests: All requests in Requests section
  const totalRequests = requests;

  // 6. Total Planning History Count: Sum of all submitted planning form versions across projects
  // Strictly counted ONLY when a planning form has been entirely filled and submitted (not when drafted)
  const historyVersionsCount = requests.reduce((acc, req) => {
    const vers = projectVersionsMap[req.project_id] || [];
    return acc + vers.length;
  }, 0);

  const adminKpis = [
    { id: 'new', title: 'New Requests', count: newRequests.length },
    { id: 'under_review', title: 'Under Review', count: underReviewRequests.length },
    { id: 'converted', title: 'Converted Requests', count: convertedRequests.length },
    { id: 'cancelled', title: 'Cancelled / Hold', count: cancelledRequests.length },
    { id: 'total', title: 'Total Requests', count: totalRequests.length },
    { id: 'history', title: 'Request History', count: historyVersionsCount },
  ];

  // ── Filtered items based on Active KPI ──
  let currentKpiItems: any[] = [];
  if (selectedKpi === 'new') {
    currentKpiItems = newRequests;
  } else if (selectedKpi === 'under_review') {
    currentKpiItems = underReviewRequests;
  } else if (selectedKpi === 'converted') {
    currentKpiItems = convertedRequests;
  } else if (selectedKpi === 'cancelled') {
    currentKpiItems = cancelledRequests;
  } else if (selectedKpi === 'history') {
    // In history mode: only display planning form versions that have been submitted
    currentKpiItems = [];
    requests.forEach((req) => {
      const vers = projectVersionsMap[req.project_id] || [];
      vers.forEach((v) => {
        currentKpiItems.push({
          ...req,
          uniqueKey: `${req.id}-${v.id}`,
          display_version: v.version_code || `${req.project_title || 'Project'}_V${String(v.version_number).padStart(2, '0')}`,
          display_updated_by: v.sender || 'ops',
          display_updated_by_name: v.sender_name,
          display_date: v.created_at || req.created_at,
          display_status: v.status ? v.status.replace('_', ' ') : 'Under Review',
          is_history_snapshot: true,
          raw_version: v,
        });
      });
    });
  } else {
    currentKpiItems = totalRequests;
  }

  // Dynamic Client Directory from current items
  const clientGroupsMap: Record<string, any[]> = {};
  currentKpiItems.forEach((req) => {
    const key = isClient
      ? (user?.company_name || req.client_company || 'My Company')
      : (req.client_company || req.client_name || req.client_email || 'Unassigned Organization');
    if (!clientGroupsMap[key]) {
      clientGroupsMap[key] = [];
    }
    clientGroupsMap[key].push(req);
  });

  // For Client: ensure their own company group is always initialized even if 0 requests exist
  if (isClient && Object.keys(clientGroupsMap).length === 0) {
    const myComp = user?.company_name || 'My Company';
    clientGroupsMap[myComp] = [];
  }

  const clientDirectory = isClient
    ? [
        {
          id: 'all',
          name: user?.company_name || 'My Company',
          count: currentKpiItems.length,
        },
      ]
    : [
        { id: 'all', name: 'All Clients', count: currentKpiItems.length },
        ...Object.keys(clientGroupsMap).map((cName) => ({
          id: cName,
          name: cName,
          count: clientGroupsMap[cName].length,
        })),
      ];

  // Dynamic Project Directory from current items
  const projectGroupsMap: Record<string, any[]> = {};
  currentKpiItems.forEach((req) => {
    const key = req.project_title || 'Untitled Project';
    if (!projectGroupsMap[key]) {
      projectGroupsMap[key] = [];
    }
    projectGroupsMap[key].push(req);
  });

  const projectDirectory = [
    { id: 'all', name: 'All Projects', count: currentKpiItems.length },
    ...Object.keys(projectGroupsMap).map((pName) => ({
      id: pName,
      name: pName,
      count: projectGroupsMap[pName].length,
    })),
  ];

  // Dynamic Request Groups dataset
  const adminRequestsGroups = Object.keys(clientGroupsMap).map((cName) => ({
    clientId: cName,
    clientName: cName,
    count: clientGroupsMap[cName].length,
    requests: clientGroupsMap[cName],
  }));

  // Filtering for Directory in Left Panel based on activeTab
  const activeDirectory = activeTab === 'clients' ? clientDirectory : projectDirectory;
  const filteredDirectory = activeDirectory.filter((item) =>
    item.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  // Filtering request groups based on selected item or search
  const filteredAdminGroups = adminRequestsGroups
    .filter((grp) => {
      if (selectedClientId !== 'all') {
        if (activeTab === 'clients') {
          if (grp.clientId !== selectedClientId) return false;
        } else {
          const hasProject = grp.requests.some(
            (r) => (r.project_title || 'Untitled Project') === selectedClientId
          );
          if (!hasProject) return false;
        }
      }
      if (topSearch) {
        const matchClient = grp.clientName.toLowerCase().includes(topSearch.toLowerCase());
        const matchRequests = grp.requests.some(
          (r) =>
            r.id.toLowerCase().includes(topSearch.toLowerCase()) ||
            (r.project_title && r.project_title.toLowerCase().includes(topSearch.toLowerCase())) ||
            (r.survey_location && r.survey_location.toLowerCase().includes(topSearch.toLowerCase()))
        );
        return matchClient || matchRequests;
      }
      return true;
    })
    .map((grp) => {
      let reqs = [...grp.requests];
      if (selectedClientId !== 'all' && activeTab === 'projects') {
        reqs = reqs.filter((r) => (r.project_title || 'Untitled Project') === selectedClientId);
      }
      if (sortOption === 'received_newest') {
        reqs.sort((a, b) => {
          if (selectedKpi === 'history') {
            const aTime = new Date(a.display_date || a.created_at).getTime();
            const bTime = new Date(b.display_date || b.created_at).getTime();
            return bTime - aTime;
          }
          const aIsNew = (!a.planning_versions_count || a.planning_versions_count === 0) && (!a.project_status || a.project_status === 'draft' || a.project_status === 'submitted');
          const bIsNew = (!b.planning_versions_count || b.planning_versions_count === 0) && (!b.project_status || b.project_status === 'draft' || b.project_status === 'submitted');
          if (selectedKpi === 'total' && aIsNew !== bIsNew) {
            return aIsNew ? -1 : 1;
          }
          const aTime = new Date(a.planning_updated_at || a.created_at).getTime();
          const bTime = new Date(b.planning_updated_at || b.created_at).getTime();
          return bTime - aTime;
        });
      } else if (sortOption === 'received_oldest') {
        reqs.sort((a, b) => {
          const aTime = new Date(a.display_date || a.created_at).getTime();
          const bTime = new Date(b.display_date || b.created_at).getTime();
          return aTime - bTime;
        });
      }
      return {
        ...grp,
        count: reqs.length,
        requests: reqs,
      };
    })
    .filter((grp) => isClient || grp.requests.length > 0);

  const totalFilteredCount = filteredAdminGroups.reduce((acc, grp) => acc + grp.requests.length, 0);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── 1. Top Header Bar ── */}
      <PageHeader
        title={isClient ? 'Survey Requests' : 'Requests Overview'}
        subtitle={
          isClient
            ? "Track and review your organization's survey requests and operational planning in real time"
            : 'Review incoming client survey requests and formulate operational planning forms across projects'
        }
      >
        <div style={{ position: 'relative', width: '280px' }}>
          <input
            type="text"
            placeholder={isClient ? 'Search by project, location...' : 'Search by project, location, or client...'}
            value={topSearch}
            onChange={(e) => setTopSearch(e.target.value)}
            className="form-input"
            style={{ fontSize: '0.775rem', height: '36px', borderRadius: '6px', border: '1px solid #e4e4e7' }}
          />
        </div>

        <button
          onClick={() => fetchRequests()}
          title="Refresh requests"
          style={{
            height: '36px',
            padding: '0 0.85rem',
            border: '1px solid #e4e4e7',
            borderRadius: '6px',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '0.775rem',
            fontWeight: 700,
            color: '#09090b',
          }}
        >
          Refresh
        </button>

        {isClient && (
          <button
            onClick={() => router.push('/projects/new')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              height: '36px',
              padding: '0 1rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              backgroundColor: '#09090b',
              color: '#ffffff',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span>+ New Request</span>
          </button>
        )}
      </PageHeader>

      {/* Error Alert */}
      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            backgroundColor: '#f4f4f5',
            border: '1px solid #d4d4d8',
            borderRadius: '6px',
            color: '#09090b',
            fontSize: '0.825rem',
            fontWeight: 600,
          }}
        >
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── 2. 6 Functional KPI Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.85rem' }}>
        {adminKpis.map((kpi) => {
          const isSelected = selectedKpi === kpi.id;
          return (
            <div
              key={kpi.id}
              onClick={() => setSelectedKpi(kpi.id as any)}
              className="wf-card"
              style={{
                padding: '1rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: '0.35rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: isSelected ? '#18181b' : '#ffffff',
                color: isSelected ? '#ffffff' : '#09090b',
                borderColor: isSelected ? '#18181b' : 'var(--border-color)',
                boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isSelected ? '#ffffff' : '#09090b' }}>
                  {kpi.title}
                </span>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: isSelected ? '#ffffff' : '#09090b', lineHeight: 1.1 }}>
                {isLoading ? '—' : kpi.count}
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
            color: '#09090b',
          }}
        >
          <span>{dateRange}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => {
              setTopSearch('');
              setClientSearch('');
              setSelectedClientId('all');
            }}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', height: '34px', fontSize: '0.775rem' }}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* ── 4. Main Two-Column Workspace (Exact Same Layout for Client and Staff) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          gap: '1.25rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Directory Card (Shared across Staff and Clients) */}
        <div className="wf-card" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', gap: '0.5rem' }}>
            <button
              onClick={() => {
                setActiveTab('clients');
                setSelectedClientId('all');
              }}
              style={{
                flex: 1,
                padding: '0.25rem 0.4rem',
                fontSize: '0.8rem',
                fontWeight: activeTab === 'clients' ? 800 : 500,
                color: activeTab === 'clients' ? '#09090b' : 'var(--text-secondary)',
                border: 'none',
                borderBottom: activeTab === 'clients' ? '2px solid #09090b' : '2px solid transparent',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              {isClient ? 'Company' : 'Clients'} ({clientDirectory.length > 1 ? clientDirectory.length - 1 : clientDirectory.length === 1 ? clientDirectory[0].count : 0})
            </button>
            <button
              onClick={() => {
                setActiveTab('projects');
                setSelectedClientId('all');
              }}
              style={{
                flex: 1,
                padding: '0.25rem 0.4rem',
                fontSize: '0.8rem',
                fontWeight: activeTab === 'projects' ? 800 : 500,
                color: activeTab === 'projects' ? '#09090b' : 'var(--text-secondary)',
                border: 'none',
                borderBottom: activeTab === 'projects' ? '2px solid #09090b' : '2px solid transparent',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              Projects ({projectDirectory.length > 1 ? projectDirectory.length - 1 : projectDirectory.length === 1 && projectDirectory[0].id !== 'all' ? 1 : 0})
            </button>
          </div>

          {/* Search Directory Box */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder={activeTab === 'clients' ? 'Filter clients...' : 'Filter projects...'}
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.75rem', height: '32px' }}
            />
          </div>

          {/* Directory Item List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', maxHeight: '380px', overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Loading {activeTab}...
              </div>
            ) : filteredDirectory.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                No {activeTab} found
              </div>
            ) : (
              filteredDirectory.map((item) => {
                const isSelected = selectedClientId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedClientId(item.id)}
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
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '175px' }}>
                      {item.name}
                    </span>
                    <span
                      style={{
                        fontSize: '0.675rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.35rem',
                        borderRadius: '3px',
                        backgroundColor: isSelected ? '#09090b' : '#f4f4f5',
                        color: isSelected ? '#ffffff' : '#71717a',
                      }}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Grouped Requests Accordion Table */}
        <div className="wf-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Header Row: Title & View Mode & Sorting in Single Line */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '1rem' }}>
            <h2 className="wf-title" style={{ fontSize: '1rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {selectedKpi === 'history'
                ? 'Request History'
                : selectedKpi === 'new'
                ? 'New Requests'
                : selectedKpi === 'under_review'
                ? 'Under Review'
                : selectedKpi === 'converted'
                ? 'Converted Requests'
                : selectedKpi === 'cancelled'
                ? 'Cancelled / Hold'
                : 'Requests'}{' '}
              ({totalFilteredCount})
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'nowrap', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                <button
                  onClick={() => setViewMode('list')}
                  title="List View"
                  style={{
                    padding: '0 0.65rem',
                    height: '30px',
                    border: viewMode === 'list' ? '1px solid #09090b' : '1px solid var(--border-color)',
                    backgroundColor: viewMode === 'list' ? '#09090b' : '#ffffff',
                    color: viewMode === 'list' ? '#ffffff' : '#09090b',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                  style={{
                    padding: '0 0.65rem',
                    height: '30px',
                    border: viewMode === 'grid' ? '1px solid #09090b' : '1px solid var(--border-color)',
                    backgroundColor: viewMode === 'grid' ? '#09090b' : '#ffffff',
                    color: viewMode === 'grid' ? '#ffffff' : '#09090b',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  Grid
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
              </select>
            </div>
          </div>

          {/* Grouped Table Accordions or Clean Empty State */}
          {isLoading ? (
            <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ width: '24px', height: '24px', border: '2px solid #e4e4e7', borderTopColor: '#09090b', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }} />
              <p style={{ fontSize: '0.85rem', color: '#09090b', fontWeight: 600 }}>Fetching live survey requests from database...</p>
            </div>
          ) : filteredAdminGroups.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                textAlign: 'center',
                backgroundColor: '#fafafa',
                borderRadius: '8px',
                border: '1px dashed var(--border-color)',
                gap: '0.75rem',
              }}
            >
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', marginBottom: '0.25rem' }}>
                  No Survey Requests Found
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: 1.4 }}>
                  {topSearch || selectedClientId !== 'all'
                    ? 'No requests match your current search and filter selection.'
                    : isClient
                    ? "You have no active survey requests in this category. Click '+ New Project Request' to get started."
                    : 'There are currently no survey requests in the system. When client organizations submit survey requests, they will appear here grouped by organization.'}
                </p>
                {isClient && (
                  <button
                    onClick={() => router.push('/projects/new')}
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.45rem 1rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      backgroundColor: '#09090b',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    + Submit New Project Request
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {filteredAdminGroups.map((group) => {
                const isExpanded = expandedClients[group.clientId] ?? true;

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
                        <span style={{ fontSize: '0.7rem', color: '#09090b' }}>{isExpanded ? '▼' : '►'}</span>
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

                    {/* Accordion Content */}
                    {isExpanded && group.requests.length === 0 && (
                      <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {isClient ? (
                          <div>
                            <p style={{ fontWeight: 600, color: '#09090b', marginBottom: '0.35rem' }}>
                              No requests filed yet under {group.clientName}
                            </p>
                            <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', margin: 0 }}>
                              Click <strong>+ New Request</strong> above to create and submit your first survey project request.
                            </p>
                          </div>
                        ) : (
                          <span>No requests found for this company.</span>
                        )}
                      </div>
                    )}

                    {/* Accordion Table (Renders live items for this client) */}
                    {isExpanded && group.requests.length > 0 && (
                      <table className="wf-table" style={{ margin: 0 }}>
                        <thead>
                          <tr>
                            <th style={{ width: '16%' }}>Version</th>
                            <th style={{ width: '21%' }}>Project Title</th>
                            <th style={{ width: '13%' }}>Updated By</th>
                            <th style={{ width: '17%' }}>Location</th>
                            <th style={{ width: '11%' }}>Survey Type</th>
                            <th style={{ width: '13%' }}>{selectedKpi === 'new' ? 'Received On' : 'Last Updated'}</th>
                            <th style={{ width: '9%' }}>Status</th>
                            <th style={{ width: '4%', textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.requests.map((req: any) => {
                            const verLabel =
                              req.display_version ||
                              req.latest_planning_version ||
                              (req.project_title ? `${req.project_title}_V01` : 'V01');
                            const updatedBy =
                              req.display_updated_by ||
                              req.planning_updated_by ||
                              (!req.planning_versions_count || req.planning_versions_count === 0 ? 'client' : 'client');
                            const isClientSender = updatedBy === 'client';
                            const dateLabel = formatDate(
                              req.display_date ||
                              (selectedKpi === 'new' ? req.created_at : (req.planning_updated_at || req.created_at))
                            );
                            const isReqConverted =
                              convertedStatuses.includes((req.project_status || '').toLowerCase()) ||
                              convertedStatuses.includes((req.latest_planning_status || '').toLowerCase()) ||
                              req.latest_planning_status === 'approved';

                            const statusLabel =
                              req.display_status ||
                              (selectedKpi === 'new'
                                ? 'New Request'
                                : selectedKpi === 'cancelled'
                                ? 'Cancelled / Hold'
                                : selectedKpi === 'converted' || isReqConverted
                                ? (req.project_status ? req.project_status.replace('_', ' ') : 'Converted')
                                : 'Under Review');

                            return (
                              <tr
                                key={req.uniqueKey || req.id}
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  router.push(`/requests/${req.id || req.project_id}`);
                                }}
                              >
                                <td style={{ fontWeight: 700, color: '#09090b' }}>{verLabel}</td>
                                <td style={{ fontWeight: 600, color: '#09090b' }}>
                                  {req.project_title || 'Untitled Project'}
                                </td>
                                <td>
                                  <span
                                    style={{
                                      fontSize: '0.675rem',
                                      fontWeight: 700,
                                      padding: '0.125rem 0.45rem',
                                      borderRadius: '3px',
                                      border: '1px solid',
                                      borderColor: isClientSender ? '#d4d4d8' : '#27272a',
                                      backgroundColor: isClientSender ? '#f4f4f5' : '#18181b',
                                      color: isClientSender ? '#09090b' : '#ffffff',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {isClientSender ? '[Client]' : '[LATRICS Ops]'}
                                  </span>
                                </td>
                                <td style={{ color: 'var(--text-secondary)' }}>{req.survey_location || '—'}</td>
                                <td style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                  {req.survey_type || 'Topography'}
                                </td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.725rem' }}>
                                  {dateLabel}
                                </td>
                                <td>
                                  <span
                                    style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      padding: '0.15rem 0.45rem',
                                      borderRadius: '3px',
                                      border: '1px solid',
                                      borderColor: isReqConverted ? '#d4d4d8' : '#d4d4d8',
                                      backgroundColor: isReqConverted ? '#f4f4f5' : '#f4f4f5',
                                      color: isReqConverted ? '#09090b' : '#09090b',
                                      display: 'inline-block',
                                      textTransform: 'capitalize',
                                    }}
                                  >
                                    {statusLabel}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <button
                                    title="View Request & Planning Overview"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/requests/${req.id || req.project_id}`);
                                    }}
                                    style={{
                                      background: '#09090b',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      padding: '0.25rem 0.65rem',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                    }}
                                  >
                                    View
                                  </button>
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
          )}

          {/* Footer stats */}
          {!isLoading && totalFilteredCount > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '0.85rem',
                borderTop: '1px solid var(--border-color)',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
              }}
            >
              <span>Showing {totalFilteredCount} of {totalRequests.length} total requests</span>
            </div>
          )}
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
            fetchRequests();
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
