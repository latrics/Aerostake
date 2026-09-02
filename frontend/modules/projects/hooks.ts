import { useState, useEffect, useCallback } from 'react';
import { projectApi } from './api';
import { Project, ProjectCreate, ProjectStatus, ProjectUpdate } from './types';

export function useProjects(statusFilter?: ProjectStatus | string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectApi.listProjects(statusFilter);
      setProjects(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = async (data: ProjectCreate): Promise<Project> => {
    const newProject = await projectApi.createProject(data);
    setProjects((prev) => [newProject, ...prev]);
    return newProject;
  };

  return {
    projects,
    loading,
    error,
    refetch: fetchProjects,
    createProject,
  };
}

export function useProject(projectId: string | null) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await projectApi.getProject(projectId);
      setProject(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const updateProject = async (data: ProjectUpdate): Promise<Project> => {
    if (!projectId) throw new Error('No project ID provided');
    const updated = await projectApi.updateProject(projectId, data);
    setProject(updated);
    return updated;
  };

  return {
    project,
    loading,
    error,
    refetch: fetchProject,
    updateProject,
  };
}
