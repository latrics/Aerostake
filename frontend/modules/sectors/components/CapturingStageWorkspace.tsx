'use client';

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
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
} from 'lucide-react';
import { Sector } from '../types';
import { isLatricsRole } from '@/lib/role';
import { StageChatBox, StageChatMessage } from '@/modules/projects/components/StageChatBox';
import { PilotDailyStatusModal } from './PilotDailyStatusModal';

interface CapturingStageWorkspaceProps {
  project: any;
  sectors: Sector[];
  onRefresh: () => void;
  availablePilots?: Array<{ id: string; name: string; email?: string }>;
  availableDrones?: string[];
  userRole?: string;
  userName?: string;
  stageMessages: StageChatMessage[];
  onSendMessage: (text: string, attachments?: { name: string; size?: string }[]) => Promise<void>;
}

// Dynamic SVG layout calculator for real sectors that lack hardcoded SVG points
function getSectorGeometry(sec: Sector, index: number, total: number) {
  const coords = (sec.polygon_coordinates as any) || {};
  if (coords.points && coords.label_pos) {
    return { points: coords.points, label_pos: coords.label_pos };
  }
  const safeTotal = Math.max(1, total);
  const cols = safeTotal <= 1 ? 1 : safeTotal <= 4 ? 2 : 3;
  const rows = Math.ceil(safeTotal / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);

  const padX = 25;
  const padY = 25;
  const cellW = (500 - padX * 2) / cols;
  const cellH = (320 - padY * 2) / rows;

  const gap = 10;
  const x1 = Math.round(padX + col * cellW + gap);
  const y1 = Math.round(padY + row * cellH + gap);
  const x2 = Math.round(padX + (col + 1) * cellW - gap);
  const y2 = Math.round(padY + (row + 1) * cellH - gap);

  const points = `${x1},${y1} ${x2},${y1} ${x2},${y2} ${x1},${y2}`;
  const label_pos = { x: Math.round((x1 + x2) / 2), y: Math.round((y1 + y2) / 2) };
  return { points, label_pos };
}

