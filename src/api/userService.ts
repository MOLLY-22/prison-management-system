import api from "./axios";
import { asRecord, collectionFrom, firstValue, itemFrom } from "./dataContract";

export type UserRole =
    | "Super Admin"
    | "Records Officer"
    | "Disciplinary Officer"
    | "Case Officer"
    | "Visitor Officer"
    | "Rehabilitation Officer"
    | "Instructor"
    | "Medical Officer"
    | "Duty Officer";

export type User = {
    id: string;
    name: string;
    badgeId: string;
    role: UserRole | string;
    status: "Active" | "Inactive";
    email?: string;
    username?: string;
    prisonId?: string | null;
    prisonName?: string | null;
    facility?: string;
    permissions?: string[];
    createdAt?: string;
    updatedAt?: string;
};

export type UserListParams = {
    status?: "active" | "inactive";
    role?: string;
    search?: string;
    page?: number;
    size?: number;
    sort?: string[];
};

export type CreateUserRequest = {
    fullName: string;
    username: string;
    email?: string | null;
    password: string;
    role: string;
    prisonId?: string | null;
};

export type UpdateUserRequest = Partial<Omit<CreateUserRequest, "password">> & {
    permissions?: string[];
};

function userDetails(user: Partial<User> & { name?: string; fullname?: string }): UpdateUserRequest {
    const details: UpdateUserRequest = {};
    if (user.name !== undefined || user.fullname !== undefined) {
        details.fullName = user.name ?? user.fullname ?? "";
    }
    if (user.username !== undefined || user.badgeId !== undefined) {
        details.username = user.username ?? user.badgeId ?? "";
    }
    if (user.email !== undefined) details.email = user.email;
    if (user.role !== undefined) details.role = user.role;
    if (user.prisonId !== undefined) details.prisonId = user.prisonId;
    if (user.permissions !== undefined) details.permissions = user.permissions;
    return details;
}

export const userService = {
    // GET /api/v1/users
    async getUsers(params?: UserListParams): Promise<User[]> {
        const response = await api.get("/users", { params });
        return collectionFrom(response.data).map(normalizeUser);
    },

    async getUser(id: string): Promise<User> {
        const response = await api.get(`/users/${encodeURIComponent(id)}`);
        return normalizeUser(itemFrom(response.data));
    },

    // POST /api/v1/users
    async createUser(userData: CreateUserRequest | (Omit<User, "id"> & { password?: string; fullName?: string })): Promise<User> {
        const fullName = "fullName" in userData && userData.fullName
            ? userData.fullName
            : "name" in userData ? userData.name : "";
        const username = userData.username ?? ("badgeId" in userData ? userData.badgeId : "");
        const response = await api.post("/users", {
            fullName,
            username,
            email: userData.email || undefined,
            password: userData.password,
            role: userData.role,
            prisonId: userData.prisonId,
        });
        return normalizeUser(itemFrom(response.data));
    },

    // PATCH /api/v1/users/{userId}
    async updateUserRole(id: string, newRole: string): Promise<User> {
        return this.updateUser({ id, role: newRole });
    },

    async updateUser(userData: Partial<User> & Pick<User, "id">): Promise<User> {
        const response = await api.patch(
            `/users/${encodeURIComponent(userData.id)}`,
            userDetails(userData),
        );
        return normalizeUser(itemFrom(response.data));
    },

    async setUserStatus(id: string, active: boolean): Promise<User> {
        const response = await api.patch(`/users/${encodeURIComponent(id)}/${active ? "reactivate" : "deactivate"}`);
        return normalizeUser(itemFrom(response.data));
    },
};

function normalizeUser(payload: unknown): User {
    const record = asRecord(payload);
    const status = String(firstValue(record, ["status"], "ACTIVE")).toUpperCase();
    const prisonName = firstValue(record, ["prisonName", "prison_name"], undefined) as string | undefined;
    return {
        id: String(firstValue(record, ["id", "userId", "user_id"], "")),
        name: String(firstValue(record, ["fullName", "full_name", "name"], "")),
        badgeId: String(firstValue(record, ["username", "badgeId", "badge_id"], "")),
        role: String(firstValue(record, ["role", "roleName", "role_name"], "")),
        facility: String(firstValue(record, ["facility", "facilityName", "facility_name"], prisonName ?? "")),
        status: status === "ACTIVE" ? "Active" : "Inactive",
        email: firstValue(record, ["email", "emailAddress", "email_address"], undefined) as string | undefined,
        permissions: Array.isArray(record.permissions) ? record.permissions as string[] : [],
        username: String(firstValue(record, ["username", "badgeId", "badge_id"], "")),
        prisonId: firstValue(record, ["prisonId", "prison_id"], null) as string | null,
        prisonName: prisonName ?? null,
        createdAt: firstValue(record, ["createdAt", "created_at"], undefined) as string | undefined,
        updatedAt: firstValue(record, ["updatedAt", "updated_at"], undefined) as string | undefined,
    };
}
