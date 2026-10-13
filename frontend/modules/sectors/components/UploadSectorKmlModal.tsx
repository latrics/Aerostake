'use client';

import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Portal } from '@/components/Portal';
import { sectorApi } from '../api';
import { Sector } from '../types';

interface UploadSectorKmlModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle?: string;
  onSuccess: (sectors: Sector[]) => void;
}

export const UploadSectorKmlModal: React.FC<UploadSectorKmlModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectTitle = 'Project',
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setErrorMsg(null);
    const name = file.name.toLowerCase();
    if (!name.endsWith('.kml') && !name.endsWith('.kmz')) {
      setErrorMsg('Please select a valid .kml or .kmz file.');
      return;
    }
    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Please select a KML or KMZ file to upload.');
      return;
    }

    try {
      setIsUploading(true);
      setErrorMsg(null);
      const sectors = await sectorApi.uploadSectorKml(projectId, selectedFile);
      onSuccess(sectors);
      onClose();
    } catch (err: any) {
      console.error('KML upload failed:', err);
      setErrorMsg(err.message || 'Failed to parse and upload sectorised KML. Please ensure polygons are valid.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Portal>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(9, 9, 11, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !isUploading) onClose();
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '520px',
            border: '1px solid #e4e4e7',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '1.1rem 1.4rem',
              borderBottom: '1px solid #f4f4f5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#fafafa',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: '#09090b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <UploadCloud size={16} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                  Upload Sectorised KML
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#71717a', margin: '2px 0 0 0' }}>
                  {projectTitle} • Automated Flight Grid Ingestion
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isUploading}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                color: '#71717a',
                padding: '4px',
                borderRadius: '4px',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} style={{ padding: '1.4rem' }}>
            {errorMsg && (
              <div
                style={{
                  marginBottom: '1rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  color: '#991b1b',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: isDragging ? '2px dashed #09090b' : '2px dashed #d4d4d8',
                borderRadius: '8px',
                padding: '2rem 1.5rem',
                textAlign: 'center',
                backgroundColor: isDragging ? '#f4f4f5' : selectedFile ? '#fafafa' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                marginBottom: '1rem',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".kml,.kmz"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {selectedFile ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      backgroundColor: '#f4f4f5',
                      border: '1px solid #e4e4e7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#09090b',
                    }}
                  >
                    <FileText size={20} />
                  </div>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#09090b' }}>
                    {selectedFile.name}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#71717a' }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB • Click or drop another file to replace
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <UploadCloud size={32} color="#71717a" strokeWidth={1.5} />
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#09090b' }}>
                    Click to browse or drop KML / KMZ file here
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#71717a', maxWidth: '320px' }}>
                    Exports from QGIS or Google Earth with Placemark sector boundaries (S1, S2, etc.)
                  </span>
                </div>
              )}
            </div>

            {/* Ingestion Rules Summary */}
            <div
              style={{
                backgroundColor: '#fafafa',
                borderRadius: '6px',
                border: '1px solid #f4f4f5',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                fontSize: '0.75rem',
                color: '#52525b',
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 700, color: '#09090b', marginBottom: '0.25rem' }}>
                Backend Processing Pipeline:
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                <li>Auto-extracts placemark boundaries &amp; sector codes (e.g. S1, S2).</li>
                <li>Calculates geodetic surface area (sq km) per sector using WGS84 projection.</li>
                <li>Normalizes polygons to GeoJSON coordinates for interactive map rendering.</li>
                <li>Replaces existing pending sectors with updated flight grid.</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                style={{
                  padding: '0.55rem 1rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  color: '#71717a',
                  border: '1px solid #d4d4d8',
                  borderRadius: '6px',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!selectedFile || isUploading}
                style={{
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  backgroundColor: !selectedFile || isUploading ? '#a1a1aa' : '#09090b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: !selectedFile || isUploading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Ingesting Sectors...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    Ingest &amp; Generate Sectors
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
};
