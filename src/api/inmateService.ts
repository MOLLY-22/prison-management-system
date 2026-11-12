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
    prisonId: string;
    prisonName: string;
    sentenceDurationValue?: number;
    sentenceDurationUnit?: string;
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
    prisonId: string;
    cellId: string;
};

export type UpdateInmateRequest = Partial<
    Pick<InmateRequest, "firstName" | "lastName" | "dateOfBirth" | "gender" | "admissionDate">
>;

export type Cell = {
    id: string;
    name: string;
    prisonId: string;
    blockId: string;
    blockName: string;
    cellNumber: number;
    capacity: number;
    currentOccupancy: number;
    availableSpaces: number;
};

export type InmateListParams = {
    search?: string;
    gender?: string;
    page?: number;
    size?: number;
    sort?: string[];
};

export type CellListParams = {
    blockName?: string;
    prisonId?: string;
    blockId?: string;
    page?: number;
    size?: number;
    sort?: string[];
};

export type CellAllocation = {
    inmateId: string;
    oldCellId: string;
    newCellId: string;
    allocatedAt: string;
    oldCellOccupancy: number;
    newCellOccupancy: number;
};

export const inmateService = {
    async getInmates(params?: InmateListParams): Promise<Inmate[]> {
        const response = await api.get("/inmates", { params });
        return collectionFrom(response.data).map(normalizeInmate);
    },
    async createInmate(payload: InmateRequest): Promise<Inmate> {
        const response = await api.post("/inmates", payload);
        return normalizeInmate(itemFrom(response.data));
    },
    async updateInmate(id: string, payload: UpdateInmateRequest): Promise<Inmate> {
        const response = await api.patch(`/inmates/${encodeURIComponent(id)}`, payload);
        return normalizeInmate(itemFrom(response.data));
    },

    async getInmate(id: string): Promise<Inmate> {
        const response = await api.get(`/inmates/${encodeURIComponent(id)}`);
        return normalizeInmate(itemFrom(response.data));
    },

    async getCells(params?: CellListParams): Promise<Cell[]> {
        const response = await api.get("/cells", { params });
        return collectionFrom(response.data).map(normalizeCell);
    },

    async getCell(id: string): Promise<Cell> {
        const response = await api.get(`/cells/${encodeURIComponent(id)}`);
        return normalizeCell(itemFrom(response.data));
    },

    async allocateCell(inmateId: string, cellId: string): Promise<CellAllocation> {
        const response = await api.put(
            `/inmates/${encodeURIComponent(inmateId)}/cell-allocation`,
            { cellId },
        );
        const record = asRecord(itemFrom(response.data));
        return {
            inmateId: String(firstValue(record, ["inmateId", "inmate_id"], inmateId)),
            oldCellId: String(firstValue(record, ["oldCellId", "old_cell_id"], "")),
            newCellId: String(firstValue(record, ["newCellId", "new_cell_id"], "")),
            allocatedAt: String(firstValue(record, ["allocatedAt", "allocated_at"], "")),
            oldCellOccupancy: Number(firstValue(record, ["oldCellOccupancy", "old_cell_occupancy"], 0)),
            newCellOccupancy: Number(firstValue(record, ["newCellOccupancy", "new_cell_occupancy"], 0)),
        };
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
        prisonId: String(firstValue(record, ["prisonId", "prison_id"], "")),
        prisonName: String(firstValue(record, ["prisonName", "prison_name"], "")),
        sentenceDurationValue: Number(firstValue(record, ["sentenceDurationValue", "sentence_duration_value"], 0)),
        sentenceDurationUnit: String(firstValue(record, ["sentenceDurationUnit", "sentence_duration_unit"], "")),
        createdAt: firstValue(record, ["createdAt", "created_at"], undefined) as string | undefined,
        updatedAt: firstValue(record, ["updatedAt", "updated_at"], undefined) as string | undefined,
    };
}

function normalizeCell(payload: unknown): Cell {
    const record = asRecord(payload);
    return {
        id: String(firstValue(record, ["id", "cellId", "cell_id"], "")),
        name: String(firstValue(record, ["name", "cellName", "cell_name"], "")),
        prisonId: String(firstValue(record, ["prisonId", "prison_id"], "")),
        blockId: String(firstValue(record, ["blockId", "block_id"], "")),
        blockName: String(firstValue(record, ["blockName", "block_name"], "")),
        cellNumber: Number(firstValue(record, ["cellNumber", "cell_number"], 0)),
        capacity: Number(firstValue(record, ["capacity"], 0)),
        currentOccupancy: Number(firstValue(record, ["currentOccupancy", "current_occupancy"], 0)),
        availableSpaces: Number(firstValue(record, ["availableSpaces", "available_spaces"], 0)),
    };
}
