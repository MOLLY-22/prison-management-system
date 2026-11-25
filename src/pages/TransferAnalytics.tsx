import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert, Box, Button, Chip, FormControl, MenuItem, Paper, Select,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TablePagination, TableRow, TextField, Typography,
} from "@mui/material";
import { transferService, type TransferRecord } from "../api/transferService";

type Period = "day" | "week" | "month" | "year";
type Bucket = { key: string; label: string; start: Date; end: Date; count: number };

const periodNames: Record<Period, string> = { day: "day", week: "week", month: "month", year: "year" };

function startOfWeek(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  return start;
}

function toBucket(date: Date, period: Period): Bucket {
  let start: Date;
  let end: Date;
  let label: string;
  if (period === "day") {
    start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    label = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } else if (period === "week") {
    start = startOfWeek(date);
    end = new Date(start);
    end.setDate(end.getDate() + 7);
    label = `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}–${new Date(end.getTime() - 1).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  } else if (period === "month") {
    start = new Date(date.getFullYear(), date.getMonth(), 1);
    end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    label = start.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  } else {
    start = new Date(date.getFullYear(), 0, 1);
    end = new Date(date.getFullYear() + 1, 0, 1);
    label = String(date.getFullYear());
  }
  return { key: start.toISOString().slice(0, 10), label, start, end, count: 0 };
}

function buildBuckets(transfers: TransferRecord[], period: Period) {
  const now = new Date();
  const buckets = new Map<string, Bucket>();
  const count = period === "day" ? 14 : period === "week" ? 12 : period === "month" ? 12 : 5;
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(now);
    if (period === "day") date.setDate(date.getDate() - offset);
    else if (period === "week") date.setDate(date.getDate() - offset * 7);
    else if (period === "month") date.setMonth(date.getMonth() - offset, 1);
    else date.setFullYear(date.getFullYear() - offset, 0, 1);
    const bucket = toBucket(date, period);
    if (!buckets.has(bucket.key)) buckets.set(bucket.key, bucket);
  }
  transfers.forEach((transfer) => {
    const date = new Date(transfer.requestedAt);
    if (Number.isNaN(date.getTime())) return;
    const bucket = buckets.get(toBucket(date, period).key);
    if (bucket) bucket.count += 1;
  });
  return [...buckets.values()];
}

function formatRange(bucket: Bucket, period: Period) {
  if (period === "day") return bucket.start.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  if (period === "year") return bucket.label;
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return `${bucket.start.toLocaleDateString(undefined, options)} – ${new Date(bucket.end.getTime() - 1).toLocaleDateString(undefined, options)}`;
}

export default function TransferAnalytics() {
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [period, setPeriod] = useState<Period>("month");
  const [selectedKey, setSelectedKey] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTransfers = useCallback(async (isActive: () => boolean = () => true) => {
    setLoading(true);
    setError("");
    try {
      const records = await transferService.getTransfers();
      if (isActive()) setTransfers(records);
    } catch (reason: unknown) {
      if (isActive()) {
        setError(
          axios.isAxiosError<{ message?: string }>(reason)
            ? reason.response?.data?.message || reason.message
            : reason instanceof Error ? reason.message : "Unable to load transfers.",
        );
      }
    } finally {
      if (isActive()) setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    void loadTransfers(() => active);
    return () => { active = false; };
  }, [loadTransfers]);

  const buckets = useMemo(() => buildBuckets(transfers, period), [transfers, period]);
  const selected = buckets.find((bucket) => bucket.key === selectedKey) ?? buckets[buckets.length - 1];
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const periodTransfers = useMemo(() => transfers.filter((transfer) => {
      const date = new Date(transfer.requestedAt);
      return Boolean(selected && date >= selected.start && date < selected.end);
    }), [transfers, selected]);
  const matching = useMemo(() => {
    const query = search.trim().toLowerCase();
    return periodTransfers.filter((transfer) => !query || [transfer.id, transfer.inmateName, transfer.inmateNumber, transfer.sourcePrisonName, transfer.destinationPrisonName, transfer.reason, transfer.status].join(" ").toLowerCase().includes(query))
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }, [periodTransfers, search]);
  const pendingCount = periodTransfers.filter((transfer) => transfer.status === "PENDING").length;
  const receivedCount = periodTransfers.filter((transfer) => transfer.status === "RECEIVED").length;

  function changePeriod(next: Period) {
    setPeriod(next);
    setSelectedKey("");
    setPage(0);
  }

  return <Box className="module-workspace" sx={{ maxWidth: 1500, mx: "auto" }}>
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "end" } }}>
        <Box><Typography color="text.secondary">Track transfer requests over time and inspect the records behind each total.</Typography></Box>
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <Select aria-label="Group transfers by" value={period} onChange={(event) => changePeriod(event.target.value as Period)}>
            <MenuItem value="day">By day</MenuItem><MenuItem value="week">By week</MenuItem><MenuItem value="month">By month</MenuItem><MenuItem value="year">By year</MenuItem>
          </Select>
        </FormControl>
      </Stack>
      {error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void loadTransfers()}>Retry</Button>}>{error}</Alert>}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
        {[
          { label: `Requests · selected ${periodNames[period]}`, value: selected?.count ?? 0, note: selected ? formatRange(selected, period) : "No period selected" },
          { label: "Pending in period", value: pendingCount, note: "Awaiting a decision" },
          { label: "Received in period", value: receivedCount, note: "Marked as received" },
        ].map((item) => <Paper key={item.label} sx={{ p: 2.5 }}><Typography variant="body2" color="text.secondary">{item.label}</Typography><Typography variant="h4" sx={{ mt: 1, fontWeight: 800, color: "#17324d" }}>{item.value}</Typography><Typography variant="caption" color="text.secondary">{item.note}</Typography></Paper>)}
      </Box>

      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}>
          <Box><Typography variant="h6">Transfer volume</Typography><Typography variant="body2" color="text.secondary">Select a bar to view its transfer details below.</Typography></Box>
          <Chip label={loading ? "Loading records…" : `${transfers.length} records loaded`} variant="outlined" />
        </Stack>
        <Box role="group" aria-label={`Transfers by ${period}`} sx={{ display: "flex", alignItems: "stretch", gap: { xs: 0.5, sm: 1.5 }, minHeight: 270, overflowX: "auto", borderBottom: "1px solid #dfe5eb", pt: 2 }}>
          {buckets.map((bucket) => {
            const active = selected?.key === bucket.key;
            return <button key={bucket.key} type="button" aria-pressed={active} aria-label={`${bucket.label}: ${bucket.count} transfers; select to view details`} onClick={() => { setSelectedKey(bucket.key); setPage(0); }} style={{ background: "none", border: 0, cursor: "pointer", color: "inherit", font: "inherit", minWidth: 54, flex: 1, padding: 0 }}>
              <span style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "end" }}>
                <Typography variant="caption" sx={{ mb: 0.5, fontWeight: active ? 800 : 500 }}>{bucket.count}</Typography>
                <span style={{ width: "65%", height: `${Math.max(2, bucket.count / max * 165)}px`, minHeight: 4, borderRadius: "4px 4px 0 0", background: active ? "#0d5b91" : "#8db7d3", outline: active ? "2px solid #0d5b91" : "none", outlineOffset: 2 }} />
                <Typography variant="caption" color={active ? "text.primary" : "text.secondary"} noWrap sx={{ mt: 1, maxWidth: "100%", fontWeight: active ? 700 : 400 }}>{bucket.label}</Typography>
              </span>
            </button>;
          })}
        </Box>
      </Paper>

      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}>
          <Box><Typography variant="h6">Transfer details</Typography><Typography variant="body2" color="text.secondary">{selected ? `${formatRange(selected, period)} · ${matching.length} matching transfers` : "Select a chart bar to see details."}</Typography></Box>
          <TextField size="small" label="Search this period" placeholder="Inmate, prison, status, or ID" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} sx={{ minWidth: { sm: 300 } }} />
        </Stack>
        <TableContainer sx={{ overflowX: "auto" }}><Table size="small" aria-label="Transfer details"><TableHead><TableRow><TableCell>Requested</TableCell><TableCell>Inmate</TableCell><TableCell>Transfer route</TableCell><TableCell>Reason</TableCell><TableCell>Status</TableCell></TableRow></TableHead><TableBody>
          {matching.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((transfer) => <TableRow key={transfer.id} hover><TableCell sx={{ minWidth: 155 }}>{transfer.requestedAt ? new Date(transfer.requestedAt).toLocaleString() : "—"}</TableCell><TableCell sx={{ minWidth: 160 }}>{transfer.inmateName || "Unknown inmate"}<Typography component="span" variant="caption" sx={{ display: "block" }} color="text.secondary">{transfer.inmateNumber || transfer.inmateId || "—"}</Typography></TableCell><TableCell sx={{ minWidth: 210 }}>{transfer.sourcePrisonName || transfer.sourcePrisonId || "—"} → {transfer.destinationPrisonName || transfer.destinationPrisonId || "—"}</TableCell><TableCell sx={{ minWidth: 180 }}>{transfer.reason || "—"}</TableCell><TableCell>{transfer.status.replaceAll("_", " ")}</TableCell></TableRow>)}
          {!matching.length && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>{loading ? "Loading transfers…" : "No transfers found for this period."}</TableCell></TableRow>}
        </TableBody></Table></TableContainer>
        <TablePagination component="div" count={matching.length} page={page} onPageChange={(_, nextPage) => setPage(nextPage)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(0); }} rowsPerPageOptions={[5, 10, 25]} />
      </Paper>
    </Stack>
  </Box>;
}
