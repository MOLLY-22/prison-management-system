import { normalizeRole, type UserRole } from "../config/rbas";

export const API_BASE_URL = (import.meta.env.VITE_PMS_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '')

const TOKEN_KEY = 'pms-token'
const USER_KEY = 'pms-user'

export type SessionUser = { id: string; name: string; role: UserRole | null; facility: string }

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

function roleFromValue(raw: unknown): UserRole | null {
  if (typeof raw === "string") return normalizeRole(raw);
  if (Array.isArray(raw)) return raw.map(roleFromValue).find(Boolean) ?? null;
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  return roleFromValue(record.authority ?? record.role ?? record.name);
}

// The API guide has no "current user" endpoint, so the role is read from the token.
export function userFromToken(token: string, fallbackName: string): SessionUser {
  const claims = decodeJwt(token) ?? {}
  const candidates = [claims.role, claims.roles, claims.authorities, claims.scope]
  const role = candidates.map(roleFromValue).find(Boolean) ?? null
  const name = [claims.fullName, claims.name, claims.sub].find((v) => typeof v === 'string' && v) as string | undefined
  return { id: String(claims.sub ?? fallbackName), name: name ?? fallbackName, role, facility: '' }
}
