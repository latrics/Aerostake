'use client';

import React from 'react';
import { AlertTriangle, HelpCircle, CheckCircle2, History, Check, Lock } from 'lucide-react';
import { PlanningFormData } from './types';

interface FeasibilityWorkflowBannersProps {
  isViewingHistorical: boolean;
  activeVersionCode: string | null;
  latestSender: 'ops' | 'client' | null;
  onReturnToActiveVersion: () => void;
  planningWorkflowStatus: string;
  isNotFeasible: boolean;
  isClosed: boolean;
  isClient: boolean;
  role: string;
  formData: PlanningFormData;
  handleSubmitClarificationsToOps: () => Promise<void>;
  handleOpsResumePlanning: () => Promise<void>;
  planningVersionsCount: number;
  hasStageThreads: boolean;
}

export function FeasibilityWorkflowBanners({
  isViewingHistorical,
  activeVersionCode,
  latestSender,
  onReturnToActiveVersion,
  planningWorkflowStatus,
  isNotFeasible,
  isClosed,
  isClient,
  role,
  formData,
  handleSubmitClarificationsToOps,
  handleOpsResumePlanning,
  planningVersionsCount,
  hasStageThreads,
}: FeasibilityWorkflowBannersProps) {
  return (
    <>
      {/* ── Historical Version Alert Banner ── */}
      {isViewingHistorical && (
        <div
          style={{
            backgroundColor: '#f4f4f5',
            border: '1px solid #d4d4d8',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.825rem',
            color: '#09090b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} />
            <span>
              <strong>Historical Snapshot:</strong> You are reviewing <strong>{activeVersionCode}</strong> submitted by [<strong>{latestSender === 'client' ? 'Client' : 'LATRICS Ops'}</strong>]. This snapshot is read-only.
            </span>
          </div>
          <button
            type="button"
            onClick={onReturnToActiveVersion}
            style={{
              padding: '0.3rem 0.75rem',
              backgroundColor: '#09090b',
              color: '#ffffff',
              borderRadius: '4px',
              border: 'none',
              fontSize: '0.775rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Return to Active Version
          </button>
        </div>
      )}

      {/* ── Clarification Requested Status Alert Banner ── */}
      {(planningWorkflowStatus === 'awaiting_clarity' || (!isNotFeasible && formData.feasibilityDecision === 'need_clarity' && planningWorkflowStatus !== 'clarification_submitted')) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '1rem 1.25rem',
            backgroundColor: '#fafafa',
            border: '1.5px solid #09090b',
            borderRadius: '6px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <HelpCircle size={22} color="#09090b" style={{ flexShrink: 0 }} />
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
                {isClient
                  ? 'Clarification Requested by LATRICS Operations'
                  : 'Planning Form Submitted — Awaiting Client Clarification'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#52525b', display: 'block', marginTop: '0.15rem' }}>
                {isClient
                  ? 'LATRICS Operations reviewed this plan and requested additional clarifications. Parameters are read-only. Please inspect Operations remarks in each section, reply directly to their remarks or add new remarks, and submit your responses.'
                  : 'You have submitted this operational plan with "Need More Clarity". Client can review flight parameters (read-only), reply to your section remarks, and submit their responses back.'}
              </span>
            </div>
          </div>
          {isClient && (
            <button
              type="button"
              onClick={handleSubmitClarificationsToOps}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                height: '34px',
                padding: '0 1rem',
                fontSize: '0.775rem',
                fontWeight: 700,
                backgroundColor: '#09090b',
                color: '#ffffff',
                border: '1px solid #09090b',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <Check size={14} strokeWidth={3} />
              <span>Submit Clarifications</span>
            </button>
          )}
        </div>
      )}

      {/* ── Clarifications Submitted Status Alert Banner ── */}
      {planningWorkflowStatus === 'clarification_submitted' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.85rem 1.25rem',
            backgroundColor: '#fafafa',
            border: '1px solid #09090b',
            borderRadius: '6px',
          }}
        >
          <CheckCircle2 size={20} color="#09090b" style={{ flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
              {role === 'client' ? 'Clarifications Submitted' : 'Client Clarifications Received'}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#52525b', display: 'block' }}>
              {role === 'client'
                ? 'Your clarification responses and uploaded attachments have been delivered to LATRICS Ops for review.'
                : 'The client has responded to review remarks. Inspect the discussion threads in Sections 1–7, reply if further clarification is needed, or proceed to final decision.'}
            </span>
          </div>
        </div>
      )}

      {/* ── Not Feasible Workflow Status Alert Banner ── */}
      {isNotFeasible && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            backgroundColor: '#fafafa',
            border: '2px solid #09090b',
            borderRadius: '6px',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={22} color="#09090b" style={{ flexShrink: 0 }} />
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
                {isClient
                  ? 'Project Marked Not Feasible — Flight Parameters Locked'
                  : 'Project Marked Not Feasible — Resumption Available'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#52525b', display: 'block', marginTop: '0.15rem' }}>
                {isClient
                  ? 'LATRICS Operations reviewed this survey request as not feasible under initial parameters. Flight parameters are locked. You and your appointed subordinate can reply to remarks or post new remarks in the discussion threads below to discuss adjustments or request reconsideration.'
                  : 'This survey request is currently marked Not Feasible (Cancelled / Hold). Flight parameters are locked. Operations and client team can continue coordination via the discussion threads below, or you can recalibrate parameters and resume planning.'}
              </span>
            </div>
          </div>

          {!isClient && (
            <button
              type="button"
              onClick={handleOpsResumePlanning}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 1.15rem',
                fontSize: '0.775rem',
                fontWeight: 700,
                backgroundColor: '#09090b',
                color: '#ffffff',
                border: '1px solid #09090b',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <History size={14} />
              <span>Resume with "Need More Clarity"</span>
            </button>
          )}
        </div>
      )}

      {/* ── Client Pending Formulation Notice ── */}
      {role === 'client' && planningVersionsCount === 0 && !hasStageThreads && (
        <div
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: '#fafafa',
            border: '1px solid #e4e4e7',
            borderRadius: '8px',
            marginBottom: '0.75rem',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#09090b' }}>
            Operational Plan Under Formulation by LATRICS Operations
          </div>
          <div style={{ fontSize: '0.8rem', color: '#52525b', marginTop: '0.35rem', lineHeight: 1.5 }}>
            LATRICS Operations has not yet published an operational plan for this survey request. Once Operations completes the airspace, terrain, GCP targets, and flight telemetry assessment, the formulated plan will appear here for your review and sign-off.
          </div>
        </div>
      )}

      {/* ── Planning Form Closed & Sealed Banner ── */}
      {isClosed && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#fafafa',
            border: '1.5px solid #09090b',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '0.5rem',
          }}
        >
          <Lock size={18} color="#09090b" style={{ flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
              Operational Planning Finalised &amp; Sealed — Read-Only Mode
            </span>
            <span style={{ fontSize: '0.75rem', color: '#52525b', display: 'block', marginTop: '0.15rem' }}>
              This project has been agreed upon by both Client and Operations and has converted to an active Project. All planning specifications, sensor parameters, boundaries, and feasibility decisions are permanently locked as an immutable audit record.
            </span>
          </div>
        </div>
      )}
    </>
  );
}
