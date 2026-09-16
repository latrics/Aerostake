'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { projectApi } from '@/modules/projects/api';
import { requestApi } from '@/modules/requests/api';
import { usersApi } from '@/modules/users/api';
import { Project } from '@/modules/projects/types';
import { RequestVersion } from '@/modules/requests/types';
import { UserProfile } from '@/modules/users/types';
import {
  Folder,
  FileText,
  Clock,
  Search,
  Bell,
  ChevronDown,
  Calendar,
  Download,
  ArrowRight,
  User,
  Users,
  CheckCircle,
  FileCheck,
  Plane,
  Radio,
  Loader2,
} from 'lucide-react';

export function LatricsOperationsDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [requests, setRequests] = useState<RequestVersion[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('This Month (01 May – 31 May 2025)');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);

  // Authenticated user identity
  const userRole = user?.role?.toLowerCase();
  const isAdmin = userRole === 'admin';
  const displayName = user?.full_name || (isAdmin ? 'Admin' : 'Ops User');
  const userTeam = isAdmin ? 'Platform Admin' : 'Operations Team';

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [projRes, reqRes, usersRes] = await Promise.allSettled([
        projectApi.listProjects(),
        requestApi.listAllRequests(),
        usersApi.listUsers(),
      ]);

      if (projRes.status === 'fulfilled') setProjects(projRes.value || []);
      if (reqRes.status === 'fulfilled') setRequests(reqRes.value || []);
      if (usersRes.status === 'fulfilled') setUsersList(usersRes.value || []);
    } catch (err) {
      console.error('Error loading Latrics dashboard metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Metrics Calculations (Sourced only from live database state) ──
  const totalProjects = projects.length;
  const activeProjects = projects.filter(
    (p) => p.status === 'active' || p.status === 'planning' || p.status === 'approved' || p.status === 'submitted'
  ).length;
  const completedProjects = projects.filter((p) => p.status === 'completed').length;

  const totalRequests = requests.length;
  const newRequests = requests.filter((r) => r.version === 1 || r.project_status === 'submitted').length;
  const closedRequests = requests.filter((r) => r.project_status === 'completed' || r.project_status === 'cancelled').length;

  // Sectors aggregation (Real DB data or 0)
  const totalSectors = projects.reduce((acc, p) => acc + (p.sectors_count || 0), 0);
  const completedSectors = projects.reduce((acc, p) => acc + (p.completed_sectors_count || 0), 0);
  const inProgressSectors = totalProjects > 0 ? Math.max(0, totalSectors - completedSectors) : 0;
  const pendingSectors = totalProjects > 0 ? totalSectors - completedSectors - inProgressSectors : 0;

  // Overall Progress
  const overallProgress =
    totalProjects > 0
      ? Math.round(
          projects.reduce((acc, p) => acc + (p.overall_progress_pct || (p.status === 'completed' ? 100 : 0)), 0) /
            totalProjects
        )
      : 0;

  // Payments received (0 if no real transaction data exists)
  const totalPaymentsReceived = 0;

  // Requests Breakdown (Real counts & percentages)
  const requestsNew = newRequests;
  const requestsUnderReview = requests.filter((r) => r.project_status === 'planning').length;
  const requestsInfoRequested = 0;
  const requestsRevision = 0;
  const requestsApproved = requests.filter((r) => r.project_status === 'approved').length;
  const requestsClosed = closedRequests;

  // Projects by Stage (Real counts & percentages)
  const projectsPlanning = projects.filter((p) => p.status === 'planning' || p.status === 'submitted').length;
  const projectsApproved = projects.filter((p) => p.status === 'approved').length;
  const projectsInProgress = projects.filter((p) => p.status === 'active').length;
  const projectsCompleted = completedProjects;

  // Project Health
  const projectsOnTrack = activeProjects;
  const projectsAtRisk = 0;
  const projectsDelayed = 0;
  const projectsCritical = 0;

  // User counts (Real counts from database)
  const clientsCount = usersList.filter(
    (u) => u.role === 'client' || u.role === 'client_primary' || u.role === 'client_sub'
  ).length;
  const teamMembersCount = usersList.filter(
    (u) => u.role === 'admin' || u.role === 'operations' || u.role === 'pilot'
  ).length;

  const formatINR = (val: number) => {
    if (val === 0) return '₹ 0';
    return `₹ ${val.toLocaleString('en-IN')}`;
  };

  const calcPct = (count: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  const handleDownloadReport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      `Metric,Value\n` +
      `Total Projects,${totalProjects}\n` +
      `Active Projects,${activeProjects}\n` +
      `Completed Projects,${completedProjects}\n` +
      `Total Requests,${totalRequests}\n` +
      `Total Sectors,${totalSectors}\n` +
      `Overall Progress,${overallProgress}%\n` +
      `Total Active Clients,${clientsCount}\n` +
      `Total Team Members,${teamMembersCount}\n`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Aerostake_Operations_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <Loader2 size={36} className="spinner" color="#09090b" />
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Loading Latrics Operations Dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '0.5rem 0 2rem 0', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── Top Header Navigation & User Profile ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#09090b', lineHeight: 1.2 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Overview of operations and key performance metrics
          </p>
        </div>

        {/* Top Right Controls: Search, Notifications, User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Universal Search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.45rem 0.85rem',
              gap: '0.5rem',
              width: '280px',
            }}
          >
            <Search size={15} color="#71717a" />
            <input
              type="text"
              placeholder="Search projects, clients, requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '0.8rem',
                width: '100%',
                color: '#09090b',
              }}
            />
          </div>

          {/* Notification Bell */}
          <button
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#09090b',
            }}
            title="Notifications"
          >
            <Bell size={16} />
          </button>

          {/* User Profile Pill (Dynamic) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
            }}
            title={`${displayName} (${userTeam})`}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#09090b',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
              }}
            >
              <User size={13} />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
              {displayName}
            </span>
            <ChevronDown size={13} color="#71717a" />
          </div>
        </div>
      </div>

      {/* ── Action & Filter Controls Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        {/* Date Filter Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.45rem 0.85rem',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#09090b',
              cursor: 'pointer',
            }}
          >
            <Calendar size={14} color="#71717a" />
            <span>{dateRange}</span>
            <ChevronDown size={14} color="#71717a" />
          </button>

          {isDateDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.35rem',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-md)',
                zIndex: 30,
                width: '220px',
                padding: '0.35rem',
              }}
            >
              {['Today', 'This Week', 'This Month (01 May – 31 May 2025)', 'Last 30 Days', 'This Quarter', 'All Time'].map(
                (range) => (
                  <button
                    key={range}
                    onClick={() => {
                      setDateRange(range);
                      setIsDateDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.45rem 0.65rem',
                      background: dateRange === range ? '#f4f4f5' : 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '0.775rem',
                      fontWeight: dateRange === range ? 700 : 500,
                      color: '#09090b',
                      cursor: 'pointer',
                    }}
                  >
                    {range}
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* Download Data Button */}
        <button
          onClick={handleDownloadReport}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.45rem 0.85rem',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: '#09090b',
            cursor: 'pointer',
          }}
        >
          <Download size={14} color="#71717a" />
          <span>Download Data</span>
        </button>
      </div>

      {/* ── Top Row: 5 Main KPI Cards ── */}
      <div className="grid-5">
        {/* 1. TOTAL PROJECTS */}
        <div className="wf-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
              TOTAL PROJECTS
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Folder size={14} color="#71717a" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#09090b', lineHeight: 1.1 }}>
            {totalProjects}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            <span>Active <strong>{activeProjects}</strong></span>
            <span>|</span>
            <span>Completed <strong>{completedProjects}</strong></span>
          </div>
        </div>

        {/* 2. TOTAL REQUESTS */}
        <div className="wf-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
              TOTAL REQUESTS
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={14} color="#71717a" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#09090b', lineHeight: 1.1 }}>
            {totalRequests}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            <span>New <strong>{newRequests}</strong></span>
            <span>|</span>
            <span>Closed <strong>{closedRequests}</strong></span>
          </div>
        </div>

        {/* 3. IN PROGRESS SECTORS */}
        <div className="wf-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
              IN PROGRESS SECTORS
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Radio size={14} color="#71717a" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#09090b', lineHeight: 1.1 }}>
            {inProgressSectors}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            <span>Mapped <strong>{completedSectors}</strong></span>
            <span>|</span>
            <span>Pending <strong>{pendingSectors}</strong></span>
          </div>
        </div>

        {/* 4. PAYMENTS RECEIVED */}
        <div className="wf-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
              PAYMENTS RECEIVED
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700 }}>
              ₹
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#09090b', lineHeight: 1.1 }}>
            {formatINR(totalPaymentsReceived)}
          </div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            This Month
          </div>
        </div>

        {/* 5. OVERALL PROGRESS */}
        <div className="wf-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
              OVERALL PROGRESS
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={14} color="#71717a" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#09090b', lineHeight: 1.1 }}>
            {overallProgress}%
          </div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Across all projects
          </div>
        </div>
      </div>

      {/* ── Middle Row: 3 Donut Breakdown Cards ── */}
      <div className="grid-3">
        {/* Card 1: REQUESTS SUMMARY */}
        <div className="wf-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.03em', color: '#09090b', marginBottom: '1rem' }}>
            REQUESTS SUMMARY
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1 }}>
            {/* SVG Donut Ring */}
            <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#f4f4f5" strokeWidth="4" />
                {totalRequests > 0 && (
                  <>
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="transparent"
                      stroke="#18181b"
                      strokeWidth="4"
                      strokeDasharray={`${calcPct(requestsNew, totalRequests)} 100`}
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="transparent"
                      stroke="#71717a"
                      strokeWidth="4"
                      strokeDasharray={`${calcPct(requestsUnderReview, totalRequests)} 100`}
                      strokeDashoffset={`-${calcPct(requestsNew, totalRequests)}`}
                    />
                  </>
                )}
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b', lineHeight: 1 }}>
                  {totalRequests}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Total</span>
              </div>
            </div>

            {/* Legend List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#09090b' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#18181b' }} />
                  New
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {requestsNew} ({calcPct(requestsNew, totalRequests)}%)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#09090b' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#3f3f46' }} />
                  Under Review
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {requestsUnderReview} ({calcPct(requestsUnderReview, totalRequests)}%)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#09090b' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#71717a' }} />
                  Information Requested
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {requestsInfoRequested} ({calcPct(requestsInfoRequested, totalRequests)}%)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#09090b' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#a1a1aa' }} />
                  Revision
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {requestsRevision} ({calcPct(requestsRevision, totalRequests)}%)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#09090b' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#d4d4d8' }} />
                  Approved
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {requestsApproved} ({calcPct(requestsApproved, totalRequests)}%)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#09090b' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#e4e4e7' }} />
                  Closed
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {requestsClosed} ({calcPct(requestsClosed, totalRequests)}%)
                </span>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1rem', paddingTop: '0.65rem', textAlign: 'right' }}>
            <Link
              href="/requests"
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#09090b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                textDecoration: 'none',
              }}
            >
              <span>View all requests</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Card 2: PROJECTS BY STAGE */}
        <div className="wf-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.03em', color: '#09090b', marginBottom: '1rem' }}>
            PROJECTS BY STAGE
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1 }}>
            {/* SVG Donut Ring */}
            <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#f4f4f5" strokeWidth="4" />
                {totalProjects > 0 && (
                  <>
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="transparent"
                      stroke="#18181b"
                      strokeWidth="4"
                      strokeDasharray={`${calcPct(projectsInProgress, totalProjects)} 100`}
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="transparent"
                      stroke="#71717a"
                      strokeWidth="4"
                      strokeDasharray={`${calcPct(projectsPlanning, totalProjects)} 100`}
                      strokeDashoffset={`-${calcPct(projectsInProgress, totalProjects)}`}
                    />
                  </>
                )}
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b', lineHeight: 1 }}>
                  {totalProjects}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Total</span>
              </div>
            </div>

            {/* Legend List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1, fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#09090b' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#a1a1aa' }} />
                  Planning
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {projectsPlanning} ({calcPct(projectsPlanning, totalProjects)}%)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#09090b' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#71717a' }} />
                  Approved
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {projectsApproved} ({calcPct(projectsApproved, totalProjects)}%)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#09090b' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#18181b' }} />
                  In Progress
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {projectsInProgress} ({calcPct(projectsInProgress, totalProjects)}%)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#09090b' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#d4d4d8' }} />
                  Completed
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {projectsCompleted} ({calcPct(projectsCompleted, totalProjects)}%)
                </span>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1rem', paddingTop: '0.65rem', textAlign: 'right' }}>
            <Link
              href="/projects"
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#09090b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                textDecoration: 'none',
              }}
            >
              <span>View all projects</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Card 3: SECTOR PROGRESS OVERVIEW */}
        <div className="wf-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.03em', color: '#09090b', marginBottom: '1rem' }}>
            SECTOR PROGRESS OVERVIEW
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1 }}>
            {/* SVG Donut Ring */}
            <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#f4f4f5" strokeWidth="4" />
                {totalSectors > 0 && (
                  <>
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="transparent"
                      stroke="#18181b"
                      strokeWidth="4"
                      strokeDasharray={`${calcPct(completedSectors, totalSectors)} 100`}
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="transparent"
                      stroke="#71717a"
                      strokeWidth="4"
                      strokeDasharray={`${calcPct(inProgressSectors, totalSectors)} 100`}
                      strokeDashoffset={`-${calcPct(completedSectors, totalSectors)}`}
                    />
                  </>
                )}
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b', lineHeight: 1 }}>
                  {totalSectors}
                </span>
                <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Total Sectors</span>
              </div>
            </div>

            {/* Legend List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#09090b' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#18181b' }} />
                  Completed
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {completedSectors} ({calcPct(completedSectors, totalSectors)}%)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#09090b' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#71717a' }} />
                  In Progress
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {inProgressSectors} ({calcPct(inProgressSectors, totalSectors)}%)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#09090b' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#d4d4d8' }} />
                  Pending
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {pendingSectors} ({calcPct(pendingSectors, totalSectors)}%)
                </span>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1rem', paddingTop: '0.65rem', textAlign: 'right' }}>
            <Link
              href="/sectors"
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#09090b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                textDecoration: 'none',
              }}
            >
              <span>View sector map</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Third Row: 3 Operational Analytics Cards ── */}
      <div className="grid-3">
        {/* Card 1: RESOURCE UTILIZATION */}
        <div className="wf-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.03em', color: '#09090b', marginBottom: '1rem' }}>
            RESOURCE UTILIZATION
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', flex: 1 }}>
            {/* Drones Box */}
            <div
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <Plane size={22} color="#09090b" style={{ marginBottom: '0.5rem' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>
                DRONES
              </span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#09090b', margin: '0.25rem 0' }}>
                0%
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>In Use</span>
              <div style={{ width: '100%', height: '5px', backgroundColor: '#e4e4e7', borderRadius: '4px', marginTop: '0.75rem', overflow: 'hidden' }}>
                <div style={{ width: '0%', height: '100%', backgroundColor: '#09090b', borderRadius: '4px' }} />
              </div>
            </div>

            {/* Pilots Box */}
            <div
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <User size={22} color="#09090b" style={{ marginBottom: '0.5rem' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>
                PILOTS
              </span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#09090b', margin: '0.25rem 0' }}>
                0%
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Active</span>
              <div style={{ width: '100%', height: '5px', backgroundColor: '#e4e4e7', borderRadius: '4px', marginTop: '0.75rem', overflow: 'hidden' }}>
                <div style={{ width: '0%', height: '100%', backgroundColor: '#09090b', borderRadius: '4px' }} />
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1rem', paddingTop: '0.65rem', textAlign: 'right' }}>
            <Link
              href="/allocations"
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#09090b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                textDecoration: 'none',
              }}
            >
              <span>View resources</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Card 2: PAYMENT OVERVIEW */}
        <div className="wf-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.03em', color: '#09090b', marginBottom: '1rem' }}>
            PAYMENT OVERVIEW
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', flex: 1 }}>
            {/* Box 1 */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.85rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)' }}>TOTAL WALLET BALANCE</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', marginTop: '0.35rem' }}>
                ₹ 0
              </div>
            </div>

            {/* Box 2 */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.85rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)' }}>TOTAL DUES</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', marginTop: '0.35rem' }}>
                ₹ 0
              </div>
            </div>

            {/* Box 3 */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.85rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)' }}>RECEIVED THIS MONTH</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', marginTop: '0.35rem' }}>
                ₹ 0
              </div>
            </div>

            {/* Box 4 */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.85rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)' }}>PROJECTS WITH PENDING PAYMENT</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', marginTop: '0.35rem' }}>
                0
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1rem', paddingTop: '0.65rem', textAlign: 'right' }}>
            <Link
              href="/payments"
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#09090b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                textDecoration: 'none',
              }}
            >
              <span>View financial details</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Card 3: PROJECT HEALTH */}
        <div className="wf-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.03em', color: '#09090b', marginBottom: '1rem' }}>
            PROJECT HEALTH
          </h3>

          {/* Stacked multi-segment bar */}
          <div style={{ width: '100%', height: '10px', backgroundColor: '#e4e4e7', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginBottom: '1.25rem' }}>
            {totalProjects > 0 && (
              <div style={{ width: `${calcPct(projectsOnTrack, totalProjects)}%`, height: '100%', backgroundColor: '#18181b' }} title={`On Track: ${calcPct(projectsOnTrack, totalProjects)}%`} />
            )}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#09090b' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#18181b' }} />
                On Track
              </span>
              <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                {projectsOnTrack} ({calcPct(projectsOnTrack, totalProjects)}%)
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#09090b' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#52525b' }} />
                At Risk
              </span>
              <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                {projectsAtRisk} ({calcPct(projectsAtRisk, totalProjects)}%)
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#09090b' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#a1a1aa' }} />
                Delayed
              </span>
              <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                {projectsDelayed} ({calcPct(projectsDelayed, totalProjects)}%)
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#09090b' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#d4d4d8' }} />
                Critical
              </span>
              <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                {projectsCritical} ({calcPct(projectsCritical, totalProjects)}%)
              </span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1rem', paddingTop: '0.65rem', textAlign: 'right' }}>
            <Link
              href="/projects"
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#09090b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                textDecoration: 'none',
              }}
            >
              <span>View all projects</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Activity Overview ── */}
      <div className="wf-card" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.03em', color: '#09090b', marginBottom: '1.25rem' }}>
          ACTIVITY OVERVIEW
        </h3>

        <div className="grid-5">
          {/* 1. Surveys Completed */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CheckCircle size={18} color="#09090b" />
            </div>
            <div>
              <div style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                SURVEYS COMPLETED
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#09090b', lineHeight: 1.1 }}>
                {completedProjects}
              </div>
              <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                This Month
              </div>
            </div>
          </div>

          {/* 2. Flight Hours */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Clock size={18} color="#09090b" />
            </div>
            <div>
              <div style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                FLIGHT HOURS
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#09090b', lineHeight: 1.1 }}>
                0 hrs
              </div>
              <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                This Month
              </div>
            </div>
          </div>

          {/* 3. Reports Generated */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileCheck size={18} color="#09090b" />
            </div>
            <div>
              <div style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                REPORTS GENERATED
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#09090b', lineHeight: 1.1 }}>
                0
              </div>
              <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                This Month
              </div>
            </div>
          </div>

          {/* 4. Clients */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Users size={18} color="#09090b" />
            </div>
            <div>
              <div style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                CLIENTS
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#09090b', lineHeight: 1.1 }}>
                {clientsCount}
              </div>
              <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                Total Active
              </div>
            </div>
          </div>

          {/* 5. Team Members */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Users size={18} color="#09090b" />
            </div>
            <div>
              <div style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                TEAM MEMBERS
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#09090b', lineHeight: 1.1 }}>
                {teamMembersCount}
              </div>
              <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                Total Active
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
