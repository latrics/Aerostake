'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, CheckCircle2, CloudSun, AlertCircle, Save, Loader2, Plane } from 'lucide-react';
import { Portal } from '@/components/Portal';
import { Sector, SectorDailyLogCreate } from '../types';
import { sectorApi } from '../api';

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
  const [currentSectorId, setCurrentSectorId] = useState<string>('');
  const [logDate, setLogDate] = useState<string>('');
  const [landingsToday, setLandingsToday] = useState<number | ''>(1);
  const [startTime, setStartTime] = useState<string>('09:30');
  const [endTime, setEndTime] = useState<string>('14:00');
  const [areaCoveredToday, setAreaCoveredToday] = useState<number | ''>('');
  const [sectorStatus, setSectorStatus] = useState<'in_progress' | 'completed'>('in_progress');
  const [weatherCondition, setWeatherCondition] = useState<string>('Clear');
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const todayStr = new Date().toISOString().split('T')[0];
      setLogDate(todayStr);

      if (selectedSectorId && sectors.some((s) => s.id === selectedSectorId)) {
        setCurrentSectorId(selectedSectorId);
      } else if (sectors.length > 0) {
        setCurrentSectorId(sectors[0].id);
      }
      setLandingsToday(1);
      setStartTime('09:30');
      setEndTime('14:00');
      setWeatherCondition('Clear');
      setSectorStatus('completed');
      setRemarks('');
      setErrorMsg(null);

      // Default area suggestion: 100% of target area for single landing sector completion
      const sec = sectors.find((s) => s.id === (selectedSectorId || sectors[0]?.id));
      if (sec?.target_area_sqkm) {
        setAreaCoveredToday(Number(sec.target_area_sqkm));
      } else {
        setAreaCoveredToday(5.0);
      }
    }
  }, [isOpen, selectedSectorId, sectors]);

  if (!isOpen) return null;

  const currentSector = sectors.find((s) => s.id === currentSectorId);

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
      const payload: SectorDailyLogCreate = {
        date: logDate,
        landings_today: Number(landingsToday),
        flight_start_time: startTime || undefined,
        flight_end_time: endTime || undefined,
        area_covered_today: areaCoveredToday !== '' ? Number(areaCoveredToday) : 0,
        sector_status: sectorStatus as any,
        weather_condition: weatherCondition,
        remarks: remarks.trim() || undefined,
      };

      await sectorApi.addSectorDailyLog(currentSectorId, payload);
      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Failed to submit pilot daily status:', err);
      setErrorMsg(err.message || 'Failed to submit flight status log');
    } finally {
      setIsSubmitting(false);
    }
  };

  const weatherOptions = [
    { label: 'Clear', icon: '☀️' },
    { label: 'Windy', icon: '💨' },
    { label: 'Rain-delayed', icon: '🌧️' },
    { label: 'Aborted', icon: '⚠️' },
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
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e4e4e7',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #f4f4f5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#fafafa',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plane size={18} color="#09090b" />
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#09090b' }}>
                  Pilot Daily Status &amp; Sorties Log
                </h3>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                  Per-visit capture log &amp; daily telemetry update
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: '0.25rem' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {errorMsg && (
                <div style={{ padding: '0.6rem 0.75rem', backgroundColor: '#f4f4f5', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.75rem', color: '#09090b' }}>
                  {errorMsg}
                </div>
              )}

              {/* Row 1: Sector Selection & Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.85rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Assigned Sector *</label>
                  {sectors.length > 1 ? (
                    <select
                      className="form-input"
                      value={currentSectorId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        setCurrentSectorId(newId);
                        const match = sectors.find((s) => s.id === newId);
                        if (match?.target_area_sqkm) {
                          setAreaCoveredToday(Number(match.target_area_sqkm));
                        }
                      }}
                      required
                      style={{ fontSize: '0.8rem' }}
                    >
                      {sectors.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.sector_code} ({sec.target_area_sqkm || 12.4} sq km) — {sec.status}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="form-input"
                      value={currentSector?.sector_code || 'S1'}
                      readOnly
                      style={{ fontSize: '0.8rem', backgroundColor: '#fafafa' }}
                    />
                  )}
                  <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>1 flight / landing completes sector</span>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Flight Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    required
                    style={{ fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              {/* Row 2: Landings Completed & Area Covered */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Landings Completed Today *</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={landingsToday}
                    onChange={(e) => setLandingsToday(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Count of landings"
                    required
                    style={{ fontSize: '0.8rem' }}
                  />
                  <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>Number of sorties flown</span>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Area Covered Today (sq km)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    className="form-input"
                    value={areaCoveredToday}
                    onChange={(e) => setAreaCoveredToday(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 3.5"
                    style={{ fontSize: '0.8rem' }}
                  />
                  <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>Cumulative capture estimate</span>
                </div>
              </div>

              {/* Row 3: Flight Start & End Times */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Flight Start Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={{ fontSize: '0.8rem' }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Flight End Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    style={{ fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              {/* Row 4: Weather Condition Chips */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Weather Condition</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                  {weatherOptions.map((opt) => {
                    const isSelected = weatherCondition === opt.label;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setWeatherCondition(opt.label)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: isSelected ? 700 : 500,
                          backgroundColor: isSelected ? '#09090b' : '#f4f4f5',
                          color: isSelected ? '#ffffff' : '#3f3f46',
                          border: isSelected ? '1px solid #09090b' : '1px solid #e4e4e7',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 5: Sector Status Toggle */}
              <div className="form-group" style={{ margin: 0, backgroundColor: '#fafafa', padding: '0.75rem', borderRadius: '6px', border: '1px solid #f4f4f5' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Sector Status Update</label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: sectorStatus === 'in_progress' ? 700 : 400 }}>
                    <input
                      type="radio"
                      name="sectorStatus"
                      value="in_progress"
                      checked={sectorStatus === 'in_progress'}
                      onChange={() => setSectorStatus('in_progress')}
                    />
                    <span>In Progress (More flights scheduled)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: sectorStatus === 'completed' ? 700 : 400 }}>
                    <input
                      type="radio"
                      name="sectorStatus"
                      value="completed"
                      checked={sectorStatus === 'completed'}
                      onChange={() => setSectorStatus('completed')}
                    />
                    <span style={{ color: sectorStatus === 'completed' ? '#09090b' : '#09090b' }}>
                      Mark as Completed (Survey finished)
                    </span>
                  </label>
                </div>
              </div>

              {/* Row 6: Field Remarks */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Pilot Field Remarks (Delays, Issues, Notes)</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Completed 3 sorties without GPS interference. Battery cycles healthy. Sector 1 north perimeter clear."
                  style={{ fontSize: '0.8rem', resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '0.85rem 1.5rem',
                borderTop: '1px solid #f4f4f5',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.5rem',
                backgroundColor: '#fafafa',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
                style={{ fontSize: '0.75rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{
                  fontSize: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                }}
              >
                {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {isSubmitting ? 'Logging...' : 'Submit Flight Log'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
};
