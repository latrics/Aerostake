'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { projectApi } from '@/modules/projects/api';
import { Project, ProjectStatus } from '@/modules/projects/types';
import { planningApi } from '@/modules/planning/api';
import { OperationalPlan, PlanStatus, OperationalPlanCreate } from '@/modules/planning/types';
import { requestApi } from '@/modules/requests/api';
import { RequestVersion } from '@/modules/requests/types';
import { PlanPublishModal } from '@/modules/planning/components/PlanPublishModal';

export default function PlanningPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activePlan, setActivePlan] = useState<OperationalPlan | null>(null);
  const [planHistory, setPlanHistory] = useState<OperationalPlan[]>([]);
  const [requestVersions, setRequestVersions] = useState<RequestVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Publish Modal
  const [publishModalOpen, setPublishModalOpen] = useState(false);

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
      setPlanHistory([]);
      setRequestVersions([]);
      return;
    }

    const loadProjectPlanningData = async () => {
      try {
        setLoadingPlan(true);
        const [plan, history, requests] = await Promise.all([
          planningApi.getActivePlan(selectedProjectId).catch(() => null),
          planningApi.listProjectPlans(selectedProjectId).catch(() => []),
          requestApi.listProjectRequests(selectedProjectId).catch(() => []),
        ]);
        setActivePlan(plan);
        setPlanHistory(history);
        setRequestVersions(requests);
      } catch (err: any) {
        console.error('Failed to load project planning data:', err);
      } finally {
        setLoadingPlan(false);
      }
    };

    loadProjectPlanningData();
  }, [selectedProjectId]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const latestRequest = requestVersions.length > 0
    ? [...requestVersions].sort((a, b) => b.version - a.version)[0]
    : null;

  const handlePublishPlan = async (requestVersionId: string, planData: OperationalPlanCreate) => {
    try {
      await planningApi.publishPlan(requestVersionId, planData);
      setFeedbackMsg({ type: 'success', text: 'Operational flight plan published and delivered to client!' });
      // Refresh planning state
      const [plan, history] = await Promise.all([
        planningApi.getActivePlan(selectedProjectId),
        planningApi.listProjectPlans(selectedProjectId),
      ]);
      setActivePlan(plan);
      setPlanHistory(history);
      await fetchProjects();
    } catch (err: any) {
      throw err;
    }
  };

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
            Operational Flight Planning
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Draft resource estimations, compute pricing quotations, and publish flight plans for client review.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            href="/planning/feasibility"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontSize: '0.825rem',
              fontWeight: 700,
              backgroundColor: '#ffffff',
              border: '1.5px solid #09090b',
              color: '#09090b',
              padding: '0.5rem 0.85rem',
              borderRadius: '6px',
              textDecoration: 'none',
            }}
          >
            <span>Project Planning & Feasibility</span>
          </Link>

          {latestRequest && (
            <button
              onClick={() => setPublishModalOpen(true)}
              className="btn btn-primary"
              style={{ fontSize: '0.875rem' }}
            >
              ➕ Draft New Plan (Req {latestRequest.version})
            </button>
          )}
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

      {/* Two column layout */}
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
              No projects created yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '560px', overflowY: 'auto' }}>
              {projects.map((p) => {
                const isSelected = p.id === selectedProjectId;
                const needsPlan = p.status === ProjectStatus.SUBMITTED;
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
                      {needsPlan && (
                        <span style={{ fontSize: '0.65rem', background: 'var(--accent-warning)', color: '#000', padding: '0.1rem 0.35rem', borderRadius: '3px', fontWeight: 700 }}>
                          NEEDS PLAN
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

        {/* Right planning workspace */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          {!selectedProject ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Select a project from the left panel to manage its operational flight plan.
            </div>
          ) : (
            <div>
              {/* Project Header */}
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
                    Flight Strategy Workspace
                  </div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.2rem' }}>
                    {selectedProject.title}
                  </h3>
                </div>

                <span className={`badge badge-${selectedProject.status}`}>
                  {selectedProject.status.toUpperCase()}
                </span>
              </div>

              {/* Active Plan or Call-to-action */}
              {loadingPlan ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading operational plan details...
                </div>
              ) : activePlan ? (
                <div>
                  <div
                    className="glass-card"
                    style={{
                      padding: '1.5rem',
                      borderLeft: `4px solid ${
                        activePlan.status === PlanStatus.APPROVED
                          ? 'var(--accent-success)'
                          : activePlan.status === PlanStatus.PUBLISHED
                          ? 'var(--accent-info)'
                          : 'var(--brand-primary)'
                      }`,
                      marginBottom: '1.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                          Active Operational Plan
                        </h4>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          Published: {activePlan.published_at ? new Date(activePlan.published_at).toLocaleString() : 'Recently'}
                        </div>
                      </div>
                      <span className={`badge badge-${activePlan.status}`}>
                        {activePlan.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Metrics grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: '1rem',
                        marginBottom: '1.25rem',
                      }}
                    >
                      <div style={{ padding: '0.85rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Est. Flight Duration</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                          ⏱️ {activePlan.estimated_flight_hours} hrs
                        </div>
                      </div>

                      <div style={{ padding: '0.85rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Commercial Quote</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-success)', marginTop: '0.25rem' }}>
                          💰 ${activePlan.estimated_cost_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div style={{ padding: '0.85rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Licensed Pilots</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                          👨‍✈️ {activePlan.required_pilots_count} Personnel
                        </div>
                      </div>

                      <div style={{ padding: '0.85rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Drone Fleet Hardware</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                          🛸 {activePlan.required_drones_count} Units
                        </div>
                      </div>
                    </div>

                    {activePlan.flight_strategy_notes && (
                      <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                          Flight Strategy & Operational Constraints:
                        </div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {activePlan.flight_strategy_notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: '2.5rem',
                    textAlign: 'center',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '8px',
                    border: '1px dashed var(--border-color)',
                    marginBottom: '1.5rem',
                  }}
                >
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                    No published operational plan found for this project.
                  </p>
                  {latestRequest ? (
                    <button
                      onClick={() => setPublishModalOpen(true)}
                      className="btn btn-primary"
                    >
                      🚀 Draft & Publish Plan against Request {latestRequest.version}
                    </button>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: 'var(--accent-warning)' }}>
                      Client has not yet submitted survey requirements for this project.
                    </p>
                  )}
                </div>
              )}

              {/* Historical Plans Accordion/List */}
              {planHistory.length > 1 && (
                <div style={{ marginTop: '2rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                    Plan Revisions Archive ({planHistory.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {planHistory.map((p, idx) => (
                      <div
                        key={p.id}
                        style={{
                          padding: '0.85rem 1rem',
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.85rem',
                        }}
                      >
                        <div>
                          <strong>Revision #{planHistory.length - idx}</strong> — ${p.estimated_cost_usd} USD ({p.estimated_flight_hours} hrs, {p.required_pilots_count} pilots)
                        </div>
                        <span className={`badge badge-${p.status}`}>
                          {p.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Publish Modal */}
      {latestRequest && (
        <PlanPublishModal
          isOpen={publishModalOpen}
          requestVersionId={latestRequest.id}
          versionNumber={latestRequest.version}
          projectName={selectedProject?.title}
          onClose={() => setPublishModalOpen(false)}
          onSubmit={handlePublishPlan}
        />
      )}
    </div>
  );
}
