import api from "./axios";
import { asRecord, collectionFrom, firstValue, itemFrom } from "./dataContract";

export type User = {
    id: string;
    name: string;
    badgeId: string;
    role: string;
    facility: string;
    status: string;
    email?: string;
    permissions?: string[];
    username?: string;
};

type UserDetails = {
    fullName: string;
    username: string;
    email?: string | null;
    role: string;
    permissions?: string[];
};

function userDetails(user: Partial<User> & { id?: string }): UserDetails {
    return {
        fullName: String(user.name || ""),
        username: String(user.username || user.badgeId || ""),
        email: user.email || null,
        role: String(user.role || ""),
        permissions: user.permissions || [],
    };
}

export const userService = {
    async getUsers(): Promise<User[]> {
        const response = await api.get("/users");
        return collectionFrom(response.data).map(normalizeUser);
    },

    async createUser(userData: Omit<User, "id"> & { password?: string }): Promise<User> {
        const response = await api.post("/users", {
            fullName: userData.name,
            username: userData.username || userData.badgeId,
            email: userData.email || undefined,
            password: userData.password,
            role: userData.role,
        });
        return normalizeUser(itemFrom(response.data));
    },

    async updateUserRole(id: string, newRole: string): Promise<User> {
        return this.updateUser({ id, role: newRole });
    },

    async updateUser(userData: Partial<User> & Pick<User, "id">): Promise<User> {
        const response = await api.patch(`/users/${encodeURIComponent(userData.id)}`, userDetails(userData));
        return normalizeUser(itemFrom(response.data));
    },

    async setUserStatus(id: string, active: boolean): Promise<User> {
        const response = await api.patch(`/users/${encodeURIComponent(id)}/${active ? "reactivate" : "deactivate"}`);
        return normalizeUser(itemFrom(response.data));
    },
};

function normalizeUser(payload: unknown): User {
    const record = asRecord(payload);
    return {
        id: String(firstValue(record, ["id", "userId", "user_id"], "")),
        name: String(firstValue(record, ["fullName", "full_name", "name"], "")),
        badgeId: String(firstValue(record, ["username", "badgeId", "badge_id"], "")),
        role: String(firstValue(record, ["role", "roleName", "role_name"], "")),
        facility: String(firstValue(record, ["facility", "facilityName", "facility_name", "sector"], "")),
        status: String(firstValue(record, ["status", "accountStatus", "account_status"], "ACTIVE")).toUpperCase() === "ACTIVE" ? "Active" : "Inactive",
        email: firstValue(record, ["email", "emailAddress", "email_address"], undefined) as string | undefined,
        permissions: Array.isArray(record.permissions) ? record.permissions as string[] : [],
        username: String(firstValue(record, ["username", "badgeId", "badge_id"], "")),
    };
}
