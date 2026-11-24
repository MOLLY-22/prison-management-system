import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { transferService, type TransferRecord, type TransferStatus } from "../api/transferService";

function messageFrom(error: unknown) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || error.message;
  }
  return error instanceof Error ? error.message : "Could not load incoming transfers.";
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

const statusColor: Record<TransferStatus, "default" | "info" | "success" | "warning" | "error" | "primary"> = {
  PENDING: "warning",
  APPROVED: "info",
  CONFIRMED: "info",
  IN_TRANSIT: "primary",
  RECEIVED: "success",
  REJECTED: "error",
  CANCELLED: "default",
};

const openStatuses = new Set<TransferStatus>(["PENDING", "APPROVED", "CONFIRMED", "IN_TRANSIT"]);

function TransferManagement() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadTransfers = useCallback(async () => {
    if (!user?.prisonId) {
      setTransfers([]);
      setError("This account has no assigned prison, so its incoming transfer inbox cannot be loaded.");
      setLoading(false);
      return;
    }
    try {
      const records = await transferService.getTransfers({ prisonId: user.prisonId });
      setTransfers(records.filter((record) => record.destinationPrisonId === user.prisonId));
      setError("");
    } catch (reason: unknown) {
      setError(messageFrom(reason));
    } finally {
      setLoading(false);
    }
  }, [user?.prisonId]);

  useEffect(() => {
    void loadTransfers();
  }, [loadTransfers]);

  const awaitingArrival = useMemo(
    () => transfers.filter((transfer) => openStatuses.has(transfer.status)),
    [transfers],
  );

  async function confirmReceipt(transfer: TransferRecord) {
    setSavingId(transfer.id);
    setError("");
    setSuccess("");
    try {
      await transferService.receiveTransfer(transfer.id);
      setSuccess(`${transfer.inmateName || "The inmate"} has been marked as received.`);
      await loadTransfers();
    } catch (reason: unknown) {
      setError(messageFrom(reason));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1500, mx: "auto" }}>
      <Stack spacing={3}>
        {error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void loadTransfers()}>Retry</Button>}>{error}</Alert>}
        {success && <Alert severity="success" onClose={() => setSuccess("")}>{success}</Alert>}

        <Paper variant="outlined" sx={{ overflow: "hidden", borderRadius: 2 }}>
          <Box sx={{ p: 2.5, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Requested transfers</Typography>
            <Chip color={awaitingArrival.length ? "warning" : "default"} label={`${awaitingArrival.length} awaiting completion`} />
          </Box>
          {loading ? (
            <Box role="status" sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5, p: 5 }}>
              <CircularProgress size={20} />
              <Typography color="text.secondary">Loading incoming transfers…</Typography>
            </Box>
          ) : (
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table aria-label="Incoming transfers">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f6f9fc" }}>
                    <TableCell>Inmate</TableCell>
                    <TableCell>From</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Requested on</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow hover key={transfer.id}>
                      <TableCell sx={{ minWidth: 170, fontWeight: 650 }}>{transfer.inmateName || transfer.inmateId}</TableCell>
                      <TableCell sx={{ minWidth: 150 }}>{transfer.sourcePrisonName || transfer.sourcePrisonId || "—"}</TableCell>
                      <TableCell sx={{ minWidth: 190 }}>{transfer.reason || "—"}</TableCell>
                      <TableCell sx={{ minWidth: 165 }}>{formatDate(transfer.requestedAt)}</TableCell>
                      <TableCell><Chip size="small" label={transfer.status.replaceAll("_", " ")} color={statusColor[transfer.status]} /></TableCell>
                      <TableCell align="right" sx={{ minWidth: 170 }}>
                        {transfer.status === "IN_TRANSIT" ? (
                          <Button size="small" variant="contained" disabled={savingId === transfer.id} onClick={() => void confirmReceipt(transfer)}>
                            {savingId === transfer.id ? "Confirming…" : "Confirm receipt"}
                          </Button>
                        ) : transfer.status === "RECEIVED" ? (
                          <Typography variant="caption" color="text.secondary">Received {formatDate(transfer.receivedAt || "")}</Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">Awaiting movement</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!transfers.length && (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>
                      No incoming transfers for this prison.
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Stack>
    </Box>
  );
}

export default TransferManagement;
