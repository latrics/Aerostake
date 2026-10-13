'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { FeasibilityStageItem } from './types';

interface FeasibilityStepNavigationProps {
  stages: FeasibilityStageItem[];
  currentStage: number;
  setCurrentStage: (stage: number) => void;
  isStageParametersFilled: (stageNum: number) => boolean;
  isClosed: boolean;
}

export function FeasibilityStepNavigation({
  stages,
  currentStage,
  setCurrentStage,
  isStageParametersFilled,
  isClosed,
}: FeasibilityStepNavigationProps) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e4e4e7',
        borderRadius: '8px',
        padding: '1rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <div style={{ padding: '0 0.5rem 0.5rem', borderBottom: '1px solid #e4e4e7', marginBottom: '0.25rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#09090b', letterSpacing: '0.02em' }}>
          Planning Stages
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {stages.map((stage, idx) => {
          const isActive = currentStage === stage.num;
          const isStageFilled = isStageParametersFilled(stage.num);
          const isStepDone = !isActive && (isClosed || isStageFilled);
          const isStageComplete = isClosed || isStageFilled;

          return (
            <div key={stage.num} style={{ position: 'relative' }}>
              {idx < stages.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    left: '18px',
                    top: '32px',
                    width: '1.5px',
                    height: '24px',
                    backgroundColor: isStageComplete ? '#09090b' : '#e4e4e7',
                    zIndex: 1,
                  }}
                />
              )}

              <button
                type="button"
                onClick={() => {
                  setCurrentStage(stage.num);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  padding: '0.55rem 0.65rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isActive ? '#f4f4f5' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  position: 'relative',
                  zIndex: 2,
                  transition: 'background-color 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: isActive ? '1.5px solid #09090b' : (isStepDone ? '1px solid #09090b' : '1px solid #d4d4d8'),
                    backgroundColor: isActive ? '#09090b' : (isStepDone ? '#09090b' : '#ffffff'),
                    color: isActive || isStepDone ? '#ffffff' : '#71717a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {isStepDone ? <Check size={12} strokeWidth={3} /> : stage.num}
                </div>

                <span
                  style={{
                    fontSize: '0.775rem',
                    fontWeight: isActive ? 800 : 500,
                    color: isActive ? '#09090b' : (isStageComplete ? '#09090b' : '#52525b'),
                    lineHeight: 1.25,
                  }}
                >
                  {stage.title}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
