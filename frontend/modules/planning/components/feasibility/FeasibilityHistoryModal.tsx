'use client';

import React from 'react';
import { History, X } from 'lucide-react';
import { Portal } from '@/components/Portal';

interface FeasibilityHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  planningVersions: any[];
  activeVersionCode: string | null;
  onSelectVersion: (ver: any, isHistorical: boolean) => void;
  displayProjectName: string;
}

export function FeasibilityHistoryModal({
  isOpen,
  onClose,
  planningVersions,
  activeVersionCode,
  onSelectVersion,
  displayProjectName,
}: FeasibilityHistoryModalProps) {
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
          zIndex: 99999,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            padding: '1.5rem',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>Request History</h2>
              <p style={{ fontSize: '0.775rem', color: '#71717a', marginTop: '0.2rem' }}>
                Chronological timeline of all planning versions and updates for {displayProjectName}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
            >
              <X size={18} color="#71717a" />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {planningVersions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#71717a' }}>
                <History size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.35, display: 'block' }} />
                <div style={{ fontWeight: 800, color: '#09090b', marginBottom: '0.35rem', fontSize: '0.95rem' }}>
                  No Submitted Versions Recorded
                </div>
                <div style={{ fontSize: '0.785rem', color: '#71717a', maxWidth: '380px', margin: '0 auto', lineHeight: 1.5 }}>
                  Request history only counts and archives planning versions once they are formally submitted. Draft saves are preserved in the background and are not recorded as history versions.
                </div>
              </div>
            ) : (
              planningVersions.map((ver, idx) => {
                const isCurrent = ver.version_code === activeVersionCode;
                const isClientVer = ver.sender === 'client';
                const createdDate = ver.created_at
                  ? new Date(ver.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Initial';

                return (
                  <div
                    key={ver.id || idx}
                    style={{
                      border: isCurrent ? '1.5px solid #09090b' : '1px solid #e4e4e7',
                      borderRadius: '6px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: isCurrent ? '#f4f4f5' : '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
                          {ver.version_code || `Version ${ver.version_number}`}
                        </span>
                        <span
                          style={{
                            fontSize: '0.675rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.4rem',
                            borderRadius: '3px',
                            backgroundColor: isClientVer ? '#f4f4f5' : '#18181b',
                            color: isClientVer ? '#18181b' : '#ffffff',
                            border: `1px solid ${isClientVer ? '#d4d4d8' : '#27272a'}`,
                          }}
                        >
                          {isClientVer ? '[Client]' : '[LATRICS Ops]'}
                        </span>
                        {idx === 0 && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.05rem 0.35rem', borderRadius: '3px', backgroundColor: '#09090b', color: '#ffffff' }}>
                            Latest
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#71717a' }}>
                        Updated by: <strong>{ver.sender_name || (isClientVer ? 'Client' : 'LATRICS Ops')}</strong> • {createdDate}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectVersion(ver, idx !== 0)}
                      style={{
                        padding: '0.35rem 0.85rem',
                        fontSize: '0.775rem',
                        fontWeight: 700,
                        backgroundColor: isCurrent ? '#09090b' : '#ffffff',
                        color: isCurrent ? '#ffffff' : '#09090b',
                        border: '1px solid #09090b',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      {isCurrent ? 'Current' : 'View Snapshot'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
