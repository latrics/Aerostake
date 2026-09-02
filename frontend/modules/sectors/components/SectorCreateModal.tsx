'use client';

import React, { useState } from 'react';
import { SectorBatchCreate, SectorCreate } from '../types';

interface SectorCreateModalProps {
  isOpen: boolean;
  projectId: string;
  planId: string;
  projectName?: string;
  onClose: () => void;
  onSubmit: (projectId: string, batchData: SectorBatchCreate) => Promise<void>;
}

export function SectorCreateModal({
  isOpen,
  projectId,
  planId,
  projectName = 'Survey Project',
  onClose,
  onSubmit,
}: SectorCreateModalProps) {
  const [mode, setMode] = useState<'grid' | 'custom'>('grid');
  const [gridRows, setGridRows] = useState(2);
  const [gridCols, setGridCols] = useState(2);
  const [areaPerSector, setAreaPerSector] = useState('3.5');
  const [minutesPerSector, setMinutesPerSector] = useState('45');
  const [customSectorsText, setCustomSectorsText] = useState('SEC-A1, SEC-A2, SEC-B1, SEC-B2');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planId) {
      setError('Active approved plan ID is required to generate sectors');
      return;
    }

    const area = parseFloat(areaPerSector) || 2.5;
    const mins = parseInt(minutesPerSector, 10) || 45;

    let sectorsList: SectorCreate[] = [];

    if (mode === 'grid') {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          const rowLetter = letters[r] || `R${r + 1}`;
          const code = `SEC-${rowLetter}${c + 1}`;
          sectorsList.push({
            sector_code: code,
            target_area_sqkm: area,
            estimated_flight_minutes: mins,
            polygon_coordinates: {
              type: 'Polygon',
              grid_index: { row: r, col: c },
            },
          });
        }
      }
    } else {
      const codes = customSectorsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (codes.length === 0) {
        setError('Please enter at least one sector code');
        return;
      }
      sectorsList = codes.map((code) => ({
        sector_code: code,
        target_area_sqkm: area,
        estimated_flight_minutes: mins,
        polygon_coordinates: {
          type: 'Polygon',
          name: code,
        },
      }));
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit(projectId, {
        plan_id: planId,
        sectors: sectorsList,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to generate sector grid');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px' }}
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
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Subdivide Flight Sectors</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Partition {projectName} boundary into operational flight grids.
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
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <button
              type="button"
              onClick={() => setMode('grid')}
              className={`btn ${mode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '0.5rem' }}
            >
              📐 Automated Grid Generator
            </button>
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={`btn ${mode === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '0.5rem' }}
            >
              ✍️ Custom Sector Codes
            </button>
          </div>

          {mode === 'grid' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '1.25rem',
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Grid Rows (Latitude bands)
                </label>
                <select
                  className="input-field"
                  value={gridRows}
                  onChange={(e) => setGridRows(parseInt(e.target.value, 10))}
                  style={{ width: '100%' }}
                >
                  <option value={1}>1 Row</option>
                  <option value={2}>2 Rows (A, B)</option>
                  <option value={3}>3 Rows (A, B, C)</option>
                  <option value={4}>4 Rows (A, B, C, D)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Grid Columns (Longitude bands)
                </label>
                <select
                  className="input-field"
                  value={gridCols}
                  onChange={(e) => setGridCols(parseInt(e.target.value, 10))}
                  style={{ width: '100%' }}
                >
                  <option value={1}>1 Column</option>
                  <option value={2}>2 Columns (1, 2)</option>
                  <option value={3}>3 Columns (1, 2, 3)</option>
                  <option value={4}>4 Columns (1, 2, 3, 4)</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Will generate <strong>{gridRows * gridCols}</strong> flight sectors automatically.
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Comma-separated Sector Codes
              </label>
              <input
                type="text"
                className="input-field"
                value={customSectorsText}
                onChange={(e) => setCustomSectorsText(e.target.value)}
                style={{ width: '100%' }}
                placeholder="e.g. SEC-NORTH, SEC-SOUTH, SEC-BUFFER"
              />
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1.75rem',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Avg Target Area (sq km)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                className="input-field"
                value={areaPerSector}
                onChange={(e) => setAreaPerSector(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Flight Minutes per Sector
              </label>
              <input
                type="number"
                step="5"
                min="10"
                required
                className="input-field"
                value={minutesPerSector}
                onChange={(e) => setMinutesPerSector(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
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
              disabled={submitting}
            >
              {submitting ? 'Generating Sectors...' : 'Generate Flight Sectors'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
