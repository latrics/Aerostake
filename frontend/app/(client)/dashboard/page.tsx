'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { isLatricsRole } from '@/lib/role';
import { LatricsOperationsDashboard } from '@/modules/dashboard/components/LatricsOperationsDashboard';
import { PilotDashboardView } from '@/modules/dashboard/components/PilotDashboardView';
import { PageHeader } from '@/components/PageHeader';
import { formatDateDDMMYYYY } from '@/lib/date';
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  Clock,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { projectApi } from '@/modules/projects/api';
import { sectorApi } from '@/modules/sectors/api';
import { paymentsApi } from '@/modules/payments/api';
import { Project } from '@/modules/projects/types';
import { Sector } from '@/modules/sectors/types';
import { PaymentRecord, ClientWalletSummary, Invoice } from '@/modules/payments/types';

const RealWorldProjectMap = dynamic(
  () => import('@/modules/sectors/components/RealWorldProjectMap').then((m) => m.RealWorldProjectMap),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: '100%',
          height: '380px',
          backgroundColor: '#09090b',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          color: '#38bdf8',
          fontSize: '0.85rem',
          fontWeight: 600,
        }}
      >
        <Loader2 size={24} className="spinner" />
        <span>Loading Satellite GIS Map Engine...</span>
      </div>
    ),
  }
);

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

export default function ClientDashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} className="spinner" color="#09090b" />
      </div>
    );
  }

  // If user is Pilot, render the dedicated Pilot Dashboard View
  if (user && (user.role === 'pilot' || user.role?.toString() === 'pilot')) {
    return <PilotDashboardView />;
  }

  // If user is Admin or Operations, render the Latrics Operations & Admin Dashboard
  if (user && isLatricsRole(user.role)) {
    return <LatricsOperationsDashboard />;
  }

  return <ClientDashboardView />;
}

type StatOverviewMetric = 'mapping' | 'landings' | 'last_landing' | 'bills' | 'days';

