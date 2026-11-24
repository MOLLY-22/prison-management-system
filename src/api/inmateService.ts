import api from "./axiosClient";
import { asRecord, collectionFrom, fetchAllPages, firstValue, itemFrom, requiredIdentifier } from "./dataContract";

export type Inmate = {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    admissionDate: string;
    inmateType: "REMAND" | "SENTENCED";
    bio: string;
    expectedCourtDate?: string;
    cellId: string;
    prisonId: string;
    prisonName: string;
    createdAt?: string;
    updatedAt?: string;
};

export type InmateRequest = {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    admissionDate: string;
    inmateType: "REMAND" | "SENTENCED";
    bio: string;
    medicalHistory: string;
    nextOfKinName: string;
    nextOfKinRelationship: string;
    nextOfKinPhone: string;
    cellId: string;
    expectedCourtDate?: string;
    nextOfKinEmail?: string;
    contactPhone?: string;
    contactEmail?: string;
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
        const query = { size: 100, ...params };
        if (params?.page !== undefined) {
            const response = await api.get("/inmates", { params: query });
            return collectionFrom(response.data).map(normalizeInmate);
        }
        const records = await fetchAllPages<unknown>((page) =>
            api.get("/inmates", { params: { ...query, page } }).then(({ data }) => data),
        );
        return records.map(normalizeInmate);
    },
    async createInmate(payload: InmateRequest): Promise<Inmate> {
        const response = await api.post("/inmates", payload);
        return normalizeInmate(itemFrom(response.data));
    },
    async createInmateWithPhoto(payload: InmateRequest, photo: File): Promise<Inmate> {
        const body = new FormData();
        body.append("inmate", new Blob([JSON.stringify(payload)], { type: "application/json" }));
        body.append("photo", photo);
        const response = await api.post("/inmates", body, {
            headers: { "Content-Type": "multipart/form-data" },
        });
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
        const query = { size: 100, ...params };
        if (params?.page !== undefined) {
            const response = await api.get("/cells", { params: query });
            return collectionFrom(response.data).map(normalizeCell);
        }
        const records = await fetchAllPages<unknown>((page) =>
            api.get("/cells", { params: { ...query, page } }).then(({ data }) => data),
        );
        return records.map(normalizeCell);
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
    const id = requiredIdentifier(record, ["id", "inmateId", "inmate_id"], "inmate");
    const inmateType = String(firstValue(record, ["inmateType", "inmate_type"], "")).toUpperCase();
    if (inmateType !== "REMAND" && inmateType !== "SENTENCED") {
        throw new TypeError("Unexpected inmate response. The inmate type is missing or unsupported.");
    }
    return {
        id,
        firstName: String(firstValue(record, ["firstName", "first_name"], "")),
        lastName: String(firstValue(record, ["lastName", "last_name"], "")),
        dateOfBirth: String(firstValue(record, ["dateOfBirth", "date_of_birth"], "")),
        gender: String(firstValue(record, ["gender"], "")),
        admissionDate: String(firstValue(record, ["admissionDate", "admission_date"], "")),
        inmateType,
        bio: String(firstValue(record, ["bio"], "")),
        expectedCourtDate: firstValue(record, ["expectedCourtDate", "expected_court_date"], undefined) as string | undefined,
        cellId: String(firstValue(record, ["cellId", "cell_id"], "")),
        prisonId: String(firstValue(record, ["prisonId", "prison_id"], "")),
        prisonName: String(firstValue(record, ["prisonName", "prison_name"], "")),
        createdAt: firstValue(record, ["createdAt", "created_at"], undefined) as string | undefined,
        updatedAt: firstValue(record, ["updatedAt", "updated_at"], undefined) as string | undefined,
    };
}

function normalizeCell(payload: unknown): Cell {
    const record = asRecord(payload);
    const capacity = Number(firstValue(record, ["capacity"], 0));
    const currentOccupancy = Number(firstValue(record, ["currentOccupancy", "current_occupancy"], 0));
    return {
        id: String(firstValue(record, ["id", "cellId", "cell_id"], "")),
        name: String(firstValue(record, ["name", "cellName", "cell_name"], "")),
        prisonId: String(firstValue(record, ["prisonId", "prison_id"], "")),
        blockId: String(firstValue(record, ["blockId", "block_id"], "")),
        blockName: String(firstValue(record, ["blockName", "block_name"], "")),
        cellNumber: Number(firstValue(record, ["cellNumber", "cell_number"], 0)),
        capacity,
        currentOccupancy,
        availableSpaces: Math.max(0, Number(firstValue(record, ["availableSpaces", "available_spaces"], capacity - currentOccupancy))),
    };
}
