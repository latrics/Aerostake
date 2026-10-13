import { Sector } from './types';

export type SectorVisualState = 'pending' | 'in_progress' | 'completed' | 'delayed' | 'delayed_completed';

export interface SectorStyleConfig {
  state: SectorVisualState;
  label: string;
  shortLabel: string;
  fillColor: string;
  strokeColor: string;
  fillOpacity: number;
  weight: number;
  dashArray?: string;
  badgeBg: string;
  badgeBorder: string;
  badgeColor: string;
  dotColor: string;
  selectedFillColor: string;
}

export const SECTOR_STYLES: Record<SectorVisualState, SectorStyleConfig> = {
  // 1. Pending stage: Grey
  pending: {
    state: 'pending',
    label: 'Pending',
    shortLabel: 'Pending',
    fillColor: '#64748b',
    strokeColor: '#94a3b8',
    fillOpacity: 0.42,
    weight: 1.5,
    dashArray: '4, 4',
    badgeBg: '#1e293b',
    badgeBorder: '#475569',
    badgeColor: '#cbd5e1',
    dotColor: '#94a3b8',
    selectedFillColor: '#94a3b8',
  },

  // 2. Under progress & scanning: Yellow
  in_progress: {
    state: 'in_progress',
    label: 'In Progress (Scanning)',
    shortLabel: 'Scanning',
    fillColor: '#ca8a04',
    strokeColor: '#facc15',
    fillOpacity: 0.58,
    weight: 2,
    dashArray: undefined,
    badgeBg: 'rgba(202, 138, 4, 0.22)',
    badgeBorder: '#facc15',
    badgeColor: '#fef08a',
    dotColor: '#eab308',
    selectedFillColor: '#eab308',
  },

  // 3. Completed on schedule: Green
  completed: {
    state: 'completed',
    label: 'Completed',
    shortLabel: 'Completed',
    fillColor: '#16a34a',
    strokeColor: '#22c55e',
    fillOpacity: 0.62,
    weight: 2,
    dashArray: undefined,
    badgeBg: 'rgba(22, 163, 74, 0.22)',
    badgeBorder: '#22c55e',
    badgeColor: '#86efac',
    dotColor: '#22c55e',
    selectedFillColor: '#22c55e',
  },

  // 4. Not completed on scheduled time: Red
  delayed: {
    state: 'delayed',
    label: 'Overdue / Not Completed on Schedule',
    shortLabel: 'Overdue',
    fillColor: '#dc2626',
    strokeColor: '#ef4444',
    fillOpacity: 0.65,
    weight: 2.5,
    dashArray: undefined,
    badgeBg: 'rgba(220, 38, 38, 0.22)',
    badgeBorder: '#ef4444',
    badgeColor: '#fca5a5',
    dotColor: '#ef4444',
    selectedFillColor: '#ef4444',
  },

  // 5. Incomplete sector finished with delay: Orange
  delayed_completed: {
    state: 'delayed_completed',
    label: 'Completed with Delay',
    shortLabel: 'Delayed Finish',
    fillColor: '#ea580c',
    strokeColor: '#f97316',
    fillOpacity: 0.62,
    weight: 2,
    dashArray: undefined,
    badgeBg: 'rgba(234, 88, 12, 0.22)',
    badgeBorder: '#f97316',
    badgeColor: '#fdba74',
    dotColor: '#f97316',
    selectedFillColor: '#f97316',
  },
};

/**
 * Parses a date or timestamp string into a Date object.
 * If only a date (YYYY-MM-DD) is provided, endOfDay=true will set it to 23:59:59.999.
 */
function parseDateSafely(val?: string | null, endOfDay = false): Date | null {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed || trimmed === '—') return null;

  try {
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return null;
    if (endOfDay && trimmed.length <= 10) {
      d.setHours(23, 59, 59, 999);
    }
    return d;
  } catch {
    return null;
  }
}

/**
 * Universal evaluator for determining the visual state of a sector.
 *
 * Rules:
 * - For Latrics: 5 statuses (Grey, Yellow, Green, Red, Orange)
 *   1. Grey: Pending stage (unstarted, no scanning yet)
 *   2. Yellow: Under progress and scanning is taking place
 *   3. Green: Completed on scheduled time
 *   4. Red: Not completed on scheduled time (overdue / incomplete past deadline)
 *   5. Orange: Incomplete sector is finished with delay
 *
 * - For Clients: ONLY 2 statuses
 *   1. Green: Completed (any completed or surveyed sector)
 *   2. Grey: Pending (all other non-completed sectors)
 */
