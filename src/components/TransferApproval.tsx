import { useEffect, useState } from "react";
import axios from "axios";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { inmateService, type Cell } from "../api/inmateService";
import type { TransferRecord } from "../api/transferService";

type TransferApprovalProps = {
  transfer: TransferRecord | null;
  saving: boolean;
  onApprove: (transferId: string, destinationCellId: string) => Promise<void>;
  onReject: (transferId: string) => Promise<void>;
  onCancel: (transferId: string) => Promise<void>;
  onClose: () => void;
};

function messageFrom(error: unknown) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || error.message;
  }
  return error instanceof Error ? error.message : "Could not load destination cells.";
}

function TransferApproval({
  transfer,
  saving,
  onApprove,
  onReject,
  onCancel,
  onClose,
}: TransferApprovalProps) {
  const [cells, setCells] = useState<Cell[]>([]);
  const [destinationCellId, setDestinationCellId] = useState("");
  const [loadingCells, setLoadingCells] = useState(false);
  const [cellError, setCellError] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    setDestinationCellId("");
    setActionError("");
    setCellError("");
    if (!transfer || transfer.status !== "PENDING" || !transfer.destinationPrisonId) {
      setCells([]);
      return;
    }

    let active = true;
    setLoadingCells(true);
    inmateService.getCells({ prisonId: transfer.destinationPrisonId })
      .then((records) => {
        if (active) setCells(records.filter((cell) => cell.availableSpaces > 0));
      })
      .catch((error: unknown) => {
        if (active) setCellError(messageFrom(error));
      })
      .finally(() => {
        if (active) setLoadingCells(false);
      });
    return () => {
      active = false;
    };
  }, [transfer]);

  async function runAction(action: () => Promise<void>) {
    setActionError("");
    try {
      await action();
      onClose();
    } catch (error: unknown) {
      setActionError(messageFrom(error));
    }
  }

  return (
    <Dialog
      open={Boolean(transfer)}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="transfer-review-title"
    >
      <DialogTitle id="transfer-review-title">Review Transfer</DialogTitle>
      <DialogContent dividers>
        {transfer && (
          <Stack spacing={2}>
            {actionError && <Alert severity="error" role="alert">{actionError}</Alert>}
            <Alert severity={transfer.status === "PENDING" ? "warning" : "info"}>
              Status: {transfer.status.replace(/_/g, " ")}
            </Alert>
            <Typography><strong>Inmate:</strong> {transfer.inmateName || transfer.inmateId}</Typography>
            <Typography><strong>Source:</strong> {transfer.sourcePrisonName || transfer.sourcePrisonId}</Typography>
            <Typography><strong>Destination:</strong> {transfer.destinationPrisonName || transfer.destinationPrisonId}</Typography>
            <Typography><strong>Reason:</strong> {transfer.reason}</Typography>
            <Typography><strong>Requested by:</strong> {transfer.requestedBy || "—"}</Typography>
            <Typography><strong>Requested at:</strong> {transfer.requestedAt || "—"}</Typography>

            {transfer.status === "PENDING" && (
              <>
                {cellError && <Alert severity="error">{cellError}</Alert>}
                <TextField
                  select
                  label="Destination cell"
                  value={destinationCellId}
                  onChange={(event) => setDestinationCellId(event.target.value)}
                  disabled={loadingCells || Boolean(cellError) || saving}
                  required
                >
                  <MenuItem value="">
                    {loadingCells ? "Loading available cells…" : "Select an available cell"}
                  </MenuItem>
                  {cells.map((cell) => (
                    <MenuItem key={cell.id} value={cell.id}>
                      {cell.blockName} · {cell.name} · {cell.availableSpaces} spaces
                    </MenuItem>
                  ))}
                </TextField>
                {!loadingCells && !cellError && cells.length === 0 && (
                  <Alert severity="warning">No available cells were returned for the destination prison.</Alert>
                )}
              </>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose} color="inherit" disabled={saving}>Close</Button>
        {transfer?.status === "PENDING" && (
          <>
            <Button
              color="error"
              variant="outlined"
              onClick={() => void runAction(() => onReject(transfer.id))}
              disabled={saving}
            >
              Reject
            </Button>
            <Button
              variant="contained"
              onClick={() => void runAction(() => onApprove(transfer.id, destinationCellId))}
              disabled={saving || loadingCells || !destinationCellId}
            >
              {saving ? "Saving…" : "Approve and assign cell"}
            </Button>
          </>
        )}
        {(transfer?.status === "PENDING" || transfer?.status === "APPROVED" || transfer?.status === "IN_TRANSIT") && (
          <Button
            color="warning"
            variant="outlined"
            onClick={() => void runAction(() => onCancel(transfer.id))}
            disabled={saving}
          >
            Cancel transfer
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default TransferApproval;
