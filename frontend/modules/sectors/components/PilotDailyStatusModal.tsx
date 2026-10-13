'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Plane, Sun, Wind, CloudRain, AlertTriangle, AlertCircle, Calendar } from 'lucide-react';
import { Portal } from '@/components/Portal';
import { useAuth } from '@/lib/auth';
import { Sector, SectorDailyLogCreate } from '../types';
import { sectorApi } from '../api';
import { formatDateDDMMYYYY } from '@/lib/date';

interface PilotDailyStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectors: Sector[];
  selectedSectorId?: string | null;
  onSaved: () => void;
}

export const PilotDailyStatusModal: React.FC<PilotDailyStatusModalProps> = ({
  isOpen,
  onClose,
  sectors = [],
  selectedSectorId,
  onSaved,
}) => {
  const { user: currentUser } = useAuth();
  const isPilot = currentUser?.role?.toLowerCase() === 'pilot';

  const [currentSectorId, setCurrentSectorId] = useState<string>('');
  const [logDate, setLogDate] = useState<string>('');
  const [landingsToday, setLandingsToday] = useState<number | ''>(1);
  const [startTime, setStartTime] = useState<string>('09:30');
  const [endTime, setEndTime] = useState<string>('14:00');
  const [areaCoveredToday, setAreaCoveredToday] = useState<string>('');
  const [sectorStatus, setSectorStatus] = useState<'in_progress' | 'completed'>('in_progress');
  const [weatherCondition, setWeatherCondition] = useState<string>('Clear');
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Natural numeric sort so S1, S2 ... S9, S10 ... S100 appear in correct numerical sequence.
  // If user is a Pilot, strictly filter to only sectors assigned to them.
  // Natural numeric sort so S1, S2 ... S9, S10 ... S100 appear in correct numerical sequence.
  // If user is a Pilot, strictly filter to only sectors assigned to them.
  const sortedSectors = React.useMemo(() => {
    let list = [...sectors];
    if (isPilot && currentUser) {
      const myId = String(currentUser.id || '');
      const myEmail = (currentUser.email || '').trim().toLowerCase();
      const myName = (currentUser.full_name || '').trim().toLowerCase();

      list = list.filter((s) => {
        const coords = (s.polygon_coordinates as any) || {};
        const pl = s.planning || coords.planning || {};
        const assignedId = pl.assigned_pilot_id ? String(pl.assigned_pilot_id) : '';
        const pilotEmail = (pl.pilot_email || '').trim().toLowerCase();
        const assignedName = (pl.assigned_pilot || '').trim().toLowerCase();

        if (
          (assignedId && myId && assignedId === myId) ||
          (pilotEmail && myEmail && pilotEmail === myEmail) ||
          (assignedName && myName && (assignedName === myName || myName.includes(assignedName) || assignedName.includes(myName)))
        ) {
          return true;
        }

        if (Array.isArray(pl.assigned_pilots)) {
          return pl.assigned_pilots.some((p: any) => {
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
      });
    }

    return list.sort((a, b) =>
      (a.sector_code || '').localeCompare(b.sector_code || '', undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    );
  }, [sectors, isPilot, currentUser]);

  useEffect(() => {
    if (isOpen) {
      const todayStr = new Date().toISOString().split('T')[0];
      setLogDate(todayStr);

      const eligibleSectors = sortedSectors;
      const initialSectorId =
        selectedSectorId && eligibleSectors.some((s) => s.id === selectedSectorId)
          ? selectedSectorId
          : eligibleSectors.length > 0
          ? eligibleSectors[0].id
          : '';

      setCurrentSectorId(initialSectorId);
      setLandingsToday(1);
      setStartTime('09:30');
      setEndTime('14:00');
      setWeatherCondition('Clear');
      setSectorStatus('completed');
      setRemarks('');
      setErrorMsg(null);

      // Default area suggestion from target area without rounding constraints
      const sec = eligibleSectors.find((s) => s.id === initialSectorId);
      if (sec?.target_area_sqkm != null) {
        setAreaCoveredToday(String(sec.target_area_sqkm));
      } else {
        setAreaCoveredToday('');
      }
    }
  }, [isOpen, selectedSectorId, sortedSectors]);

  // Safeguard: Ensure currentSectorId always matches an available sector in sortedSectors
  useEffect(() => {
    if (sortedSectors.length > 0 && (!currentSectorId || !sortedSectors.some((s) => s.id === currentSectorId))) {
      const nextId = sortedSectors[0].id;
      setCurrentSectorId(nextId);
      if (sortedSectors[0].target_area_sqkm != null) {
        setAreaCoveredToday(String(sortedSectors[0].target_area_sqkm));
      }
    }
  }, [sortedSectors, currentSectorId]);

  if (!isOpen) return null;

  const currentSector = sortedSectors.find((s) => s.id === currentSectorId) || sectors.find((s) => s.id === currentSectorId);
  const currentCoords = (currentSector?.polygon_coordinates as any) || {};
  const currentPlanning = currentSector?.planning || currentCoords.planning || {};
  const scheduledScanDate = (currentPlanning.scanning_date || currentPlanning.planned_start_date || '').trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSectorId) {
      setErrorMsg('Please select a sector');
      return;
    }
    if (landingsToday === '' || Number(landingsToday) < 0) {
      setErrorMsg('Please enter a valid count of landings completed today');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const parsedArea = areaCoveredToday.trim() !== '' ? parseFloat(areaCoveredToday) : 0;
      const normalizedStatus = sectorStatus === 'completed' ? 'surveyed' : sectorStatus;
      const payload: SectorDailyLogCreate = {
        date: logDate,
        landings_today: Number(landingsToday),
        flight_start_time: startTime || undefined,
        flight_end_time: endTime || undefined,
        area_covered_today: isNaN(parsedArea) ? 0 : parsedArea,
        sector_status: normalizedStatus as any,
        weather_condition: weatherCondition,
        remarks: remarks.trim() || undefined,
      };

      await sectorApi.addSectorDailyLog(currentSectorId, payload);
      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Failed to submit pilot daily status:', err);
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d: any) => `${d.loc ? d.loc.slice(-1)[0] : 'field'}: ${d.msg}`).join(', ')
        : typeof detail === 'string'
        ? detail
        : err.message || 'Failed to submit flight status log';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 100% Monochrome 2D wireframe vector icons — NO emojis, NO colorful 3D graphics
  const weatherOptions = [
    { label: 'Clear', icon: Sun },
    { label: 'Windy', icon: Wind },
    { label: 'Rain-delayed', icon: CloudRain },
    { label: 'Aborted', icon: AlertTriangle },
  ];

  return (
    <Portal>
      <div
        className="viewport-modal-backdrop"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1rem',
        }}
        onClick={onClose}
      >
        <div
          className="wf-modal"
          style={{
            width: '100%',
            maxWidth: '520px',
            backgroundColor: '#ffffff',
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.12)',
            border: '1px solid #18181b',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '0.85rem 1.25rem',
              borderBottom: '1px solid #e4e4e7',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#fafafa',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  border: '1px solid #09090b',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#ffffff',
                }}
              >
                <Plane size={15} strokeWidth={2} color="#09090b" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#09090b', letterSpacing: '-0.01em' }}>
                  Pilot Daily Status &amp; Flight Log
                </h3>
                <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
                  Per-visit capture log &amp; daily telemetry update
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'none',
                border: 'none',
                color: '#71717a',
                cursor: 'pointer',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
              }}
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {errorMsg && (
                <div
                  style={{
                    padding: '0.55rem 0.75rem',
                    backgroundColor: '#fafafa',
                    border: '1px solid #09090b',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    color: '#09090b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <AlertCircle size={14} strokeWidth={2} color="#09090b" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Row 1: Sector Selection & Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.85rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 600, color: '#09090b', marginBottom: '0.25rem' }}>
                    Assigned Sector *
                  </label>
                  {sortedSectors.length === 0 ? (
                    <div
                      style={{
                        padding: '0.45rem 0.65rem',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #f87171',
                        borderRadius: '4px',
                        fontSize: '0.725rem',
                        color: '#991b1b',
                        lineHeight: 1.3,
                      }}
                    >
                      No sectors are assigned to your pilot account for this project.
                    </div>
                  ) : sortedSectors.length > 1 ? (
                    <select
                      className="form-input"
                      value={currentSectorId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        setCurrentSectorId(newId);
                        const match = sortedSectors.find((s) => s.id === newId);
                        if (match?.target_area_sqkm != null) {
                          setAreaCoveredToday(String(match.target_area_sqkm));
                        }
                      }}
                      required
                      style={{ fontSize: '0.8rem', borderRadius: '4px', borderColor: '#d4d4d8' }}
                    >
                      {sortedSectors.map((sec) => {
                        const coords = (sec.polygon_coordinates as any) || {};
                        const pl = sec.planning || coords.planning || {};
                        const dateStr = (pl.scanning_date || pl.planned_start_date || '').trim();
                        return (
                          <option key={sec.id} value={sec.id}>
                            {sec.sector_code} ({sec.target_area_sqkm || 0} sq km){dateStr ? ` — 📅 ${formatDateDDMMYYYY(dateStr)}` : ''} — {sec.status}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="form-input"
                      value={`${sortedSectors[0].sector_code} (${sortedSectors[0].target_area_sqkm || 0} sq km)${scheduledScanDate ? ` — 📅 ${formatDateDDMMYYYY(scheduledScanDate)}` : ''} — ${sortedSectors[0].status}`}
                      readOnly
                      style={{ fontSize: '0.8rem', backgroundColor: '#fafafa', borderRadius: '4px', borderColor: '#d4d4d8' }}
                    />
                  )}
                  <span style={{ fontSize: '0.675rem', color: '#71717a', marginTop: '0.2rem', display: 'block' }}>
                    1 flight / landing completes sector
                  </span>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 600, color: '#09090b', margin: 0 }}>
                      Flight Date *
                    </label>
                    {scheduledScanDate && (
                      <span style={{ fontSize: '0.65rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Calendar size={10} color="#71717a" />
                        Target: <strong style={{ color: '#09090b' }}>{formatDateDDMMYYYY(scheduledScanDate)}</strong>
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    className="form-input"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    required
                    style={{ fontSize: '0.8rem', borderRadius: '4px', borderColor: '#d4d4d8' }}
                  />
                  {scheduledScanDate && logDate !== scheduledScanDate && (
                    <div style={{ marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontSize: '0.65rem', color: '#71717a' }}>Scheduled for {formatDateDDMMYYYY(scheduledScanDate)}</span>
                      <button
                        type="button"
                        onClick={() => setLogDate(scheduledScanDate)}
                        style={{
                          fontSize: '0.625rem',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          backgroundColor: '#f4f4f5',
                          border: '1px solid #d4d4d8',
                          color: '#09090b',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        Set to Scheduled Date
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Landings Completed & Area Covered */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 600, color: '#09090b', marginBottom: '0.25rem' }}>
                    Landings Completed Today *
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={landingsToday}
                    onChange={(e) => setLandingsToday(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Count of landings"
                    required
                    style={{ fontSize: '0.8rem', borderRadius: '4px', borderColor: '#d4d4d8' }}
                  />
                  <span style={{ fontSize: '0.675rem', color: '#71717a', marginTop: '0.2rem', display: 'block' }}>
                    Number of flights flown
                  </span>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 600, color: '#09090b', marginBottom: '0.25rem' }}>
                    Area Covered Today (sq km)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="form-input"
                    value={areaCoveredToday}
                    onChange={(e) => setAreaCoveredToday(e.target.value)}
                    placeholder="Enter area (e.g. 1.14)"
                    style={{ fontSize: '0.8rem', borderRadius: '4px', borderColor: '#d4d4d8' }}
                  />
                  <span style={{ fontSize: '0.675rem', color: '#71717a', marginTop: '0.2rem', display: 'block' }}>
                    Cumulative capture estimate
                  </span>
                </div>
              </div>

              {/* Row 3: Flight Start & End Times */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 600, color: '#09090b', marginBottom: '0.25rem' }}>
                    Flight Start Time
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={{ fontSize: '0.8rem', borderRadius: '4px', borderColor: '#d4d4d8' }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 600, color: '#09090b', marginBottom: '0.25rem' }}>
                    Flight End Time
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    style={{ fontSize: '0.8rem', borderRadius: '4px', borderColor: '#d4d4d8' }}
                  />
                </div>
              </div>

              {/* Row 4: Weather Condition Chips (Pure Monochrome 2D Outline Icons) */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 600, color: '#09090b', marginBottom: '0.35rem', display: 'block' }}>
                  Weather Condition
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {weatherOptions.map((opt) => {
                    const isSelected = weatherCondition === opt.label;
                    const IconComponent = opt.icon;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setWeatherCondition(opt.label)}
                        style={{
                          padding: '0.4rem 0.85rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: isSelected ? 700 : 500,
                          backgroundColor: isSelected ? '#09090b' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#27272a',
                          border: isSelected ? '1px solid #09090b' : '1px solid #d4d4d8',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <IconComponent
                          size={13}
                          strokeWidth={isSelected ? 2.2 : 1.75}
                          color={isSelected ? '#ffffff' : '#52525b'}
                        />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 5: Sector Status Toggle (Wireframe Card Radio Selector) */}
              <div
                style={{
                  margin: 0,
                  backgroundColor: '#ffffff',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  border: '1px solid #e4e4e7',
                }}
              >
                <label
                  className="form-label"
                  style={{ fontSize: '0.72rem', fontWeight: 600, color: '#09090b', marginBottom: '0.45rem', display: 'block' }}
                >
                  Sector Status Update
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div
                    onClick={() => setSectorStatus('in_progress')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') setSectorStatus('in_progress');
                    }}
                    style={{
                      border: sectorStatus === 'in_progress' ? '1px solid #09090b' : '1px solid #e4e4e7',
                      backgroundColor: sectorStatus === 'in_progress' ? '#fafafa' : '#ffffff',
                      borderRadius: '4px',
                      padding: '0.6rem 0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.55rem',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        border: sectorStatus === 'in_progress' ? '4.5px solid #09090b' : '1.5px solid #a1a1aa',
                        backgroundColor: '#ffffff',
                        flexShrink: 0,
                        boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: sectorStatus === 'in_progress' ? 700 : 500, color: '#09090b' }}>
                        In Progress
                      </span>
                      <span style={{ fontSize: '0.675rem', color: '#71717a' }}>
                        More flights scheduled
                      </span>
                    </div>
                  </div>

                  <div
                    onClick={() => setSectorStatus('completed')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') setSectorStatus('completed');
                    }}
                    style={{
                      border: sectorStatus === 'completed' ? '1px solid #09090b' : '1px solid #e4e4e7',
                      backgroundColor: sectorStatus === 'completed' ? '#fafafa' : '#ffffff',
                      borderRadius: '4px',
                      padding: '0.6rem 0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.55rem',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        border: sectorStatus === 'completed' ? '4.5px solid #09090b' : '1.5px solid #a1a1aa',
                        backgroundColor: '#ffffff',
                        flexShrink: 0,
                        boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: sectorStatus === 'completed' ? 700 : 500, color: '#09090b' }}>
                        Mark as Completed
                      </span>
                      <span style={{ fontSize: '0.675rem', color: '#71717a' }}>
                        Survey finished
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 6: Field Remarks */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 600, color: '#09090b', marginBottom: '0.25rem', display: 'block' }}>
                  Pilot Field Remarks (Delays, Issues, Notes)
                </label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Completed 3 flights without GPS interference. Battery cycles healthy. Sector 1 north perimeter clear."
                  style={{ fontSize: '0.8rem', resize: 'vertical', borderRadius: '4px', borderColor: '#d4d4d8' }}
                />
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '0.75rem 1.25rem',
                borderTop: '1px solid #e4e4e7',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.5rem',
                backgroundColor: '#fafafa',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '4px',
                  border: '1px solid #d4d4d8',
                  backgroundColor: '#ffffff',
                  color: '#09090b',
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || sortedSectors.length === 0}
                style={{
                  padding: '0.45rem 1.1rem',
                  borderRadius: '4px',
                  border: '1px solid #09090b',
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: (isSubmitting || sortedSectors.length === 0) ? 'not-allowed' : 'pointer',
                  opacity: sortedSectors.length === 0 ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease',
                }}
              >
                {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} strokeWidth={2} />}
                {isSubmitting ? 'Logging...' : 'Submit Flight Log'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
};
