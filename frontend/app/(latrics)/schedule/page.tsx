'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { sectorApi } from '@/modules/sectors/api';
import { projectApi } from '@/modules/projects/api';
import { Sector } from '@/modules/sectors/types';
import { PageHeader } from '@/components/PageHeader';
import { PilotDailyStatusModal } from '@/modules/sectors/components/PilotDailyStatusModal';
import {
  AssignedSectorMission,
  TimeframeFilter,
  StatusFilter,
  ViewMode,
  CalendarDayCell,
} from '@/modules/schedule/types';
import { ScheduleFilterBar } from '@/modules/schedule/components/ScheduleFilterBar';
import { ScheduleCalendarView } from '@/modules/schedule/components/ScheduleCalendarView';
import { ScheduleListView } from '@/modules/schedule/components/ScheduleListView';

export default function PilotSchedulePage() {
  const { user } = useAuth();
  const isPilot = user?.role?.toLowerCase() === 'pilot';
  const isOpsOrAdmin = ['operations', 'admin', 'super_admin'].includes(user?.role?.toLowerCase() || '');

  const [missions, setMissions] = useState<AssignedSectorMission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('this_month');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPilotFilter, setSelectedPilotFilter] = useState<string>('all');

  // Calendar View month navigation
  const today = useMemo(() => new Date(), []);
  const [calendarYear, setCalendarYear] = useState<number>(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [selectedCalendarDateStr, setSelectedCalendarDateStr] = useState<string | null>(null);

  // Daily log modal state
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [targetSectorIdForLog, setTargetSectorIdForLog] = useState<string | null>(null);

  // Today's local date string (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [today]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Primary: fetch from backend endpoint /sectors/pilot/assigned
      let data: any[] = await sectorApi.listAssignedSectors().catch(() => []);

      // 2. Fallback: if empty or endpoint not accessible yet, query across projects
      if (!data || data.length === 0) {
        const projects = await projectApi.listProjects().catch(() => []);
        const aggregated: any[] = [];
        for (const p of projects) {
          try {
            const secs = await sectorApi.listProjectSectors(p.id);
            for (const s of secs) {
              const coords = (s.polygon_coordinates as any) || {};
              const pl = s.planning || coords.planning || {};
              const sDate = (pl.scanning_date || pl.planned_start_date || '').trim() || null;
              const pName = (pl.assigned_pilot || '').trim() || null;
              const pId = pl.assigned_pilot_id ? String(pl.assigned_pilot_id) : null;
              const pEmail = (pl.pilot_email || '').trim() || null;

              aggregated.push({
                ...s,
                project_id: p.id,
                project_title: p.title || 'Survey Mission',
                project_code: (p as any).project_code || `PROJ-${p.id.slice(0, 6).toUpperCase()}`,
                survey_location: p.survey_location || 'Field Site',
                client_name: (p as any).client_name,
                planning: pl,
                scanning_date: sDate,
                assigned_pilot: pName,
                assigned_pilot_id: pId,
                pilot_email: pEmail,
              });
            }
          } catch {
            // Ignore failure on single project
          }
        }

        // If logged-in user is a Pilot, strictly filter to their allocated sectors
        if (isPilot && user) {
          const uId = String(user.id || '');
          const uEmail = (user.email || '').toLowerCase().trim();
          const uName = (user.full_name || '').toLowerCase().trim();

          data = aggregated.filter((sec) => {
            const pl = sec.planning || {};
            const secPid = String(pl.assigned_pilot_id || '');
            const secEmail = (pl.pilot_email || '').toLowerCase().trim();
            const secName = (pl.assigned_pilot || '').toLowerCase().trim();
            const list = pl.assigned_pilots || [];

            if (
              (secPid && secPid === uId) ||
              (secEmail && secEmail === uEmail) ||
              (secName && secName === uName)
            ) {
              return true;
            }

            if (Array.isArray(list)) {
              return list.some(
                (ap: any) =>
                  String(ap.id || '') === uId ||
                  (ap.email || '').toLowerCase().trim() === uEmail ||
                  (ap.name || '').toLowerCase().trim() === uName
              );
            }
            return false;
          });
        } else {
          // Ops/Admin fallback: include sectors with pilot or scanning date
          data = aggregated.filter((sec) => Boolean(sec.assigned_pilot || sec.scanning_date));
        }
      }

      setMissions(data || []);
    } catch (err) {
      console.error('Failed to load pilot missions schedule:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isPilot, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // List of available pilots for Ops filter dropdown
  const availablePilotNames = useMemo(() => {
    const set = new Set<string>();
    missions.forEach((m) => {
      if (m.assigned_pilot) set.add(m.assigned_pilot);
    });
    return Array.from(set).sort();
  }, [missions]);

  // Primary filtering logic: timeframe + status + search + pilot filter
  const filteredMissions = useMemo(() => {
    return missions.filter((m) => {
      // 1. Ops Pilot filter
      if (isOpsOrAdmin && selectedPilotFilter !== 'all') {
        if ((m.assigned_pilot || '').toLowerCase() !== selectedPilotFilter.toLowerCase()) {
          return false;
        }
      }

      // 2. Status filter
      if (statusFilter !== 'all') {
        const rawStatus = (m.status || '').toLowerCase();
        if (statusFilter === 'scheduled' && !['scheduled', 'assigned', 'pending'].includes(rawStatus)) {
          return false;
        }
        if (statusFilter === 'in_progress' && !['in_progress', 'capturing', 'in_flight'].includes(rawStatus)) {
          return false;
        }
        if (statusFilter === 'completed' && !['surveyed', 'verified', 'completed', 'delivered'].includes(rawStatus)) {
          return false;
        }
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = (m.sector_code || '').toLowerCase().includes(q);
        const matchesProject = (m.project_title || '').toLowerCase().includes(q);
        const matchesLoc = (m.survey_location || '').toLowerCase().includes(q);
        const matchesPilot = (m.assigned_pilot || '').toLowerCase().includes(q);
        if (!matchesCode && !matchesProject && !matchesLoc && !matchesPilot) {
          return false;
        }
      }

      // 4. Timeframe filter
      if (timeframe === 'all') return true;

      const mDateStr = m.scanning_date;
      if (!mDateStr) {
        // If mission has no date scheduled, keep in upcoming or all
        return timeframe === 'upcoming';
      }

      const mDate = new Date(mDateStr);
      if (isNaN(mDate.getTime())) return true;

      if (timeframe === 'today') {
        return mDateStr === todayStr;
      }

      if (timeframe === 'this_week') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        return mDate >= startOfWeek && mDate <= endOfWeek;
      }

      if (timeframe === 'this_month') {
        return mDate.getFullYear() === today.getFullYear() && mDate.getMonth() === today.getMonth();
      }

      if (timeframe === 'upcoming') {
        const startOfToday = new Date(today);
        startOfToday.setHours(0, 0, 0, 0);
        return mDate >= startOfToday;
      }

      return true;
    });
  }, [missions, isOpsOrAdmin, selectedPilotFilter, statusFilter, searchQuery, timeframe, today, todayStr]);

  // Calendar month days calculation
  const calendarDays = useMemo<CalendarDayCell[]>(() => {
    const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
    const lastDayOfMonth = new Date(calendarYear, calendarMonth + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const days: CalendarDayCell[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(calendarYear, calendarMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevMonth = calendarMonth === 0 ? 11 : calendarMonth - 1;
      const prevYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        missions: filteredMissions.filter((m) => m.scanning_date === dateStr),
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        missions: filteredMissions.filter((m) => m.scanning_date === dateStr),
      });
    }

    // Next month padding to fill a complete 35 or 42 grid
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remainingSlots = totalSlots - days.length;
    for (let n = 1; n <= remainingSlots; n++) {
      const nextMonth = calendarMonth === 11 ? 0 : calendarMonth + 1;
      const nextYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;

      days.push({
        dateStr,
        dayNumber: n,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        missions: filteredMissions.filter((m) => m.scanning_date === dateStr),
      });
    }

    return days;
  }, [calendarYear, calendarMonth, todayStr, filteredMissions]);

  // Calendar month controls
  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setCalendarYear(today.getFullYear());
    setCalendarMonth(today.getMonth());
    setSelectedCalendarDateStr(todayStr);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Missions scheduled on the user's clicked calendar day
  const selectedDayMissions = useMemo(() => {
    if (!selectedCalendarDateStr) return [];
    return filteredMissions.filter((m) => m.scanning_date === selectedCalendarDateStr);
  }, [filteredMissions, selectedCalendarDateStr]);

  const handleOpenStatusModal = (sectorId: string | null) => {
    setTargetSectorIdForLog(sectorId);
    setIsLogModalOpen(true);
  };

  // Convert missions to Sector objects for PilotDailyStatusModal
  const sectorsForModal = useMemo<Sector[]>(() => {
    return missions.map((m) => ({
      id: m.id,
      project_id: m.project_id,
      plan_id: (m as any).plan_id || m.project_id,
      sector_code: m.sector_code,
      status: m.status as any,
      target_area_sqkm: m.target_area_sqkm ?? undefined,
      estimated_flight_minutes: m.estimated_flight_minutes ?? undefined,
      polygon_coordinates: m.polygon_coordinates,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }, [missions]);

  const getStatusBadge = (status: string) => {
    const raw = (status || '').toLowerCase();
    let bg = '#f4f4f5';
    let text = '#52525b';
    let border = '#e4e4e7';
    let label = status || 'Pending';

    if (['surveyed', 'verified', 'completed', 'delivered'].includes(raw)) {
      bg = '#ecfdf5';
      text = '#15803d';
      border = '#bbf7d0';
      label = 'Completed';
    } else if (['in_progress', 'capturing', 'in_flight'].includes(raw)) {
      bg = '#eff6ff';
      text = '#1d4ed8';
      border = '#bfdbfe';
      label = 'In Progress';
    } else if (['assigned', 'scheduled'].includes(raw)) {
      bg = '#fefce8';
      text = '#a16207';
      border = '#fef08a';
      label = 'Scheduled';
    }

    return (
      <span
        style={{
          fontSize: '0.675rem',
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: '4px',
          backgroundColor: bg,
          color: text,
          border: `1px solid ${border}`,
          textTransform: 'capitalize',
        }}
      >
        {label}
      </span>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        paddingBottom: '3.5rem',
      }}
    >
      {/* ── 1. Page Header ── */}
      <PageHeader
        title={isPilot ? 'My Flight Schedule' : 'Pilot Flight Schedule'}
        subtitle="Calendarized flight slots, assigned sector missions, and daily field status reporting."
        onRefresh={loadData}
        isRefreshing={isLoading}
        refreshTooltip="Refresh schedule"
      >
        <button
          type="button"
          onClick={() => handleOpenStatusModal(null)}
          className="btn btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            height: '36px',
            padding: '0 1rem',
            backgroundColor: '#09090b',
            color: '#ffffff',
            borderRadius: '6px',
            border: '1px solid #09090b',
            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            cursor: 'pointer',
          }}
        >
          <Sparkles size={14} />
          <span>Log Daily Flight Status</span>
        </button>
      </PageHeader>

      {/* ── 2. Unified Controls Bar: View Switcher, Timeframe Filters & Search ── */}
      <ScheduleFilterBar
        viewMode={viewMode}
        setViewMode={setViewMode}
        timeframe={timeframe}
        setTimeframe={setTimeframe}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        isOpsOrAdmin={isOpsOrAdmin}
        availablePilotNames={availablePilotNames}
        selectedPilotFilter={selectedPilotFilter}
        setSelectedPilotFilter={setSelectedPilotFilter}
      />

      {/* ── 3. Main Schedule Display ── */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e4e4e7', gap: '0.75rem' }}>
          <Loader2 size={30} className="spinner" color="#09090b" />
          <span style={{ fontSize: '0.8rem', color: '#71717a' }}>Loading flight missions...</span>
        </div>
      ) : viewMode === 'calendar' ? (
        <ScheduleCalendarView
          monthNames={monthNames}
          calendarMonth={calendarMonth}
          calendarYear={calendarYear}
          handleJumpToToday={handleJumpToToday}
          handlePrevMonth={handlePrevMonth}
          handleNextMonth={handleNextMonth}
          weekDayLabels={weekDayLabels}
          calendarDays={calendarDays}
          selectedCalendarDateStr={selectedCalendarDateStr}
          setSelectedCalendarDateStr={setSelectedCalendarDateStr}
          selectedDayMissions={selectedDayMissions}
          getStatusBadge={getStatusBadge}
          handleOpenStatusModal={handleOpenStatusModal}
        />
      ) : (
        <ScheduleListView
          filteredMissions={filteredMissions}
          timeframe={timeframe}
          todayStr={todayStr}
          getStatusBadge={getStatusBadge}
          handleOpenStatusModal={handleOpenStatusModal}
        />
      )}

      {/* ── 4. Daily Log Status Modal ── */}
      <PilotDailyStatusModal
        isOpen={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false);
          setTargetSectorIdForLog(null);
        }}
        sectors={sectorsForModal}
        selectedSectorId={targetSectorIdForLog}
        onSaved={loadData}
      />
    </div>
  );
}
