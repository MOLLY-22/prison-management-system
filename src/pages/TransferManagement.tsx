import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import TransferForm from "../components/TransferForm";
import TransferHistory from "../components/TransferHistory";
import TransferApproval from "../components/TransferApproval";
import { inmateService } from "../api/inmateService";
import {
  transferService,
  type CreateTransferRequest,
  type TransferRecord,
} from "../api/transferService";
import { useAuth } from "../context/AuthContext";

function messageFrom(error: unknown) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || error.message;
  }
  return error instanceof Error ? error.message : "The transfer request failed.";
}

function TransferManagement() {
  const { can } = useAuth();
  const canCreate = can("transfers:create");
  const canUpdateStatus = can("transfers:updateStatus");
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadTransfers = useCallback(async () => {
    try {
      setTransfers(await transferService.getTransfers());
      setError("");
    } catch (reason: unknown) {
      setError(messageFrom(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTransfers();
  }, [loadTransfers]);

  async function createTransfer(payload: CreateTransferRequest) {
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const created = await transferService.createTransfer(payload);
      setTransfers((current) => [
        created,
        ...current.filter((item) => item.id !== created.id),
      ]);
      setSuccessMessage("Transfer request created successfully.");
    } finally {
      setSaving(false);
    }
  }

  async function performAction(
    action: () => Promise<TransferRecord>,
    success: string,
    refreshPlacement = false,
  ) {
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const updatedTransfer = await action();
      setTransfers((current) => [
        updatedTransfer,
        ...current.filter((item) => item.id !== updatedTransfer.id),
      ]);
      setSelectedTransfer(null);
      setSuccessMessage(success);
      await loadTransfers();
      if (refreshPlacement) {
        try {
          const inmate = await inmateService.getInmate(updatedTransfer.inmateId);
          const prison = inmate.prisonName || inmate.prisonId || "destination prison";
          setSuccessMessage(
            `${success} ${inmate.firstName} ${inmate.lastName}'s placement is now ${prison}, cell ${inmate.cellId || "not assigned"}.`,
          );
        } catch (reason: unknown) {
          setError(
            `The transfer was approved, but the inmate's placement could not be refreshed: ${messageFrom(reason)}`,
          );
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function refreshTransfers() {
    setLoading(true);
    await loadTransfers();
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1600, mx: "auto" }}>
      <Stack spacing={3}>
        <Typography color="text.secondary">
          Create and review transfer requests, and follow each request&apos;s progress.
        </Typography>

        {error && (
          <Alert
            severity="error"
            action={<Button color="inherit" size="small" onClick={() => void refreshTransfers()}>Retry</Button>}
          >
            {error}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" onClose={() => setSuccessMessage("")}>
            {successMessage}
          </Alert>
        )}

        {canCreate && <TransferForm onSubmit={createTransfer} />}

        {loading ? (
          <Typography role="status">Loading transfer records…</Typography>
        ) : (
          <TransferHistory
            transfers={transfers}
            onSelectTransfer={setSelectedTransfer}
          />
        )}

        {canUpdateStatus && (
          <TransferApproval
            key={`${selectedTransfer?.id ?? ""}:${selectedTransfer?.destinationPrisonId ?? ""}:${selectedTransfer?.status ?? ""}`}
            transfer={selectedTransfer}
            saving={saving}
            onApprove={(id, cellId) => performAction(
              () => transferService.approveTransfer(id, cellId),
              "Transfer approved and destination cell assigned.",
              true,
            )}
            onReject={(id) => performAction(
              () => transferService.rejectTransfer(id),
              "Transfer rejected.",
            )}
            onCancel={(id) => performAction(
              () => transferService.cancelTransfer(id),
              "Transfer cancelled.",
            )}
            onClose={() => setSelectedTransfer(null)}
          />
        )}
      </Stack>
    </Box>
  );
}

export default TransferManagement;
