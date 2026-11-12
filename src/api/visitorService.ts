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
    itemsBrought?: string;
    durationMinutes?: number;
    loggedById?: string;
    loggedByName?: string;
    createdAt?: string;
    updatedAt?: string;
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
    itemsBrought?: string;
};

export type VisitListParams = {
    visitId?: string;
    visitorName?: string;
    inmateId?: string;
    inmateName?: string;
    visitDateFrom?: string;
    visitDateTo?: string;
    loggedBy?: string;
    page?: number;
    size?: number;
    sort?: string[];
};

export function normalizeVisitor(payload: unknown): Visitor {
    const record = asRecord(payload);
    const visitor = asRecord(record.visitor);
    const inmate = asRecord(record.inmate);
    const start = String(firstValue(record, ["startTime", "start_time", "startDateTime", "start_date_time"], ""));
    const end = String(firstValue(record, ["endTime", "end_time", "endDateTime", "end_date_time"], ""));
    return {
        id: String(firstValue(record, ["id", "visitId", "visit_id"], "")),
        visitorId: String(firstValue(visitor, ["id", "visitorId"], firstValue(record, ["id"], ""))),
        name: String(firstValue(visitor, ["fullName", "name"], firstValue(record, ["visitorFullName", "visitorName"], ""))),
        inmate: String(firstValue(inmate, ["fullName", "name"], [firstValue(inmate, ["firstName"], ""), firstValue(inmate, ["lastName"], "")].filter(Boolean).join(" "))),
        inmateId: String(firstValue(inmate, ["id", "inmateId"], firstValue(record, ["inmateId"], ""))),
        phone: String(firstValue(visitor, ["phone", "phoneNumber", "phone_number"], "")),
        date: String(firstValue(record, ["visitDate", "visit_date"], start.slice(0, 10))),
        time: start.includes("T") ? start.slice(11, 16) : start.slice(0, 5),
        endTime: end.includes("T") ? end.slice(11, 16) : end.slice(0, 5),
        status: "Scheduled",
        entryTimestamp: null,
        exitTimestamp: null,
        itemsBrought: String(firstValue(record, ["itemsBrought", "items_brought"], "")),
        durationMinutes: Number(firstValue(record, ["durationMinutes", "duration_minutes"], 0)),
        loggedById: String(firstValue(record, ["loggedById", "logged_by_id"], "")),
        loggedByName: String(firstValue(record, ["loggedByName", "logged_by_name"], "")),
        createdAt: firstValue(record, ["createdAt", "created_at"], undefined) as string | undefined,
        updatedAt: firstValue(record, ["updatedAt", "updated_at"], undefined) as string | undefined,
    };
}

export const visitorService = {
    async getVisitors(params?: VisitListParams): Promise<Visitor[]> {
        const response = await api.get("/visits", { params: { size: 100, ...params } });
        return collectionFrom(response.data).map(normalizeVisitor);
    },

    async getInmateVisitHistory(inmateId: string, params?: Omit<VisitListParams, "visitId" | "inmateId" | "inmateName" | "loggedBy">): Promise<Visitor[]> {
        const response = await api.get(`/inmates/${encodeURIComponent(inmateId)}/visits`, { params });
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
