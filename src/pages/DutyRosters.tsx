import { useEffect, useMemo, useState, type FormEvent } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { dutyRosterService, type DutyRoster, type RosterShift, type RosterStatus, type ShiftRequest } from "../api/dutyRosterService";
import { userService, type User } from "../api/userService";
import { useAuth } from "../context/AuthContext";

function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function messageFrom(error: unknown) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    if (error.response?.data?.message) return error.response.data.message;
    if (!error.response) return "The server could not be reached. Check your connection and try again.";
    return error.message;
  }
  return error instanceof Error ? error.message : "The request could not be completed.";
}

function roleKey(role: string) {
  return role.toLowerCase().replace(/[_-]+/g, " ").trim();
}

function isManagerRole(role: string) {
  const normalized = roleKey(role);
  return ["duty officer", "roster manager", "duty roster manager", "super admin", "officer in charge", "senior officer"].includes(normalized);
}

function isPrisonOfficer(user: User) {
  return roleKey(user.role) === "prison officer" && user.status === "Active";
}

function statusColor(status: DutyRoster["status"]): "default" | "warning" | "success" {
  if (status === "PUBLISHED") return "success";
  if (status === "DRAFT") return "warning";
  return "default";
}

type ShiftFormData = {
  officerId: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
};

function shiftFrom(shift?: RosterShift): ShiftFormData {
  return {
    officerId: shift?.officerId ?? "",
    date: shift?.date ?? "",
    startTime: shift?.startTime ?? "08:00",
    endTime: shift?.endTime ?? "16:00",
    location: shift?.location ?? "",
  };
}

function toShiftRequest(form: ShiftFormData): ShiftRequest {
  const start = new Date(`${form.date}T${form.startTime}:00`);
  const endDate = new Date(`${form.date}T${form.endTime}:00`);
  if (form.endTime <= form.startTime) endDate.setDate(endDate.getDate() + 1);
  return {
    officerId: form.officerId,
    startAt: start.toISOString(),
    endAt: endDate.toISOString(),
    location: form.location.trim(),
  };
}

