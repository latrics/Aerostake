'use client';

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Cpu,
  Link as LinkIcon,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  Save,
  Send,
  Folder,
  Lock,
  ArrowRight,
  FileCheck2,
  Download,
  Eye,
  RefreshCw,
  FolderOpen,
  Info,
} from 'lucide-react';
import { Project } from '@/modules/projects/types';
import { projectApi } from '@/modules/projects/api';
import { StageChatBox, StageChatMessage } from '@/modules/projects/components/StageChatBox';

export interface ProcessingStageWorkspaceProps {
  project: Project | null;
  onRefresh: () => void | Promise<void>;
  userRole?: string;
  userName?: string;
  stageMessages: StageChatMessage[];
  onSendMessage: (text: string, attachments?: { name: string; size?: string }[]) => Promise<void>;
}

// Pre-processing deliverables definition
interface DeliverableMeta {
  id: string;
  label: string;
  format: string;
  description: string;
  category: 'pre' | 'post';
}

const PRE_PROCESSING_CATALOG: DeliverableMeta[] = [
  {
    id: 'geo_tagged_image',
    label: 'Geo-Tagged Sensor Imagery',
    format: 'JPEG / DNG (EXIF GPS & RTK Metadata)',
    description: 'Calibrated nadir and oblique aerial photographs with embedded camera trigger coordinates.',
    category: 'pre',
  },
  {
    id: 'event_files',
    label: 'Shutter Event Sync Files',
    format: 'MRK / NAV / OBS (Time-Stamped GNSS Logs)',
    description: 'GNSS camera trigger event logs synchronizing drone flight pulses with position timestamps.',
    category: 'pre',
  },
  {
    id: 'point_cloud',
    label: 'Raw LiDAR Point Cloud',
    format: 'LAS / LAZ (Unclassified Laser Returns)',
    description: 'Raw pulsed laser returns and sensor flight geometry before ground surface classification.',
    category: 'pre',
  },
  {
    id: 'trajectory_files',
    label: 'PPK Trajectory & IMU Files',
    format: 'POS / SBET / SOL (Smoothed Best Estimate)',
    description: 'High-precision post-processed kinematic flight track from dual-frequency GNSS and IMU.',
    category: 'pre',
  },
];

const POST_PROCESSING_CATALOG: DeliverableMeta[] = [
  {
    id: 'orthomosaic',
    label: 'Georeferenced Orthomosaic',
    format: 'GeoTIFF / ECW (High-Resolution Aerial Mosaic)',
    description: 'Seamless, distortion-corrected orthophoto composite with embedded CRS coordinates.',
    category: 'post',
  },
  {
    id: 'dem',
    label: 'Digital Elevation Model (DEM)',
    format: 'GeoTIFF 32-bit Float (Bare-Earth Surface)',
    description: 'Ground-only elevation terrain model with vegetation and structures digitally filtered out.',
    category: 'post',
  },
  {
    id: 'dsm',
    label: 'Digital Surface Model (DSM)',
    format: 'GeoTIFF 32-bit Float (Top-of-Canopy Surface)',
    description: 'Complete elevation surface including natural canopies and man-made structures.',
    category: 'post',
  },
  {
    id: 'point_cloud',
    label: 'Classified 3D Dense Point Cloud',
    format: 'LAS / LAZ (ASPRS Standard Classified Points)',
    description: 'RGB-colorized dense point cloud classified into ground, vegetation, and structural points.',
    category: 'post',
  },
  {
    id: 'topographic_map',
    label: 'Topographic Feature Map',
    format: 'PDF / GeoTIFF / DWG (Scaled Engineering Map)',
    description: 'Cartographic site plan displaying elevation spot heights, boundary marks, and physical features.',
    category: 'post',
  },
  {
    id: 'contour',
    label: 'Contour Lines',
    format: 'SHP / DXF / GeoJSON (0.5m / 1m Intervals)',
    description: 'Isoline vector contours extracted from filtered digital terrain models for civil grading.',
    category: 'post',
  },
  {
    id: 'cad',
    label: 'CAD Engineering Drawing',
    format: 'AutoCAD DWG / DXF (Vector Layer Plan)',
    description: 'Digitized site features, roads, curbs, and survey boundaries in layered CAD format.',
    category: 'post',
  },
  {
    id: '3d_model',
    label: '3D Textured Mesh Model',
    format: 'OBJ / FBX / 3D Tiles / GLTF',
    description: 'Photorealistic 3D triangulated textured mesh for digital twin and BIM simulation.',
    category: 'post',
  },
  {
    id: 'volumetric_analysis',
    label: 'Volumetric Cut / Fill Report',
    format: 'PDF Report + CSV Stockpile Summary',
    description: 'Stockpile, pit, and excavation cut/fill volumes calculated against baseline plane.',
    category: 'post',
  },
];

