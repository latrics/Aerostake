/**
 * Aerostake / LATRICS Requests & Planning Form Notifications Manager
 * 
 * Logic:
 * - A notification badge will ONLY appear on "Requests" navigation when:
 *   1. There is a NEW REQUEST: Newly submitted survey request that hasn't been reviewed/seen by Ops.
 *   2. There are UNSEEN PLANNING FORM VERSIONS: Planning form revisions, clarifications, or updates
 *      submitted by clients that have not yet been opened/seen by Ops.
 * - When there are 0 new requests and 0 unseen planning versions, NO notification badge is shown.
 */

import { RequestVersion } from './types';

const SEEN_REQUESTS_KEY = 'latrics_seen_requests_v1';
const SEEN_PLANNING_VERSIONS_KEY = 'latrics_seen_planning_versions_v1';
export const NOTIFICATIONS_CHANGED_EVENT = 'latrics-requests-notifications-changed';

export const CONVERTED_STATUSES = [
  'approved',
  'in_progress',
  'capturing',
  'mobilising',
  'mobilizing',
  'completed',
  'active',
];

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/**
 * Get all request IDs that have been marked as seen by the current user.
 */
export function getSeenRequestIds(): Set<string> {
  if (!isBrowser()) return new Set();
  try {
    const raw = localStorage.getItem(SEEN_REQUESTS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

/**
 * Get all planning form version tokens that have been marked as seen by the current user.
 * Format of token: `${projectId}_${versionCode}_${updatedAt}`
 */
export function getSeenPlanningTokens(): Set<string> {
  if (!isBrowser()) return new Set();
  try {
    const raw = localStorage.getItem(SEEN_PLANNING_VERSIONS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

/**
 * Check if a survey request is in "New Request" status:
 * - Has 0 planning form versions created yet
 * - Project status is uninitiated ('submitted' or 'draft')
 */
export function isRequestNew(req: RequestVersion): boolean {
  if (!req) return false;
  const pStatus = (req.project_status || '').toLowerCase();
  const planCount = req.planning_versions_count || 0;
  return planCount === 0 && (!pStatus || pStatus === 'draft' || pStatus === 'submitted');
}

/**
 * Check if a request is a NEW REQUEST that has NOT been seen yet by Ops.
 */
export function isRequestUnseen(req: RequestVersion, seenIds?: Set<string>): boolean {
  if (!req) return false;
  if (!isRequestNew(req)) return false;
  const seen = seenIds || getSeenRequestIds();
  return !seen.has(req.id) && (!req.project_id || !seen.has(req.project_id));
}

/**
 * Generate a unique token for a project's latest planning version state.
 */
export function generatePlanningVersionToken(
  projectId: string,
  versionCode?: string | null,
  updatedAt?: string | null
): string {
  const v = (versionCode || 'V01').trim();
  const t = (updatedAt || '').trim();
  return `${projectId}__${v}__${t}`;
}

/**
 * Check if a request has an UNSEEN PLANNING FORM VERSION:
 * - Not already converted to active project (approved, capturing, completed, etc.)
 * - Not cancelled or rejected
 * - Has active planning underway
 * - The latest version was updated/submitted by the Client (e.g. client clarification or revision)
 * - Has NOT yet been marked seen by Ops
 */
export function isPlanningVersionUnseen(
  req: RequestVersion,
  seenTokens?: Set<string>
): boolean {
  if (!req) return false;

  const pStatus = (req.project_status || '').toLowerCase();
  const planStatus = (req.latest_planning_status || '').toLowerCase();

  // If already approved or converted to project, planning is completed
  const isConverted =
    CONVERTED_STATUSES.includes(pStatus) ||
    CONVERTED_STATUSES.includes(planStatus) ||
    planStatus === 'approved';
  if (isConverted) return false;

  // If cancelled or rejected
  const isCancelled =
    pStatus === 'cancelled' ||
    planStatus === 'not_feasible' ||
    planStatus === 'no';
  if (isCancelled) return false;

  // Must have planning versions or be in planning status
  const hasPlanning =
    (req.planning_versions_count && req.planning_versions_count > 0) ||
    pStatus === 'planning';
  if (!hasPlanning) return false;

  // Planning form needs Ops attention if the latest update was from the client
  // (e.g. client reply, clarification submitted, or revision requested)
  const isClientUpdate =
    req.planning_updated_by === 'client' ||
    planStatus === 'clarification_submitted' ||
    planStatus === 'revision_requested';
  if (!isClientUpdate) return false;

  const targetId = req.project_id || req.id;
  const token = generatePlanningVersionToken(
    targetId,
    req.latest_planning_version,
    req.planning_updated_at
  );

  const seen = seenTokens || getSeenPlanningTokens();
  // Also check if any token matching this project and version exists in seen set
  if (seen.has(token)) return false;

  for (const s of Array.from(seen)) {
    if (s.startsWith(`${targetId}__${req.latest_planning_version || 'V01'}`)) {
      return false;
    }
  }

  return true;
}

export interface NotificationCountsResult {
  newRequestsCount: number;
  unseenPlanningCount: number;
  totalBadgeCount: number;
  unseenRequestIds: string[];
  unseenPlanningProjectIds: string[];
}

/**
 * Calculate total notification counts strictly based on:
 * - New unseen requests
 * - Unseen planning form versions from client
 */
export function calculateRequestsNotificationCount(
  requests: RequestVersion[]
): NotificationCountsResult {
  if (!Array.isArray(requests) || requests.length === 0) {
    return {
      newRequestsCount: 0,
      unseenPlanningCount: 0,
      totalBadgeCount: 0,
      unseenRequestIds: [],
      unseenPlanningProjectIds: [],
    };
  }

  const seenReqs = getSeenRequestIds();
  const seenPlanTokens = getSeenPlanningTokens();

  const unseenRequestIds: string[] = [];
  const unseenPlanningProjectIds: string[] = [];

  requests.forEach((req) => {
    if (isRequestUnseen(req, seenReqs)) {
      unseenRequestIds.push(req.id);
    } else if (isPlanningVersionUnseen(req, seenPlanTokens)) {
      unseenPlanningProjectIds.push(req.project_id || req.id);
    }
  });

  return {
    newRequestsCount: unseenRequestIds.length,
    unseenPlanningCount: unseenPlanningProjectIds.length,
    totalBadgeCount: unseenRequestIds.length + unseenPlanningProjectIds.length,
    unseenRequestIds,
    unseenPlanningProjectIds,
  };
}

/**
 * Mark a request as seen. Dispatches global change event.
 */
export function markRequestAsSeen(requestId: string): void {
  if (!isBrowser() || !requestId) return;
  try {
    const seen = getSeenRequestIds();
    if (!seen.has(requestId)) {
      seen.add(requestId);
      localStorage.setItem(SEEN_REQUESTS_KEY, JSON.stringify(Array.from(seen)));
      window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));
    }
  } catch (e) {
    console.error('Error marking request as seen', e);
  }
}

/**
 * Mark a planning form version as seen for a project. Dispatches global change event.
 */
export function markPlanningVersionAsSeen(
  projectIdOrReqId: string,
  versionCode?: string | null,
  updatedAt?: string | null
): void {
  if (!isBrowser() || !projectIdOrReqId) return;
  try {
    const seen = getSeenPlanningTokens();
    const token = generatePlanningVersionToken(projectIdOrReqId, versionCode, updatedAt);
    // Also add a wildcard version code token for immediate match
    const vPrefix = `${projectIdOrReqId}__${(versionCode || 'V01').trim()}`;

    let changed = false;
    if (!seen.has(token)) {
      seen.add(token);
      changed = true;
    }
    if (!seen.has(vPrefix)) {
      seen.add(vPrefix);
      changed = true;
    }

    if (changed) {
      localStorage.setItem(SEEN_PLANNING_VERSIONS_KEY, JSON.stringify(Array.from(seen)));
      window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));
    }
  } catch (e) {
    console.error('Error marking planning version as seen', e);
  }
}

/**
 * Mark all current requests and planning versions as seen.
 */
export function markAllRequestsAsSeen(requests: RequestVersion[]): void {
  if (!isBrowser() || !Array.isArray(requests)) return;
  try {
    const seenReqs = getSeenRequestIds();
    const seenPlanTokens = getSeenPlanningTokens();

    requests.forEach((req) => {
      seenReqs.add(req.id);
      if (req.project_id) seenReqs.add(req.project_id);

      const targetId = req.project_id || req.id;
      seenPlanTokens.add(
        generatePlanningVersionToken(targetId, req.latest_planning_version, req.planning_updated_at)
      );
      seenPlanTokens.add(`${targetId}__${(req.latest_planning_version || 'V01').trim()}`);
    });

    localStorage.setItem(SEEN_REQUESTS_KEY, JSON.stringify(Array.from(seenReqs)));
    localStorage.setItem(SEEN_PLANNING_VERSIONS_KEY, JSON.stringify(Array.from(seenPlanTokens)));
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));
  } catch (e) {
    console.error('Error marking all requests as seen', e);
  }
}
