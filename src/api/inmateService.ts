import api from "./axios";
import { asRecord, collectionFrom, firstValue, itemFrom } from "./dataContract";

export type Inmate = {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    admissionDate: string;
    offence: string;
    sentenceStartDate: string;
    sentenceEndDate: string;
    cellId: string;
    createdAt?: string;
    updatedAt?: string;
};

export type InmateRequest = {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    admissionDate: string;
    offence: string;
    sentenceStartDate: string;
    sentenceEndDate: string;
    cellId: string;
};

export type Cell = {
    id: string;
    name: string;
    capacity: number;
    currentOccupancy: number;
    availableSpaces: number;
};

export const inmateService = {
    async getInmates(params?: { search?: string; page?: number; size?: number }): Promise<Inmate[]> {
        const response = await api.get("/inmates", { params });
        return collectionFrom(response.data).map(normalizeInmate);
    },
    async createInmate(payload: InmateRequest): Promise<Inmate> {
        const response = await api.post("/inmates", payload);
        return normalizeInmate(itemFrom(response.data));
    },
    async updateInmate(id: string, payload: Partial<InmateRequest>): Promise<Inmate> {
        const response = await api.patch(`/inmates/${encodeURIComponent(id)}`, payload);
        return normalizeInmate(itemFrom(response.data));
    },
    async getCells(params?: { blockName?: string; page?: number; size?: number }): Promise<Cell[]> {
        const response = await api.get("/cells", { params });
        return collectionFrom(response.data).map(normalizeCell);
    },
};

export function normalizeInmate(payload: unknown): Inmate {
    const record = asRecord(payload);
    return {
        id: String(firstValue(record, ["id", "inmateId"], "")),
        firstName: String(firstValue(record, ["firstName", "first_name"], "")),
        lastName: String(firstValue(record, ["lastName", "last_name"], "")),
        dateOfBirth: String(firstValue(record, ["dateOfBirth", "date_of_birth"], "")),
        gender: String(firstValue(record, ["gender"], "")),
        admissionDate: String(firstValue(record, ["admissionDate", "admission_date"], "")),
        offence: String(firstValue(record, ["offence", "offense"], "")),
        sentenceStartDate: String(firstValue(record, ["sentenceStartDate", "sentence_start_date"], "")),
        sentenceEndDate: String(firstValue(record, ["sentenceEndDate", "sentence_end_date"], "")),
        cellId: String(firstValue(record, ["cellId", "cell_id"], "")),
        createdAt: firstValue(record, ["createdAt", "created_at"], undefined) as string | undefined,
        updatedAt: firstValue(record, ["updatedAt", "updated_at"], undefined) as string | undefined,
    };
}

function normalizeCell(payload: unknown): Cell {
    const record = asRecord(payload);
    return {
        id: String(firstValue(record, ["id", "cellId", "cell_id"], "")),
        name: String(firstValue(record, ["name", "cellName", "cell_name"], "")),
        capacity: Number(firstValue(record, ["capacity"], 0)),
        currentOccupancy: Number(firstValue(record, ["currentOccupancy", "current_occupancy"], 0)),
        availableSpaces: Number(firstValue(record, ["availableSpaces", "available_spaces"], 0)),
    };
}