function DutyRosters() {
  const { user } = useAuth();
  const role = user?.role ?? "";
  const canManage = !user || isManagerRole(role);
  const [rosters, setRosters] = useState<DutyRoster[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);
  const [selectedPrisonId, setSelectedPrisonId] = useState(user?.prisonId ?? "");
  const [rosterStatusFilter, setRosterStatusFilter] = useState<"ALL" | RosterStatus>("ALL");
  const [selectedRosterId, setSelectedRosterId] = useState("");
  const today = localDate(new Date());
  const monthLater = new Date();
  monthLater.setDate(monthLater.getDate() + 30);
  const [rangeStart, setRangeStart] = useState(today);
  const [rangeEnd, setRangeEnd] = useState(localDate(monthLater));
  const [myFrom, setMyFrom] = useState(today);
  const [myTo, setMyTo] = useState(localDate(monthLater));
  const [myShifts, setMyShifts] = useState<RosterShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<RosterShift | null>(null);
  const [shiftForm, setShiftForm] = useState<ShiftFormData>(shiftFrom());

  const selectedRoster = useMemo(
    () => rosters.find((roster) => roster.id === selectedRosterId) ?? null,
    [rosters, selectedRosterId],
  );
  const activeOfficers = useMemo(() => officers.filter(isPrisonOfficer), [officers]);

  async function loadManagerData(
    preferredRosterId?: string,
    statusOverride: "ALL" | RosterStatus = rosterStatusFilter,
  ) {
    const users = await userService.getUsers();
    const prisonId = selectedPrisonId || users.find((record) => record.id === user?.id)?.prisonId || "";
    if (!selectedPrisonId) setSelectedPrisonId(prisonId);
    setOfficers(users.filter(isPrisonOfficer));
    const rosterRecords = await dutyRosterService.getRosters({
      ...(prisonId ? { prisonId } : {}),
      ...(statusOverride === "ALL" ? {} : { status: statusOverride }),
    });
    const nextSelected = preferredRosterId && rosterRecords.some((roster) => roster.id === preferredRosterId)
      ? preferredRosterId
      : selectedRosterId && rosterRecords.some((roster) => roster.id === selectedRosterId)
        ? selectedRosterId
        : rosterRecords[0]?.id ?? "";
    setSelectedRosterId(nextSelected);
    const nextRoster = rosterRecords.find((roster) => roster.id === nextSelected);
    if (nextRoster) {
      setRangeStart(nextRoster.startDate);
      setRangeEnd(nextRoster.endDate);
      const details = await dutyRosterService.getRoster(nextRoster.id);
      setRosters(rosterRecords.map((roster) => roster.id === details.id ? details : roster));
    } else {
      setRosters(rosterRecords);
    }
  }

  async function loadMyShifts(from = myFrom, to = myTo) {
    setError("");
    setLoading(true);
    try {
      setMyShifts(await dutyRosterService.getMyShifts(from, to));
    } catch (reason: unknown) {
      setError(messageFrom(reason));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        if (canManage) {
          const users = await userService.getUsers();
          if (!active) return;
          const prisonId = selectedPrisonId || users.find((record) => record.id === user?.id)?.prisonId || "";
          if (!selectedPrisonId) setSelectedPrisonId(prisonId);
          setOfficers(users.filter(isPrisonOfficer));
          const rosterRecords = await dutyRosterService.getRosters({
            ...(prisonId ? { prisonId } : {}),
            ...(rosterStatusFilter === "ALL" ? {} : { status: rosterStatusFilter }),
          });
          if (!active) return;
          setRosters(rosterRecords);
          const initialRoster = rosterRecords[0];
          setSelectedRosterId(initialRoster?.id ?? "");
          if (initialRoster) {
            setRangeStart(initialRoster.startDate);
            setRangeEnd(initialRoster.endDate);
            const details = await dutyRosterService.getRoster(initialRoster.id);
            if (active) setRosters(rosterRecords.map((roster) => roster.id === details.id ? details : roster));
          }
        } else {
          setMyShifts(await dutyRosterService.getMyShifts(myFrom, myTo));
        }
      } catch (reason: unknown) {
        if (active) setError(messageFrom(reason));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [canManage, user?.id]);

  async function runManagerAction(action: () => Promise<unknown>, message: string, rosterId?: string) {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await action();
      await loadManagerData(rosterId);
      setSuccess(message);
    } catch (reason: unknown) {
      setError(messageFrom(reason));
    } finally {
      setSaving(false);
    }
  }

  function handleCreateRoster(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rangeStart > rangeEnd) {
      setError("The end date must be on or after the start date.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    void dutyRosterService.createRoster(selectedPrisonId, rangeStart, rangeEnd)
      .then(async (created) => {
        await loadManagerData(created.id);
        setSuccess("Draft roster created.");
      })
      .catch((reason: unknown) => setError(messageFrom(reason)))
      .finally(() => setSaving(false));
  }

  function openShiftForm(shift?: RosterShift) {
    if (!selectedRoster) return;
    setEditingShift(shift ?? null);
    setShiftForm(shiftFrom(shift ?? {
      id: "", rosterId: selectedRoster.id, officerId: "", officerName: "",
      date: selectedRoster.startDate, startTime: "08:00", endTime: "16:00", location: "", status: "SCHEDULED",
    }));
    setError("");
    setShiftDialogOpen(true);
  }

  async function selectRoster(roster: DutyRoster) {
    setSelectedRosterId(roster.id);
    setRangeStart(roster.startDate);
    setRangeEnd(roster.endDate);
    setLoading(true);
    setError("");
    try {
      const details = await dutyRosterService.getRoster(roster.id);
      setRosters((current) => current.map((item) => item.id === details.id ? details : item));
    } catch (reason: unknown) {
      setError(messageFrom(reason));
    } finally {
      setLoading(false);
    }
  }

  function handleSaveShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRoster) return;
    if (shiftForm.date < selectedRoster.startDate || shiftForm.date > selectedRoster.endDate) {
      setError("Choose a date within this roster’s date range.");
      return;
    }
    if (shiftForm.startTime === shiftForm.endTime) {
      setError("Choose different start and end times for the shift.");
      return;
    }
    let request: ShiftRequest;
    try {
      request = toShiftRequest(shiftForm);
    } catch {
      setError("Enter a valid shift date and time.");
      return;
    }
    const action = editingShift
      ? () => dutyRosterService.updateShift(selectedRoster.id, editingShift.id, request)
      : () => dutyRosterService.createShift(selectedRoster.id, request);
    setShiftDialogOpen(false);
    void runManagerAction(action, editingShift ? "Shift updated." : "Shift added.", selectedRoster.id);
  }

  const orderedMyShifts = [...myShifts].sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto" }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Duty rosters</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {canManage ? "Prepare officer shifts, then publish the roster for staff." : "View your published officer shifts."}
          </Typography>
        </Box>
        {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
        {success && <Alert severity="success" onClose={() => setSuccess("")}>{success}</Alert>}

        {!canManage ? (
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>My shifts</Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
                <TextField label="From" type="date" value={myFrom} onChange={(event) => setMyFrom(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField label="To" type="date" value={myTo} onChange={(event) => setMyTo(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                <Button variant="contained" disabled={loading || myFrom > myTo} onClick={() => void loadMyShifts()}>Show shifts</Button>
              </Stack>
              {loading ? <Typography role="status">Loading your shifts…</Typography> : orderedMyShifts.length === 0 ? (
                <Alert severity="info">No published shifts were found for these dates.</Alert>
              ) : (
                <Stack spacing={1.5}>
                  {orderedMyShifts.map((shift) => (
                    <Paper key={shift.id} variant="outlined" sx={{ p: 2 }}>
                      <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", gap: 1 }}>
                        <Typography sx={{ fontWeight: 700 }}>{shift.date}</Typography>
                        <Typography>{shift.startTime}–{shift.endTime}</Typography>
                      </Stack>
                      {shift.location && <Typography variant="body2" color="text.secondary">{shift.location}</Typography>}
                      {shift.status && <Typography variant="body2" color="text.secondary">{shift.status.replace(/_/g, " ")}</Typography>}
                    </Paper>
                  ))}
                </Stack>
              )}
            </Stack>
          </Paper>
        ) : (
          <>
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Create a draft roster</Typography>
                  <Typography variant="body2" color="text.secondary">Choose the dates the roster will cover.</Typography>
                </Box>
                <Box component="form" onSubmit={handleCreateRoster} sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
                  <TextField label="Start date" type="date" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} required slotProps={{ inputLabel: { shrink: true } }} />
                  <TextField label="End date" type="date" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} required slotProps={{ inputLabel: { shrink: true } }} />
                  <Button type="submit" variant="contained" disabled={saving || !rangeStart || !rangeEnd}>Create draft</Button>
                </Box>
              </Stack>
            </Paper>

            {loading ? <Typography role="status">Loading rosters…</Typography> : rosters.length === 0 ? (
              <Alert severity="info">There are no rosters yet. Create a draft to get started.</Alert>
            ) : (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(250px, 0.75fr) minmax(0, 2fr)" }, gap: 2 }}>
                <Paper variant="outlined" sx={{ p: 2, alignSelf: "start" }}>
                  <Stack spacing={1.5} sx={{ mb: 1.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Rosters</Typography>
                    <TextField select size="small" label="Status" value={rosterStatusFilter} onChange={(event) => {
                      const status = event.target.value as "ALL" | RosterStatus;
                      setRosterStatusFilter(status);
                      setLoading(true);
                      setError("");
                      void loadManagerData(undefined, status).catch((reason: unknown) => setError(messageFrom(reason))).finally(() => setLoading(false));
                    }}>
                      <MenuItem value="ALL">All statuses</MenuItem>
                      <MenuItem value="DRAFT">Draft</MenuItem>
                      <MenuItem value="PUBLISHED">Published</MenuItem>
                      <MenuItem value="CLOSED">Closed</MenuItem>
                    </TextField>
                  </Stack>
                  <Stack spacing={1}>
                    {rosters.map((roster) => (
                      <Button key={roster.id} onClick={() => void selectRoster(roster)} variant={selectedRosterId === roster.id ? "contained" : "outlined"} sx={{ justifyContent: "space-between", gap: 1, textTransform: "none" }}>
                        <span>{roster.startDate} – {roster.endDate}</span>
                        <Chip size="small" label={roster.status} color={statusColor(roster.status)} />
                      </Button>
                    ))}
                  </Stack>
                </Paper>

                {selectedRoster && (
                  <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack spacing={2.5}>
                      <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", gap: 2 }}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>{selectedRoster.startDate} – {selectedRoster.endDate}</Typography>
                          <Typography variant="body2" color="text.secondary">{user?.prisonName || "Your assigned prison"}</Typography>
                          <Chip sx={{ mt: 1 }} label={selectedRoster.status} color={statusColor(selectedRoster.status)} />
                        </Box>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                          {selectedRoster.status === "DRAFT" && <>
                            <Button variant="contained" onClick={() => void runManagerAction(() => dutyRosterService.publishRoster(selectedRoster.id), "Roster published.", selectedRoster.id)} disabled={saving}>Publish roster</Button>
                          </>}
                          {selectedRoster.status === "PUBLISHED" && <Button color="warning" variant="outlined" onClick={() => void runManagerAction(() => dutyRosterService.closeRoster(selectedRoster.id), "Roster closed.", selectedRoster.id)} disabled={saving || selectedRoster.endDate >= today}>Close roster</Button>}
                        </Stack>
                      </Stack>

                      {selectedRoster.status === "DRAFT" && (
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                          <TextField size="small" label="Start date" type="date" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                          <TextField size="small" label="End date" type="date" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                          <Button variant="outlined" onClick={() => void runManagerAction(() => dutyRosterService.updateRoster(selectedRoster.id, rangeStart, rangeEnd), "Roster dates updated.", selectedRoster.id)} disabled={saving || !rangeStart || !rangeEnd || rangeStart > rangeEnd}>Save date range</Button>
                        </Stack>
                      )}

                      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>Officer shifts</Typography>
                        {selectedRoster.status === "DRAFT" && <Button variant="contained" onClick={() => openShiftForm()}>Add shift</Button>}
                      </Stack>
                      {selectedRoster.shifts.length === 0 ? <Alert severity="info">No shifts have been added to this roster.</Alert> : (
                        <Stack spacing={1.5}>
                          {selectedRoster.shifts.map((shift) => (
                            <Paper key={shift.id} variant="outlined" sx={{ p: 2 }}>
                              <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", gap: 1.5 }}>
                                <Box>
                                  <Typography sx={{ fontWeight: 700 }}>{shift.officerName || activeOfficers.find((officer) => officer.id === shift.officerId)?.name || "Officer"}</Typography>
                                  <Typography variant="body2" color="text.secondary">{shift.date} · {shift.startTime}–{shift.endTime}</Typography>
                                  {shift.location && <Typography variant="body2" color="text.secondary">{shift.location}</Typography>}
                                </Box>
                                <Stack direction="row" spacing={1}>
                                  {selectedRoster.status !== "CLOSED" && <Button size="small" onClick={() => openShiftForm(shift)}>Edit</Button>}
                                  {selectedRoster.status !== "CLOSED" && <Button size="small" color="error" onClick={() => void runManagerAction(() => dutyRosterService.deleteShift(selectedRoster.id, shift.id), selectedRoster.status === "DRAFT" ? "Shift removed." : "Shift cancelled.", selectedRoster.id)} disabled={saving}>{selectedRoster.status === "DRAFT" ? "Remove" : "Cancel shift"}</Button>}
                                </Stack>
                              </Stack>
                            </Paper>
                          ))}
                        </Stack>
                      )}
                    </Stack>
                  </Paper>
                )}
              </Box>
            )}
          </>
        )}
      </Stack>

      <Dialog open={shiftDialogOpen} onClose={() => !saving && setShiftDialogOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleSaveShift}>
          <DialogTitle>{editingShift ? "Edit officer shift" : "Add officer shift"}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {activeOfficers.length === 0 && <Alert severity="warning">No active Prison Officer accounts are available.</Alert>}
              <TextField select label="Officer" value={shiftForm.officerId} onChange={(event) => setShiftForm({ ...shiftForm, officerId: event.target.value })} required>
                <MenuItem value="">Select a Prison Officer</MenuItem>
                {activeOfficers.map((officer) => <MenuItem key={officer.id} value={officer.id}>{officer.name}{officer.badgeId ? ` · ${officer.badgeId}` : ""}</MenuItem>)}
              </TextField>
              <TextField label="Shift date" type="date" value={shiftForm.date} onChange={(event) => setShiftForm({ ...shiftForm, date: event.target.value })} required slotProps={{ inputLabel: { shrink: true } }} />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField fullWidth label="Starts at" type="time" value={shiftForm.startTime} onChange={(event) => setShiftForm({ ...shiftForm, startTime: event.target.value })} required slotProps={{ inputLabel: { shrink: true } }} />
                <TextField fullWidth label="Ends at" type="time" value={shiftForm.endTime} onChange={(event) => setShiftForm({ ...shiftForm, endTime: event.target.value })} required slotProps={{ inputLabel: { shrink: true } }} />
              </Stack>
              <TextField label="Location" value={shiftForm.location} onChange={(event) => setShiftForm({ ...shiftForm, location: event.target.value })} required />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setShiftDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving || activeOfficers.length === 0}>{editingShift ? "Save changes" : "Add shift"}</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}

export default DutyRosters;
