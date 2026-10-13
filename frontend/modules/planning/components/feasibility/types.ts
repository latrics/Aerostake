export interface ThreadMessage {
  id: string;
  author: string;
  role: 'LATRICS' | 'CLIENT';
  authorRole?: 'admin' | 'ops' | 'client' | 'subordinate';
  authorDesignation?: string;
  timestamp: string;
  content: string;
  attachment?: {
    name: string;
    size: string;
  };
  replyTo?: {
    id: string;
    author: string;
    content: string;
  };
  isPendingSubmit?: boolean;
}

export interface ClarificationThread {
  id: string;
  questionTitle: string;
  messages: ThreadMessage[];
}

export interface PlanningFormData {
  // Stage 1
  kmlFileName: string;
  kmlFileSize: string;
  kmlCalculatedArea: string;
  kmlRequestedArea: string;
  kmlBoundaryStatus: string;

  // Stage 2
  airspaceZones: string[];
  dgcaClearanceRequired?: string;
  airportProximityKm?: string;
  nearestAerodrome?: string;
  policeIntimationRequired?: string;

  // Stage 3
  terrainTypes: string[];
  terrainType?: string;
  elevationVariationMeters: string;
  weatherConditions: string[];
  fieldAccessIdentified: boolean;
  fieldAccessNotes: string;

  // Stage 4
  hazards: string[];
  maxObstacleHeightMeters: string;
  safetyBufferDistanceMeters: string;
  hazardMitigationNotes: string;

  // Stage 5
  gcpsNeeded: string;
  gcpTargetSizeCm: string;
  gcpTargetMaterial: string;
  gcpLocationFile: string;
  checkpointsNeeded?: string;
  baseStationSetup?: string;
  gcpFileAttached?: string;

  // Stage 6
  numberOfLandings: string;
  plannedAltitudeMeters: string;
  frontOverlapPercent: string;
  sideOverlapPercent: string;
  estimatedGsdCm?: string;
  flightDurationMinutes?: string;
  batterySetsRequired?: string;

  // Stage 7
  expectedSurveyDays: string;
  expectedStartDate: string;
  expectedEndDate: string;
  pilotTravelDate: string;
  dataDeliveryTimelineDays: string;
  weatherContingencyDays?: string;

  // Stage 8
  feasibilityDecision: 'yes' | 'no' | 'need_clarity' | '';
  decisionRemarks: string;
  reviewConfirmed: boolean;
}

export interface FeasibilityStageItem {
  num: number;
  title: string;
}
