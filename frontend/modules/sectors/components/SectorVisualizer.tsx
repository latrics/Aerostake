import React, { useState } from 'react';
import { Sector } from '../types';
import { SectorGridView } from './SectorGridView';
import { SectorTableView } from './SectorTableView';

interface SectorVisualizerProps {
  sectors: Sector[];
  projectId: string;
}

export const SectorVisualizer: React.FC<SectorVisualizerProps> = ({ sectors, projectId }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'map'>('grid');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const totalSectors = sectors.length;
  const completedCount = sectors.filter((s) => s.status === 'completed' || s.status === 'surveyed').length;
  const inProgressCount = sectors.filter((s) => s.status === 'in_progress').length;
  const progressPercent = totalSectors > 0 ? Math.round((completedCount / totalSectors) * 100) : 0;

  const filteredSectors = sectors.filter((s) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'completed') return s.status === 'completed' || s.status === 'surveyed';
    if (statusFilter === 'in_progress') return s.status === 'in_progress';
    if (statusFilter === 'pending') return s.status === 'pending' || s.status === 'allocated';
    return s.status === statusFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header with Progress Bar & Stats */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              Flight Sector Grid Operations
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {totalSectors} Subdivided flight polygons • {completedCount} Surveyed • {inProgressCount} In Flight
            </p>
          </div>

          {/* View Mode Toggle Buttons */}
          <div style={{ display: 'flex', backgroundColor: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '0.4rem 0.85rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: viewMode === 'grid' ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
                color: viewMode === 'grid' ? '#3b82f6' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.825rem',
                cursor: 'pointer',
              }}
            >
              ⊞ Grid View
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '0.4rem 0.85rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: viewMode === 'table' ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
                color: viewMode === 'table' ? '#3b82f6' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.825rem',
                cursor: 'pointer',
              }}
            >
              ☰ Table View
            </button>
            <button
              onClick={() => setViewMode('map')}
              style={{
                padding: '0.4rem 0.85rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: viewMode === 'map' ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
                color: viewMode === 'map' ? '#3b82f6' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.825rem',
                cursor: 'pointer',
              }}
            >
              🗺 Map Preview
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            <span>Overall Survey Completion</span>
            <span style={{ color: progressPercent === 100 ? 'var(--success)' : '#3b82f6' }}>{progressPercent}%</span>
          </div>
          <div
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '9999px',
              overflow: 'hidden',
              border: '1px solid var(--border-color)',
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: progressPercent === 100 ? 'var(--success)' : 'var(--brand-gradient)',
                borderRadius: '9999px',
                transition: 'width 0.6s ease-in-out',
                boxShadow: progressPercent > 0 ? 'var(--brand-glow)' : 'none',
              }}
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `All Sectors (${totalSectors})` },
            { id: 'in_progress', label: `In Flight (${inProgressCount})` },
            { id: 'completed', label: `Surveyed (${completedCount})` },
            { id: 'pending', label: `Pending Allocation` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: statusFilter === tab.id ? '#3b82f6' : 'var(--border-color)',
                backgroundColor: statusFilter === tab.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                color: statusFilter === tab.id ? '#3b82f6' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Render View Mode */}
      {viewMode === 'grid' && (
        <SectorGridView sectors={filteredSectors} projectId={projectId} />
      )}

      {viewMode === 'table' && (
        <SectorTableView sectors={filteredSectors} projectId={projectId} />
      )}

      {viewMode === 'map' && (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <div
            style={{
              height: '380px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              backgroundImage: 'radial-gradient(var(--border-color) 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          >
            {/* Holographic Radar / Geospatial Grid Indicator */}
            <div
              style={{
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: '0 0 30px rgba(59, 130, 246, 0.15)',
              }}
            >
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  border: '1px dashed rgba(59, 130, 246, 0.4)',
                }}
              />
              <span style={{ position: 'absolute', fontSize: '2rem' }}>🛰️</span>
            </div>

            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '1.25rem', marginBottom: '0.25rem' }}>
              Geospatial Vector Map Layer
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '420px' }}>
              Rendered boundary coordinates across {sectors.length} flight polygons. Real-time telemetry signals sync during pilot flight sorties.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              {sectors.slice(0, 4).map((s) => (
                <span
                  key={s.id}
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.5rem',
                    backgroundColor: s.status === 'in_progress' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: 'var(--radius-sm)',
                    color: s.status === 'in_progress' ? '#f59e0b' : '#3b82f6',
                    fontWeight: 700,
                  }}
                >
                  {s.sector_code}: {s.status.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
