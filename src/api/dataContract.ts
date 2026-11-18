export type UnknownRecord = Record<string, unknown>;

export function asRecord(value: unknown): UnknownRecord {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as UnknownRecord
        : {};
}

export function firstValue<T>(record: UnknownRecord, keys: string[], fallback: T): T {
    for (const key of keys) {
        const value = record[key];
        if (value !== undefined && value !== null && value !== "") return value as T;
    }
    return fallback;
}

export function requiredIdentifier(
    record: UnknownRecord,
    keys: string[],
    resource: string,
): string {
    for (const key of keys) {
        const value = record[key];
        if (
            typeof value === "string" ||
            (typeof value === "number" && Number.isFinite(value))
        ) {
            const identifier = String(value).trim();
            if (identifier) return identifier;
        }
    }
    throw new TypeError(`Unexpected ${resource} response. The required id is missing.`);
}

export function collectionFrom<T = unknown>(payload: unknown): T[] {
    if (Array.isArray(payload)) return payload as T[];
    const record = asRecord(payload);
    const collectionKeys = [
        "content",
        "items",
        "records",
        "results",
        "visitors",
        "visits",
        "inmates",
        "users",
        "transfers",
        "prisons",
        "blocks",
        "cells",
    ];
    for (const key of collectionKeys) {
        if (Array.isArray(record[key])) return record[key] as T[];
    }
    for (const key of ["data", "result"]) {
        const nested = record[key];
        if (Array.isArray(nested) || (nested && typeof nested === "object")) {
            return collectionFrom<T>(nested);
        }
    }
    throw new TypeError(
        "Unexpected API collection response. Expected an array or a supported collection envelope.",
    );
}

export async function fetchAllPages<T>(
    fetchPage: (page: number) => Promise<unknown>,
): Promise<T[]> {
    const firstPage = await fetchPage(0);
    const records = collectionFrom<T>(firstPage);
    if (Array.isArray(firstPage)) return records;

    const totalPages = totalPagesFrom(firstPage);
    if (totalPages === null) {
        throw new TypeError(
            "Unexpected paginated API response. Expected a non-negative totalPages value.",
        );
    }
    if (totalPages < 2) return records;

    for (let page = 1; page < totalPages; page += 1) {
        records.push(...collectionFrom<T>(await fetchPage(page)));
    }

    return records;
}

function totalPagesFrom(payload: unknown): number | null {
    const record = asRecord(payload);
    const value = record.totalPages;
    if (value !== undefined) {
        if (typeof value !== "number") return null;
        const totalPages = Number(value);
        return Number.isInteger(totalPages) && totalPages >= 0 ? totalPages : null;
    }
    for (const key of ["data", "result"]) {
        const nested = record[key];
        if (nested && typeof nested === "object") {
            const totalPages = totalPagesFrom(nested);
            if (totalPages !== null) return totalPages;
        }
    }
    return null;
}

export function itemFrom<T>(payload: unknown): T {
    const record = asRecord(payload);
    if (record.data && typeof record.data === "object") {
        const nested = asRecord(record.data);
        if (nested.user && typeof nested.user === "object") return nested.user as T;
        return record.data as T;
    }
    if (record.result && typeof record.result === "object") {
        const nested = asRecord(record.result);
        if (nested.user && typeof nested.user === "object") return nested.user as T;
        return record.result as T;
    }
    if (record.user && typeof record.user === "object") return record.user as T;
    return payload as T;
}

export function asNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return ["true", "1", "yes", "allowed"].includes(value.toLowerCase());
    return fallback;
}
