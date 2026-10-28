// Development-only session. Authentication is deliberately not mounted while
// the frontend is being built, so developers can reach every workflow quickly.
// Replace this export with the authenticated user from AuthContext when the API
// login flow is ready to be enabled.
export const developmentUser = {
  id: 'DEV-OIC-001',
  name: 'Development Officer',
  role: 'Officer-in-Charge',
  facility: 'Main Prison',
}

const rolePermissions = {
  'Officer-in-Charge': ['dashboard:view', 'inmates:view', 'admissions:create', 'visitors:manage', 'transfers:manage', 'releases:manage', 'users:manage'],
  'Senior Prison Officer': ['dashboard:view', 'inmates:view', 'admissions:create', 'visitors:manage', 'transfers:manage', 'releases:manage'],
  'Prison Officer': ['inmates:view', 'admissions:create', 'visitors:manage', 'transfers:manage'],
  Gatekeeper: ['inmates:view', 'visitors:manage'],
}

export function hasDevelopmentPermission(permission) {
  return rolePermissions[developmentUser.role]?.includes(permission) ?? false
}
