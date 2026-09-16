'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { isLatricsRole } from '@/lib/role';
import LatricsProjectsView from '@/modules/projects/components/LatricsProjectsView';
import WireframeBox from '@/components/WireframeBox';
import {
  Search,
  Plus,
  Calendar,
  Folder,
  PlayCircle,
  CheckCircle2,
  Clock,
  PieChart,
  Loader2,
  Inbox,
  AlertCircle,
  RotateCcw,
  FileText,
  FileEdit,
} from 'lucide-react';
import { projectApi } from '@/modules/projects/api';
import { requestApi } from '@/modules/requests/api';
import { Project } from '@/modules/projects/types';

export default function ProjectsPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} className="animate-spin" color="#09090b" />
      </div>
    );
  }

  // If user is Admin or Operations, render the Ops/Admin Projects management layout (Image 2)
  if (user && isLatricsRole(user.role)) {
    return <LatricsProjectsView />;
  }

  // Otherwise, render Client Projects view (Image 1 for clients only)
  return <ClientProjectsView />;
}

function ClientProjectsView() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [totalRequestsCount, setTotalRequestsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'on_hold'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recently_updated');

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

  // Dynamic KPI calculations
  const totalProjectsCount = projects.length;
  const activeProjectsCount = projects.filter(
    (p) => p.status === 'active' || p.status === 'planning' || p.status === 'approved' || p.status === 'submitted'
  ).length;
  const completedProjectsCount = projects.filter((p) => p.status === 'completed').length;
  const onHoldProjectsCount = projects.filter((p) => p.status === 'draft' || p.status === 'cancelled').length;

  const filteredProjects = projects.filter((p) => {
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'active' && (p.status === 'active' || p.status === 'planning' || p.status === 'approved' || p.status === 'submitted')) ||
      (activeTab === 'completed' && p.status === 'completed') ||
      (activeTab === 'on_hold' && (p.status === 'draft' || p.status === 'cancelled'));

    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.survey_location && p.survey_location.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTab && matchesSearch;
  });

  if (sortBy === 'name_asc') {
    filteredProjects.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortBy === 'recently_updated') {
    filteredProjects.sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at).getTime();
      const dateB = new Date(b.updated_at || b.created_at).getTime();
      return dateB - dateA;
    });
  }

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── 1. Top Subtitle & Toolbar Row ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          All your survey projects in one place. View live status, scope, deliverables and timelines.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '220px' }}>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingRight: '2rem', fontSize: '0.8rem', height: '36px' }}
            />
            <Search size={15} color="#71717a" style={{ position: 'absolute', right: '10px', top: '10px' }} />
          </div>

          <button
            onClick={() => fetchProjects()}
            title="Refresh projects"
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

          {/* New Project Button (Client Only) */}
          <Link
            href="/projects/new"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', height: '36px', fontSize: '0.8rem', textDecoration: 'none' }}
          >
            <Plus size={16} /> New Project
          </Link>
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

      {/* ── 2. Top 5 KPI Metrics Cards ── */}
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
              {isLoading ? '—' : onHoldProjectsCount}
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

      {/* ── 3. Projects Table Card ── */}
      <div className="wf-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Table Header: Tabs & Sort Dropdown */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            {[
              { id: 'all', label: 'All Projects' },
              { id: 'active', label: 'Active' },
              { id: 'completed', label: 'Completed' },
              { id: 'on_hold', label: 'Draft/Hold' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid #09090b' : '2px solid transparent',
                  padding: '0.4rem 0.2rem',
                  fontSize: '0.825rem',
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

          {/* Sort By Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-select"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', width: 'auto' }}
            >
              <option value="recently_updated">Recently Updated</option>
              <option value="name_asc">Project Title</option>
            </select>
          </div>
        </div>

        {/* Table Body */}
        {isLoading ? (
          <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ fontSize: '0.85rem' }}>Loading your projects from database...</p>
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
                No Projects Created Yet
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: 1.4, margin: '0 auto 1rem' }}>
                {searchQuery
                  ? 'No projects match your current search query.'
                  : 'You have not submitted any drone survey projects yet. Click below to submit your first project request.'}
              </p>
              {!searchQuery && (
                <Link
                  href="/projects/new"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', textDecoration: 'none' }}
                >
                  <Plus size={15} /> Create First Project
                </Link>
              )}
            </div>
          </div>
        ) : (
          <table className="wf-table">
            <thead>
              <tr>
                <th style={{ width: '32%' }}>Project Title</th>
                <th style={{ width: '15%' }}>Status</th>
                <th style={{ width: '18%' }}>Location</th>
                <th style={{ width: '15%' }}>Survey Type</th>
                <th style={{ width: '12%' }}>Created Date</th>
                <th style={{ width: '8%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => {
                const isDraft = project.status === 'draft';
                const destination = isDraft ? `/projects/new?draftId=${project.id}` : `/projects/${project.id}/overview`;

                return (
                  <tr
                    key={project.id}
                    style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafafa')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Column 1: Project with thumbnail */}
                    <td onClick={() => router.push(destination)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <WireframeBox
                          width={44}
                          height={44}
                          style={{ borderRadius: '4px', flexShrink: 0 }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#09090b', lineHeight: 1.3 }}>
                            {project.title}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                            ID: {project.id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Column 2: Status */}
                    <td onClick={() => router.push(destination)}>
                      <span
                        style={{
                          fontSize: '0.725rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          border: isDraft ? '1px dashed #71717a' : '1px solid #09090b',
                          backgroundColor: isDraft ? '#f4f4f5' : '#ffffff',
                          display: 'inline-block',
                          textTransform: 'capitalize',
                        }}
                      >
                        {project.status}
                      </span>
                    </td>

                    {/* Column 3: Location */}
                    <td onClick={() => router.push(destination)}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {project.survey_location || '—'}
                      </span>
                    </td>

                    {/* Column 4: Survey Type */}
                    <td onClick={() => router.push(destination)}>
                      <span style={{ fontSize: '0.8rem', color: '#09090b', textTransform: 'capitalize' }}>
                        {project.survey_type || 'Topography'}
                      </span>
                    </td>

                    {/* Column 5: Created Date */}
                    <td onClick={() => router.push(destination)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <Calendar size={12} />
                        <span>{formatDate(project.created_at)}</span>
                      </div>
                    </td>

                    {/* Column 6: Actions */}
                    <td style={{ textAlign: 'right' }}>
                      {isDraft ? (
                        <Link
                          href={destination}
                          className="btn btn-primary"
                          style={{
                            padding: '0.3rem 0.65rem',
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <FileEdit size={12} /> Resume Draft
                        </Link>
                      ) : (
                        <Link
                          href={destination}
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', borderRadius: '4px', textDecoration: 'none' }}
                        >
                          Overview
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Table Pagination Footer */}
        {!isLoading && filteredProjects.length > 0 && (
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
            <span>Showing {filteredProjects.length} of {projects.length} projects</span>
          </div>
        )}
      </div>
    </div>
  );
}
