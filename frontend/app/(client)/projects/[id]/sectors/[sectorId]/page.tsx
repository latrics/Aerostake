'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useProject } from '@/modules/projects/hooks';
import { useSector } from '@/modules/sectors/hooks';
import { SectorStatusBadge } from '@/modules/sectors/components/SectorStatusBadge';

export default function SectorDetailPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const sectorId = params?.sectorId as string;

  const { project, loading: projectLoading } = useProject(projectId);
  const { sector, loading: sectorLoading, error } = useSector(sectorId);

  if (projectLoading || sectorLoading) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading sector flight parameters...
      </div>
    );
  }

  if (error || !sector) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Sector Not Found</h3>
        <p style={{ marginBottom: '1.5rem' }}>{error || 'Flight sector records could not be retrieved.'}</p>
        <Link href={`/projects/${projectId}/overview`} className="btn btn-secondary">
          ← Back to Project Workspace
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
        <Link href="/projects" style={{ color: 'var(--text-secondary)' }}>
          Projects
        </Link>
        <span>/</span>
        <Link href={`/projects/${projectId}/overview`} style={{ color: 'var(--text-secondary)' }}>
          {project?.title || 'Project Workspace'}
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{sector.sector_code}</span>
      </div>

      {/* Sector Header */}
      <div className="glass-panel" style={{ padding: '1.75rem 2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Flight Sector {sector.sector_code}</h2>
              <SectorStatusBadge status={sector.status} size="md" />
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Subdivided operational flight cell attached to Project {project?.title || projectId}
            </p>
          </div>

          <Link
            href={`/projects/${projectId}/overview`}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            ← Back to Overview
          </Link>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '2rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)',
            fontSize: '0.825rem',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <strong>Sector ID:</strong> <code style={{ color: 'var(--text-secondary)' }}>{sector.id}</code>
          </div>
          <div>
            <strong>Operational Plan ID:</strong> <code style={{ color: 'var(--text-secondary)' }}>{sector.plan_id}</code>
          </div>
          <div>
            <strong>Last Updated:</strong> {sector.updated_at ? new Date(sector.updated_at).toLocaleString() : 'N/A'}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="glass-card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Surface Area
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--brand-focus, #3b82f6)' }}>
            {sector.target_area_sqkm ? `${sector.target_area_sqkm} km²` : '--'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Target grid ground boundary
          </div>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Estimated Flight Airtime
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800 }}>
            {sector.estimated_flight_minutes ? `${sector.estimated_flight_minutes} mins` : '--'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Battery cycle allocation
          </div>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Survey Execution Status
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, textTransform: 'capitalize', color: sector.status === 'completed' || sector.status === 'surveyed' ? 'var(--success)' : sector.status === 'in_progress' ? '#f59e0b' : 'var(--text-primary)' }}>
            {sector.status.replace('_', ' ')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Real-time pilot sortie status
          </div>
        </div>
      </div>

      {/* GeoJSON Polygon Coordinates Inspector */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Boundary Geometry & Polygon Coordinates
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          GeoJSON boundary definition uploaded for waypoint flight path generation.
        </p>

        <pre
          style={{
            backgroundColor: 'var(--bg-secondary)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            fontSize: '0.825rem',
            color: '#3b82f6',
            fontFamily: 'monospace',
            overflowX: 'auto',
            maxHeight: '300px',
          }}
        >
          {sector.polygon_coordinates && Object.keys(sector.polygon_coordinates).length > 0
            ? JSON.stringify(sector.polygon_coordinates, null, 2)
            : JSON.stringify(
                {
                  type: 'Polygon',
                  coordinates: [
                    [
                      [68.6523, 23.8412],
                      [68.6654, 23.8412],
                      [68.6654, 23.8545],
                      [68.6523, 23.8545],
                      [68.6523, 23.8412],
                    ],
                  ],
                  crs: 'EPSG:4326',
                },
                null,
                2
              )}
        </pre>
      </div>
    </div>
  );
}
