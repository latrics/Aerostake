'use client';

import React from 'react';
import { CalendarDays, List, Search } from 'lucide-react';
import { TimeframeFilter, StatusFilter, ViewMode } from '../types';

interface ScheduleFilterBarProps {
  viewMode: ViewMode;
  setViewMode: (vm: ViewMode) => void;
  timeframe: TimeframeFilter;
  setTimeframe: (tf: TimeframeFilter) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (sf: StatusFilter) => void;
  isOpsOrAdmin: boolean;
  availablePilotNames: string[];
  selectedPilotFilter: string;
  setSelectedPilotFilter: (p: string) => void;
}

export const ScheduleFilterBar: React.FC<ScheduleFilterBarProps> = ({
  viewMode,
  setViewMode,
  timeframe,
  setTimeframe,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  isOpsOrAdmin,
  availablePilotNames,
  selectedPilotFilter,
  setSelectedPilotFilter,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        backgroundColor: '#ffffff',
        padding: '0.85rem 1rem',
        borderRadius: '8px',
        border: '1px solid #e4e4e7',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
      }}
    >
      {/* Row A: View Mode Selector & Quick Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        {/* View Mode Buttons */}
        <div style={{ display: 'inline-flex', backgroundColor: '#f4f4f5', padding: '3px', borderRadius: '6px', border: '1px solid #e4e4e7' }}>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: viewMode === 'calendar' ? 700 : 500,
              borderRadius: '4px',
              border: 'none',
              backgroundColor: viewMode === 'calendar' ? '#09090b' : 'transparent',
              color: viewMode === 'calendar' ? '#ffffff' : '#71717a',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <CalendarDays size={13} />
            <span>Calendar View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: viewMode === 'list' ? 700 : 500,
              borderRadius: '4px',
              border: 'none',
              backgroundColor: viewMode === 'list' ? '#09090b' : 'transparent',
              color: viewMode === 'list' ? '#ffffff' : '#71717a',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <List size={13} />
            <span>List View</span>
          </button>
        </div>

        {/* Timeframe Quick Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', color: '#71717a', fontWeight: 600, marginRight: '0.2rem' }}>
            Filter By:
          </span>
          {[
            { id: 'this_month', label: 'This Month' },
            { id: 'this_week', label: 'This Week' },
            { id: 'today', label: 'Today' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'all', label: 'All Tasks' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTimeframe(tab.id as TimeframeFilter)}
              style={{
                fontSize: '0.75rem',
                fontWeight: timeframe === tab.id ? 700 : 500,
                padding: '0.35rem 0.65rem',
                borderRadius: '5px',
                backgroundColor: timeframe === tab.id ? '#09090b' : '#f4f4f5',
                color: timeframe === tab.id ? '#ffffff' : '#52525b',
                border: timeframe === tab.id ? '1px solid #09090b' : '1px solid #e4e4e7',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row B: Search Input & Secondary Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid #f4f4f5', paddingTop: '0.65rem' }}>
        {/* Search Box */}
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
          <input
            type="text"
            placeholder="Search by sector, project or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: '32px',
              paddingLeft: '2rem',
              paddingRight: '0.65rem',
              fontSize: '0.75rem',
              borderRadius: '6px',
              border: '1px solid #d4d4d8',
              backgroundColor: '#ffffff',
              color: '#09090b',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', color: '#71717a', fontWeight: 600 }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              style={{
                height: '32px',
                fontSize: '0.75rem',
                borderRadius: '6px',
                border: '1px solid #d4d4d8',
                padding: '0 0.5rem',
                backgroundColor: '#ffffff',
                color: '#09090b',
                outline: 'none',
              }}
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled / Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed / Surveyed</option>
            </select>
          </div>

          {/* Ops Filter Crew (Ops/Admin only) */}
          {isOpsOrAdmin && availablePilotNames.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.72rem', color: '#71717a', fontWeight: 600 }}>Pilot:</span>
              <select
                value={selectedPilotFilter}
                onChange={(e) => setSelectedPilotFilter(e.target.value)}
                style={{
                  height: '32px',
                  fontSize: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #d4d4d8',
                  padding: '0 0.5rem',
                  backgroundColor: '#ffffff',
                  color: '#09090b',
                  outline: 'none',
                }}
              >
                <option value="all">All Pilots</option>
                {availablePilotNames.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
