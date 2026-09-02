import { useState, useEffect, useCallback } from 'react';
import { timelineApi } from './api';
import { TimelineEvent } from './types';

export function useProjectTimeline(projectId: string | null, categoryFilter?: string) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await timelineApi.getProjectTimeline(projectId, categoryFilter);
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load project audit timeline');
    } finally {
      setLoading(false);
    }
  }, [projectId, categoryFilter]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  return {
    events,
    loading,
    error,
    refetch: fetchTimeline,
  };
}
