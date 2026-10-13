'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar as CalendarIcon, MapPin, ArrowRight, Sparkles } from 'lucide-react';
import { AssignedSectorMission, TimeframeFilter } from '../types';
import { formatDateDDMMYYYY } from '@/lib/date';

interface ScheduleListViewProps {
  filteredMissions: AssignedSectorMission[];
  timeframe: TimeframeFilter;
  todayStr: string;
  getStatusBadge: (status: string) => React.ReactNode;
  handleOpenStatusModal: (sectorId: string | null) => void;
}

export const ScheduleListView: React.FC<ScheduleListViewProps> = ({
  filteredMissions,
  timeframe,
  todayStr,
  getStatusBadge,
  handleOpenStatusModal,
}) => {
  if (filteredMissions.length === 0) {
    return (
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e4e4e7',
          borderRadius: '8px',
          padding: '3rem 1.5rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <CalendarIcon size={36} color="#d4d4d8" />
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#09090b' }}>
          No missions found
        </div>
        <p style={{ margin: 0, fontSize: '0.775rem', color: '#71717a', maxWidth: '380px' }}>
          There are no flight missions matching the current timeframe filter ({timeframe.replace('_', ' ')}) or search query.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {filteredMissions.map((m) => {
        const isTodayMission = m.scanning_date === todayStr;

        return (
          <div
            key={m.id}
            style={{
              backgroundColor: '#ffffff',
              border: isTodayMission ? '1px solid #09090b' : '1px solid #e4e4e7',
              borderRadius: '8px',
              padding: '1rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'border-color 0.15s ease',
            }}
          >
            {/* Top Bar: Sector Code, Project Title & Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                  }}
                >
                  {m.sector_code}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>
                    {m.project_title}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
                    {m.project_code} {m.client_name ? `• ${m.client_name}` : ''}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                {getStatusBadge(m.status)}
              </div>
            </div>

            {/* Middle Meta: Flight Date, Location, Target Area */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.65rem',
                backgroundColor: '#fafafa',
                padding: '0.65rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid #f4f4f5',
              }}
            >
              <div>
                <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'block' }}>Scheduled Flight Date:</span>
                <strong style={{ fontSize: '0.8rem', color: '#09090b', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CalendarIcon size={12} color="#09090b" />
                  {m.scanning_date ? formatDateDDMMYYYY(m.scanning_date) : 'Date Pending'}
                  {isTodayMission && (
                    <span style={{ fontSize: '0.65rem', backgroundColor: '#09090b', color: '#ffffff', padding: '1px 5px', borderRadius: '3px' }}>
                      Today
                    </span>
                  )}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'block' }}>Location / Site:</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#09090b', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <MapPin size={12} color="#71717a" />
                  {m.survey_location || 'Field Site'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'block' }}>Target Area:</span>
                <strong style={{ fontSize: '0.8rem', color: '#09090b' }}>
                  {m.target_area_sqkm ? `${m.target_area_sqkm} sq km` : '1.0 sq km'}
                </strong>
              </div>

              {m.assigned_pilot && (
                <div>
                  <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'block' }}>Assigned Pilot:</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#09090b' }}>
                    {m.assigned_pilot}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Action Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', paddingTop: '0.2rem' }}>
              <Link
                href={`/projects/${m.project_id}/overview`}
                style={{
                  height: '30px',
                  padding: '0 0.75rem',
                  fontSize: '0.725rem',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  color: '#09090b',
                  border: '1px solid #d4d4d8',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <span>View Project</span>
                <ArrowRight size={12} />
              </Link>

              <button
                type="button"
                onClick={() => handleOpenStatusModal(m.id)}
                style={{
                  height: '30px',
                  padding: '0 0.85rem',
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                  border: '1px solid #09090b',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Sparkles size={12} />
                <span>Log Daily Status</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
