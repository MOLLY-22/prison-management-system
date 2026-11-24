import { asRecord, firstValue, itemFrom } from "./dataContract";
import api from "./axiosClient";
import type { AuthUser } from "../context/AuthContext";

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
        role: String(
            firstValue(record, ["role", "userRole", "user_role"], "Authorized officer"),
        ),
        ...(record.prisonId || record.prison_id
            ? { prisonId: String(record.prisonId ?? record.prison_id) }
            : {}),
        ...(record.prisonName || record.prison_name
            ? { prisonName: String(record.prisonName ?? record.prison_name) }
            : {}),
    };
}

export const authService = {
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

        const user = [root.user, data.user, result.user, item.user, item]
            .map(authUserFrom)
            .find((candidate) => candidate !== undefined);

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
