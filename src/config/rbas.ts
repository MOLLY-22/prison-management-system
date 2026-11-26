
export type UserRole =
    | 'Super Admin'
    | 'Commissioner'
    | 'Transfer Officer'
    | 'Records Officer'
    | 'Disciplinary Officer'
    | 'Case Officer'
    | 'Visitor Officer'
    | 'Instructor'
    | 'Medical Officer'
    | 'Duty Officer'
    | 'Program Facilitator';

export type Permission =
    // Prisons & Facilities
    | 'prisons:read'
    | 'prisons:manage'
    // Staff Users
    | 'users:list'
    | 'users:manage'
    // Inmates & Custody
    | 'inmates:read'
    | 'inmates:manage'
    | 'inmates:photo:read'
    | 'cells:read'
    | 'cells:allocate'
    | 'sentences:manage'
    // Visits (Split by module access & visit types)
    | 'visits:read'
    | 'visits:create:family'
    | 'visits:create:legal'
    | 'visits:create:health'
    // Incidents
    | 'incidents:read'
    | 'incidents:create'
    // Transfers
    | 'transfers:read'
    | 'transfers:create'
    | 'transfers:updateStatus'
    // Rehabilitation Programs
    | 'programs:read'
    | 'programs:manage'
    | 'programs:enroll'
    | 'attendance:record'
    // Duty Rosters & Shifts
    | 'rosters:manage'
    | 'me:shifts:read';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    'Super Admin': [
        'prisons:read', 'prisons:manage',
        'users:list', 'users:manage',
        
    ],
    'Commissioner': [
        'prisons:read',
        'users:list',
        'inmates:read',
        'transfers:read', 'transfers:create', 'transfers:updateStatus',
    ],
    'Records Officer': [
        'prisons:read',
        'inmates:read', 'inmates:manage', 'inmates:photo:read',
        'cells:read', 'cells:allocate',
        'sentences:manage',
        'visits:read', 'visits:create:family', 'visits:create:legal', 'visits:create:health',
        'incidents:read', 'incidents:create',
        'transfers:read', 'transfers:create', 'transfers:updateStatus',
        'programs:read',
        'me:shifts:read',
    ],
    'Transfer Officer': [
        'prisons:read',
        'inmates:read',
        'transfers:read', 'transfers:create', 'transfers:updateStatus',
    ],
    'Disciplinary Officer': [
        'incidents:read', 'incidents:create',
        'transfers:create',
    ],
    'Case Officer': [
        'visits:read', 'visits:create:legal',
        'transfers:create',
    ],
    'Visitor Officer': [
        'visits:read', 'visits:create:family',
    ],
    'Medical Officer': [
        'visits:read', 'visits:create:health',
        'transfers:create',
    ],
    'Instructor': [
        'programs:read', 'attendance:record',
    ],
    'Program Facilitator': [
        'programs:read', 'programs:manage', 'programs:enroll', 'attendance:record',
    ],
    'Duty Officer': [
        // The supplied role matrix assigns no permissions to Duty Officer.
    ],
};

export function normalizeRole(rawRole: string | null | undefined): UserRole | null {
    if (!rawRole) return null;
    const normalized = rawRole
        .trim()
        .replace(/^ROLE_/i, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .toLowerCase();
    const match = (Object.keys(ROLE_PERMISSIONS) as UserRole[]).find(
        (role) => role.toLowerCase() === normalized,
    );
    return match ?? null;
}

export function hasPermission(role: UserRole | null | undefined, permission: Permission): boolean {
    if (!role) return false;
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: UserRole | null | undefined, permissions: Permission[]): boolean {
    if (!role) return false;
    return permissions.some((p) => hasPermission(role, p));
}