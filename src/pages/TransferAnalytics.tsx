import { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Chip, FormControl, MenuItem, Paper, Select, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from "@mui/material";
import { transferService, type TransferRecord } from "../api/transferService";

type Period = "day" | "week" | "month" | "year";
type Bucket = { key: string; label: string; count: number };

function startOfWeek(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  return start;
}

function periodBucket(date: Date, period: Period): Bucket {
  const year = date.getFullYear();
  if (period === "day") return { key: `${year}-${date.getMonth()}-${date.getDate()}`, label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }), count: 0 };
  if (period === "week") {
    const start = startOfWeek(date);
    return { key: `${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`, label: start.toLocaleDateString(undefined, { month: "short", day: "numeric" }), count: 0 };
  }
  if (period === "month") return { key: `${year}-${date.getMonth()}`, label: date.toLocaleDateString(undefined, { month: "short", year: "numeric" }), count: 0 };
  return { key: String(year), label: String(year), count: 0 };
}

function buildBuckets(transfers: TransferRecord[], period: Period) {
  const current = new Date();
  const bucketMap = new Map<string, Bucket>();
  const periods = period === "day" ? 14 : period === "week" ? 12 : period === "month" ? 12 : 5;
  for (let offset = periods - 1; offset >= 0; offset -= 1) {
    const date = new Date(current);
    if (period === "day") date.setDate(date.getDate() - offset);
    else if (period === "week") date.setDate(date.getDate() - offset * 7);
    else if (period === "month") date.setMonth(date.getMonth() - offset, 1);
    else date.setFullYear(date.getFullYear() - offset, 0, 1);
    const bucket = periodBucket(date, period);
    if (!bucketMap.has(bucket.key)) bucketMap.set(bucket.key, bucket);
  }
  transfers.forEach((transfer) => {
    const date = new Date(transfer.requestedAt);
    if (Number.isNaN(date.getTime())) return;
    const bucket = bucketMap.get(periodBucket(date, period).key);
    if (bucket) bucket.count += 1;
  });
  return [...bucketMap.values()];
}

export default function TransferAnalytics() {
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [period, setPeriod] = useState<Period>("month");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    transferService.getTransfers()
      .then((records) => { if (active) setTransfers(records); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load transfers."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const buckets = useMemo(() => buildBuckets(transfers, period), [transfers, period]);
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...transfers]
      .filter((t) => !query || [t.id, t.inmateName, t.inmateNumber, t.sourcePrisonName, t.destinationPrisonName, t.reason, t.status].join(" ").toLowerCase().includes(query))
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }, [transfers, search]);

  return <Box className="module-workspace" sx={{ maxWidth: 1500, mx: "auto" }}>
    <Stack spacing={3}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 2, flexWrap: "wrap" }}>
        <Box><Typography variant="h4" sx={{ fontWeight: 800 }}>Transfer Analytics</Typography><Typography color="text.secondary" sx={{ mt: 0.5 }}>Transfer activity and request details.</Typography></Box>
        <FormControl size="small" sx={{ minWidth: 150 }}><Select aria-label="Group transfers by" value={period} onChange={(event) => setPeriod(event.target.value as Period)}>
          <MenuItem value="day">Daily</MenuItem><MenuItem value="week">Weekly</MenuItem><MenuItem value="month">Monthly</MenuItem><MenuItem value="year">Yearly</MenuItem>
        </Select></FormControl>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box><Typography variant="h6">Transfers by {period}</Typography><Typography variant="body2" color="text.secondary">{total} requests in the periods shown</Typography></Box>
          <Chip label={loading ? "Loading" : `${transfers.length} records`} variant="outlined" />
        </Stack>
        <Box role="img" aria-label={`Bar chart of transfers by ${period}`} sx={{ display: "flex", alignItems: "end", gap: { xs: 0.5, sm: 1.5 }, height: 250, overflowX: "auto", borderBottom: "1px solid #dfe5eb", pt: 2 }}>
          {buckets.map((bucket) => <Box key={bucket.key} title={`${bucket.label}: ${bucket.count} transfers`} sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "end", minWidth: 48, height: "100%", flex: 1 }}>
            <Typography variant="caption" sx={{ mb: 0.5 }}>{bucket.count}</Typography>
            <Box sx={{ width: "65%", minHeight: bucket.count ? 4 : 2, height: `${Math.max(1, bucket.count / max * 75)}%`, bgcolor: "#2876a8", borderRadius: "4px 4px 0 0" }} />
            <Typography variant="caption" color="text.secondary" noWrap sx={{ mt: 0.75, maxWidth: "100%" }}>{bucket.label}</Typography>
          </Box>)}
        </Box>
      </Paper>
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={2} sx={{ mb: 2 }}>
          <Box><Typography variant="h6">Transfer Details</Typography><Typography variant="body2" color="text.secondary">Search recorded transfer requests.</Typography></Box>
          <TextField size="small" label="Search transfers" placeholder="Inmate, prison, status, or ID" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ minWidth: { sm: 300 } }} />
        </Stack>
        <TableContainer sx={{ overflowX: "auto" }}><Table size="small" aria-label="Transfer details"><TableHead><TableRow><TableCell>Requested</TableCell><TableCell>Inmate</TableCell><TableCell>Transfer route</TableCell><TableCell>Reason</TableCell><TableCell>Status</TableCell></TableRow></TableHead><TableBody>
          {rows.map((t) => <TableRow key={t.id} hover><TableCell sx={{ minWidth: 155 }}>{t.requestedAt ? new Date(t.requestedAt).toLocaleString() : "—"}</TableCell><TableCell sx={{ minWidth: 160 }}>{t.inmateName || "Unknown inmate"}<Typography variant="caption" display="block" color="text.secondary">{t.inmateNumber || t.inmateId || "—"}</Typography></TableCell><TableCell sx={{ minWidth: 210 }}>{t.sourcePrisonName || t.sourcePrisonId || "—"} → {t.destinationPrisonName || t.destinationPrisonId || "—"}</TableCell><TableCell sx={{ minWidth: 180 }}>{t.reason || "—"}</TableCell><TableCell>{t.status.replaceAll("_", " ")}</TableCell></TableRow>)}
          {!rows.length && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>{loading ? "Loading transfers…" : "No transfers match your search."}</TableCell></TableRow>}
        </TableBody></Table></TableContainer>
      </Paper>
    </Stack>
  </Box>;
}
