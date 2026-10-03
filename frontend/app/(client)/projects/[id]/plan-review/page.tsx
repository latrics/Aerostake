'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ProjectPlanningFeasibilityView } from '@/modules/planning/components/ProjectPlanningFeasibilityView';
import { projectApi } from '@/modules/projects/api';
import { requestApi } from '@/modules/requests/api';
import { Project } from '@/modules/projects/types';
import { RequestVersion } from '@/modules/requests/types';

export default function ClientPlanReviewPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = (params?.id as string) || '';

  const [project, setProject] = useState<Project | null>(null);
  const [latestRequest, setLatestRequest] = useState<RequestVersion | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!projectId) return;
      setIsLoading(true);
      try {
        const [proj, reqs] = await Promise.all([
          projectApi.getProject(projectId).catch(() => null),
          requestApi.listProjectRequests(projectId).catch(() => []),
        ]);

        if (proj) setProject(proj);
        if (reqs && reqs.length > 0) {
          const sorted = [...reqs].sort((a, b) => b.version - a.version);
          setLatestRequest(sorted[0]);
        }
      } catch (err) {
        console.error('Failed to load project details for Plan Review:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [projectId]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '0.75rem' }}>
        <Loader2 size={32} className="animate-spin" color="#09090b" />
        <span style={{ fontSize: '0.85rem', color: '#71717a' }}>Loading Plan Review...</span>
      </div>
    );
  }

  const reqPayload = (latestRequest?.requirements_payload || project?.requirements_payload || {}) as Record<string, any>;
  const displayClient =
    reqPayload.company_name ||
    reqPayload.primary_contact?.company ||
    latestRequest?.client_company ||
    project?.client_company ||
    'Client Organization';

  const displayProjectName =
    latestRequest?.project_title ||
    project?.title ||
    reqPayload.project_name ||
    'Survey Project';

  const displayReqId = latestRequest?.version
    ? `#${String(latestRequest.version).padStart(3, '0')}`
    : `#${projectId.slice(0, 6)}`;

  return (
    <ProjectPlanningFeasibilityView
      role="client"
      projectId={projectId}
      requestId={displayReqId}
      clientCompany={displayClient}
      projectName={displayProjectName}
    />
  );
}