export function getSectorVisualState(sec: Sector, project?: any, isClient = false): SectorVisualState {
  if (!sec) return 'pending';

  const polyCoords = (sec.polygon_coordinates as any) || {};
  const planningData = sec.planning || polyCoords.planning || {};
  const flightLogs = ((sec.flight_logs || polyCoords.flight_logs || []) as any[]);

  const isExplicitCompleted =
    sec.status === 'completed' ||
    sec.status === 'surveyed' ||
    (sec.progress_percent !== undefined && sec.progress_percent >= 100);

  // Check if any flight log finalized completion
  const completionLog = flightLogs.find(
    (l) => l.sector_status === 'completed' || l.sector_status === 'surveyed'
  );
  const isCompleted = isExplicitCompleted || Boolean(completionLog);

  const isInProgress =
    sec.status === 'in_progress' ||
    (sec.progress_percent !== undefined && sec.progress_percent > 0 && sec.progress_percent < 100) ||
    flightLogs.length > 0;

  // If Client: only progress sectors should be grey box; only when completed then green box
  if (isClient) {
    if (isCompleted) return 'completed';
    return 'pending';
  }

  // Scheduled Deadline resolution (sector-level first, then project-level)
  const rawDeadline =
    planningData.planned_end_date ||
    planningData.planned_start_date ||
    project?.target_date ||
    project?.end_date ||
    project?.estimated_completion_date ||
    project?.requirements_payload?.dates?.end_date ||
    project?.requirements_payload?.end_date;

  const deadlineDate = parseDateSafely(rawDeadline, true);

  // Delay keywords recorded in pilot logs or remarks
  const hasLoggedDelay = flightLogs.some((l) => {
    const rem = String(l.remarks || '').toLowerCase();
    const stat = String(l.sector_status || '').toLowerCase();
    return (
      rem.includes('delay') ||
      rem.includes('delayed') ||
      rem.includes('abort') ||
      rem.includes('issue') ||
      stat.includes('delay') ||
      stat.includes('flagged')
    );
  });

  const isFlaggedOrDelayedStatus =
    sec.status === 'flagged' ||
    sec.status === 'delayed' ||
    sec.status === 'overdue' ||
    Boolean((sec as any).delayed);

  // ── A. Sector is Completed ──
  if (isCompleted) {
    // Check if it was finished with delay:
    let completionDate: Date | null = null;
    if (completionLog && (completionLog.date || completionLog.timestamp)) {
      completionDate = parseDateSafely(completionLog.date || completionLog.timestamp, false);
    } else if (flightLogs.length > 0) {
      const dates = flightLogs
        .map((l) => parseDateSafely(l.date || l.timestamp, false))
        .filter((d): d is Date => d !== null);
      if (dates.length > 0) {
        completionDate = new Date(Math.max(...dates.map((d) => d.getTime())));
      }
    }
    if (!completionDate && sec.updated_at) {
      completionDate = parseDateSafely(sec.updated_at, false);
    }

    const finishedPastDeadline = Boolean(
      deadlineDate && completionDate && completionDate.getTime() > deadlineDate.getTime()
    );

    const isDelayedFinish =
      finishedPastDeadline ||
      hasLoggedDelay ||
      sec.status === 'delayed_completed' ||
      Boolean((sec as any).finished_with_delay);

    if (isDelayedFinish) {
      // Rule 5: Finished with delay -> Orange
      return 'delayed_completed';
    }

    // Rule 3: Completed on time -> Green
    return 'completed';
  }

  // ── B. Sector is NOT Completed ──
  const now = new Date();
  const isPastScheduledDeadline = Boolean(deadlineDate && now.getTime() > deadlineDate.getTime());

  if (isPastScheduledDeadline || isFlaggedOrDelayedStatus || hasLoggedDelay) {
    // Rule 4: Not completed on scheduled time -> Red
    return 'delayed';
  }

  if (isInProgress) {
    // Rule 2: Under progress and scanning taking place -> Yellow
    return 'in_progress';
  }

  // Rule 1: Pending stage -> Grey
  return 'pending';
}

/**
 * Returns complete styling bundle for a sector polygon
 */
export function getSectorPolygonStyle(sec: Sector, project?: any, isSelected = false, isClient = false) {
  const state = getSectorVisualState(sec, project, isClient);
  const cfg = SECTOR_STYLES[state];

  // For Client side: in-progress/pending sectors are solid grey box; only completed sectors are green box
  if (isClient && state !== 'completed') {
    return {
      state,
      cfg,
      color: isSelected ? '#ffffff' : '#94a3b8',
      fillColor: isSelected ? '#94a3b8' : '#64748b',
      fillOpacity: isSelected ? 0.85 : 0.45,
      weight: isSelected ? 3.5 : 2,
      dashArray: undefined,
    };
  }

  if (isSelected) {
    return {
      state,
      cfg,
      color: '#ffffff',
      fillColor: cfg.selectedFillColor,
      fillOpacity: 0.85,
      weight: 3.5,
      dashArray: undefined,
    };
  }

  return {
    state,
    cfg,
    color: cfg.strokeColor,
    fillColor: cfg.fillColor,
    fillOpacity: cfg.fillOpacity,
    weight: cfg.weight,
    dashArray: cfg.dashArray,
  };
}
