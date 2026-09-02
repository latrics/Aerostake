import { Role } from '@/lib/role';

export interface UserProfile {
  id: string;
  email: string;
  role: Role | string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCreatePayload {
  email: string;
  password: string;
  role: Role | string;
}
