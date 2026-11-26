import { visitorService } from "./visitorService";
import { asRecord, firstValue } from "./dataContract";

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
    startTime: string;
    endTime: string;
    sickness: string;
    diagnosis: string;
    medicationsProvided: string;
    recommendations: string;
};

export const medicalVisitService = {
    async getMedicalVisits(inmateId: string): Promise<MedicalVisit[]> {
        const records = await visitorService.getInmateVisitHistory(inmateId);
        return records
            .filter((visit) => visit.visitType === "HEALTH")
            .map(normalizeMedicalVisit);
    },
    async recordMedicalVisit(payload: MedicalVisitRequest): Promise<MedicalVisit> {
        const visit = await visitorService.registerMedicalVisit(payload);
        return normalizeMedicalVisit(visit);
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