import { useMemo, useState, type ChangeEvent } from 'react'
import type { SelectChangeEvent } from '@mui/material/Select'
import {
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
} from '@mui/material'

export type TransferStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'CANCELLED'

export interface TransferRecord {
  id: string
  inmateId: string
  inmateName: string
  sourcePrisonName: string
  destinationPrisonName: string
  destinationPrisonId: string
  reason?: string
  requestedAt: string
  status: TransferStatus
}

interface TransferTableProps {
  transfers: TransferRecord[]
  onSelectTransfer?: (transfer: TransferRecord) => void
}

const statusOptions: {
  value: TransferStatus
  label: string
  color: 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'
}[] = [
  { value: 'PENDING', label: 'Pending', color: 'warning' },
  { value: 'APPROVED', label: 'Approved', color: 'info' },
  { value: 'REJECTED', label: 'Rejected', color: 'error' },
  { value: 'IN_TRANSIT', label: 'In Transit', color: 'primary' },
  { value: 'RECEIVED', label: 'Received', color: 'success' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'default' },
]

function formatDate(value: string): string {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString()
}

function TransferTable({
  transfers,
  onSelectTransfer,
}: TransferTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(5)

  const filteredTransfers = useMemo(() => {
    const searchTerm = search.trim().toLowerCase()

    return transfers.filter(transfer => {
      const matchesSearch =
        !searchTerm ||
        transfer.inmateName.toLowerCase().includes(searchTerm) ||
        transfer.inmateId.toLowerCase().includes(searchTerm)

      const matchesStatus =
        statusFilter === 'ALL' || transfer.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [transfers, search, statusFilter])

  const visibleTransfers = filteredTransfers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  )

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value)
    setPage(0)
  }

  function handleStatusChange(event: SelectChangeEvent) {
    setStatusFilter(event.target.value)
    setPage(0)
  }

  function handleRowsPerPageChange(event: ChangeEvent<HTMLInputElement>) {
    setRowsPerPage(Number(event.target.value))
    setPage(0)
  }

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography
        variant="h6"
        component="h2"
        gutterBottom
        sx={{ color: '#172033', fontWeight: 700 }}
      >
        Transfer Records
      </Typography>

      <Typography variant="body2" sx={{ mb: 2, color: '#475569' }}>
        Search by inmate name or ID, or filter by transfer status.
      </Typography>

      <TextField
        label="Search by inmate name or ID"
        placeholder="Enter inmate name or ID"
        value={search}
        onChange={handleSearchChange}
        fullWidth
        sx={{ mb: 2 }}
      />

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="transfer-status-filter-label">
          Filter by Status
        </InputLabel>

        <Select
          labelId="transfer-status-filter-label"
          value={statusFilter}
          label="Filter by Status"
          onChange={handleStatusChange}
        >
          <MenuItem value="ALL">All statuses</MenuItem>
          {statusOptions.map(option => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TableContainer>
        <Table size="small" aria-label="Transfer records">
          <TableHead>
            <TableRow
              sx={{
                backgroundColor: '#f1f5f9',
                '& th': {
                  color: '#334155',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                },
              }}
            >
              <TableCell>Inmate</TableCell>
              <TableCell>Movement</TableCell>
              <TableCell>Requested</TableCell>
              <TableCell>Status</TableCell>
              {onSelectTransfer && <TableCell>Action</TableCell>}
            </TableRow>
          </TableHead>

          <TableBody>
            {visibleTransfers.map(transfer => {
              const status = statusOptions.find(
                option => option.value === transfer.status,
              )

              return (
                <TableRow
                  key={transfer.id}
                  hover
                  sx={{
                    '& td': {
                      color: '#334155',
                      borderColor: '#e2e8f0',
                    },
                  }}
                >
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: '#172033' }}
                    >
                      {transfer.inmateName}
                    </Typography>

                    <Typography variant="caption" sx={{ color: '#475569' }}>
                      {transfer.inmateId}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {transfer.sourcePrisonName || '—'}
                    </Typography>

                    <Typography variant="body2" sx={{ color: '#475569' }}>
                      → {transfer.destinationPrisonName || '—'}
                    </Typography>
                  </TableCell>

                  <TableCell>{formatDate(transfer.requestedAt)}</TableCell>

                  <TableCell>
                    <Chip
                      label={status?.label ?? transfer.status}
                      color={status?.color ?? 'default'}
                      size="small"
                    />
                  </TableCell>

                  {onSelectTransfer && (
                    <TableCell>
                      <Typography
                        component="button"
                        onClick={() => onSelectTransfer(transfer)}
                        sx={{
                          border: 0,
                          background: 'none',
                          color: 'primary.main',
                          cursor: 'pointer',
                          font: 'inherit',
                          fontWeight: 600,
                          textDecoration: 'underline',
                        }}
                      >
                        Review
                      </Typography>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}

            {visibleTransfers.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={onSelectTransfer ? 5 : 4}
                  align="center"
                  sx={{ py: 4, color: '#475569' }}
                >
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
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={[5, 10, 25]}
      />

      <Typography variant="caption" sx={{ color: '#475569' }}>
        Showing {filteredTransfers.length} matching transfer record(s).
      </Typography>
    </Paper>
  )
}

export default TransferTable
