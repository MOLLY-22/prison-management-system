import { asRecord, collectionFrom, firstValue, itemFrom } from "./dataContract";
import api from "./axiosClient";
import type { AuthUser } from "../context/AuthContext";

const roleCacheKey = "pms:user-role-cache";

export function cacheUserRoles(users: unknown[]) {
    try {
        const cached = JSON.parse(localStorage.getItem(roleCacheKey) || "{}") as Record<string, string>;
        for (const value of users) {
            const record = asRecord(value);
            const role = roleFrom(record);
            if (!role) continue;
            const identities = [
                firstValue(record, ["username", "userName", "user_name"], ""),
                firstValue(record, ["email", "userEmail", "user_email"], ""),
                firstValue(record, ["id", "userId", "user_id"], ""),
            ];
            for (const identity of identities) {
                const key = String(identity).trim().toLowerCase();
                if (key) cached[key] = role;
            }
        }
        localStorage.setItem(roleCacheKey, JSON.stringify(cached));
    } catch {
        // Role caching improves the UI only; auth and API authorization remain server-controlled.
    }
}

function cachedUserRole(identity: string) {
    try {
        const cached = JSON.parse(localStorage.getItem(roleCacheKey) || "{}") as Record<string, string>;
        return cached[identity.trim().toLowerCase()] ?? "";
    } catch {
        return "";
    }
}

function tokenClaims(token: string): Record<string, unknown> {
    try {
        const payload = token.split(".")[1];
        if (!payload) return {};
        const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
        const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
        const parsed: unknown = JSON.parse(decoded);
        return asRecord(parsed);
    } catch {
        return {};
    }
}

function roleFrom(record: Record<string, unknown>) {
    const direct = firstValue(record, ["role", "userRole", "user_role", "roleName", "role_name", "primaryRole", "primary_role", "authority"], "");
    if (Array.isArray(direct)) {
        return direct.map((role) => typeof role === "string" ? role : roleFrom(asRecord(role)))
            .filter(Boolean).join(" ");
    }
    if (direct && typeof direct === "object") {
        const nestedRole = asRecord(direct);
        const nestedName = firstValue(nestedRole, ["name", "roleName", "role_name", "authority", "code", "value"], "");
        if (nestedName) return String(nestedName);
    } else if (direct) return String(direct);
    const roles: unknown = firstValue<unknown>(record, ["roles", "authorities", "permissions", "scope", "scp", "groups", "grantedAuthorities", "auth"], []);
    if (typeof roles === "string") {
        const candidates = roles.split(/[\s,]+/).filter(Boolean);
        return candidates.find((candidate) => candidate.startsWith("ROLE_")) ?? candidates[0] ?? "";
    }
    if (Array.isArray(roles)) {
        const values = roles.map((role) => {
            if (typeof role === "string") return role;
            const item = asRecord(role);
            const name = firstValue(item, ["authority", "role", "name", "roleName", "role_name", "code"], "");
            return typeof name === "object" ? roleFrom({ role: name }) : String(name);
        }).filter(Boolean);
        return values.find((role) => role.startsWith("ROLE_")) ?? values[0] ?? "";
    }
    const nested = asRecord(firstValue(record, ["user", "principal", "account", "profile"], {}));
    if (nested !== record && Object.keys(nested).length) return roleFrom(nested);
    return "";
}

function userFromProfile(value: unknown, fallback: AuthUser): AuthUser {
    const root = asRecord(value);
    const nested = asRecord(firstValue(root, ["user", "principal", "account", "profile"], {}));
    const profile = Object.keys(nested).length ? nested : asRecord(itemFrom(value));
    return {
        id: String(firstValue(profile, ["id", "userId", "user_id", "sub"], fallback.id)),
        name: String(firstValue(profile, ["fullName", "full_name", "name", "username", "userName"], fallback.name)),
        email: String(firstValue(profile, ["email", "userEmail", "user_email"], fallback.email)),
        role: roleFrom(profile) || fallback.role,
        prisonId: String(firstValue(profile, ["prisonId", "prison_id"], "")) || null,
    };
}

