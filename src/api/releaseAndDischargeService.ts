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
    getAllInmates: async (): Promise<InmateRecord[]> => {
        const response = await api.get<InmateRecord[]>("/inmates");
        return response.data;
    },
    getUserById: async (id: string): Promise<InmateRecord> => {
        const response = await api.get<InmateRecord>(`/inmates/${encodeURIComponent(id)}`);
        return response.data;
    },
    createInmate: async (inmateData: Record<string, unknown>): Promise<InmateRecord> => {
        const response = await api.post<InmateRecord>("/inmates", inmateData);
        return response.data;
    },
    updateInmate: async (id: string, changes: Record<string, unknown>): Promise<InmateRecord> => {
        const response = await api.patch<InmateRecord>(`/inmates/${encodeURIComponent(id)}`, changes);
        return response.data;
    },
    getAllDischargeEvents: async (): Promise<DischargeEvent[]> => {
        const response = await api.get<DischargeEvent[]>("/discharge-events");
        return response.data;
    },
    recordDischarge: async (eventData: Record<string, unknown>): Promise<DischargeEvent> => {
        const response = await api.post<DischargeEvent>("/discharge-events", eventData);
        return response.data;
    },
    getChecklist: async (
        inmateId: string,
        fallback: ClearanceChecklistItem[] = [],
    ): Promise<ClearanceChecklistItem[]> => {
        const response = await api.get<ClearanceChecklistItem[] | null>(
            `/inmates/${encodeURIComponent(inmateId)}/clearance`,
        );
        return response.data ?? fallback;
    },
    saveChecklist: async (
        inmateId: string,
        items: ClearanceChecklistItem[],
    ): Promise<ClearanceChecklistItem[]> => {
        const response = await api.put<ClearanceChecklistItem[] | null>(
            `/inmates/${encodeURIComponent(inmateId)}/clearance`,
            { items },
        );
        return response.data ?? items;
    },
};

export const ReleaseDischargeService = releaseDischargeService;
