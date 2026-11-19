import api from "./axiosClient";

export type InmateRecord = Record<string, unknown> & { id: string | number };
export type DischargeEvent = Record<string, unknown>;
export type ClearanceChecklistItem = {
    id: string;
    title: string;
    description: string;
    completed: boolean;
};

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
    async getChecklist(
        inmateId: string,
        fallback: ClearanceChecklistItem[] = [],
    ): Promise<ClearanceChecklistItem[]> {
        const response = await api.get<ClearanceChecklistItem[] | null>(
            `/inmates/${encodeURIComponent(inmateId)}/clearance`,
        );
        return response.data ?? fallback;
    },
    async saveChecklist(
        inmateId: string,
        items: ClearanceChecklistItem[],
    ): Promise<ClearanceChecklistItem[]> {
        const response = await api.put<ClearanceChecklistItem[]>(
            `/inmates/${encodeURIComponent(inmateId)}/clearance`,
            { items },
        );
        return response.data;
    },
};

export const ReleaseDischargeService = releaseDischargeService;
