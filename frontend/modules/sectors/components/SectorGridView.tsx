import React from 'react';
import Link from 'next/link';
import { Sector } from '../types';
import { SectorStatusBadge } from './SectorStatusBadge';

interface SectorGridViewProps {
  sectors: Sector[];
  projectId: string;
}

export const SectorGridView: React.FC<SectorGridViewProps> = ({ sectors, projectId }) => {
  if (sectors.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>
          No flight sectors subdivided yet. Sectors are created by Operations once the operational plan is approved.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '1.25rem',
      }}
    >
      {sectors.map((sector) => {
        const isFinished = sector.status === 'completed' || sector.status === 'surveyed';
        const isLive = sector.status === 'in_progress';

        return (
          <Link
            key={sector.id}
            href={`/projects/${projectId}/sectors/${sector.id}`}
            className="glass-card"
            style={{
              textDecoration: 'none',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              borderColor: isLive ? 'rgba(245, 158, 11, 0.4)' : isFinished ? 'rgba(16, 185, 129, 0.3)' : undefined,
              boxShadow: isLive ? '0 0 15px rgba(245, 158, 11, 0.15)' : undefined,
            }}
          >
            {isLive && (
              <span
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#f59e0b',
                  animation: 'pulse-glow 1.5s infinite',
                }}
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                {sector.sector_code}
              </span>
              <SectorStatusBadge status={sector.status} size="sm" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1rem', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Area Coverage:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{sector.target_area_sqkm ? `${sector.target_area_sqkm} km²` : '--'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Estimated Airtime:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{sector.estimated_flight_minutes ? `${sector.estimated_flight_minutes} min` : '--'}</strong>
              </div>
            </div>

            <div
              style={{
                borderTop: '1px solid var(--border-color)',
                paddingTop: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.75rem',
                color: 'var(--brand-focus, #3b82f6)',
                fontWeight: 600,
              }}
            >
              <span>View Coordinates & Details</span>
              <span>→</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
};
