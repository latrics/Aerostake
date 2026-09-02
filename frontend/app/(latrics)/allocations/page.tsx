'use client';

import React, { useState, useEffect } from 'react';
import { projectApi } from '@/modules/projects/api';
import { Project } from '@/modules/projects/types';
import { sectorApi } from '@/modules/sectors/api';
import { Sector, SectorStatus } from '@/modules/sectors/types';
import { allocationsApi } from '@/modules/allocations/api';
import { AllocationCreate } from '@/modules/allocations/types';
import { AllocationModal } from '@/modules/allocations/components/AllocationModal';
import { usersApi } from '@/modules/users/api';
import { UserProfile } from '@/modules/users/types';

export default function AllocationsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [sectors, setSectors] = useState<(Sector & { projectName?: string })[]>([]);
  const [pilots, setPilots] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Allocation modal
  const [allocModalOpen, setAllocModalOpen] = useState(false);
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [projData, pilotData] = await Promise.all([
        projectApi.listProjects(),
        usersApi.listUsers('pilot').catch(() => []),
      ]);
      setProjects(projData);
      setPilots(pilotData);

      // Load sectors for all projects
      const sectorPromises = projData.map(async (p) => {
        try {
          const sList = await sectorApi.listProjectSectors(p.id);
          return sList.map((s) => ({ ...s, projectName: p.title }));
        } catch {
          return [];
        }
      });

      const nestedSectors = await Promise.all(sectorPromises);
      setSectors(nestedSectors.flat());
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to load dispatch data' });
    } finally {
      setLoading(false);
    }
  };

  const handleAllocate = async (sectorId: string, payload: AllocationCreate) => {
    try {
      await allocationsApi.allocateSector(sectorId, payload);
      setFeedbackMsg({ type: 'success', text: 'Drone asset and pilot successfully dispatched to sector!' });
      await loadAllData();
    } catch (err: any) {
      throw err;
    }
  };

  const filteredSectors = sectors.filter((s) => {
    if (selectedProjectId === 'all') return true;
    return s.project_id === selectedProjectId;
  });

  const activeInFlightCount = sectors.filter((s) => s.status === SectorStatus.IN_PROGRESS).length;
  const allocatedCount = sectors.filter((s) => s.status === SectorStatus.ALLOCATED).length;
  const unassignedCount = sectors.filter((s) => s.status === SectorStatus.PENDING).length;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Hardware & Pilot Dispatch Center
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Allocate licensed drone pilots and UAV hardware to approved flight sectors.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select
            className="input-field"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            style={{ fontSize: '0.875rem' }}
          >
            <option value="all">All Projects ({projects.length})</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {feedbackMsg && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${feedbackMsg.type === 'success' ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
            borderRadius: '8px',
            color: feedbackMsg.type === 'success' ? 'var(--accent-success)' : '#fca5a5',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{feedbackMsg.text}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Fleet telemetry metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Licensed Pilots on Roster</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            👨‍✈️ {pilots.length} Active
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active in Flight</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-warning)', marginTop: '0.25rem' }}>
            ⚡ {activeInFlightCount} Missions
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Allocated & Ready</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-info)', marginTop: '0.25rem' }}>
            📋 {allocatedCount} Sectors
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Unassigned Sectors</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            ⏳ {unassignedCount} Pending
          </div>
        </div>
      </div>

      {/* Sectors dispatch table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>
          Flight Sectors Dispatch Roster
        </h3>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading sectors and allocations...
          </div>
        ) : filteredSectors.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No sectors found. Go to <strong>Flight Sectors</strong> to generate sector grids first.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Sector Code</th>
                  <th>Target Area</th>
                  <th>Est. Duration</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Dispatch Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSectors.map((sector) => {
                  const isUnassigned = sector.status === SectorStatus.PENDING;
                  return (
                    <tr key={sector.id}>
                      <td>
                        <strong>{sector.projectName || 'Survey Project'}</strong>
                      </td>
                      <td>
                        <code style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                          {sector.sector_code}
                        </code>
                      </td>
                      <td>{sector.target_area_sqkm ? `${sector.target_area_sqkm} sq km` : '2.5 sq km'}</td>
                      <td>{sector.estimated_flight_minutes ? `${sector.estimated_flight_minutes} mins` : '45 mins'}</td>
                      <td>
                        <span className={`badge badge-${sector.status}`}>
                          {sector.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setSelectedSector(sector);
                            setAllocModalOpen(true);
                          }}
                          className={isUnassigned ? 'btn btn-primary' : 'btn btn-secondary'}
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        >
                          {isUnassigned ? '➕ Allocate Hardware' : '🔄 Reassign Asset'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Allocation Modal */}
      {selectedSector && (
        <AllocationModal
          isOpen={allocModalOpen}
          sectorId={selectedSector.id}
          sectorName={selectedSector.sector_code}
          onClose={() => {
            setAllocModalOpen(false);
            setSelectedSector(null);
          }}
          onSubmit={handleAllocate}
        />
      )}
    </div>
  );
}
