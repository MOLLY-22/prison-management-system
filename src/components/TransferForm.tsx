import { useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { inmateService, type Inmate } from "../api/inmateService";
import { prisonService, type Prison } from "../api/prisonService";
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
  const [prisons, setPrisons] = useState<Prison[]>([]);
  const [inmateId, setInmateId] = useState("");
  const [destinationPrisonId, setDestinationPrisonId] = useState("");
  const [reason, setReason] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingOptions(true);
    Promise.all([inmateService.getInmates(), prisonService.getPrisons({ active: true })])
      .then(([inmateRecords, prisonRecords]) => {
        if (!active) return;
        setInmates(inmateRecords);
        setPrisons(prisonRecords);
      })
      .catch((error: unknown) => {
        if (active) setOptionsError(messageFrom(error));
      })
      .finally(() => {
        if (active) setLoadingOptions(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedInmate = inmates.find((inmate) => inmate.id === inmateId);
  const destinationOptions = prisons.filter(
    (prison) => prison.id !== selectedInmate?.prisonId,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

    setSaving(true);
    try {
      await onSubmit({
        inmateId: selectedInmate.id,
        destinationPrisonId,
        reason: reason.trim(),
      });
      setInmateId("");
      setDestinationPrisonId("");
      setReason("");
    } catch (error: unknown) {
      setFormError(messageFrom(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Create Transfer Request
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose an inmate and destination. The source prison is taken from the inmate record.
          </Typography>
        </Box>

        {optionsError && <Alert severity="error">{optionsError}</Alert>}
        {formError && <Alert severity="error" role="alert">{formError}</Alert>}

        <Box
          component="form"
          onSubmit={handleSubmit}
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
            }}
            disabled={loadingOptions || Boolean(optionsError)}
            required
          >
            <MenuItem value="">
              {loadingOptions ? "Loading inmates…" : "Select an inmate"}
            </MenuItem>
            {inmates.map((inmate) => (
              <MenuItem key={inmate.id} value={inmate.id}>
                {inmate.firstName} {inmate.lastName} · {inmate.prisonName || "No source prison"}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Destination prison"
            value={destinationPrisonId}
            onChange={(event) => setDestinationPrisonId(event.target.value)}
            disabled={loadingOptions || Boolean(optionsError) || !selectedInmate}
            required
          >
            <MenuItem value="">Select a destination prison</MenuItem>
            {destinationOptions.map((prison) => (
              <MenuItem key={prison.id} value={prison.id}>
                {prison.name} · {prison.location}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Transfer reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 2000 } }}
            multiline
            minRows={2}
            required
            sx={{ gridColumn: { sm: "1 / -1" } }}
          />

          <Button
            type="submit"
            variant="contained"
            disabled={saving || loadingOptions || Boolean(optionsError)}
            sx={{ justifySelf: "start" }}
          >
            {saving ? "Submitting…" : "Submit transfer request"}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}

export default TransferForm;
