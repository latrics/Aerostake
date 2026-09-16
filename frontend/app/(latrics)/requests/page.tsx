'use client';

import React, { useState, useEffect } from 'react';
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
  Loader2,
  Inbox,
  AlertCircle,
} from 'lucide-react';
import { PlanPublishModal } from '@/modules/planning/components/PlanPublishModal';
import { MilestoneChargeModal } from '@/modules/payments/components/MilestoneChargeModal';
import { requestApi } from '@/modules/requests/api';
import { RequestVersion } from '@/modules/requests/types';

export default function RequestsOverviewPage() {
  const router = useRouter();

  // Data fetching & loading states
  const [requests, setRequests] = useState<RequestVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Common Search & Filter states
  const [topSearch, setTopSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'clients' | 'projects'>('clients');
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [sortOption, setSortOption] = useState('received_newest');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [dateRange, setDateRange] = useState('All Time');

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

  // Dynamic KPI Summary Metrics calculated from live backend data
  const newCount = requests.filter(
    (r) => !r.project_status || r.project_status === 'draft' || r.project_status === 'submitted'
  ).length;
  const underReviewCount = requests.filter((r) => r.project_status === 'planning').length;
  const infoCount = requests.filter((r) => r.project_status === 'cancelled').length;
  const approvedCount = requests.filter(
    (r) => r.project_status === 'approved' || r.project_status === 'active'
  ).length;
  const totalCount = requests.length;

  const adminKpis = [
    { title: 'New Requests', count: newCount, icon: FilePlus },
    { title: 'Under Review', count: underReviewCount, icon: Clock },
    { title: 'Approved / Active', count: approvedCount, icon: FileCheckIcon },
    { title: 'Cancelled / Hold', count: infoCount, icon: Info },
    { title: 'Total Requests', count: totalCount, icon: Folder },
  ];

  function FileCheckIcon(props: any) {
    return <FileEdit {...props} />;
  }

  // Dynamic Client Directory from live requests
  const clientGroupsMap: Record<string, RequestVersion[]> = {};
  requests.forEach((req) => {
    const key = req.client_company || req.client_name || req.client_email || 'Unassigned Organization';
    if (!clientGroupsMap[key]) {
      clientGroupsMap[key] = [];
    }
    clientGroupsMap[key].push(req);
  });

  const clientDirectory = [
    { id: 'all', name: 'All Clients', count: totalCount },
    ...Object.keys(clientGroupsMap).map((cName) => ({
      id: cName,
      name: cName,
      count: clientGroupsMap[cName].length,
    })),
  ];

  // Dynamic Request Groups dataset
  const adminRequestsGroups = Object.keys(clientGroupsMap).map((cName) => ({
    clientId: cName,
    clientName: cName,
    count: clientGroupsMap[cName].length,
    requests: clientGroupsMap[cName],
  }));

  // Filtering for Client Directory in Left Panel
  const filteredClients = clientDirectory.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  // Filtering request groups based on selected client or search
  const filteredAdminGroups = adminRequestsGroups
    .filter((grp) => {
      if (selectedClientId !== 'all' && grp.clientId !== selectedClientId) {
        return false;
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
      if (sortOption === 'received_newest') {
        reqs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else if (sortOption === 'received_oldest') {
        reqs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
      return {
        ...grp,
        requests: reqs,
      };
    });

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 900, letterSpacing: '0.02em', color: '#09090b', textTransform: 'uppercase' }}>
            Requests Overview
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Track and manage all client requests across projects in real time
          </p>
        </div>

        {/* Universal Search & Notification Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ position: 'relative', width: '340px' }}>
            <input
              type="text"
              placeholder="Search by project, location, or client..."
              value={topSearch}
              onChange={(e) => setTopSearch(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.775rem', height: '36px', paddingRight: '2rem' }}
            />
            <Search size={14} color="#71717a" style={{ position: 'absolute', right: '10px', top: '11px' }} />
          </div>

          <button
            onClick={() => fetchRequests()}
            title="Refresh requests"
            style={{
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
            <RotateCcw size={15} color="#09090b" className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
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
            cursor: 'pointer',
          }}
        >
          <Calendar size={14} color="#09090b" />
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
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', height: '34px', fontSize: '0.775rem' }}
          >
            <RotateCcw size={13} /> Reset Filters
          </button>
        </div>
      </div>

      {/* ── 4. Main 2-Column Split: Client Switcher & Grouped Requests Accordion ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.25rem', alignItems: 'start' }}>
        {/* Left Column: Clients Directory */}
        <div className="wf-card" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', gap: '1rem' }}>
            <span
              style={{
                fontSize: '0.825rem',
                fontWeight: 800,
                color: '#09090b',
                padding: '0.2rem 0.25rem',
                borderBottom: '2px solid #09090b',
              }}
            >
              Clients ({clientDirectory.length > 1 ? clientDirectory.length - 1 : 0})
            </span>
          </div>

          {/* Search Clients Box */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Filter clients..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.75rem', height: '32px', paddingRight: '1.8rem' }}
            />
            <Search size={13} color="#71717a" style={{ position: 'absolute', right: '8px', top: '9px' }} />
          </div>

          {/* Client List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', maxHeight: '380px', overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                <Loader2 size={16} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                Loading clients...
              </div>
            ) : filteredClients.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                No clients found
              </div>
            ) : (
              filteredClients.map((client) => {
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
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                      {client.name}
                    </span>
                    <span style={{ fontSize: '0.725rem', color: isSelected ? '#09090b' : 'var(--text-muted)' }}>
                      {client.count}
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
              Requests ({totalFilteredCount})
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
              </select>
            </div>
          </div>

          {/* Grouped Table Accordions or Clean Empty State */}
          {isLoading ? (
            <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
              <p style={{ fontSize: '0.85rem' }}>Fetching live survey requests from database...</p>
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
                  No Survey Requests Found
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: 1.4 }}>
                  {topSearch || selectedClientId !== 'all'
                    ? 'No requests match your current search and filter selection.'
                    : 'There are currently no survey requests in the system. When client organizations submit survey requests, they will appear here grouped by organization.'}
                </p>
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

                    {/* Accordion Table (Renders live items for this client) */}
                    {isExpanded && (
                      <table className="wf-table" style={{ margin: 0 }}>
                        <thead>
                          <tr>
                            <th style={{ width: '12%' }}>Version</th>
                            <th style={{ width: '24%' }}>Project Title</th>
                            <th style={{ width: '20%' }}>Location</th>
                            <th style={{ width: '14%' }}>Survey Type</th>
                            <th style={{ width: '16%' }}>Received On</th>
                            <th style={{ width: '10%' }}>Status</th>
                            <th style={{ width: '4%', textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.requests.map((req) => (
                            <tr
                              key={req.id}
                              style={{ cursor: 'pointer' }}
                              onClick={() => router.push(`/requests/${req.id}`)}
                            >
                              <td style={{ fontWeight: 700 }}>{req.version}</td>
                              <td style={{ fontWeight: 600, color: '#09090b' }}>
                                {req.project_title || 'Untitled Project'}
                              </td>
                              <td style={{ color: 'var(--text-secondary)' }}>{req.survey_location || '—'}</td>
                              <td style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                {req.survey_type || 'Topography'}
                              </td>
                              <td style={{ color: 'var(--text-secondary)', fontSize: '0.725rem' }}>
                                {formatDate(req.created_at)}
                              </td>
                              <td>
                                <span
                                  style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '3px',
                                    border: '1px solid #d4d4d8',
                                    backgroundColor: req.project_status === 'approved' ? '#ffffff' : '#f4f4f5',
                                    color: '#09090b',
                                    display: 'inline-block',
                                    textTransform: 'capitalize',
                                  }}
                                >
                                  {req.project_status || 'submitted'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  title="Inspect Request Overview"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/requests/${req.id}`);
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
              <span>Showing {totalFilteredCount} of {totalCount} total requests</span>
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
