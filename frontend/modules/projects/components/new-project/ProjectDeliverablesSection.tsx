'use client';

import React from 'react';
import { Info, Check } from 'lucide-react';
import {
  PRE_PROCESSING_DELIVERABLES,
  POST_PROCESSING_DELIVERABLES,
} from '../../new-project-constants';

interface ProjectDeliverablesSectionProps {
  optPreProcessing: boolean;
  setOptPreProcessing: (val: boolean) => void;
  optPostProcessing: boolean;
  setOptPostProcessing: (val: boolean) => void;
  preDeliverables: Record<string, boolean>;
  togglePreDeliverable: (id: string) => void;
  isPreDeliverableEnabled: (id: string) => boolean;
  preOtherText: string;
  setPreOtherText: (val: string) => void;
  setPreDeliverables: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  postDeliverables: Record<string, boolean>;
  togglePostDeliverable: (id: string) => void;
  postOtherText: string;
  setPostOtherText: (val: string) => void;
  setPostDeliverables: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  isReadOnly?: boolean;
}

export function ProjectDeliverablesSection({
  optPreProcessing,
  setOptPreProcessing,
  optPostProcessing,
  setOptPostProcessing,
  preDeliverables,
  togglePreDeliverable,
  isPreDeliverableEnabled,
  preOtherText,
  setPreOtherText,
  setPreDeliverables,
  postDeliverables,
  togglePostDeliverable,
  postOtherText,
  setPostOtherText,
  setPostDeliverables,
  isReadOnly,
}: ProjectDeliverablesSectionProps) {
  return (
    <div
      className="wf-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e4e4e7',
        padding: '1.25rem',
      }}
    >
      <div>
        <h2 className="wf-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b' }}>
          4. Deliverables <span style={{ color: '#09090b' }}>*</span>
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
          Select deliverables based on the selected payload and processing type.
        </p>
      </div>

      {/* Processing Mode Switcher (Multi-select Checkbox Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
        {/* Pre Processing Card */}
        <div
          onClick={() => {
            if (!isReadOnly) setOptPreProcessing(!optPreProcessing);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.65rem 0.75rem',
            border: optPreProcessing ? '2px solid #09090b' : '1px solid #e4e4e7',
            borderRadius: '6px',
            cursor: isReadOnly ? 'default' : 'pointer',
            backgroundColor: '#ffffff',
            transition: 'all 0.15s ease',
          }}
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '3px',
              border: optPreProcessing ? '1px solid #09090b' : '1.5px solid #a1a1aa',
              backgroundColor: optPreProcessing ? '#09090b' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {optPreProcessing && <Check size={12} color="#ffffff" strokeWidth={3} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#09090b' }}>
              Pre Processing
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
              Raw data and basic outputs
            </span>
          </div>
        </div>

        {/* Post Processing Card */}
        <div
          onClick={() => {
            if (!isReadOnly) setOptPostProcessing(!optPostProcessing);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.65rem 0.75rem',
            border: optPostProcessing ? '2px solid #09090b' : '1px solid #e4e4e7',
            borderRadius: '6px',
            cursor: isReadOnly ? 'default' : 'pointer',
            backgroundColor: '#ffffff',
            transition: 'all 0.15s ease',
          }}
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '3px',
              border: optPostProcessing ? '1px solid #09090b' : '1.5px solid #a1a1aa',
              backgroundColor: optPostProcessing ? '#09090b' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {optPostProcessing && <Check size={12} color="#ffffff" strokeWidth={3} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#09090b' }}>
              Post Processing
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
              Value added products and analysis
            </span>
          </div>
        </div>
      </div>

      {/* Info Banner Note */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.45rem 0.65rem',
          backgroundColor: '#fafafa',
          border: '1px solid #e4e4e7',
          borderRadius: '4px',
          fontSize: '0.7rem',
          color: '#52525b',
        }}
      >
        <Info size={13} style={{ flexShrink: 0 }} />
        <span>You can select Pre Processing, Post Processing, or both. Deliverables are filtered based on selected payload.</span>
      </div>

      {!optPreProcessing && !optPostProcessing && (
        <div
          style={{
            padding: '1.25rem',
            textAlign: 'center',
            backgroundColor: '#fafafa',
            border: '1px dashed #d4d4d8',
            borderRadius: '6px',
            color: '#71717a',
            fontSize: '0.75rem',
          }}
        >
          Please select at least one processing type above (Pre Processing and/or Post Processing) to configure deliverables.
        </div>
      )}

      {/* ── 1. Pre Processing Deliverables ── */}
      {optPreProcessing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
          {optPreProcessing && optPostProcessing && (
            <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#09090b' }}>
              Pre-Processing Deliverables
            </span>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {PRE_PROCESSING_DELIVERABLES.map((item) => {
              const isEnabled = isPreDeliverableEnabled(item.id);
              const isChecked = isEnabled && !!preDeliverables[item.id];

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (isEnabled && !isReadOnly) togglePreDeliverable(item.id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.65rem 0.75rem',
                    border: isChecked
                      ? '1px solid #09090b'
                      : isEnabled
                      ? '1px solid #e4e4e7'
                      : '1px solid #f4f4f5',
                    borderRadius: '4px',
                    backgroundColor: isEnabled ? '#ffffff' : '#fafafa',
                    cursor: isEnabled && !isReadOnly ? 'pointer' : 'not-allowed',
                    opacity: isEnabled ? 1 : 0.45,
                    transition: 'all 0.15s ease',
                    userSelect: 'none',
                  }}
                >
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '3px',
                      border: isChecked
                        ? '1px solid #09090b'
                        : isEnabled
                        ? '1.5px solid #a1a1aa'
                        : '1.5px solid #d4d4d8',
                      backgroundColor: isChecked ? '#09090b' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {isChecked && <Check size={12} color="#ffffff" strokeWidth={3} />}
                  </div>
                  <span
                    style={{
                      fontSize: '0.775rem',
                      fontWeight: isChecked ? 700 : isEnabled ? 500 : 400,
                      color: isEnabled ? '#09090b' : '#a1a1aa',
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Other Option in Pre Processing */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.5rem 0.75rem',
              border: preDeliverables.other ? '1px solid #09090b' : '1px solid #e4e4e7',
              borderRadius: '4px',
              backgroundColor: '#ffffff',
            }}
          >
            <div
              onClick={() => {
                if (!isReadOnly) togglePreDeliverable('other');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: isReadOnly ? 'default' : 'pointer',
                userSelect: 'none',
              }}
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '3px',
                  border: preDeliverables.other ? '1px solid #09090b' : '1.5px solid #a1a1aa',
                  backgroundColor: preDeliverables.other ? '#09090b' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {preDeliverables.other && <Check size={12} color="#ffffff" strokeWidth={3} />}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: preDeliverables.other ? 700 : 500, color: '#09090b', whiteSpace: 'nowrap' }}>
                Other
              </span>
            </div>

            <input
              type="text"
              disabled={isReadOnly}
              placeholder="Specify custom pre-processing output..."
              value={preOtherText}
              onChange={(e) => {
                setPreOtherText(e.target.value);
                if (!preDeliverables.other) {
                  setPreDeliverables((prev) => ({ ...prev, other: true }));
                }
              }}
              className="form-input"
              style={{
                flex: 1,
                fontSize: '0.75rem',
                height: '28px',
                padding: '0 0.5rem',
                backgroundColor: preDeliverables.other ? '#ffffff' : '#fafafa',
              }}
            />
          </div>
        </div>
      )}

      {/* ── 2. Post Processing Deliverables ── */}
      {optPostProcessing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.45rem' }}>
          {optPreProcessing && optPostProcessing && (
            <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#09090b' }}>
              Post-Processing Deliverables
            </span>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {POST_PROCESSING_DELIVERABLES.map((item) => {
              const isChecked = !!postDeliverables[item.id];

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!isReadOnly) togglePostDeliverable(item.id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.65rem 0.75rem',
                    border: isChecked ? '1px solid #09090b' : '1px solid #e4e4e7',
                    borderRadius: '4px',
                    backgroundColor: '#ffffff',
                    cursor: isReadOnly ? 'default' : 'pointer',
                    transition: 'all 0.15s ease',
                    userSelect: 'none',
                  }}
                >
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '3px',
                      border: isChecked ? '1px solid #09090b' : '1.5px solid #a1a1aa',
                      backgroundColor: isChecked ? '#09090b' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {isChecked && <Check size={12} color="#ffffff" strokeWidth={3} />}
                  </div>
                  <span
                    style={{
                      fontSize: '0.775rem',
                      fontWeight: isChecked ? 700 : 500,
                      color: '#09090b',
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Other Option in Post Processing */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.5rem 0.75rem',
              border: postDeliverables.other ? '1px solid #09090b' : '1px solid #e4e4e7',
              borderRadius: '4px',
              backgroundColor: '#ffffff',
            }}
          >
            <div
              onClick={() => {
                if (!isReadOnly) togglePostDeliverable('other');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: isReadOnly ? 'default' : 'pointer',
                userSelect: 'none',
              }}
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '3px',
                  border: postDeliverables.other ? '1px solid #09090b' : '1.5px solid #a1a1aa',
                  backgroundColor: postDeliverables.other ? '#09090b' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {postDeliverables.other && <Check size={12} color="#ffffff" strokeWidth={3} />}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: postDeliverables.other ? 700 : 500, color: '#09090b', whiteSpace: 'nowrap' }}>
                Other
              </span>
            </div>

            <input
              type="text"
              disabled={isReadOnly}
              placeholder="Specify custom deliverable..."
              value={postOtherText}
              onChange={(e) => {
                setPostOtherText(e.target.value);
                if (!postDeliverables.other) {
                  setPostDeliverables((prev) => ({ ...prev, other: true }));
                }
              }}
              className="form-input"
              style={{
                flex: 1,
                fontSize: '0.75rem',
                height: '28px',
                padding: '0 0.5rem',
                backgroundColor: postDeliverables.other ? '#ffffff' : '#fafafa',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
