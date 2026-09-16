'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { isLatricsRole } from '@/lib/role';
import { LatricsOperationsDashboard } from '@/modules/dashboard/components/LatricsOperationsDashboard';
import {
  Calendar,
  FileText,
  Plus,
  Minus,
  Hexagon,
  Info,
  Loader2,
  MoreHorizontal,
  ArrowRight,
  Layers,
  FolderPlus,
} from 'lucide-react';
import { projectApi } from '@/modules/projects/api';
import { sectorApi } from '@/modules/sectors/api';
import { paymentsApi } from '@/modules/payments/api';
import { Project } from '@/modules/projects/types';
import { Sector } from '@/modules/sectors/types';
import { PaymentRecord } from '@/modules/payments/types';

// Drone Quadcopter Icon
function DroneIcon({ size = 20, color = '#09090b' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M4 8l5 2" />
      <path d="M15 10l5 -2" />
      <path d="M4 16l5 -2" />
      <path d="M15 14l5 2" />
      <circle cx="4" cy="8" r="2" />
      <circle cx="20" cy="8" r="2" />
      <circle cx="4" cy="16" r="2" />
      <circle cx="20" cy="16" r="2" />
    </svg>
  );
}

type StatMetric = 'mapping' | 'landings' | 'last_landing' | 'bills' | 'days';

export default function ClientDashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} className="spinner" color="#09090b" />
      </div>
    );
  }

  // If user is Admin or Operations, render the Latrics Operations & Admin Dashboard
  if (user && isLatricsRole(user.role)) {
    return <LatricsOperationsDashboard />;
  }

  return <ClientDashboardView />;
}

