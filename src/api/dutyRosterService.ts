import api from "./axiosClient";
import { asRecord, collectionFrom, firstValue, itemFrom, requiredIdentifier } from "./dataContract";

export type RosterStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

export type RosterShift = {
  id: string;
  rosterId: string;
  officerId: string;
  officerName: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  status: string;
};

export type DutyRoster = {
  id: string;
  prisonId: string;
  startDate: string;
  endDate: string;
  status: RosterStatus;
  shifts: RosterShift[];
};

export type ShiftRequest = {
  officerId: string;
  startAt: string;
  endAt: string;
  location: string;
};

export type RosterListParams = {
  prisonId?: string;
  from?: string;
  to?: string;
  status?: RosterStatus;
};

export const dutyRosterService = {
  async getRosters(params?: RosterListParams): Promise<DutyRoster[]> {
    const { data } = await api.get("/rosters", { params });
    return collectionFrom(data).map(normalizeRoster);
  },

  async getRoster(id: string): Promise<DutyRoster> {
    const { data } = await api.get(`/rosters/${encodeURIComponent(id)}`);
    return normalizeRoster(itemFrom(data));
  },

  async getMyShifts(from: string, to: string): Promise<RosterShift[]> {
    const { data } = await api.get("/me/shifts", { params: { from, to } });
    return collectionFrom(data).map((item) => normalizeShift(item));
  },

  async createRoster(prisonId: string | undefined, startDate: string, endDate: string): Promise<DutyRoster> {
    const { data } = await api.post("/rosters", {
      ...(prisonId ? { prisonId } : {}),
      periodStart: startDate,
      periodEnd: endDate,
    });
    return normalizeRoster(itemFrom(data));
  },

  async updateRoster(id: string, startDate: string, endDate: string): Promise<DutyRoster> {
    const { data } = await api.patch(`/rosters/${encodeURIComponent(id)}`, { periodStart: startDate, periodEnd: endDate });
    return normalizeRoster(itemFrom(data));
  },

  async publishRoster(id: string): Promise<DutyRoster> {
    const { data } = await api.post(`/rosters/${encodeURIComponent(id)}/publish`);
    return normalizeRoster(itemFrom(data));
  },

  async closeRoster(id: string): Promise<DutyRoster> {
    const { data } = await api.post(`/rosters/${encodeURIComponent(id)}/close`);
    return normalizeRoster(itemFrom(data));
  },

  async createShift(rosterId: string, payload: ShiftRequest): Promise<RosterShift> {
    const { data } = await api.post(`/rosters/${encodeURIComponent(rosterId)}/shifts`, payload);
    return normalizeShift(itemFrom(data), rosterId);
  },

  async updateShift(rosterId: string, shiftId: string, payload: ShiftRequest): Promise<RosterShift> {
    const { data } = await api.patch(
      `/rosters/${encodeURIComponent(rosterId)}/shifts/${encodeURIComponent(shiftId)}`,
      payload,
    );
    return normalizeShift(itemFrom(data), rosterId);
  },

  async deleteShift(rosterId: string, shiftId: string): Promise<void> {
    await api.delete(`/rosters/${encodeURIComponent(rosterId)}/shifts/${encodeURIComponent(shiftId)}`);
  },
};

function normalizeRoster(payload: unknown): DutyRoster {
  const record = asRecord(payload);
  const id = requiredIdentifier(record, ["id", "rosterId", "roster_id"], "roster");
  const status = String(firstValue(record, ["status", "state"], "DRAFT")).toUpperCase();
  const rawShifts = firstValue(record, ["shifts", "officerShifts"], []);
  return {
    id,
    prisonId: String(firstValue(record, ["prisonId", "prison_id"], "")),
    startDate: String(firstValue(record, ["periodStart", "period_start", "startDate", "start_date", "from"], "")),
    endDate: String(firstValue(record, ["periodEnd", "period_end", "endDate", "end_date", "to"], "")),
    status: status === "PUBLISHED" || status === "CLOSED" ? status : "DRAFT",
    shifts: Array.isArray(rawShifts) ? rawShifts.map((shift) => normalizeShift(shift, id)) : [],
  };
}

function normalizeShift(payload: unknown, rosterId = ""): RosterShift {
  const record = asRecord(payload);
  const startAt = String(firstValue(record, ["startAt", "start_at", "startsAt", "starts_at"], ""));
  const endAt = String(firstValue(record, ["endAt", "end_at", "endsAt", "ends_at"], ""));
  const startDateTime = startAt ? new Date(startAt) : null;
  const endDateTime = endAt ? new Date(endAt) : null;
  const date = String(firstValue(record, ["date", "shiftDate", "shift_date"], startDateTime && !Number.isNaN(startDateTime.getTime()) ? localDatePart(startDateTime) : startAt.slice(0, 10)));
  const startTime = String(firstValue(record, ["startTime", "start_time"], startDateTime && !Number.isNaN(startDateTime.getTime()) ? localTimePart(startDateTime) : startAt.slice(11, 16)));
  const endTime = String(firstValue(record, ["endTime", "end_time"], endDateTime && !Number.isNaN(endDateTime.getTime()) ? localTimePart(endDateTime) : endAt.slice(11, 16)));
  const officer = asRecord(firstValue(record, ["officer", "user", "assignedOfficer"], {}));
  return {
    id: requiredIdentifier(record, ["id", "shiftId", "shift_id"], "shift"),
    rosterId: String(firstValue(record, ["rosterId", "roster_id"], rosterId)),
    officerId: String(firstValue(record, ["officerId", "officer_id", "userId", "user_id"], firstValue(officer, ["id", "userId"], ""))),
    officerName: String(firstValue(record, ["officerName", "officer_name", "userName", "user_name"], firstValue(officer, ["name", "fullName", "username"], ""))),
    date: date.slice(0, 10),
    startTime: startTime.slice(0, 5),
    endTime: endTime.slice(0, 5),
    location: String(firstValue(record, ["location"], "")),
    status: String(firstValue(record, ["status", "state"], "PUBLISHED")).toUpperCase(),
  };
}

function localDatePart(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function localTimePart(value: Date) {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}
