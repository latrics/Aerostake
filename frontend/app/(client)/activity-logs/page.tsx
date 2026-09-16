'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import WireframeBox from '@/components/WireframeBox';
import {
  Search,
  Clock,
  Loader2,
  Inbox,
  RotateCcw,
  ChevronRight,
  Folder,
  MapPin,
  Cpu,
  FileText,
} from 'lucide-react';
import { projectApi } from '@/modules/projects/api';
import { timelineApi } from '@/modules/timeline/api';
import { Project } from '@/modules/projects/types';

export default function ActivityLogsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <Loader2 size={32} className="animate-spin" color="#09090b" />
        </div>
      }
    >
      <ActivityLogsContent />
    </Suspense>
  );
}

function ActivityLogsContent() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectLogCounts, setProjectLogCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const projList = await projectApi.listProjects();
      const validProjects = projList || [];
      setProjects(validProjects);

      // Fetch real timeline event count from backend strictly
      const counts: Record<string, number> = {};
      await Promise.all(
        validProjects.map(async (p) => {
          try {
            const evts = await timelineApi.getProjectTimeline(p.id, undefined, 100);
            counts[p.id] = evts?.length || 0;
          } catch {
            counts[p.id] = 0;
          }
        })
      );
      setProjectLogCounts(counts);
    } catch (err) {
      console.error('Error fetching projects for daily logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getCity = (p: Project) => p.city || (p.requirements_payload as any)?.city || '';
  const getState = (p: Project) => p.state || (p.requirements_payload as any)?.state || '';
  const getPayload = (p: Project) => p.payload || (p.requirements_payload as any)?.payload || '';

  const formatLocation = (p: Project) => {
    const parts: string[] = [];
    if (p.survey_location) parts.push(p.survey_location);
    const c = getCity(p);
    const s = getState(p);
    if (c) parts.push(c);
    if (s) parts.push(s);
    return parts.length > 0 ? parts.join(', ') : 'Location not specified';
  };

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.survey_location && p.survey_location.toLowerCase().includes(q)) ||
        (getCity(p) && getCity(p).toLowerCase().includes(q)) ||
        (getState(p) && getState(p).toLowerCase().includes(q))
    );
  }, [projects, searchQuery]);

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    let bg = '#f4f4f5';
    let text = '#18181b';
    let border = '#d4d4d8';

    if (s === 'active' || s === 'approved') {
      bg = '#f0fdf4';
      text = '#15803d';
      border = '#bbf7d0';
    } else if (s === 'submitted') {
      bg = '#eff6ff';
      text = '#1d4ed8';
      border = '#bfdbfe';
    } else if (s === 'completed') {
      bg = '#09090b';
      text = '#ffffff';
      border = '#09090b';
    }

    return (
      <span
        style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          padding: '0.15rem 0.5rem',
          borderRadius: '4px',
          backgroundColor: bg,
          color: text,
          border: `1px solid ${border}`,
          textTransform: 'capitalize',
        }}
      >
        {status}
      </span>
    );
  };

  const handleSelectProject = (projectId: string) => {
    // Redirect user to the logs (timeline) tab under the project preview page
    router.push(`/projects/${projectId}/overview?tab=timeline`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Daily Logs &amp; Audit Trail</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
            Select a project from the list below to view its live chronological timeline, flight sorties, and milestone logs under Project Preview.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={14} color="#71717a" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2rem', fontSize: '0.8rem', height: '34px' }}
            />
          </div>

          <button
            onClick={() => fetchProjects()}
            title="Refresh projects"
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
            <RotateCcw size={15} color="#09090b" className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Projects List ── */}
      {isLoading ? (
        <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
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
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            gap: '0.5rem',
          }}
        >
          <Inbox size={28} color="#71717a" />
          <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>No Projects Found</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '380px' }}>
            {searchQuery ? 'No survey projects match your search query.' : 'No survey projects available in your workspace.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {filteredProjects.map((p) => {
            const logCount = projectLogCounts[p.id] ?? 0;
            const payloadVal = getPayload(p);

            return (
              <div
                key={p.id}
                onClick={() => handleSelectProject(p.id)}
                className="wf-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  border: '1px solid var(--border-color)',
                  transition: 'all 0.15s ease',
                  backgroundColor: '#ffffff',
                  gap: '0.85rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#09090b';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <WireframeBox width={34} height={34} style={{ borderRadius: '4px', flexShrink: 0 }}>
                        <Folder size={16} color="#09090b" />
                      </WireframeBox>
                      <div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#09090b' }}>
                          {p.title}
                        </h4>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          ID: {p.id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(p.status)}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.65rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={13} color="#71717a" style={{ flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {formatLocation(p)}
                      </span>
                    </div>
                    {payloadVal && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <Cpu size={13} color="#71717a" style={{ flexShrink: 0 }} />
                        <span>Payload: {payloadVal}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid #f4f4f5',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700, color: '#09090b' }}>
                    <Clock size={14} color="#71717a" />
                    <span>{logCount} Activity Logs</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#09090b' }}>
                    <span>View Timeline</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
