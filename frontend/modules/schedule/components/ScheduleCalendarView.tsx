'use client';

import React from 'react';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plane,
  MapPin,
} from 'lucide-react';
import { CalendarDayCell, AssignedSectorMission } from '../types';
import { formatDateDDMMYYYY } from '@/lib/date';

interface ScheduleCalendarViewProps {
  monthNames: string[];
  calendarMonth: number;
  calendarYear: number;
  handleJumpToToday: () => void;
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  weekDayLabels: string[];
  calendarDays: CalendarDayCell[];
  selectedCalendarDateStr: string | null;
  setSelectedCalendarDateStr: (dateStr: string | null) => void;
  selectedDayMissions: AssignedSectorMission[];
  getStatusBadge: (status: string) => React.ReactNode;
  handleOpenStatusModal: (sectorId: string | null) => void;
}

export const ScheduleCalendarView: React.FC<ScheduleCalendarViewProps> = ({
  monthNames,
  calendarMonth,
  calendarYear,
  handleJumpToToday,
  handlePrevMonth,
  handleNextMonth,
  weekDayLabels,
  calendarDays,
  selectedCalendarDateStr,
  setSelectedCalendarDateStr,
  selectedDayMissions,
  getStatusBadge,
  handleOpenStatusModal,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e4e4e7',
          borderRadius: '8px',
          padding: '1.25rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        {/* Calendar Month Navigation Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <CalendarIcon size={18} color="#09090b" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#09090b' }}>
              {monthNames[calendarMonth]} {calendarYear}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <button
              type="button"
              onClick={handleJumpToToday}
              style={{
                height: '30px',
                padding: '0 0.75rem',
                fontSize: '0.725rem',
                fontWeight: 600,
                borderRadius: '5px',
                backgroundColor: '#f4f4f5',
                border: '1px solid #d4d4d8',
                color: '#09090b',
                cursor: 'pointer',
              }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous Month"
              style={{
                height: '30px',
                width: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '5px',
                backgroundColor: '#ffffff',
                border: '1px solid #d4d4d8',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Next Month"
              style={{
                height: '30px',
                width: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '5px',
                backgroundColor: '#ffffff',
                border: '1px solid #d4d4d8',
                cursor: 'pointer',
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', marginBottom: '6px' }}>
          {weekDayLabels.map((wd) => (
            <div key={wd} style={{ fontSize: '0.72rem', fontWeight: 700, color: '#71717a', padding: '0.35rem 0' }}>
              {wd}
            </div>
          ))}
        </div>

        {/* Calendar Month Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
          {calendarDays.map((cell) => {
            const isSelected = selectedCalendarDateStr === cell.dateStr;
            const hasMissions = cell.missions.length > 0;

            return (
              <div
                key={cell.dateStr}
                onClick={() => setSelectedCalendarDateStr(cell.dateStr)}
                style={{
                  minHeight: '88px',
                  padding: '0.45rem',
                  borderRadius: '6px',
                  border: isSelected
                    ? '2px solid #09090b'
                    : cell.isToday
                    ? '1px solid #09090b'
                    : '1px solid #f4f4f5',
                  backgroundColor: isSelected
                    ? '#fafafa'
                    : cell.isCurrentMonth
                    ? '#ffffff'
                    : '#fafafa',
                  opacity: cell.isCurrentMonth ? 1 : 0.5,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  transition: 'all 0.1s ease',
                }}
              >
                {/* Top Row: Date Number and Badges */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: cell.isToday || isSelected ? 800 : 600,
                      color: cell.isToday ? '#09090b' : '#3f3f46',
                    }}
                  >
                    {cell.dayNumber}
                  </span>
                  {cell.isToday && (
                    <span
                      style={{
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        backgroundColor: '#09090b',
                        color: '#ffffff',
                        padding: '0 0.35rem',
                        borderRadius: '3px',
                      }}
                    >
                      Today
                    </span>
                  )}
                </div>

                {/* Mission Pills */}
                {hasMissions ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px' }}>
                    {cell.missions.slice(0, 2).map((m) => {
                      const isDone = ['surveyed', 'verified', 'completed'].includes((m.status || '').toLowerCase());
                      return (
                        <div
                          key={m.id}
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '2px 5px',
                            borderRadius: '3px',
                            backgroundColor: isDone ? '#f4f4f5' : '#09090b',
                            color: isDone ? '#52525b' : '#ffffff',
                            border: isDone ? '1px solid #d4d4d8' : 'none',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={`${m.sector_code} — ${m.project_title}`}
                        >
                          ✈️ {m.sector_code}
                        </div>
                      );
                    })}
                    {cell.missions.length > 2 && (
                      <span style={{ fontSize: '0.6rem', color: '#71717a', fontWeight: 600 }}>
                        +{cell.missions.length - 2} more
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Mission Drawer / Inspector */}
      {selectedCalendarDateStr && (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '8px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarDays size={16} color="#09090b" />
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#09090b' }}>
                Scheduled Missions for {formatDateDDMMYYYY(selectedCalendarDateStr)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCalendarDateStr(null)}
              style={{
                fontSize: '0.725rem',
                color: '#71717a',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Close inspector
            </button>
          </div>

          {selectedDayMissions.length === 0 ? (
            <div style={{ padding: '1rem', border: '1px dashed #d4d4d8', borderRadius: '6px', textAlign: 'center', color: '#71717a', fontSize: '0.775rem' }}>
              No flight missions scheduled for this day ({formatDateDDMMYYYY(selectedCalendarDateStr)}).
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem' }}>
              {selectedDayMissions.map((m) => (
                <div
                  key={m.id}
                  style={{
                    padding: '0.85rem 1rem',
                    border: '1px solid #e4e4e7',
                    borderRadius: '6px',
                    backgroundColor: '#fafafa',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Plane size={15} color="#09090b" />
                      <strong style={{ fontSize: '0.85rem', color: '#09090b' }}>{m.sector_code}</strong>
                    </div>
                    {getStatusBadge(m.status)}
                  </div>

                  <div style={{ fontSize: '0.775rem', fontWeight: 600, color: '#09090b' }}>
                    {m.project_title}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.725rem', color: '#71717a' }}>
                    <MapPin size={12} />
                    <span>{m.survey_location}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e4e4e7', paddingTop: '0.45rem', marginTop: '0.2rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
                      Area: <strong>{m.target_area_sqkm || 0} sq km</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenStatusModal(m.id)}
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        padding: '0.25rem 0.65rem',
                        borderRadius: '4px',
                        backgroundColor: '#09090b',
                        color: '#ffffff',
                        border: '1px solid #09090b',
                        cursor: 'pointer',
                      }}
                    >
                      Log Daily Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
