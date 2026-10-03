'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Users,
  Folder,
  PlaneLanding,
  LayoutGrid,
  FileText,
  AlertTriangle,
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Star,
  MoreVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { isLatricsRole } from '@/lib/role';
import {
  ClientCompany,
  ClientFilterCategory,
  ClientKPIStats,
  ClientFilterCounts,
} from '@/modules/clients/types';
import { clientsApi } from '@/modules/clients/api';
import { EMPTY_CLIENT_KPIS, EMPTY_FILTER_COUNTS } from '@/modules/clients/data';
import { ClientLandingBar } from '@/modules/clients/components/ClientLandingBar';
import { ClientTenureBar } from '@/modules/clients/components/ClientTenureBar';
import { ClientExpandedRow } from '@/modules/clients/components/ClientExpandedRow';
import { ClientFiltersModal } from '@/modules/clients/components/ClientFiltersModal';

type SortField =
  | 'name'
  | 'projects'
  | 'landings'
  | 'tenure'
  | 'requests'
  | 'projects_completed'
  | 'sectors'
  | 'finished_sectors'
  | 'pending_payment'
  | 'issues'
  | 'rating'
  | 'last_activity';

type SortDirection = 'asc' | 'desc';

export default function ClientsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [companies, setCompanies] = useState<ClientCompany[]>([]);
  const [stats, setStats] = useState<ClientKPIStats>(EMPTY_CLIENT_KPIS);
  const [counts, setCounts] = useState<ClientFilterCounts>(EMPTY_FILTER_COUNTS);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ClientFilterCategory>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [onlyPendingPayments, setOnlyPendingPayments] = useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('last_activity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedSortOption, setSelectedSortOption] = useState('Recently Updated');

  // Expanded row IDs
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});

  // Action menu dropdown
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Role Protection: Only OPS and Admin are allowed!
  useEffect(() => {
    if (!authLoading && user) {
      const userRole = user.role?.toLowerCase();
      const isAllowed = userRole === 'admin' || userRole === 'operations' || isLatricsRole(userRole);
      if (!isAllowed) {
        router.replace('/dashboard');
      }
    }
  }, [user, authLoading, router]);

  // Load actual data from database
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const response = await clientsApi.getClientsAndStats();
        setCompanies(response.companies);
        setStats(response.stats);
        setCounts(response.counts);

        // Automatically expand the client company with projects if available
        if (response.companies.length > 0) {
          const companyWithProjects = response.companies.find((c) => c.projects_count > 0) || response.companies[0];
          setExpandedRowIds({ [companyWithProjects.id]: true });
        }
      } catch (err) {
        console.error('Failed to load database clients data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Close action menus on outside click
  useEffect(() => {
    const handleOutside = () => setActionMenuOpenId(null);
    document.addEventListener('click', handleOutside);
    return () => document.removeEventListener('click', handleOutside);
  }, []);

  const toggleRowExpansion = (companyId: string) => {
    setExpandedRowIds((prev) => ({
      ...prev,
      [companyId]: !prev[companyId],
    }));
  };

  const handleUpdateRemarks = async (companyId: string, newRemarks: string) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === companyId ? { ...c, remarks: newRemarks } : c))
    );
    try {
      await clientsApi.updateRemarks(companyId, newRemarks);
    } catch (err) {
      console.error('Failed to persist remarks update to database:', err);
    }
  };

  const handleUpdateRating = async (companyId: string, newRating: number) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === companyId ? { ...c, rating: newRating } : c))
    );
    try {
      await clientsApi.updateRating(companyId, newRating);
    } catch (err) {
      console.error('Failed to persist rating update to database:', err);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Company Name',
      'Active Since',
      'Projects Count',
      'Completed Projects',
      'Requests (Conv/Total)',
      'Tenure Left (Days)',
      'Landings Count',
      'Total Sectors',
      'Finished Sectors',
      'Pending Payment (INR)',
      'Issues',
      'Rating',
      'Last Activity',
      'Remarks',
      'Contact Person',
      'Contact Email',
    ];

    const rows = filteredAndSortedCompanies.map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.active_since}"`,
      c.projects_count,
      `"${c.projects_completed}"`,
      `"${c.requests_converted || `${c.converted_requests_count || 0}/${c.requests_count || 0}`}"`,
      c.tenure_days_left ?? 1095,
      c.landings_count,
      c.sectors_count,
      `"${c.finished_sectors}"`,
      c.pending_payment,
      c.issues_count ?? 0,
      c.rating,
      `"${c.last_activity}"`,
      `"${(c.remarks || '').replace(/"/g, '""')}"`,
      `"${c.contact_name || ''}"`,
      `"${c.contact_email || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `latrics_clients_database_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dynamic Filtering based on DB items (with strict deduplication)
  const filteredAndSortedCompanies = useMemo(() => {
    // 1. Safeguard deduplication by normalized company name
    const seenNames = new Set<string>();
    const uniqueList: ClientCompany[] = [];
    for (const c of companies) {
      const norm = c.name.trim().toLowerCase();
      if (!seenNames.has(norm)) {
        seenNames.add(norm);
        uniqueList.push(c);
      }
    }

    let result = uniqueList;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.contact_name && c.contact_name.toLowerCase().includes(q)) ||
          (c.contact_email && c.contact_email.toLowerCase().includes(q)) ||
          (c.remarks && c.remarks.toLowerCase().includes(q)) ||
          (c.projects && c.projects.some((p) => p.title.toLowerCase().includes(q)))
      );
    }

    // Category / Workflow Stage Filter
    if (activeCategory !== 'all') {
      result = result.filter((c) => {
        if (activeCategory === 'active') return c.category === 'active' || c.projects_count > 0;
        if (activeCategory === 'capturing')
          return c.category === 'capturing' || (c.projects && c.projects.some((p) => p.status === 'active'));
        if (activeCategory === 'planning')
          return c.category === 'planning' || (c.projects && c.projects.some((p) => p.status === 'planning'));
        if (activeCategory === 'pending_payment') return c.pending_payment > 0 || c.category === 'pending_payment';
        if (activeCategory === 'issues') return c.issues_count !== '0' || c.category === 'issues';
        return true;
      });
    }

    // Rating Filter
    if (minRating > 0) {
      result = result.filter((c) => c.rating >= minRating);
    }

    // Pending Payments only
    if (onlyPendingPayments) {
      result = result.filter((c) => c.pending_payment > 0);
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'projects':
          comparison = a.projects_count - b.projects_count;
          break;
        case 'landings':
          comparison = a.landings_count - b.landings_count;
          break;
        case 'tenure':
          comparison = (a.tenure_days_left ?? 1095) - (b.tenure_days_left ?? 1095);
          break;
        case 'requests':
          comparison = (a.converted_requests_count ?? 0) - (b.converted_requests_count ?? 0);
          break;
        case 'sectors':
          comparison = a.sectors_count - b.sectors_count;
          break;
        case 'pending_payment':
          comparison = a.pending_payment - b.pending_payment;
          break;
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'last_activity':
        default:
          comparison = a.id.localeCompare(b.id);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [companies, searchQuery, activeCategory, minRating, onlyPendingPayments, sortField, sortDirection]);

  // Paginated records
  const totalItems = filteredAndSortedCompanies.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedCompanies = filteredAndSortedCompanies.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleHeaderSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSelectSortDropdown = (option: string) => {
    setSelectedSortOption(option);
    if (option === 'Recently Updated') {
      setSortField('last_activity');
      setSortDirection('desc');
    } else if (option === 'Company Name (A-Z)') {
      setSortField('name');
      setSortDirection('asc');
    } else if (option === 'Most Projects') {
      setSortField('projects');
      setSortDirection('desc');
    } else if (option === 'Highest Landings') {
      setSortField('landings');
      setSortDirection('desc');
    } else if (option === 'Pending Payments') {
      setSortField('pending_payment');
      setSortDirection('desc');
    } else if (option === 'Highest Rating') {
      setSortField('rating');
      setSortDirection('desc');
    }
  };

  return (
    <div
      style={{
        padding: '1.75rem 2rem',
        maxWidth: '1600px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      {/* ── Top Header with Title, Search, Filters, Export ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#09090b',
              margin: '0 0 0.25rem 0',
              letterSpacing: '-0.025em',
            }}
          >
            Clients
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              color: '#71717a',
              margin: 0,
            }}
          >
            Manage all client companies and view their project, operational and financial overview.
          </p>
        </div>

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Search Input */}
          <div
            style={{
              position: 'relative',
              width: '320px',
            }}
          >
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#a1a1aa',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search company, project or contact..."
              style={{
                width: '100%',
                padding: '0.55rem 0.85rem 0.55rem 2.35rem',
                fontSize: '0.825rem',
                borderRadius: '6px',
                border: '1px solid #e4e4e7',
                backgroundColor: '#ffffff',
                color: '#09090b',
                outline: 'none',
              }}
            />
          </div>

          {/* Sort Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', position: 'relative' }}>
            <span style={{ fontSize: '0.8rem', color: '#71717a', fontWeight: 500 }}>Sort by:</span>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedSortOption}
                onChange={(e) => handleSelectSortDropdown(e.target.value)}
                style={{
                  appearance: 'none',
                  padding: '0.5rem 2rem 0.5rem 0.85rem',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  color: '#09090b',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e4e4e7',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="Recently Updated">Recently Updated</option>
                <option value="Company Name (A-Z)">Company Name (A-Z)</option>
                <option value="Most Projects">Most Projects</option>
                <option value="Highest Landings">Highest Landings</option>
                <option value="Pending Payments">Pending Payments</option>
                <option value="Highest Rating">Highest Rating</option>
              </select>
              <ChevronDown
                size={14}
                style={{
                  position: 'absolute',
                  right: '0.65rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#71717a',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1.1rem',
              borderRadius: '6px',
              border: '1px solid #09090b',
              backgroundColor: '#09090b',
              color: '#ffffff',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
          >
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* ── Main Clients Table (Actual Database Data) ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e4e4e7',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.825rem',
            }}
          >
            {/* Table Header */}
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid #e4e4e7',
                  backgroundColor: '#fafafa',
                  color: '#71717a',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {/* Chevron expand column */}
                <th style={{ width: '40px', padding: '0.75rem 0.5rem 0.75rem 1rem' }}></th>

                {/* Company Name */}
                <th
                  onClick={() => handleHeaderSort('name')}
                  style={{ padding: '0.75rem 1rem', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>Company Name</span>
                    {sortField === 'name' ? (
                      sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : null}
                  </div>
                </th>

                {/* Projects */}
                <th
                  onClick={() => handleHeaderSort('projects')}
                  style={{ padding: '0.75rem 0.75rem', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>Projects</span>
                    <ArrowUp size={12} />
                  </div>
                </th>

                {/* no of landings/1000 */}
                <th
                  onClick={() => handleHeaderSort('landings')}
                  style={{ padding: '0.75rem 0.75rem', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>no of landings/1000</span>
                    <ArrowUp size={12} />
                  </div>
                </th>

                {/* tenure left out of 3 years or 1095 days */}
                <th
                  onClick={() => handleHeaderSort('tenure')}
                  style={{ padding: '0.75rem 0.75rem', cursor: 'pointer', userSelect: 'none' }}
                  title="Tenure left out of 3 years (1095 days)"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>tenure left/1095d</span>
                    <ArrowDown size={12} />
                  </div>
                </th>

                {/* requests and requests converted to projects */}
                <th
                  onClick={() => handleHeaderSort('requests')}
                  style={{ padding: '0.75rem 0.75rem', cursor: 'pointer', userSelect: 'none' }}
                  title="Number of survey requests and requests converted to projects"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>requests & conv.</span>
                    <ArrowDown size={12} />
                  </div>
                </th>

                {/* projects completed */}
                <th
                  onClick={() => handleHeaderSort('projects')}
                  style={{ padding: '0.75rem 0.75rem', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>projects completed</span>
                    <ArrowDown size={12} />
                  </div>
                </th>

                {/* Sectors */}
                <th
                  onClick={() => handleHeaderSort('sectors')}
                  style={{ padding: '0.75rem 0.75rem', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>Sectors</span>
                    <ArrowDown size={12} />
                  </div>
                </th>

                {/* finished Sectors */}
                <th
                  onClick={() => handleHeaderSort('sectors')}
                  style={{ padding: '0.75rem 0.75rem', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>finished Sectors</span>
                    <ArrowDown size={12} />
                  </div>
                </th>

                {/* Pending Payment */}
                <th
                  onClick={() => handleHeaderSort('pending_payment')}
                  style={{ padding: '0.75rem 0.75rem', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>Pending Payment</span>
                    <ArrowDown size={12} />
                  </div>
                </th>

                {/* Issues */}
                <th
                  onClick={() => handleHeaderSort('issues')}
                  style={{ padding: '0.75rem 0.75rem', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>Issues</span>
                    <ArrowDown size={12} />
                  </div>
                </th>

                {/* Rating */}
                <th
                  onClick={() => handleHeaderSort('rating')}
                  style={{ padding: '0.75rem 0.75rem', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>Rating</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                {/* Last Activity */}
                <th
                  onClick={() => handleHeaderSort('last_activity')}
                  style={{ padding: '0.75rem 0.75rem', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>Last Activity</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                {/* Remarks */}
                <th style={{ padding: '0.75rem 0.75rem' }}>Remarks</th>

                {/* Actions */}
                <th style={{ padding: '0.75rem 1rem 0.75rem 0.5rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={15} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#71717a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Loading clients from database...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedCompanies.length > 0 ? (
                paginatedCompanies.map((company, index) => {
                  const isExpanded = Boolean(expandedRowIds[company.id]);

                  return (
                    <React.Fragment key={company.id}>
                      <tr
                        style={{
                          borderBottom: isExpanded ? 'none' : '1px solid #f4f4f5',
                          backgroundColor: isExpanded ? '#fafafa' : index % 2 === 0 ? '#ffffff' : '#fcfcfc',
                          transition: 'background-color 0.1s ease',
                        }}
                      >
                        {/* Chevron Expand Toggle */}
                        <td
                          style={{
                            padding: '0.85rem 0.5rem 0.85rem 1rem',
                            cursor: 'pointer',
                          }}
                          onClick={() => toggleRowExpansion(company.id)}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '20px',
                              height: '20px',
                              borderRadius: '4px',
                              color: '#71717a',
                            }}
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </div>
                        </td>

                        {/* Company Name & Avatar */}
                        <td
                          style={{
                            padding: '0.85rem 1rem',
                            cursor: 'pointer',
                          }}
                          onClick={() => toggleRowExpansion(company.id)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {/* Logo / Avatar Box */}
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '6px',
                                border: '1px solid #e4e4e7',
                                backgroundColor: '#f4f4f5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                color: '#71717a',
                              }}
                            >
                              <Building size={18} strokeWidth={1.5} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span
                                  style={{
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    color: '#09090b',
                                  }}
                                >
                                  {company.name}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.725rem', color: '#71717a' }}>
                                {company.active_since}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Projects */}
                        <td style={{ padding: '0.85rem 0.75rem', fontWeight: 600, color: '#09090b' }}>
                          {company.projects_count}
                        </td>

                        {/* no of landings/1000 */}
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <ClientLandingBar
                            current={company.landings_count}
                            max={company.landings_max || 1000}
                          />
                        </td>

                        {/* tenure left out of 3 years or 1095 days */}
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <ClientTenureBar
                            daysLeft={company.tenure_days_left ?? 1095}
                            totalDays={company.tenure_total_days ?? 1095}
                          />
                        </td>

                        {/* requests and requests converted to projects */}
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                backgroundColor: '#f4f4f5',
                                color: '#09090b',
                                border: '1px solid #e4e4e7',
                              }}
                              title={`${company.converted_requests_count ?? 0} converted to projects out of ${company.requests_count ?? 0} requests`}
                            >
                              {company.requests_converted || `${company.converted_requests_count ?? 0}/${company.requests_count ?? 0}`}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#71717a', whiteSpace: 'nowrap' }}>
                              ({company.converted_requests_count ?? 0} conv.)
                            </span>
                          </div>
                        </td>

                        {/* projects completed */}
                        <td style={{ padding: '0.85rem 0.75rem', color: '#09090b', fontWeight: 500 }}>
                          {company.projects_completed}
                        </td>

                        {/* Sectors */}
                        <td style={{ padding: '0.85rem 0.75rem', color: '#09090b', fontWeight: 500 }}>
                          {company.sectors_count}
                        </td>

                        {/* finished Sectors */}
                        <td style={{ padding: '0.85rem 0.75rem', color: '#09090b', fontWeight: 500 }}>
                          {company.finished_sectors}
                        </td>

                        {/* Pending Payment */}
                        <td style={{ padding: '0.85rem 0.75rem', fontWeight: 800, fontFamily: 'monospace', color: company.pending_payment > 0 ? '#dc2626' : '#16a34a' }}>
                          {company.pending_payment_formatted}
                        </td>

                        {/* Issues */}
                        <td style={{ padding: '0.85rem 0.75rem', color: '#09090b', fontWeight: 500 }}>
                          {company.issues_count ?? 0}
                        </td>

                        {/* Rating */}
                        <td
                          style={{ padding: '0.85rem 0.75rem', cursor: 'pointer' }}
                          onClick={() => toggleRowExpansion(company.id)}
                          title="Click to view and edit client rating"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ fontWeight: 600, color: '#09090b' }}>
                              {company.rating.toFixed(1)}
                            </span>
                            <Star size={13} fill="#09090b" color="#09090b" />
                          </div>
                        </td>

                        {/* Last Activity */}
                        <td style={{ padding: '0.85rem 0.75rem', color: '#52525b', whiteSpace: 'nowrap' }}>
                          {company.last_activity}
                        </td>

                        {/* Remarks */}
                        <td
                          style={{
                            padding: '0.85rem 0.75rem',
                            color: '#71717a',
                            maxWidth: '140px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={company.remarks}
                        >
                          {company.remarks || '—'}
                        </td>

                        {/* Actions ⋮ */}
                        <td
                          style={{
                            padding: '0.85rem 1rem 0.85rem 0.5rem',
                            textAlign: 'center',
                            position: 'relative',
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuOpenId(actionMenuOpenId === company.id ? null : company.id);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#71717a',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {/* Action Popover Menu */}
                          {actionMenuOpenId === company.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                right: '1rem',
                                top: '2.5rem',
                                backgroundColor: '#ffffff',
                                border: '1px solid #e4e4e7',
                                borderRadius: '6px',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                zIndex: 100,
                                width: '160px',
                                padding: '0.25rem 0',
                                textAlign: 'left',
                              }}
                            >
                              <button
                                onClick={() => {
                                  toggleRowExpansion(company.id);
                                  setActionMenuOpenId(null);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '0.45rem 0.85rem',
                                  fontSize: '0.775rem',
                                  color: '#09090b',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                              >
                                {isExpanded ? 'Collapse Details' : 'Expand Details'}
                              </button>
                              <button
                                onClick={() => {
                                  router.push('/projects');
                                  setActionMenuOpenId(null);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '0.45rem 0.85rem',
                                  fontSize: '0.775rem',
                                  color: '#09090b',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                              >
                                View Projects
                              </button>
                              <button
                                onClick={() => {
                                  router.push('/payments');
                                  setActionMenuOpenId(null);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '0.45rem 0.85rem',
                                  fontSize: '0.775rem',
                                  color: '#09090b',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                              >
                                View Invoices
                              </button>
                              {company.contact_email && (
                                <a
                                  href={`mailto:${company.contact_email}`}
                                  style={{
                                    display: 'block',
                                    width: '100%',
                                    padding: '0.45rem 0.85rem',
                                    fontSize: '0.775rem',
                                    color: '#09090b',
                                    textDecoration: 'none',
                                    boxSizing: 'border-box',
                                  }}
                                >
                                  Contact Representative
                                </a>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Row Accordion View */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={15} style={{ padding: 0 }}>
                            <ClientExpandedRow
                              company={company}
                              onUpdateRemarks={handleUpdateRemarks}
                              onUpdateRating={handleUpdateRating}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={15}
                    style={{
                      textAlign: 'center',
                      padding: '3rem 1rem',
                      color: '#71717a',
                    }}
                  >
                    No client companies found in database matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer & Pagination (Actual Database Counts) ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid #e4e4e7',
            backgroundColor: '#ffffff',
            fontSize: '0.8rem',
            color: '#71717a',
          }}
        >
          {/* Showing X - Y of Z companies */}
          <div>
            Showing {totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
            {Math.min(currentPage * pageSize, totalItems)} of {totalItems} companies
          </div>

          {/* Pagination Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                border: '1px solid #e4e4e7',
                backgroundColor: '#ffffff',
                color: currentPage === 1 ? '#d4d4d8' : '#09090b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '6px',
                  border: currentPage === page ? '1px solid #09090b' : '1px solid #e4e4e7',
                  backgroundColor: currentPage === page ? '#09090b' : '#ffffff',
                  color: currentPage === page ? '#ffffff' : '#09090b',
                  fontWeight: currentPage === page ? 600 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                border: '1px solid #e4e4e7',
                backgroundColor: '#ffffff',
                color: currentPage === totalPages ? '#d4d4d8' : '#09090b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Filters Modal ── */}
      <ClientFiltersModal
        isOpen={isFiltersModalOpen}
        onClose={() => setIsFiltersModalOpen(false)}
        activeCategory={activeCategory}
        onSelectCategory={(cat) => {
          setActiveCategory(cat);
          setCurrentPage(1);
        }}
        minRating={minRating}
        onSelectMinRating={(rate) => {
          setMinRating(rate);
          setCurrentPage(1);
        }}
        onlyPendingPayments={onlyPendingPayments}
        onTogglePendingPayments={(val) => {
          setOnlyPendingPayments(val);
          setCurrentPage(1);
        }}
        onReset={() => {
          setActiveCategory('all');
          setMinRating(0);
          setOnlyPendingPayments(false);
          setSearchQuery('');
          setCurrentPage(1);
          setIsFiltersModalOpen(false);
        }}
      />
    </div>
  );
}
