'use client';

import React, { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Layers,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Plus,
  Plane,
  User,
  ShieldCheck,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  FileEdit,
  ClipboardList,
  Compass,
  CloudSun,
  Activity,
  UploadCloud,
  UserPlus,
  ArrowRight,
} from 'lucide-react';
import { Sector } from '../types';
import { sectorApi } from '../api';
import { projectApi } from '@/modules/projects/api';
import { getSectorVisualState, SECTOR_STYLES } from '../sectorStyles';
import { isLatricsRole, isClientRole } from '@/lib/role';
import { useAuth } from '@/lib/auth';
import { StageChatBox, StageChatMessage } from '@/modules/projects/components/StageChatBox';
import { PilotDailyStatusModal } from './PilotDailyStatusModal';
import { UploadSectorKmlModal } from './UploadSectorKmlModal';
import { AssignPilotsModal } from './AssignPilotsModal';
import { PlannedProjectTenure } from '@/modules/planning/types';
import { formatDateDDMMYYYY } from '@/lib/date';

interface ExpandableHeaderBtnProps {
  id?: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  title: string;
  variant?: 'primary' | 'secondary';
}

const ExpandableHeaderBtn: React.FC<ExpandableHeaderBtnProps> = ({
  id,
  icon,
  label,
  onClick,
  title,
  variant = 'secondary',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const isPrimary = variant === 'primary';
  const baseBg = isPrimary ? '#09090b' : '#ffffff';
  const hoverBg = isPrimary ? '#18181b' : '#f4f4f5';
  const textColor = isPrimary ? '#ffffff' : '#09090b';
  const borderColor = isPrimary ? '#09090b' : '#d4d4d8';

  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={title}
      style={{
        height: '32px',
        minWidth: '32px',
        padding: isHovered ? '0 0.85rem' : '0 0.55rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isHovered ? hoverBg : baseBg,
        color: textColor,
        borderRadius: '4px',
        border: `1px solid ${borderColor}`,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isHovered ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
      }}
    >
      {isHovered ? (
        <span>{label}</span>
      ) : (
        icon
      )}
    </button>
  );
};


const RealWorldProjectMap = dynamic(
  () => import('./RealWorldProjectMap').then((m) => m.RealWorldProjectMap),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: '100%',
          height: '360px',
          backgroundColor: '#09090b',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          color: '#38bdf8',
          fontSize: '0.85rem',
          fontWeight: 700,
        }}
      >
        <Compass size={28} className="animate-spin" />
        <span>Loading GIS Satellite Map...</span>
      </div>
    ),
  }
);

interface CapturingStageWorkspaceProps {
  project: any;
  sectors: Sector[];
  plannedTenure?: PlannedProjectTenure | null;
  onRefresh: () => void;
  onSectorsRefresh?: () => void;
  availablePilots?: Array<{ id: string; name: string; email?: string }>;
  availableDrones?: string[];
  userRole?: string;
  userName?: string;
  stageMessages: StageChatMessage[];
  onSendMessage: (text: string, attachments?: { name: string; size?: string }[]) => Promise<void>;
  onAdvanceStage?: (stageId: number) => void;
}

