'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ProjectPlanningFeasibilityView } from '@/modules/planning/components/ProjectPlanningFeasibilityView';
import { projectApi } from '@/modules/projects/api';
import { requestApi } from '@/modules/requests/api';
import { Project } from '@/modules/projects/types';
import { RequestVersion } from '@/modules/requests/types';

export default function ClientRequestPlanReviewPage() {
  const params = useParams();
  const rawId = (params?.id as string) || '';

  const [project, setProject] = useState<Project | null>(null);
  const [latestRequest, setLatestRequest] = useState<RequestVersion | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!rawId) return;
      setIsLoading(true);
      try {
        const searchKey = rawId.replace(/^#/, '').trim().toLowerCase();
        const allReqs = await requestApi.listAllRequests().catch(() => []);
        let foundReq = allReqs.find(
          (r) =>
            (r.id && r.id.toLowerCase() === searchKey) ||
            (r.project_id && r.project_id.toLowerCase() === searchKey) ||
            String(r.version) === searchKey ||
            String(r.version).padStart(3, '0') === searchKey.padStart(3, '0')
        );

        let foundProj: Project | null = null;
        if (foundReq?.project_id) {
          foundProj = await projectApi.getProject(foundReq.project_id).catch(() => null);
        } else {
          // If rawId is a direct project UUID
          foundProj = await projectApi.getProject(rawId).catch(() => null);
          if (foundProj) {
            const pReqs = await requestApi.listProjectRequests(foundProj.id).catch(() => []);
            if (pReqs.length > 0) {
              const sorted = [...pReqs].sort((a, b) => b.version - a.version);
              foundReq = sorted[0];
            }
          }
        }

        if (foundProj) setProject(foundProj);
        if (foundReq) setLatestRequest(foundReq);
      } catch (err) {
        console.error('Failed to load request details for Plan Review:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [rawId]);

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
    : rawId.startsWith('#')
    ? rawId
    : `#${rawId.slice(0, 6)}`;

  return (
    <ProjectPlanningFeasibilityView
      role="client"
      projectId={project?.id || latestRequest?.project_id}
      requestId={displayReqId}
      clientCompany={displayClient}
      projectName={displayProjectName}
    />
  );
}
