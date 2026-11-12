import api from "./axios";
import { asRecord, firstValue, itemFrom } from "./dataContract";
import type { AuthResponse, LoginCredentials } from "../context/AuthContext";

export const authService = {
    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        const response = await api.post("/auth/login", {
            usernameOrEmail: credentials.username,
            password: credentials.password,
        });
        const payload = asRecord(itemFrom(response.data));
        const user = asRecord(firstValue(payload, ["user", "account", "profile"], {}));
        return {
            token: String(firstValue(payload, ["accessToken", "access_token", "token"], "")),
            tokenType: String(firstValue(payload, ["tokenType", "token_type"], "Bearer")),
            user: Object.keys(user).length
                ? {
                    id: String(firstValue(user, ["id", "userId", "user_id"], "")),
                    name: String(firstValue(user, ["name", "fullName", "full_name"], credentials.username)),
                    email: String(firstValue(user, ["email", "emailAddress", "email_address"], "")),
                    role: String(firstValue(user, ["role", "roleName", "role_name"], "Authorized officer")),
                }
                : undefined,
        };
    },

    logout: async (): Promise<void> => {
        await api.post("/auth/logout");
    },

    forgotPassword: async (email: string): Promise<void> => {
        await api.post("/auth/password/forgot", { userEmail: email });
    },

    resetPassword: async (code: string, newPassword: string): Promise<void> => {
        await api.post("/auth/password/reset", { code, newPassword });
    },

    changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
        await api.post("/auth/password/change", { currentPassword, newPassword });
    },
};