export const CapturingStageWorkspace: React.FC<CapturingStageWorkspaceProps> = ({
  project,
  sectors = [],
  plannedTenure = null,
  onRefresh,
  onSectorsRefresh,
  availablePilots = [],
  availableDrones = [],
  userRole = 'client',
  userName = 'User',
  stageMessages = [],
  onSendMessage,
  onAdvanceStage,
}) => {
  const [localSectors, setLocalSectors] = useState<Sector[]>(sectors);

  useEffect(() => {
    setLocalSectors(sectors);
  }, [sectors]);
  const [mapMode, setMapMode] = useState<'satellite' | 'map'>('satellite');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedSectorCode, setSelectedSectorCode] = useState<string>('');
  const [isPilotModalOpen, setIsPilotModalOpen] = useState<boolean>(false);
  const [isUploadKmlModalOpen, setIsUploadKmlModalOpen] = useState<boolean>(false);
  const [isAssignPilotsModalOpen, setIsAssignPilotsModalOpen] = useState<boolean>(false);
  const [selectedPilotSectorId, setSelectedPilotSectorId] = useState<string | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [updatingSectorId, setUpdatingSectorId] = useState<string | null>(null);
  const [isAdvancingToProcessing, setIsAdvancingToProcessing] = useState<boolean>(false);

  const { user: authUser } = useAuth();
  const isPilot = userRole?.toLowerCase() === 'pilot';
  const isOpsOrAdmin = isLatricsRole(userRole) || userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'operations';
  const isClient = isClientRole(userRole) || (!isOpsOrAdmin && !isPilot);
  const isStage4Completed =
    project?.status?.toLowerCase() === 'completed' ||
    Boolean(project?.requirements_payload?.stage_progression?.capturing_completed) ||
    (sectors.length > 0 && sectors.every((sec) => sec.status === 'completed'));
  const canLogDailyFlight = !isStage4Completed && (isPilot || isOpsOrAdmin);

  const handleUpdateSectorDate = async (sectorId: string, scanningDate: string) => {
    try {
      setUpdatingSectorId(sectorId);
      // Instant optimistic local update
      setLocalSectors((prev) =>
        prev.map((s) => {
          if (s.id !== sectorId) return s;
          const coords = (s.polygon_coordinates as any) || {};
          const pl = s.planning || coords.planning || {};
          return {
            ...s,
            planning: {
              ...pl,
              scanning_date: scanningDate,
              planned_start_date: scanningDate,
            },
          };
        })
      );
      await sectorApi.updateSectorPlanning(sectorId, {
        scanning_date: scanningDate,
        planned_start_date: scanningDate,
      });
      if (onSectorsRefresh) {
        onSectorsRefresh();
      } else if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      console.error('Failed to update sector scanning date:', err);
      if (onSectorsRefresh) onSectorsRefresh();
      else if (onRefresh) onRefresh();
    } finally {
      setUpdatingSectorId(null);
    }
  };

  const handleUpdateSectorPilot = async (sectorId: string, pilotId: string) => {
    try {
      setUpdatingSectorId(sectorId);
      const pilot = availablePilots.find((p) => p.id === pilotId);
      const pilotName = pilot ? pilot.name : '';
      const pilotEmail = pilot ? pilot.email : '';

      // Instant optimistic local update
      setLocalSectors((prev) =>
        prev.map((s) => {
          if (s.id !== sectorId) return s;
          const coords = (s.polygon_coordinates as any) || {};
          const pl = s.planning || coords.planning || {};
          return {
            ...s,
            planning: {
              ...pl,
              assigned_pilot: pilotName,
              assigned_pilot_id: pilotId,
              pilot_email: pilotEmail,
              is_pending_invite: false,
            },
          };
        })
      );

      if (!pilotId) {
        await sectorApi.updateSectorPlanning(sectorId, {
          assigned_pilot: '',
          assigned_pilot_id: '',
          pilot_email: '',
          pilot_phone: '',
          is_pending_invite: false,
        });
      } else {
        await sectorApi.updateSectorPlanning(sectorId, {
          assigned_pilot: pilotName,
          assigned_pilot_id: pilotId,
          pilot_email: pilotEmail,
          is_pending_invite: false,
        });
      }

      if (onSectorsRefresh) {
        onSectorsRefresh();
      } else if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      console.error('Failed to update sector pilot assignment:', err);
      if (onSectorsRefresh) onSectorsRefresh();
      else if (onRefresh) onRefresh();
    } finally {
      setUpdatingSectorId(null);
    }
  };

  // Verification helper: pilots can ONLY update status/log flights for their assigned sectors
  const isSectorAssignedToUser = (targetSec: Sector) => {
    if (isOpsOrAdmin) return true;
    if (!isPilot) return false;
    const coords = (targetSec.polygon_coordinates as any) || {};
    const planning = targetSec.planning || coords.planning || {};
    const assignedId = planning.assigned_pilot_id;
    const pilotEmail = (planning.pilot_email || '').trim().toLowerCase();
    const assignedName = (planning.assigned_pilot || '').trim().toLowerCase();
    const myEmail = (authUser?.email || '').trim().toLowerCase();
    const myName = (authUser?.full_name || userName || '').trim().toLowerCase();
    const myId = authUser?.id ? String(authUser.id) : '';

    if (
      (assignedId && myId && String(assignedId) === myId) ||
      (pilotEmail && myEmail && pilotEmail === myEmail) ||
      (assignedName && myName && (assignedName === myName || myName.includes(assignedName) || assignedName.includes(myName)))
    ) {
      return true;
    }

    if (Array.isArray(planning.assigned_pilots)) {
      return planning.assigned_pilots.some((p: any) => {
        if (!p) return false;
        if (typeof p === 'string') {
          const pStr = p.trim().toLowerCase();
          return myName && (pStr === myName || myName.includes(pStr) || pStr.includes(myName));
        }
        const pId = p.id ? String(p.id) : '';
        const pEmail = (p.email || '').trim().toLowerCase();
        const pName = (p.name || '').trim().toLowerCase();
        return (
          (pId && myId && pId === myId) ||
          (pEmail && myEmail && pEmail === myEmail) ||
          (pName && myName && (pName === myName || myName.includes(pName) || pName.includes(myName)))
        );
      });
    }

    return false;
  };


  // Normalize live backend sectors strictly from the backend prop with 0 seeded/mock items
  const displaySectors: Sector[] = useMemo(() => {
    if (!localSectors || localSectors.length === 0) return [];

    return localSectors.map((sec) => {
      const polyCoords = (sec.polygon_coordinates as any) || {};
      const planningData = sec.planning || polyCoords.planning || {};
      const flightLogs = (sec.flight_logs || polyCoords.flight_logs || []) as any[];

      const totalArea = Number(sec.target_area_sqkm || planningData.target_area_sqkm || 0);
      const coveredArea = flightLogs.reduce(
        (acc: number, l: any) => acc + (Number(l.area_covered_today) || 0),
        0
      );

      const isCompleted = sec.status === 'completed' || sec.status === 'surveyed';
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
  }, [localSectors]);

  // Keep selected sector in sync with available live sectors
  React.useEffect(() => {
    if (displaySectors.length > 0) {
      if (!selectedSectorCode || !displaySectors.some((s) => s.sector_code === selectedSectorCode)) {
        setSelectedSectorCode(displaySectors[0].sector_code);
      }
    } else {
      setSelectedSectorCode('');
    }
  }, [displaySectors, selectedSectorCode]);

  // Aggregate metrics
  const totalAreaSum = useMemo(() => {
    const sum = displaySectors.reduce((acc, s) => acc + (Number(s.target_area_sqkm) || 0), 0);
    // Keep exact sum without artificial rounding constraints
    return Math.round(sum * 100000) / 100000;
  }, [displaySectors]);

  const completedCount = useMemo(() => {
    return displaySectors.filter(
      (s) => s.status === 'completed' || s.status === 'surveyed' || (s.progress_percent || 0) >= 100
    ).length;
  }, [displaySectors]);

  const allSectorsVerified = useMemo(() => {
    return displaySectors.length > 0 && displaySectors.every(
      (sec) => sec.status === 'completed' || sec.status === 'surveyed' || (sec.progress_percent || 0) >= 100
    );
  }, [displaySectors]);

  const handleProceedToProcessing = async () => {
    if (!project || !isOpsOrAdmin) return;
    if (!allSectorsVerified) {
      alert('Cannot advance to Processing: All required sectors must be completed and verified first.');
      return;
    }

    setIsAdvancingToProcessing(true);
    try {
      const currentReqPayload = (project?.requirements_payload as Record<string, any>) || {};
      const updatedProgression = {
        ...(currentReqPayload.stage_progression || {}),
        capturing_completed: true,
        capturing_completed_at: new Date().toISOString(),
        capturing_completed_by: userName,
      };

      await projectApi.updateProject(project.id, {
        requirements_payload: {
          ...currentReqPayload,
          stage_progression: updatedProgression,
        },
      });

      onRefresh();
      onAdvanceStage?.(5);
    } catch (err: any) {
      console.error('Failed to advance to Processing:', err);
      alert(err.message || 'Failed to advance to Processing stage.');
    } finally {
      setIsAdvancingToProcessing(false);
    }
  };

  // Extract all capturing timeline events strictly from real flight logs recorded on sectors
  const capturingEvents = useMemo(() => {
    const list: Array<{
      id: string;
      sector_code: string;
      date: string;
      time: string;
      isoTimestamp: string;
      type: 'completion' | 'abort' | 'issue' | 'delay' | 'sortie';
      title: string;
    }> = [];

    displaySectors.forEach((sec) => {
      const polyCoords = (sec.polygon_coordinates as any) || {};
      const flightLogs = (sec.flight_logs || polyCoords.flight_logs || []) as any[];

      // 1. Process flight logs for the sector
      flightLogs.forEach((log: any, lIdx: number) => {
        const rawDate = log.date || new Date().toISOString().split('T')[0];
        const dateLabel = formatDateDDMMYYYY(rawDate);

        const timeStr = log.flight_end_time || log.flight_start_time || '12:00';
        const isoTs = `${rawDate}T${timeStr.includes(':') ? timeStr : `${timeStr}:00`}:00Z`;
        const landings = Number(log.landings_today) || 1;
        const weatherClean = (log.weather_condition || '').trim();
        const weatherLower = weatherClean.toLowerCase();
        const remarksClean = (log.remarks || '').trim();
        const secStatusLower = (log.sector_status || sec.status || '').toLowerCase();

        // Check if event is an abort
        const isAborted =
          weatherLower === 'aborted' ||
          weatherLower === 'abort' ||
          secStatusLower === 'flagged' ||
          /abort|crash|emergency|hazard/i.test(remarksClean);

        // Check if event completes sector
        const isCompleted =
          secStatusLower === 'surveyed' ||
          secStatusLower === 'completed' ||
          (log.landings_today >= 1 && !isAborted);

        // Check if operational delay or issue
        const isDelayOrIssue =
          weatherLower.includes('rain') ||
          weatherLower.includes('wind') ||
          /delay|weather|issue|problem|battery|sensor|gps|error|trouble|grounded/i.test(remarksClean);

        const pilotName = (log.logged_by || (sec.planning as any)?.assigned_pilot || '').trim();

        let type: 'completion' | 'abort' | 'issue' | 'delay' | 'sortie' = 'completion';
        let title = pilotName
          ? `Sector ${sec.sector_code} completed and logged by ${pilotName}`
          : `Sector ${sec.sector_code} completed`;

        if (isAborted) {
          type = 'abort';
          title = pilotName
            ? `Sector ${sec.sector_code} aborted and logged by ${pilotName}`
            : `Sector ${sec.sector_code} aborted`;
        } else if (isDelayOrIssue) {
          type = 'issue';
          title = pilotName
            ? `Sector ${sec.sector_code} delay/issue and logged by ${pilotName}`
            : `Sector ${sec.sector_code} delay/issue`;
        } else if (isCompleted) {
          type = 'completion';
          title = pilotName
            ? `Sector ${sec.sector_code} completed and logged by ${pilotName}`
            : `Sector ${sec.sector_code} completed`;
        } else {
          type = 'sortie';
          title = pilotName
            ? `Sector ${sec.sector_code} flight flown and logged by ${pilotName}`
            : `Sector ${sec.sector_code} flight flown`;
        }

        list.push({
          id: log.id || `log-${sec.sector_code}-${lIdx}`,
          sector_code: sec.sector_code,
          date: dateLabel,
          time: timeStr,
          isoTimestamp: isoTs,
          type,
          title,
        });
      });

      // 2. If sector marked surveyed/completed but has no flight logs recorded yet
      if (flightLogs.length === 0 && (sec.status === 'surveyed' || sec.status === 'completed')) {
        const assignedPilot = ((sec.planning as any)?.assigned_pilot || '').trim();
        list.push({
          id: `sec-completed-${sec.id}`,
          sector_code: sec.sector_code,
          date: 'Completed',
          time: 'Surveyed',
          isoTimestamp: new Date().toISOString(),
          type: 'completion',
          title: assignedPilot
            ? `Sector ${sec.sector_code} completed and logged by ${assignedPilot}`
            : `Sector ${sec.sector_code} completed`,
        });
      }

      // 3. If sector flagged with issue but no flight logs
      if (flightLogs.length === 0 && sec.status === 'flagged') {
        const assignedPilot = ((sec.planning as any)?.assigned_pilot || '').trim();
        list.push({
          id: `sec-flagged-${sec.id}`,
          sector_code: sec.sector_code,
          date: 'Flagged',
          time: 'Issue',
          isoTimestamp: new Date().toISOString(),
          type: 'abort',
          title: assignedPilot
            ? `Sector ${sec.sector_code} issue and logged by ${assignedPilot}`
            : `Sector ${sec.sector_code} issue`,
        });
      }
    });

    // Sort newest timestamp first
    list.sort((a, b) => new Date(b.isoTimestamp).getTime() - new Date(a.isoTimestamp).getTime());
    return list;
  }, [displaySectors]);

  const groupedCapturingEvents = useMemo(() => {
    const groups: Record<string, typeof capturingEvents> = {};
    capturingEvents.forEach((evt) => {
      const key = evt.date;
      if (!groups[key]) groups[key] = [];
      groups[key].push(evt);
    });
    return groups;
  }, [capturingEvents]);

  const handleOpenPilotLog = (secId?: string) => {
    if (displaySectors.length === 0) return;

    let targetId: string | null | undefined = secId;
    if (isPilot) {
      const assignedSecs = displaySectors.filter(isSectorAssignedToUser);
      if (assignedSecs.length > 0) {
        if (secId && assignedSecs.some((s) => s.id === secId)) {
          targetId = secId;
        } else if (selectedSectorCode && assignedSecs.some((s) => s.sector_code === selectedSectorCode)) {
          targetId = assignedSecs.find((s) => s.sector_code === selectedSectorCode)?.id;
        } else {
          targetId = assignedSecs[0].id;
        }
      }
    } else {
      targetId = secId || displaySectors.find((s) => s.sector_code === selectedSectorCode)?.id || displaySectors[0]?.id || null;
    }

    setSelectedPilotSectorId(targetId || null);
    setIsPilotModalOpen(true);
  };

  const toggleLogExpand = (secCode: string) => {
    setExpandedLogs((prev) => ({ ...prev, [secCode]: !prev[secCode] }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {/* ── 3-Column Capturing Grid Layout ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr) minmax(0, 1fr)',
          gap: '1.25rem',
          alignItems: 'stretch',
          minHeight: '620px',
        }}
      >
        {/* ═════════════════════════════════════════════════════════
            COLUMN 1: PROJECT MAP (SECTORS)
        ═════════════════════════════════════════════════════════ */}
        <div
          className="wf-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e4e4e7',
            overflow: 'hidden',
            padding: 0,
          }}
        >
          {/* Main Map Section Top Heading & Actions (matching Stages 1-3 uniform style) */}
          <div
            className="wf-card-header"
            style={{
              padding: '0.85rem 1.25rem',
              margin: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: '#ffffff',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <h2 className="wf-title" style={{ margin: 0 }}>
                Stage 4: Capturing Execution
              </h2>

              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px',
                  backgroundColor: '#f4f4f5',
                  color: '#18181b',
                  border: '1px solid #d4d4d8',
                }}
              >
                {isStage4Completed ? 'Closed & Archived' : 'In Progress'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              {isOpsOrAdmin && (
                <ExpandableHeaderBtn
                  id="btn-upload-kml"
                  icon={<UploadCloud size={14} />}
                  label="Upload KML"
                  onClick={() => setIsUploadKmlModalOpen(true)}
                  title="Upload sectorised KML / KMZ flight plan from GIS"
                  variant="secondary"
                />
              )}

              {isOpsOrAdmin && displaySectors.length > 0 && (
                <ExpandableHeaderBtn
                  id="btn-assign-pilots"
                  icon={<UserPlus size={14} />}
                  label="Assign Pilots"
                  onClick={() => setIsAssignPilotsModalOpen(true)}
                  title="Assign flight sectors to registered pilots or invite new crew"
                  variant="primary"
                />
              )}

              {canLogDailyFlight && displaySectors.length > 0 && (
                <ExpandableHeaderBtn
                  id="btn-update-status"
                  icon={<Plane size={14} />}
                  label="Update status"
                  onClick={() => handleOpenPilotLog()}
                  title="Update sector flight status, flights, and field telemetry"
                  variant="primary"
                />
              )}

              {allSectorsVerified && isOpsOrAdmin && !isStage4Completed && (
                <button
                  type="button"
                  onClick={handleProceedToProcessing}
                  disabled={isAdvancingToProcessing}
                  className="btn btn-primary"
                  style={{
                    height: '32px',
                    padding: '0 0.85rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    border: '1px solid #09090b',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                  title="All sectors completed and verified! Advance project to Stage 5 Processing."
                >
                  <CheckCircle2 size={13} />
                  <span>{isAdvancingToProcessing ? 'Advancing...' : 'Proceed to Next Stage (Processing)'}</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Survey Progress Sub-bar */}
          <div
            style={{
              padding: '0.45rem 1.25rem',
              backgroundColor: '#fafafa',
              borderBottom: '1px solid #f4f4f5',
              fontSize: '0.725rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <span>
              <strong style={{ color: '#09090b' }}>{completedCount} of {displaySectors.length}</strong> Sectors Surveyed ({totalAreaSum} sq km Total AOI)
            </span>

            {plannedTenure && (plannedTenure.expectedStartDate || plannedTenure.expectedEndDate) && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.7rem',
                  color: '#09090b',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid #e4e4e7',
                }}
                title="Planned Survey Flight Window agreed in Section 7 of Planning Form"
              >
                <Calendar size={12} color="#09090b" />
                <span>Planned Flight Window:</span>
                <span style={{ color: '#09090b', fontWeight: 700, fontFamily: 'monospace' }}>
                  {plannedTenure.expectedStartDate || '—'} → {plannedTenure.expectedEndDate || '—'}
                </span>
                {plannedTenure.expectedSurveyDays && (
                  <span style={{ backgroundColor: '#f4f4f5', color: '#52525b', padding: '1px 5px', borderRadius: '3px', fontSize: '0.65rem' }}>
                    {plannedTenure.expectedSurveyDays} Days
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Real-World GIS Satellite Map (Leaflet with Esri World Imagery & Emerald Survey Polygons matching media_4) */}
          <RealWorldProjectMap
            projectId={project?.id}
            project={project}
            sectors={displaySectors}
            selectedSectorCode={selectedSectorCode}
            onSelectSector={(code) => setSelectedSectorCode(code)}
            mapMode={mapMode}
            setMapMode={setMapMode}
            isOpsOrAdmin={isOpsOrAdmin}
            isClient={isClient}
            onOpenUploadKml={() => setIsUploadKmlModalOpen(true)}
          />

          {/* Map Footer Summary Bar */}
          <div
            style={{
              padding: '0.65rem 1rem',
              borderTop: '1px solid #f4f4f5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#fafafa',
              fontSize: '0.78rem',
            }}
          >
            <span style={{ fontWeight: 700, color: '#09090b' }}>
              Sectors ({displaySectors.length})
            </span>
            <span style={{ fontWeight: 700, color: '#09090b' }}>
              Total Area: {totalAreaSum} sq km
            </span>
          </div>

          {/* Dynamic Sector Status Box: shows selected sector details with single flight basis */}
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: '#ffffff',
              borderTop: '1px solid #f4f4f5',
            }}
          >
            {(() => {
              const sec = displaySectors.find((s) => s.sector_code === selectedSectorCode) || displaySectors[0];
              if (!sec) {
                return (
                  <div style={{ fontSize: '0.75rem', color: '#71717a', textAlign: 'center', padding: '0.5rem' }}>
                    No sector telemetry available
                  </div>
                );
              }

              const state = getSectorVisualState(sec, project, isClient);
              const cfg = SECTOR_STYLES[state];
              const isCompleted = state === 'completed' || state === 'delayed_completed';
              const percent = isCompleted ? 100 : (sec.progress_percent || 0);
              const planning = sec.planning || (sec.polygon_coordinates as any)?.planning || {};

              return (
                <div
                  key={sec.sector_code || sec.id}
                  style={{
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                    padding: '0.75rem 0.95rem',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.55rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#09090b' }}>
                        {sec.sector_code}
                      </span>
                      {sec.name && (
                        <span style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 500 }}>
                          • {sec.name}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#f4f4f5',
                          color: '#09090b',
                          border: '1px solid #e4e4e7',
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                        }}
                      >
                        Single Flight Basis
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        backgroundColor: isClient
                          ? (isCompleted ? 'rgba(22, 163, 74, 0.15)' : '#f4f4f5')
                          : cfg.badgeBg,
                        color: isClient
                          ? (isCompleted ? '#16a34a' : '#52525b')
                          : cfg.strokeColor,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: isClient
                          ? (isCompleted ? '1px solid #22c55e' : '1px solid #d4d4d8')
                          : `1px solid ${cfg.badgeBorder}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: isClient
                            ? (isCompleted ? '#16a34a' : '#71717a')
                            : cfg.dotColor,
                        }}
                      />
                      {isClient
                        ? (isCompleted ? 'Completed (100%)' : percent > 0 ? `In Progress (${percent}%)` : 'Pending (0%)')
                        : `${cfg.label} (${percent}%)`}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div
                    style={{
                      width: '100%',
                      height: '5px',
                      backgroundColor: '#e4e4e7',
                      borderRadius: '999px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${percent}%`,
                        height: '100%',
                        backgroundColor: isClient
                          ? (isCompleted ? '#16a34a' : '#71717a')
                          : cfg.fillColor,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.725rem', color: '#71717a', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                      <span>Flight Basis: <strong style={{ color: '#09090b' }}>1 Landing / Day</strong></span>
                      <span>Target Area: <strong style={{ color: '#09090b' }}>{sec.target_area_sqkm} sq km</strong></span>
                      {(planning.scanning_date || planning.planned_start_date) && (
                        <span>
                          Scanning Date:{' '}
                          <strong style={{ color: '#09090b' }}>
                            {planning.scanning_date || planning.planned_start_date}
                          </strong>
                        </span>
                      )}
                      {planning.assigned_pilot && (() => {
                        const isRegistered = Boolean(
                          (planning.assigned_pilot_id && availablePilots?.some((p) => p.id === planning.assigned_pilot_id)) ||
                          (planning.pilot_email && availablePilots?.some((p) => p.email?.toLowerCase() === planning.pilot_email?.toLowerCase())) ||
                          (planning.assigned_pilot && availablePilots?.some((p) => p.name?.toLowerCase() === planning.assigned_pilot?.toLowerCase()))
                        );
                        const isPending = Boolean(planning.is_pending_invite && !isRegistered);
                        return (
                          <span>
                            Pilot:{' '}
                            <strong style={{ color: '#09090b' }}>
                              {planning.assigned_pilot}
                              {isPending ? ' (Pending Invite)' : ''}
                            </strong>
                          </span>
                        );
                      })()}
                    </div>

                    {canLogDailyFlight && isSectorAssignedToUser(sec) && (
                      <button
                        type="button"
                        onClick={() => handleOpenPilotLog(sec.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          backgroundColor: '#09090b',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '5px',
                          padding: '0.3rem 0.65rem',
                          cursor: 'pointer',
                        }}
                      >
                        <Plane size={11} />
                        Update status
                      </button>
                    )}
                  </div>

                  {isOpsOrAdmin && (
                    <div
                      style={{
                        marginTop: '0.25rem',
                        paddingTop: '0.45rem',
                        borderTop: '1px solid #f4f4f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        backgroundColor: '#fbfbfb',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {displaySectors.length > 1 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ fontSize: '0.675rem', fontWeight: 600, color: '#71717a' }}>Switch:</span>
                            <select
                              value={sec.sector_code}
                              onChange={(e) => setSelectedSectorCode(e.target.value)}
                              style={{
                                fontSize: '0.725rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: '1px solid #d4d4d8',
                                backgroundColor: '#ffffff',
                                cursor: 'pointer',
                              }}
                            >
                              {displaySectors.map((s) => (
                                <option key={s.id} value={s.sector_code}>
                                  {s.sector_code} {s.name ? `(${s.name})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Standalone Scanning Date Input */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <Calendar size={13} style={{ color: '#71717a' }} />
                          <span style={{ fontSize: '0.675rem', fontWeight: 600, color: '#71717a' }}>Scan Date:</span>
                          <input
                            type="date"
                            value={planning.scanning_date || planning.planned_start_date || ''}
                            onChange={(e) => handleUpdateSectorDate(sec.id, e.target.value)}
                            disabled={updatingSectorId === sec.id}
                            style={{
                              fontSize: '0.725rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: (() => {
                                const d = planning.scanning_date || planning.planned_start_date || '';
                                if (!d || !plannedTenure) return '1px solid #d4d4d8';
                                const isBefore = Boolean(plannedTenure.expectedStartDate && d < plannedTenure.expectedStartDate);
                                const isAfter = Boolean(plannedTenure.expectedEndDate && d > plannedTenure.expectedEndDate);
                                return (isBefore || isAfter) ? '1px solid #d97706' : '1px solid #d4d4d8';
                              })(),
                              backgroundColor: '#ffffff',
                              cursor: 'pointer',
                            }}
                          />
                          {(() => {
                            const d = planning.scanning_date || planning.planned_start_date || '';
                            if (!d || !plannedTenure) return null;
                            const isBefore = Boolean(plannedTenure.expectedStartDate && d < plannedTenure.expectedStartDate);
                            const isAfter = Boolean(plannedTenure.expectedEndDate && d > plannedTenure.expectedEndDate);
                            if (isBefore || isAfter) {
                              return (
                                <span
                                  title={`Scheduled date (${d}) is outside the planned project window (${plannedTenure.expectedStartDate} to ${plannedTenure.expectedEndDate})`}
                                  style={{
                                    fontSize: '0.625rem',
                                    color: '#b45309',
                                    backgroundColor: '#fef3c7',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    border: '1px solid #fde68a',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                  }}
                                >
                                  <AlertTriangle size={10} color="#d97706" /> Outside Window
                                </span>
                              );
                            }
                            return null;
                          })()}
                          {Boolean(planning.scanning_date || planning.planned_start_date) && (
                            <button
                              type="button"
                              onClick={() => handleUpdateSectorDate(sec.id, '')}
                              disabled={updatingSectorId === sec.id}
                              title="Clear scanning date"
                              style={{
                                fontSize: '0.65rem',
                                color: '#71717a',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                padding: '0 2px',
                              }}
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        {/* Standalone Pilot Selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <User size={13} style={{ color: '#71717a' }} />
                          <span style={{ fontSize: '0.675rem', fontWeight: 600, color: '#71717a' }}>Pilot:</span>
                          <select
                            value={
                              planning.assigned_pilot_id ||
                              availablePilots.find((p) => p.name === planning.assigned_pilot || p.email === planning.pilot_email)?.id ||
                              ''
                            }
                            onChange={(e) => handleUpdateSectorPilot(sec.id, e.target.value)}
                            disabled={updatingSectorId === sec.id}
                            style={{
                              fontSize: '0.725rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid #d4d4d8',
                              backgroundColor: '#ffffff',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="">Unassigned</option>
                            {availablePilots.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                            {planning.assigned_pilot &&
                              !availablePilots.some((p) => p.id === planning.assigned_pilot_id || p.name === planning.assigned_pilot) && (
                                <option value="__custom" disabled>
                                  {planning.assigned_pilot} (Pending / Custom)
                                </option>
                              )}
                          </select>
                        </div>
                      </div>

                      {updatingSectorId === sec.id && (
                        <span style={{ fontSize: '0.675rem', color: '#09090b', fontWeight: 600 }}>Saving...</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            COLUMN 2: CAPTURING TIMELINE (DATE & TIMESTAMP EVENT STREAM)
        ═════════════════════════════════════════════════════════ */}
        <div
          className="wf-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e4e4e7',
            overflow: 'hidden',
            padding: 0,
          }}
        >
          {/* Card Header (matching uniform Stage header style) */}
          <div
            className="wf-card-header"
            style={{
              padding: '0.85rem 1.25rem',
              margin: 0,
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#fafafa',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} color="#09090b" />
              <h3 className="wf-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b', margin: 0 }}>
                Timeline
              </h3>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Field capture events</span>
          </div>

          {/* Timeline Events Stream (Clean & Minimalist) */}
          <div
            style={{
              padding: '1rem',
              overflowY: 'auto',
              maxHeight: '560px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            {Object.keys(groupedCapturingEvents).length === 0 ? (
              <div
                style={{
                  padding: '2.5rem 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  gap: '0.6rem',
                  color: '#71717a',
                  minHeight: '220px',
                }}
              >
                <Clock size={28} strokeWidth={1.5} color="#a1a1aa" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>
                  No Capturing Events Yet
                </span>
                <span style={{ fontSize: '0.72rem', color: '#71717a', maxWidth: '240px', lineHeight: 1.4 }}>
                  Field flight events and logs will appear here as pilots log progress.
                </span>
              </div>
            ) : (
              Object.entries(groupedCapturingEvents).map(([dateLabel, items]) => (
                <div key={dateLabel} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Minimalist Date Divider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#18181b', letterSpacing: '-0.01em' }}>
                      {dateLabel}
                    </span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#f4f4f5' }} />
                    <span style={{ fontSize: '0.68rem', color: '#a1a1aa', fontWeight: 500 }}>
                      {items.length} {items.length === 1 ? 'event' : 'events'}
                    </span>
                  </div>

                  {/* Event list with subtle continuous vertical line */}
                  <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '0.25rem' }}>
                    {items.map((evt, idx) => {
                      const isLast = idx === items.length - 1;

                      // Dynamic node dot color by event type
                      const nodeColor =
                        evt.type === 'completion'
                          ? '#10b981'
                          : evt.type === 'abort'
                          ? '#ef4444'
                          : evt.type === 'issue'
                          ? '#f59e0b'
                          : '#18181b';

                      const nodeGlow =
                        evt.type === 'completion'
                          ? '#a7f3d0'
                          : evt.type === 'abort'
                          ? '#fecaca'
                          : evt.type === 'issue'
                          ? '#fde68a'
                          : '#e4e4e7';

                      return (
                        <div
                          key={evt.id}
                          style={{
                            display: 'flex',
                            gap: '0.75rem',
                            position: 'relative',
                            alignItems: 'flex-start',
                          }}
                        >
                          {/* Timeline Axis Node & Track */}
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              width: '14px',
                              flexShrink: 0,
                              position: 'relative',
                              alignSelf: 'stretch',
                            }}
                          >
                            {/* Minimal Node Dot with event color */}
                            <div
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: nodeColor,
                                marginTop: '5px',
                                flexShrink: 0,
                                boxShadow: `0 0 0 2.5px #ffffff, 0 0 0 3.5px ${nodeGlow}`,
                                zIndex: 2,
                              }}
                            />

                            {/* Connecting Line */}
                            {!isLast && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '13px',
                                  bottom: '0',
                                  width: '1px',
                                  backgroundColor: '#e4e4e7',
                                  zIndex: 1,
                                }}
                              />
                            )}
                          </div>

                          {/* Event Details: Only Sector [number] completed and logged by [pilot name] and time */}
                          <div
                            style={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'baseline',
                              justifyContent: 'space-between',
                              gap: '0.5rem',
                              paddingBottom: isLast ? '0.25rem' : '0.85rem',
                              minWidth: 0,
                            }}
                          >
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#09090b', lineHeight: 1.4 }}>
                              {evt.title}
                            </span>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                color: '#71717a',
                                fontWeight: 500,
                                fontVariantNumeric: 'tabular-nums',
                                flexShrink: 0,
                              }}
                            >
                              {evt.time}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            COLUMN 3: CAPTURING CHAT & STAGE COMMUNICATION
        ═════════════════════════════════════════════════════════ */}
        <div style={{ height: '100%', minHeight: '520px' }}>
          <StageChatBox
            projectId={project?.id || ''}
            stageId={4}
            stageName="Capturing"
            stageStatus={isStage4Completed ? 'completed' : 'active'}
            messages={stageMessages}
            onSendMessage={onSendMessage}
            currentUserName={userName}
            currentUserRole={userRole}
          />
        </div>
      </div>

      {/* ── Pilot Daily Flight Status Modal (Form B) ── */}
      <PilotDailyStatusModal
        isOpen={isPilotModalOpen}
        onClose={() => setIsPilotModalOpen(false)}
        sectors={displaySectors}
        selectedSectorId={selectedPilotSectorId}
        onSaved={() => {
          setIsPilotModalOpen(false);
          onRefresh();
        }}
      />

      {/* ── Ops KML Ingestion Modal ── */}
      <UploadSectorKmlModal
        isOpen={isUploadKmlModalOpen}
        onClose={() => setIsUploadKmlModalOpen(false)}
        projectId={project?.id || ''}
        projectTitle={project?.title || 'Project'}
        onSuccess={() => {
          setIsUploadKmlModalOpen(false);
          onRefresh();
        }}
      />

      {/* ── Ops Assign Pilots to Sectors Modal ── */}
      <AssignPilotsModal
        isOpen={isAssignPilotsModalOpen}
        onClose={() => setIsAssignPilotsModalOpen(false)}
        projectId={project?.id || ''}
        sectors={displaySectors}
        availablePilots={availablePilots}
        plannedTenure={plannedTenure}
        onSuccess={() => {
          if (onSectorsRefresh) onSectorsRefresh();
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
};
