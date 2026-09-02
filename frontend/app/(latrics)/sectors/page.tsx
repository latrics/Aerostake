'use client';

import React, { useState, useEffect } from 'react';
import { projectApi } from '@/modules/projects/api';
import { Project, ProjectStatus } from '@/modules/projects/types';
import { sectorApi } from '@/modules/sectors/api';
import { Sector, SectorStatus, SectorBatchCreate } from '@/modules/sectors/types';
import { planningApi } from '@/modules/planning/api';
import { OperationalPlan } from '@/modules/planning/types';
import { SectorCreateModal } from '@/modules/sectors/components/SectorCreateModal';
import { AllocationModal } from '@/modules/allocations/components/AllocationModal';
import { allocationsApi } from '@/modules/allocations/api';
import { AllocationCreate } from '@/modules/allocations/types';

export default function SectorsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activePlan, setActivePlan] = useState<OperationalPlan | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSectors, setLoadingSectors] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [allocModalOpen, setAllocModalOpen] = useState(false);
  const [allocatingSector, setAllocatingSector] = useState<Sector | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await projectApi.listProjects();
      setProjects(data);
      if (data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to load projects' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedProjectId) {
      setActivePlan(null);
      setSectors([]);
      return;
    }

    const loadSectorData = async () => {
      try {
        setLoadingSectors(true);
        const [plan, sectData] = await Promise.all([
          planningApi.getActivePlan(selectedProjectId).catch(() => null),
          sectorApi.listProjectSectors(selectedProjectId).catch(() => []),
        ]);
        setActivePlan(plan);
        setSectors(sectData);
      } catch (err: any) {
        console.error('Failed to load sector data:', err);
      } finally {
        setLoadingSectors(false);
      }
    };

    loadSectorData();
  }, [selectedProjectId]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const handleCreateSectors = async (projectId: string, batchData: SectorBatchCreate) => {
    try {
      const created = await sectorApi.createSectors(projectId, batchData);
      setSectors(created);
      setFeedbackMsg({ type: 'success', text: `Successfully partitioned survey zone into ${created.length} flight sectors!` });
    } catch (err: any) {
      throw err;
    }
  };

  const handleUpdateSectorStatus = async (sectorId: string, newStatus: SectorStatus) => {
    try {
      const updated = await sectorApi.updateSectorStatus(sectorId, { status: newStatus });
      setSectors((prev) => prev.map((s) => (s.id === sectorId ? updated : s)));
      setFeedbackMsg({ type: 'success', text: `Sector ${updated.sector_code} status updated to ${newStatus.toUpperCase()}` });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to update sector status' });
    }
  };

  const handleAllocate = async (sectorId: string, payload: AllocationCreate) => {
    try {
      await allocationsApi.allocateSector(sectorId, payload);
      setFeedbackMsg({ type: 'success', text: 'Hardware and pilot successfully allocated to sector!' });
      // Refresh sectors
      const updatedSectors = await sectorApi.listProjectSectors(selectedProjectId);
      setSectors(updatedSectors);
    } catch (err: any) {
      throw err;
    }
  };

  const filteredSectors = sectors.filter((s) => {
    if (statusFilter === 'all') return true;
    return s.status === statusFilter;
  });

  // Calculate stats
  const totalCount = sectors.length;
  const completedCount = sectors.filter((s) => s.status === SectorStatus.COMPLETED || s.status === SectorStatus.SURVEYED).length;
  const inProgressCount = sectors.filter((s) => s.status === SectorStatus.IN_PROGRESS).length;
  const allocatedCount = sectors.filter((s) => s.status === SectorStatus.ALLOCATED).length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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
            Flight Sectors & Grids
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Partition project survey zones into discrete operational flight sectors and monitor survey coverage.
          </p>
        </div>

        {activePlan && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="btn btn-primary"
            style={{ fontSize: '0.875rem' }}
          >
            📐 Subdivide Flight Grid
          </button>
        )}
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

      {/* Main two-column layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 340px) 1fr',
          gap: '1.5rem',
        }}
      >
        {/* Left project selector list */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Survey Projects</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {projects.length} total
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No projects found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '560px', overflowY: 'auto' }}>
              {projects.map((p) => {
                const isSelected = p.id === selectedProjectId;
                const isApproved = p.status === ProjectStatus.APPROVED || p.status === ProjectStatus.ACTIVE;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    style={{
                      padding: '0.85rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(124, 58, 237, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid var(--brand-primary)' : '1px solid var(--border-color)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: isSelected ? '#fff' : 'var(--text-primary)' }}>
                        {p.title}
                      </span>
                      {isApproved && (
                        <span style={{ fontSize: '0.65rem', background: 'var(--accent-success)', color: '#000', padding: '0.1rem 0.35rem', borderRadius: '3px', fontWeight: 700 }}>
                          APPROVED
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span>Status: {p.status}</span>
                      <span>{p.updated_at ? new Date(p.updated_at).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right sectors workspace */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          {!selectedProject ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Select a project from the left panel to inspect its flight sectors.
            </div>
          ) : (
            <div>
              {/* Project Header Banner */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '1.5rem',
                  paddingBottom: '1rem',
                  borderBottom: '1px solid var(--border-color)',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Flight Grid Control
                  </div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.2rem' }}>
                    {selectedProject.title}
                  </h3>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className={`badge badge-${selectedProject.status}`}>
                    {selectedProject.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Progress Summary Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ padding: '0.85rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Sectors</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                    {totalCount}
                  </div>
                </div>

                <div style={{ padding: '0.85rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Completed</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-success)', marginTop: '0.2rem' }}>
                    {completedCount}
                  </div>
                </div>

                <div style={{ padding: '0.85rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>In Flight</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-warning)', marginTop: '0.2rem' }}>
                    {inProgressCount}
                  </div>
                </div>

                <div style={{ padding: '0.85rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Overall Progress</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--brand-primary)', marginTop: '0.2rem' }}>
                    {completionPercentage}%
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {['all', SectorStatus.PENDING, SectorStatus.ALLOCATED, SectorStatus.IN_PROGRESS, SectorStatus.COMPLETED].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      style={{
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.75rem',
                        borderRadius: '4px',
                        border: statusFilter === st ? '1px solid var(--brand-primary)' : '1px solid var(--border-color)',
                        background: statusFilter === st ? 'rgba(124, 58, 237, 0.2)' : 'transparent',
                        color: statusFilter === st ? 'var(--brand-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sectors Table */}
              {loadingSectors ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading sectors...
                </div>
              ) : sectors.length === 0 ? (
                <div
                  style={{
                    padding: '3rem',
                    textAlign: 'center',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '8px',
                    border: '1px dashed var(--border-color)',
                  }}
                >
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                    No flight sectors generated yet for this project.
                  </p>
                  {activePlan ? (
                    <button
                      onClick={() => setCreateModalOpen(true)}
                      className="btn btn-primary"
                    >
                      📐 Subdivide Flight Grid Now
                    </button>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: 'var(--accent-warning)' }}>
                      Flight sectors can only be generated under an approved operational flight plan.
                    </p>
                  )}
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Sector Code</th>
                        <th>Target Extent</th>
                        <th>Est. Duration</th>
                        <th>Survey Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSectors.map((sector) => (
                        <tr key={sector.id}>
                          <td>
                            <strong style={{ color: 'var(--text-primary)' }}>{sector.sector_code}</strong>
                          </td>
                          <td>{sector.target_area_sqkm ? `${sector.target_area_sqkm} sq km` : '2.5 sq km'}</td>
                          <td>{sector.estimated_flight_minutes ? `${sector.estimated_flight_minutes} mins` : '45 mins'}</td>
                          <td>
                            <select
                              className="input-field"
                              value={sector.status}
                              onChange={(e) => handleUpdateSectorStatus(sector.id, e.target.value as SectorStatus)}
                              style={{
                                padding: '0.2rem 0.5rem',
                                fontSize: '0.75rem',
                                borderRadius: '4px',
                                background: 'rgba(255, 255, 255, 0.05)',
                              }}
                            >
                              <option value={SectorStatus.PENDING}>Pending</option>
                              <option value={SectorStatus.ALLOCATED}>Allocated</option>
                              <option value={SectorStatus.IN_PROGRESS}>In Progress</option>
                              <option value={SectorStatus.SURVEYED}>Surveyed</option>
                              <option value={SectorStatus.COMPLETED}>Completed</option>
                              <option value={SectorStatus.FLAGGED}>Flagged</option>
                            </select>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => {
                                setAllocatingSector(sector);
                                setAllocModalOpen(true);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                            >
                              🛸 Dispatch Pilot
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sector Create Modal */}
      {selectedProject && activePlan && (
        <SectorCreateModal
          isOpen={createModalOpen}
          projectId={selectedProject.id}
          planId={activePlan.id}
          projectName={selectedProject.title}
          onClose={() => setCreateModalOpen(false)}
          onSubmit={handleCreateSectors}
        />
      )}

      {/* Allocation Modal */}
      {allocatingSector && (
        <AllocationModal
          isOpen={allocModalOpen}
          sectorId={allocatingSector.id}
          sectorName={allocatingSector.sector_code}
          onClose={() => {
            setAllocModalOpen(false);
            setAllocatingSector(null);
          }}
          onSubmit={handleAllocate}
        />
      )}
    </div>
  );
}