export const CapturingStageWorkspace: React.FC<CapturingStageWorkspaceProps> = ({
  project,
  sectors = [],
  onRefresh,
  availablePilots = [],
  availableDrones = [],
  userRole = 'client',
  userName = 'User',
  stageMessages = [],
  onSendMessage,
}) => {
  const [mapMode, setMapMode] = useState<'satellite' | 'map'>('satellite');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedSectorCode, setSelectedSectorCode] = useState<string>('');
  const [isPilotModalOpen, setIsPilotModalOpen] = useState<boolean>(false);
  const [selectedPilotSectorId, setSelectedPilotSectorId] = useState<string | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  const isPilot = userRole?.toLowerCase() === 'pilot';
  const isStage4Completed =
    project?.status?.toLowerCase() === 'completed' ||
    (sectors.length > 0 && sectors.every((sec) => sec.status === 'completed'));
  const canLogDailyFlight = !isStage4Completed && (isPilot || userRole === 'admin' || userRole === 'operations');

  // Normalize live backend sectors strictly from the backend prop with 0 seeded/mock items
  const displaySectors: Sector[] = useMemo(() => {
    if (!sectors || sectors.length === 0) return [];

    return sectors.map((sec) => {
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
          : Number(coveredArea.toFixed(2));

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
    });
  }, [sectors]);

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
    return Number(sum.toFixed(1));
  }, [displaySectors]);

  const completedCount = useMemo(() => {
    return displaySectors.filter(
      (s) => s.status === 'completed' || s.status === 'surveyed' || (s.progress_percent || 0) >= 100
    ).length;
  }, [displaySectors]);

  // Extract all capturing timeline events strictly from real flight logs recorded on sectors
  const capturingEvents = useMemo(() => {
    const list: Array<{
      id: string;
      sector_code: string;
      date: string;
      time: string;
      isoTimestamp: string;
      title: string;
      description: string;
      landings?: number;
      area_covered?: number;
      weather?: string;
    }> = [];

    displaySectors.forEach((sec) => {
      const flightLogs = (sec.flight_logs || (sec.polygon_coordinates as any)?.flight_logs || []) as any[];
      flightLogs.forEach((log: any, lIdx: number) => {
        const rawDate = log.date || new Date().toISOString().split('T')[0];
        let dateLabel = rawDate;
        if (rawDate.includes('-')) {
          const parts = rawDate.split('-');
          if (parts.length === 3) {
            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            dateLabel = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          }
        }

        const timeStr = log.flight_end_time || log.flight_start_time || '12:00';
        const isoTs = `${rawDate}T${timeStr.includes(':') ? timeStr : `${timeStr}:00`}:00Z`;
        const landings = Number(log.landings_today) || 1;

        list.push({
          id: log.id || `log-${sec.sector_code}-${lIdx}`,
          sector_code: sec.sector_code,
          date: dateLabel,
          time: timeStr,
          isoTimestamp: isoTs,
          title: `Sector ${sec.sector_code}: ${landings} ${landings === 1 ? 'Sortie' : 'Sorties'} Completed`,
          description:
            log.remarks ||
            (log.area_covered_today ? `${log.area_covered_today} sq km covered.` : 'Sortie completed successfully.'),
          landings,
          area_covered: log.area_covered_today,
          weather: log.weather_condition,
        });
      });
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
    setSelectedPilotSectorId(secId || displaySectors[0]?.id || null);
    setIsPilotModalOpen(true);
  };

  const toggleLogExpand = (secCode: string) => {
    setExpandedLogs((prev) => ({ ...prev, [secCode]: !prev[secCode] }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {/* ── Subheader Action Bar ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          backgroundColor: '#ffffff',
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          border: '1px solid #e4e4e7',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="#09090b" />
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b' }}>
              Stage 4: Capturing Execution
            </span>
          </div>

          {isStage4Completed ? (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                backgroundColor: '#f4f4f5',
                color: '#09090b',
                border: '1px solid #d4d4d8',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <CheckCircle2 size={12} />
              Completed &amp; Sealed
            </span>
          ) : (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                backgroundColor: '#f4f4f5',
                color: '#09090b',
                border: '1px solid #d4d4d8',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#09090b',
                  display: 'inline-block',
                }}
              />
              In Progress
            </span>
          )}

          <span style={{ fontSize: '0.8rem', color: '#71717a' }}>
            {completedCount} of {displaySectors.length} Sectors Surveyed ({totalAreaSum} sq km Total AOI)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {canLogDailyFlight && displaySectors.length > 0 && (
            <button
              onClick={() => handleOpenPilotLog()}
              className="btn btn-primary"
              style={{
                fontSize: '0.75rem',
                height: '32px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontWeight: 700,
                backgroundColor: '#09090b',
                color: '#ffffff',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                padding: '0 0.85rem',
              }}
              title="Update sector flight status, sorties, and field telemetry"
            >
              <Plane size={13} />
              Update Sector Status
            </button>
          )}
        </div>
      </div>

      {/* ── 3-Column Capturing Grid Layout ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.25fr 1fr 1fr',
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
          }}
        >
          {/* Card Header & Controls */}
          <div
            style={{
              padding: '0.85rem 1.15rem',
              borderBottom: '1px solid #f4f4f5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#fafafa',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Compass size={16} color="#09090b" />
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                Project Map
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Satellite / Map Pill Switcher */}
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#e4e4e7',
                  borderRadius: '6px',
                  padding: '2px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                }}
              >
                <button
                  onClick={() => setMapMode('satellite')}
                  style={{
                    padding: '3px 8px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: mapMode === 'satellite' ? '#ffffff' : 'transparent',
                    color: mapMode === 'satellite' ? '#09090b' : '#71717a',
                    fontWeight: mapMode === 'satellite' ? 700 : 500,
                    cursor: 'pointer',
                    boxShadow: mapMode === 'satellite' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Satellite
                </button>
                <button
                  onClick={() => setMapMode('map')}
                  style={{
                    padding: '3px 8px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: mapMode === 'map' ? '#ffffff' : 'transparent',
                    color: mapMode === 'map' ? '#09090b' : '#71717a',
                    fontWeight: mapMode === 'map' ? 700 : 500,
                    cursor: 'pointer',
                    boxShadow: mapMode === 'map' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Map
                </button>
              </div>

              {/* Zoom Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(z + 0.15, 1.6))}
                  style={{
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #d4d4d8',
                    borderRadius: '4px',
                    backgroundColor: '#ffffff',
                    color: '#09090b',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  onClick={() => setZoomLevel((z) => Math.max(z - 0.15, 0.85))}
                  style={{
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #d4d4d8',
                    borderRadius: '4px',
                    backgroundColor: '#ffffff',
                    color: '#09090b',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Zoom Out"
                >
                  -
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Map Visual Area */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '310px',
              backgroundColor: mapMode === 'satellite' ? '#09090b' : '#fafafa',
              backgroundImage:
                mapMode === 'satellite'
                  ? 'radial-gradient(ellipse at 40% 40%, #18181b 0%, #09090b 100%)'
                  : 'linear-gradient(to right, #f4f4f5 1px, transparent 1px), linear-gradient(to bottom, #f4f4f5 1px, transparent 1px)',
              backgroundSize: mapMode === 'satellite' ? 'cover' : '24px 24px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
            }}
          >
            {/* Subtle Satellite terrain features if in satellite mode */}
            {mapMode === 'satellite' && (
              <svg
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.18, pointerEvents: 'none' }}
              >
                <path d="M 10,60 Q 90,140 210,100 T 450,80" fill="none" stroke="#09090b" strokeWidth="6" />
                <path d="M 40,280 Q 180,210 320,240 T 480,180" fill="none" stroke="#09090b" strokeWidth="8" />
                <path d="M 160,20 Q 240,160 200,300" fill="none" stroke="#18181b" strokeWidth="4" />
                <circle cx="280" cy="180" r="45" fill="#18181b" opacity="0.3" />
              </svg>
            )}

            {/* SVG Polygon Canvas */}
            {displaySectors.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  color: mapMode === 'satellite' ? '#a1a1aa' : '#71717a',
                  textAlign: 'center',
                  padding: '2rem 1.5rem',
                  zIndex: 2,
                }}
              >
                <Compass size={36} strokeWidth={1.5} color={mapMode === 'satellite' ? '#71717a' : '#a1a1aa'} />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: mapMode === 'satellite' ? '#e4e4e7' : '#09090b' }}>
                  No Flight Sectors Defined
                </span>
                <span style={{ fontSize: '0.75rem', color: mapMode === 'satellite' ? '#a1a1aa' : '#71717a', maxWidth: '280px' }}>
                  Sectors will appear here once flight grids are configured in operational planning.
                </span>
              </div>
            ) : (
              <svg
                viewBox="0 0 500 320"
                style={{
                  width: '100%',
                  height: '100%',
                  transform: `scale(${zoomLevel})`,
                  transition: 'transform 0.2s ease',
                }}
              >
                {displaySectors.map((sec, idx) => {
                  const { points, label_pos: labelPos } = getSectorGeometry(sec, idx, displaySectors.length);

                  const isCompleted = sec.status === 'completed' || sec.status === 'surveyed' || (sec.progress_percent || 0) >= 100;
                  const isInProgress = sec.status === 'in_progress' || ((sec.progress_percent || 0) > 0 && !isCompleted);
                  const isSelected = selectedSectorCode === sec.sector_code;

                  // Color schemes matching design screenshot
                  let fillColor = 'rgba(0, 0, 0, 0.08)'; // Pending
                  let strokeColor = '#71717a';

                  if (isCompleted) {
                    fillColor = isSelected ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.2)';
                    strokeColor = '#09090b';
                  } else if (isInProgress) {
                    fillColor = isSelected ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.12)';
                    strokeColor = '#27272a';
                  } else if (isSelected) {
                    fillColor = 'rgba(0, 0, 0, 0.12)';
                    strokeColor = '#09090b';
                  }

                  return (
                    <g
                      key={sec.sector_code || sec.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedSectorCode(sec.sector_code)}
                    >
                      <polygon
                        points={points}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={isSelected ? '2.5' : '1.5'}
                        strokeDasharray={!isCompleted && !isInProgress ? '4 3' : 'none'}
                        style={{ transition: 'all 0.15s ease' }}
                      />

                      {/* Sector Code Label */}
                      <text
                        x={labelPos.x}
                        y={labelPos.y - 4}
                        fill="#ffffff"
                        fontSize="14"
                        fontWeight="800"
                        textAnchor="middle"
                        style={{
                          textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9)',
                          pointerEvents: 'none',
                        }}
                      >
                        {sec.sector_code}
                      </text>

                      {/* Sector Area Subtext Label */}
                      {sec.target_area_sqkm ? (
                        <text
                          x={labelPos.x}
                          y={labelPos.y + 11}
                          fill="#e4e4e7"
                          fontSize="10"
                          fontWeight="600"
                          textAnchor="middle"
                          style={{
                            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                            pointerEvents: 'none',
                          }}
                        >
                          {sec.target_area_sqkm} sq km
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

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

              const isCompleted = sec.status === 'completed' || sec.status === 'surveyed' || (sec.progress_percent || 0) >= 100;
              const isInProgress = sec.status === 'in_progress' || ((sec.progress_percent || 0) > 0 && !isCompleted);
              const percent = isCompleted ? 100 : (sec.progress_percent || 0);
              const planning = sec.planning || (sec.polygon_coordinates as any)?.planning || {};

              const badgeBg = isCompleted ? '#ecfdf5' : isInProgress ? '#f4f4f5' : '#f4f4f5';
              const badgeColor = isCompleted ? '#047857' : isInProgress ? '#09090b' : '#71717a';
              const barColor = isCompleted ? '#09090b' : isInProgress ? '#09090b' : '#d4d4d8';

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
                        backgroundColor: badgeBg,
                        color: badgeColor,
                        padding: '1px 7px',
                        borderRadius: '4px',
                        border: isCompleted ? '1px solid #a7f3d0' : '1px solid #e4e4e7',
                      }}
                    >
                      {isCompleted ? 'Completed (100%)' : `${percent}%`}
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
                        backgroundColor: barColor,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.725rem', color: '#71717a', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                      <span>Flight Basis: <strong style={{ color: '#09090b' }}>1 Landing / Day</strong></span>
                      <span>Target Area: <strong style={{ color: '#09090b' }}>{sec.target_area_sqkm} sq km</strong></span>
                      {planning.assigned_pilot && (
                        <span>Pilot: <strong style={{ color: '#09090b' }}>{planning.assigned_pilot}</strong></span>
                      )}
                    </div>

                    {canLogDailyFlight && (
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
                        Update Sector Status
                      </button>
                    )}
                  </div>
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
          }}
        >
          {/* Card Header (Events stream only, no log input) */}
          <div
            style={{
              padding: '0.85rem 1.15rem',
              borderBottom: '1px solid #f4f4f5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#fafafa',
            }}
          >
            <div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b', margin: 0 }}>
                Timeline
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#a1a1aa', margin: 0, marginTop: '2px' }}>
                Field capture events &amp; flight timestamps
              </p>
            </div>
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
                  Field flight events and sorties will appear here as pilots log progress.
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

                      return (
                        <div
                          key={evt.id}
                          style={{
                            display: 'flex',
                            gap: '0.75rem',
                            position: 'relative',
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
                            }}
                          >
                            {/* Minimal Node Dot */}
                            <div
                              style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                backgroundColor: '#18181b',
                                marginTop: '5px',
                                flexShrink: 0,
                                boxShadow: '0 0 0 2.5px #ffffff, 0 0 0 3.5px #e4e4e7',
                                zIndex: 2,
                              }}
                            />

                            {/* Connecting Line */}
                            {!isLast && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '12px',
                                  bottom: '0',
                                  width: '1px',
                                  backgroundColor: '#e4e4e7',
                                  zIndex: 1,
                                }}
                              />
                            )}
                          </div>

                          {/* Event Details: Main Context Only */}
                          <div
                            style={{
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              paddingBottom: isLast ? '0.35rem' : '0.95rem',
                            }}
                          >
                            {/* Title & Integrated Timestamp */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'baseline',
                                justifyContent: 'space-between',
                                gap: '0.5rem',
                              }}
                            >
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#09090b', lineHeight: 1.35 }}>
                                {evt.title}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  color: '#a1a1aa',
                                  fontWeight: 500,
                                  fontVariantNumeric: 'tabular-nums',
                                  flexShrink: 0,
                                }}
                              >
                                {evt.time}
                              </span>
                            </div>
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
    </div>
  );
};
