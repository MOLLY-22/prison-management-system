import api from "./axiosClient";
import { asRecord, collectionFrom, fetchAllPages, firstValue, itemFrom, requiredIdentifier } from "./dataContract";

export type Visitor = {
    id: string;
    name: string;
    inmate: string;
    inmateId: string;
    date: string;
    time: string;
    endTime: string;
    visitType: string;
    durationMinutes?: number;
};

export type InmateLookup = {
    id: string;
    fullName: string;
    cellId: string;
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
    visitType?: string;
    inmateId?: string;
    inmateName?: string;
    visitDateFrom?: string;
    visitDateTo?: string;
    loggedBy?: string;
    page?: number;
    size?: number;
    sort?: string[];
};

export function normalizeVisitor(payload: unknown, fallbackInmateId = ""): Visitor {
    const record = asRecord(payload);
    const visitor = asRecord(record.visitor);
    const inmate = asRecord(record.inmate);
    const id = requiredIdentifier(record, ["id"], "visit");
    const start = String(firstValue(record, ["startDateTime"], ""));
    const end = String(firstValue(record, ["endDateTime"], ""));
    const inmateFirstName = String(firstValue(inmate, ["firstName"], ""));
    const inmateLastName = String(firstValue(inmate, ["lastName"], ""));
    const durationMinutes = firstValue(record, ["durationMinutes"], undefined as number | undefined);
    return {
        id,
        name: String(firstValue(visitor, ["fullName"], firstValue(record, ["visitorName"], ""))),
        inmate: [inmateFirstName, inmateLastName].filter(Boolean).join(" "),
        inmateId: String(firstValue(inmate, ["id"], fallbackInmateId)),
        date: String(firstValue(record, ["visitDate"], start.slice(0, 10))),
        time: start.includes("T") ? start.slice(11, 16) : start.slice(0, 5),
        endTime: end.includes("T") ? end.slice(11, 16) : end.slice(0, 5),
        visitType: String(firstValue(record, ["visitType"], "")),
        durationMinutes: durationMinutes === undefined ? undefined : Number(durationMinutes),
    };
}

export const visitorService = {
    async getVisitors(params?: VisitListParams): Promise<Visitor[]> {
        const query = { size: 100, ...params };
        if (params?.page !== undefined) {
            const response = await api.get("/visits", { params: query });
            return collectionFrom(response.data).map((visit) => normalizeVisitor(visit));
        }
        const records = await fetchAllPages<unknown>((page) =>
            api.get("/visits", { params: { ...query, page } }).then(({ data }) => data),
        );
        return records.map((visit) => normalizeVisitor(visit));
    },

    async getInmateVisitHistory(inmateId: string, params?: Omit<VisitListParams, "visitId" | "inmateId" | "inmateName" | "loggedBy">): Promise<Visitor[]> {
        const path = `/inmates/${encodeURIComponent(inmateId)}/visits`;
        if (params?.page !== undefined) {
            const response = await api.get(path, { params });
            return collectionFrom(response.data).map((visit) => normalizeVisitor(visit, inmateId));
        }
        const query = { size: 100, ...params };
        const records = await fetchAllPages<unknown>((page) =>
            api.get(path, { params: { ...query, page } }).then(({ data }) => data),
        );
        return records.map((visit) => normalizeVisitor(visit, inmateId));
    },

    async searchInmates(query: string): Promise<InmateLookup[]> {
        const response = await api.get("/inmates", { params: { search: query, size: 20 } });
        return normalizeInmates(response.data);
    },
    async getInmates(): Promise<InmateLookup[]> {
        const records = await fetchAllPages<unknown>((page) =>
            api.get("/inmates", { params: { page, size: 100 } }).then(({ data }) => data),
        );
        return normalizeInmates(records);
    },
    async registerVisitor(payload: VisitRequest): Promise<Visitor> {
        const response = await api.post("/visits/family-friends", payload);
        return normalizeVisitor(itemFrom(response.data));
    },
};

function normalizeInmates(payload: unknown): InmateLookup[] {
    return collectionFrom(payload).map((item) => {
            const record = asRecord(item);
            return {
                id: String(firstValue(record, ["id"], "")),
                fullName: [firstValue(record, ["firstName"], ""), firstValue(record, ["lastName"], "")].filter(Boolean).join(" "),
                cellId: String(firstValue(record, ["cellId"], "")),
            };
        });
}
