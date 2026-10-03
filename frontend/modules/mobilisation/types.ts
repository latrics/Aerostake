export interface PilotCrewMember {
  id: string;
  role: string;
  name: string;
  contactNo: string;
  alternateContact?: string;
  age?: string;
  email?: string;
  aadhaarNo?: string;
  aadhaarFile?: {
    name: string;
    size: string;
  };
  dgcaLicenseNo?: string;
  dgcaLicenseFile?: {
    name: string;
    size: string;
  };
  insuranceActive?: boolean;
}

export interface HardwareDeployment {
  droneModel: string;
  dgcaUin: string;
  droneInsuranceNo?: string;
  droneInsuranceExpiry?: string;
  sensorPayload: string;
  dgpsUnits?: string;
  powerSetup?: string;
  batterySetsCount?: string;
}

export interface TravelLogistics {
  transportMode: string;
  ticketBookingDate?: string;
  pnrReference?: string;
  departureDateTime?: string;
  arrivalDateTime?: string;
  ticketAttachment?: {
    name: string;
    size: string;
  };
  vehicleRegNo?: string;
  driverName?: string;
  driverContact?: string;
}

export interface AccommodationDetails {
  hotelName: string;
  address: string;
  googleMapsLink?: string;
  checkInDate?: string;
  checkOutDate?: string;
  hotelContact?: string;
}

export interface SiteClearanceDetails {
  policeIntimationStatus: string;
  policeIntimationFile?: {
    name: string;
    size: string;
  };
  gatePassStatus: string;
  gatePassFile?: {
    name: string;
    size: string;
  };
  ppeJackets: boolean;
  ppeHelmets: boolean;
  ppeBoots: boolean;
}

export interface MobilisationSchedule {
  departureDate?: string;
  arrivalDate?: string;
  gcpCalibrationDate?: string;
  firstFlightDate?: string;
}

export interface ThreadMessage {
  id: string;
  author: string;
  role: 'LATRICS' | 'CLIENT';
  timestamp: string;
  content: string;
  attachment?: {
    name: string;
    size: string;
  };
}

export interface ClientTicketBillItem {
  id: string;
  name: string;
  size?: string;
  type?: string;
  notes?: string;
  uploadedAt: string;
  uploadedBy: string;
  url?: string;
}

export type MobilisationResponsibility = 'CLIENT' | 'LATRICS' | '';
export type ClientTicketApprovalStatus = 'PENDING_SUBMISSION' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type LatricsAdvancePaymentStatus = 'PENDING_PAYMENT' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';

export interface MobilisationFormData {
  // Stage 1: Stakeholder & POC
  clientCoordinatorName: string;
  clientCoordinatorPhone: string;
  clientCoordinatorEmail: string;

  clientLocalPocName: string;
  clientLocalPocPhone: string;
  clientLocalPocAlternatePhone: string;
  clientLocalPocDesignation: string;

  latricsOpsPocName: string;
  latricsOpsPocPhone: string;
  latricsOpsPocEmail: string;

  emergencyHospitalName: string;
  emergencyHospitalPhone: string;
  emergencyPolicePhone: string;

  // Stage 2: Flight Crew
  pilots: PilotCrewMember[];

  // Stage 3: Hardware & Equipment
  hardware: HardwareDeployment;

  // Stage 4: Travel & Logistics
  logistics: TravelLogistics;

  // Stage 4: Mobilisation Responsibility & Approval Gates
  responsibility?: MobilisationResponsibility;
  mobilisationResponsibility?: MobilisationResponsibility;

  // Branch A: Client Responsible
  clientTicketShareDeadline?: string;
  clientTicketsAndBills?: ClientTicketBillItem[];
  clientTicketApprovalStatus?: ClientTicketApprovalStatus;
  clientTicketApprovalNotes?: string;
  clientTicketApprovedBy?: string;
  clientTicketApprovedAt?: string;

  // Branch B: Latrics Responsible
  latricsAdvanceAmount?: number;
  latricsAdvanceUtr?: string;
  latricsAdvancePaymentDate?: string;
  latricsAdvancePaidAt?: string;
  latricsAdvanceSlipUrl?: string;
  latricsAdvanceSlipName?: string;
  latricsAdvanceSlipFile?: {
    name: string;
    size: string;
    url?: string;
  } | null;
  latricsAdvanceNotes?: string;
  latricsAdvancePaymentStatus?: LatricsAdvancePaymentStatus;
  latricsAdvanceVerifiedBy?: string;
  latricsAdvanceVerifiedAt?: string;
  latricsAdvanceVerificationNotes?: string;

  // Stage 5: Accommodations
  accommodation: AccommodationDetails;

  // Stage 6: Site Access & Clearances
  clearances: SiteClearanceDetails;

  // Stage 7: Schedule
  schedule: MobilisationSchedule;

  // Stage 8: Remarks & Documents
  remarks: string;
  attachments: {
    name: string;
    size: string;
  }[];

  // Stage Discussion Threads (Keyed by Stage ID 1..8)
  stageThreads: Record<number, ThreadMessage[]>;
}