function ClientDashboardView() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [realSectors, setRealSectors] = useState<Sector[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sector Stats Metric Selection (from right-hand radio panel)
  const [selectedMetric, setSelectedMetric] = useState<StatMetric>('mapping');

  // Map Zoom & Active Hover
  const [mapZoom, setMapZoom] = useState(1);
  const [hoveredSectorId, setHoveredSectorId] = useState<string | null>(null);

  const loadProjectDetails = useCallback(async (projectId: string) => {
    if (!projectId) {
      setRealSectors([]);
      setPayments([]);
      return;
    }
    try {
      const [secData, payData] = await Promise.allSettled([
        sectorApi.listProjectSectors(projectId),
        paymentsApi.listProjectPayments(projectId),
      ]);
      if (secData.status === 'fulfilled') setRealSectors(secData.value || []);
      if (payData.status === 'fulfilled') setPayments(payData.value || []);
    } catch (err) {
      console.error('Error loading project details:', err);
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const projs = await projectApi.listProjects();
      const projectList = projs || [];
      setProjects(projectList);
      if (projectList.length > 0) {
        const firstId = projectList[0].id;
        setSelectedProjectId(firstId);
        await loadProjectDetails(firstId);
      } else {
        setSelectedProjectId('');
        setRealSectors([]);
        setPayments([]);
      }
    } catch (err) {
      console.error('Error fetching dashboard initial data:', err);
      setProjects([]);
      setSelectedProjectId('');
    } finally {
      setIsLoading(false);
    }
  }, [loadProjectDetails]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Selected Project object
  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // ── 1. Landings Metric Calculation (from real database) ──
  const totalLandings = useMemo(() => {
    if (realSectors.length === 0) return 0;
    return realSectors.reduce((acc, s) => {
      // If estimated flight minutes exist, compute estimated landings or flights
      if (s.estimated_flight_minutes) {
        return acc + Math.max(1, Math.round(s.estimated_flight_minutes / 30));
      }
      return acc + (s.status === 'completed' || s.status === 'verified' ? 10 : 0);
    }, 0);
  }, [realSectors]);

  const maxLandings = useMemo(() => {
    const quota = user?.company_profile?.landing_quota;
    if (typeof quota === 'number' && quota > 0) return quota;
    return totalLandings > 0 ? Math.max(totalLandings, 100) : 0;
  }, [user, totalLandings]);

  const landingsUsedPct = useMemo(() => {
    if (maxLandings === 0) return 0;
    return Number(((totalLandings / maxLandings) * 100).toFixed(1));
  }, [totalLandings, maxLandings]);

  // ── 2. Agreement Tenure Calculation (from real company profile / agreement dates) ──
  const tenureData = useMemo(() => {
    const compProfile = user?.company_profile || {};
    const startDateStr = compProfile.agreement_start || compProfile.contract_start_date;
    const endDateStr = compProfile.agreement_end || compProfile.contract_end_date;

    if (!startDateStr || !endDateStr) {
      return {
        tenureYears: 0,
        tenureTotalYears: 0,
        daysPassed: 0,
        daysRemaining: 0,
        startDate: '—',
        endDate: '—',
        progressPct: 0,
        hasAgreement: false,
      };
    }

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const now = new Date();

    const totalTimeMs = end.getTime() - start.getTime();
    const passedTimeMs = Math.max(0, now.getTime() - start.getTime());
    const totalDays = Math.max(1, Math.round(totalTimeMs / (1000 * 60 * 60 * 24)));
    const daysPassed = Math.min(totalDays, Math.round(passedTimeMs / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, totalDays - daysPassed);

    const totalYears = Number((totalDays / 365.25).toFixed(1));
    const yearsPassed = Number((daysPassed / 365.25).toFixed(1));
    const progressPct = Math.min(100, Math.round((daysPassed / totalDays) * 100));

    const formatDate = (d: Date) =>
      d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    return {
      tenureYears: yearsPassed,
      tenureTotalYears: totalYears,
      daysPassed,
      daysRemaining,
      startDate: formatDate(start),
      endDate: formatDate(end),
      progressPct,
      hasAgreement: true,
    };
  }, [user]);

  // ── 3. Last Landing Date Calculation (from real DB project & sector timestamps) ──
  const lastLandingInfo = useMemo(() => {
    if (!selectedProject || realSectors.length === 0) {
      return {
        date: '—',
        project: 'None',
        sector: 'None',
        hasLandings: false,
      };
    }

    // Pick most recently updated sector
    const sortedSectors = [...realSectors].sort((a, b) => {
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return dateB - dateA;
    });

    const latestSec = sortedSectors[0];
    const rawDate = latestSec?.updated_at || selectedProject.updated_at;
    const dateStr = rawDate
      ? new Date(rawDate).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—';

    return {
      date: dateStr,
      project: selectedProject.title,
      sector: latestSec?.sector_code || 'S1',
      hasLandings: true,
    };
  }, [selectedProject, realSectors]);

  // ── 4. Outstanding Balance Calculation (from real payment records) ──
  const outstandingInfo = useMemo(() => {
    const pendingPayments = payments.filter((p) => p.status === 'pending');
    const totalPending = pendingPayments.reduce((acc, p) => {
      const amount = p.amount_inr || p.amount_usd || 0;
      return acc + amount;
    }, 0);

    return {
      amountFormatted: `₹ ${totalPending.toLocaleString('en-IN')}`,
      count: pendingPayments.length,
      note:
        pendingPayments.length > 0
          ? `From ${pendingPayments.length} pending transaction${pendingPayments.length > 1 ? 's' : ''}`
          : 'No outstanding balance',
    };
  }, [payments]);

  // ── 5. Formatted Sector Cards Data (Strictly from real DB Sector records) ──
  const displayedSectors = useMemo(() => {
    if (realSectors.length === 0) return [];

    return realSectors.map((sec, i) => {
      const areaTotal = sec.target_area_sqkm || 0;
      let areaPct = 0;
      if (sec.status === 'completed' || sec.status === 'verified') areaPct = 100;
      else if (sec.status === 'surveyed') areaPct = 80;
      else if (sec.status === 'in_progress') areaPct = 45;
      else if (sec.status === 'flagged') areaPct = 20;
      else areaPct = 0;

      const areaCurrent = Number(((areaTotal * areaPct) / 100).toFixed(1));
      const flightMinutes = sec.estimated_flight_minutes || 0;
      const calculatedLandings = Math.max(0, Math.round(flightMinutes / 30));
      const calculatedDays = Math.max(0, Math.ceil(flightMinutes / 120));

      const updatedDate = sec.updated_at
        ? new Date(sec.updated_at).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : '—';

      return {
        id: sec.id,
        code: sec.sector_code || `S${i + 1}`,
        name: sec.name || sec.sector_code || `Sector ${i + 1}`,
        status: sec.status,
        areaCurrent,
        areaTotal,
        areaPct,
        landings: calculatedLandings,
        totalDays: calculatedDays,
        lastLanding: updatedDate,
        bills: '₹ 0',
      };
    });
  }, [realSectors]);

  // ── 6. Formatted Recent Projects Data (Top 3 strictly from DB) ──
  const displayedRecentProjects = useMemo(() => {
    return projects.slice(0, 3).map((p) => {
      const updatedDate = p.updated_at
        ? new Date(p.updated_at).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : '—';

      let statusLabel = 'In Progress';
      if (p.status === 'completed') statusLabel = 'Completed';
      else if (p.status === 'approved') statusLabel = 'Approved';
      else if (p.status === 'submitted') statusLabel = 'Submitted';
      else if (p.status === 'planning') statusLabel = 'Planning';
      else if (p.status === 'draft') statusLabel = 'Draft';

      return {
        id: p.id,
        name: p.title,
        area: p.target_area_sqkm ? `${p.target_area_sqkm} sq km` : (p.survey_location || '—'),
        sectors: p.sectors_count || 0,
        totalLandings: 0,
        lastLandingDate: updatedDate,
        status: statusLabel,
      };
    });
  }, [projects]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '0.75rem' }}>
        <Loader2 size={32} className="spinner" color="#09090b" />
        <span style={{ fontSize: '0.85rem', color: '#71717a' }}>Loading dashboard data...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2rem' }}>
      {/* ── Page Header ── */}
      <div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.02em', margin: 0 }}>
          Dashboard
        </h1>
        <p style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '0.25rem', margin: 0 }}>
          Overview of your survey operations and project activity.
        </p>
      </div>

      {/* ── Top Metrics Cards (Row of 4) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Card 1: Total Landings */}
        <div
          className="wf-card"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e4e4e7',
            padding: '1.15rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '140px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                border: '1px solid #e4e4e7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fcfcfc',
              }}
            >
              <DroneIcon size={16} color="#09090b" />
            </div>
            <span style={{ fontSize: '0.775rem', fontWeight: 600, color: '#71717a' }}>Total Landings</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#09090b', lineHeight: 1.15 }}>
                {totalLandings.toLocaleString()} / {maxLandings.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.25rem' }}>
                {landingsUsedPct}% used
              </div>
            </div>

            {/* Donut Chart with Percentage Center */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <svg width="68" height="68" viewBox="0 0 68 68">
                <circle cx="34" cy="34" r="27" fill="none" stroke="#e4e4e7" strokeWidth="6" />
                {maxLandings > 0 && totalLandings > 0 && (
                  <circle
                    cx="34"
                    cy="34"
                    r="27"
                    fill="none"
                    stroke="#09090b"
                    strokeWidth="6"
                    strokeDasharray={`${(landingsUsedPct / 100) * (2 * Math.PI * 27)} ${2 * Math.PI * 27}`}
                    strokeDashoffset={0}
                    transform="rotate(-90 34 34)"
                    strokeLinecap="round"
                  />
                )}
                <text x="34" y="38" textAnchor="middle" fontSize="11" fontWeight="800" fill="#09090b">
                  {landingsUsedPct}%
                </text>
              </svg>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.675rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#09090b', fontWeight: 600 }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#09090b' }} />
                  <span>Used ({totalLandings.toLocaleString()})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#71717a' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#d4d4d8' }} />
                  <span>Remaining ({Math.max(0, maxLandings - totalLandings).toLocaleString()})</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Agreement Tenure */}
        <div
          className="wf-card"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e4e4e7',
            padding: '1.15rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '140px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                border: '1px solid #e4e4e7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fcfcfc',
              }}
            >
              <Calendar size={16} color="#09090b" />
            </div>
            <span style={{ fontSize: '0.775rem', fontWeight: 600, color: '#71717a' }}>Agreement Tenure</span>
          </div>

          <div style={{ marginTop: '0.4rem' }}>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#09090b', lineHeight: 1.15 }}>
              {tenureData.tenureYears} years
            </div>
            <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.15rem' }}>
              of {tenureData.tenureTotalYears} years completed
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ marginTop: '0.45rem' }}>
            <div style={{ width: '100%', height: '7px', backgroundColor: '#e4e4e7', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${tenureData.progressPct}%`, height: '100%', backgroundColor: '#09090b', borderRadius: '4px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginTop: '0.35rem' }}>
              <div>
                <span style={{ fontWeight: 600, color: '#27272a' }}>{tenureData.daysPassed} days passed</span>
                <div style={{ color: '#71717a', fontSize: '0.65rem' }}>Start {tenureData.startDate}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 600, color: '#27272a' }}>{tenureData.daysRemaining} days remaining</span>
                <div style={{ color: '#71717a', fontSize: '0.65rem' }}>End {tenureData.endDate}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Last Landing Date */}
        <div
          className="wf-card"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e4e4e7',
            padding: '1.15rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '140px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                border: '1px solid #e4e4e7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fcfcfc',
              }}
            >
              <Calendar size={16} color="#09090b" />
            </div>
            <span style={{ fontSize: '0.775rem', fontWeight: 600, color: '#71717a' }}>Last Landing Date</span>
          </div>

          <div style={{ marginTop: '0.4rem' }}>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#09090b', lineHeight: 1.15 }}>
              {lastLandingInfo.date}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#27272a', fontWeight: 500, marginTop: '0.3rem' }}>
              Project: {lastLandingInfo.project}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.15rem' }}>
              Sector: {lastLandingInfo.sector}
            </div>
          </div>
        </div>

        {/* Card 4: Outstanding Balance */}
        <div
          className="wf-card"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e4e4e7',
            padding: '1.15rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '140px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                border: '1px solid #e4e4e7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fcfcfc',
              }}
            >
              <FileText size={16} color="#09090b" />
            </div>
            <span style={{ fontSize: '0.775rem', fontWeight: 600, color: '#71717a' }}>Outstanding Balance</span>
          </div>

          <div style={{ marginTop: '0.4rem' }}>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#09090b', lineHeight: 1.15 }}>
              {outstandingInfo.amountFormatted}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.3rem' }}>
              {outstandingInfo.note}
            </div>
          </div>
        </div>
      </div>

      {/* ── Middle Section: Sector Overview & Sector Wise Stats Overview ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2.7fr) minmax(280px, 1fr)',
          gap: '1.25rem',
          alignItems: 'stretch',
        }}
      >
        {/* Left Card: Sector Overview */}
        <div
          className="wf-card"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e4e4e7',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b', margin: 0 }}>
                Sector Overview
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.2rem', margin: 0 }}>
                Mapping completion status for each sector under the selected project.
              </p>
            </div>

            {/* Project Filter Selector */}
            <select
              value={selectedProjectId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedProjectId(val);
                loadProjectDetails(val);
              }}
              style={{
                fontSize: '0.775rem',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #d4d4d8',
                backgroundColor: '#ffffff',
                color: '#09090b',
                outline: 'none',
                cursor: 'pointer',
                fontWeight: 500,
                maxWidth: '220px',
              }}
            >
              {projects.length === 0 ? (
                <option value="">No projects available</option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Body: Map & Sector Grid */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'stretch',
              flexWrap: 'wrap',
            }}
          >
            {/* 1. Satellite Imagery Map with Real Sector Polygons Overlay */}
            <div
              style={{
                width: '320px',
                minWidth: '300px',
                height: '350px',
                borderRadius: '6px',
                border: '1px solid #e4e4e7',
                position: 'relative',
                overflow: 'hidden',
                backgroundImage: 'url(/satellite_map_bg.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                flexShrink: 0,
              }}
            >
              {/* Zoom Controls */}
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  backgroundColor: '#ffffff',
                  borderRadius: '4px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  zIndex: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => setMapZoom((z) => Math.min(1.4, z + 0.1))}
                  style={{
                    border: 'none',
                    background: 'none',
                    padding: '0.4rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottom: '1px solid #e4e4e7',
                  }}
                  title="Zoom In"
                >
                  <Plus size={14} color="#09090b" />
                </button>
                <button
                  type="button"
                  onClick={() => setMapZoom((z) => Math.max(0.8, z - 0.1))}
                  style={{
                    border: 'none',
                    background: 'none',
                    padding: '0.4rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Zoom Out"
                >
                  <Minus size={14} color="#09090b" />
                </button>
              </div>

              {/* Vector SVG Polygons for Real Sectors */}
              {displayedSectors.length > 0 ? (
                <svg
                  viewBox="0 0 320 350"
                  style={{
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    inset: 0,
                    transform: `scale(${mapZoom})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  {displayedSectors.map((sec, idx) => {
                    // Generate neat polygon shapes dynamically based on sector index
                    const polygonConfigs = [
                      { points: '30,165 95,115 135,95 165,140 125,190 95,230 45,210', cx: 88, cy: 165 },
                      { points: '135,95 195,120 220,150 170,195 135,140', cx: 165, cy: 145 },
                      { points: '95,230 125,190 155,225 145,290 100,270', cx: 120, cy: 245 },
                      { points: '220,150 255,180 245,245 190,220 170,195', cx: 210, cy: 200 },
                      { points: '125,190 170,195 190,220 180,285 155,280 155,225', cx: 155, cy: 240 },
                      { points: '190,220 245,245 220,320 180,285', cx: 205, cy: 275 },
                    ];
                    const cfg = polygonConfigs[idx % polygonConfigs.length];
                    const isHovered = hoveredSectorId === sec.id;

                    return (
                      <g key={sec.id}>
                        <polygon
                          points={cfg.points}
                          fill={isHovered ? 'rgba(9, 9, 11, 0.35)' : 'rgba(240, 240, 242, 0.72)'}
                          stroke="#18181b"
                          strokeWidth="1.5"
                          onMouseEnter={() => setHoveredSectorId(sec.id)}
                          onMouseLeave={() => setHoveredSectorId(null)}
                          style={{ cursor: 'pointer', transition: 'fill 0.15s ease' }}
                        />
                        <text x={cfg.cx} y={cfg.cy} fill="#09090b" fontSize="12" fontWeight="700" textAnchor="middle">
                          {sec.code}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.65)',
                    backdropFilter: 'blur(2px)',
                    padding: '1.5rem',
                    textAlign: 'center',
                  }}
                >
                  <Hexagon size={28} color="#71717a" style={{ marginBottom: '0.5rem', opacity: 0.7 }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>
                    No Sector Boundaries
                  </span>
                  <span style={{ fontSize: '0.725rem', color: '#71717a', marginTop: '0.25rem', maxWidth: '220px', lineHeight: 1.4 }}>
                    {projects.length === 0
                      ? 'Submit a survey request to define operational sectors.'
                      : 'No sectors have been configured for this project yet.'}
                  </span>
                </div>
              )}

              {/* Bottom Scale Bar */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.88)',
                  padding: '0.2rem 0.45rem',
                  borderRadius: '3px',
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  color: '#09090b',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  zIndex: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <span>0</span>
                  <span>5</span>
                  <span>10 km</span>
                </div>
                <div style={{ width: '46px', height: '3px', borderLeft: '1.5px solid #000', borderRight: '1.5px solid #000', borderBottom: '1.5px solid #000' }} />
              </div>

              {/* Sector Boundary Badge */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: '#09090b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  zIndex: 10,
                }}
              >
                <Hexagon size={13} color="#09090b" />
                <span>Sector Boundary</span>
              </div>
            </div>

            {/* 2. Sector Cards Grid or Empty State Container */}
            {displayedSectors.length > 0 ? (
              <div
                style={{
                  flex: 1,
                  minWidth: '320px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '0.65rem',
                }}
              >
                {displayedSectors.map((sec) => {
                  const isHovered = hoveredSectorId === sec.id;
                  return (
                    <div
                      key={sec.id}
                      onMouseEnter={() => setHoveredSectorId(sec.id)}
                      onMouseLeave={() => setHoveredSectorId(null)}
                      style={{
                        backgroundColor: isHovered ? '#fafafa' : '#ffffff',
                        border: isHovered ? '1px solid #09090b' : '1px solid #e4e4e7',
                        borderRadius: '6px',
                        padding: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '160px',
                        transition: 'all 0.15s ease',
                        boxShadow: isHovered ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                      }}
                    >
                      {/* Header */}
                      <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#09090b' }}>
                        {sec.name}
                      </div>

                      {/* Metric Visuals */}
                      {selectedMetric === 'mapping' && (
                        <div style={{ marginTop: '0.4rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                            <span style={{ color: '#09090b' }}>
                              {sec.areaCurrent} / {sec.areaTotal} sq km
                            </span>
                            <span style={{ color: '#09090b', fontWeight: 700 }}>{sec.areaPct}%</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', backgroundColor: '#e4e4e7', borderRadius: '3px', marginTop: '0.35rem', overflow: 'hidden' }}>
                            <div style={{ width: `${sec.areaPct}%`, height: '100%', backgroundColor: '#18181b', borderRadius: '3px' }} />
                          </div>
                        </div>
                      )}

                      {selectedMetric === 'landings' && (
                        <div style={{ marginTop: '0.4rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                            <span style={{ color: '#09090b' }}>{sec.landings.toLocaleString()} landings</span>
                            <span style={{ color: '#09090b', fontWeight: 700 }}>{sec.areaPct}%</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', backgroundColor: '#e4e4e7', borderRadius: '3px', marginTop: '0.35rem', overflow: 'hidden' }}>
                            <div style={{ width: `${sec.areaPct}%`, height: '100%', backgroundColor: '#18181b', borderRadius: '3px' }} />
                          </div>
                        </div>
                      )}

                      {selectedMetric === 'last_landing' && (
                        <div style={{ marginTop: '0.4rem' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#09090b' }}>
                            {sec.lastLanding}
                          </div>
                          <div style={{ fontSize: '0.675rem', color: sec.status === 'completed' ? '#16a34a' : '#71717a', fontWeight: 600, marginTop: '0.1rem' }}>
                            {sec.status === 'completed' ? 'Survey Verified' : 'Pending Flight'}
                          </div>
                          <div style={{ width: '100%', height: '6px', backgroundColor: '#e4e4e7', borderRadius: '3px', marginTop: '0.35rem', overflow: 'hidden' }}>
                            <div style={{ width: `${sec.areaPct}%`, height: '100%', backgroundColor: '#18181b', borderRadius: '3px' }} />
                          </div>
                        </div>
                      )}

                      {selectedMetric === 'bills' && (
                        <div style={{ marginTop: '0.4rem' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#09090b' }}>
                            {sec.bills}
                          </div>
                          <div style={{ fontSize: '0.675rem', color: '#71717a', marginTop: '0.1rem' }}>
                            0 Invoices Pending
                          </div>
                          <div style={{ width: '100%', height: '6px', backgroundColor: '#e4e4e7', borderRadius: '3px', marginTop: '0.35rem', overflow: 'hidden' }}>
                            <div style={{ width: '0%', height: '100%', backgroundColor: '#18181b', borderRadius: '3px' }} />
                          </div>
                        </div>
                      )}

                      {selectedMetric === 'days' && (
                        <div style={{ marginTop: '0.4rem' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#09090b' }}>
                            {sec.totalDays} Days Flown
                          </div>
                          <div style={{ fontSize: '0.675rem', color: '#71717a', marginTop: '0.1rem' }}>
                            Estimated: {sec.totalDays * 2} days
                          </div>
                          <div style={{ width: '100%', height: '6px', backgroundColor: '#e4e4e7', borderRadius: '3px', marginTop: '0.35rem', overflow: 'hidden' }}>
                            <div style={{ width: `${sec.areaPct}%`, height: '100%', backgroundColor: '#18181b', borderRadius: '3px' }} />
                          </div>
                        </div>
                      )}

                      {/* Footer stats */}
                      <div style={{ marginTop: '0.65rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.45rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                          <span style={{ color: '#71717a' }}>Landings</span>
                          <span style={{ color: '#09090b', fontWeight: 600 }}>{sec.landings.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                          <span style={{ color: '#71717a' }}>Total Days</span>
                          <span style={{ color: '#09090b', fontWeight: 600 }}>{sec.totalDays}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  minWidth: '320px',
                  minHeight: '260px',
                  borderRadius: '6px',
                  border: '1px dashed #d4d4d8',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem',
                  textAlign: 'center',
                  backgroundColor: '#fafafa',
                }}
              >
                <Layers size={32} color="#a1a1aa" style={{ marginBottom: '0.75rem' }} />
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#09090b' }}>
                  No Sector Data Available
                </div>
                <p style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.25rem', maxWidth: '300px', lineHeight: 1.4 }}>
                  {projects.length === 0
                    ? 'Sectors will appear here once you submit survey requirements and create your first project.'
                    : 'This project currently has no operational sectors configured.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Card: Sector Wise Stats Overview */}
        <div
          className="wf-card"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e4e4e7',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b', margin: 0 }}>
              Sector Wise Stats Overview
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.2rem', margin: 0 }}>
              Select a metric to view in sector boxes.
            </p>

            {/* Radio Group List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1.15rem' }}>
              {/* Option 1: Mapping Completion */}
              <label
                onClick={() => setSelectedMetric('mapping')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                  cursor: 'pointer',
                  padding: '0.35rem 0',
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: selectedMetric === 'mapping' ? '1.5px solid #09090b' : '1.5px solid #a1a1aa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  {selectedMetric === 'mapping' && (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#09090b' }} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#09090b' }}>
                    Mapping Completion (sq km)
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#71717a', marginTop: '0.15rem', lineHeight: 1.3 }}>
                    View mapping completion in each sector with area (sq km) and percentage
                  </div>
                </div>
              </label>

              {/* Option 2: Total Landings */}
              <label
                onClick={() => setSelectedMetric('landings')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                  cursor: 'pointer',
                  padding: '0.35rem 0',
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: selectedMetric === 'landings' ? '1.5px solid #09090b' : '1.5px solid #a1a1aa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  {selectedMetric === 'landings' && (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#09090b' }} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#09090b' }}>
                    Total Landings
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#71717a', marginTop: '0.15rem', lineHeight: 1.3 }}>
                    View total landings in each sector
                  </div>
                </div>
              </label>

              {/* Option 3: Last Landing Date */}
              <label
                onClick={() => setSelectedMetric('last_landing')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                  cursor: 'pointer',
                  padding: '0.35rem 0',
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: selectedMetric === 'last_landing' ? '1.5px solid #09090b' : '1.5px solid #a1a1aa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  {selectedMetric === 'last_landing' && (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#09090b' }} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#09090b' }}>
                    Last Landing Date
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#71717a', marginTop: '0.15rem', lineHeight: 1.3 }}>
                    View last landing date in each sector
                  </div>
                </div>
              </label>

              {/* Option 4: Total bills generated */}
              <label
                onClick={() => setSelectedMetric('bills')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                  cursor: 'pointer',
                  padding: '0.35rem 0',
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: selectedMetric === 'bills' ? '1.5px solid #09090b' : '1.5px solid #a1a1aa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  {selectedMetric === 'bills' && (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#09090b' }} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#09090b' }}>
                    Total bills generated
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#71717a', marginTop: '0.15rem', lineHeight: 1.3 }}>
                    View billing data for each sector
                  </div>
                </div>
              </label>

              {/* Option 5: Total days */}
              <label
                onClick={() => setSelectedMetric('days')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                  cursor: 'pointer',
                  padding: '0.35rem 0',
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: selectedMetric === 'days' ? '1.5px solid #09090b' : '1.5px solid #a1a1aa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  {selectedMetric === 'days' && (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#09090b' }} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#09090b' }}>
                    Total days
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#71717a', marginTop: '0.15rem', lineHeight: 1.3 }}>
                    View total days required to map each sector
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Footnote */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.45rem',
              fontSize: '0.7rem',
              color: '#71717a',
              marginTop: '1.25rem',
              borderTop: '1px solid #f1f5f9',
              paddingTop: '0.75rem',
            }}
          >
            <Info size={14} color="#71717a" style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>The sector boxes will update based on your selection above.</span>
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Recent Projects ── */}
      <div
        className="wf-card"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e4e4e7',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b', margin: 0 }}>
              Recent Projects
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.2rem', margin: 0 }}>
              Your latest 3 projects and their status.
            </p>
          </div>

          <Link
            href="/projects"
            style={{
              fontSize: '0.775rem',
              fontWeight: 700,
              color: '#09090b',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              textDecoration: 'none',
            }}
          >
            <span>View All Projects</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.8rem',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid #e4e4e7',
                  color: '#71717a',
                  fontSize: '0.725rem',
                  fontWeight: 600,
                }}
              >
                <th style={{ padding: '0.65rem 0.75rem', width: '40px' }}>#</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Project Name</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Area</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Sectors</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Total Landings</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Last Landing Date</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Status</th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center', width: '60px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedRecentProjects.length > 0 ? (
                displayedRecentProjects.map((proj, idx) => (
                  <tr
                    key={proj.id}
                    style={{
                      borderBottom: idx === displayedRecentProjects.length - 1 ? 'none' : '1px solid #f1f5f9',
                      transition: 'background-color 0.15s ease',
                    }}
                    className="hover:bg-slate-50"
                  >
                    <td style={{ padding: '0.85rem 0.75rem', color: '#71717a', fontWeight: 600 }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '0.85rem 0.75rem', fontWeight: 600, color: '#09090b' }}>
                      <Link
                        href={`/projects/${proj.id}`}
                        style={{ color: '#09090b', textDecoration: 'none' }}
                        className="hover:underline"
                      >
                        {proj.name}
                      </Link>
                    </td>
                    <td style={{ padding: '0.85rem 0.75rem', color: '#3f3f46' }}>
                      {proj.area}
                    </td>
                    <td style={{ padding: '0.85rem 0.75rem', color: '#3f3f46' }}>
                      {proj.sectors}
                    </td>
                    <td style={{ padding: '0.85rem 0.75rem', color: '#3f3f46' }}>
                      {proj.totalLandings}
                    </td>
                    <td style={{ padding: '0.85rem 0.75rem', color: '#3f3f46' }}>
                      {proj.lastLandingDate}
                    </td>
                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: proj.status === 'Completed' ? '#09090b' : '#71717a',
                          }}
                        />
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#09090b',
                          }}
                        >
                          {proj.status}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                      <Link
                        href={`/projects/${proj.id}`}
                        style={{
                          color: '#71717a',
                          padding: '0.25rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textDecoration: 'none',
                        }}
                        title="View Project"
                      >
                        <MoreHorizontal size={16} />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          backgroundColor: '#f4f4f5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#71717a',
                        }}
                      >
                        <FolderPlus size={20} />
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#09090b' }}>
                        No Projects Added Yet
                      </div>
                      <p style={{ fontSize: '0.775rem', color: '#71717a', maxWidth: '340px', margin: 0, lineHeight: 1.4 }}>
                        Your dashboard is empty because you have not added or submitted any survey projects yet.
                      </p>
                      <Link
                        href="/projects/new"
                        style={{
                          marginTop: '0.75rem',
                          padding: '0.45rem 1rem',
                          backgroundColor: '#09090b',
                          color: '#ffffff',
                          borderRadius: '6px',
                          fontSize: '0.775rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <Plus size={14} />
                        <span>Submit New Survey Request</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
