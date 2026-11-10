import api from "./axios";
import { asRecord, collectionFrom, firstValue, itemFrom } from "./dataContract";

export type VisitorStatus = "Scheduled";

export type Visitor = {
    id: string;
    visitorId: string;
    name: string;
    inmate: string;
    inmateId: string;
    phone: string;
    date: string;
    time: string;
    endTime: string;
    status: VisitorStatus;
    entryTimestamp?: string | null;
    exitTimestamp?: string | null;
};

export type InmateLookup = {
    id: string;
    fullName: string;
    cellBlock: string;
    visitationAllowed: boolean;
};

export type VisitRequest = {
    visitorFullName: string;
    inmateId: string;
    visitDate: string;
    startTime: string;
    endTime: string;
};

function dateTime(value: unknown): string {
    return value ? String(value) : "";
}

export function normalizeVisitor(payload: unknown): Visitor {
    const record = asRecord(payload);
    const visitor = asRecord(record.visitor);
    const inmate = asRecord(record.inmate);
    const start = dateTime(firstValue(record, ["startDateTime", "start_date_time"], ""));
    const end = dateTime(firstValue(record, ["endDateTime", "end_date_time"], ""));
    return {
        id: String(firstValue(record, ["id", "visitId", "visit_id"], "")),
        visitorId: String(firstValue(visitor, ["id", "visitorId"], firstValue(record, ["id"], ""))),
        name: String(firstValue(visitor, ["fullName", "name"], firstValue(record, ["visitorFullName"], ""))),
        inmate: [firstValue(inmate, ["firstName"], ""), firstValue(inmate, ["lastName"], "")].filter(Boolean).join(" "),
        inmateId: String(firstValue(inmate, ["id", "inmateId"], firstValue(record, ["inmateId"], ""))),
        phone: "",
        date: String(firstValue(record, ["visitDate", "visit_date"], start.slice(0, 10))),
        time: start.includes("T") ? start.slice(11, 16) : start,
        endTime: end.includes("T") ? end.slice(11, 16) : end,
        status: "Scheduled",
        entryTimestamp: null,
        exitTimestamp: null,
    };
}

export const visitorService = {
    async getVisitors(params?: {
        visitorName?: string;
        inmateId?: string;
        visitDateFrom?: string;
        visitDateTo?: string;
        page?: number;
        size?: number;
    }): Promise<Visitor[]> {
        const response = await api.get("/visits", {
            params: { size: 100, ...params },
        });
        return collectionFrom(response.data).map(normalizeVisitor);
    },
    async searchInmates(query: string): Promise<InmateLookup[]> {
        const response = await api.get("/inmates", { params: { search: query, size: 20 } });
        return normalizeInmates(response.data);
    },
    async getInmates(): Promise<InmateLookup[]> {
        const response = await api.get("/inmates", { params: { size: 100 } });
        return normalizeInmates(response.data);
    },
    async registerVisitor(payload: VisitRequest): Promise<Visitor> {
        const response = await api.post("/visits", payload);
        return normalizeVisitor(itemFrom(response.data));
    },
    async updateVisitor(id: string, startDateTime: string, endDateTime: string): Promise<Visitor> {
        const response = await api.patch(`/visits/${encodeURIComponent(id)}`, { startDateTime, endDateTime });
        return normalizeVisitor(itemFrom(response.data));
    },
};

function normalizeInmates(payload: unknown): InmateLookup[] {
    return collectionFrom(payload).map((item) => {
            const record = asRecord(item);
            return {
                id: String(firstValue(record, ["id", "inmateId"], "")),
                fullName: [firstValue(record, ["firstName"], ""), firstValue(record, ["lastName"], "")].filter(Boolean).join(" "),
                cellBlock: String(firstValue(record, ["cellId", "cell_id"], "")),
                visitationAllowed: true,
            };
        });
}
