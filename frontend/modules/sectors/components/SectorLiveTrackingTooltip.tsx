'use client';

import React from 'react';
import { Sector } from '../types';
import { Plane, Calendar, Clock, CloudSun, User, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

interface SectorLiveTrackingTooltipProps {
  sector: Sector;
  coords: { x: number; y: number };
  visible: boolean;
}

export const SectorLiveTrackingTooltip: React.FC<SectorLiveTrackingTooltipProps> = ({
  sector,
  coords,
  visible,
}) => {
  if (!visible || !sector) return null;

  const planning = sector.planning || (sector.polygon_coordinates as any)?.planning || {};
  const flightLogs = (sector.flight_logs || (sector.polygon_coordinates as any)?.flight_logs || []) as any[];
  const latestLog = flightLogs.length > 0 ? flightLogs[flightLogs.length - 1] : null;

  const totalArea = sector.target_area_sqkm || planning.target_area_sqkm || 12.4;
  const areaCompleted = sector.area_completed ?? flightLogs.reduce((acc: number, l: any) => acc + (Number(l.area_covered_today) || 0), 0);
  const progressPercent = sector.progress_percent ?? (totalArea > 0 ? Math.min(100, Math.round((areaCompleted / totalArea) * 100)) : 0);

  const plannedSorties = planning.planned_sorties || 6;
  const totalLandings = flightLogs.reduce((acc: number, l: any) => acc + (Number(l.landings_today) || 0), 0);
  const todayLandings = latestLog?.landings_today ?? 0;

  const isCompleted = sector.status === 'completed' || sector.status === 'surveyed' || progressPercent >= 100;
  const isInProgress = sector.status === 'in_progress' || (progressPercent > 0 && !isCompleted);

  const statusLabel = isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Pending';
  const statusColor = isCompleted ? '#09090b' : isInProgress ? '#27272a' : '#71717a';
  const statusBg = isCompleted ? '#f4f4f5' : isInProgress ? '#fafafa' : '#f4f4f5';

  const assignedPilotName = planning.assigned_pilot || planning.assigned_pilots?.[0]?.name || (typeof planning.assigned_pilots?.[0] === 'string' ? planning.assigned_pilots[0] : null) || 'Assigned Crew';
  const assignedDrone = planning.assigned_drone || 'DJI Matrice 300 RTK';

  // Position defensively so it does not overflow viewport
  const leftPos = Math.min(Math.max(coords.x + 12, 10), (typeof window !== 'undefined' ? window.innerWidth - 320 : 600));
  const topPos = Math.max(coords.y - 120, 20);

  return (
    <div
      style={{
        position: 'fixed',
        left: `${leftPos}px`,
        top: `${topPos}px`,
        width: '300px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.16), 0 2px 6px rgba(0, 0, 0, 0.08)',
        border: '1px solid #e4e4e7',
        zIndex: 999999,
        pointerEvents: 'none',
        padding: '0.85rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.45rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b' }}>
            {sector.sector_code || planning.sector_name || 'Sector'}
          </span>
          <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
            ({totalArea} sq km)
          </span>
        </div>
        <span
          style={{
            fontSize: '0.675rem',
            fontWeight: 700,
            padding: '0.15rem 0.45rem',
            borderRadius: '999px',
            backgroundColor: statusBg,
            color: statusColor,
            border: `1px solid ${statusColor}33`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          ● {statusLabel}
        </span>
      </div>

      {/* Progress Bar & Area */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.725rem', marginBottom: '0.25rem' }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Area Coverage Progress</span>
          <span style={{ fontWeight: 800, color: '#09090b' }}>{progressPercent}%</span>
        </div>
        <div className="wf-progress-track" style={{ height: '6px', borderRadius: '3px', backgroundColor: '#f4f4f5' }}>
          <div
            className="wf-progress-fill"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: isCompleted ? '#09090b' : '#09090b',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.675rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          <span>Covered: {areaCompleted.toFixed(1)} km²</span>
          <span>Target: {totalArea} km²</span>
        </div>
      </div>

      {/* Live Operational Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', backgroundColor: '#fafafa', padding: '0.5rem', borderRadius: '6px', border: '1px solid #f4f4f5' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Sorties / Landings</span>
          <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#09090b' }}>
            {todayLandings > 0 ? `${todayLandings} today` : 'No flights today'}
            <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)', fontWeight: 500 }}> ({totalLandings}/{plannedSorties})</span>
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Weather</span>
          <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#09090b', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <CloudSun size={12} color="#09090b" /> {latestLog?.weather_condition || 'Clear / Operational'}
          </span>
        </div>

        {latestLog?.flight_start_time && (
          <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Flight Window</span>
            <span style={{ fontSize: '0.75rem', color: '#09090b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Clock size={11} color="#71717a" /> {latestLog.flight_start_time} → {latestLog.flight_end_time || 'Active Flight'}
            </span>
          </div>
        )}
      </div>

      {/* Assigned Pilot & Hardware */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <User size={12} color="#71717a" />
          <span>Pilot: <strong style={{ color: '#09090b' }}>{assignedPilotName}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Plane size={12} color="#71717a" />
          <span>Drone: <strong style={{ color: '#09090b' }}>{assignedDrone}</strong></span>
        </div>
      </div>

      {/* Latest Remarks Quote */}
      {latestLog?.remarks && (
        <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: '0.35rem', fontSize: '0.685rem', color: '#52525b', fontStyle: 'italic' }}>
          &ldquo;{latestLog.remarks}&rdquo;
        </div>
      )}

      {/* Timestamp Footer */}
      <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: '0.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
        <span>Live Telemetry</span>
        <span>{latestLog?.timestamp ? new Date(latestLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ready'}</span>
      </div>
    </div>
  );
};
