import api from "./axiosClient";
import { asRecord, collectionFrom, firstValue, itemFrom } from "./dataContract";

export type MedicalVisit = {
    id: string;
    date: string;
    sickness: string;
    diagnosis: string;
    medication: string;
    recommendations: string;
};

export type MedicalVisitRequest = {
    inmateId: string;
    visitDate: string;
    sickness: string;
    diagnosis: string;
    medicationsProvided: string;
    recommendations: string;
};

export const medicalVisitService = {
    async getMedicalVisits(inmateId: string): Promise<MedicalVisit[]> {
        const response = await api.get("/medical-visits", {
            params: { inmateId, size: 100 },
        });
        return collectionFrom(response.data).map(normalizeMedicalVisit);
    },
    async recordMedicalVisit(payload: MedicalVisitRequest): Promise<MedicalVisit> {
        const response = await api.post("/medical-visits", payload);
        return normalizeMedicalVisit(itemFrom(response.data));
    },
};

function displayValue(value: unknown): string {
    if (Array.isArray(value)) {
        return value.map(displayValue).filter(Boolean).join(", ");
    }
    if (value && typeof value === "object") {
        const record = asRecord(value);
        return String(firstValue(record, ["name", "description", "value"], ""));
    }
    return value === undefined || value === null ? "" : String(value);
}

function normalizeMedicalVisit(payload: unknown): MedicalVisit {
    const record = asRecord(payload);
    return {
        id: displayValue(firstValue(record, ["id", "visitId", "visit_id"], "")),
        date: displayValue(firstValue(record, ["date", "visitDate", "visit_date", "medicalVisitDate", "medical_visit_date", "createdAt", "created_at"], "")),
        sickness: displayValue(firstValue(record, ["sickness", "illness", "complaint", "symptoms"], "")),
        diagnosis: displayValue(firstValue(record, ["diagnosis", "diagnosisDescription", "diagnosis_description"], "")),
        medication: displayValue(firstValue(record, ["medication", "medications", "medicationsProvided", "medications_provided", "prescription", "treatment"], "")),
        recommendations: displayValue(firstValue(record, ["recommendations", "recommendation", "advice", "followUp", "follow_up"], "")),
    };
}