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
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '@/lib/date';

export interface ProcessingStageWorkspaceProps {
  project: Project | null;
  onRefresh: () => void | Promise<void>;
  onAdvanceStage?: (stageId: number) => void;
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
  onAdvanceStage,
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

  // Correction Requests State
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionRemark, setCorrectionRemark] = useState('');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [showResolveModalId, setShowResolveModalId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isResolvingCorrection, setIsResolvingCorrection] = useState(false);

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

  // Handle saving a single link (by Ops or Client)
  const handleSaveLink = async (category: 'pre' | 'post', item: DeliverableMeta) => {
    if (!project) return;
    const inputKey = `${category}_${item.id}`;
    const newLink = (
      editingLinks[inputKey] ??
      (category === 'pre' ? preProcessingLinks[item.id]?.link : postProcessingLinks[item.id]?.link) ??
      (processingData.links as any)?.[inputKey] ??
      ''
    ).trim();

    if (!newLink) {
      setErrorMessage(`Please provide a valid link for ${item.label}`);
      return;
    }

    setSavingKey(inputKey);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Optimistically update local state so button converts to Open immediately
    setEditingLinks((prev) => ({
      ...prev,
      [inputKey]: newLink,
    }));

    try {
      const currentProc = { ...processingData };
      const currentPre = { ...preProcessingLinks };
      const currentPost = { ...postProcessingLinks };
      const currentLinks = { ...((currentProc.links as Record<string, string>) || {}) };

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

      currentLinks[inputKey] = newLink;
      currentProc.pre_processing = currentPre;
      currentProc.post_processing = currentPost;
      currentProc.links = currentLinks;

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

      // Silent background refresh without reloading or moving the page
      await onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || `Failed to submit deliverable link for ${item.label}`);
    } finally {
      setSavingKey(null);
    }
  };

  const correctionsList = useMemo<any[]>(() => {
    return Array.isArray(processingData.corrections) ? processingData.corrections : [];
  }, [processingData]);

  const hasOpenCorrections = useMemo(() => {
    return correctionsList.some((c) => c.status === 'open');
  }, [correctionsList]);

  // Handle Client Requesting Corrections (missing or incorrect output)
  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !isClient) return;
    if (!correctionRemark.trim()) {
      setErrorMessage('Please describe what is missing or incorrect in the deliverables.');
      return;
    }

    setIsSubmittingCorrection(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const nowIso = new Date().toISOString();
      const newCorrection = {
        id: `corr_${Date.now()}`,
        remarks: correctionRemark.trim(),
        requested_by: userName,
        requested_at: nowIso,
        status: 'open',
      };

      const updatedProc = {
        ...processingData,
        client_acknowledged: false,
        ready_for_formal_acceptance: false,
        client_signoff: {
          ...(processingData.client_signoff || {}),
          acknowledged: false,
          ready_for_formal_acceptance: false,
        },
        corrections: [...correctionsList, newCorrection],
      };

      await projectApi.updateProject(project.id, {
        requirements_payload: {
          ...reqPayload,
          processing_deliverables: updatedProc,
        },
      });

      setShowCorrectionModal(false);
      setCorrectionRemark('');
      setSuccessMessage('Correction request submitted! LATRICS Operations has been notified to resolve the issue.');
      await onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit correction request.');
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  // Handle Ops resolving a correction request
  const handleResolveCorrection = async (corrId: string) => {
    if (!project || !isOps) return;

    setIsResolvingCorrection(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const nowIso = new Date().toISOString();
      const updatedList = correctionsList.map((c) => {
        if (c.id === corrId) {
          return {
            ...c,
            status: 'resolved',
            resolved_by: userName,
            resolved_at: nowIso,
            resolution_note: resolutionNote.trim() || 'Deliverable corrected and re-uploaded.',
          };
        }
        return c;
      });

      const updatedProc = {
        ...processingData,
        corrections: updatedList,
      };

      await projectApi.updateProject(project.id, {
        requirements_payload: {
          ...reqPayload,
          processing_deliverables: updatedProc,
        },
      });

      setShowResolveModalId(null);
      setResolutionNote('');
      setSuccessMessage('Correction marked as resolved! Client can now re-verify the outputs.');
      await onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resolve correction.');
    } finally {
      setIsResolvingCorrection(false);
    }
  };

  // Handle Client confirming deliverables ready for formal acceptance
  const handleClientAcknowledge = async () => {
    if (!project || !isClient) return;
    if (!allLinksProvided) {
      setErrorMessage('Cannot acknowledge: LATRICS Operations has not finished providing all deliverable links yet.');
      return;
    }
    if (hasOpenCorrections) {
      setErrorMessage('Cannot confirm: An open correction request is pending resolution by Operations.');
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
        ready_for_formal_acceptance: true,
        acknowledged_at: nowIso,
        acknowledged_by: userName,
        notes: clientNotes.trim() || 'All deliverables downloaded and verified.',
      };
      currentProc.client_acknowledged = true;
      currentProc.ready_for_formal_acceptance = true;
      currentProc.client_acknowledged_at = nowIso;
      currentProc.client_acknowledged_by = userName;

      const updatedPayload = {
        ...reqPayload,
        processing_deliverables: currentProc,
      };

      await projectApi.updateProject(project.id, {
        requirements_payload: updatedPayload,
      });

      setSuccessMessage('You have confirmed that deliverables are ready for formal acceptance! Operations is cleared to proceed to Stage 6 (Delivered).');
      await onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit client deliverables acknowledgment.');
    } finally {
      setIsAcknowledging(false);
    }
  };

  // Handle Ops proceeding to Stage 6 (Delivered)
  const handleProceedToDelivered = async () => {
    if (!project || !isOps) return;
    if (!isClientAcknowledged) {
      setErrorMessage('Cannot advance to Stage 6 (Delivered): Client must first confirm that deliverables are ready for formal acceptance.');
      return;
    }
    if (hasOpenCorrections) {
      setErrorMessage('Cannot advance to Stage 6 (Delivered): Open correction requests must be resolved before advancing.');
      return;
    }

    setIsAdvancingToDelivered(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const currentProc = {
        ...processingData,
        cleared_for_delivered_at: new Date().toISOString(),
      };

      await projectApi.updateProject(project.id, {
        requirements_payload: {
          ...reqPayload,
          processing_deliverables: currentProc,
        },
      });

      setShowConfirmModal(false);
      setSuccessMessage(`Deliverables confirmed ready for formal acceptance. Advancing to Stage 6: Delivered!`);
      await onRefresh();
      onAdvanceStage?.(6);
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
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.25rem', alignItems: 'stretch' }}>
      {/* ── Left Column: Stage 5 Details Card (matching Stages 1, 2, 3, 6 uniform styling) ── */}
      <div
        className="wf-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '620px',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          padding: 0,
        }}
      >
        {/* Uniform Card Header with dash divider */}
        <div
          className="wf-card-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
            padding: '0.85rem 1.25rem',
            margin: 0,
            borderBottom: '1px solid var(--border-color)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <h2 className="wf-title" style={{ margin: 0 }}>
              Stage 5: Data Processing &amp; Deliverables
            </h2>

            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                backgroundColor: '#f4f4f5',
                color: '#18181b',
                border: '1px solid #d4d4d8',
              }}
            >
              {isProjectCompleted
                ? 'Closed & Archived'
                : isClientAcknowledged
                ? 'Client Acknowledged'
                : allLinksProvided
                ? 'Awaiting Sign-Off'
                : 'In Progress'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            {!isProjectCompleted && isOps && (
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={!isClientAcknowledged || isAdvancingToDelivered}
                className={isClientAcknowledged ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{
                  fontSize: '0.75rem',
                  height: '32px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 600,
                  padding: '0 0.85rem',
                  borderRadius: '4px',
                  cursor: isClientAcknowledged ? 'pointer' : 'not-allowed',
                  backgroundColor: isClientAcknowledged ? '#09090b' : '#f4f4f5',
                  color: isClientAcknowledged ? '#ffffff' : '#71717a',
                  border: isClientAcknowledged ? '1px solid #09090b' : '1px solid #d4d4d8',
                }}
                title={
                  !isClientAcknowledged
                    ? 'Locked: Client must acknowledge receipt of deliverables before project can advance to Delivered (Stage 6).'
                    : 'Cleared: Advance project to Stage 6 Delivered (Completed)'
                }
              >
                <CheckCircle2 size={13} />
                <span>Proceed to Next Stage (Delivered)</span>
                <ArrowRight size={13} />
              </button>
            )}

            {isProjectCompleted && (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#059669',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <CheckCircle2 size={13} /> Completed &amp; Sealed
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Global Alerts */}
          {errorMessage && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#991b1b',
                fontSize: '0.775rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
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
                padding: '0.75rem 1rem',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '6px',
                color: '#065f46',
                fontSize: '0.775rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                <span>{successMessage}</span>
              </div>
              <button onClick={() => setSuccessMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065f46', fontWeight: 700 }}>
                ✕
              </button>
            </div>
          )}

          {/* Deliverable Link Lifecycle Subtle Banner */}
          <div
            style={{
              padding: '0.65rem 0.85rem',
              backgroundColor: '#fafafa',
              border: '1px solid #e4e4e7',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.725rem',
              color: '#52525b',
              gap: '0.75rem',
              flexWrap: 'wrap',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Folder size={14} color="#09090b" style={{ flexShrink: 0 }} />
              <span>
                <strong style={{ color: '#09090b' }}>Deliverable Folder Lifecycle:</strong> Latrics uploads and submits cloud storage folder links. Clients can directly click the link to access and download the files from that folder.
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.7rem' }}>
              <span style={{ color: '#16a34a', fontWeight: 700 }}>● Submitted &amp; Live</span>
              <span style={{ color: '#71717a', fontWeight: 600 }}>○ Pending Latrics Upload</span>
            </div>
          </div>
          {/* ══════════════════════════════════════════════════════════════
              SECTION 1: PRE-PROCESSING DELIVERABLES
             ══════════════════════════════════════════════════════════════ */}
          <div className="wf-card" style={{ padding: 0, overflow: 'hidden', flexShrink: 0 }}>
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
                    const savedLink = (savedRecord?.link || (processingData.links as any)?.[inputKey] || '').trim();
                    const currentVal = editingLinks[inputKey] !== undefined ? editingLinks[inputKey] : savedLink;
                    const hasLink = Boolean(savedLink);
                    const isSubmitted = Boolean(hasLink && currentVal.trim() === savedLink);
                    const isSaving = savingKey === inputKey;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        {/* Column 1: Deliverable Name (Main Context Only) */}
                        <td style={{ verticalAlign: 'top', padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '34px' }}>
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              <input
                                type="url"
                                placeholder="https://drive.google.com/... or cloud folder link"
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
                                  height: '34px',
                                  padding: '0.35rem 0.65rem',
                                  width: '100%',
                                  borderRadius: '5px',
                                  fontFamily: 'monospace',
                                  border: '1px solid #d4d4d8',
                                  backgroundColor: '#ffffff',
                                  color: '#09090b',
                                }}
                              />

                              {isSubmitted ? (
                                <button
                                  type="button"
                                  onClick={() => window.open(savedLink, '_blank', 'noopener,noreferrer')}
                                  style={{
                                    height: '34px',
                                    padding: '0 0.95rem',
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
                                    transition: 'background-color 0.15s ease',
                                  }}
                                  title="Open deliverable link in new tab"
                                >
                                  <ExternalLink size={13} />
                                  <span>Open</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSaveLink('pre', item)}
                                  disabled={isSaving || !currentVal.trim()}
                                  style={{
                                    height: '34px',
                                    padding: '0 0.95rem',
                                    backgroundColor: !currentVal.trim() ? '#a1a1aa' : '#09090b',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '5px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: isSaving || !currentVal.trim() ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    flexShrink: 0,
                                    transition: 'background-color 0.15s ease',
                                  }}
                                  title="Submit deliverable link"
                                >
                                  {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                                  <span>Submit</span>
                                </button>
                              )}
                            </div>

                            {/* Sub-bar: Copy link action & Live status indicator when saved */}
                            {hasLink && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem' }}>
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
          <div className="wf-card" style={{ padding: 0, overflow: 'hidden', flexShrink: 0 }}>
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
                    const savedLink = (savedRecord?.link || (processingData.links as any)?.[inputKey] || '').trim();
                    const currentVal = editingLinks[inputKey] !== undefined ? editingLinks[inputKey] : savedLink;
                    const hasLink = Boolean(savedLink);
                    const isSubmitted = Boolean(hasLink && currentVal.trim() === savedLink);
                    const isSaving = savingKey === inputKey;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        {/* Column 1: Deliverable Name (Main Context Only) */}
                        <td style={{ verticalAlign: 'top', padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '34px' }}>
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              <input
                                type="url"
                                placeholder="https://drive.google.com/... or cloud folder link"
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
                                  height: '34px',
                                  padding: '0.35rem 0.65rem',
                                  width: '100%',
                                  borderRadius: '5px',
                                  fontFamily: 'monospace',
                                  border: '1px solid #d4d4d8',
                                  backgroundColor: '#ffffff',
                                  color: '#09090b',
                                }}
                              />

                              {isSubmitted ? (
                                <button
                                  type="button"
                                  onClick={() => window.open(savedLink, '_blank', 'noopener,noreferrer')}
                                  style={{
                                    height: '34px',
                                    padding: '0 0.95rem',
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
                                    transition: 'background-color 0.15s ease',
                                  }}
                                  title="Open deliverable link in new tab"
                                >
                                  <ExternalLink size={13} />
                                  <span>Open</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSaveLink('post', item)}
                                  disabled={isSaving || !currentVal.trim()}
                                  style={{
                                    height: '34px',
                                    padding: '0 0.95rem',
                                    backgroundColor: !currentVal.trim() ? '#a1a1aa' : '#09090b',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '5px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: isSaving || !currentVal.trim() ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    flexShrink: 0,
                                    transition: 'background-color 0.15s ease',
                                  }}
                                  title="Submit deliverable link"
                                >
                                  {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                                  <span>Submit</span>
                                </button>
                              )}
                            </div>

                            {/* Sub-bar: Copy link action & Live status indicator when saved */}
                            {hasLink && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem' }}>
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
              flexShrink: 0,
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

            {/* Correction Requests Section */}
            {correctionsList.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Deliverable Review Feedback &amp; Corrections:
                </span>
                {correctionsList.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '6px',
                      backgroundColor: c.status === 'open' ? '#fffbeb' : '#f0fdf4',
                      border: c.status === 'open' ? '1px solid #fde68a' : '1px solid #bbf7d0',
                      fontSize: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {c.status === 'open' ? <AlertCircle size={14} color="#d97706" /> : <CheckCircle2 size={14} color="#16a34a" />}
                        <strong style={{ color: c.status === 'open' ? '#92400e' : '#166534' }}>
                          {c.status === 'open' ? 'Correction Requested by Client' : 'Resolved by Operations'}
                        </strong>
                      </div>
                      <span style={{ fontSize: '0.675rem', color: '#64748b' }}>
                        {c.requested_at ? formatDateTimeDDMMYYYY(c.requested_at) : ''}
                      </span>
                    </div>
                    <p style={{ margin: '0.35rem 0 0 1.25rem', color: '#1f2937' }}>"{c.remarks}"</p>
                    {c.status === 'resolved' && c.resolution_note && (
                      <div style={{ margin: '0.3rem 0 0 1.25rem', fontSize: '0.7rem', color: '#15803d', fontStyle: 'italic' }}>
                        Resolution: {c.resolution_note} ({c.resolved_by})
                      </div>
                    )}
                    {c.status === 'open' && isOps && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowResolveModalId(c.id);
                            setResolutionNote('');
                          }}
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            backgroundColor: '#09090b',
                            color: '#ffffff',
                            border: 'none',
                            padding: '0.3rem 0.75rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Resolve &amp; Re-upload Deliverables
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Acknowledged Status Details */}
            {isClientAcknowledged ? (
              <div style={{ padding: '0.85rem 1rem', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #dcfce7', fontSize: '0.775rem', color: '#166534' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                  <CheckCircle2 size={15} color="#16a34a" />
                  <span>
                    Verified &amp; Confirmed Ready for Formal Acceptance by {clientSignoff.acknowledged_by || 'Client Representative'} on{' '}
                    {clientSignoff.acknowledged_at
                      ? formatDateTimeDDMMYYYY(clientSignoff.acknowledged_at)
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
                      Please review all download links in <strong>Section 1 (Pre-Processing)</strong> and <strong>Section 2 (Post-Processing)</strong>. If everything required has been provided, confirm readiness for formal acceptance. If anything is missing or incorrect, request corrections below.
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

                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={handleClientAcknowledge}
                        disabled={!allLinksProvided || isAcknowledging || hasOpenCorrections}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          backgroundColor: (allLinksProvided && !hasOpenCorrections) ? '#16a34a' : '#e4e4e7',
                          color: (allLinksProvided && !hasOpenCorrections) ? '#ffffff' : '#71717a',
                          border: 'none',
                          padding: '0.55rem 1.25rem',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: (allLinksProvided && !hasOpenCorrections) ? 'pointer' : 'not-allowed',
                          boxShadow: (allLinksProvided && !hasOpenCorrections) ? '0 2px 4px rgba(22, 163, 74, 0.25)' : 'none',
                        }}
                      >
                        {isAcknowledging ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={15} />}
                        <span>Confirm Deliverables Ready for Formal Acceptance ✓</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowCorrectionModal(true);
                          setCorrectionRemark('');
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          backgroundColor: '#ffffff',
                          color: '#b45309',
                          border: '1px solid #fcd34d',
                          padding: '0.55rem 1rem',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        <AlertCircle size={14} />
                        <span>Request Corrections</span>
                      </button>

                      {!allLinksProvided && (
                        <span style={{ fontSize: '0.725rem', color: '#b45309' }}>
                          (Awaiting Operations team to provide all {totalChecklistedCount} links first)
                        </span>
                      )}

                      {hasOpenCorrections && (
                        <span style={{ fontSize: '0.725rem', color: '#dc2626', fontWeight: 600 }}>
                          (Pending open correction resolution before readiness can be confirmed)
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
                        ? hasOpenCorrections
                          ? 'Client has requested corrections. Resolve open issues to proceed.'
                          : 'All links are provided! Awaiting client confirmation of deliverables readiness.'
                        : `Operations must provide links for all deliverables (${totalLinksProvidedCount}/${totalChecklistedCount} currently ready) before client can confirm.`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right Column: Stage 5 Integrated Chat & Photogrammetry Specs ── */}
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

      {/* ── Client Request Corrections Modal ── */}
      {showCorrectionModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              maxWidth: '500px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertCircle size={18} color="#d97706" />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                  Request Deliverables Corrections
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
                  Notify the LATRICS processing team of missing or incorrect outputs.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitCorrection}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#09090b', marginBottom: '0.35rem' }}>
                  Describe the Issue or Missing Deliverables *
                </label>
                <textarea
                  rows={4}
                  value={correctionRemark}
                  onChange={(e) => setCorrectionRemark(e.target.value)}
                  placeholder="e.g. The orthomosaic resolution in Sector 2 is blurry / CAD boundary contours are missing for the South parcel..."
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    fontSize: '0.8rem',
                    borderRadius: '6px',
                    border: '1px solid #d4d4d8',
                    outline: 'none',
                    lineHeight: 1.5,
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  disabled={isSubmittingCorrection}
                  style={{
                    height: '34px',
                    padding: '0 0.85rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '5px',
                    border: '1px solid #d4d4d8',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingCorrection || !correctionRemark.trim()}
                  style={{
                    height: '34px',
                    padding: '0 1rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: '#d97706',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                  }}
                >
                  {isSubmittingCorrection ? 'Submitting...' : 'Submit Correction Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Ops Resolve Correction Modal ── */}
      {showResolveModalId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              maxWidth: '500px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#dcfce7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={18} color="#16a34a" />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                  Resolve Deliverables Correction
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
                  Confirm resolution and deliverable re-upload for client review.
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#09090b', marginBottom: '0.35rem' }}>
                Resolution Notes (e.g. Re-processed orthomosaic and updated Google Drive link)
              </label>
              <textarea
                rows={3}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Describe resolution taken..."
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  border: '1px solid #d4d4d8',
                  outline: 'none',
                  lineHeight: 1.5,
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowResolveModalId(null)}
                disabled={isResolvingCorrection}
                style={{
                  height: '34px',
                  padding: '0 0.85rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '5px',
                  border: '1px solid #d4d4d8',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleResolveCorrection(showResolveModalId)}
                disabled={isResolvingCorrection}
                style={{
                  height: '34px',
                  padding: '0 1rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                }}
              >
                {isResolvingCorrection ? 'Saving...' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}

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
