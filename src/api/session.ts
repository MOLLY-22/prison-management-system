export const API_BASE_URL = (import.meta.env.VITE_PMS_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '')

const TOKEN_KEY = 'pms-token'
const USER_KEY = 'pms-user'

export type SessionUser = { id: string; name: string; role: string; facility: string }

const KNOWN_ROLES = ['Super Admin', 'Records Officer', 'Disciplinary Officer', 'Case Officer', 'Visitor Officer', 'Rehabilitation Officer', 'Instructor', 'Medical Officer', 'Duty Officer']

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)

export function getStoredUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY)
  try { return raw ? (JSON.parse(raw) as SessionUser) : null } catch { return null }
}

export function clearSession() {
  for (const store of [localStorage, sessionStorage]) {
    store.removeItem(TOKEN_KEY)
    store.removeItem(USER_KEY)
  }
}

export function saveSession(token: string, user: SessionUser, remember: boolean) {
  clearSession()
  const store = remember ? localStorage : sessionStorage
  store.setItem(TOKEN_KEY, token)
  store.setItem(USER_KEY, JSON.stringify(user))
}

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(decodeURIComponent(escape(atob(payload))))
  } catch {
    return null
  }
}

function normalizeRole(raw: unknown): string | null {
  const value = typeof raw === 'object' && raw && 'authority' in raw ? (raw as { authority: unknown }).authority : raw
  const clean = String(value ?? '').replace(/^ROLE_/i, '').replace(/[_-]+/g, ' ').trim().toLowerCase()
  return KNOWN_ROLES.find((role) => role.toLowerCase() === clean) ?? null
}

// The API guide has no "current user" endpoint, so the role is read from the token.
export function userFromToken(token: string, fallbackName: string): SessionUser {
  const claims = decodeJwt(token) ?? {}
  const candidates = [claims.role, claims.roles, claims.authorities, claims.scope].flat()
  const role = candidates.map(normalizeRole).find(Boolean) ?? 'Super Admin'
  const name = [claims.fullName, claims.name, claims.sub].find((v) => typeof v === 'string' && v) as string | undefined
  return { id: String(claims.sub ?? fallbackName), name: name ?? fallbackName, role, facility: '' }
}
