'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useProject } from '@/modules/projects/hooks';
import { useSector } from '@/modules/sectors/hooks';
import { SectorStatusBadge } from '@/modules/sectors/components/SectorStatusBadge';

import { PageHeader } from '@/components/PageHeader';

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
      <div className="glass-panel" style={{ padding: '2rem', color: 'var(--error)', borderColor: '#09090b' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Sector Not Found</h3>
        <p style={{ marginBottom: '1.5rem' }}>{error || 'Flight sector records could not be retrieved.'}</p>
        <Link href={`/projects/${projectId}/overview`} className="btn btn-secondary" style={{ height: '36px', display: 'inline-flex', alignItems: 'center' }}>
          ← Back to Project Workspace
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── Standard Page Header ── */}
      <PageHeader
        title={`Flight Sector ${sector.sector_code}`}
        subtitle={`Subdivided operational flight cell attached to Project ${project?.title || projectId}`}
        breadcrumb={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', color: '#71717a' }}>
            <Link href="/projects" style={{ color: '#71717a', textDecoration: 'none' }}>
              Projects
            </Link>
            <span>/</span>
            <Link href={`/projects/${projectId}/overview`} style={{ color: '#71717a', textDecoration: 'none' }}>
              {project?.title || 'Project Workspace'}
            </Link>
            <span>/</span>
            <span style={{ color: '#09090b', fontWeight: 600 }}>{sector.sector_code}</span>
          </div>
        }
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SectorStatusBadge status={sector.status} size="md" isClient={true} />
          <Link
            href={`/projects/${projectId}/overview`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              height: '36px',
              padding: '0 0.95rem',
              backgroundColor: '#ffffff',
              color: '#09090b',
              border: '1px solid #d4d4d8',
              borderRadius: '6px',
              textDecoration: 'none',
            }}
          >
            ← Back to Overview
          </Link>
        </div>
      </PageHeader>

      <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>

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
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#09090b' }}>
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
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Survey Execution Status
          </div>
          {(() => {
            const isCompleted = sector.status === 'completed' || sector.status === 'surveyed' || sector.status === 'verified';
            const isInProgress = sector.status === 'in_progress';
            return (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: isCompleted ? 'rgba(22, 163, 74, 0.15)' : '#f4f4f5',
                  border: isCompleted ? '1px solid #22c55e' : '1px solid #d4d4d8',
                  color: isCompleted ? '#16a34a' : '#52525b',
                  fontSize: '1rem',
                  fontWeight: 800,
                  width: 'fit-content',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: isCompleted ? '#16a34a' : '#71717a',
                  }}
                />
                {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Pending'}
              </div>
            );
          })()}
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.45rem' }}>
            Real-time pilot flight status
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
            color: '#09090b',
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
