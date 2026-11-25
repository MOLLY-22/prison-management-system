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
    status: "Scheduled";
    visitType: string;
    entryTimestamp?: string | null;
    exitTimestamp?: string | null;
    itemsBrought?: string;
    durationMinutes?: number;
    loggedById?: string;
    loggedByName?: string;
    createdAt?: string;
    updatedAt?: string;
    legalRepresentative?: string;
    sickness?: string;
    diagnosis?: string;
    medicationsProvided?: string;
    recommendations?: string;
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
export type LegalVisitRequest = {
    inmateId: string;
    visitDate: string;
    startTime: string;
    endTime: string;
    legalCaseNumber: string;
    legalRepresentative?: string;
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
        status: "Scheduled",
        visitType: String(firstValue(record, ["type", "visitType", "visit_type"], "")),
        entryTimestamp: null,
        exitTimestamp: null,
        itemsBrought: String(firstValue(record, ["itemsBrought", "items_brought"], "")),
        legalRepresentative: String(firstValue(record, ["legalRepresentative", "legal_representative"], "")),
        sickness: String(firstValue(record, ["sickness"], "")),
        diagnosis: String(firstValue(record, ["diagnosis"], "")),
        medicationsProvided: String(firstValue(record, ["medicationsProvided", "medications_provided"], "")),
        recommendations: String(firstValue(record, ["recommendations"], "")),
        durationMinutes: durationMinutes === undefined ? undefined : Number(durationMinutes),
        loggedById: String(firstValue(record, ["loggedById", "logged_by_id"], "")),
        loggedByName: String(firstValue(record, ["loggedByName", "logged_by_name"], "")),
        createdAt: firstValue(record, ["createdAt", "created_at"], undefined) as string | undefined,
        updatedAt: firstValue(record, ["updatedAt", "updated_at"], undefined) as string | undefined,
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
        const path = `/visits/inmate/${encodeURIComponent(inmateId)}`;
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
        const response = await api.post("/visits", { ...payload, type: "FAMILY" });
        return normalizeVisitor(itemFrom(response.data));
    },
    async registerLegalVisit(payload: LegalVisitRequest): Promise<Visitor> {
        const response = await api.post("/visits", { ...payload, type: "LEGAL" });
        return normalizeVisitor(itemFrom(response.data));
    },
    async registerMedicalVisit(payload: {
        inmateId: string;
        visitDate: string;
        startTime: string;
        endTime: string;
        sickness: string;
        diagnosis: string;
        medicationsProvided?: string;
        recommendations?: string;
    }): Promise<Visitor> {
        const response = await api.post("/visits", { ...payload, type: "HEALTH" });
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
