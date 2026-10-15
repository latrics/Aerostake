export enum Role {
  CLIENT = 'client',
  CLIENT_PRIMARY = 'client_primary',
  CLIENT_SUB = 'client_sub',
  ADMIN = 'admin',
  OPERATIONS = 'operations',
  PILOT = 'pilot',
}

export function isClientRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return [Role.CLIENT, Role.CLIENT_PRIMARY, Role.CLIENT_SUB].includes(role as Role);
}

export function isLatricsRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return [Role.ADMIN, Role.OPERATIONS, Role.PILOT].includes(role as Role);
}

export interface NavItem {
  label: string;
  path: string;
  icon?: string;
  allowedRoles: Role[];
}

export const navigationItems: NavItem[] = [
  // Latrics Back-office Navigation
  {
    label: 'Survey Requests',
    path: '/requests',
    allowedRoles: [Role.ADMIN, Role.OPERATIONS],
  },
  {
    label: 'Operational Plans',
    path: '/planning',
    allowedRoles: [Role.ADMIN, Role.OPERATIONS],
  },
  {
    label: 'Hardware Allocations',
    path: '/allocations',
    allowedRoles: [Role.ADMIN, Role.OPERATIONS],
  },
  {
    label: 'Flight Sectors',
    path: '/sectors',
    allowedRoles: [Role.ADMIN, Role.OPERATIONS],
  },
  {
    label: 'My Assignments',
    path: '/my-assignments',
    allowedRoles: [Role.PILOT],
  },
  {
    label: 'Sector Updates',
    path: '/sector-updates',
    allowedRoles: [Role.PILOT],
  },
  {
    label: 'User Management',
    path: '/user-management',
    allowedRoles: [Role.ADMIN],
  },
  {
    label: 'Portal Settings',
    path: '/portal-settings',
    allowedRoles: [Role.ADMIN],
  },
];

export function getAllowedNavigation(role: string | null | undefined): NavItem[] {
  if (!role) return [];
  return navigationItems.filter((item) => item.allowedRoles.includes(role as Role));
}
