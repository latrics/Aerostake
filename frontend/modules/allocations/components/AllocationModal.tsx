'use client';

import React, { useState, useEffect } from 'react';
import { AllocationCreate } from '../types';
import { UserProfile } from '@/modules/users/types';
import { usersApi } from '@/modules/users/api';

interface AllocationModalProps {
  isOpen: boolean;
  sectorId: string;
  sectorName: string;
  onClose: () => void;
  onSubmit: (sectorId: string, payload: AllocationCreate) => Promise<void>;
}

const COMMON_DRONES = [
  'DJI Matrice 350 RTK (SN: M350-0891)',
  'DJI Matrice 300 RTK (SN: M300-1104)',
  'WingtraOne GEN II VTOL (SN: WG-772)',
  'DJI Mavic 3 Enterprise Thermal (SN: M3E-449)',
  'Freefly Alta X Heavy Lifter (SN: FAX-012)',
];

export function AllocationModal({
  isOpen,
  sectorId,
  sectorName,
  onClose,
  onSubmit,
}: AllocationModalProps) {
  const [pilots, setPilots] = useState<UserProfile[]>([]);
  const [loadingPilots, setLoadingPilots] = useState(true);
  const [selectedPilotId, setSelectedPilotId] = useState('');
  const [droneIdentifier, setDroneIdentifier] = useState(COMMON_DRONES[0]);
  const [customDrone, setCustomDrone] = useState('');
  const [isCustomDrone, setIsCustomDrone] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoadingPilots(true);
      usersApi
        .listUsers('pilot')
        .then((data) => {
          setPilots(data);
          if (data.length > 0) {
            setSelectedPilotId(data[0].id);
          }
        })
        .catch((err) => {
          console.error('Failed to load pilots:', err);
        })
        .finally(() => setLoadingPilots(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPilotId) {
      setError('Please select an assigned pilot');
      return;
    }

    const finalDrone = isCustomDrone ? customDrone : droneIdentifier;
    if (!finalDrone.trim()) {
      setError('Please specify drone hardware');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit(sectorId, {
        pilot_id: selectedPilotId,
        drone_identifier: finalDrone.trim(),
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to allocate hardware and pilot');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '560px' }}
      >
        <div
          className="modal-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Dispatch & Hardware Allocation</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Assign certified pilot and drone asset to <strong style={{ color: 'var(--text-primary)' }}>{sectorName}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.25rem 0.6rem', fontSize: '1rem', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid var(--accent-danger)',
              borderRadius: '8px',
              color: '#fca5a5',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Pilot selection */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Select Licensed Drone Pilot *
            </label>
            {loadingPilots ? (
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Loading pilots...</div>
            ) : pilots.length === 0 ? (
              <div style={{ fontSize: '0.875rem', color: 'var(--accent-warning)', padding: '0.5rem', background: 'rgba(234, 179, 8, 0.1)', borderRadius: '6px' }}>
                No registered pilots found. Please provision a pilot profile in User Management first.
              </div>
            ) : (
              <select
                className="input-field"
                value={selectedPilotId}
                onChange={(e) => setSelectedPilotId(e.target.value)}
                style={{ width: '100%' }}
                required
              >
                {pilots.map((pilot) => (
                  <option key={pilot.id} value={pilot.id}>
                    {pilot.email} (Active License)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Drone hardware */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                Drone Hardware Asset *
              </label>
              <button
                type="button"
                onClick={() => setIsCustomDrone(!isCustomDrone)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--brand-primary)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {isCustomDrone ? 'Choose from Fleet' : 'Custom Serial / Model'}
              </button>
            </div>

            {isCustomDrone ? (
              <input
                type="text"
                className="input-field"
                placeholder="e.g. WingtraOne GEN II (SN: WT-991)"
                value={customDrone}
                onChange={(e) => setCustomDrone(e.target.value)}
                style={{ width: '100%' }}
                required
              />
            ) : (
              <select
                className="input-field"
                value={droneIdentifier}
                onChange={(e) => setDroneIdentifier(e.target.value)}
                style={{ width: '100%' }}
                required
              >
                {COMMON_DRONES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Mission Dispatch Notes */}
          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Mission Dispatch Instructions & Safety Notes
            </label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="e.g. Maintain minimum 80m AGL, beware of microwave relay tower on NW ridge. Check RTK base station lock before takeoff."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || pilots.length === 0}
            >
              {submitting ? 'Assigning Hardware...' : 'Confirm Allocation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
