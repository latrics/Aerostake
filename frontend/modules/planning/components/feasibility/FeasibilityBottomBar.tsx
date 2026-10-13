'use client';

import React from 'react';
import { ArrowLeft, ArrowRight, Save, Check, FileCheck } from 'lucide-react';

interface FeasibilityBottomBarProps {
  currentStage: number;
  setCurrentStage: React.Dispatch<React.SetStateAction<number>>;
  role: string;
  isClosed: boolean;
  isPilot: boolean;
  isClient: boolean;
  isCurrentStageSaved: boolean;
  handleSaveDraft: () => Promise<void>;
  handleProceedNextSection: () => Promise<void>;
  handleSubmitClarificationsToOps: () => Promise<void>;
  planningWorkflowStatus: string;
  setIsPreviewModalOpen: (open: boolean) => void;
  feasibilityDecision: string;
  onShowToast: (msg: string) => void;
  activeProject: any;
  propProjectId?: string;
  router: any;
}

export function FeasibilityBottomBar({
  currentStage,
  setCurrentStage,
  role,
  isClosed,
  isPilot,
  isClient,
  isCurrentStageSaved,
  handleSaveDraft,
  handleProceedNextSection,
  handleSubmitClarificationsToOps,
  planningWorkflowStatus,
  setIsPreviewModalOpen,
  feasibilityDecision,
  onShowToast,
  activeProject,
  propProjectId,
  router,
}: FeasibilityBottomBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        border: '1px solid #e4e4e7',
        borderRadius: '8px',
        padding: '0.85rem 1.25rem',
      }}
    >
      {/* Previous */}
      <button
        type="button"
        disabled={currentStage === 1}
        onClick={() => setCurrentStage((p) => Math.max(1, p - 1))}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          height: '36px',
          padding: '0 1rem',
          fontSize: '0.8rem',
          fontWeight: 600,
          backgroundColor: currentStage === 1 ? '#f4f4f5' : '#ffffff',
          border: '1px solid #d4d4d8',
          borderRadius: '6px',
          color: currentStage === 1 ? '#a1a1aa' : '#09090b',
          cursor: currentStage === 1 ? 'not-allowed' : 'pointer',
        }}
      >
        <ArrowLeft size={14} />
        <span>Previous</span>
      </button>

      {/* Right: Next Section, Save Draft, or Submit */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {role === 'ops' && !isClosed && (
          <button
            type="button"
            onClick={handleSaveDraft}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              height: '36px',
              padding: '0 1.15rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              backgroundColor: '#ffffff',
              border: isCurrentStageSaved ? '1px solid #09090b' : '2px solid #09090b',
              borderRadius: '6px',
              color: '#09090b',
              cursor: 'pointer',
            }}
          >
            <Save size={14} />
            <span>Save Draft</span>
            {isCurrentStageSaved && <Check size={13} strokeWidth={3} />}
          </button>
        )}

        {isClosed ? (
          currentStage < 8 ? (
            <button
              type="button"
              onClick={() => setCurrentStage((p) => Math.min(8, p + 1))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                height: '36px',
                padding: '0 1.25rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                backgroundColor: '#09090b',
                color: '#ffffff',
                border: '1px solid #09090b',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <span>Next Section</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push(`/projects/${propProjectId || activeProject?.id || ''}/overview`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                height: '36px',
                padding: '0 1.25rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                backgroundColor: '#09090b',
                color: '#ffffff',
                border: '1px solid #09090b',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Overview</span>
            </button>
          )
        ) : isPilot ? (
          currentStage < 8 ? (
            <button
              type="button"
              onClick={() => setCurrentStage((p) => Math.min(8, p + 1))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                height: '36px',
                padding: '0 1.25rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                backgroundColor: '#09090b',
                color: '#ffffff',
                border: '1px solid #09090b',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <span>Next Section</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push(`/projects/${propProjectId || activeProject?.id || ''}/overview`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                height: '36px',
                padding: '0 1.25rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                backgroundColor: '#09090b',
                color: '#ffffff',
                border: '1px solid #09090b',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Overview</span>
            </button>
          )
        ) : isClient ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {currentStage < 8 && (
              <button
                type="button"
                onClick={() => setCurrentStage((p) => Math.min(8, p + 1))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  height: '36px',
                  padding: '0 1.25rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                  border: '1px solid #09090b',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <span>Next Section</span>
                <ArrowRight size={14} />
              </button>
            )}
            {(planningWorkflowStatus === 'awaiting_clarity' || planningWorkflowStatus === 'clarification_submitted') && (
              <button
                type="button"
                onClick={handleSubmitClarificationsToOps}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  height: '36px',
                  padding: '0 1.25rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  backgroundColor: currentStage === 8 ? '#09090b' : '#ffffff',
                  color: currentStage === 8 ? '#ffffff' : '#09090b',
                  border: '1px solid #09090b',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <Check size={14} strokeWidth={3} />
                <span>Submit Clarifications to LATRICS Ops</span>
              </button>
            )}
          </div>
        ) : currentStage < 8 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleProceedNextSection}
              title="Proceed to next section"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                height: '36px',
                padding: '0 1.25rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                backgroundColor: '#09090b',
                color: '#ffffff',
                border: '1px solid #09090b',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <span>Next Section</span>
              <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (!feasibilityDecision) {
                onShowToast('Please select a Feasibility Determination option.');
                return;
              }
              setIsPreviewModalOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              height: '36px',
              padding: '0 1.35rem',
              fontSize: '0.8rem',
              fontWeight: 800,
              backgroundColor: '#09090b',
              color: '#ffffff',
              border: '1px solid #09090b',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            <FileCheck size={14} />
            <span>Review &amp; Submit Planning</span>
          </button>
        )}
      </div>
    </div>
  );
}
