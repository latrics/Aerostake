'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProjectPlanningFeasibilityView } from '@/modules/planning/components/ProjectPlanningFeasibilityView';
import { requestApi } from '@/modules/requests/api';
import { projectApi } from '@/modules/projects/api';

export default function RequestPlanningPage() {
  const params = useParams();
  const rawId = (params?.id as string) || '001';

  const [reqData, setReqData] = useState<any>(null);

  useEffect(() => {
    async function loadRequest() {
      try {
        const allReqs = await requestApi.listAllRequests();
        const found = allReqs.find(
          (r) =>
            r.id === rawId ||
            String(r.version) === rawId ||
            `00${r.version}`.endsWith(rawId.replace('#', ''))
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
            setReqData({ req: null, proj });
          }
        }
      } catch {
        // Fallback to defaults
      }
    }
    loadRequest();
  }, [rawId]);

  const req = reqData?.req;
  const proj = reqData?.proj;
  const payload = req?.requirements_payload || proj?.requirements_payload || {};

  const displayId = req ? `#${String(req.version).padStart(3, '0')}` : `#${rawId.replace('#', '')}`;
  const displayClient =
    payload.company_name ||
    payload.primary_contact?.company ||
    req?.client_company ||
    proj?.client_company ||
    'client1 company';
  const displayProject =
    req?.project_title ||
    proj?.title ||
    payload.project_name ||
    (rawId.toLowerCase().includes('school') ? 'School1' : 'School1');

  return (
    <ProjectPlanningFeasibilityView
      requestId={displayId}
      clientCompany={displayClient}
      projectName={displayProject}
    />
  );
}
