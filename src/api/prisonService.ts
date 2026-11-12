import api from "./axios";
import { asBoolean, asRecord, collectionFrom, firstValue, itemFrom } from "./dataContract";

export type PrisonCell = {
    id: string;
    prisonId: string;
    blockId: string;
    blockName: string;
    cellNumber: number;
    name: string;
    capacity: number;
    currentOccupancy: number;
    availableSpaces: number;
};

export type PrisonBlock = {
    id: string;
    name: string;
    cells: PrisonCell[];
};

export type Prison = {
    id: string;
    name: string;
    location: string;
    active: boolean;
    blocks: PrisonBlock[];
};

export type PrisonCellInput = {
    cellNumber: number;
    capacity: number;
};

export type PrisonBlockInput = {
    name: string;
    cells: PrisonCellInput[];
};

export type CreatePrisonRequest = {
    name: string;
    location?: string;
    blocks: PrisonBlockInput[];
};

export type UpdatePrisonRequest = {
    name: string;
    location?: string;
};

export type PrisonListParams = {
    search?: string;
    active?: boolean;
    page?: number;
    size?: number;
    sort?: string[];
};

export const prisonService = {
    async getPrisons(params?: PrisonListParams): Promise<Prison[]> {
        const response = await api.get("/prisons", { params });
        return collectionFrom(response.data).map(normalizePrison);
    },

    async getPrison(id: string): Promise<Prison> {
        const response = await api.get(`/prisons/${encodeURIComponent(id)}`);
        return normalizePrison(itemFrom(response.data));
    },

    async createPrison(payload: CreatePrisonRequest): Promise<Prison> {
        const response = await api.post("/prisons", payload);
        return normalizePrison(itemFrom(response.data));
    },

    async updatePrison(id: string, payload: UpdatePrisonRequest): Promise<Prison> {
        const response = await api.patch(`/prisons/${encodeURIComponent(id)}`, payload);
        return normalizePrison(itemFrom(response.data));
    },

    async addBlock(prisonId: string, payload: PrisonBlockInput): Promise<PrisonBlock> {
        const response = await api.post(
            `/prisons/${encodeURIComponent(prisonId)}/blocks`,
            payload,
        );
        return normalizeBlock(itemFrom(response.data), prisonId);
    },

    async updateBlock(
        prisonId: string,
        blockId: string,
        payload: Partial<PrisonBlockInput>,
    ): Promise<PrisonBlock> {
        const response = await api.patch(
            `/prisons/${encodeURIComponent(prisonId)}/blocks/${encodeURIComponent(blockId)}`,
            payload,
        );
        return normalizeBlock(itemFrom(response.data), prisonId);
    },
};

function normalizePrison(payload: unknown): Prison {
    const record = asRecord(payload);
    const id = String(firstValue(record, ["id", "prisonId", "prison_id"], ""));
    return {
        id,
        name: String(firstValue(record, ["name"], "")),
        location: String(firstValue(record, ["location"], "")),
        active: asBoolean(firstValue(record, ["active"], true), true),
        blocks: collectionFrom(record.blocks).map((block) => normalizeBlock(block, id)),
    };
}

function normalizeBlock(payload: unknown, prisonId: string): PrisonBlock {
    const record = asRecord(payload);
    const blockId = String(firstValue(record, ["id", "blockId", "block_id"], ""));
    const blockName = String(firstValue(record, ["name", "blockName", "block_name"], ""));
    return {
        id: blockId,
        name: blockName,
        cells: collectionFrom(record.cells).map((cell) => {
            const cellRecord = asRecord(cell);
            const capacity = Number(firstValue(cellRecord, ["capacity"], 0));
            const occupancy = Number(firstValue(cellRecord, ["currentOccupancy", "current_occupancy"], 0));
            return {
                id: String(firstValue(cellRecord, ["id", "cellId", "cell_id"], "")),
                prisonId: String(firstValue(cellRecord, ["prisonId", "prison_id"], prisonId)),
                blockId: String(firstValue(cellRecord, ["blockId", "block_id"], blockId)),
                blockName: String(firstValue(cellRecord, ["blockName", "block_name"], blockName)),
                cellNumber: Number(firstValue(cellRecord, ["cellNumber", "cell_number"], 0)),
                name: String(firstValue(cellRecord, ["name", "cellName", "cell_name"], "")),
                capacity,
                currentOccupancy: occupancy,
                availableSpaces: Number(firstValue(cellRecord, ["availableSpaces", "available_spaces"], capacity - occupancy)),
            };
        }),
    };
}
