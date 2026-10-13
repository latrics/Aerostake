'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, Plus, X, FileText } from 'lucide-react';
import { formatFileSize } from '../../new-project-constants';

interface ScopeFile {
  name: string;
  size?: string;
  dataUrl?: string;
}

interface ProjectScopeDocumentSectionProps {
  scopeFiles: File[];
  existingScopeFiles: ScopeFile[];
  onAddScopeFiles: (files: FileList | File[]) => void;
  onRemoveScopeFile: (index: number) => void;
  onRemoveExistingScopeFile: (index: number) => void;
  onClearAllScopeFiles: () => void;
  isReadOnly?: boolean;
}

export function ProjectScopeDocumentSection({
  scopeFiles,
  existingScopeFiles,
  onAddScopeFiles,
  onRemoveScopeFile,
  onRemoveExistingScopeFile,
  onClearAllScopeFiles,
  isReadOnly,
}: ProjectScopeDocumentSectionProps) {
  const [isDraggingScope, setIsDraggingScope] = useState(false);
  const scopeInputRef = useRef<HTMLInputElement>(null);
  const totalCount = existingScopeFiles.length + scopeFiles.length;

  return (
    <div
      className="wf-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e4e4e7',
        padding: '1.25rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 className="wf-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>7. Scope Document</span>
            <span style={{ color: '#09090b' }}>*</span>
            {totalCount > 0 && (
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: '#f4f4f5',
                  color: '#09090b',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '12px',
                  border: '1px solid #d4d4d8',
                }}
              >
                {totalCount} {totalCount === 1 ? 'doc' : 'docs'}
              </span>
            )}
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            Upload scope of work, survey specifications, or reference docs.
          </p>
        </div>

        {!isReadOnly && totalCount > 0 && (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={onClearAllScopeFiles}
              className="btn btn-secondary"
              style={{ fontSize: '0.7rem', padding: '0.25rem 0.55rem', height: '28px', color: '#09090b' }}
              title="Clear All Documents"
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={() => scopeInputRef.current?.click()}
              className="btn btn-secondary"
              style={{ fontSize: '0.7rem', padding: '0.25rem 0.65rem', height: '28px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <Plus size={13} />
              <span>Add More</span>
            </button>
          </div>
        )}
      </div>

      {!isReadOnly && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingScope(true);
          }}
          onDragLeave={() => setIsDraggingScope(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingScope(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              onAddScopeFiles(e.dataTransfer.files);
            }
          }}
          style={{
            border: isDraggingScope ? '2px dashed #09090b' : '1.5px dashed #d4d4d8',
            borderRadius: '6px',
            padding: totalCount > 0 ? '1rem 1.15rem' : '1.35rem 1.15rem',
            backgroundColor: isDraggingScope ? '#f4f4f5' : '#fafafa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
            <UploadCloud size={26} color="#71717a" style={{ flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#09090b',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {totalCount > 0
                  ? `${totalCount} document(s) attached`
                  : 'Drag and drop multiple documents here, or browse'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                Supports PDF, DOC, DOCX, XLS, XLSX up to 50MB each
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => scopeInputRef.current?.click()}
              className="btn btn-secondary"
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.85rem',
                height: '32px',
                fontWeight: 600,
                backgroundColor: '#ffffff',
                border: '1px solid #d4d4d8',
              }}
            >
              Browse Files
            </button>
            <input
              ref={scopeInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onAddScopeFiles(e.target.files);
                  e.target.value = '';
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Attached Scope Documents List */}
      {totalCount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.2rem' }}>
          {existingScopeFiles.map((file, idx) => (
            <div
              key={`existing-scope-${idx}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.75rem',
                backgroundColor: '#fafafa',
                border: '1px solid #e4e4e7',
                borderRadius: '5px',
                fontSize: '0.775rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                <FileText size={14} color="#52525b" style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 600, color: '#09090b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {file.name}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#52525b' }}>
                  {file.size || 'Existing Document'}
                </span>
              </div>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => onRemoveExistingScopeFile(idx)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#71717a' }}
                  title="Remove document"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}

          {scopeFiles.map((file, idx) => (
            <div
              key={`new-scope-${idx}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.75rem',
                backgroundColor: '#f4f4f5',
                border: '1px solid #e4e4e7',
                borderRadius: '5px',
                fontSize: '0.775rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                <FileText size={14} color="#52525b" style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 600, color: '#09090b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {file.name}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
                  {formatFileSize(file.size)} • Ready to upload
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemoveScopeFile(idx)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#71717a' }}
                title="Remove document"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
