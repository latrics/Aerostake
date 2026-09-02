import React, { useState } from 'react';
import { RequestVersion } from '../types';

interface RequestHistoryAccordionProps {
  requests: RequestVersion[];
  onNewRevisionClick?: () => void;
}

export const RequestHistoryAccordion: React.FC<RequestHistoryAccordionProps> = ({
  requests,
  onNewRevisionClick,
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number>(0);

  if (requests.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          No survey requirements submitted yet for this project.
        </p>
        {onNewRevisionClick && (
          <button onClick={onNewRevisionClick} className="btn btn-primary">
            + Submit Requirements (#001)
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Survey Requirement Submissions ({requests.length} total)
        </h4>
        {onNewRevisionClick && (
          <button
            onClick={onNewRevisionClick}
            className="btn btn-secondary"
            style={{ fontSize: '0.825rem', padding: '0.4rem 0.85rem' }}
          >
            + Submit Revised Specs
          </button>
        )}
      </div>

      {requests.map((req, idx) => {
        const isExpanded = expandedIndex === idx;
        const versionFormatted = `#${String(req.version).padStart(3, '0')}`;
        const submittedDate = new Date(req.created_at).toLocaleString();

        return (
          <div
            key={req.id}
            className="glass-panel"
            style={{
              overflow: 'hidden',
              borderColor: isExpanded ? 'rgba(59, 130, 246, 0.4)' : undefined,
              transition: 'var(--transition-smooth)',
            }}
          >
            <div
              onClick={() => setExpandedIndex(isExpanded ? -1 : idx)}
              style={{
                padding: '1.25rem 1.5rem',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: isExpanded ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span
                  style={{
                    backgroundColor: idx === 0 ? 'rgba(37, 99, 235, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: idx === 0 ? '#3b82f6' : 'var(--text-secondary)',
                    fontWeight: 700,
                    padding: '0.25rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                  }}
                >
                  Version {versionFormatted} {idx === 0 && '(Active)'}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{req.survey_location}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Submitted {submittedDate}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <span
                  style={{
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {req.survey_type} • {req.target_area_sqkm || '--'} km²
                </span>
                <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
                  {isExpanded ? '▲' : '▼'}
                </span>
              </div>
            </div>

            {isExpanded && (
              <div
                style={{
                  padding: '1.25rem 1.5rem',
                  borderTop: '1px solid var(--border-color)',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                }}
              >
                <div className="grid-3" style={{ marginBottom: '1.25rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Survey Modality
                    </div>
                    <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                      {req.survey_type}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Target Area
                    </div>
                    <div style={{ fontWeight: 600 }}>{req.target_area_sqkm || 'N/A'} sq km</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      GSD Resolution
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {req.requirements_payload?.gsd_resolution || 'Standard'}
                    </div>
                  </div>
                </div>

                {req.requirements_payload && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                      Specification Metadata Payload
                    </div>
                    <pre
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        overflowX: 'auto',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      {JSON.stringify(req.requirements_payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
