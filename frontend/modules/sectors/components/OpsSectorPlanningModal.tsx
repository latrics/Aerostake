'use client';

import React, { useState, useEffect } from 'react';
import { X, Layers, Save, User, Plane, Calendar, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { Portal } from '@/components/Portal';
import { Sector, SectorPlanningData } from '../types';
import { sectorApi } from '../api';

interface OpsSectorPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  sector: Sector | null;
  availablePilots?: Array<{ id: string; name: string; email?: string }>;
  availableDrones?: string[];
  onSaved: () => void;
}

export const OpsSectorPlanningModal: React.FC<OpsSectorPlanningModalProps> = ({
  isOpen,
  onClose,
  sector,
  availablePilots = [],
  availableDrones = [],
  onSaved,
}) => {
  const [sectorName, setSectorName] = useState('');
  const [targetArea, setTargetArea] = useState<number | ''>('');
  const [plannedSorties, setPlannedSorties] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPilot, setSelectedPilot] = useState('');
  const [selectedDrone, setSelectedDrone] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [terrainNote, setTerrainNote] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (sector && isOpen) {
      const planning = sector.planning || (sector.polygon_coordinates as any)?.planning || {};
      setSectorName(sector.sector_code || planning.sector_name || '');
      setTargetArea(sector.target_area_sqkm || planning.target_area_sqkm || '');
      setPlannedSorties(planning.planned_sorties || '');
      setStartDate(planning.planned_start_date || '');
      setEndDate(planning.planned_end_date || '');
      setSelectedPilot(
        planning.assigned_pilot ||
        (Array.isArray(planning.assigned_pilots) && planning.assigned_pilots[0]?.name) ||
        (typeof planning.assigned_pilots?.[0] === 'string' ? planning.assigned_pilots[0] : '') ||
        (availablePilots.length > 0 ? availablePilots[0].name : '')
      );
      setSelectedDrone(
        planning.assigned_drone ||
        (availableDrones.length > 0 ? availableDrones[0] : 'DJI Matrice 300 RTK')
      );
      setPriority(planning.priority || 'Normal');
      setTerrainNote(planning.terrain_note || '');
      setRemarks(planning.planning_remarks || '');
      setErrorMsg(null);
    }
  }, [sector, isOpen, availablePilots, availableDrones]);

  if (!isOpen || !sector) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectorName.trim()) {
      setErrorMsg('Sector ID / Name is required');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    try {
      const updatePayload: SectorPlanningData = {
        sector_name: sectorName.trim(),
        target_area_sqkm: targetArea !== '' ? Number(targetArea) : undefined,
        planned_sorties: plannedSorties !== '' ? Number(plannedSorties) : undefined,
        planned_start_date: startDate || undefined,
        planned_end_date: endDate || undefined,
        assigned_pilots: selectedPilot ? [{ name: selectedPilot }] : undefined,
        assigned_drone: selectedDrone || undefined,
        priority,
        terrain_note: terrainNote.trim() || undefined,
        planning_remarks: remarks.trim() || undefined,
      };

      await sectorApi.updateSectorPlanning(sector.id, updatePayload);
      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Failed to update sector planning data:', err);
      setErrorMsg(err.message || 'Failed to update sector planning data');
    } finally {
      setIsSaving(false);
    }
  };

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
            maxWidth: '560px',
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
              <Layers size={18} color="#09090b" />
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#09090b' }}>
                  Define Sector Planning Data — {sector.sector_code}
                </h3>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                  Ops-side initial parameter setup and pilot flight delegation
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
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {errorMsg && (
                <div style={{ padding: '0.6rem 0.75rem', backgroundColor: '#f4f4f5', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '0.75rem', color: '#09090b' }}>
                  {errorMsg}
                </div>
              )}

              {/* Row 1: Sector ID & Area */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Sector ID / Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={sectorName}
                    onChange={(e) => setSectorName(e.target.value)}
                    placeholder="e.g. S1 or North Sector"
                    required
                    style={{ fontSize: '0.8rem' }}
                  />
                  <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>Auto-clipped from grid; editable by Ops</span>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Area (sq km) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={targetArea}
                    onChange={(e) => setTargetArea(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 12.4"
                    required
                    style={{ fontSize: '0.8rem' }}
                  />
                  <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>Auto-calculated; Ops override enabled</span>
                </div>
              </div>

              {/* Row 2: Planned Sorties & Sequence Priority */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Planned Landings / Sorties</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={plannedSorties}
                    onChange={(e) => setPlannedSorties(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 6 sorties"
                    style={{ fontSize: '0.8rem' }}
                  />
                  <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>Ops estimate of sorties to cover area</span>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Priority / Sequence</label>
                  <select
                    className="form-input"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    style={{ fontSize: '0.8rem' }}
                  >
                    <option value="Priority 1 (First)">Priority 1 (Tackle First)</option>
                    <option value="Normal">Normal Sequence</option>
                    <option value="Secondary">Secondary Sequence</option>
                    <option value="Low">Low / Deferred</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Planned Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Planned Start Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ fontSize: '0.8rem' }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Planned End Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              {/* Row 4: Assigned Pilot & Drone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Assigned Pilot(s)</label>
                  {availablePilots.length > 0 ? (
                    <select
                      className="form-input"
                      value={selectedPilot}
                      onChange={(e) => setSelectedPilot(e.target.value)}
                      style={{ fontSize: '0.8rem' }}
                    >
                      <option value="">-- Select responsible pilot --</option>
                      {availablePilots.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name} {p.email ? `(${p.email})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="form-input"
                      value={selectedPilot}
                      onChange={(e) => setSelectedPilot(e.target.value)}
                      placeholder="e.g. Lead Pilot Name"
                      style={{ fontSize: '0.8rem' }}
                    />
                  )}
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Assigned Drone / Equipment</label>
                  <input
                    type="text"
                    className="form-input"
                    value={selectedDrone}
                    onChange={(e) => setSelectedDrone(e.target.value)}
                    placeholder="e.g. DJI Matrice 300 RTK"
                    style={{ fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              {/* Row 5: Terrain & Elevation Notes */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Terrain / Elevation Note</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={terrainNote}
                  onChange={(e) => setTerrainNote(e.target.value)}
                  placeholder="e.g. Hilly terrain, dense canopy, 45m elevation variation affecting flight endurance"
                  style={{ fontSize: '0.8rem', resize: 'vertical' }}
                />
              </div>

              {/* Row 6: Planning Remarks & Special Instructions */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Planning Remarks (Special Instructions)</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Maintain 80m AGL, keep 200m buffer from communication tower, access via Gate 3"
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
                disabled={isSaving}
                style={{ fontSize: '0.75rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSaving}
                style={{
                  fontSize: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                }}
              >
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {isSaving ? 'Saving...' : 'Save Sector Plan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
};
