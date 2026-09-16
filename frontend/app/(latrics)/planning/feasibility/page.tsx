'use client';

import React from 'react';
import { ProjectPlanningFeasibilityView } from '@/modules/planning/components/ProjectPlanningFeasibilityView';

export default function PlanningFeasibilityWireframePage() {
  return (
    <ProjectPlanningFeasibilityView
      requestId="#001"
      clientCompany="client1 company"
      projectName="School1"
    />
  );
}
