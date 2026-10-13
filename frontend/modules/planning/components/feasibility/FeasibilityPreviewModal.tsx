'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Portal } from '@/components/Portal';
import { PlanningFormData, ThreadMessage } from './types';

interface FeasibilityPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: PlanningFormData;
  updateField: (field: keyof PlanningFormData, value: any) => void;
  stageThreads: Record<number, ThreadMessage[]>;
  handleConfirmFinalSubmit: () => Promise<void>;
  backendKmlFile: { name: string; size: string } | null;
  displayProjectName: string;
  displayRequestId: string;
  displayClientCompany: string;
}

export function FeasibilityPreviewModal({
  isOpen,
  onClose,
  formData,
  updateField,
  stageThreads,
  handleConfirmFinalSubmit,
  backendKmlFile,
  displayProjectName,
  displayRequestId,
  displayClientCompany,
}: FeasibilityPreviewModalProps) {
  if (!isOpen) return null;

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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1.5rem',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '860px',
            backgroundColor: '#ffffff',
            border: '2px solid #09090b',
            borderRadius: '8px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
            overflow: 'hidden',
          }}
        >
          {/* Modal Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e4e4e7',
              backgroundColor: '#fafafa',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                {formData.feasibilityDecision === 'need_clarity'
                  ? 'Planning Preview — Send Clarification Request'
                  : 'Planning & Feasibility Full Review (Stages 1 — 8)'}
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#71717a', margin: '0.2rem 0 0' }}>
                {formData.feasibilityDecision === 'need_clarity'
                  ? 'Review all entered parameters, remarks, and attached files below before dispatching the clarification request to the client.'
                  : 'Scroll from top to bottom to inspect all stage entries, remarks, and feasibility determination before confirming submission.'}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#09090b',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div
            style={{
              padding: '1.5rem',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            {/* Project Header Card in Preview */}
            <div
              style={{
                padding: '0.85rem 1rem',
                border: '1px solid #09090b',
                borderRadius: '6px',
                backgroundColor: '#f4f4f5',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.8rem',
              }}
            >
              <div>
                <strong>{displayProjectName}</strong> ({displayRequestId}) | <span>{displayClientCompany}</span>
              </div>
              <div style={{ fontWeight: 800, textTransform: 'uppercase' }}>
                Decision: {formData.feasibilityDecision || 'Pending'}
              </div>
            </div>

            {/* Stage 1 Section */}
            <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
              <strong style={{ fontSize: '0.85rem', color: '#09090b', display: 'block', marginBottom: '0.5rem' }}>
                1. KML Findings
              </strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.775rem', color: '#52525b' }}>
                <div>Client KML: <strong style={{ color: '#09090b' }}>{formData.kmlFileName || backendKmlFile?.name || '—'}</strong> ({formData.kmlFileSize || backendKmlFile?.size || '—'})</div>
                <div>Calculated Area: <strong style={{ color: '#09090b' }}>{formData.kmlCalculatedArea ? `${formData.kmlCalculatedArea} sq km` : '—'}</strong></div>
                <div>Requested Area: <strong style={{ color: '#09090b' }}>{formData.kmlRequestedArea ? `${formData.kmlRequestedArea} sq km` : '—'}</strong></div>
                <div>Dispute &amp; Boundary: <strong style={{ color: '#09090b' }}>{formData.kmlBoundaryStatus || '—'}</strong></div>
              </div>
              {(stageThreads[1] || []).length > 0 && (
                <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #e4e4e7', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: '#09090b' }}>Stage 1 Remarks ({stageThreads[1].length}):</span>
                  {stageThreads[1].map((t) => (
                    <div key={t.id} style={{ marginTop: '0.35rem', color: '#52525b' }}>
                      • <strong>{t.author}</strong> ({t.role}): {t.content} {t.attachment && `[Attached: ${t.attachment.name}]`}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stage 2 Section */}
            <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
              <strong style={{ fontSize: '0.85rem', color: '#09090b', display: 'block', marginBottom: '0.5rem' }}>
                2. Regularity and Airspace
              </strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.775rem', color: '#52525b' }}>
                <div>Zones: <strong style={{ color: '#09090b' }}>{formData.airspaceZones.join(', ') || 'None selected'}</strong></div>
                <div>Police Intimation: <strong style={{ color: '#09090b' }}>{formData.policeIntimationRequired || '—'}</strong></div>
              </div>
              {(stageThreads[2] || []).length > 0 && (
                <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #e4e4e7', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: '#09090b' }}>Stage 2 Remarks ({stageThreads[2].length}):</span>
                  {stageThreads[2].map((t) => (
                    <div key={t.id} style={{ marginTop: '0.35rem', color: '#52525b' }}>
                      • <strong>{t.author}</strong> ({t.role}): {t.content} {t.attachment && `[Attached: ${t.attachment.name}]`}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stage 3 Section */}
            <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
              <strong style={{ fontSize: '0.85rem', color: '#09090b', display: 'block', marginBottom: '0.5rem' }}>
                3. Accessibility and Feasibility
              </strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.775rem', color: '#52525b' }}>
                <div>Terrain Types: <strong style={{ color: '#09090b' }}>{formData.terrainTypes.join(', ') || formData.terrainType || '—'}</strong></div>
                <div>Elevation: <strong style={{ color: '#09090b' }}>{formData.elevationVariationMeters ? `${formData.elevationVariationMeters} m` : '—'}</strong></div>
                <div>Weather: <strong style={{ color: '#09090b' }}>{formData.weatherConditions.join(', ') || 'None'}</strong></div>
                <div>Field Access Identified: <strong style={{ color: '#09090b' }}>{formData.fieldAccessIdentified ? 'Yes' : 'No'}</strong></div>
              </div>
              {(stageThreads[3] || []).length > 0 && (
                <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #e4e4e7', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: '#09090b' }}>Stage 3 Remarks ({stageThreads[3].length}):</span>
                  {stageThreads[3].map((t) => (
                    <div key={t.id} style={{ marginTop: '0.35rem', color: '#52525b' }}>
                      • <strong>{t.author}</strong> ({t.role}): {t.content} {t.attachment && `[Attached: ${t.attachment.name}]`}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stage 4 Section */}
            <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
              <strong style={{ fontSize: '0.85rem', color: '#09090b', display: 'block', marginBottom: '0.5rem' }}>
                4. Obstacles and Hazards
              </strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.775rem', color: '#52525b' }}>
                <div>Identified Hazards: <strong style={{ color: '#09090b' }}>{formData.hazards.join(', ') || 'None reported'}</strong></div>
                <div>Max Obstacle Height: <strong style={{ color: '#09090b' }}>{formData.maxObstacleHeightMeters ? `${formData.maxObstacleHeightMeters} m` : '—'}</strong></div>
                <div>Safety Buffer Distance: <strong style={{ color: '#09090b' }}>{formData.safetyBufferDistanceMeters ? `${formData.safetyBufferDistanceMeters} m` : '—'}</strong></div>
              </div>
              {(stageThreads[4] || []).length > 0 && (
                <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #e4e4e7', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: '#09090b' }}>Stage 4 Remarks ({stageThreads[4].length}):</span>
                  {stageThreads[4].map((t) => (
                    <div key={t.id} style={{ marginTop: '0.35rem', color: '#52525b' }}>
                      • <strong>{t.author}</strong> ({t.role}): {t.content} {t.attachment && `[Attached: ${t.attachment.name}]`}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stage 5 Section */}
            <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
              <strong style={{ fontSize: '0.85rem', color: '#09090b', display: 'block', marginBottom: '0.5rem' }}>
                5. GCP Planning
              </strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.775rem', color: '#52525b' }}>
                <div>GCPs Needed: <strong style={{ color: '#09090b' }}>{formData.gcpsNeeded || '—'}</strong></div>
                <div>GCP Target Size: <strong style={{ color: '#09090b' }}>{formData.gcpTargetSizeCm ? `${formData.gcpTargetSizeCm} cm` : '—'}</strong></div>
                <div>GCP Material: <strong style={{ color: '#09090b' }}>{formData.gcpTargetMaterial || '—'}</strong></div>
                <div>GCP Location Attachment: <strong style={{ color: '#09090b' }}>{formData.gcpLocationFile || '—'}</strong></div>
              </div>
              {(stageThreads[5] || []).length > 0 && (
                <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #e4e4e7', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: '#09090b' }}>Stage 5 Remarks ({stageThreads[5].length}):</span>
                  {stageThreads[5].map((t) => (
                    <div key={t.id} style={{ marginTop: '0.35rem', color: '#52525b' }}>
                      • <strong>{t.author}</strong> ({t.role}): {t.content} {t.attachment && `[Attached: ${t.attachment.name}]`}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stage 6 Section */}
            <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
              <strong style={{ fontSize: '0.85rem', color: '#09090b', display: 'block', marginBottom: '0.5rem' }}>
                6. Flight Planning
              </strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.775rem', color: '#52525b' }}>
                <div>Number of Landings: <strong style={{ color: '#09090b' }}>{formData.numberOfLandings || '—'}</strong></div>
                <div>Planned Altitude: <strong style={{ color: '#09090b' }}>{formData.plannedAltitudeMeters ? `${formData.plannedAltitudeMeters} m AGL` : '—'}</strong></div>
                <div>Front Overlap: <strong style={{ color: '#09090b' }}>{formData.frontOverlapPercent ? `${formData.frontOverlapPercent}%` : '—'}</strong></div>
                <div>Side Overlap: <strong style={{ color: '#09090b' }}>{formData.sideOverlapPercent ? `${formData.sideOverlapPercent}%` : '—'}</strong></div>
              </div>
              {(stageThreads[6] || []).length > 0 && (
                <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #e4e4e7', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: '#09090b' }}>Stage 6 Remarks ({stageThreads[6].length}):</span>
                  {stageThreads[6].map((t) => (
                    <div key={t.id} style={{ marginTop: '0.35rem', color: '#52525b' }}>
                      • <strong>{t.author}</strong> ({t.role}): {t.content} {t.attachment && `[Attached: ${t.attachment.name}]`}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stage 7 Section */}
            <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
              <strong style={{ fontSize: '0.85rem', color: '#09090b', display: 'block', marginBottom: '0.5rem' }}>
                7. Expected Timelines
              </strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.775rem', color: '#52525b' }}>
                <div>Survey Days: <strong style={{ color: '#09090b' }}>{formData.expectedSurveyDays || '—'}</strong></div>
                <div>Expected Start: <strong style={{ color: '#09090b' }}>{formData.expectedStartDate || '—'}</strong></div>
                <div>Expected End: <strong style={{ color: '#09090b' }}>{formData.expectedEndDate || '—'}</strong></div>
                <div>Pilot Travel: <strong style={{ color: '#09090b' }}>{formData.pilotTravelDate || '—'}</strong></div>
                <div>Data Delivery: <strong style={{ color: '#09090b' }}>{formData.dataDeliveryTimelineDays ? `${formData.dataDeliveryTimelineDays} days` : '—'}</strong></div>
              </div>
              {(stageThreads[7] || []).length > 0 && (
                <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #e4e4e7', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: '#09090b' }}>Stage 7 Remarks ({stageThreads[7].length}):</span>
                  {stageThreads[7].map((t) => (
                    <div key={t.id} style={{ marginTop: '0.35rem', color: '#52525b' }}>
                      • <strong>{t.author}</strong> ({t.role}): {t.content} {t.attachment && `[Attached: ${t.attachment.name}]`}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stage 8 Section */}
            <div style={{ border: '2px solid #09090b', borderRadius: '6px', padding: '1rem', backgroundColor: '#fafafa' }}>
              <strong style={{ fontSize: '0.85rem', color: '#09090b', display: 'block', marginBottom: '0.5rem' }}>
                8. Feasible to Proceed
              </strong>
              <div style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                Decision: {formData.feasibilityDecision || 'None Selected'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#52525b', marginBottom: '0.5rem' }}>
                LATRICS Operational Remarks: {formData.decisionRemarks || 'No formal remarks provided.'}
              </div>
              {(stageThreads[8] || []).length > 0 && (
                <div style={{ marginTop: '0.5rem', borderTop: '1px dashed #d4d4d8', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: '#09090b' }}>Stage 8 Discussion Remarks ({stageThreads[8].length}):</span>
                  {stageThreads[8].map((t) => (
                    <div key={t.id} style={{ marginTop: '0.35rem', color: '#52525b' }}>
                      • <strong>{t.author}</strong> ({t.role}): {t.content} {t.attachment && `[Attached: ${t.attachment.name}]`}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mandatory Confirmation Checkbox inside scrollable popup */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                borderRadius: '6px',
                border: '1.5px dashed #09090b',
                backgroundColor: '#ffffff',
              }}
            >
              <input
                type="checkbox"
                id="popup-confirm-check"
                checked={formData.reviewConfirmed}
                onChange={(e) => updateField('reviewConfirmed', e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#09090b' }}
              />
              <label htmlFor="popup-confirm-check" style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b', cursor: 'pointer' }}>
                {formData.feasibilityDecision === 'need_clarity'
                  ? 'I have reviewed Sections 1–7 and confirm dispatching this clarification request and remarks to the client.'
                  : formData.feasibilityDecision === 'yes'
                  ? 'I confirm that all stages are verified and this survey plan is feasible to proceed for client sign-off.'
                  : 'I have reviewed all stages from top to bottom and confirm these operational planning determinations.'}
              </label>
            </div>
          </div>

          {/* Modal Footer with Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e4e4e7',
              backgroundColor: '#fafafa',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                height: '36px',
                padding: '0 1rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                backgroundColor: '#ffffff',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Close &amp; Modify Form
            </button>

            <button
              type="button"
              disabled={!formData.reviewConfirmed}
              onClick={handleConfirmFinalSubmit}
              style={{
                height: '36px',
                padding: '0 1.5rem',
                fontSize: '0.825rem',
                fontWeight: 800,
                backgroundColor: formData.reviewConfirmed ? '#09090b' : '#f4f4f5',
                color: formData.reviewConfirmed ? '#ffffff' : '#a1a1aa',
                border: formData.reviewConfirmed ? '1px solid #09090b' : '1px solid #d4d4d8',
                borderRadius: '4px',
                cursor: formData.reviewConfirmed ? 'pointer' : 'not-allowed',
              }}
            >
              {formData.feasibilityDecision === 'need_clarity'
                ? 'Confirm & Send Clarification Request to Client'
                : formData.feasibilityDecision === 'yes'
                ? 'Confirm Feasibility & Request Client Agreement'
                : 'Confirm & Submit Determination'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
