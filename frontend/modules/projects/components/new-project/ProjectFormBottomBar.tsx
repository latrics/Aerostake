'use client';

import React from 'react';
import { Info, Loader2, FileText, Send } from 'lucide-react';

interface ProjectFormBottomBarProps {
  isReadOnly: boolean;
  isSavingDraft: boolean;
  isSubmitting: boolean;
  isRevision: boolean;
  onSaveDraft: () => void;
  onBack: () => void;
}

export function ProjectFormBottomBar({
  isReadOnly,
  isSavingDraft,
  isSubmitting,
  isRevision,
  onSaveDraft,
  onBack,
}: ProjectFormBottomBarProps) {
  return (
    <div
      className="wf-card"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '1rem 1.25rem',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e4e4e7',
        marginTop: '0.25rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.775rem', color: '#09090b' }}>
        <Info size={16} color="#09090b" style={{ flexShrink: 0 }} />
        <span>
          {isReadOnly
            ? 'This survey request has been submitted and sealed. Specifications are permanently read-only.'
            : 'Please review all details before submitting. You can save as draft and submit later.'}
        </span>
      </div>

      {isReadOnly ? (
        <button
          type="button"
          onClick={onBack}
          className="btn btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            height: '38px',
            fontSize: '0.8rem',
            fontWeight: 600,
            padding: '0 1rem',
            backgroundColor: '#ffffff',
            border: '1px solid #d4d4d8',
            cursor: 'pointer',
          }}
        >
          ← Back to Project Overview
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSavingDraft || isSubmitting}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              height: '38px',
              fontSize: '0.8rem',
              fontWeight: 600,
              padding: '0 1rem',
              backgroundColor: '#ffffff',
              border: '1px solid #d4d4d8',
              cursor: isSavingDraft || isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSavingDraft ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Saving Draft...
              </>
            ) : (
              <>
                <FileText size={15} /> Save Draft
              </>
            )}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isSavingDraft}
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              height: '38px',
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '0 1.15rem',
              backgroundColor: '#09090b',
              color: '#ffffff',
            }}
          >
            {isSubmitting ? (
              'Submitting...'
            ) : (
              <>
                <Send size={14} /> {isRevision ? 'Submit Request Revision' : 'Submit Request'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
