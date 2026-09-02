import React from 'react';
import Link from 'next/link';
import { Sector } from '../types';
import { SectorStatusBadge } from './SectorStatusBadge';

interface SectorTableViewProps {
  sectors: Sector[];
  projectId: string;
}

export const SectorTableView: React.FC<SectorTableViewProps> = ({ sectors, projectId }) => {
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
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Sector Code</th>
            <th>Survey Status</th>
            <th>Surface Area</th>
            <th>Est. Airtime</th>
            <th>Last Updated</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sectors.map((sector) => {
            const updatedDate = sector.updated_at
              ? new Date(sector.updated_at).toLocaleDateString()
              : '--';

            return (
              <tr key={sector.id}>
                <td>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {sector.sector_code}
                  </span>
                </td>
                <td>
                  <SectorStatusBadge status={sector.status} size="sm" />
                </td>
                <td>{sector.target_area_sqkm ? `${sector.target_area_sqkm} km²` : '--'}</td>
                <td>{sector.estimated_flight_minutes ? `${sector.estimated_flight_minutes} mins` : '--'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{updatedDate}</td>
                <td style={{ textAlign: 'right' }}>
                  <Link
                    href={`/projects/${projectId}/sectors/${sector.id}`}
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.775rem' }}
                  >
                    Inspect Details →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
