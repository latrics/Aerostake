'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, Plus, X, Paperclip } from 'lucide-react';
import { formatFileSize } from '../../new-project-constants';

interface BoundaryFile {
  name: string;
  size?: string;
  dataUrl?: string;
}

interface ProjectBoundaryUploadSectionProps {
  kmlFiles: File[];
  existingKmlFiles: BoundaryFile[];
  onAddKmlFiles: (files: FileList | File[]) => void;
  onRemoveKmlFile: (index: number) => void;
  onRemoveExistingKmlFile: (index: number) => void;
  onClearAllKmlFiles: () => void;
  isReadOnly?: boolean;
}

export function ProjectBoundaryUploadSection({
  kmlFiles,
  existingKmlFiles,
  onAddKmlFiles,
  onRemoveKmlFile,
  onRemoveExistingKmlFile,
  onClearAllKmlFiles,
  isReadOnly,
}: ProjectBoundaryUploadSectionProps) {
  const [isDraggingKml, setIsDraggingKml] = useState(false);
  const kmlInputRef = useRef<HTMLInputElement>(null);
  const totalCount = existingKmlFiles.length + kmlFiles.length;

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
            <span>6. KML / Boundary Upload</span>
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
                {totalCount} {totalCount === 1 ? 'file' : 'files'}
              </span>
            )}
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            Upload multiple KML, KMZ, or GeoJSON boundary files of your area of interest.
          </p>
        </div>

        {!isReadOnly && totalCount > 0 && (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={onClearAllKmlFiles}
              className="btn btn-secondary"
              style={{ fontSize: '0.7rem', padding: '0.25rem 0.55rem', height: '28px', color: '#09090b' }}
              title="Clear All Files"
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={() => kmlInputRef.current?.click()}
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
            setIsDraggingKml(true);
          }}
          onDragLeave={() => setIsDraggingKml(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingKml(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              onAddKmlFiles(e.dataTransfer.files);
            }
          }}
          style={{
            border: isDraggingKml ? '2px dashed #09090b' : '1.5px dashed #d4d4d8',
            borderRadius: '6px',
            padding: totalCount > 0 ? '1rem 1.15rem' : '1.35rem 1.15rem',
            backgroundColor: isDraggingKml ? '#f4f4f5' : '#fafafa',
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
                  ? `${totalCount} boundary file(s) attached`
                  : 'Drag and drop multiple files here, or browse'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                Supports multiple KML, KMZ files up to 50MB each
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => kmlInputRef.current?.click()}
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
              ref={kmlInputRef}
              type="file"
              multiple
              accept=".kml,.kmz,.json,.geojson"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onAddKmlFiles(e.target.files);
                  e.target.value = '';
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Attached KML Files List */}
      {totalCount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.2rem' }}>
          {existingKmlFiles.map((file, idx) => (
            <div
              key={`existing-kml-${idx}`}
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
                <Paperclip size={14} color="#52525b" style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 600, color: '#09090b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {file.name}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#52525b' }}>
                  {file.size || 'Existing File'}
                </span>
              </div>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => onRemoveExistingKmlFile(idx)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#71717a' }}
                  title="Remove file"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}

          {kmlFiles.map((file, idx) => (
            <div
              key={`new-kml-${idx}`}
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
                <Paperclip size={14} color="#52525b" style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 600, color: '#09090b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {file.name}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
                  {formatFileSize(file.size)} • Ready to upload
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemoveKmlFile(idx)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#71717a' }}
                title="Remove file"
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
