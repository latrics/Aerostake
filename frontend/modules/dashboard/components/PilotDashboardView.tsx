'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Layers,
  FileText,
  Calendar,
  ChevronRight,
  ArrowRight,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plane,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { projectApi } from '@/modules/projects/api';
import { Project } from '@/modules/projects/types';
import { PageHeader } from '@/components/PageHeader';

// Mini Sparkline SVG helper
function Sparkline({ points = '0,18 10,14 20,16 30,10 40,12 50,6 60,8' }: { points?: string }) {
  return (
    <svg width="64" height="24" viewBox="0 0 64 24" fill="none" style={{ flexShrink: 0 }}>
      <polyline
        points={points}
        fill="none"
        stroke="#71717a"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PilotDashboardView() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState('This month');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const pilotName = user?.full_name?.split(' ')[0] || 'Pilot';

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const list = await projectApi.listProjects().catch(() => []);
        setProjects(list || []);
      } catch (err) {
        console.error('Failed to load pilot projects from backend:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Format today's date (e.g. "Tuesday, 16 Sept 2026")
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Calculate real backend stats
  const projectsAssignedCount = projects.length;
  const inProgressProjects = useMemo(() => {
    return projects.filter((p) =>
      ['in_progress', 'capturing', 'mobilising', 'approved', 'submitted', 'planning'].includes((p.status || '').toLowerCase())
    );
  }, [projects]);

  const ongoingProjects = useMemo(() => {
    return projects.filter((p) => !['completed', 'cancelled'].includes((p.status || '').toLowerCase()));
  }, [projects]);

  const activeSectorsCount = useMemo(() => {
    return projects.reduce((acc, p) => acc + (p.total_sectors || 0), 0);
  }, [projects]);

  const totalLandings = useMemo(() => {
    return projects.reduce((acc, p) => acc + (p.total_sectors || 0), 0);
  }, [projects]);

  const completedLandings = useMemo(() => {
    return projects.reduce((acc, p) => acc + (p.completed_sectors || 0), 0);
  }, [projects]);

  const inProgressLandings = Math.max(0, totalLandings - completedLandings);

  // Compute donut percentages
  const donutCircumference = 314.15; // 2 * PI * 50
  const completedStroke = totalLandings > 0 ? (completedLandings / totalLandings) * donutCircumference : 0;
  const inProgressStroke = totalLandings > 0 ? (inProgressLandings / totalLandings) * donutCircumference : 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        maxWidth: '1280px',
        margin: '0 auto',
        paddingBottom: '3rem',
        color: '#09090b',
      }}
    >
      {/* ── Top Header Greeting ── */}
      <PageHeader
        title={`Good morning, ${pilotName}`}
        subtitle="Here's an overview of your missions and activities."
      >
        <div style={{ fontSize: '0.825rem', color: '#71717a', fontWeight: 500 }}>
          {formattedDate}
        </div>
      </PageHeader>

      {/* ── 4 Top Metrics Row ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Card 1: Total Landings */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '10px',
            padding: '1.15rem 1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#f4f4f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Plane size={20} color="#09090b" />
            </div>
            <div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, lineHeight: 1.1 }}>
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : totalLandings}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b', marginTop: '0.2rem' }}>
                Total Landings <br />
                <span style={{ fontWeight: 400, color: '#71717a' }}>This Month</span>
              </div>
              <div style={{ fontSize: '0.675rem', color: '#71717a', marginTop: '0.35rem' }}>
                {totalLandings > 0 ? `${completedLandings} logged landings` : 'No landings recorded'}
              </div>
            </div>
          </div>
          <Sparkline points="0,18 10,15 20,16 30,11 40,12 50,6 64,8" />
        </div>

        {/* Card 2: Active Sectors */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '10px',
            padding: '1.15rem 1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#f4f4f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Layers size={18} color="#09090b" />
            </div>
            <div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, lineHeight: 1.1 }}>
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : activeSectorsCount}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b', marginTop: '0.2rem' }}>
                Active Sectors
              </div>
              <div style={{ fontSize: '0.675rem', color: '#71717a', marginTop: '0.35rem' }}>
                Across {projects.length} {projects.length === 1 ? 'project' : 'projects'}
              </div>
            </div>
          </div>
          <Sparkline points="0,20 12,18 24,14 36,15 48,9 64,6" />
        </div>

        {/* Card 3: Projects Assigned */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '10px',
            padding: '1.15rem 1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#f4f4f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileText size={18} color="#09090b" />
            </div>
            <div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, lineHeight: 1.1 }}>
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : projectsAssignedCount}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b', marginTop: '0.2rem' }}>
                Projects Assigned
              </div>
              <div style={{ fontSize: '0.675rem', color: '#71717a', marginTop: '0.35rem' }}>
                {inProgressProjects.length} active / in progress
              </div>
            </div>
          </div>
          <Sparkline points="0,16 12,18 24,13 36,12 48,15 64,8" />
        </div>

        {/* Card 4: Missions This Week */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '10px',
            padding: '1.15rem 1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#f4f4f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Calendar size={18} color="#09090b" />
            </div>
            <div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, lineHeight: 1.1 }}>
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : inProgressProjects.length}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b', marginTop: '0.2rem' }}>
                Missions This Week
              </div>
              <div style={{ fontSize: '0.675rem', color: '#71717a', marginTop: '0.35rem' }}>
                Active field operations
              </div>
            </div>
          </div>
          <Sparkline points="0,22 12,19 24,15 36,10 48,12 64,5" />
        </div>
      </div>

      {/* ── Middle Section: Ongoing Projects (Table) + Today's Schedule (Timeline) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.85fr) minmax(0, 1fr)',
          gap: '1rem',
        }}
      >
        {/* Left: Ongoing Projects */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '10px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#09090b' }}>
                Ongoing Projects
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.15rem', margin: 0 }}>
                Projects currently in capturing stage or assigned to you.
              </p>
            </div>
            <Link
              href="/projects"
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#09090b',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              View All <ArrowRight size={13} />
            </Link>
          </div>

          {/* Ongoing Projects Table */}
          <div style={{ overflowX: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#71717a' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                <span style={{ fontSize: '0.8rem' }}>Loading assigned projects from backend...</span>
              </div>
            ) : ongoingProjects.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#71717a' }}>
                <FileText size={32} color="#a1a1aa" style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#09090b', margin: 0 }}>No active projects assigned yet</p>
                <p style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.25rem' }}>
                  When operations assigns survey missions to your pilot profile, they will appear here.
                </p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.775rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f4f4f5', color: '#71717a', textAlign: 'left' }}>
                    <th style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>Project Name</th>
                    <th style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>Client Company</th>
                    <th style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>Location</th>
                    <th style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>Current Stage</th>
                    <th style={{ padding: '0.6rem 0.5rem', fontWeight: 600, width: '110px' }}>Progress</th>
                    <th style={{ padding: '0.6rem 0.25rem', width: '20px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {ongoingProjects.map((proj) => {
                    const reqPayload = (proj.requirements_payload || {}) as Record<string, any>;
                    const clientComp = proj.client_company || reqPayload.company_name || 'Client Organization';
                    const loc = proj.survey_location || reqPayload.address || reqPayload.city || 'Survey Site';
                    const progress = proj.progress_pct || 0;

                    return (
                      <tr
                        key={proj.id}
                        style={{ borderBottom: '1px solid #f4f4f5', transition: 'background-color 0.15s ease' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafafa')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '0.85rem 0.5rem', fontWeight: 700, color: '#09090b' }}>
                          <Link href={`/projects/${proj.id}/overview`} style={{ color: '#09090b', textDecoration: 'none' }}>
                            {proj.title}
                          </Link>
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem', color: '#52525b' }}>{clientComp}</td>
                        <td style={{ padding: '0.85rem 0.5rem', color: '#52525b' }}>{loc}</td>
                        <td style={{ padding: '0.85rem 0.5rem' }}>
                          <span
                            style={{
                              fontSize: '0.675rem',
                              fontWeight: 600,
                              backgroundColor: '#09090b',
                              color: '#ffffff',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              textTransform: 'capitalize',
                            }}
                          >
                            {proj.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.725rem', fontWeight: 700, width: '28px' }}>
                              {progress}%
                            </span>
                            <div
                              style={{
                                flex: 1,
                                height: '6px',
                                backgroundColor: '#e4e4e7',
                                borderRadius: '3px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  width: `${progress}%`,
                                  backgroundColor: '#09090b',
                                  borderRadius: '3px',
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 0.25rem', textAlign: 'right' }}>
                          <Link href={`/projects/${proj.id}/overview`}>
                            <ChevronRight size={15} color="#71717a" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Today's Schedule */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '10px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.1rem',
            }}
          >
            <h2 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#09090b' }}>
              Today&apos;s Schedule
            </h2>
            <Link
              href="/schedule"
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#09090b',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              View Calendar <ArrowRight size={13} />
            </Link>
          </div>

          {/* Timeline */}
          {inProgressProjects.length === 0 ? (
            <div style={{ padding: '2rem 0.5rem', textAlign: 'center', color: '#71717a' }}>
              <Clock size={28} color="#a1a1aa" style={{ margin: '0 auto 0.5rem' }} />
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#09090b', margin: 0 }}>No flight missions scheduled for today</p>
              <p style={{ fontSize: '0.725rem', color: '#71717a', marginTop: '0.2rem' }}>
                Check with Operations for mobilization notices or new sector allocations.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                position: 'relative',
                paddingLeft: '0.25rem',
              }}
            >
              {[
                { time: '08:00', title: 'Site Mobilisation & Check', subtitle: inProgressProjects[0]?.title || 'Survey Site' },
                { time: '09:30', title: 'Flight Mission - Sector 1', subtitle: inProgressProjects[0]?.title || 'Capture' },
                { time: '14:00', title: 'Data Check & Backup', subtitle: inProgressProjects[0]?.title || 'Field Base' },
                { time: '16:00', title: 'End of Day Mission Log', subtitle: 'Submit status update' },
              ].map((slot, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.85rem',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#09090b',
                      marginTop: '5px',
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#71717a',
                      width: '42px',
                      flexShrink: 0,
                    }}
                  >
                    {slot.time}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    <span style={{ fontSize: '0.785rem', fontWeight: 700, color: '#09090b' }}>
                      {slot.title}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>{slot.subtitle}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom 3 Cards Row: Landings Overview + Project Progress + Recent Notifications ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Card 1: Landings Overview Donut */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '10px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <h2 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#09090b' }}>
              Landings Overview
            </h2>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              style={{
                fontSize: '0.725rem',
                padding: '2px 8px',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                backgroundColor: '#ffffff',
                color: '#52525b',
                cursor: 'pointer',
              }}
            >
              <option value="This month">This month</option>
              <option value="All time">All time</option>
            </select>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              gap: '1rem',
              flex: 1,
              padding: '0.5rem 0',
            }}
          >
            {/* Donut Ring Chart */}
            <div style={{ position: 'relative', width: '130px', height: '130px' }}>
              <svg width="130" height="130" viewBox="0 0 130 130">
                <circle cx="65" cy="65" r="50" fill="none" stroke="#e4e4e7" strokeWidth="18" />
                {totalLandings > 0 && (
                  <>
                    <circle
                      cx="65"
                      cy="65"
                      r="50"
                      fill="none"
                      stroke="#18181b"
                      strokeWidth="18"
                      strokeDasharray={`${completedStroke} 314.15`}
                      strokeDashoffset="0"
                      transform="rotate(-90 65 65)"
                    />
                    <circle
                      cx="65"
                      cy="65"
                      r="50"
                      fill="none"
                      stroke="#71717a"
                      strokeWidth="18"
                      strokeDasharray={`${inProgressStroke} 314.15`}
                      strokeDashoffset={`-${completedStroke}`}
                      transform="rotate(-90 65 65)"
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
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#09090b', lineHeight: 1 }}>
                  {totalLandings}
                </span>
                <span style={{ fontSize: '0.675rem', color: '#71717a', fontWeight: 500, marginTop: '2px' }}>
                  Landings
                </span>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#18181b' }} />
                <span style={{ color: '#52525b', width: '75px' }}>Completed</span>
                <span style={{ fontWeight: 700, color: '#09090b' }}>{completedLandings}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#71717a' }} />
                <span style={{ color: '#52525b', width: '75px' }}>In Progress</span>
                <span style={{ fontWeight: 700, color: '#09090b' }}>{inProgressLandings}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d4d4d8' }} />
                <span style={{ color: '#52525b', width: '75px' }}>Pending</span>
                <span style={{ fontWeight: 700, color: '#09090b' }}>
                  {Math.max(0, ongoingProjects.length - completedLandings)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Project Progress Bar Chart */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '10px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#09090b' }}>
              Project Progress
            </h2>
            <p style={{ fontSize: '0.725rem', color: '#71717a', margin: '0.15rem 0 0 0' }}>
              Across assigned survey projects
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              height: '140px',
              padding: '0 0.5rem 0.5rem 0.5rem',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                borderTop: '1px dashed #f4f4f5',
                fontSize: '0.65rem',
                color: '#a1a1aa',
              }}
            >
              100%
            </div>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '50%',
                borderTop: '1px dashed #f4f4f5',
                fontSize: '0.65rem',
                color: '#a1a1aa',
              }}
            >
              50%
            </div>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: '18px',
                borderTop: '1px solid #e4e4e7',
                fontSize: '0.65rem',
                color: '#a1a1aa',
              }}
            >
              0%
            </div>

            {/* Project progress bars */}
            {projects.slice(0, 5).map((p, idx) => {
              const pct = p.progress_pct || 0;
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.35rem',
                    zIndex: 2,
                    width: '32px',
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: `${Math.max(4, Math.round((pct / 100) * 110))}px`,
                      backgroundColor: '#71717a',
                      borderRadius: '3px 3px 0 0',
                      transition: 'height 0.3s ease',
                    }}
                    title={`${p.title}: ${pct}%`}
                  />
                  <span
                    style={{
                      fontSize: '0.65rem',
                      color: '#52525b',
                      fontWeight: 600,
                      maxWidth: '32px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    P{idx + 1}
                  </span>
                </div>
              );
            })}

            {projects.length === 0 && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a1a1aa', fontSize: '0.75rem' }}>
                No project progress data yet
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Recent Notifications */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '10px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <h2 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#09090b' }}>
              Recent Notifications
            </h2>
            <Link
              href="/activity-logs"
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#09090b',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              View All <ArrowRight size={13} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {projects.length > 0 ? (
              projects.slice(0, 3).map((p, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#71717a',
                      marginTop: '6px',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '0.785rem', fontWeight: 700, color: '#09090b' }}>
                        Project {p.status.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: '0.675rem', color: '#a1a1aa' }}>Active</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>{p.title}</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '2rem 0', textAlign: 'center', color: '#a1a1aa', fontSize: '0.75rem' }}>
                No recent notifications
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Help Desk Banner ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e4e4e7',
          borderRadius: '10px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#f4f4f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <HelpCircle size={20} color="#09090b" />
          </div>
          <div>
            <h3 style={{ fontSize: '0.925rem', fontWeight: 800, margin: 0, color: '#09090b' }}>
              Need Assistance?
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#71717a', margin: '0.15rem 0 0 0' }}>
              Raise a ticket or contact the operations team for any flight or equipment support.
            </p>
          </div>
        </div>

        <Link
          href="/help-desk"
          className="btn btn-primary"
          style={{
            height: '38px',
            padding: '0 1.25rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            backgroundColor: '#09090b',
            color: '#ffffff',
            borderRadius: '6px',
            textDecoration: 'none',
          }}
        >
          <span>Go to Help Desk</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
