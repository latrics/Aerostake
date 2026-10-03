'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import ProjectMobilisationView from '@/modules/mobilisation/components/ProjectMobilisationView';

export default function ClientProjectMobilisationPage() {
  const params = useParams();
  const projectId = (params?.id as string) || '';

  return <ProjectMobilisationView projectId={projectId} isLatricsPortal={false} />;
}
