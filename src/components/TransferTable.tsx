import { useMemo, useState } from "react";
import {
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import type { TransferRecord, TransferStatus } from "../api/transferService";
export type { TransferRecord } from "../api/transferService";

type TransferTableProps = {
  transfers: TransferRecord[];
  onSelectTransfer: (transfer: TransferRecord) => void;
};

const statuses: TransferStatus[] = [
  "PENDING",
  "APPROVED",
  "CONFIRMED",
  "REJECTED",
  "IN_TRANSIT",
  "RECEIVED",
  "CANCELLED",
];

const statusColors: Record<
  TransferStatus,
  "default" | "primary" | "info" | "success" | "warning" | "error"
> = {
  PENDING: "warning",
  APPROVED: "info",
  CONFIRMED: "info",
  IN_TRANSIT: "primary",
  RECEIVED: "success",
  CANCELLED: "default",
  REJECTED: "error",
};

function displayStatus(status: TransferStatus) {
  return status.replace(/_/g, " ");
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function TransferTable({ transfers, onSelectTransfer }: TransferTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TransferStatus | "ALL">("ALL");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filteredTransfers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transfers.filter((transfer) => {
      const searchable = [
        transfer.inmateName,
        transfer.inmateNumber,
        transfer.inmateId,
        transfer.sourcePrisonName,
        transfer.destinationPrisonName,
        transfer.requestedBy,
        transfer.reason,
      ].join(" ").toLowerCase();
      return (!query || searchable.includes(query)) &&
        (statusFilter === "ALL" || transfer.status === statusFilter);
    });
  }, [transfers, search, statusFilter]);

  const visibleTransfers = filteredTransfers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
        Transfer Records
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
        Search requests or filter them by status.
      </Typography>
      <TextField
        label="Search transfers"
        placeholder="Inmate, prison, requester, or reason"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(0);
        }}
        fullWidth
        sx={{ mb: 2 }}
      />
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="transfer-status-filter-label">Filter by Status</InputLabel>
        <Select
          labelId="transfer-status-filter-label"
          value={statusFilter}
          label="Filter by Status"
          onChange={(event) => {
            setStatusFilter(event.target.value as TransferStatus | "ALL");
            setPage(0);
          }}
        >
          <MenuItem value="ALL">All statuses</MenuItem>
          {statuses.map((status) => (
            <MenuItem key={status} value={status}>{displayStatus(status)}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <TableContainer>
        <Table size="small" aria-label="Transfer records">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f1f5f9" }}>
              <TableCell>Inmate</TableCell>
              <TableCell>Movement</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Requested</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleTransfers.map((transfer) => (
              <TableRow key={transfer.id} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {transfer.inmateName || "Inmate"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {transfer.inmateNumber || transfer.inmateId}
                  </Typography>
                </TableCell>
                <TableCell>
                  {transfer.sourcePrisonName || transfer.sourcePrisonId}
                  <br />
                  → {transfer.destinationPrisonName || transfer.destinationPrisonId}
                </TableCell>
                <TableCell>{transfer.reason}</TableCell>
                <TableCell>{formatDate(transfer.requestedAt)}</TableCell>
                <TableCell>
                  <Chip label={displayStatus(transfer.status)} color={statusColors[transfer.status]} size="small" />
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => onSelectTransfer(transfer)}>Review</Button>
                </TableCell>
              </TableRow>
            ))}
            {visibleTransfers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  No transfer records match your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={filteredTransfers.length}
        page={page}
        onPageChange={(_, nextPage) => setPage(nextPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(Number(event.target.value));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25]}
      />
    </Paper>
  );
}

export default TransferTable;
