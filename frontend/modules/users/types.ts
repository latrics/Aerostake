import { Role } from '@/lib/role';

export interface TeamMemberContact {
  id?: string | number;
  full_name: string;
  email: string;
  phone_number?: string;
  department?: string;
}

export interface CompanyAddress {
  address_line1: string;
  address_line2?: string;
  city: string;
  pin_code: string;
  state: string;
  country: string;
}

export interface CompanyProfileData {
  company_name?: string;
  industry?: string;
  company_type?: string;
  gst_number?: string;
  registration_number?: string;
  year_of_establishment?: string;
  website?: string;
  company_description?: string;
  address?: CompanyAddress;
  primary_contact?: {
    full_name: string;
    phone_number: string;
    email: string;
    department: string;
  };
  team_members?: TeamMemberContact[];
  is_onboarded?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  role: Role | string;
  is_active: boolean;
  full_name?: string | null;
  company_name?: string | null;
  phone_number?: string | null;
  designation?: string | null;
  company_profile?: CompanyProfileData | null;
  organization_id?: string | null;
  device_token?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfileUpdate {
  full_name?: string;
  email?: string;
  company_name?: string;
  phone_number?: string;
  designation?: string;
  company_profile?: CompanyProfileData;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface UserCreatePayload {
  email: string;
  password: string;
  role: Role | string;
}
