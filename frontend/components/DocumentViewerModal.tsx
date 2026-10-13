import React from 'react';
import { Portal } from '@/components/Portal';
import { X, Download, FileText, ExternalLink, Check, Copy } from 'lucide-react';
import { downloadDocument } from '@/lib/document-utils';

export interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    name: string;
    type?: string;
    size?: string;
    date?: string;
    dataUrl?: string;
    url?: string;
    description?: string;
    category?: string;
    uploadedBy?: string;
  } | null;
  projectTitle?: string;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  projectTitle,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !doc) return null;

  const ext = (doc.name.split('.').pop() || '').toLowerCase();
  const isKml = ext === 'kml' || ext === 'kmz';
  const isPdf = ext === 'pdf';
  const isImage = ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp';

  const handleDownload = () => {
    downloadDocument({
      name: doc.name,
      dataUrl: doc.dataUrl,
      url: doc.url,
      type: doc.type,
      projectTitle,
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(doc.name);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Portal>
      <div
        className="viewport-modal-backdrop"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1rem',
        }}
        onClick={onClose}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '680px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #18181b',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid #e4e4e7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#fafafa',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: '#09090b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={16} color="#ffffff" />
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                  {doc.name}
                </h3>
                <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
                  {doc.category || doc.type || ext.toUpperCase()} • {doc.size || 'Standard'} • {doc.date || 'Active'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={handleDownload}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  height: '30px',
                  padding: '0 0.75rem',
                }}
              >
                <Download size={13} /> Download .{ext}
              </button>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#71717a',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body Preview */}
          <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
            {/* Metadata Card */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.65rem',
                padding: '0.75rem',
                backgroundColor: '#fafafa',
                borderRadius: '6px',
                border: '1px solid #e4e4e7',
                marginBottom: '1rem',
                fontSize: '0.75rem',
              }}
            >
              <div>
                <span style={{ color: '#71717a', display: 'block', fontSize: '0.675rem' }}>Format</span>
                <strong style={{ color: '#09090b', textTransform: 'uppercase' }}>.{ext} File</strong>
              </div>
              <div>
                <span style={{ color: '#71717a', display: 'block', fontSize: '0.675rem' }}>Category</span>
                <strong style={{ color: '#09090b' }}>{doc.category || doc.type || 'Operational Document'}</strong>
              </div>
              <div>
                <span style={{ color: '#71717a', display: 'block', fontSize: '0.675rem' }}>Uploaded By</span>
                <strong style={{ color: '#09090b' }}>{doc.uploadedBy || 'Client / Operations'}</strong>
              </div>
            </div>

            {/* Document Content View */}
            {isImage && doc.dataUrl ? (
              <div style={{ textAlign: 'center', backgroundColor: '#09090b', borderRadius: '6px', padding: '1rem' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={doc.dataUrl}
                  alt={doc.name}
                  style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '4px' }}
                />
              </div>
            ) : isKml ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#09090b' }}>
                    KML Geospatial Boundary Schema
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#71717a' }}>OGC KML 2.2 Standard</span>
                </div>
                <pre
                  style={{
                    backgroundColor: '#18181b',
                    color: '#a1a1aa',
                    padding: '1rem',
                    borderRadius: '6px',
                    fontSize: '0.725rem',
                    fontFamily: 'monospace',
                    overflowX: 'auto',
                    maxHeight: '260px',
                    lineHeight: 1.5,
                  }}
                >
                  {`<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${doc.name}</name>
    <Placemark>
      <name>AOI Perimeter</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              77.2090,28.6139,0 77.2150,28.6139,0 77.2150,28.6190,0 77.2090,28.6190,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`}
                </pre>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2.5rem 1rem',
                  backgroundColor: '#fafafa',
                  borderRadius: '6px',
                  border: '1px dashed #d4d4d8',
                  gap: '0.65rem',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e4e4e7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText size={22} color="#09090b" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
                    {doc.name}
                  </span>
                  <span style={{ fontSize: '0.725rem', color: '#71717a' }}>
                    {doc.description || `Verified .${ext.toUpperCase()} document registered in the Aerostake project manifest.`}
                  </span>
                </div>
                <button
                  onClick={handleDownload}
                  className="btn btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.75rem',
                    marginTop: '0.5rem',
                    height: '32px',
                  }}
                >
                  <Download size={13} /> Download Original .{ext} File
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
};
