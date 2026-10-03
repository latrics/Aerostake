'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProjectPlanningFeasibilityView } from '@/modules/planning/components/ProjectPlanningFeasibilityView';
import { requestApi } from '@/modules/requests/api';
import { projectApi } from '@/modules/projects/api';
import { useAuth } from '@/lib/auth';
import { isLatricsRole } from '@/lib/role';

export default function RequestPlanningPage() {
  const params = useParams();
  const rawId = (params?.id as string) || '001';
  const { user } = useAuth();
  const role = user && !isLatricsRole(user.role) ? 'client' : 'ops';

  const [reqData, setReqData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRequest() {
      setIsLoading(true);
      try {
        const allReqs = await requestApi.listAllRequests();
        const searchKey = rawId.replace(/^#/, '').trim().toLowerCase();
        const found = allReqs.find(
          (r) =>
            (r.id && r.id.toLowerCase() === searchKey) ||
            (r.project_id && r.project_id.toLowerCase() === searchKey) ||
            String(r.version) === searchKey ||
            String(r.version).padStart(3, '0') === searchKey.padStart(3, '0')
        );

        if (found) {
          let proj = null;
          if (found.project_id) {
            proj = await projectApi.getProject(found.project_id).catch(() => null);
          }
          setReqData({ req: found, proj });
        } else {
          // If rawId is a projectId
          const proj = await projectApi.getProject(rawId).catch(() => null);
          if (proj) {
            const projReqs = await requestApi.listProjectRequests(proj.id).catch(() => []);
            const latestReq = projReqs.length > 0 ? projReqs[projReqs.length - 1] : null;
            setReqData({ req: latestReq, proj });
          }
        }
      } catch {
        // Fallback to defaults
      } finally {
        setIsLoading(false);
      }
    }
    loadRequest();
  }, [rawId]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '0.75rem' }}>
        <div style={{ width: '28px', height: '28px', border: '3px solid #e4e4e7', borderTopColor: '#09090b', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '0.85rem', color: '#71717a', fontWeight: 600 }}>Loading Planning Workspace...</span>
      </div>
    );
  }

  const req = reqData?.req;
  const proj = reqData?.proj;
  const payload = req?.requirements_payload || proj?.requirements_payload || {};

  const displayId = req ? `#${String(req.version).padStart(3, '0')}` : `#${rawId.replace('#', '')}`;
  const displayClient =
    payload.company_name ||
    payload.primary_contact?.company ||
    req?.client_company ||
    proj?.client_company ||
    'Client Organization';
  const displayProject =
    req?.project_title ||
    proj?.title ||
    payload.project_name ||
    'Survey Project';

  return (
    <ProjectPlanningFeasibilityView
      role={role}
      requestId={displayId}
      clientCompany={displayClient}
      projectName={displayProject}
      projectId={proj?.id || req?.project_id}
    />
  );
}
