import { asRecord, firstValue, itemFrom } from "./dataContract";
import api from "./axiosClient";
import type { AuthUser } from "../context/AuthContext";

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
            .map((value) => {
                const record = asRecord(value);
                const id = firstValue(record, ["id", "userId", "user_id"], "");
                const email = firstValue(record, ["email", "userEmail", "user_email"], "");
                const name = firstValue(
                    record,
                    ["name", "fullName", "full_name", "username", "userName"],
                    email,
                );
                if (!String(id) || !String(name)) return undefined;
                const facility = firstValue(record, ["facility"], "");
                const prison = asRecord(firstValue(record, ["prison"], facility));
                return {
                    id: String(id),
                    name: String(name),
                    email: String(email),
                    role: String(
                        firstValue(record, ["role", "userRole", "user_role"], "Authorized officer"),
                    ),
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
