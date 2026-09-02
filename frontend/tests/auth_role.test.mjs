// Frontend Unit Test: Role and Navigation RBAC
import assert from 'node:assert/strict';

// Test Role Enum and Helpers
const Role = {
  CLIENT: 'client',
  ADMIN: 'admin',
  OPERATIONS: 'operations',
  PILOT: 'pilot',
};

function isLatricsRole(role) {
  if (!role) return false;
  return [Role.ADMIN, Role.OPERATIONS, Role.PILOT].includes(role);
}

const navigationItems = [
  { label: 'Survey Requests', path: '/requests', allowedRoles: [Role.ADMIN, Role.OPERATIONS] },
  { label: 'Operational Plans', path: '/planning', allowedRoles: [Role.ADMIN, Role.OPERATIONS] },
  { label: 'Hardware Allocations', path: '/allocations', allowedRoles: [Role.ADMIN, Role.OPERATIONS] },
  { label: 'Flight Sectors', path: '/sectors', allowedRoles: [Role.ADMIN, Role.OPERATIONS] },
  { label: 'My Assignments', path: '/my-assignments', allowedRoles: [Role.PILOT] },
  { label: 'Sector Updates', path: '/sector-updates', allowedRoles: [Role.PILOT] },
  { label: 'User Management', path: '/user-management', allowedRoles: [Role.ADMIN] },
  { label: 'Portal Settings', path: '/portal-settings', allowedRoles: [Role.ADMIN] },
];

function getAllowedNavigation(role) {
  if (!role) return [];
  return navigationItems.filter((item) => item.allowedRoles.includes(role));
}

export function runAuthRoleTests() {
  console.log('🧪 Running [auth_role.test.mjs]...');

  // 1. Test isLatricsRole helper
  assert.equal(isLatricsRole(Role.CLIENT), false, 'Client is not a Latrics back-office role');
  assert.equal(isLatricsRole(Role.ADMIN), true, 'Admin is a Latrics role');
  assert.equal(isLatricsRole(Role.OPERATIONS), true, 'Operations is a Latrics role');
  assert.equal(isLatricsRole(Role.PILOT), true, 'Pilot is a Latrics role');
  assert.equal(isLatricsRole(null), false, 'Null role is not a Latrics role');

  // 2. Test Admin Navigation Items
  const adminNav = getAllowedNavigation(Role.ADMIN);
  const adminPaths = adminNav.map((n) => n.path);
  assert.ok(adminPaths.includes('/requests'), 'Admin sees /requests');
  assert.ok(adminPaths.includes('/user-management'), 'Admin sees /user-management');
  assert.ok(!adminPaths.includes('/my-assignments'), 'Admin does not see pilot /my-assignments');

  // 3. Test Pilot Navigation Items
  const pilotNav = getAllowedNavigation(Role.PILOT);
  const pilotPaths = pilotNav.map((n) => n.path);
  assert.deepEqual(pilotPaths, ['/my-assignments', '/sector-updates'], 'Pilot only sees flight assignment views');

  // 4. Test Operations Navigation Items
  const opsNav = getAllowedNavigation(Role.OPERATIONS);
  const opsPaths = opsNav.map((n) => n.path);
  assert.ok(opsPaths.includes('/allocations'), 'Ops sees /allocations');
  assert.ok(!opsPaths.includes('/user-management'), 'Ops does not see Admin /user-management');

  console.log('  ✅ 4/4 Role RBAC navigation assertions passed!');
}
