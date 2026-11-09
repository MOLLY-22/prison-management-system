import api from "./axios";

export type InmateRecord = Record<string, unknown> & { id: string | number };
export type DischargeEvent = Record<string, unknown>;

export const releaseDischargeService = {
    async getAllInmates(): Promise<InmateRecord[]> {
        const response = await api.get<InmateRecord[]>("/inmates");
        return response.data;
    },
    async getUserById(id: string): Promise<InmateRecord> {
        const response = await api.get<InmateRecord>(`/inmates/${encodeURIComponent(id)}`);
        return response.data;
    },
    async createInmate(inmateData: Record<string, unknown>): Promise<InmateRecord> {
        const response = await api.post<InmateRecord>("/inmates", inmateData);
        return response.data;
    },
    async updateInmate(id: string, changes: Record<string, unknown>): Promise<InmateRecord> {
        const response = await api.patch<InmateRecord>(`/inmates/${encodeURIComponent(id)}`, changes);
        return response.data;
    },
    async getAllDischargeEvents(): Promise<DischargeEvent[]> {
        const response = await api.get<DischargeEvent[]>("/discharge-events");
        return response.data;
    },
    async recordDischarge(eventData: Record<string, unknown>): Promise<DischargeEvent> {
        const response = await api.post<DischargeEvent>("/discharge-events", eventData);
        return response.data;
    },
    async getChecklist(inmateId: string): Promise<unknown[]> {
        const response = await api.get<unknown[]>(`/inmates/${encodeURIComponent(inmateId)}/clearance`);
        return response.data;
    },
    async saveChecklist(inmateId: string, items: unknown[]): Promise<unknown[]> {
        const response = await api.put<unknown[]>(`/inmates/${encodeURIComponent(inmateId)}/clearance`, { items });
        return response.data;
    },
};

export const ReleaseDischargeService = releaseDischargeService;
