import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import TransferForm from "../components/TransferForm";
import TransferTable from "../components/TransferTable";
import TransferApproval from "../components/TransferApproval";
import {
  transferService,
  type CreateTransferRequest,
  type TransferRecord,
} from "../api/transferService";
import "./transferManagement.css";

function messageFrom(error: unknown) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || error.message;
  }
  return error instanceof Error ? error.message : "The transfer request failed.";
}

function TransferManagement() {
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadTransfers = useCallback(async () => {
    setError("");
    try {
      setTransfers(await transferService.getTransfers());
    } catch (reason: unknown) {
      setError(messageFrom(reason));
      throw reason;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTransfers().catch(() => undefined);
  }, [loadTransfers]);

  async function createTransfer(payload: CreateTransferRequest) {
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const created = await transferService.createTransfer(payload);
      setTransfers((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setSuccessMessage("Transfer request created successfully.");
    } finally {
      setSaving(false);
    }
  }

  async function performAction(
    action: () => Promise<TransferRecord>,
    success: string,
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
      try {
        await loadTransfers();
      } catch {
        // The successful action is retained; loadTransfers displays the refresh error.
      }
    } finally {
      setSaving(false);
    }
  }

  async function refreshTransfers() {
    try {
      await loadTransfers();
    } catch {
      // loadTransfers displays the API error in the page alert.
    }
  }

  return (
    <Box className="transfer-workspace" sx={{ p: { xs: 2, md: 4 }, maxWidth: 1600, mx: "auto" }}>
      <Stack spacing={3}>
        <Box>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Create and review transfer requests, and follow each request’s progress.
          </Typography>
        </Box>

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

        <TransferForm onSubmit={createTransfer} />

        {loading ? (
          <Typography role="status">Loading transfer records…</Typography>
        ) : (
          <TransferTable transfers={transfers} onSelectTransfer={setSelectedTransfer} />
        )}

        <TransferApproval
          transfer={selectedTransfer}
          saving={saving}
          onApprove={(id, cellId) => performAction(
            () => transferService.approveTransfer(id, cellId),
            "Transfer approved and destination cell assigned.",
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
      </Stack>
    </Box>
  );
}

export default TransferManagement;
