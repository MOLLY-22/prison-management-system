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

export function collectionFrom<T = unknown>(payload: unknown): T[] {
    if (Array.isArray(payload)) return payload as T[];
    const record = asRecord(payload);
    const collectionKeys = ["content", "items", "records", "results", "visitors", "inmates", "users", "transfers"];
    for (const key of collectionKeys) {
        if (Array.isArray(record[key])) return record[key] as T[];
    }
    for (const key of ["data", "result"]) {
        if (record[key] && typeof record[key] === "object") {
            const nested = collectionFrom<T>(record[key]);
            if (nested.length) return nested;
        }
    }
    return [];
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
