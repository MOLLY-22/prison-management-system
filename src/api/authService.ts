import { asRecord, firstValue, itemFrom } from "./dataContract";
import api from "./axiosClient";

export const authService = {
    login: async (credentials: { username: string; password: string }) => {
        const response = await api.post("auth/login", {
            usernameOrEmail: credentials.username,
            password: credentials.password,
        });
        const payload = asRecord(itemFrom(response.data));
        const token = String(firstValue(payload, ["accessToken", "access_token", "token"], ""));
        if (!token) {
            throw new Error("The auth service returned an invalid login response.");
        }
        return {
            token,
            tokenType: String(firstValue(payload, ["tokenType", "token_type"], "Bearer")),
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
