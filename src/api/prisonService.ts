import api from "./axiosClient";
import { asBoolean, asRecord, collectionFrom, fetchAllPages, firstValue, itemFrom, requiredIdentifier } from "./dataContract";

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
        const query = { size: 100, ...params };
        if (params?.page !== undefined) {
            const response = await api.get("/prisons", { params: query });
            return collectionFrom(response.data).map(normalizePrison);
        }
        const records = await fetchAllPages<unknown>((page) =>
            api.get("/prisons", { params: { ...query, page } }).then(({ data }) => data),
        );
        return records.map(normalizePrison);
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
    const id = requiredIdentifier(record, ["id", "prisonId", "prison_id"], "prison");
    return {
        id,
        name: String(firstValue(record, ["name"], "")),
        location: String(firstValue(record, ["location"], "")),
        active: asBoolean(firstValue(record, ["active"], true), true),
        blocks: collectionFrom(record.blocks ?? []).map((block) => normalizeBlock(block, id)),
    };
}

function normalizeBlock(payload: unknown, prisonId: string): PrisonBlock {
    const record = asRecord(payload);
    const blockId = requiredIdentifier(record, ["id", "blockId", "block_id"], "block");
    const blockName = String(firstValue(record, ["name", "blockName", "block_name"], ""));
    return {
        id: blockId,
        name: blockName,
        cells: collectionFrom(record.cells ?? []).map((cell) => {
            const cellRecord = asRecord(cell);
            const cellId = requiredIdentifier(cellRecord, ["id", "cellId", "cell_id"], "cell");
            const capacity = Number(firstValue(cellRecord, ["capacity"], 0));
            const occupancy = Number(firstValue(cellRecord, ["currentOccupancy", "current_occupancy"], 0));
            return {
                id: cellId,
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
