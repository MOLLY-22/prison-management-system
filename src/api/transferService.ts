import api from "./axios";
import { asRecord, collectionFrom, firstValue, itemFrom } from "./dataContract";

export type TransferStatus =
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "IN_TRANSIT"
    | "RECEIVED"
    | "CANCELLED";

export type TransferRecord = {
    id: string;
    inmateId: string;
    inmateName: string;
    inmateNumber: string;
    sourcePrisonId: string;
    sourcePrisonName: string;
    destinationPrisonId: string;
    destinationPrisonName: string;
    reason: string;
    status: TransferStatus;
    requestedBy: string;
    approvedBy: string | null;
    requestedAt: string;
    decidedAt: string | null;
};

export type CreateTransferRequest = {
    inmateId: string;
    destinationPrisonId: string;
    reason: string;
};

export type TransferListParams = {
    status?: TransferStatus;
    prisonId?: string;
    page?: number;
    size?: number;
    sort?: string[];
};

export const transferService = {
    async getTransfers(params?: TransferListParams): Promise<TransferRecord[]> {
        const response = await api.get("/transfers", { params });
        return collectionFrom(response.data).map(normalizeTransfer);
    },

    async createTransfer(payload: CreateTransferRequest): Promise<TransferRecord> {
        const response = await api.post("/transfers", payload);
        return normalizeTransfer(itemFrom(response.data));
    },

    async approveTransfer(id: string): Promise<TransferRecord> {
        const response = await api.post(`/transfers/${encodeURIComponent(id)}/approve`);
        return normalizeTransfer(itemFrom(response.data));
    },

    async rejectTransfer(id: string): Promise<TransferRecord> {
        const response = await api.post(`/transfers/${encodeURIComponent(id)}/reject`);
        return normalizeTransfer(itemFrom(response.data));
    },

    async cancelTransfer(id: string): Promise<TransferRecord> {
        const response = await api.post(`/transfers/${encodeURIComponent(id)}/cancel`);
        return normalizeTransfer(itemFrom(response.data));
    },
};

function normalizeTransfer(payload: unknown): TransferRecord {
    const record = asRecord(payload);
    const inmate = asRecord(record.inmate);
    const sourcePrison = asRecord(firstValue(record, ["sourcePrison", "originPrison", "fromPrison"], {}));
    const destinationPrison = asRecord(firstValue(record, ["destinationPrison", "toPrison"], {}));
    return {
        id: String(firstValue(record, ["id", "transferId", "transfer_id"], "")),
        inmateId: String(firstValue(inmate, ["id", "inmateId"], firstValue(record, ["inmateId", "inmate_id"], ""))),
        inmateName: String(firstValue(inmate, ["fullName", "name"], [firstValue(inmate, ["firstName"], ""), firstValue(inmate, ["lastName"], "")].filter(Boolean).join(" "))),
        inmateNumber: String(firstValue(inmate, ["inmateNumber", "number", "fileNumber"], firstValue(record, ["inmateNumber", "inmate_number"], ""))),
        sourcePrisonId: String(firstValue(sourcePrison, ["id", "prisonId"], firstValue(record, ["sourcePrisonId", "source_prison_id", "originPrisonId"], ""))),
        sourcePrisonName: String(firstValue(sourcePrison, ["name"], firstValue(record, ["sourcePrisonName", "source_prison_name", "originPrisonName"], ""))),
        destinationPrisonId: String(firstValue(destinationPrison, ["id", "prisonId"], firstValue(record, ["destinationPrisonId", "destination_prison_id"], ""))),
        destinationPrisonName: String(firstValue(destinationPrison, ["name"], firstValue(record, ["destinationPrisonName", "destination_prison_name"], ""))),
        reason: String(firstValue(record, ["reason"], "")),
        status: String(firstValue(record, ["status"], "PENDING")).toUpperCase() as TransferStatus,
        requestedBy: String(firstValue(record, ["requestedByUsername", "requestedBy", "requested_by"], "")),
        approvedBy: firstValue(record, ["approvedByUsername", "approvedBy", "approved_by"], null) as string | null,
        requestedAt: String(firstValue(record, ["requestedAt", "requested_at", "createdAt"], "")),
        decidedAt: firstValue(record, ["decidedAt", "decided_at", "approvedAt"], null) as string | null,
    };
}
