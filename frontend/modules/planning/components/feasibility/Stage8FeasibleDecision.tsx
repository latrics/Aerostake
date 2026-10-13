'use client';

import React from 'react';
import { FileCheck, Lock, CornerDownRight } from 'lucide-react';
import { PlanningFormData } from './types';

interface Stage8FeasibleDecisionProps {
  formData: PlanningFormData;
  updateField: (field: keyof PlanningFormData, value: any) => void;
  isClient: boolean;
  isClosed: boolean;
  role: string;
  handleSelectFeasibilityOption: (option: 'yes' | 'no' | 'need_clarity') => void;
  setIsPreviewModalOpen: (open: boolean) => void;
  onReplyToOpsRemarks: () => void;
  children?: React.ReactNode;
}

export function Stage8FeasibleDecision({
  formData,
  updateField,
  isClient,
  isClosed,
  role,
  handleSelectFeasibilityOption,
  setIsPreviewModalOpen,
  onReplyToOpsRemarks,
  children,
}: Stage8FeasibleDecisionProps) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e4e4e7',
        borderRadius: '8px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            border: '1px solid #d4d4d8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fafafa',
          }}
        >
          <FileCheck size={18} color="#09090b" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
            8. Feasible to Proceed
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '0.2rem' }}>
            Choose an operational feasibility determination. Selecting an option opens the full 8-stage verification review popup.
          </p>
        </div>
      </div>

      {/* Three Mutually Exclusive Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
            Operational Feasibility Determination {isClient && <span style={{ fontSize: '0.72rem', color: '#71717a' }}>(Formulated by LATRICS Ops)</span>}
          </span>
          {isClient && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#71717a', backgroundColor: '#f4f4f5', padding: '0.15rem 0.5rem', borderRadius: '4px', border: '1px solid #e4e4e7' }}>
              <Lock size={11} />
              <span>Read-Only for Client</span>
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
          {[
            {
              key: 'yes' as const,
              title: 'Yes (Feasible)',
              subtext: 'An acknowledgement form will subsequently appear on the Client side for sign-off.',
            },
            {
              key: 'no' as const,
              title: 'No (Not Feasible)',
              subtext: 'The request will be closed and formal rejection rationale recorded.',
            },
            {
              key: 'need_clarity' as const,
              title: 'Need More Clarity',
              subtext: 'The request will be returned to the Client for responses to the individual LATRICS remarks threads.',
            },
          ].map((opt) => {
            const isSelected = formData.feasibilityDecision === opt.key;
            return (
              <div
                key={opt.key}
                onClick={() => !isClient && handleSelectFeasibilityOption(opt.key)}
                style={{
                  border: isSelected ? '2px solid #09090b' : '1px solid #e4e4e7',
                  backgroundColor: isSelected ? '#fafafa' : '#ffffff',
                  borderRadius: '6px',
                  padding: '1rem',
                  cursor: isClient ? 'default' : 'pointer',
                  opacity: isClient && !isSelected ? 0.6 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#09090b' }}>
                    {opt.title}
                  </span>
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: isSelected ? '5px solid #09090b' : '1.5px solid #d4d4d8',
                      backgroundColor: '#ffffff',
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.725rem', color: '#71717a', lineHeight: 1.4 }}>
                  {opt.subtext}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Large LATRICS Remarks Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
            Final LATRICS Operational Remarks {isClient && <span style={{ fontSize: '0.72rem', color: '#71717a' }}>(Ops Sealed Record)</span>}
          </label>
          {isClient && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#71717a', backgroundColor: '#f4f4f5', padding: '0.15rem 0.5rem', borderRadius: '4px', border: '1px solid #e4e4e7' }}>
              <Lock size={11} />
              <span>Read-Only</span>
            </span>
          )}
        </div>
        <textarea
          rows={4}
          disabled={isClient}
          readOnly={isClient}
          value={formData.decisionRemarks}
          onChange={(e) => updateField('decisionRemarks', e.target.value)}
          placeholder={
            isClient
              ? 'No final operational remarks entered by LATRICS Ops yet.'
              : 'Enter final operational findings, engineering justification, or missing clarity items...'
          }
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '0.8rem',
            border: '1px solid #d4d4d8',
            borderRadius: '6px',
            fontFamily: 'inherit',
            backgroundColor: isClient ? '#f4f4f5' : '#ffffff',
            cursor: isClient ? 'default' : 'text',
            color: '#09090b',
          }}
        />
        {isClient && formData.decisionRemarks && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button
              type="button"
              onClick={onReplyToOpsRemarks}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.85rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: '#ffffff',
                color: '#09090b',
                border: '1px solid #09090b',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <CornerDownRight size={13} />
              <span>Reply to Operations Remarks</span>
            </button>
          </div>
        )}
      </div>

      {/* Universal Remarks & Discussion Thread for Stage 8 */}
      {children}

      {/* Review Popup Trigger banner - Ops Only */}
      {role === 'ops' && !isClosed && formData.feasibilityDecision && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '6px',
            border: '1.5px solid #09090b',
            backgroundColor: '#fafafa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b', display: 'block' }}>
              Feasibility Decision Selected: {formData.feasibilityDecision.toUpperCase()}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#71717a' }}>
              Open the complete 8-stage preview popup to review all details, confirm verification, and submit.
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsPreviewModalOpen(true)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              fontWeight: 800,
              backgroundColor: '#09090b',
              color: '#ffffff',
              border: '1px solid #09090b',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Open Full Review Popup
          </button>
        </div>
      )}
    </div>
  );
}
