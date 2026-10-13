'use client';

import React from 'react';
import {
  Lock,
  Mail,
  Check,
  Trash2,
  Info,
} from 'lucide-react';
import { TeamMemberContact } from '../types';
import { InvitationOut } from '@/modules/invitations/types';

interface CompanyProfileTeamSectionProps {
  isSubClient: boolean;
  teamMembers: TeamMemberContact[];
  invitations: InvitationOut[];
  onUpdateMember: (index: number, field: keyof TeamMemberContact, value: string) => void;
  onClearMember: (index: number) => void;
  onSelectMemberForInvite: (data: {
    member: TeamMemberContact;
    invite: InvitationOut | null;
    index: number;
  }) => void;
}

export function CompanyProfileTeamSection({
  isSubClient,
  teamMembers,
  invitations,
  onUpdateMember,
  onClearMember,
  onSelectMemberForInvite,
}: CompanyProfileTeamSectionProps) {
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 className="wf-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b' }}>
            4. Team Members (Subordinate Contacts) <span style={{ fontWeight: 500, color: '#71717a', fontSize: '0.85rem' }}>(Optional)</span>
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            Add subordinate team members who will have access to joint projects. Each contact receives invitation-based authentication.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isSubClient && (
            <span style={{ fontSize: '0.72rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={12} /> Managed by Primary Client
            </span>
          )}
          <span style={{ fontSize: '0.725rem', color: '#71717a', backgroundColor: '#f4f4f5', padding: '3px 8px', borderRadius: '4px', border: '1px solid #e4e4e7' }}>
            Invitation Validity: 24 Hours
          </span>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="wf-table" style={{ margin: 0, minWidth: '960px' }}>
          <thead>
            <tr>
              <th style={{ width: '3%' }}>#</th>
              <th style={{ width: '18%' }}>Full Name (Optional)</th>
              <th style={{ width: '21%' }}>Email Address (Optional)</th>
              <th style={{ width: '18%' }}>Phone Number (Optional)</th>
              <th style={{ width: '14%' }}>Department</th>
              <th style={{ width: '23%' }}>Invitation & Email Layout</th>
              <th style={{ width: '3%', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((member, idx) => {
              const cleanEmail = member.email?.trim().toLowerCase();
              const matchedInvite = cleanEmail
                ? invitations.find((i) => i.email.toLowerCase() === cleanEmail) || null
                : null;
              const isInvitePending = matchedInvite?.status === 'pending';
              const isInviteAccepted = matchedInvite?.status === 'accepted';
              const isInviteExpired = matchedInvite?.status === 'expired';

              return (
                <tr key={idx}>
                  <td style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{idx + 1}</td>
                  <td>
                    <input
                      type="text"
                      disabled={isSubClient}
                      readOnly={isSubClient}
                      placeholder="Enter full name"
                      value={member.full_name}
                      onChange={(e) => onUpdateMember(idx, 'full_name', e.target.value)}
                      className="form-input"
                      style={{
                        fontSize: '0.775rem',
                        height: '34px',
                        border: '1px solid #d4d4d8',
                        borderRadius: '4px',
                        backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                        cursor: isSubClient ? 'not-allowed' : undefined,
                        color: '#09090b',
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="email"
                      disabled={isSubClient}
                      readOnly={isSubClient}
                      placeholder="Enter email address"
                      value={member.email}
                      onChange={(e) => onUpdateMember(idx, 'email', e.target.value)}
                      className="form-input"
                      style={{
                        fontSize: '0.775rem',
                        height: '34px',
                        border: '1px solid #d4d4d8',
                        borderRadius: '4px',
                        backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                        cursor: isSubClient ? 'not-allowed' : undefined,
                        color: '#09090b',
                      }}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <select
                        disabled={isSubClient}
                        className="form-select"
                        style={{
                          width: '60px',
                          fontSize: '0.725rem',
                          height: '34px',
                          padding: '0 0.2rem',
                          border: '1px solid #d4d4d8',
                          borderRadius: '4px',
                          backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                          cursor: isSubClient ? 'not-allowed' : undefined,
                          color: '#09090b',
                        }}
                        defaultValue="+91"
                      >
                        <option value="+91">+91</option>
                        <option value="+1">+1</option>
                        <option value="+44">+44</option>
                        <option value="+971">+971</option>
                      </select>
                      <input
                        type="text"
                        disabled={isSubClient}
                        readOnly={isSubClient}
                        placeholder="Enter phone number"
                        value={member.phone_number || ''}
                        onChange={(e) => onUpdateMember(idx, 'phone_number', e.target.value)}
                        className="form-input"
                        style={{
                          flex: 1,
                          fontSize: '0.775rem',
                          height: '34px',
                          border: '1px solid #d4d4d8',
                          borderRadius: '4px',
                          backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                          cursor: isSubClient ? 'not-allowed' : undefined,
                          color: '#09090b',
                        }}
                      />
                    </div>
                  </td>
                  <td>
                    <input
                      type="text"
                      disabled={isSubClient}
                      readOnly={isSubClient}
                      placeholder="Enter department"
                      value={member.department || ''}
                      onChange={(e) => onUpdateMember(idx, 'department', e.target.value)}
                      className="form-input"
                      style={{
                        fontSize: '0.775rem',
                        height: '34px',
                        border: '1px solid #d4d4d8',
                        borderRadius: '4px',
                        backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                        cursor: isSubClient ? 'not-allowed' : undefined,
                        color: '#09090b',
                      }}
                    />
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    {!cleanEmail ? (
                      <span style={{ fontSize: '0.72rem', color: '#a1a1aa', fontStyle: 'italic' }}>
                        Enter email first
                      </span>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        {isInviteAccepted ? (
                          <span
                            style={{
                              fontSize: '0.675rem',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '4px',
                              backgroundColor: '#09090b',
                              color: '#ffffff',
                              border: '1px solid #09090b',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <Check size={10} /> Registered
                          </span>
                        ) : isInvitePending ? (
                          <span
                            style={{
                              fontSize: '0.675rem',
                              fontWeight: 600,
                              padding: '2px 7px',
                              borderRadius: '4px',
                              backgroundColor: '#f4f4f5',
                              color: '#09090b',
                              border: '1px solid #d4d4d8',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            Active (24h)
                          </span>
                        ) : isInviteExpired ? (
                          <span
                            style={{
                              fontSize: '0.675rem',
                              fontWeight: 600,
                              padding: '2px 7px',
                              borderRadius: '4px',
                              backgroundColor: '#ffffff',
                              color: '#71717a',
                              border: '1px dashed #71717a',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            Expired
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.675rem',
                              color: '#71717a',
                              fontStyle: 'italic',
                            }}
                          >
                            Not Generated
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => onSelectMemberForInvite({ member, invite: matchedInvite, index: idx })}
                          style={{
                            height: '28px',
                            padding: '0 0.75rem',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            backgroundColor: '#ffffff',
                            color: '#09090b',
                            border: '1px solid #09090b',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                        >
                          <Mail size={12} />
                          <span>Invitation</span>
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {isSubClient ? (
                      <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>—</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onClearMember(idx)}
                        title="Clear / Remove Row"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#71717a',
                          padding: '0.3rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Info size={14} style={{ flexShrink: 0 }} />
          <span>Click &quot;Invitation&quot; to copy the invite link, preview &amp; send formatted email (with Outlook-coloured button), or regenerate the link.</span>
        </div>
        <span style={{ color: '#71717a' }}>Up to 4 team members permitted</span>
      </div>
    </div>
  );
}
