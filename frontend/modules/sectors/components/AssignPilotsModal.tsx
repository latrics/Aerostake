'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Users,
  UserCheck,
  UserPlus,
  Mail,
  Phone,
  Search,
  CheckSquare,
  Square,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Clock,
  Calendar,
  Info,
} from 'lucide-react';
import { Sector } from '../types';
import { sectorApi } from '../api';
import { invitationsApi } from '@/modules/invitations/api';
import { PlannedProjectTenure } from '@/modules/planning/types';

interface AssignPilotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  sectors: Sector[];
  availablePilots: Array<{ id: string; name: string; email?: string }>;
  plannedTenure?: PlannedProjectTenure | null;
  onSuccess: () => void;
}

export const AssignPilotsModal: React.FC<AssignPilotsModalProps> = ({
  isOpen,
  onClose,
  projectId,
  sectors,
  availablePilots = [],
  plannedTenure = null,
  onSuccess,
}) => {
  const router = useRouter();
  const [selectedSectorIds, setSelectedSectorIds] = useState<string[]>([]);
  const [initialSectorDates, setInitialSectorDates] = useState<Record<string, string>>({});
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
  const [sectorScanningDates, setSectorScanningDates] = useState<Record<string, string>>({});
  const [commonScanningDate, setCommonScanningDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'registered' | 'invite'>('registered');
  const [selectedPilotId, setSelectedPilotId] = useState<string>('');
  const [inviteName, setInviteName] = useState<string>('');
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [invitePhone, setInvitePhone] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'unassigned' | 'assigned'>('all');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset transient messages and initialize scanning dates snapshot when opening
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      setSelectedSectorIds([]);
      setShowCancelConfirm(false);
      const dates: Record<string, string> = {};
      sectors.forEach((sec) => {
        const coords = (sec.polygon_coordinates as any) || {};
        const pl = sec.planning || coords.planning || {};
        const d = (pl.scanning_date || pl.planned_start_date || '').trim();
        if (d) {
          dates[sec.id] = d;
        }
      });
      setInitialSectorDates(dates);
      setSectorScanningDates(dates);
      setCommonScanningDate('');
      setSelectedPilotId('');
      setInviteName('');
      setInviteEmail('');
      setInvitePhone('');
      setActiveTab('registered');
    }
  }, [isOpen, sectors]);

  // Normalize sectors and their assigned pilot info
  const normalizedSectors = useMemo(() => {
    return sectors.map((sec) => {
      const coords = (sec.polygon_coordinates as any) || {};
      const planning = sec.planning || coords.planning || {};
      const assignedPilot = (
        planning.assigned_pilot ||
        (Array.isArray(planning.assigned_pilots) && planning.assigned_pilots[0]?.name) ||
        (typeof planning.assigned_pilots?.[0] === 'string' ? planning.assigned_pilots[0] : '') ||
        ''
      ).trim();
      const isPendingInvite = Boolean(planning.is_pending_invite);
      const pilotEmail = planning.pilot_email || '';
      const scanningDate = (planning.scanning_date || planning.planned_start_date || '').trim();

      return {
        ...sec,
        displayPilot: assignedPilot,
        isPendingInvite,
        pilotEmail,
        scanningDate,
        hasAssignment: Boolean(assignedPilot),
      };
    });
  }, [sectors]);

  // Filtered sectors for the selection list
  const filteredSectors = useMemo(() => {
    return normalizedSectors.filter((sec) => {
      const matchSearch =
        sec.sector_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sec.displayPilot && sec.displayPilot.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      if (filterMode === 'unassigned') return !sec.hasAssignment;
      if (filterMode === 'assigned') return sec.hasAssignment;
      return true;
    });
  }, [normalizedSectors, searchTerm, filterMode]);

  const toggleSector = (sectorId: string) => {
    setSelectedSectorIds((prev) => {
      const isSelected = prev.includes(sectorId);
      if (!isSelected && !sectorScanningDates[sectorId] && commonScanningDate) {
        setSectorScanningDates((curr) => ({ ...curr, [sectorId]: commonScanningDate }));
      }
      return isSelected ? prev.filter((id) => id !== sectorId) : [...prev, sectorId];
    });
  };

  const handleApplyCommonDateToAll = () => {
    if (!commonScanningDate) return;
    setSectorScanningDates((curr) => {
      const updated = { ...curr };
      selectedSectorIds.forEach((id) => {
        updated[id] = commonScanningDate;
      });
      return updated;
    });
  };

  const handleSectorDateChange = (sectorId: string, date: string) => {
    setSectorScanningDates((curr) => ({
      ...curr,
      [sectorId]: date,
    }));
  };

  const handleSelectAllFiltered = () => {
    const ids = filteredSectors.map((s) => s.id);
    setSelectedSectorIds((prev) => {
      const union = Array.from(new Set([...prev, ...ids]));
      if (commonScanningDate) {
        setSectorScanningDates((curr) => {
          const updated = { ...curr };
          union.forEach((id) => {
            if (!updated[id]) updated[id] = commonScanningDate;
          });
          return updated;
        });
      }
      return union;
    });
  };

  const handleSelectUnassignedOnly = () => {
    const unassignedIds = normalizedSectors.filter((s) => !s.hasAssignment).map((s) => s.id);
    setSelectedSectorIds(unassignedIds);
    if (commonScanningDate) {
      setSectorScanningDates((curr) => {
        const updated = { ...curr };
        unassignedIds.forEach((id) => {
          if (!updated[id]) updated[id] = commonScanningDate;
        });
        return updated;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedSectorIds([]);
  };

  // Check whether user has performed any edits in the modal
  const hasUnsavedChanges = useMemo(() => {
    if (selectedSectorIds.length > 0) return true;
    if (commonScanningDate.trim() !== '') return true;
    if (selectedPilotId !== '') return true;
    if (inviteName.trim() !== '' || inviteEmail.trim() !== '' || invitePhone.trim() !== '') return true;
    for (const sec of sectors) {
      const orig = initialSectorDates[sec.id] || '';
      const curr = sectorScanningDates[sec.id] || '';
      if (orig !== curr) return true;
    }
    return false;
  }, [
    selectedSectorIds,
    commonScanningDate,
    selectedPilotId,
    inviteName,
    inviteEmail,
    invitePhone,
    sectors,
    initialSectorDates,
    sectorScanningDates,
  ]);

  const handleCancelClick = () => {
    if (hasUnsavedChanges) {
      setShowCancelConfirm(true);
    } else {
      onClose();
    }
  };

  const handleSaveAll = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (selectedSectorIds.length === 0) {
      setErrorMessage('Please select at least one sector in Step 1 to save changes.');
      return;
    }

    const isInviting = activeTab === 'invite' && Boolean(inviteName.trim() || inviteEmail.trim());
    const isAssigningRegistered = activeTab === 'registered' && Boolean(selectedPilotId);

    let targetPilotName = '';
    let targetPilotId: string | undefined = undefined;
    let targetPilotEmail: string | undefined = undefined;
    let targetPilotPhone: string | undefined = undefined;
    let isPending = false;

    if (isInviting) {
      if (!inviteName.trim()) {
        setErrorMessage("Please enter the pilot's full name.");
        return;
      }
      if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
        setErrorMessage('Please enter a valid pilot email address.');
        return;
      }
      targetPilotName = inviteName.trim();
      targetPilotEmail = inviteEmail.trim().toLowerCase();
      targetPilotPhone = invitePhone.trim() || undefined;
      isPending = true;
    } else if (isAssigningRegistered) {
      const pilot = availablePilots.find((p) => p.id === selectedPilotId);
      if (pilot) {
        targetPilotName = pilot.name;
        targetPilotId = pilot.id;
        targetPilotEmail = pilot.email;
        isPending = false;
      }
    }

    const hasPilotAssignment = Boolean(targetPilotName);

    // Check if dates were specified or modified
    const hasAnyDate = selectedSectorIds.some((id) =>
      Boolean(sectorScanningDates[id]?.trim() || commonScanningDate?.trim())
    );
    const hasDateDiff = selectedSectorIds.some(
      (id) => (sectorScanningDates[id] || '') !== (initialSectorDates[id] || '')
    ) || Boolean(commonScanningDate?.trim());

    if (!hasPilotAssignment && !hasAnyDate && !hasDateDiff) {
      setErrorMessage(
        'Please select a pilot to assign or specify scanning dates for the selected sectors before saving.'
      );
      return;
    }

    try {
      setIsSubmitting(true);

      if (hasPilotAssignment) {
        // If inviting new pilot, dispatch invitation email
        if (isPending && targetPilotEmail) {
          try {
            await invitationsApi.createInvitation({
              email: targetPilotEmail,
              role: 'pilot' as any,
            });
          } catch (inviteErr: any) {
            console.warn('Invitation dispatch notification:', inviteErr);
          }
        }

        // Batch assign pilot and save sector dates simultaneously
        await sectorApi.batchAssignPilots(projectId, {
          sector_ids: selectedSectorIds,
          pilot_name: targetPilotName,
          pilot_id: targetPilotId,
          pilot_email: targetPilotEmail,
          pilot_phone: targetPilotPhone,
          is_pending_invite: isPending,
          scanning_date: commonScanningDate || undefined,
          sector_scanning_dates: sectorScanningDates,
        });
      } else {
        // No pilot assigned -> batch schedule scanning dates only
        await sectorApi.batchScheduleDates(projectId, {
          sector_ids: selectedSectorIds,
          scanning_date: commonScanningDate || undefined,
          sector_scanning_dates: sectorScanningDates,
        });
      }

      onSuccess();
      onClose();

      if (isPending) {
        router.push('/user-management?tab=pending');
      }
    } catch (err: any) {
      console.error('Failed to save sector planning:', err);
      setErrorMessage(
        err?.response?.data?.detail || err?.message || 'Failed to save changes. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1050,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) handleCancelClick();
      }}
    >
      <div
        style={{
          position: 'relative',
          backgroundColor: '#ffffff',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          borderRadius: '10px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e4e4e7',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.18s ease-out',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #f4f4f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: '#09090b',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserCheck size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b', margin: 0 }}>
                Assign Pilots & Schedule Sectors
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#71717a', margin: '0.15rem 0 0 0' }}>
                Multi-select sectors to set scanning dates and assign flight crew in batches
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCancelClick}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#71717a',
              padding: '0.35rem',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '1.25rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Notification Messages */}
          {errorMessage && (
            <div
              style={{
                padding: '0.65rem 0.85rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.75rem',
                color: '#991b1b',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              style={{
                padding: '0.65rem 0.85rem',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.75rem',
                color: '#065f46',
              }}
            >
              <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Step 1: Sector Selection Area */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: '#71717a',
                  }}
                >
                  Step 1: Select Target Sectors ({selectedSectorIds.length} Selected)
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: '#f4f4f5',
                    border: '1px solid #e4e4e7',
                    color: '#09090b',
                    cursor: 'pointer',
                  }}
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleSelectUnassignedOnly}
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: '#f4f4f5',
                    border: '1px solid #e4e4e7',
                    color: '#09090b',
                    cursor: 'pointer',
                  }}
                >
                  Select Unassigned
                </button>
                {selectedSectorIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #d4d4d8',
                      color: '#71717a',
                      cursor: 'pointer',
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.65rem',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Search
                  size={13}
                  style={{
                    position: 'absolute',
                    left: '0.65rem',
                    color: '#a1a1aa',
                  }}
                />
                <input
                  type="text"
                  placeholder="Filter by sector code (e.g. S1) or pilot..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    height: '30px',
                    paddingLeft: '2rem',
                    paddingRight: '0.65rem',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #e4e4e7',
                    backgroundColor: '#fafafa',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {(['all', 'unassigned', 'assigned'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFilterMode(mode)}
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: filterMode === mode ? 700 : 500,
                      padding: '0.25rem 0.55rem',
                      borderRadius: '4px',
                      backgroundColor: filterMode === mode ? '#09090b' : '#fafafa',
                      color: filterMode === mode ? '#ffffff' : '#71717a',
                      border: '1px solid',
                      borderColor: filterMode === mode ? '#09090b' : '#e4e4e7',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Sectors Checkbox Grid */}
            <div
              style={{
                maxHeight: '190px',
                overflowY: 'auto',
                border: '1px solid #e4e4e7',
                borderRadius: '6px',
                padding: '0.4rem',
                backgroundColor: '#ffffff',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '0.4rem',
              }}
            >
              {filteredSectors.length === 0 ? (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    padding: '1.5rem',
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    color: '#a1a1aa',
                  }}
                >
                  No matching sectors found.
                </div>
              ) : (
                filteredSectors.map((sec) => {
                  const isChecked = selectedSectorIds.includes(sec.id);
                  return (
                    <div
                      key={sec.id}
                      onClick={() => toggleSector(sec.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.6rem',
                        borderRadius: '5px',
                        border: '1px solid',
                        borderColor: isChecked ? '#09090b' : '#f4f4f5',
                        backgroundColor: isChecked ? '#f4f4f5' : '#fafafa',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                        {isChecked ? (
                          <CheckSquare size={15} color="#09090b" style={{ flexShrink: 0 }} />
                        ) : (
                          <Square size={15} color="#a1a1aa" style={{ flexShrink: 0 }} />
                        )}
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#09090b' }}>
                          {sec.sector_code}
                        </span>
                        {sec.target_area_sqkm && (
                          <span style={{ fontSize: '0.68rem', color: '#71717a' }}>
                            {Number(sec.target_area_sqkm).toFixed(2)} km²
                          </span>
                        )}
                      </div>

                      <div style={{ flexShrink: 0, textAlign: 'right', paddingLeft: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {(sectorScanningDates[sec.id] || sec.scanningDate) && (
                          <span
                            title={`Scheduled Date of Scanning: ${sectorScanningDates[sec.id] || sec.scanningDate}`}
                            style={{
                              fontSize: '0.63rem',
                              fontWeight: 600,
                              padding: '0.1rem 0.35rem',
                              borderRadius: '3px',
                              backgroundColor: '#f4f4f5',
                              color: '#09090b',
                              border: '1px solid #e4e4e7',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                            }}
                          >
                            <Calendar size={10} color="#71717a" />
                            {sectorScanningDates[sec.id] || sec.scanningDate}
                          </span>
                        )}
                        {sec.displayPilot ? (
                          <span
                            title={sec.isPendingInvite ? `Invite Pending (${sec.pilotEmail})` : `Assigned to ${sec.displayPilot}`}
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              padding: '0.12rem 0.35rem',
                              borderRadius: '3px',
                              backgroundColor: sec.isPendingInvite ? '#fef3c7' : '#e0e7ff',
                              color: sec.isPendingInvite ? '#92400e' : '#3730a3',
                              border: `1px solid ${sec.isPendingInvite ? '#fde68a' : '#c7d2fe'}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              maxWidth: '110px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {sec.isPendingInvite ? <Clock size={10} /> : <UserCheck size={10} />}
                            {sec.displayPilot}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              color: '#a1a1aa',
                              backgroundColor: '#ffffff',
                              padding: '0.1rem 0.3rem',
                              borderRadius: '3px',
                              border: '1px solid #e4e4e7',
                            }}
                          >
                            Unassigned
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Step 2: Date of Scanning for Selected Sectors */}
          <div
            style={{
              border: '1px solid #e4e4e7',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              backgroundColor: '#fafafa',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.6rem',
                borderBottom: '1px solid #e4e4e7',
                paddingBottom: '0.5rem',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Calendar size={15} color="#09090b" />
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: '#09090b',
                  }}
                >
                  Step 2: Mention Date of Scanning for Sectors
                </span>
                {selectedSectorIds.length > 0 && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      backgroundColor: '#09090b',
                      color: '#ffffff',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '999px',
                    }}
                  >
                    {selectedSectorIds.length}
                  </span>
                )}
              </div>

              {/* Bulk Date Quick-Apply Bar */}
              {selectedSectorIds.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 600 }}>Quick Set All:</span>
                  <input
                    type="date"
                    value={commonScanningDate}
                    onChange={(e) => setCommonScanningDate(e.target.value)}
                    style={{
                      height: '26px',
                      fontSize: '0.72rem',
                      padding: '0 0.4rem',
                      borderRadius: '4px',
                      border: (() => {
                        if (!commonScanningDate || !plannedTenure) return '1px solid #d4d4d8';
                        const isBefore = Boolean(plannedTenure.expectedStartDate && commonScanningDate < plannedTenure.expectedStartDate);
                        const isAfter = Boolean(plannedTenure.expectedEndDate && commonScanningDate > plannedTenure.expectedEndDate);
                        return (isBefore || isAfter) ? '1px solid #d97706' : '1px solid #d4d4d8';
                      })(),
                      backgroundColor: '#ffffff',
                      color: '#09090b',
                      outline: 'none',
                    }}
                  />
                  {commonScanningDate && plannedTenure && (() => {
                    const isBefore = Boolean(plannedTenure.expectedStartDate && commonScanningDate < plannedTenure.expectedStartDate);
                    const isAfter = Boolean(plannedTenure.expectedEndDate && commonScanningDate > plannedTenure.expectedEndDate);
                    if (isBefore || isAfter) {
                      return (
                        <span
                          title={`Scheduled date (${commonScanningDate}) is outside planned tenure (${plannedTenure.expectedStartDate} to ${plannedTenure.expectedEndDate})`}
                          style={{
                            fontSize: '0.62rem',
                            color: '#b45309',
                            backgroundColor: '#fef3c7',
                            border: '1px solid #fde68a',
                            borderRadius: '3px',
                            padding: '1px 5px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                          }}
                        >
                          <AlertTriangle size={10} color="#d97706" /> Outside Window
                        </span>
                      );
                    }
                    return null;
                  })()}
                  <button
                    type="button"
                    onClick={handleApplyCommonDateToAll}
                    disabled={!commonScanningDate}
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.55rem',
                      height: '26px',
                      borderRadius: '4px',
                      backgroundColor: commonScanningDate ? '#09090b' : '#e4e4e7',
                      color: commonScanningDate ? '#ffffff' : '#a1a1aa',
                      border: 'none',
                      cursor: commonScanningDate ? 'pointer' : 'not-allowed',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    Apply to All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      setCommonScanningDate(todayStr);
                      setSectorScanningDates((curr) => {
                        const updated = { ...curr };
                        selectedSectorIds.forEach((id) => {
                          updated[id] = todayStr;
                        });
                        return updated;
                      });
                    }}
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.45rem',
                      height: '26px',
                      borderRadius: '4px',
                      backgroundColor: '#ffffff',
                      color: '#09090b',
                      border: '1px solid #d4d4d8',
                      cursor: 'pointer',
                    }}
                  >
                    Today
                  </button>
                </div>
              )}
            </div>

            {/* Planned Project Tenure reference card (Section 7 Planning Form) */}
            {plannedTenure && (plannedTenure.expectedStartDate || plannedTenure.expectedEndDate || plannedTenure.expectedSurveyDays) ? (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '0.65rem 0.85rem',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Calendar size={13} style={{ color: '#09090b' }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#09090b', letterSpacing: '-0.01em' }}>
                      Planned Project Tenure (Planning Form Section 7)
                    </span>
                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 600,
                        backgroundColor: '#e2e8f0',
                        color: '#475569',
                        padding: '1px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      Agreed Slot
                    </span>
                  </div>

                  {plannedTenure.expectedStartDate && (
                    <button
                      type="button"
                      onClick={() => {
                        const sDate = String(plannedTenure.expectedStartDate);
                        setCommonScanningDate(sDate);
                        if (selectedSectorIds.length > 0) {
                          setSectorScanningDates((curr) => {
                            const updated = { ...curr };
                            selectedSectorIds.forEach((id) => {
                              updated[id] = sDate;
                            });
                            return updated;
                          });
                        }
                      }}
                      style={{
                        fontSize: '0.66rem',
                        fontWeight: 600,
                        color: '#09090b',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                      title={`Quick set all selected sectors to Expected Starting Date: ${plannedTenure.expectedStartDate}`}
                    >
                      Use Start Date ({plannedTenure.expectedStartDate})
                    </button>
                  )}
                </div>

                {/* Metrics Pill Grid */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem', fontSize: '0.7rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      backgroundColor: '#ffffff',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <span style={{ color: '#64748b', fontSize: '0.67rem' }}>Expected Starting Date:</span>
                    <strong style={{ color: '#09090b', fontFamily: 'monospace', fontWeight: 700 }}>
                      {plannedTenure.expectedStartDate || '—'}
                    </strong>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      backgroundColor: '#ffffff',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <span style={{ color: '#64748b', fontSize: '0.67rem' }}>Expected Ending Date:</span>
                    <strong style={{ color: '#09090b', fontFamily: 'monospace', fontWeight: 700 }}>
                      {plannedTenure.expectedEndDate || '—'}
                    </strong>
                  </div>

                  {plannedTenure.expectedSurveyDays && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        backgroundColor: '#ffffff',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <span style={{ color: '#64748b', fontSize: '0.67rem' }}>Expected Survey Days:</span>
                      <strong style={{ color: '#09090b', fontWeight: 700 }}>
                        {plannedTenure.expectedSurveyDays} Days
                      </strong>
                    </div>
                  )}

                  {plannedTenure.pilotTravelDate && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        backgroundColor: '#ffffff',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <span style={{ color: '#64748b', fontSize: '0.67rem' }}>Pilot Travel Date:</span>
                      <strong style={{ color: '#09090b', fontFamily: 'monospace', fontWeight: 600 }}>
                        {plannedTenure.pilotTravelDate}
                      </strong>
                    </div>
                  )}

                  {plannedTenure.dataDeliveryTimelineDays && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        backgroundColor: '#ffffff',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <span style={{ color: '#64748b', fontSize: '0.67rem' }}>Data Processing:</span>
                      <strong style={{ color: '#09090b', fontWeight: 600 }}>
                        {plannedTenure.dataDeliveryTimelineDays} Days
                      </strong>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '0.67rem', color: '#475569', lineHeight: 1.35, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Info size={12} style={{ flexShrink: 0, color: '#3b82f6' }} />
                  <span>
                    OPS Note: All scheduled sector scanning dates should be within the planned time slot (<strong>{plannedTenure.expectedStartDate || 'Start'}</strong> to <strong>{plannedTenure.expectedEndDate || 'End'}</strong>).
                  </span>
                </div>
              </div>
            ) : null}

            {selectedSectorIds.length === 0 ? (
              <div
                style={{
                  padding: '0.85rem',
                  backgroundColor: '#ffffff',
                  border: '1px dashed #d4d4d8',
                  borderRadius: '6px',
                  fontSize: '0.725rem',
                  color: '#71717a',
                  textAlign: 'center',
                }}
              >
                Select one or more sectors in <strong>Step 1</strong> above to mention the date of scanning for each sector.
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.7rem', color: '#71717a', margin: '0 0 0.5rem 0' }}>
                  Mention the specific scanning date for each selected sector below. The assigned pilot will see these dates when preparing daily flights.
                </p>
                <div
                  style={{
                    maxHeight: '150px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    paddingRight: '0.2rem',
                  }}
                >
                  {selectedSectorIds.map((secId) => {
                    const sec = normalizedSectors.find((s) => s.id === secId);
                    if (!sec) return null;
                    const secDate = sectorScanningDates[secId] || '';

                    const isBefore = Boolean(plannedTenure?.expectedStartDate && secDate && secDate < plannedTenure.expectedStartDate);
                    const isAfter = Boolean(plannedTenure?.expectedEndDate && secDate && secDate > plannedTenure.expectedEndDate);
                    const isOutsideSlot = isBefore || isAfter;

                    return (
                      <div
                        key={secId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.4rem 0.65rem',
                          borderRadius: '5px',
                          backgroundColor: '#ffffff',
                          border: isOutsideSlot ? '1px solid #fde68a' : '1px solid #e4e4e7',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '110px' }}>
                          <span
                            style={{
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              color: '#09090b',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              backgroundColor: '#f4f4f5',
                              border: '1px solid #e4e4e7',
                            }}
                          >
                            {sec.sector_code}
                          </span>
                          {sec.target_area_sqkm && (
                            <span style={{ fontSize: '0.68rem', color: '#71717a' }}>
                              {Number(sec.target_area_sqkm).toFixed(2)} km²
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {isOutsideSlot && (
                            <span
                              title={`Sector date (${secDate}) is outside the planned flight slot (${plannedTenure?.expectedStartDate} to ${plannedTenure?.expectedEndDate})`}
                              style={{
                                fontSize: '0.62rem',
                                color: '#b45309',
                                backgroundColor: '#fef3c7',
                                border: '1px solid #fde68a',
                                borderRadius: '3px',
                                padding: '1px 5px',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <AlertTriangle size={10} color="#d97706" /> Outside Planned Slot
                            </span>
                          )}

                          <label
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              color: '#52525b',
                            }}
                          >
                            Date of Scanning:
                          </label>
                          <input
                            type="date"
                            value={secDate}
                            onChange={(e) => handleSectorDateChange(secId, e.target.value)}
                            style={{
                              height: '26px',
                              fontSize: '0.74rem',
                              padding: '0 0.45rem',
                              borderRadius: '4px',
                              border: isOutsideSlot ? '1px solid #d97706' : '1px solid #d4d4d8',
                              backgroundColor: '#ffffff',
                              color: '#09090b',
                              fontWeight: 500,
                              outline: 'none',
                            }}
                          />
                          {secDate ? (
                            <button
                              type="button"
                              onClick={() => handleSectorDateChange(secId, '')}
                              style={{
                                fontSize: '0.65rem',
                                color: '#71717a',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0.1rem 0.25rem',
                                textDecoration: 'underline',
                              }}
                            >
                              Clear
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const todayStr = new Date().toISOString().split('T')[0];
                                handleSectorDateChange(secId, todayStr);
                              }}
                              style={{
                                fontSize: '0.65rem',
                                color: '#09090b',
                                background: '#f4f4f5',
                                border: '1px solid #e4e4e7',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                padding: '0.1rem 0.35rem',
                              }}
                            >
                              Today
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Target Pilot Form (Registered vs Invite Tabs) */}
          <div
            style={{
              border: '1px solid #e4e4e7',
              borderRadius: '8px',
              padding: '1rem',
              backgroundColor: '#fafafa',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.85rem',
                borderBottom: '1px solid #e4e4e7',
                paddingBottom: '0.65rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: '#71717a',
                }}
              >
                Step 3: Choose Destination Pilot (Optional)
              </span>

              {/* Tabs */}
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#f4f4f5',
                  padding: '2px',
                  borderRadius: '6px',
                  gap: '2px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('registered')}
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: activeTab === 'registered' ? 700 : 500,
                    padding: '0.25rem 0.65rem',
                    borderRadius: '4px',
                    backgroundColor: activeTab === 'registered' ? '#ffffff' : 'transparent',
                    color: activeTab === 'registered' ? '#09090b' : '#71717a',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: activeTab === 'registered' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <UserCheck size={12} />
                  Registered Pilots ({availablePilots.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('invite')}
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: activeTab === 'invite' ? 700 : 500,
                    padding: '0.25rem 0.65rem',
                    borderRadius: '4px',
                    backgroundColor: activeTab === 'invite' ? '#ffffff' : 'transparent',
                    color: activeTab === 'invite' ? '#09090b' : '#71717a',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: activeTab === 'invite' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <UserPlus size={12} />
                  Invite New Pilot
                </button>
              </div>
            </div>

            {/* Tab 1: Registered Pilots */}
            {activeTab === 'registered' ? (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#09090b',
                    marginBottom: '0.35rem',
                  }}
                >
                  Select Active Pilot (Optional if only setting dates)
                </label>
                {availablePilots.length === 0 ? (
                  <div
                    style={{
                      padding: '0.75rem',
                      backgroundColor: '#ffffff',
                      border: '1px dashed #d4d4d8',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      color: '#71717a',
                    }}
                  >
                    No registered pilots found. Use the <strong>"Invite New Pilot"</strong> tab above to dispatch an invitation to a certified remote pilot.
                  </div>
                ) : (
                  <select
                    value={selectedPilotId}
                    onChange={(e) => setSelectedPilotId(e.target.value)}
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '6px',
                      border: '1px solid #d4d4d8',
                      padding: '0 0.65rem',
                      fontSize: '0.8rem',
                      backgroundColor: '#ffffff',
                      color: '#09090b',
                      fontWeight: 500,
                      outline: 'none',
                    }}
                  >
                    <option value="">-- No Pilot Selected (Keep current assignment / Dates only) --</option>
                    {availablePilots.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.email ? `(${p.email})` : ''}
                      </option>
                    ))}
                  </select>
                )}
                <p style={{ fontSize: '0.7rem', color: '#71717a', margin: '0.45rem 0 0 0' }}>
                  Choose a pilot to assign them to all selected sectors, or leave unselected to only update scanning schedules.
                </p>
              </div>
            ) : (
              /* Tab 2: Invite New Pilot */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.725rem',
                        fontWeight: 600,
                        color: '#09090b',
                        marginBottom: '0.25rem',
                      }}
                    >
                      Pilot Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Vikramaditya Rathore"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      style={{
                        width: '100%',
                        height: '34px',
                        borderRadius: '6px',
                        border: '1px solid #d4d4d8',
                        padding: '0 0.65rem',
                        fontSize: '0.78rem',
                        backgroundColor: '#ffffff',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.725rem',
                        fontWeight: 600,
                        color: '#09090b',
                        marginBottom: '0.25rem',
                      }}
                    >
                      Pilot Email ID *
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Mail size={13} style={{ position: 'absolute', left: '0.65rem', color: '#a1a1aa' }} />
                      <input
                        type="email"
                        placeholder="pilot@flightops.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        style={{
                          width: '100%',
                          height: '34px',
                          borderRadius: '6px',
                          border: '1px solid #d4d4d8',
                          paddingLeft: '2rem',
                          paddingRight: '0.65rem',
                          fontSize: '0.78rem',
                          backgroundColor: '#ffffff',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.725rem',
                      fontWeight: 600,
                      color: '#09090b',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Contact Phone Number (Optional)
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Phone size={13} style={{ position: 'absolute', left: '0.65rem', color: '#a1a1aa' }} />
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={invitePhone}
                      onChange={(e) => setInvitePhone(e.target.value)}
                      style={{
                        width: '100%',
                        height: '34px',
                        borderRadius: '6px',
                        border: '1px solid #d4d4d8',
                        paddingLeft: '2rem',
                        paddingRight: '0.65rem',
                        fontSize: '0.78rem',
                        backgroundColor: '#ffffff',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e4e4e7',
                    borderRadius: '6px',
                    padding: '0.55rem 0.75rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.45rem',
                    fontSize: '0.7rem',
                    color: '#71717a',
                    lineHeight: 1.4,
                  }}
                >
                  <ShieldCheck size={14} color="#09090b" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    An invitation link will be sent to the pilot. Sectors will display in <strong>Pending</strong> state until the pilot authenticates and submits their DGCA license credentials. Our backend will automatically sync and link the verified profile.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid #f4f4f5',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: '#71717a' }}>
            {selectedSectorIds.length > 0 ? (
              <span>
                <strong>{selectedSectorIds.length}</strong> sector{selectedSectorIds.length > 1 ? 's' : ''} selected
                {(() => {
                  const withDates = selectedSectorIds.filter((id) => Boolean(sectorScanningDates[id] || commonScanningDate)).length;
                  return withDates > 0 ? (
                    <span style={{ color: '#09090b', fontWeight: 600 }}>
                      {' '}• {withDates} scheduled with dates
                    </span>
                  ) : null;
                })()}
                {activeTab === 'registered' && selectedPilotId ? (
                  <span style={{ color: '#09090b', fontWeight: 600 }}>
                    {' '}• Pilot: {availablePilots.find((p) => p.id === selectedPilotId)?.name || 'Selected'}
                  </span>
                ) : activeTab === 'invite' && inviteName.trim() ? (
                  <span style={{ color: '#09090b', fontWeight: 600 }}>
                    {' '}• Inviting: {inviteName.trim()}
                  </span>
                ) : null}
              </span>
            ) : (
              <span>Select sectors above in Step 1 to schedule dates and allocate pilots</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleCancelClick}
              disabled={isSubmitting}
              style={{
                height: '34px',
                padding: '0 1rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                border: '1px solid #d4d4d8',
                color: '#09090b',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSubmitting || selectedSectorIds.length === 0}
              style={{
                height: '34px',
                padding: '0 1.25rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '6px',
                backgroundColor: selectedSectorIds.length === 0 ? '#71717a' : '#09090b',
                border: '1px solid #09090b',
                color: '#ffffff',
                cursor: selectedSectorIds.length === 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                transition: 'all 0.15s ease',
              }}
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Cancel Confirmation Prompt Overlay */}
        {showCancelConfirm && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(2px)',
              zIndex: 1100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.25rem',
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e4e4e7',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.05)',
                maxWidth: '430px',
                width: '100%',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle size={18} color="#dc2626" />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#09090b', margin: '0 0 0.3rem 0' }}>
                    Discard Unsaved Changes?
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: '#71717a', margin: 0, lineHeight: 1.45 }}>
                    You have unsaved changes in sector scheduling or pilot assignments. Are you sure you want to cancel? Any sector dates and pilot selections will not be saved.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  style={{
                    height: '34px',
                    padding: '0 0.95rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '5px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #d4d4d8',
                    color: '#09090b',
                    cursor: 'pointer',
                  }}
                >
                  Keep Editing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCancelConfirm(false);
                    onClose();
                  }}
                  style={{
                    height: '34px',
                    padding: '0 1rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '5px',
                    backgroundColor: '#dc2626',
                    border: '1px solid #dc2626',
                    color: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  Yes, Discard & Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
