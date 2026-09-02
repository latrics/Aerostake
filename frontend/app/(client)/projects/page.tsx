'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import WireframeBox from '@/components/WireframeBox';
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  Calendar,
  Folder,
  PlayCircle,
  CheckCircle2,
  Clock,
  PieChart,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { CreateProjectModal } from '@/modules/projects/components/CreateProjectModal';

export default function ClientProjectsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'on_hold'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recently_updated');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Projects data matching the wireframe
  const projectsData = [
    {
      id: 'PRJ-001',
      title: 'North Zone Survey',
      startDate: '12 Aug 2024',
      status: 'Active',
      progress: 68,
      totalSectors: 21,
      completedSectors: 14,
      inProgressSectors: 7,
      lastUpdated: 'Today, 10:32 AM',
    },
    {
      id: 'PRJ-002',
      title: 'East Corridor Mapping',
      startDate: '05 Aug 2024',
      status: 'Active',
      progress: 42,
      totalSectors: 18,
      completedSectors: 7,
      inProgressSectors: 11,
      lastUpdated: 'Today, 08:45 AM',
    },
    {
      id: 'PRJ-003',
      title: 'Industrial Site Survey',
      startDate: '20 Jul 2024',
      status: 'Active',
      progress: 85,
      totalSectors: 16,
      completedSectors: 14,
      inProgressSectors: 2,
      lastUpdated: 'Yesterday, 04:20 PM',
    },
    {
      id: 'PRJ-004',
      title: 'Coastal Area Mapping',
      startDate: '10 Jun 2024',
      status: 'Completed',
      progress: 100,
      totalSectors: 20,
      completedSectors: 20,
      inProgressSectors: 0,
      lastUpdated: '15 Aug 2024',
    },
    {
      id: 'PRJ-005',
      title: 'Urban Development Survey',
      startDate: '25 Jun 2024',
      status: 'Completed',
      progress: 100,
      totalSectors: 12,
      completedSectors: 12,
      inProgressSectors: 0,
      lastUpdated: '02 Aug 2024',
    },
  ];

  const filteredProjects = projectsData.filter((p) => {
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'active' && p.status === 'Active') ||
      (activeTab === 'completed' && p.status === 'Completed') ||
      (activeTab === 'on_hold' && p.status === 'On Hold');

    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

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
          All your projects in one place. View progress, sectors, resources and status.
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

          {/* Filters Button */}
          <button
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', height: '36px', fontSize: '0.8rem' }}
          >
            <Filter size={14} /> Filters
          </button>

          {/* New Project Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', height: '36px', fontSize: '0.8rem' }}
          >
            <Plus size={16} /> New Project
          </button>
        </div>
      </div>

      {/* ── 2. Top 5 KPI Metrics Cards ── */}
      <div className="grid-5">
        {/* Card 1: Total Projects */}
        <div className="wf-card" style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
          <WireframeBox width={36} height={36} style={{ flexShrink: 0, borderRadius: '4px' }}>
            <Folder size={18} color="#71717a" />
          </WireframeBox>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Total Projects
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2, margin: '0.15rem 0' }}>
              5
            </span>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
              All time
            </span>
          </div>
        </div>

        {/* Card 2: Active Projects */}
        <div className="wf-card" style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
          <WireframeBox width={36} height={36} style={{ flexShrink: 0, borderRadius: '4px' }}>
            <PlayCircle size={18} color="#71717a" />
          </WireframeBox>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Active Projects
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2, margin: '0.15rem 0' }}>
              3
            </span>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
              Ongoing
            </span>
          </div>
        </div>

        {/* Card 3: Completed Projects */}
        <div className="wf-card" style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
          <WireframeBox width={36} height={36} style={{ flexShrink: 0, borderRadius: '4px' }}>
            <CheckCircle2 size={18} color="#71717a" />
          </WireframeBox>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Completed Projects
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2, margin: '0.15rem 0' }}>
              2
            </span>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
              Completed
            </span>
          </div>
        </div>

        {/* Card 4: On Hold */}
        <div className="wf-card" style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
          <WireframeBox width={36} height={36} style={{ flexShrink: 0, borderRadius: '4px' }}>
            <Clock size={18} color="#71717a" />
          </WireframeBox>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              On Hold
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2, margin: '0.15rem 0' }}>
              0
            </span>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
              On hold
            </span>
          </div>
        </div>

        {/* Card 5: Total Sectors */}
        <div className="wf-card" style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
          <WireframeBox width={36} height={36} style={{ flexShrink: 0, borderRadius: '4px' }}>
            <PieChart size={18} color="#71717a" />
          </WireframeBox>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Total Sectors
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2, margin: '0.15rem 0' }}>
              87
            </span>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
              Across all projects
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
              { id: 'on_hold', label: 'On Hold' },
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
              <option value="name_asc">Project Name</option>
              <option value="progress_desc">Highest Progress</option>
            </select>
          </div>
        </div>

        {/* Table Body */}
        <table className="wf-table">
          <thead>
            <tr>
              <th style={{ width: '28%' }}>Project</th>
              <th style={{ width: '10%' }}>Status</th>
              <th style={{ width: '18%' }}>Overall Progress</th>
              <th style={{ width: '10%' }}>Total Sectors</th>
              <th style={{ width: '14%' }}>Sectors Completed</th>
              <th style={{ width: '12%' }}>Last Updated</th>
              <th style={{ width: '8%', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  No matching projects found.
                </td>
              </tr>
            ) : (
              filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafafa')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {/* Column 1: Project with thumbnail - Fully Clickable */}
                  <td onClick={() => router.push(`/projects/${project.id}/overview`)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <WireframeBox
                        width={48}
                        height={48}
                        style={{ borderRadius: '4px', flexShrink: 0 }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#09090b', lineHeight: 1.3 }}>
                          {project.title}
                        </span>
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          Project ID: {project.id}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          <Calendar size={11} />
                          <span>Start: {project.startDate}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Column 2: Status */}
                  <td onClick={() => router.push(`/projects/${project.id}/overview`)}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        border: '1px solid #09090b',
                        backgroundColor: '#ffffff',
                        display: 'inline-block',
                      }}
                    >
                      {project.status}
                    </span>
                  </td>

                  {/* Column 3: Overall Progress */}
                  <td onClick={() => router.push(`/projects/${project.id}/overview`)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxWidth: '140px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>{project.progress}%</span>
                      <div className="wf-progress-track" style={{ height: '5px', backgroundColor: '#e4e4e7' }}>
                        <div
                          className="wf-progress-fill"
                          style={{
                            width: `${project.progress}%`,
                            backgroundColor: '#09090b',
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Column 4: Total Sectors */}
                  <td onClick={() => router.push(`/projects/${project.id}/overview`)}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                      {project.totalSectors}
                    </span>
                  </td>

                  {/* Column 5: Sectors Completed */}
                  <td onClick={() => router.push(`/projects/${project.id}/overview`)}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.825rem' }}>
                        {project.completedSectors} / {project.totalSectors}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        {project.inProgressSectors > 0
                          ? `${project.inProgressSectors} in progress`
                          : 'Completed'}
                      </span>
                    </div>
                  </td>

                  {/* Column 6: Last Updated */}
                  <td onClick={() => router.push(`/projects/${project.id}/overview`)}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {project.lastUpdated}
                    </span>
                  </td>

                  {/* Column 7: Actions */}
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Link
                        href={`/projects/${project.id}/overview`}
                        className="btn btn-secondary"
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', borderRadius: '4px' }}
                      >
                        View Details
                      </Link>
                      <button
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0.25rem',
                          color: '#71717a',
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* ── 4. Table Pagination Footer ── */}
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
          <span>Showing 1 to {filteredProjects.length} of {projectsData.length} projects</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              style={{
                width: '28px',
                height: '28px',
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
              <ChevronLeft size={14} />
            </button>
            <button
              style={{
                width: '28px',
                height: '28px',
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
                width: '28px',
                height: '28px',
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
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={async () => {
          setIsCreateModalOpen(false);
        }}
      />
    </div>
  );
}
