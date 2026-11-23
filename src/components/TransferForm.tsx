import { useEffect, useMemo, useState, type FormEvent } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
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
import { inmateService, type Inmate } from "../api/inmateService";
import { prisonService, type PrisonSummary } from "../api/prisonService";
import type { CreateTransferRequest } from "../api/transferService";

type TransferFormProps = {
  onSubmit: (transfer: CreateTransferRequest) => Promise<void>;
};

function messageFrom(error: unknown) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || error.message;
  }
  return error instanceof Error ? error.message : "Could not submit transfer request.";
}

function TransferForm({ onSubmit }: TransferFormProps) {
  const [inmates, setInmates] = useState<Inmate[]>([]);
  const [prisons, setPrisons] = useState<PrisonSummary[]>([]);
  const [inmateId, setInmateId] = useState("");
  const [destinationPrisonId, setDestinationPrisonId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([inmateService.getInmates(), prisonService.getPrisons(0, "", "active", 100)])
      .then(([inmateRecords, prisonPage]) => {
        if (!active) return;
        setInmates(inmateRecords);
        setPrisons(prisonPage.records);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(messageFrom(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedInmate = useMemo(
    () => inmates.find((inmate) => inmate.id === inmateId),
    [inmates, inmateId],
  );
  const availablePrisons = prisons.filter(
    (prison) => prison.id !== selectedInmate?.prisonId,
  );
  const selectedDestination = availablePrisons.find(
    (prison) => prison.id === destinationPrisonId,
  );

  function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (!selectedInmate?.prisonId) {
      setFormError("Select an inmate with an assigned source prison.");
      return;
    }
    if (!destinationPrisonId || destinationPrisonId === selectedInmate.prisonId) {
      setFormError("Select a destination prison different from the inmate's current prison.");
      return;
    }
    if (!reason.trim()) {
      setFormError("Enter a reason for the transfer.");
      return;
    }
    if (reason.trim().length > 2000) {
      setFormError("Transfer reason must be 2,000 characters or fewer.");
      return;
    }
    setConfirmationOpen(true);
  }

  async function handleConfirm() {
    if (!selectedInmate || !destinationPrisonId || !reason.trim()) return;
    setSubmitting(true);
    setFormError("");
    try {
      await onSubmit({
        inmateId: selectedInmate.id,
        destinationPrisonId,
        reason: reason.trim(),
      });
      setInmateId("");
      setDestinationPrisonId("");
      setReason("");
      setConfirmationOpen(false);
    } catch (error: unknown) {
      setFormError(
        axios.isAxiosError(error) && !error.response
          ? "We couldn’t confirm whether your request was submitted. Check the transfer list before trying again."
          : messageFrom(error),
      );
      setConfirmationOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Create Transfer Request</Typography>
            <Typography variant="body2" color="text.secondary">
              The source prison is taken from the selected inmate's record.
            </Typography>
          </Box>
          {loadError && (
            <Alert severity="error" role="alert">
              Could not load inmates and prisons: {loadError}
            </Alert>
          )}
          {formError && <Alert severity="error" role="alert">{formError}</Alert>}
          <Box
            component="form"
            onSubmit={handleReview}
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
              gap: 2,
            }}
          >
            <TextField
              select
              label="Inmate"
              value={inmateId}
              onChange={(event) => {
                setInmateId(event.target.value);
                setDestinationPrisonId("");
                setFormError("");
              }}
              disabled={loading || Boolean(loadError) || inmates.length === 0}
              helperText={loading ? "Loading inmates…" : inmates.length === 0 ? "No inmates available." : undefined}
              required
            >
              <MenuItem value="">Select an inmate</MenuItem>
              {inmates.map((inmate) => (
                <MenuItem key={inmate.id} value={inmate.id}>
                  {inmate.firstName} {inmate.lastName} · {inmate.prisonName || "No source prison"}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Source prison"
              value={selectedInmate?.prisonName || "Select an inmate"}
              disabled
            />
            <TextField
              select
              label="Destination prison"
              value={destinationPrisonId}
              onChange={(event) => {
                setDestinationPrisonId(event.target.value);
                setFormError("");
              }}
              disabled={loading || Boolean(loadError) || !selectedInmate}
              helperText={selectedInmate && availablePrisons.length === 0 ? "No other active prisons available." : undefined}
              required
            >
              <MenuItem value="">Select a destination prison</MenuItem>
              {availablePrisons.map((prison) => (
                <MenuItem key={prison.id} value={prison.id}>
                  {prison.name} · {prison.location}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Transfer reason"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setFormError("");
              }}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
              helperText={`${reason.length}/2000 characters`}
              multiline
              minRows={2}
              required
              sx={{ gridColumn: { sm: "1 / -1" } }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={loading || submitting || Boolean(loadError) || inmates.length === 0}
              sx={{ justifySelf: "start" }}
            >
              Review transfer
            </Button>
          </Box>
        </Stack>
      </Paper>
      <Dialog
        open={confirmationOpen}
        onClose={() => !submitting && setConfirmationOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="transfer-confirmation-title"
      >
        <DialogTitle id="transfer-confirmation-title">Confirm Transfer Request</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Typography><strong>Inmate:</strong> {selectedInmate?.firstName} {selectedInmate?.lastName}</Typography>
            <Typography><strong>Source:</strong> {selectedInmate?.prisonName || selectedInmate?.prisonId}</Typography>
            <Typography><strong>Destination:</strong> {selectedDestination?.name || "—"}</Typography>
            <Typography><strong>Reason:</strong> {reason.trim()}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmationOpen(false)} disabled={submitting}>Back</Button>
          <Button onClick={() => void handleConfirm()} variant="contained" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit request"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default TransferForm;
