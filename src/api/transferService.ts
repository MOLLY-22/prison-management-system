import api from "./axios";

export const transferService = {
    
    // GET /api/v1/transfers
    async getTransfers(): Promise<User[]> {
        const response = await api.get("/users");
        return collectionFrom(response.data).map(normalizeUser);
    },

    // POST /api/v1/users
    async createTransfer(userData: Omit<User, "id"> & { password?: string }): Promise<User> {
        const response = await api.post("/transfer", {
            fullName: userData.name,
            username: userData.username || userData.badgeId,
            email: userData.email || undefined,
            password: userData.password,
            role: userData.role,
            prisonId: userData.prisonId
        });
        return normalizeUser(itemFrom(response.data));
    },

    // PATCH /api/v1/users/{userId}
    async approveTransfer(id: string, newRole: string): Promise<User> {
        return this.updateUser({ id, role: newRole as role });
    },



    async rejectTransfer(userData: Partial<User> & Pick<User, "id">): Promise<User> {
        const response = await api.patch(`/users/${encodeURIComponent(userData.id)}`, userDetails(userData));
        return normalizeUser(itemFrom(response.data));
    },

    // active or deactivated
    async cancelTransfer(id: string, active: boolean): Promise<User> {
        const response = await api.patch(`/users/${encodeURIComponent(id)}/${active ? "reactivate" : "deactivate"}`);
        return normalizeUser(itemFrom(response.data));
    },
};
