import api from "./axiosClient";
import { asBoolean, asRecord, collectionFrom, firstValue, itemFrom, requiredIdentifier } from "./dataContract";


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

export interface User {
    id: string;
    name: string;
    role: UserRole | string;
    status: "Active" | "Inactive";
    email?: string;
    username?: string;
    badgeId?: string;
    facility?: string;
    prisonId?: string | null;
    prisonName?: string | null;
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



export const userService = {
    // GET /api/v1/users
    getUsers: async (): Promise<User[]> => {
        const response = await api.get("/users");
        return collectionFrom(response.data).map(normalizeUser);
    },

    getUser: async (id: string): Promise<User> => {
        const response = await api.get(`/users/${id}`);
        return normalizeUser(itemFrom(response.data));
    },

    // POST /api/v1/users
    createUser: async (userData: {
        fullName: string;
        username: string;
        email: string;
        password: string;
        role: string;
        prisonId?: string;
    }): Promise<User> => {
        const response = await api.post("/users", userData);
        return normalizeUser(itemFrom(response.data));
    },

    // PATCH /api/v1/users/{userId}
    async updateUserRole(id: string, newRole: string): Promise<User> {
        return this.updateUser(id, { role: newRole });
    },

    updateUser: async (id: string, updates: Partial<User>): Promise<User> => {
        const response = await api.patch(`/users/${id}`, updates);
        return normalizeUser(itemFrom(response.data));
    },

    async setUserStatus(id: string, active: boolean): Promise<User> {
        const response = await api.patch(`/users/${id}/${active ? "reactivate" : "deactivate"}`);
        if (response.status === 204 || !response.data) {
            return this.getUser(id);
        }
        return normalizeUser(itemFrom(response.data));
    }
};

function normalizeUser(payload: unknown): User {
    const record = asRecord(payload);
    const id = requiredIdentifier(record, ["id", "userId", "user_id"], "user");
    const username = String(firstValue(record, ["username", "userName", "user_name"], ""));
    const badgeId = String(firstValue(record, ["badgeId", "badge_id"], username));
    const facility = firstValue(record, ["facility"], "");
    const prison = asRecord(firstValue(record, ["prison"], facility));
    const rawStatus = String(firstValue(record, ["status", "accountStatus", "account_status"], ""))
        .trim()
        .toLowerCase();
    const isActive = rawStatus
        ? ["active", "enabled"].includes(rawStatus)
        : asBoolean(firstValue(record, ["active", "isActive", "is_active"], true), true);
    const prisonName = String(firstValue(
        record,
        ["prisonName", "prison_name"],
        typeof facility === "string" ? facility : firstValue(prison, ["name"], ""),
    ));

    return {
        id,
        name: String(firstValue(record, ["name", "fullName", "full_name"], username)),
        role: String(firstValue(record, ["role", "userRole", "user_role"], "")),
        status: isActive ? "Active" : "Inactive",
        email: String(firstValue(record, ["email"], "")),
        username,
        badgeId,
        facility: prisonName,
        prisonId: firstValue(record, ["prisonId", "prison_id"], null) as string | null,
        prisonName,
        createdAt: firstValue(record, ["createdAt", "created_at"], undefined) as string | undefined,
        updatedAt: firstValue(record, ["updatedAt", "updated_at"], undefined) as string | undefined,
    };
}

