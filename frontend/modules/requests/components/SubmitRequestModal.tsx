import React, { useState } from 'react';
import { RequestVersionCreate } from '../types';

interface SubmitRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RequestVersionCreate) => Promise<void>;
  currentVersionNumber?: number;
}

export const SubmitRequestModal: React.FC<SubmitRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentVersionNumber = 0,
}) => {
  const nextVersionFormatted = `#${String(currentVersionNumber + 1).padStart(3, '0')}`;

  const [surveyLocation, setSurveyLocation] = useState('');
  const [surveyType, setSurveyType] = useState('thermal');
  const [targetArea, setTargetArea] = useState<string>('10.5');
  const [resolutionGSD, setResolutionGSD] = useState('1.5 cm/px');
  const [sensorPayload, setSensorPayload] = useState('Thermal Radiometric IR + RGB 48MP');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surveyLocation.trim()) {
      setError('Please provide the survey location / geographic coordinate anchor');
      return;
    }

    const areaNum = parseFloat(targetArea);
    if (isNaN(areaNum) || areaNum <= 0) {
      setError('Please provide a valid positive surface area in sq km');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: RequestVersionCreate = {
        survey_location: surveyLocation.trim(),
        survey_type: surveyType,
        target_area_sqkm: areaNum,
        requirements_payload: {
          gsd_resolution: resolutionGSD,
          sensor_payload: sensorPayload,
          client_notes: notes.trim() || undefined,
          submission_timestamp: new Date().toISOString(),
        },
      };

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit survey requirements');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        padding: '1rem',
      }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          boxShadow: 'var(--shadow-xl), var(--brand-glow)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--brand-focus, #3b82f6)',
                letterSpacing: '0.05em',
              }}
            >
              Immutable Survey Submission
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              Submit Requirement Version {nextVersionFormatted}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '1.25rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: '#f87171',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Geographic Survey Location *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Khavda Ultra Mega Solar Park, Sector 4, Gujarat"
              value={surveyLocation}
              onChange={(e) => setSurveyLocation(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Survey Modality *</label>
              <select
                className="form-input"
                value={surveyType}
                onChange={(e) => setSurveyType(e.target.value)}
                disabled={loading}
              >
                <option value="thermal">Thermal IR (Hotspot & Bypass Diode)</option>
                <option value="topography">Topographical LiDAR & Digital Elevation</option>
                <option value="multispectral">Multispectral / NDVI Vegetation</option>
                <option value="inspection">High-Res Visual Orthomosaic (RGB)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Target Surface Area (sq km) *</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                className="form-input"
                placeholder="10.5"
                value={targetArea}
                onChange={(e) => setTargetArea(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Required Ground Sample Distance (GSD)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 1.5 cm/px"
                value={resolutionGSD}
                onChange={(e) => setResolutionGSD(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sensor Payload Specification</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Radiometric FLIR Vue Pro R"
                value={sensorPayload}
                onChange={(e) => setSensorPayload(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Operational Remarks & Deliverable Specs</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Specify deliverable formats (e.g. GeoTIFF, LAS point cloud, IEC 62446-3 compliance report)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
            />
          </div>

          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              marginTop: '0.5rem',
              marginBottom: '1.5rem',
            }}
          >
            🔒 <strong>Immutable Versioning:</strong> Submitting this request locks Version {nextVersionFormatted}. Latrics Operations will generate a tailored operational flight plan and resource quotation against this exact specification.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Transmitting...' : `Submit Request (${nextVersionFormatted})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