function ClientDashboardView() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [realSectors, setRealSectors] = useState<Sector[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [projectInvoices, setProjectInvoices] = useState<Invoice[]>([]);
  const [projectWallet, setProjectWallet] = useState<ClientWalletSummary | null>(null);
  const [wallet, setWallet] = useState<ClientWalletSummary | null>(null);
  const [isTxDropdownOpen, setIsTxDropdownOpen] = useState(false);
  const txDropdownRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Real GIS Map state & Active Sector Selection
  const [selectedSectorCode, setSelectedSectorCode] = useState<string>('');
  const [mapMode, setMapMode] = useState<'satellite' | 'map'>('satellite');
  const [hoveredSectorId, setHoveredSectorId] = useState<string | null>(null);

  // Sector Wise Stats Overview Parameter Selection
  const [selectedStatMetric, setSelectedStatMetric] = useState<StatOverviewMetric>('mapping');

  const isOpsOrAdmin = Boolean(
    user && (isLatricsRole(user.role) || user.role?.toString() === 'admin' || user.role?.toString() === 'operations')
  );
  const isClient = !isOpsOrAdmin;

  // Close transaction dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (txDropdownRef.current && !txDropdownRef.current.contains(event.target as Node)) {
        setIsTxDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadProjectDetails = useCallback(async (projectId: string) => {
    if (!projectId) {
      setRealSectors([]);
      setPayments([]);
      setProjectInvoices([]);
      setProjectWallet(null);
      setWallet(null);
      return;
    }
    try {
      const [secData, payData, walletData, invData, projWalletData] = await Promise.allSettled([
        sectorApi.listProjectSectors(projectId),
        paymentsApi.listProjectPayments(projectId),
        paymentsApi.getMyWallet(),
        paymentsApi.listProjectInvoices(projectId),
        paymentsApi.getProjectWallet(projectId),
      ]);
      if (secData.status === 'fulfilled') setRealSectors(secData.value || []);
      if (payData.status === 'fulfilled') setPayments(payData.value || []);
      if (invData.status === 'fulfilled') setProjectInvoices(invData.value || []);
      if (projWalletData.status === 'fulfilled' && projWalletData.value) {
        setProjectWallet(projWalletData.value);
      } else {
        setProjectWallet(null);
      }
      if (walletData.status === 'fulfilled' && walletData.value) {
        setWallet(walletData.value);
      } else {
        const myW = await paymentsApi.getMyWallet().catch(() => null);
        setWallet(myW);
      }
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
        setProjectInvoices([]);
        setProjectWallet(null);
        const myW = await paymentsApi.getMyWallet().catch(() => null);
        setWallet(myW);
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

  // ── Normalize real backend sectors matching Capturing Stage GIS pipeline ──
  const normalizedSectors: Sector[] = useMemo(() => {
    if (!realSectors || realSectors.length === 0) return [];

    return realSectors.map((sec) => {
      const polyCoords = (sec.polygon_coordinates as any) || {};
      const planningData = sec.planning || polyCoords.planning || {};
      const flightLogs = (sec.flight_logs || polyCoords.flight_logs || []) as any[];

      const totalArea = Number(sec.target_area_sqkm || planningData.target_area_sqkm || 0);
      const coveredArea = flightLogs.reduce(
        (acc: number, l: any) => acc + (Number(l.area_covered_today) || 0),
        0
      );

      const isCompleted = sec.status === 'completed' || sec.status === 'surveyed' || sec.status === 'verified';
      const progressPercent =
        sec.progress_percent !== undefined
          ? sec.progress_percent
          : isCompleted
          ? 100
          : totalArea > 0
          ? Math.min(100, Math.round((coveredArea / totalArea) * 100))
          : 0;

      const areaCompleted =
        sec.area_completed !== undefined
          ? sec.area_completed
          : isCompleted
          ? totalArea
          : coveredArea;

      return {
        ...sec,
        sector_code: sec.sector_code || 'SEC',
        name: planningData.sector_name || sec.name || sec.sector_code,
        target_area_sqkm: totalArea,
        status: sec.status || (progressPercent >= 100 ? 'completed' : progressPercent > 0 ? 'in_progress' : 'pending'),
        progress_percent: progressPercent,
        area_completed: areaCompleted,
        planning: {
          ...planningData,
          planned_sorties: planningData.planned_sorties ?? 1,
        },
        flight_logs: flightLogs,
      } as Sector;
    }).sort((a, b) => {
      return (a.sector_code || '').localeCompare(b.sector_code || '', undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });
  }, [realSectors]);

  // Keep selected sector in sync with available live sectors
  useEffect(() => {
    if (normalizedSectors.length > 0) {
      if (!selectedSectorCode || !normalizedSectors.some((s) => s.sector_code === selectedSectorCode)) {
        setSelectedSectorCode(normalizedSectors[0].sector_code || '');
      }
    } else {
      setSelectedSectorCode('');
    }
  }, [normalizedSectors, selectedSectorCode]);

  // ── 1. Landings Metric Calculation (cumulative across all client projects for Aerostake agreement) ──
  const totalLandings = useMemo(() => {
    if (projects && projects.length > 0) {
      return projects.reduce((acc, p) => acc + (p.completed_sectors_count ?? p.completed_sectors ?? 0), 0);
    }
    if (normalizedSectors.length === 0) return 0;
    return normalizedSectors.reduce((acc, s) => {
      if (s.status === 'completed' || s.status === 'surveyed' || s.status === 'verified') return acc + 1;
      return acc;
    }, 0);
  }, [projects, normalizedSectors]);

  const maxLandings = useMemo(() => {
    const quota = user?.company_profile?.landing_quota;
    if (typeof quota === 'number' && quota > 0) return quota;
    return 1000; // Standard Aerostake landings quota is 1000
  }, [user]);

  const landingsUsedPct = useMemo(() => {
    if (maxLandings === 0) return 0;
    return Number(((totalLandings / maxLandings) * 100).toFixed(1));
  }, [totalLandings, maxLandings]);

  // ── 2. Agreement Tenure Calculation (from real company profile / agreement dates) ──
  const tenureData = useMemo(() => {
    const compProfile = user?.company_profile || {};
    const startDateStr = compProfile.agreement_start_date || compProfile.agreement_start || compProfile.contract_start_date;
    const endDateStr = compProfile.agreement_end_date || compProfile.agreement_end || compProfile.contract_end_date;

    const totalYears = 3; // Standard Aerostake agreement tenure is 3 years
    const totalDays = 1095; // 3 years = 1095 days

    if (!startDateStr) {
      return {
        tenureYears: 0,
        tenureTotalYears: totalYears,
        daysPassed: 0,
        daysRemaining: totalDays,
        startDate: '—',
        endDate: '—',
        progressPct: 0,
        hasAgreement: false,
        isValidityOver: false,
      };
    }

    const start = new Date(startDateStr);
    let end: Date;
    if (endDateStr) {
      end = new Date(endDateStr);
    } else {
      end = new Date(start);
      end.setFullYear(start.getFullYear() + 3);
    }
    const now = new Date();

    const totalTimeMs = end.getTime() - start.getTime();
    const passedTimeMs = Math.max(0, now.getTime() - start.getTime());
    const totalDaysComputed = Math.max(1, Math.round(totalTimeMs / (1000 * 60 * 60 * 24)));
    const daysPassed = Math.round(passedTimeMs / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, totalDaysComputed - daysPassed);

    const yearsPassed = Number(Math.min(3, daysPassed / 365.25).toFixed(1));
    const progressPct = Math.min(100, Math.round((daysPassed / totalDaysComputed) * 100));

    const formatDate = (d: Date) => formatDateDDMMYYYY(d);

    const isTenureOver = daysRemaining <= 0;

    return {
      tenureYears: yearsPassed,
      tenureTotalYears: totalYears,
      daysPassed,
      daysRemaining,
      startDate: formatDate(start),
      endDate: formatDate(end),
      progressPct,
      hasAgreement: true,
      isValidityOver: isTenureOver,
    };
  }, [user]);

  // Validity Condition: Completed if landings reach 1,000 OR 3-year tenure expires
  const isLandingsOver = totalLandings >= maxLandings;
  const isTenureOver = tenureData.hasAgreement && tenureData.isValidityOver;
  const isAerostakeValidityOver = isLandingsOver || isTenureOver;

  // ── 3. Last Landing Date Calculation (from real flight logs across all project sectors) ──
  const lastLandingInfo = useMemo(() => {
    if (!selectedProject || normalizedSectors.length === 0) {
      return {
        date: '—',
        project: 'None',
        sector: 'None',
        hasLandings: false,
      };
    }

    // Collect all real flight logs recorded across project sectors
    const allLogs: Array<{ date: string; timestamp: string; sector_code: string }> = [];
    normalizedSectors.forEach((s) => {
      const logs = (s.flight_logs || (s.polygon_coordinates as any)?.flight_logs || []) as any[];
      logs.forEach((l) => {
        if (l.date || l.timestamp) {
          allLogs.push({
            date: l.date || '',
            timestamp: l.timestamp || l.date || '',
            sector_code: s.sector_code || 'S1',
          });
        }
      });
    });

    if (allLogs.length > 0) {
      allLogs.sort((a, b) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime());
      const latest = allLogs[0];
      const dateStr = formatDateDDMMYYYY(latest.timestamp || latest.date);
      return {
        date: dateStr,
        project: selectedProject.title,
        sector: latest.sector_code,
        hasLandings: true,
      };
    }

    // Fallback if completed sectors exist but no individual daily log object
    const completedSecs = normalizedSectors.filter(
      (s) => s.status === 'completed' || s.status === 'surveyed' || s.status === 'verified'
    );
    if (completedSecs.length > 0) {
      const latestSec = completedSecs[0];
      const rawDate = latestSec.updated_at || selectedProject.updated_at;
      const dateStr = formatDateDDMMYYYY(rawDate);
      return {
        date: dateStr,
        project: selectedProject.title,
        sector: latestSec.sector_code || 'S1',
        hasLandings: true,
      };
    }

    // Fallback: Check other projects in company if current project has no landings
    const projectWithLandings = (projects || []).find(
      (p) => (p.completed_sectors_count ?? p.completed_sectors ?? 0) > 0
    );
    if (projectWithLandings) {
      const rawDate = projectWithLandings.updated_at || projectWithLandings.created_at;
      const dateStr = formatDateDDMMYYYY(rawDate);
      return {
        date: dateStr,
        project: projectWithLandings.title,
        sector: 'Completed',
        hasLandings: true,
      };
    }

    return {
      date: '—',
      project: selectedProject.title,
      sector: 'None',
      hasLandings: false,
    };
  }, [selectedProject, normalizedSectors, projects]);

  // ── 4. Outstanding Balance Calculation (from real cumulative wallet across all projects) ──
  const outstandingInfo = useMemo(() => {
    const balance = wallet ? wallet.current_balance : 0;
    const isDue = balance > 0;
    const isCredit = balance < 0;
    const ledger = wallet?.ledger_entries || [];
    const recentTransactions = ledger.slice(-3).reverse();

    return {
      balance,
      amountFormatted: `₹ ${Math.abs(balance).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      isDue,
      isCredit,
      note: isDue
        ? 'Payment pending on running balance (all projects)'
        : isCredit
        ? `Surplus credit of ₹${Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (all projects)`
        : 'No outstanding balance (all projects settled)',
      recentTransactions,
    };
  }, [wallet]);

  // ── 5. Overall Aggregate Project Statistics (Replacing sector-wise box representation) ──

  // Metric 1: Mapping Completion (Total evaluated sq km, completed sq km, and completed sectors out of total)
  const overallMapping = useMemo(() => {
    const totalSectors = normalizedSectors.length;
    const sectorsAreaSum = normalizedSectors.reduce((sum, s) => sum + (Number(s.target_area_sqkm) || 0), 0);
    const evaluatedArea = Number(
      (selectedProject?.calculated_area_sqkm || selectedProject?.target_area_sqkm || sectorsAreaSum || 0).toFixed(2)
    );

    const completedSectorsCount = normalizedSectors.filter(
      (s) =>
        s.status === 'completed' ||
        s.status === 'surveyed' ||
        s.status === 'verified' ||
        (s.progress_percent !== undefined && s.progress_percent >= 100)
    ).length;

    const completedAreaRaw = normalizedSectors.reduce((sum, s) => {
      const isCompleted =
        s.status === 'completed' ||
        s.status === 'surveyed' ||
        s.status === 'verified' ||
        (s.progress_percent !== undefined && s.progress_percent >= 100);
      if (isCompleted) {
        return sum + (Number(s.target_area_sqkm) || 0);
      }
      return sum + (Number(s.area_completed) || 0);
    }, 0);
    const completedArea = Number(completedAreaRaw.toFixed(2));

    const percent =
      evaluatedArea > 0
        ? Math.min(100, Math.round((completedArea / evaluatedArea) * 100))
        : totalSectors > 0
        ? Math.min(100, Math.round((completedSectorsCount / totalSectors) * 100))
        : 0;

    return {
      evaluatedArea,
      completedArea,
      totalSectors,
      completedSectors: completedSectorsCount,
      percent,
    };
  }, [normalizedSectors, selectedProject]);

  // Metric 2: Total Landings (Completed landings out of planned landings; 1 sector = 1 landing / full 100% battery cycle)
  const overallLandings = useMemo(() => {
    const planned = normalizedSectors.length;
    const completedSectorsCount = normalizedSectors.filter(
      (s) =>
        s.status === 'completed' ||
        s.status === 'surveyed' ||
        s.status === 'verified' ||
        (s.progress_percent !== undefined && s.progress_percent >= 100)
    ).length;

    // Check logged landings from flight logs if recorded
    const loggedLandings = normalizedSectors.reduce((acc, s) => {
      const logs = (s.flight_logs || (s.polygon_coordinates as any)?.flight_logs || []) as any[];
      return acc + logs.reduce((lAcc: number, l: any) => lAcc + (Number(l.landings_today) || 0), 0);
    }, 0);

    const completed = Math.max(completedSectorsCount, loggedLandings);
    const percent = planned > 0 ? Math.min(100, Math.round((completed / planned) * 100)) : 0;

    return {
      completed,
      planned,
      percent,
    };
  }, [normalizedSectors]);

  // Metric 3: Last Landing Date (Date of last landing only, which sector, and its status)
  const overallLastLanding = useMemo(() => {
    if (normalizedSectors.length === 0) {
      return {
        date: '—',
        sectorCode: '—',
        sectorName: 'None',
        status: 'pending',
        statusLabel: 'Pending Flight',
        hasLandings: false,
      };
    }

    // 1. Scan flight logs across sectors
    const allLogs: Array<{ date: string; timestamp: string; sector: Sector }> = [];
    normalizedSectors.forEach((s) => {
      const logs = (s.flight_logs || (s.polygon_coordinates as any)?.flight_logs || []) as any[];
      logs.forEach((l) => {
        if (l.date || l.timestamp) {
          allLogs.push({
            date: l.date || '',
            timestamp: l.timestamp || l.date || '',
            sector: s,
          });
        }
      });
    });

    if (allLogs.length > 0) {
      allLogs.sort((a, b) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime());
      const latest = allLogs[0];
      const dateStr = formatDateDDMMYYYY(latest.timestamp || latest.date);
      const isDone =
        latest.sector.status === 'completed' ||
        latest.sector.status === 'surveyed' ||
        latest.sector.status === 'verified';
      return {
        date: dateStr,
        sectorCode: latest.sector.sector_code || 'S1',
        sectorName: latest.sector.name || latest.sector.sector_code || 'Sector',
        status: latest.sector.status || 'in_progress',
        statusLabel: isDone ? 'Done' : 'Active Flight',
        hasLandings: true,
      };
    }

    // 2. Fallback to completed/active sectors
    const activeSecs = normalizedSectors.filter(
      (s) =>
        s.status === 'completed' ||
        s.status === 'surveyed' ||
        s.status === 'verified' ||
        s.status === 'in_progress'
    );
    if (activeSecs.length > 0) {
      const sorted = [...activeSecs].sort((a, b) => {
        const tA = new Date(a.updated_at || a.created_at || 0).getTime();
        const tB = new Date(b.updated_at || b.created_at || 0).getTime();
        return tB - tA;
      });
      const top = sorted[0];
      const rawDate = top?.updated_at || top?.created_at || selectedProject?.updated_at;
      const dateStr = formatDateDDMMYYYY(rawDate);
      const isDone = top?.status === 'completed' || top?.status === 'surveyed' || top?.status === 'verified';
      return {
        date: dateStr,
        sectorCode: top?.sector_code || 'S1',
        sectorName: top?.name || top?.sector_code || 'Sector',
        status: top?.status,
        statusLabel: isDone ? 'Done' : 'In Progress',
        hasLandings: true,
      };
    }

    return {
      date: '—',
      sectorCode: '—',
      sectorName: 'None',
      status: 'pending',
      statusLabel: 'Pending Flight',
      hasLandings: false,
    };
  }, [normalizedSectors, selectedProject]);

  // Metric 4: Total Bills Generated (Total bill generated for this project till now, paid amount, and pending balance)
  const overallBills = useMemo(() => {
    const invTotal = projectInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
    const billed = projectWallet && projectWallet.total_billed > 0 ? projectWallet.total_billed : invTotal;

    const payVerified = payments
      .filter((p) => p.status === 'verified')
      .reduce((sum, p) => sum + (Number(p.amount_inr || p.amount_usd) || 0), 0);
    const paid = projectWallet && projectWallet.total_paid !== undefined ? projectWallet.total_paid : payVerified;

    const pending =
      projectWallet && projectWallet.current_balance !== undefined
        ? Math.max(0, projectWallet.current_balance)
        : Math.max(0, billed - paid);

    return {
      billed,
      paid,
      pending,
      isSettled: pending <= 0 && billed > 0,
      invoicesCount: projectInvoices.length,
    };
  }, [projectInvoices, projectWallet, payments]);

  // Helper to parse pilot flight duration in hours from start and end times
  const parseFlightHours = (log: any): number => {
    if (log?.flight_start_time && log?.flight_end_time) {
      const startParts = String(log.flight_start_time).split(':').map(Number);
      const endParts = String(log.flight_end_time).split(':').map(Number);
      if (
        startParts.length >= 2 &&
        endParts.length >= 2 &&
        !isNaN(startParts[0]) &&
        !isNaN(startParts[1]) &&
        !isNaN(endParts[0]) &&
        !isNaN(endParts[1])
      ) {
        let mins = (endParts[0] * 60 + endParts[1]) - (startParts[0] * 60 + startParts[1]);
        if (mins < 0) mins += 24 * 60; // Cross-midnight flight handling
        if (mins > 0) return mins / 60;
      }
    }
    if (typeof log?.flight_hours === 'number' && log.flight_hours > 0) return log.flight_hours;
    if (typeof log?.flight_minutes === 'number' && log.flight_minutes > 0) return log.flight_minutes / 60;
    return 0;
  };

  // Metric 5: Total Days (Average days per sector calculated strictly from pilot status flight logs)
  const overallAvgDays = useMemo(() => {
    const completedSecs = normalizedSectors.filter(
      (s) =>
        s.status === 'completed' ||
        s.status === 'surveyed' ||
        s.status === 'verified' ||
        (s.progress_percent !== undefined && s.progress_percent >= 100)
    );

    if (completedSecs.length === 0) {
      return {
        hasData: false,
        avgDays: 0,
        avgHours: 0,
        totalHours: 0,
        completedCount: 0,
        completedWithLogsCount: 0,
        daysSum: 0,
      };
    }

    let completedWithLogsCount = 0;
    let totalSectorHours = 0;
    let totalSectorDays = 0;

    completedSecs.forEach((sec) => {
      const logs = (sec.flight_logs || (sec.polygon_coordinates as any)?.flight_logs || []) as any[];
      const loggedHours = logs.reduce((sum: number, l: any) => sum + parseFlightHours(l), 0);
      const loggedDates = new Set(logs.map((l: any) => l.date).filter(Boolean));

      // Strictly consider actual pilot status reports with recorded flight logs
      if (logs.length > 0 && (loggedHours > 0 || loggedDates.size > 0)) {
        completedWithLogsCount += 1;
        totalSectorHours += loggedHours;
        // Operational days taken for this sector based on unique dates logged (or 1 day per completed sortie)
        const daysTaken = loggedDates.size > 0 ? loggedDates.size : 1;
        totalSectorDays += daysTaken;
      }
    });

    if (completedWithLogsCount === 0) {
      return {
        hasData: false,
        avgDays: 0,
        avgHours: 0,
        totalHours: 0,
        completedCount: completedSecs.length,
        completedWithLogsCount: 0,
        daysSum: 0,
      };
    }

    const avgHours = Number((totalSectorHours / completedWithLogsCount).toFixed(1));
    const rawAvgDays = totalSectorDays / completedWithLogsCount;
    const avgDays = Number(rawAvgDays.toFixed(1));

    return {
      hasData: true,
      avgDays: avgDays > 0 ? avgDays : 1,
      avgHours,
      totalHours: Number(totalSectorHours.toFixed(1)),
      completedCount: completedSecs.length,
      completedWithLogsCount,
      daysSum: totalSectorDays,
    };
  }, [normalizedSectors]);

  // ── Detail calculations for the 5 parameter breakdown ──

  // Parameter 1 & 2 weekly metrics: Area covered this week & Landings this week
  const weeklyOperationalStats = useMemo(() => {
    const nowMs = Date.now();
    const sevenDaysAgoMs = nowMs - 7 * 24 * 60 * 60 * 1000;
    let areaThisWeek = 0;
    let landingsWeek = 0;

    normalizedSectors.forEach((sec) => {
      const logs = (sec.flight_logs || (sec.polygon_coordinates as any)?.flight_logs || []) as any[];
      logs.forEach((log) => {
        const logTime = new Date(log.date || log.timestamp || 0).getTime();
        if (!isNaN(logTime) && logTime >= sevenDaysAgoMs) {
          areaThisWeek += Number(log.area_covered_today) || 0;
          landingsWeek += Number(log.landings_today) || 0;
        }
      });
    });

    // Fallback: If no daily flight log timestamps in last 7 days, check recently updated/completed sectors
    if (areaThisWeek === 0) {
      const recentSectors = normalizedSectors.filter((sec) => {
        const t = new Date(sec.updated_at || sec.created_at || 0).getTime();
        return !isNaN(t) && t >= sevenDaysAgoMs && (sec.status === 'completed' || sec.status === 'surveyed');
      });
      areaThisWeek = recentSectors.reduce(
        (acc, s) => acc + (Number(s.area_completed) || Number(s.target_area_sqkm) || 0),
        0
      );
      if (landingsWeek === 0) {
        landingsWeek = recentSectors.length;
      }
    }

    return {
      areaCoveredThisWeek: Number(areaThisWeek.toFixed(2)),
      landingsThisWeek: landingsWeek,
    };
  }, [normalizedSectors]);

  // Parameter 1 Detail 4: Average Area Per Flight
  const avgAreaPerFlight = useMemo(() => {
    if (overallLandings.completed > 0 && overallMapping.completedArea > 0) {
      return (overallMapping.completedArea / overallLandings.completed).toFixed(2);
    }
    if (overallMapping.totalSectors > 0 && overallMapping.evaluatedArea > 0) {
      return (overallMapping.evaluatedArea / overallMapping.totalSectors).toFixed(2);
    }
    return '0.00';
  }, [overallLandings.completed, overallMapping.completedArea, overallMapping.totalSectors, overallMapping.evaluatedArea]);

  // Parameter 3 Detail 4: Latest Landing Pilot Status
  const latestPilotStatus = useMemo(() => {
    if (!overallLastLanding.hasLandings) {
      return 'Awaiting flight deployment • Pilot not assigned';
    }
    const latestSector = normalizedSectors.find(
      (s) => s.sector_code === overallLastLanding.sectorCode || s.name === overallLastLanding.sectorName
    );
    const pilotName =
      (latestSector as any)?.assigned_pilot_name ||
      (latestSector as any)?.pilot_name ||
      (latestSector?.planning as any)?.pilot_name ||
      (latestSector?.flight_logs?.[0] as any)?.pilot_name;
    if (pilotName) {
      return `Pilot: ${pilotName} • On Site & Flight Verified`;
    }
    return 'Drone Pilot: Latrics Field Team • Flight log verified';
  }, [overallLastLanding, normalizedSectors]);

  // Parameter 4 Detail 4: Missed Due Dates (Overdue Invoices)
  const overdueInvoicesCount = useMemo(() => {
    const nowMs = Date.now();
    return projectInvoices.filter((inv) => {
      if (inv.status === 'paid') return false;
      if (!inv.due_date) return false;
      const dueTime = new Date(inv.due_date).getTime();
      return !isNaN(dueTime) && dueTime < nowMs;
    }).length;
  }, [projectInvoices]);

  // Parameter 5 Stats 2, 3, 4: Survey days completed, Projected Remaining Days, Expected Completion
  const daysAndTurnaround = useMemo(() => {
    const uniqueDates = new Set<string>();
    let totalProjectFlightHours = 0;
    normalizedSectors.forEach((sec) => {
      const logs = (sec.flight_logs || (sec.polygon_coordinates as any)?.flight_logs || []) as any[];
      logs.forEach((log) => {
        if (log.date) uniqueDates.add(log.date);
        totalProjectFlightHours += parseFlightHours(log);
      });
    });

    const surveyDaysCompleted = uniqueDates.size;
    const remainingSectors = Math.max(0, overallMapping.totalSectors - overallMapping.completedSectors);

    // If pilot has not provided flight status, do NOT give random approximations
    if (!overallAvgDays.hasData || overallAvgDays.completedWithLogsCount === 0) {
      return {
        hasData: false,
        surveyDaysCompleted,
        totalFlightHours: Number(totalProjectFlightHours.toFixed(1)),
        remainingSectors,
        projectedRemainingDays: null,
        expectedCompletionDate: null,
      };
    }

    if (remainingSectors === 0) {
      return {
        hasData: true,
        surveyDaysCompleted,
        totalFlightHours: Number(totalProjectFlightHours.toFixed(1)),
        remainingSectors: 0,
        projectedRemainingDays: 0,
        expectedCompletionDate: 'Completed',
      };
    }

    const pace = overallAvgDays.avgDays;
    const projectedRemainingDays = Math.max(1, Math.round(remainingSectors * pace));
    const targetMs = Date.now() + projectedRemainingDays * 24 * 60 * 60 * 1000;
    const expectedCompletionDate = formatDateDDMMYYYY(new Date(targetMs));

    return {
      hasData: true,
      surveyDaysCompleted,
      totalFlightHours: Number(totalProjectFlightHours.toFixed(1)),
      remainingSectors,
      projectedRemainingDays,
      expectedCompletionDate,
    };
  }, [normalizedSectors, overallAvgDays, overallMapping]);

  // Parameter configurations for the Sector Wise Stats Overview panel
  const parameterOptions: Array<{
    id: StatOverviewMetric;
    title: string;
    subtitle: string;
  }> = [
    {
      id: 'mapping',
      title: 'Mapping Completion (sq km)',
      subtitle: 'View mapping completion in each sector with area (sq km) and percentage',
    },
    {
      id: 'landings',
      title: 'Total Landings',
      subtitle: 'View total landings in each sector',
    },
    {
      id: 'last_landing',
      title: 'Last Landing Date',
      subtitle: 'View last landing date in each sector',
    },
    {
      id: 'bills',
      title: 'Total bills generated',
      subtitle: 'View billing data for each sector',
    },
    {
      id: 'days',
      title: 'Total days',
      subtitle: 'View total days required to map each sector',
    },
  ];

  // Unified data model for the 5 parameters ensuring 100% static box positions and dimensions
  const activeStatData = useMemo(() => {
    switch (selectedStatMetric) {
      case 'mapping': {
        return {
          header: {
            icon: <Compass size={14} color="#09090b" />,
            title: 'Mapping Completion (sq km)',
            badgeText: `${overallMapping.percent}% Completed`,
            badgeBg: overallMapping.percent >= 100 ? '#dcfce7' : '#ffffff',
            badgeColor: overallMapping.percent >= 100 ? '#15803d' : '#09090b',
            badgeBorder: overallMapping.percent >= 100 ? '#bbf7d0' : '#e4e4e7',
          },
          stat1: {
            label: 'Evaluated Area vs Completed Area',
            valuePrimary: overallMapping.completedArea.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
            valueUnit: `/ ${overallMapping.evaluatedArea.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} sq km`,
            progressPercent: overallMapping.percent,
            progressColor: overallMapping.percent >= 100 ? '#16a34a' : '#09090b',
            subtext: `${overallMapping.percent}% of total evaluated project area covered`,
          },
          stat2: {
            label: 'Sectors Completed vs Planned',
            value: (
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b' }}>
                {overallMapping.completedSectors} / {overallMapping.totalSectors}
              </span>
            ),
            subtext: `${Math.max(0, overallMapping.totalSectors - overallMapping.completedSectors)} Sectors Remaining to survey`,
          },
          stat3: {
            label: 'Area Covered This Week',
            value: (
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a' }}>
                {weeklyOperationalStats.areaCoveredThisWeek.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                sq km
              </span>
            ),
            subtext: 'Flight coverage logged within the last 7 days',
          },
          detail4: {
            icon: <TrendingUp size={13} color="#09090b" />,
            label: 'Average Area Per Flight',
            value: `Active Surveying • ~${avgAreaPerFlight} sq km / flight avg`,
            subtext: 'Derived from flight cycles across evaluated project sectors',
            isAlert: false,
            action: null,
          },
        };
      }

      case 'landings': {
        const sectorNameDisplay = overallLastLanding.hasLandings
          ? overallLastLanding.sectorName?.toLowerCase().startsWith('sector')
            ? overallLastLanding.sectorName
            : `Sector ${overallLastLanding.sectorName}`
          : 'None';

        return {
          header: {
            icon: <DroneIcon size={14} color="#09090b" />,
            title: 'Total Landings & Battery Cycles',
            badgeText: `${overallLandings.percent}% Done`,
            badgeBg: '#eff6ff',
            badgeColor: '#2563eb',
            badgeBorder: '#dbeafe',
          },
          stat1: {
            label: 'Completed Landings vs Planned Landings',
            valuePrimary: `${overallLandings.completed}`,
            valueUnit: `/ ${overallLandings.planned} Landings Completed`,
            progressPercent: overallLandings.percent,
            progressColor: '#2563eb',
            subtext: '1 sector = 1 landing = 100% full battery cycle',
          },
          stat2: {
            label: 'Flight Completion Rate',
            value: (
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb' }}>
                {overallLandings.percent}%
              </span>
            ),
            subtext: `${Math.max(0, overallLandings.planned - overallLandings.completed)} Landings Remaining out of ${overallLandings.planned}`,
          },
          stat3: {
            label: 'Landings This Week',
            value: (
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b' }}>
                {weeklyOperationalStats.landingsThisWeek} Landing{weeklyOperationalStats.landingsThisWeek === 1 ? '' : 's'}
              </span>
            ),
            subtext: 'Drone touchdowns logged in the last 7 days',
          },
          detail4: {
            icon: <CheckCircle2 size={13} color="#16a34a" />,
            label: 'Latest Flight Activity',
            value: overallLastLanding.hasLandings
              ? `Latest touchdown on ${sectorNameDisplay} (${overallLastLanding.date}) • Telemetry synced`
              : 'No active flights logged yet • Awaiting field deployment',
            subtext: 'Field operations telemetry and flight log records',
            isAlert: false,
            action: null,
          },
        };
      }

      case 'last_landing': {
        const sectorNameDisplay = overallLastLanding.hasLandings
          ? overallLastLanding.sectorName?.toLowerCase().startsWith('sector')
            ? overallLastLanding.sectorName
            : `Sector ${overallLastLanding.sectorName}`
          : 'None';

        return {
          header: {
            icon: <Calendar size={14} color="#09090b" />,
            title: 'Last Landing Date & Touchdown Telemetry',
            badgeText: overallLastLanding.hasLandings ? 'Touchdown Logged' : 'No Landings',
            badgeBg: overallLastLanding.hasLandings ? '#dcfce7' : '#ffffff',
            badgeColor: overallLastLanding.hasLandings ? '#15803d' : '#71717a',
            badgeBorder: overallLastLanding.hasLandings ? '#bbf7d0' : '#e4e4e7',
          },
          stat1: {
            label: 'Latest Landing Date',
            valuePrimary: overallLastLanding.date,
            valueUnit: '',
            subtext: 'Most recent touchdown recorded across project sectors',
          },
          stat2: {
            label: 'Operational Sector Flown',
            value: (
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#09090b' }}>
                {sectorNameDisplay}
              </span>
            ),
            subtext: overallLastLanding.hasLandings
              ? `Sector code: ${overallLastLanding.sectorCode}`
              : 'Awaiting flight deployment',
          },
          stat3: {
            label: 'Sector Status',
            value: (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '4px',
                  display: 'inline-block',
                  backgroundColor:
                    overallLastLanding.statusLabel === 'Done' || overallLastLanding.statusLabel === 'Completed'
                      ? '#dcfce7'
                      : overallLastLanding.hasLandings
                      ? '#fef9c3'
                      : '#f4f4f5',
                  color:
                    overallLastLanding.statusLabel === 'Done' || overallLastLanding.statusLabel === 'Completed'
                      ? '#15803d'
                      : overallLastLanding.hasLandings
                      ? '#854d0e'
                      : '#71717a',
                  border: `1px solid ${
                    overallLastLanding.statusLabel === 'Done' || overallLastLanding.statusLabel === 'Completed'
                      ? '#bbf7d0'
                      : overallLastLanding.hasLandings
                      ? '#fef08a'
                      : '#e4e4e7'
                  }`,
                }}
              >
                {overallLastLanding.statusLabel}
              </span>
            ),
            subtext: overallLastLanding.hasLandings
              ? 'Survey Completed / Logged by crew'
              : 'Pending flight launch on sector',
          },
          detail4: {
            icon: <UserCheck size={13} color="#09090b" />,
            label: 'Latest Landing Pilot Status',
            value: latestPilotStatus,
            subtext: 'Field telemetry and pilot assignment log',
            isAlert: false,
            action: null,
          },
        };
      }

      case 'bills': {
        const totalBilledVal = overallBills.billed;
        const totalPaidVal = overallBills.paid;
        const totalPendingVal = overallBills.pending;
        const totalDenominator = totalBilledVal > 0 ? totalBilledVal : Math.max(1, totalPaidVal + totalPendingVal);
        const paidPct = Math.min(100, Math.round((totalPaidVal / totalDenominator) * 100));
        const pendingPct = Math.max(0, Math.min(100 - paidPct, Math.round((totalPendingVal / totalDenominator) * 100)));

        return {
          header: {
            icon: <Receipt size={14} color="#09090b" />,
            title: 'Total Bills Generated & Financial Overview',
            badgeText:
              overallBills.pending <= 0 && overallBills.billed > 0
                ? 'Settled'
                : overallBills.pending > 0
                ? 'Payment Due'
                : 'No Bills',
            badgeBg: overallBills.pending <= 0 && overallBills.billed > 0 ? '#dcfce7' : '#fef9c3',
            badgeColor: overallBills.pending <= 0 && overallBills.billed > 0 ? '#15803d' : '#854d0e',
            badgeBorder: overallBills.pending <= 0 && overallBills.billed > 0 ? '#bbf7d0' : '#fef08a',
          },
          stat1: {
            label: 'Total Billed Amount',
            valuePrimary: `₹ ${overallBills.billed.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            valueUnit: '',
            progressPercent: paidPct,
            progressColor: '#16a34a',
            paidPercent: paidPct,
            pendingPercent: pendingPct,
            paidAmount: totalPaidVal,
            pendingAmount: totalPendingVal,
            subtext: `${overallBills.invoicesCount} cumulative digital invoice${
              overallBills.invoicesCount === 1 ? '' : 's'
            } generated`,
          },
          stat2: {
            label: 'Total Paid Amount',
            value: (
              <span
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: '#16a34a',
                  fontFamily: 'monospace',
                }}
              >
                ₹{' '}
                {overallBills.paid.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            ),
            subtext: 'Verified collections & client receipts',
          },
          stat3: {
            label: 'Pending Balance',
            value: (
              <span
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: overallBills.pending > 0 ? '#d97706' : '#16a34a',
                  fontFamily: 'monospace',
                }}
              >
                ₹{' '}
                {overallBills.pending.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            ),
            subtext: overallBills.pending > 0 ? 'Due for settlement by client' : 'Fully settled (₹ 0.00)',
          },
          detail4: {
            icon:
              overdueInvoicesCount > 0 ? (
                <AlertTriangle size={13} color="#dc2626" />
              ) : (
                <CheckCircle2 size={13} color="#16a34a" />
              ),
            label: 'Missed Due Dates',
            value:
              overdueInvoicesCount > 0
                ? `${overdueInvoicesCount} overdue invoice${overdueInvoicesCount === 1 ? '' : 's'} past payment due date`
                : 'No missed due dates • All invoices on track or settled',
            subtext: 'Project billing and payment collection status',
            isAlert: overdueInvoicesCount > 0,
            action: (
              <Link
                href={`/payments?projectId=${selectedProjectId}`}
                style={{
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  color: '#2563eb',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  flexShrink: 0,
                }}
                className="hover:underline"
              >
                <span>Invoices</span>
                <ArrowRight size={12} />
              </Link>
            ),
          },
        };
      }

      case 'days':
      default: {
        const hasVelocityData = overallAvgDays.hasData;

        return {
          header: {
            icon: <Clock size={14} color="#09090b" />,
            title: 'Total Days & Turnaround Time',
            badgeText: 'Turnaround Velocity',
            badgeBg: '#ffffff',
            badgeColor: '#09090b',
            badgeBorder: '#e4e4e7',
          },
          stat1: {
            label: 'Average Turnaround per Sector',
            valuePrimary: hasVelocityData ? `${overallAvgDays.avgDays}` : 'Not Available',
            valueUnit: hasVelocityData
              ? `${overallAvgDays.avgDays === 1 ? 'Day' : 'Days'} / Sector${
                  overallAvgDays.avgHours > 0 ? ` (${overallAvgDays.avgHours} hrs)` : ''
                }`
              : '',
            progressPercent: hasVelocityData
              ? Math.min(
                  100,
                  Math.round(
                    (overallAvgDays.completedWithLogsCount / Math.max(1, overallMapping.totalSectors)) * 100
                  )
                )
              : 0,
            progressColor: '#16a34a',
            subtext: hasVelocityData
              ? `Derived from ${overallAvgDays.completedWithLogsCount} completed sector${
                  overallAvgDays.completedWithLogsCount === 1 ? '' : 's'
                }${
                  overallAvgDays.avgHours > 0
                    ? ` • ${overallAvgDays.avgHours} hrs average flight time from pilot status logs`
                    : ''
                }`
              : 'No pilot status uploaded yet • Awaiting field flight logs',
          },
          stat2: {
            label: 'Survey Days Completed',
            value: (
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b' }}>
                {daysAndTurnaround.surveyDaysCompleted}{' '}
                {daysAndTurnaround.surveyDaysCompleted === 1 ? 'Day' : 'Days'}
                {daysAndTurnaround.totalFlightHours > 0 && (
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#71717a', marginLeft: '0.35rem' }}>
                    ({daysAndTurnaround.totalFlightHours} hrs)
                  </span>
                )}
              </span>
            ),
            subtext: `Operational survey days completed in project lifecycle${
              daysAndTurnaround.totalFlightHours > 0 ? ` • ${daysAndTurnaround.totalFlightHours} flight hours logged` : ''
            }`,
          },
          stat3: {
            label: 'Projected Remaining Days',
            value: (
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: daysAndTurnaround.projectedRemainingDays === null ? '#71717a' : '#09090b',
                }}
              >
                {daysAndTurnaround.projectedRemainingDays === null
                  ? 'Not Available'
                  : daysAndTurnaround.projectedRemainingDays === 0
                  ? '0 Days'
                  : `~${daysAndTurnaround.projectedRemainingDays} Days`}
              </span>
            ),
            subtext:
              daysAndTurnaround.projectedRemainingDays === null
                ? 'Awaiting pilot flight logs to calculate turnaround velocity'
                : daysAndTurnaround.remainingSectors === 0
                ? 'All project sectors completed'
                : `Estimated for remaining ${daysAndTurnaround.remainingSectors} sector${
                    daysAndTurnaround.remainingSectors === 1 ? '' : 's'
                  } at ${overallAvgDays.avgDays} days/sector pace${
                    overallAvgDays.avgHours > 0 ? ` (${overallAvgDays.avgHours} hrs/sector)` : ''
                  }`,
          },
          detail4: {
            icon: <Calendar size={13} color="#09090b" />,
            label: 'Expected Completion Date',
            value:
              daysAndTurnaround.expectedCompletionDate === null
                ? 'Not Available'
                : daysAndTurnaround.expectedCompletionDate === 'Completed'
                ? 'Project Survey Completed'
                : `Expected completion: ${daysAndTurnaround.expectedCompletionDate}`,
            subtext:
              daysAndTurnaround.expectedCompletionDate === null
                ? 'Will be calculated once pilot uploads sector status'
                : `Calculated from ${overallAvgDays.avgDays} days/sector velocity${
                    overallAvgDays.avgHours > 0 ? ` (${overallAvgDays.avgHours} hrs/sector)` : ''
                  }`,
            isAlert: false,
            action: null,
          },
        };
      }
    }
  }, [
    selectedStatMetric,
    overallMapping,
    overallLandings,
    overallLastLanding,
    overallBills,
    overallAvgDays,
    weeklyOperationalStats,
    avgAreaPerFlight,
    latestPilotStatus,
    overdueInvoicesCount,
    daysAndTurnaround,
    selectedProjectId,
  ]);

  // ── 6. Formatted Recent Projects Data (Top 3 strictly from DB) ──
  const displayedRecentProjects = useMemo(() => {
    return projects.slice(0, 3).map((p) => {
      const updatedDate = formatDateDDMMYYYY(p.updated_at);

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
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your survey operations and project activity."
        onRefresh={fetchInitialData}
        isRefreshing={isLoading}
        refreshTooltip="Refresh dashboard"
      />

      {/* ── Aerostake Validity Completed Banner (Distinct Texture of Black) ── */}
      {isAerostakeValidityOver && (
        <div
          style={{
            background: 'repeating-linear-gradient(-45deg, #09090b, #09090b 10px, #18181b 10px, #18181b 20px)',
            border: '2px solid #27272a',
            borderRadius: '8px',
            padding: '1rem 1.25rem',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '6px',
                backgroundColor: '#18181b',
                border: '1px solid #3f3f46',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertCircle size={20} color="#f4f4f5" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 800, letterSpacing: '-0.01em', color: '#ffffff' }}>
                  Aerostake Validity Completed — Renewal Required
                </span>
                <span
                  style={{
                    fontSize: '0.675rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#ffffff',
                    color: '#09090b',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {isLandingsOver && isTenureOver
                    ? 'Landings & Tenure Completed'
                    : isLandingsOver
                    ? '1,000 Landings Quota Reached'
                    : '3-Year Tenure Concluded'}
                </span>
              </div>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem', color: '#d4d4d8', lineHeight: 1.4 }}>
                {isLandingsOver && isTenureOver
                  ? 'Your 1,000 landings quota and 3-year agreement tenure have concluded. To schedule further drone operations, please contact Latrics Operations to renew your agreement.'
                  : isLandingsOver
                  ? 'Your 1,000 landings quota has been fully utilized. Aerostake validity is completed and requires renewal to unlock additional flight operations.'
                  : 'Your 3-year agreement tenure (1,095 days) has completed. Aerostake validity has expired and requires contract renewal.'}
              </p>
            </div>
          </div>
          <Link
            href="/company-profile"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#ffffff',
              color: '#09090b',
              fontSize: '0.78rem',
              fontWeight: 700,
              borderRadius: '6px',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              flexShrink: 0,
            }}
          >
            <span>View Profile</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      )}

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
            border: isLandingsOver ? '2px solid #09090b' : '1px solid #e4e4e7',
            padding: '1.15rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '140px',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            {isLandingsOver && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'repeating-linear-gradient(-45deg, #09090b, #09090b 6px, #27272a 6px, #27272a 12px)',
                  color: '#ffffff',
                  letterSpacing: '0.03em',
                }}
              >
                VALIDITY OVER
              </span>
            )}
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
            border: isTenureOver ? '2px solid #09090b' : '1px solid #e4e4e7',
            padding: '1.15rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '140px',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            {isTenureOver && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'repeating-linear-gradient(-45deg, #09090b, #09090b 6px, #27272a 6px, #27272a 12px)',
                  color: '#ffffff',
                  letterSpacing: '0.03em',
                }}
              >
                TENURE OVER
              </span>
            )}
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
            position: 'relative',
          }}
          ref={txDropdownRef}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

            {/* Dropdown toggle for last 3 transactions */}
            <button
              onClick={() => setIsTxDropdownOpen(!isTxDropdownOpen)}
              title="View last 3 transactions"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#52525b',
                backgroundColor: isTxDropdownOpen ? '#f4f4f5' : 'transparent',
                border: '1px solid #e4e4e7',
                borderRadius: '6px',
                padding: '0.2rem 0.45rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Recent (3)</span>
              <ChevronDown
                size={12}
                style={{
                  transform: isTxDropdownOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.15s ease',
                }}
              />
            </button>
          </div>

          <div style={{ marginTop: '0.4rem' }}>
            <div
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                fontFamily: 'monospace',
                color: outstandingInfo.isDue ? '#dc2626' : '#16a34a',
                lineHeight: 1.15,
              }}
            >
              {outstandingInfo.amountFormatted}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.3rem' }}>
              {outstandingInfo.note}
            </div>
          </div>

          {/* Dropdown Menu showing Last 3 Transactions */}
          {isTxDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                left: 0,
                backgroundColor: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '8px',
                padding: '0.75rem',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Last 3 Transactions
                </span>
                <span style={{ fontSize: '0.675rem', color: '#a1a1aa' }}>
                  Cumulative Wallet
                </span>
              </div>

              {outstandingInfo.recentTransactions.length === 0 ? (
                <div style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#71717a' }}>
                  No transactions recorded yet
                </div>
              ) : (
                outstandingInfo.recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.35rem 0',
                      borderBottom: '1px dashed #f4f4f5',
                      fontSize: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 600, color: '#09090b', fontSize: '0.75rem' }}>
                          {tx.type === 'bill' ? 'Digital Bill' : 'Payment'}
                        </span>
                        <span style={{ color: '#71717a', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                          {tx.reference}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.675rem', color: '#a1a1aa', marginTop: '0.15rem' }}>
                        {tx.date}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          color: tx.type === 'bill' ? '#dc2626' : '#16a34a',
                        }}
                      >
                        {tx.type === 'bill'
                          ? `+₹${tx.amount_billed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : `-₹${tx.amount_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#71717a', fontFamily: 'monospace' }}>
                        Bal: ₹{tx.running_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                ))
              )}

              <div style={{ paddingTop: '0.35rem', textAlign: 'right' }}>
                <Link
                  href="/payments"
                  style={{
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    color: '#09090b',
                    textDecoration: 'none',
                  }}
                  className="hover:underline"
                >
                  View full wallet ledger &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Middle Section: Sector Overview & Sector Wise Stats Overview ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 330px',
          gap: '1.25rem',
          alignItems: 'stretch',
        }}
        className="overview-middle-section"
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
            gap: '1.15rem',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#09090b', margin: 0 }}>
                  Sector Overview
                </h2>
                <span
                  style={{
                    fontSize: '0.675rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: '#f4f4f5',
                    color: '#18181b',
                    border: '1px solid #e4e4e7',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  GIS & Telemetry
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.25rem', margin: 0 }}>
                Mapping completion status and operational telemetry for each sector under the selected project.
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

          {/* Body: Map (Left) + Selected Parameter Output Area (Right) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(280px, 360px) minmax(0, 1fr)',
              gap: '1.25rem',
              alignItems: 'stretch',
            }}
          >
            {/* 1. Real Satellite Imagery Map with Sectorised KML View */}
            <div
              style={{
                height: '470px',
                borderRadius: '8px',
                border: '1px solid #e4e4e7',
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: '#09090b',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              }}
            >
              <RealWorldProjectMap
                projectId={selectedProjectId}
                project={selectedProject}
                sectors={normalizedSectors}
                selectedSectorCode={selectedSectorCode}
                onSelectSector={(code) => setSelectedSectorCode(code)}
                mapMode={mapMode}
                setMapMode={setMapMode}
                isOpsOrAdmin={isOpsOrAdmin}
                isClient={isClient}
                height="470px"
                borderRadius="8px"
              />
            </div>

            {/* 2. Output Area Beside Map: 100% Static & Exact Box Positions for All 5 Parameters */}
            <div
              style={{
                height: '470px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxSizing: 'border-box',
              }}
            >
              {/* Box 0: Static Top Header Bar (Fixed Height: 38px) */}
              <div
                style={{
                  height: '38px',
                  boxSizing: 'border-box',
                  borderRadius: '6px',
                  backgroundColor: '#f4f4f5',
                  border: '1px solid #e4e4e7',
                  padding: '0 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background-color 0.2s ease, border-color 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  {activeStatData.header.icon}
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#09090b' }}>
                    {activeStatData.header.title}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.675rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: activeStatData.header.badgeBg,
                    color: activeStatData.header.badgeColor,
                    border: `1px solid ${activeStatData.header.badgeBorder}`,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {activeStatData.header.badgeText}
                </span>
              </div>

              {/* Box 1: Static Primary Stat Card (Fixed Height: 150px) */}
              <div
                style={{
                  height: '150px',
                  boxSizing: 'border-box',
                  backgroundColor: '#fafafa',
                  border: '1px solid #e4e4e7',
                  borderRadius: '8px',
                  padding: '0.9rem 1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'border-color 0.2s ease',
                }}
              >
                <span style={{ fontSize: '0.725rem', fontWeight: 600, color: '#71717a', lineHeight: 1.2 }}>
                  {activeStatData.stat1.label}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', minHeight: '34px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                    <span
                      style={{
                        fontSize: activeStatData.stat1.valuePrimary === 'Not Available' ? '1.25rem' : '1.45rem',
                        fontWeight: 800,
                        color: activeStatData.stat1.valuePrimary === 'Not Available' ? '#71717a' : '#09090b',
                        letterSpacing: '-0.02em',
                        lineHeight: 1,
                      }}
                    >
                      {activeStatData.stat1.valuePrimary}
                    </span>
                    {activeStatData.stat1.valueUnit && (
                      <span style={{ fontSize: '0.85rem', color: '#71717a', fontWeight: 600 }}>
                        {activeStatData.stat1.valueUnit}
                      </span>
                    )}
                  </div>

                  {/* For bills: render Pie Chart at the right side of the amount display */}
                  {selectedStatMetric === 'bills' && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexShrink: 0,
                      }}
                      title={`Paid: ₹${(activeStatData.stat1.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${activeStatData.stat1.paidPercent ?? 0}%) | Pending: ₹${(activeStatData.stat1.pendingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${activeStatData.stat1.pendingPercent ?? 0}%)`}
                    >
                      <svg width="38" height="38" viewBox="0 0 38 38">
                        {/* Base track */}
                        <circle cx="19" cy="19" r="14" fill="none" stroke="#e4e4e7" strokeWidth="5" />

                        {/* Paid Segment (Green) */}
                        {(activeStatData.stat1.paidPercent || 0) > 0 && (
                          <circle
                            cx="19"
                            cy="19"
                            r="14"
                            fill="none"
                            stroke="#16a34a"
                            strokeWidth="5"
                            strokeDasharray={`${((activeStatData.stat1.paidPercent || 0) / 100) * (2 * Math.PI * 14)} ${2 * Math.PI * 14}`}
                            strokeDashoffset={0}
                            transform="rotate(-90 19 19)"
                          />
                        )}

                        {/* Pending Segment (Red) */}
                        {(activeStatData.stat1.pendingPercent || 0) > 0 && (
                          <circle
                            cx="19"
                            cy="19"
                            r="14"
                            fill="none"
                            stroke="#dc2626"
                            strokeWidth="5"
                            strokeDasharray={`${((activeStatData.stat1.pendingPercent || 0) / 100) * (2 * Math.PI * 14)} ${2 * Math.PI * 14}`}
                            strokeDashoffset={`${-(((activeStatData.stat1.paidPercent || 0) / 100) * (2 * Math.PI * 14))}`}
                            transform="rotate(-90 19 19)"
                          />
                        )}
                      </svg>
                    </div>
                  )}
                </div>

                {/* Progress bar area:
                    1. For 'last_landing' (1st image attachment): This progression bar is invalid so remove.
                    2. For 'bills' (2nd image attachment): Paid is Green, Pending is Red in segmented bar.
                    3. For other metrics: Standard progress bar. */}
                {selectedStatMetric === 'last_landing' ? null : selectedStatMetric === 'bills' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
                    <div
                      style={{
                        width: '100%',
                        height: '7px',
                        backgroundColor: '#e4e4e7',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        display: 'flex',
                      }}
                    >
                      {(activeStatData.stat1.paidPercent || 0) > 0 && (
                        <div
                          style={{
                            width: `${activeStatData.stat1.paidPercent}%`,
                            height: '100%',
                            backgroundColor: '#16a34a',
                            transition: 'width 0.4s ease',
                          }}
                          title={`Paid: ₹${(activeStatData.stat1.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${activeStatData.stat1.paidPercent}%)`}
                        />
                      )}
                      {(activeStatData.stat1.pendingPercent || 0) > 0 && (
                        <div
                          style={{
                            width: `${activeStatData.stat1.pendingPercent}%`,
                            height: '100%',
                            backgroundColor: '#dc2626',
                            transition: 'width 0.4s ease',
                          }}
                          title={`Pending: ₹${(activeStatData.stat1.pendingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${activeStatData.stat1.pendingPercent}%)`}
                        />
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.675rem' }}>
                      <span style={{ color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
                        Paid: {activeStatData.stat1.paidPercent || 0}%
                      </span>
                      <span style={{ color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#dc2626' }} />
                        Pending: {activeStatData.stat1.pendingPercent || 0}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '7px',
                      backgroundColor: '#e4e4e7',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, activeStatData.stat1.progressPercent || 0))}%`,
                        height: '100%',
                        backgroundColor: activeStatData.stat1.progressColor,
                        borderRadius: '4px',
                        transition: 'width 0.4s ease, background-color 0.3s ease',
                      }}
                    />
                  </div>
                )}

                <span style={{ fontSize: '0.685rem', color: '#71717a', lineHeight: 1.2 }}>
                  {activeStatData.stat1.subtext}
                </span>
              </div>

              {/* Row 2: Static Box 2 (Stat 2) & Box 3 (Stat 3) (Fixed Height: 144px) */}
              <div
                style={{
                  height: '144px',
                  boxSizing: 'border-box',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                }}
              >
                {/* Box 2 (Stat 2) */}
                <div
                  style={{
                    height: '144px',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '0.7rem', color: '#71717a', fontWeight: 600, lineHeight: 1.2 }}>
                    {activeStatData.stat2.label}
                  </span>
                  <div style={{ minHeight: '36px', display: 'flex', alignItems: 'center' }}>
                    {activeStatData.stat2.value}
                  </div>
                  <span style={{ fontSize: '0.675rem', color: '#71717a', lineHeight: 1.35 }}>
                    {activeStatData.stat2.subtext}
                  </span>
                </div>

                {/* Box 3 (Stat 3) */}
                <div
                  style={{
                    height: '144px',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '0.7rem', color: '#71717a', fontWeight: 600, lineHeight: 1.2 }}>
                    {activeStatData.stat3.label}
                  </span>
                  <div style={{ minHeight: '36px', display: 'flex', alignItems: 'center' }}>
                    {activeStatData.stat3.value}
                  </div>
                  <span style={{ fontSize: '0.675rem', color: '#71717a', lineHeight: 1.35 }}>
                    {activeStatData.stat3.subtext}
                  </span>
                </div>
              </div>

              {/* Box 4: Static Bottom Detail Card (Fixed Height: 102px) */}
              <div
                style={{
                  height: '102px',
                  boxSizing: 'border-box',
                  backgroundColor: activeStatData.detail4.isAlert ? '#fef2f2' : '#f4f4f5',
                  border: `1px solid ${activeStatData.detail4.isAlert ? '#fecaca' : '#e4e4e7'}`,
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'background-color 0.2s ease, border-color 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {activeStatData.detail4.icon}
                    <span
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        color: activeStatData.detail4.isAlert ? '#dc2626' : '#09090b',
                      }}
                    >
                      {activeStatData.detail4.label}
                    </span>
                  </div>
                  {activeStatData.detail4.action}
                </div>

                <div
                  style={{
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    color: activeStatData.detail4.isAlert ? '#b91c1c' : '#09090b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={activeStatData.detail4.value}
                >
                  {activeStatData.detail4.value}
                </div>

                <span style={{ fontSize: '0.675rem', color: '#71717a', lineHeight: 1.2 }}>
                  {activeStatData.detail4.subtext}
                </span>
              </div>
            </div>
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
            gap: '1rem',
          }}
        >
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b', margin: 0 }}>
              Sector Wise Stats Overview
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.2rem', margin: 0 }}>
              Select a metric to view operational stats.
            </p>

            {/* List of 5 Selectable Parameters with Radio Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1.1rem' }}>
              {parameterOptions.map((param) => {
                const isSelected = selectedStatMetric === param.id;
                return (
                  <div
                    key={param.id}
                    onClick={() => setSelectedStatMetric(param.id)}
                    role="button"
                    tabIndex={0}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.75rem 0.85rem',
                      borderRadius: '8px',
                      border: isSelected ? '1px solid #18181b' : '1px solid #f4f4f5',
                      backgroundColor: isSelected ? '#fafafa' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      outline: 'none',
                    }}
                  >
                    {/* Radio circle */}
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        border: isSelected ? '5px solid #09090b' : '2px solid #d4d4d8',
                        backgroundColor: '#ffffff',
                        marginTop: '2px',
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                      }}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span
                        style={{
                          fontSize: '0.825rem',
                          fontWeight: isSelected ? 700 : 600,
                          color: '#09090b',
                          lineHeight: 1.25,
                        }}
                      >
                        {param.title}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#71717a', lineHeight: 1.35 }}>
                        {param.subtitle}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Footnote */}
          <div
            style={{
              paddingTop: '0.75rem',
              borderTop: '1px solid #f4f4f5',
              fontSize: '0.7rem',
              color: '#71717a',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.4rem',
              lineHeight: 1.4,
            }}
          >
            <Info size={13} style={{ flexShrink: 0, marginTop: '2px', color: '#a1a1aa' }} />
            <span>The stats beside the map will update based on your selection above.</span>
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
                      borderBottom: idx === displayedRecentProjects.length - 1 ? 'none' : '1px solid #f4f4f5',
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