export const ProcessingStageWorkspace: React.FC<ProcessingStageWorkspaceProps> = ({
  project,
  onRefresh,
  userRole,
  userName = 'User',
  stageMessages,
  onSendMessage,
}) => {
  const isOps = userRole === 'admin' || userRole === 'operations';
  const isClient = userRole === 'client' || userRole === 'client_primary' || userRole === 'client_sub';

  // Live state for editing links (keyed by `${category}_${id}`)
  const [editingLinks, setEditingLinks] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isAdvancingToDelivered, setIsAdvancingToDelivered] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [clientNotes, setClientNotes] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Extract raw payload
  const reqPayload = useMemo(() => {
    return (project?.requirements_payload as Record<string, any>) || {};
  }, [project]);

  // Extract existing stored processing deliverables data
  const processingData = useMemo(() => {
    return (reqPayload.processing_deliverables as Record<string, any>) || {};
  }, [reqPayload]);

  const preProcessingLinks = useMemo(() => {
    return (processingData.pre_processing as Record<string, any>) || {};
  }, [processingData]);

  const postProcessingLinks = useMemo(() => {
    return (processingData.post_processing as Record<string, any>) || {};
  }, [processingData]);

  const clientSignoff = useMemo(() => {
    return (
      (processingData.client_signoff as Record<string, any>) || {
        acknowledged: Boolean(processingData.client_acknowledged),
        acknowledged_at: processingData.client_acknowledged_at,
        acknowledged_by: processingData.client_acknowledged_by,
        notes: processingData.client_acknowledgment_notes,
      }
    );
  }, [processingData]);

  const isClientAcknowledged = Boolean(clientSignoff.acknowledged);

  // 1. Resolve Pre-Processing Deliverables Checklisted by Client
  const clientChecklistedPre = useMemo(() => {
    const preFlags = reqPayload.pre_deliverables || {};
    const delivList: string[] = Array.isArray(reqPayload.deliverables) ? reqPayload.deliverables : [];

    const list = PRE_PROCESSING_CATALOG.filter((item) => {
      if (preFlags[item.id]) return true;
      const matchesStr = delivList.some((d) => {
        const lower = String(d).toLowerCase();
        return lower.includes(item.id.replace(/_/g, ' ')) || lower.includes(item.label.toLowerCase());
      });
      return matchesStr;
    });

    if (preFlags.other || delivList.some((d) => String(d).toLowerCase().startsWith('pre other:'))) {
      const customText =
        delivList.find((d) => String(d).toLowerCase().startsWith('pre other:'))?.replace(/^pre other:\s*/i, '') ||
        'Custom Pre-Processing Deliverable';
      list.push({
        id: 'other',
        label: customText,
        format: 'Custom Format',
        description: 'Client-specified custom raw sensor or flight pre-processing file.',
        category: 'pre',
      });
    }

    if (list.length === 0) {
      return [PRE_PROCESSING_CATALOG[0], PRE_PROCESSING_CATALOG[3]]; // Geo-tagged images + Trajectory
    }
    return list;
  }, [reqPayload]);

  // 2. Resolve Post-Processing Deliverables Checklisted by Client
  const clientChecklistedPost = useMemo(() => {
    const postFlags = reqPayload.post_deliverables || {};
    const delivList: string[] = Array.isArray(reqPayload.deliverables) ? reqPayload.deliverables : [];

    const list = POST_PROCESSING_CATALOG.filter((item) => {
      if (postFlags[item.id]) return true;
      const matchesStr = delivList.some((d) => {
        const lower = String(d).toLowerCase();
        return lower.includes(item.id.replace(/_/g, ' ')) || lower.includes(item.label.toLowerCase());
      });
      return matchesStr;
    });

    if (postFlags.other || delivList.some((d) => String(d).toLowerCase().startsWith('other:'))) {
      const customText =
        delivList.find((d) => String(d).toLowerCase().startsWith('other:'))?.replace(/^other:\s*/i, '') ||
        'Custom Post-Processing Deliverable';
      list.push({
        id: 'other',
        label: customText,
        format: 'Custom Analytical Product',
        description: 'Client-specified geospatial analytics deliverable.',
        category: 'post',
      });
    }

    if (list.length === 0) {
      return [POST_PROCESSING_CATALOG[0], POST_PROCESSING_CATALOG[1]]; // Orthomosaic + DEM
    }
    return list;
  }, [reqPayload]);

  // Count links provided
  const preLinksProvidedCount = useMemo(() => {
    return clientChecklistedPre.filter((it) => Boolean(preProcessingLinks[it.id]?.link)).length;
  }, [clientChecklistedPre, preProcessingLinks]);

  const postLinksProvidedCount = useMemo(() => {
    return clientChecklistedPost.filter((it) => Boolean(postProcessingLinks[it.id]?.link)).length;
  }, [clientChecklistedPost, postProcessingLinks]);

  const totalChecklistedCount = clientChecklistedPre.length + clientChecklistedPost.length;
  const totalLinksProvidedCount = preLinksProvidedCount + postLinksProvidedCount;
  const allLinksProvided = totalLinksProvidedCount >= totalChecklistedCount && totalChecklistedCount > 0;

  // Handle saving a single link by Ops
  const handleSaveLink = async (category: 'pre' | 'post', item: DeliverableMeta) => {
    if (!project || !isOps) return;
    const inputKey = `${category}_${item.id}`;
    const newLink = (editingLinks[inputKey] ?? (category === 'pre' ? preProcessingLinks[item.id]?.link : postProcessingLinks[item.id]?.link) ?? '').trim();

    if (!newLink) {
      setErrorMessage(`Please provide a valid cloud storage or folder URL for ${item.label}`);
      return;
    }

    setSavingKey(inputKey);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const currentProc = { ...processingData };
      const currentPre = { ...preProcessingLinks };
      const currentPost = { ...postProcessingLinks };

      const updatedRecord = {
        id: item.id,
        name: item.label,
        format: item.format,
        link: newLink,
        updated_at: new Date().toISOString(),
        updated_by: userName,
        acknowledged: false,
      };

      if (category === 'pre') {
        currentPre[item.id] = updatedRecord;
      } else {
        currentPost[item.id] = updatedRecord;
      }

      currentProc.pre_processing = currentPre;
      currentProc.post_processing = currentPost;

      // If client already signed off previously, reset signoff since a link was modified
      if (currentProc.client_signoff?.acknowledged) {
        currentProc.client_signoff = {
          ...currentProc.client_signoff,
          acknowledged: false,
          reset_reason: `Link updated for ${item.label}`,
          reset_at: new Date().toISOString(),
        };
      }

      const updatedPayload = {
        ...reqPayload,
        processing_deliverables: currentProc,
      };

      await projectApi.updateProject(project.id, {
        requirements_payload: updatedPayload,
      });

      setSuccessMessage(`Submitted deliverable folder link for ${item.label}! Client can now access the folder.`);
      await onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || `Failed to submit deliverable link for ${item.label}`);
    } finally {
      setSavingKey(null);
    }
  };

  // Handle Client acknowledging receipt of all deliverables
  const handleClientAcknowledge = async () => {
    if (!project || !isClient) return;
    if (!allLinksProvided) {
      setErrorMessage('Cannot acknowledge: LATRICS Operations has not finished providing all deliverable links yet.');
      return;
    }

    setIsAcknowledging(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const currentProc = { ...processingData };
      const nowIso = new Date().toISOString();

      currentProc.client_signoff = {
        acknowledged: true,
        acknowledged_at: nowIso,
        acknowledged_by: userName,
        notes: clientNotes.trim() || 'All deliverables downloaded and verified.',
      };
      currentProc.client_acknowledged = true;
      currentProc.client_acknowledged_at = nowIso;
      currentProc.client_acknowledged_by = userName;

      const updatedPayload = {
        ...reqPayload,
        processing_deliverables: currentProc,
      };

      await projectApi.updateProject(project.id, {
        requirements_payload: updatedPayload,
      });

      setSuccessMessage('You have successfully acknowledged receipt of the survey deliverables. Operations is cleared to proceed to Stage 6 (Delivered).');
      await onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit client deliverables acknowledgment.');
    } finally {
      setIsAcknowledging(false);
    }
  };

  // Handle Ops proceeding to Stage 6 (Delivered / COMPLETED)
  const handleProceedToDelivered = async () => {
    if (!project || !isOps) return;
    if (!isClientAcknowledged) {
      setErrorMessage('Cannot advance to Stage 6 (Delivered): Client must first verify and acknowledge receipt of the deliverables.');
      return;
    }

    setIsAdvancingToDelivered(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await projectApi.updateProject(project.id, {
        status: 'completed' as any,
      });

      setShowConfirmModal(false);
      setSuccessMessage(`Project '${project.title}' has successfully advanced to Stage 6: Delivered (Completed)!`);
      await onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to advance project to Stage 6 Delivered.');
    } finally {
      setIsAdvancingToDelivered(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const isProjectCompleted = project?.status === 'completed';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── Top Status & Clearance Banner ── */}
      <div
        className="wf-card"
        style={{
          padding: '1.25rem 1.5rem',
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '8px',
              backgroundColor: isProjectCompleted ? '#ecfdf5' : isClientAcknowledged ? '#f0fdf4' : '#09090b',
              color: isProjectCompleted ? '#059669' : isClientAcknowledged ? '#16a34a' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isProjectCompleted ? <CheckCircle2 size={24} /> : <FileCheck2 size={24} />}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#09090b' }}>
                Stage 5: Data Processing &amp; Deliverables Clearance
              </h3>

              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '4px',
                  backgroundColor: isProjectCompleted ? '#ecfdf5' : isClientAcknowledged ? '#ecfdf5' : allLinksProvided ? '#fffbeb' : '#f4f4f5',
                  color: isProjectCompleted ? '#047857' : isClientAcknowledged ? '#16a34a' : allLinksProvided ? '#b45309' : '#09090b',
                  border: isProjectCompleted ? '1px solid #a7f3d0' : isClientAcknowledged ? '1px solid #bbf7d0' : allLinksProvided ? '1px solid #fde68a' : '1px solid #e4e4e7',
                }}
              >
                {isProjectCompleted
                  ? 'Stage 6 Delivered & Sealed'
                  : isClientAcknowledged
                  ? 'Client Acknowledged · Clearance Unlocked'
                  : allLinksProvided
                  ? 'Awaiting Client Receipt Acknowledgment'
                  : `Links Ingest: ${totalLinksProvidedCount}/${totalChecklistedCount} Uploaded`}
              </span>
            </div>

            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              Photogrammetry reconstruction, point cloud classification, and deliverables handover verification for <strong>{project?.title}</strong>.
            </p>
          </div>
        </div>

        {/* Top Right Action: Proceed to Next Stage (Delivered) */}
        {!isProjectCompleted && isOps && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={!isClientAcknowledged || isAdvancingToDelivered}
              title={
                !isClientAcknowledged
                  ? 'Locked: Client must acknowledge receipt of deliverables before project can advance to Delivered (Stage 6).'
                  : 'Cleared: Advance project to Stage 6 Delivered (Completed)'
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '0.55rem 1.15rem',
                borderRadius: '6px',
                cursor: isClientAcknowledged ? 'pointer' : 'not-allowed',
                backgroundColor: isClientAcknowledged ? '#09090b' : '#f4f4f5',
                color: isClientAcknowledged ? '#ffffff' : '#a1a1aa',
                border: isClientAcknowledged ? 'none' : '1px solid #e4e4e7',
                boxShadow: isClientAcknowledged ? '0 2px 6px rgba(0, 0, 0, 0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {isClientAcknowledged ? <CheckCircle2 size={15} color="#4ade80" /> : <Lock size={15} />}
              <span>Proceed to Next Stage (Delivered)</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Global Alerts */}
      {errorMessage && (
        <div
          style={{
            padding: '0.85rem 1.15rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#991b1b',
            fontSize: '0.825rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontWeight: 700 }}>
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div
          style={{
            padding: '0.85rem 1.15rem',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '8px',
            color: '#065f46',
            fontSize: '0.825rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065f46', fontWeight: 700 }}>
            ✕
          </button>
        </div>
      )}

      {/* Deliverable Link Lifecycle Banner */}
      <div
        style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#fafafa',
          border: '1px solid #e4e4e7',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: '#52525b',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Folder size={15} color="#09090b" style={{ flexShrink: 0 }} />
          <span>
            <strong style={{ color: '#09090b' }}>Deliverable Folder Lifecycle:</strong> Latrics uploads and submits cloud storage folder links. Clients can directly click the link to access and download the files from that folder.
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.7rem' }}>
          <span style={{ color: '#16a34a', fontWeight: 700 }}>● Submitted &amp; Live</span>
          <span style={{ color: '#71717a', fontWeight: 600 }}>○ Pending Latrics Upload</span>
        </div>
      </div>

      {/* ── Main Workspace Grid Layout (2fr Left Content : 1fr Right Chat) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem', alignItems: 'flex-start' }}>
        {/* ── Left Column: Section 1 (Pre-Processing) & Section 2 (Post-Processing) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* ══════════════════════════════════════════════════════════════
              SECTION 1: PRE-PROCESSING DELIVERABLES
             ══════════════════════════════════════════════════════════════ */}
          <div className="wf-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Section Header */}
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: '#fafafa',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Layers size={16} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#09090b' }}>
                    1. Pre-Processing Deliverables
                  </h4>
                </div>
              </div>

              <span
                style={{
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                  backgroundColor: preLinksProvidedCount === clientChecklistedPre.length ? '#ecfdf5' : '#f4f4f5',
                  color: preLinksProvidedCount === clientChecklistedPre.length ? '#047857' : '#52525b',
                  border: preLinksProvidedCount === clientChecklistedPre.length ? '1px solid #a7f3d0' : '1px solid #e4e4e7',
                }}
              >
                {preLinksProvidedCount}/{clientChecklistedPre.length} Links Ready
              </span>
            </div>

            {/* Pre-Processing Deliverables Table */}
            <div style={{ overflowX: 'auto' }}>
              <table className="wf-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>Checklisted Deliverable</th>
                    <th style={{ width: '45%' }}>Cloud Folder / Access Link</th>
                    <th style={{ width: '20%', textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clientChecklistedPre.map((item, idx) => {
                    const inputKey = `pre_${item.id}`;
                    const savedRecord = preProcessingLinks[item.id];
                    const savedLink = savedRecord?.link || '';
                    const currentVal = editingLinks[inputKey] !== undefined ? editingLinks[inputKey] : savedLink;
                    const hasLink = Boolean(savedLink);
                    const isSaving = savingKey === inputKey;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        {/* Column 1: Deliverable Name (Main Context Only) */}
                        <td style={{ verticalAlign: 'middle', padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#71717a' }}>
                              #{idx + 1}
                            </span>
                            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#09090b' }}>
                              {item.label}
                            </span>
                          </div>
                        </td>

                        {/* Column 2: Link Input / Access Area */}
                        <td style={{ verticalAlign: 'top', padding: '0.85rem 1rem' }}>
                          {isOps && !isProjectCompleted ? (
                            /* Ops Editable Link View */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                              <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <input
                                  type="url"
                                  placeholder="https://drive.google.com/... or S3 / Cloud folder link"
                                  value={currentVal}
                                  onChange={(e) =>
                                    setEditingLinks((prev) => ({
                                      ...prev,
                                      [inputKey]: e.target.value,
                                    }))
                                  }
                                  className="form-input"
                                  style={{
                                    fontSize: '0.775rem',
                                    height: '32px',
                                    width: '100%',
                                    borderRadius: '5px',
                                    fontFamily: 'monospace',
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveLink('pre', item)}
                                  disabled={isSaving}
                                  style={{
                                    height: '32px',
                                    padding: '0 0.85rem',
                                    backgroundColor: '#09090b',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '5px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    flexShrink: 0,
                                  }}
                                  title="Submit deliverable folder link for client access"
                                >
                                  {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                                  <span>Submit</span>
                                </button>
                              </div>

                              {/* Active link preview if already submitted */}
                              {hasLink && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.725rem' }}>
                                  <a
                                    href={savedLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      color: '#09090b',
                                      fontWeight: 700,
                                      textDecoration: 'none',
                                    }}
                                  >
                                    <ExternalLink size={12} />
                                    <span>Access Deliverables Folder ↗</span>
                                  </a>
                                  <span style={{ color: '#d4d4d8' }}>•</span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(savedLink, inputKey)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#71717a',
                                      cursor: 'pointer',
                                      padding: 0,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      fontSize: '0.7rem',
                                    }}
                                  >
                                    {copiedKey === inputKey ? <Check size={11} color="#16a34a" /> : <Copy size={11} />}
                                    <span>{copiedKey === inputKey ? 'Copied' : 'Copy Link'}</span>
                                  </button>
                                  <span style={{ color: '#16a34a', fontSize: '0.675rem', fontWeight: 600, marginLeft: 'auto' }}>
                                    ✓ Live for Client
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Client View / Read-only View */
                            <div>
                              {hasLink ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <a
                                    href={savedLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.35rem',
                                      padding: '0.35rem 0.85rem',
                                      backgroundColor: '#09090b',
                                      color: '#ffffff',
                                      borderRadius: '5px',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      textDecoration: 'none',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    }}
                                  >
                                    <Folder size={13} />
                                    <span>Open Deliverables Folder ↗</span>
                                  </a>

                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(savedLink, inputKey)}
                                    title="Copy folder link"
                                    style={{
                                      height: '28px',
                                      padding: '0 0.5rem',
                                      backgroundColor: '#ffffff',
                                      border: '1px solid #e4e4e7',
                                      borderRadius: '4px',
                                      fontSize: '0.7rem',
                                      color: '#52525b',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                    }}
                                  >
                                    {copiedKey === inputKey ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                                    <span>{copiedKey === inputKey ? 'Copied' : 'Copy'}</span>
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#71717a', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                  <Clock size={13} />
                                  <span>Pending Latrics Upload — folder link will appear here once submitted</span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Column 3: Status Badge */}
                        <td style={{ verticalAlign: 'top', padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '4px',
                              backgroundColor: hasLink ? '#ecfdf5' : '#f4f4f5',
                              color: hasLink ? '#16a34a' : '#71717a',
                              border: hasLink ? '1px solid #bbf7d0' : '1px solid #e4e4e7',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                            }}
                          >
                            {hasLink ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                            <span>{hasLink ? 'Submitted & Live' : 'Pending Upload'}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 2: POST-PROCESSING DELIVERABLES
             ══════════════════════════════════════════════════════════════ */}
          <div className="wf-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Section Header */}
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: '#fafafa',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Cpu size={16} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#09090b' }}>
                    2. Post-Processing Deliverables
                  </h4>
                </div>
              </div>

              <span
                style={{
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                  backgroundColor: postLinksProvidedCount === clientChecklistedPost.length ? '#ecfdf5' : '#f4f4f5',
                  color: postLinksProvidedCount === clientChecklistedPost.length ? '#047857' : '#52525b',
                  border: postLinksProvidedCount === clientChecklistedPost.length ? '1px solid #a7f3d0' : '1px solid #e4e4e7',
                }}
              >
                {postLinksProvidedCount}/{clientChecklistedPost.length} Links Ready
              </span>
            </div>

            {/* Post-Processing Deliverables Table */}
            <div style={{ overflowX: 'auto' }}>
              <table className="wf-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>Checklisted Deliverable</th>
                    <th style={{ width: '45%' }}>Cloud Folder / Access Link</th>
                    <th style={{ width: '20%', textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clientChecklistedPost.map((item, idx) => {
                    const inputKey = `post_${item.id}`;
                    const savedRecord = postProcessingLinks[item.id];
                    const savedLink = savedRecord?.link || '';
                    const currentVal = editingLinks[inputKey] !== undefined ? editingLinks[inputKey] : savedLink;
                    const hasLink = Boolean(savedLink);
                    const isSaving = savingKey === inputKey;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        {/* Column 1: Deliverable Name (Main Context Only) */}
                        <td style={{ verticalAlign: 'middle', padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#71717a' }}>
                              #{idx + 1}
                            </span>
                            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#09090b' }}>
                              {item.label}
                            </span>
                          </div>
                        </td>

                        {/* Column 2: Link Input / Access Area */}
                        <td style={{ verticalAlign: 'top', padding: '0.85rem 1rem' }}>
                          {isOps && !isProjectCompleted ? (
                            /* Ops Editable Link View */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                              <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <input
                                  type="url"
                                  placeholder="https://drive.google.com/... or S3 / Cloud folder link"
                                  value={currentVal}
                                  onChange={(e) =>
                                    setEditingLinks((prev) => ({
                                      ...prev,
                                      [inputKey]: e.target.value,
                                    }))
                                  }
                                  className="form-input"
                                  style={{
                                    fontSize: '0.775rem',
                                    height: '32px',
                                    width: '100%',
                                    borderRadius: '5px',
                                    fontFamily: 'monospace',
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveLink('post', item)}
                                  disabled={isSaving}
                                  style={{
                                    height: '32px',
                                    padding: '0 0.85rem',
                                    backgroundColor: '#09090b',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '5px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    flexShrink: 0,
                                  }}
                                  title="Submit deliverable folder link for client access"
                                >
                                  {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                                  <span>Submit</span>
                                </button>
                              </div>

                              {/* Active link preview if already submitted */}
                              {hasLink && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.725rem' }}>
                                  <a
                                    href={savedLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      color: '#09090b',
                                      fontWeight: 700,
                                      textDecoration: 'none',
                                    }}
                                  >
                                    <ExternalLink size={12} />
                                    <span>Access Deliverables Folder ↗</span>
                                  </a>
                                  <span style={{ color: '#d4d4d8' }}>•</span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(savedLink, inputKey)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#71717a',
                                      cursor: 'pointer',
                                      padding: 0,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      fontSize: '0.7rem',
                                    }}
                                  >
                                    {copiedKey === inputKey ? <Check size={11} color="#16a34a" /> : <Copy size={11} />}
                                    <span>{copiedKey === inputKey ? 'Copied' : 'Copy Link'}</span>
                                  </button>
                                  <span style={{ color: '#16a34a', fontSize: '0.675rem', fontWeight: 600, marginLeft: 'auto' }}>
                                    ✓ Live for Client
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Client View / Read-only View */
                            <div>
                              {hasLink ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <a
                                    href={savedLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.35rem',
                                      padding: '0.35rem 0.85rem',
                                      backgroundColor: '#09090b',
                                      color: '#ffffff',
                                      borderRadius: '5px',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      textDecoration: 'none',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    }}
                                  >
                                    <Folder size={13} />
                                    <span>Open Deliverables Folder ↗</span>
                                  </a>

                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(savedLink, inputKey)}
                                    title="Copy folder link"
                                    style={{
                                      height: '28px',
                                      padding: '0 0.5rem',
                                      backgroundColor: '#ffffff',
                                      border: '1px solid #e4e4e7',
                                      borderRadius: '4px',
                                      fontSize: '0.7rem',
                                      color: '#52525b',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                    }}
                                  >
                                    {copiedKey === inputKey ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                                    <span>{copiedKey === inputKey ? 'Copied' : 'Copy'}</span>
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#71717a', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                  <Clock size={13} />
                                  <span>Pending Latrics Upload — folder link will appear here once submitted</span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Column 3: Status Badge */}
                        <td style={{ verticalAlign: 'top', padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '4px',
                              backgroundColor: hasLink ? '#ecfdf5' : '#f4f4f5',
                              color: hasLink ? '#16a34a' : '#71717a',
                              border: hasLink ? '1px solid #bbf7d0' : '1px solid #e4e4e7',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                            }}
                          >
                            {hasLink ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                            <span>{hasLink ? 'Submitted & Live' : 'Pending Upload'}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              CLIENT DELIVERABLES RECEIPT ACKNOWLEDGMENT SECTION
             ══════════════════════════════════════════════════════════════ */}
          <div
            className="wf-card"
            style={{
              padding: '1.25rem 1.5rem',
              backgroundColor: isClientAcknowledged ? '#f0fdf4' : '#ffffff',
              border: isClientAcknowledged ? '1px solid #bbf7d0' : '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: isClientAcknowledged ? '#16a34a' : '#09090b',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#09090b' }}>
                    Client Deliverables Verification &amp; Acknowledgment
                  </h4>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {isClientAcknowledged
                      ? 'The client representative has verified all files and confirmed receipt of the survey deliverables.'
                      : 'Client must verify file downloads and confirm receipt so Operations can advance to Stage 6 (Delivered).'}
                  </p>
                </div>
              </div>

              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '0.25rem 0.65rem',
                  borderRadius: '5px',
                  backgroundColor: isClientAcknowledged ? '#dcfce7' : '#fef3c7',
                  color: isClientAcknowledged ? '#15803d' : '#b45309',
                  border: isClientAcknowledged ? '1px solid #86efac' : '1px solid #fcd34d',
                }}
              >
                {isClientAcknowledged ? '✓ Receipt Confirmed & Signed Off' : 'Pending Client Sign-Off'}
              </span>
            </div>

            {/* Acknowledged Status Details */}
            {isClientAcknowledged ? (
              <div style={{ padding: '0.85rem 1rem', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #dcfce7', fontSize: '0.775rem', color: '#166534' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                  <CheckCircle2 size={15} color="#16a34a" />
                  <span>
                    Verified &amp; Acknowledged by {clientSignoff.acknowledged_by || 'Client Representative'} on{' '}
                    {clientSignoff.acknowledged_at
                      ? new Date(clientSignoff.acknowledged_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Record Date'}
                  </span>
                </div>
                {clientSignoff.notes && (
                  <p style={{ margin: '0.4rem 0 0 1.35rem', fontStyle: 'italic', color: '#374151' }}>
                    "{clientSignoff.notes}"
                  </p>
                )}
              </div>
            ) : (
              /* Client Action Form */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {isClient ? (
                  <>
                    <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                      Please review all download links in <strong>Section 1 (Pre-Processing)</strong> and <strong>Section 2 (Post-Processing)</strong>. Once you have downloaded and validated your survey deliverables, confirm your acknowledgment below.
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: '#09090b', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Verification Notes (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Verified orthomosaic resolution and ground elevation data against site boundary..."
                        value={clientNotes}
                        onChange={(e) => setClientNotes(e.target.value)}
                        className="form-input"
                        style={{ width: '100%', fontSize: '0.8rem', height: '34px', borderRadius: '5px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={handleClientAcknowledge}
                        disabled={!allLinksProvided || isAcknowledging}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          backgroundColor: allLinksProvided ? '#16a34a' : '#e4e4e7',
                          color: allLinksProvided ? '#ffffff' : '#71717a',
                          border: 'none',
                          padding: '0.55rem 1.25rem',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: allLinksProvided ? 'pointer' : 'not-allowed',
                          boxShadow: allLinksProvided ? '0 2px 4px rgba(22, 163, 74, 0.25)' : 'none',
                        }}
                      >
                        {isAcknowledging ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={15} />}
                        <span>Confirm Receipt &amp; Acknowledge All Deliverables ✓</span>
                      </button>

                      {!allLinksProvided && (
                        <span style={{ fontSize: '0.725rem', color: '#b45309' }}>
                          (Awaiting Operations team to provide all {totalChecklistedCount} links first)
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  /* Ops Status View */
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.775rem', color: '#71717a', fontStyle: 'italic' }}>
                    <Clock size={14} color="#d97706" />
                    <span>
                      {allLinksProvided
                        ? 'All links are provided! Awaiting client confirmation of deliverables receipt.'
                        : `Operations must provide links for all deliverables (${totalLinksProvidedCount}/${totalChecklistedCount} currently ready) before client can acknowledge.`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Stage 5 Integrated Chat & Photogrammetry Specs ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>


          {/* Integrated Stage 5 ChatBox */}
          <StageChatBox
            projectId={project?.id || ''}
            stageId={5}
            stageName="Processing"
            stageStatus={isProjectCompleted ? 'completed' : 'active'}
            messages={stageMessages}
            onSendMessage={onSendMessage}
            currentUserName={userName}
            currentUserRole={userRole || 'client'}
          />
        </div>
      </div>

      {/* ── Ops Advance to Stage 6 (Delivered) Confirmation Modal ── */}
      {showConfirmModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(9, 9, 11, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1.25rem',
          }}
        >
          <div
            className="animate-fade-in"
            style={{
              maxWidth: '480px',
              width: '100%',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e4e4e7',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#047857',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#09090b' }}>
                  Proceed to Stage 6: Delivered?
                </h3>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  The client has verified and acknowledged receipt of all pre-processing and post-processing deliverables.
                </p>
              </div>
            </div>

            <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#334155' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem', color: '#09090b' }}>Summary of Action:</div>
              <ul style={{ margin: 0, paddingLeft: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <li>Project status transitions to <strong>COMPLETED (Stage 6: Delivered)</strong></li>
                <li>Deliverable access links are sealed into the project audit archive</li>
                <li>Timeline event will be recorded and client notified</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isAdvancingToDelivered}
                className="wf-btn wf-btn-outline"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem' }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleProceedToDelivered}
                disabled={isAdvancingToDelivered}
                style={{
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.45rem 1.15rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                {isAdvancingToDelivered ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                <span>Confirm Delivery &amp; Proceed</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
