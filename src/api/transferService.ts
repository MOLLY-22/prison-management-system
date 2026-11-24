import api from "./axiosClient";
import { asRecord, collectionFrom, fetchAllPages, firstValue, itemFrom, requiredIdentifier } from "./dataContract";

export type TransferStatus =
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "CONFIRMED"
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
    receivedCellId: string | null;
    receivedAt: string | null;
    receivedBy: string | null;
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
        const query = { size: 100, ...params };
        if (params?.page !== undefined) {
            const response = await api.get("/transfers", { params: query });
            return collectionFrom(response.data).map(normalizeTransfer);
        }
        const records = await fetchAllPages<unknown>((page) =>
            api.get("/transfers", { params: { ...query, page } }).then(({ data }) => data),
        );
        return records.map(normalizeTransfer);
    },

    async createTransfer(payload: CreateTransferRequest): Promise<TransferRecord> {
        const response = await api.post("/transfers", payload);
        return normalizeTransfer(itemFrom(response.data));
    },

    async changeStatus(id: string, status: TransferStatus, destinationPrisonId?: string): Promise<TransferRecord> {
        const response = await api.post(`/transfers/${encodeURIComponent(id)}/status`, {
            status,
            ...(destinationPrisonId ? { destinationPrisonId } : {}),
        });
        return normalizeTransfer(itemFrom(response.data));
    },

    async receiveTransfer(id: string): Promise<TransferRecord> {
        const response = await api.post(`/transfers/${encodeURIComponent(id)}/status`, { status: "RECEIVED" });
        return normalizeTransfer(itemFrom(response.data));
    },
};

function normalizeTransfer(payload: unknown): TransferRecord {
    const record = asRecord(payload);
    const id = requiredIdentifier(record, ["id", "transferId", "transfer_id"], "transfer");
    const inmate = asRecord(record.inmate);
    const sourcePrison = asRecord(firstValue(record, ["sourcePrison", "originPrison", "fromPrison"], {}));
    const destinationPrison = asRecord(firstValue(record, ["destinationPrison", "toPrison"], {}));
    return {
        id,
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
        approvedBy: firstValue(record, ["decidedBy", "approvedByUsername", "approvedBy", "approved_by"], null) as string | null,
        requestedAt: String(firstValue(record, ["requestedAt", "requested_at", "createdAt"], "")),
        decidedAt: firstValue(record, ["decidedAt", "decided_at", "approvedAt"], null) as string | null,
        receivedCellId: firstValue(record, ["receivedCellId", "received_cell_id"], null) as string | null,
        receivedAt: firstValue(record, ["receivedAt", "received_at"], null) as string | null,
        receivedBy: firstValue(record, ["receivedBy", "received_by"], null) as string | null,
    };
}