export const authService = {
    currentUser: async (token: string, fallback: AuthUser) => {
        const { data } = await api.get("/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
        });
        return userFromProfile(data, fallback);
    },

    login: async (credentials: { username: string; password: string }) => {
        const response = await api.post("auth/login", {
            usernameOrEmail: credentials.username,
            password: credentials.password,
        });
        const root = asRecord(response.data);
        const data = asRecord(root.data);
        const result = asRecord(root.result);
        const item = asRecord(itemFrom(response.data));
        const sources = [root, data, result, item];
        const token = sources
            .map((source) =>
                String(firstValue(source, ["accessToken", "access_token", "token"], "")),
            )
            .find(Boolean) ?? "";
        if (!token) {
            throw new Error("The auth service returned an invalid login response.");
        }

        const claims = tokenClaims(token);
        const responseUser = [root.user, data.user, result.user, item.user, root.principal, data.principal, item]
            .map((value) => {
                const record = asRecord(value);
                const id = firstValue(record, ["id", "userId", "user_id", "sub"], "");
                const email = firstValue(record, ["email", "userEmail", "user_email"], "");
                const name = firstValue(
                    record,
                    ["name", "fullName", "full_name", "username", "userName", "preferred_username"],
                    email,
                );
                if (!String(id) && !String(name)) return undefined;
                return {
                    id: String(id || name),
                    name: String(name || id),
                    email: String(email),
                    role: roleFrom(record),
                    prisonId: String(firstValue(record, ["prisonId", "prison_id"], "")) || null,
                } satisfies AuthUser;
            })
            .find((candidate) => candidate !== undefined);

        const claimId = firstValue(claims, ["id", "userId", "user_id", "sub"], credentials.username);
        const claimName = firstValue(claims, ["name", "fullName", "full_name", "username", "preferred_username", "sub"], credentials.username);
        const resolvedRole = responseUser?.role || roleFrom(claims) || cachedUserRole(credentials.username) ||
            (credentials.username.trim().toLowerCase() === "admin" ? "SUPER ADMIN" : "");
        let user: AuthUser = responseUser ? { ...responseUser, role: resolvedRole } : {
            id: String(claimId || credentials.username),
            name: String(claimName || credentials.username),
            email: String(firstValue(claims, ["email", "userEmail", "user_email"], "")),
            role: resolvedRole,
            prisonId: String(firstValue(claims, ["prisonId", "prison_id"], "")) || null,
        };

        // Login payloads and JWTs may omit the prison assignment. The authenticated
        // profile endpoint is the source of truth for role and assigned prison.
        try {
            user = await authService.currentUser(token, user);
        } catch {
            // Keep login usable if profile hydration is unavailable; the UI will
            // explain that the assignment could not be loaded.
        }

        // Some API responses return only a JWT. If its claims omit the role,
        // try the authenticated user directory lookup to hydrate the UI role.
        if (!user.role) {
            try {
                const { data } = await api.get("/users", {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { search: credentials.username, page: 0, size: 100 },
                });
                const match = collectionFrom<unknown>(data)
                    .map(asRecord)
                    .find((record) => {
                        const username = String(firstValue(record, ["username", "userName", "user_name"], ""));
                        const email = String(firstValue(record, ["email", "userEmail", "user_email"], ""));
                        const id = String(firstValue(record, ["id", "userId", "user_id"], ""));
                        return [username, email, id].some((value) => value.toLowerCase() === credentials.username.trim().toLowerCase()) ||
                            (user.id && id === user.id);
                    });
                if (match) {
                    user = {
                        id: String(firstValue(match, ["id", "userId", "user_id"], user.id)),
                        name: String(firstValue(match, ["name", "fullName", "full_name", "username", "userName"], user.name)),
                        email: String(firstValue(match, ["email", "userEmail", "user_email"], user.email)),
                        role: roleFrom(match),
                        prisonId: String(firstValue(match, ["prisonId", "prison_id"], "")) || null,
                    };
                }
            } catch {
                // Authentication remains valid even if role hydration is restricted.
            }
        }

        if (user.role) cacheUserRoles([user]);
        if (["SUPER ADMIN", "ADMIN", "ADMINISTRATOR"].includes(user.role.replace(/^ROLE_/, "").replace(/_/g, " ").toUpperCase())) {
            try {
                const { data } = await api.get("/users", {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { page: 0, size: 100 },
                });
                cacheUserRoles(collectionFrom<unknown>(data));
            } catch {
                // Administrators without directory access still sign in normally.
            }
        }

        return {
            token,
            tokenType: String(
                firstValue(
                    sources.find((source) => source.tokenType || source.token_type) ?? {},
                    ["tokenType", "token_type"],
                    "Bearer",
                ),
            ),
            user,
        };
    },

    logout: async (token?: string): Promise<void> => {
        await api.post("/auth/logout", undefined, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
    },

    forgotPassword: async (email: string) => {
        await api.post("/auth/password/forgot", { userEmail: email });
    },

    resetPassword: async (code: string, newPassword: string) => {
        await api.post("/auth/password/reset", { code, newPassword });
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
        await api.post("/auth/password/change", { currentPassword, newPassword });
    },
};
