import { asRecord, firstValue, itemFrom } from "./dataContract";
import api from "./axiosClient";
import type { AuthUser } from "../context/AuthContext.tsx";
import { normalizeRole } from "../config/rbas";

function authUserFrom(payload: unknown): AuthUser | undefined {
    const record = asRecord(itemFrom(payload));
    const id = firstValue(record, ["id", "userId", "user_id"], "");
    const email = firstValue(record, ["email", "userEmail", "user_email"], "");
    const name = firstValue(
        record,
        ["name", "fullName", "full_name", "username", "userName"],
        email,
    );

    if (!String(id) || !String(name)) return undefined;

    return {
        id: String(id),
        name: String(name),
        email: String(email),
        role: normalizeRole(
            String(firstValue(record, ["role", "userRole", "user_role"], "")),
        ),
        ...(record.prisonId || record.prison_id
            ? { prisonId: String(record.prisonId ?? record.prison_id) }
            : {}),
        ...(record.prisonName || record.prison_name
            ? { prisonName: String(record.prisonName ?? record.prison_name) }
            : {}),
    };
}

function decodeTokenClaims(token: string) {
    const payload = token.split(".")[1];
    if (!payload) return {};
    try {
        const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        return asRecord(JSON.parse(new TextDecoder().decode(bytes)) as unknown);
    } catch {
        return {};
    }
}

function roleValue(value: unknown): string {
    if (typeof value === "string") return value.trim();
    if (Array.isArray(value)) {
        return value.map(roleValue).find(Boolean) ?? "";
    }
    const record = asRecord(value);
    for (const key of ["role", "roleName", "role_name", "authority", "name", "authorities", "roles", "realm_access"]) {
        const candidate = roleValue(record[key]);
        if (candidate) return candidate;
    }
    return "";
}

function roleFrom(record: Record<string, unknown>) {
    const role = roleValue(firstValue(record, [
        "role", "userRole", "user_role", "roleName", "role_name", "roles", "authorities", "realm_access",
    ], ""));
    if (role) return role;
    const scope = firstValue(record, ["scope", "scopes"], "");
    return roleValue(scope).split(/\s+/).find((value) => /^ROLE_/i.test(value)) ?? "";
}

function userFromToken(token: string): AuthUser | null {
    const claims = decodeTokenClaims(token);
    const role = normalizeRole(roleFrom(claims));
    if (!role) return null;
    const email = String(firstValue(claims, ["email", "userEmail", "user_email", "mail"], ""));
    const id = String(firstValue(claims, ["id", "userId", "user_id", "sub", "uid"], ""));
    const name = String(firstValue(
        claims,
        ["name", "fullName", "full_name", "username", "userName", "preferred_username"],
        email || id || "Authorized officer",
    ));
    return {
        id: id || name,
        name,
        email,
        role,
        prisonId: firstValue(claims, ["prisonId", "prison_id", "facilityId", "facility_id"], null) as string | null,
        prisonName: firstValue(claims, ["prisonName", "prison_name", "facilityName", "facility_name"], null) as string | null,
    };
}

function userFromProfile(value: unknown, fallback: AuthUser): AuthUser {
    const root = asRecord(itemFrom(value));
    const nested = asRecord(firstValue(root, ["user", "principal", "account", "profile"], {}));
    const profile = Object.keys(nested).length ? nested : root;
    const prisonValue = firstValue(profile, ["prison", "facility"], {});
    const prison = asRecord(prisonValue);
    const profileRole = roleFrom(profile);
    return {
        id: String(firstValue(profile, ["id", "userId", "user_id", "sub", "uid"], fallback.id)),
        name: String(firstValue(profile, ["fullName", "full_name", "name", "username", "userName"], fallback.name)),
        email: String(firstValue(profile, ["email", "userEmail", "user_email", "mail"], fallback.email)),
        role: profileRole ? normalizeRole(profileRole) : fallback.role,
        prisonId: firstValue(profile, ["prisonId", "prison_id", "facilityId", "facility_id"], firstValue(prison, ["id", "prisonId", "prison_id"], fallback.prisonId ?? null)) as string | null,
        prisonName: firstValue(profile, ["prisonName", "prison_name", "facilityName", "facility_name"], typeof prisonValue === "string" ? prisonValue : firstValue(prison, ["name", "prisonName", "prison_name"], fallback.prisonName ?? null)) as string | null,
    };
}

export const authService = {
    userFromToken,
    currentUser: async (token: string, fallback: AuthUser): Promise<AuthUser> => {
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
        const tokenClaims = decodeTokenClaims(token);

        let user: AuthUser | undefined = [root.user, data.user, result.user, item.user, item, tokenClaims]
            .map((value) => {
                const record = asRecord(value);
                if (Object.keys(record).length === 0) return undefined;
                const id = firstValue(record, ["id", "userId", "user_id", "sub", "uid"], "");
                const email = firstValue(record, ["email", "userEmail", "user_email", "mail"], "");
                const name = firstValue(
                    record,
                    ["name", "fullName", "full_name", "username", "userName", "preferred_username"],
                    email || id,
                );
                const role = roleFrom(record) || roleFrom(tokenClaims);
                if ((!String(id) || !String(name)) && !role) return undefined;
                const userId = String(id || name || "authenticated-user");
                const userName = String(name || id || "Authorized officer");
                const facility = firstValue(record, ["facility"], "");
                const prison = asRecord(firstValue(record, ["prison"], facility));
                return {
                    id: userId,
                    name: userName,
                    email: String(email),
                    role: normalizeRole(role),
                    prisonId: firstValue(
                        record,
                        ["prisonId", "prison_id", "facilityId", "facility_id"],
                        firstValue(prison, ["id", "prisonId", "prison_id"], null),
                    ) as string | null,
                    prisonName: firstValue(
                        record,
                        ["prisonName", "prison_name", "facilityName", "facility_name"],
                        typeof facility === "string" && facility
                            ? facility
                            : firstValue(prison, ["name", "prisonName", "prison_name"], null),
                    ) as string | null,
                } satisfies AuthUser;
            })
            .find((candidate) => candidate !== undefined);

        user ??= userFromToken(token) ?? undefined;
        if (user) {
            try {
                user = await authService.currentUser(token, user);
            } catch {
                // Keep sign-in usable if profile hydration is unavailable.
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
            ...(user ? { user } : {}),
        };
    },

    logout: async (token?: string): Promise<void> => {
        await api.post("/auth/logout", undefined, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
    },
    
    me: async (token: string): Promise<AuthUser> => {
        const response = await api.get("/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
        });
        const user = authUserFrom(response.data);
        if (!user) {
            throw new TypeError("Unexpected auth/me response. The user profile is missing an id or name.");
        }
        return user;
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

    refresh: async (token: string) => {
        const response = await api.post(
            "/auth/refresh",
            undefined,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        return response.data;
    },
};
