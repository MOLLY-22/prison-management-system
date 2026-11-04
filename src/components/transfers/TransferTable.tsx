
import { useMemo, useState } from 'react'
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

import type {
  Transfer,
  TransferStatus,
} from '../../data/transferMockData'

interface TransferTableProps {
  transfers: Transfer[]
  onSelectTransfer?: (transfer: Transfer) => void
}

const statusColors: Record<
  TransferStatus,
  'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'
> = {
  Pending: 'warning',
  Approved: 'info',
  'In Transit': 'primary',
  Completed: 'success',
  Cancelled: 'default',
  Rejected: 'error',
}

function TransferTable({
  transfers,
  onSelectTransfer,
}: TransferTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(5)

  const filteredTransfers = useMemo(() => {
    const searchTerm = search.trim().toLowerCase()

    return transfers.filter((transfer) => {
      const searchableValues = [
        transfer.inmateNumber,
        transfer.inmateName,
        transfer.originFacility,
        transfer.destinationFacility,
        transfer.requestedBy,
        transfer.reason,
      ]

      const matchesSearch =
        !searchTerm ||
        searchableValues.some((value) =>
          value.toLowerCase().includes(searchTerm),
        )

      const matchesStatus =
        statusFilter === 'All' || transfer.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [transfers, search, statusFilter])

  const visibleTransfers = filteredTransfers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  )

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(0)
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value)
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

      <Typography
        variant="body2"
        sx={{ mb: 2, color: '#475569' }}
      >
        Search requests or filter them by their current status.
      </Typography>

      <TextField
        label="Search transfers"
        placeholder="Inmate, facility, officer, or reason"
        value={search}
        onChange={(event) => handleSearchChange(event.target.value)}
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
          onChange={(event) => handleStatusChange(event.target.value)}
        >
          <MenuItem value="All">All statuses</MenuItem>
          <MenuItem value="Pending">Pending</MenuItem>
          <MenuItem value="Approved">Approved</MenuItem>
          <MenuItem value="In Transit">In Transit</MenuItem>
          <MenuItem value="Completed">Completed</MenuItem>
          <MenuItem value="Cancelled">Cancelled</MenuItem>
          <MenuItem value="Rejected">Rejected</MenuItem>
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
              <TableCell>Security</TableCell>
              <TableCell>Requested</TableCell>
              <TableCell>Status</TableCell>
              {onSelectTransfer && <TableCell>Action</TableCell>}
            </TableRow>
          </TableHead>

          <TableBody>
            {visibleTransfers.map((transfer) => (
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

                  <Typography
                    variant="caption"
                    sx={{ color: '#475569' }}
                  >
                    {transfer.inmateNumber}
                  </Typography>
                </TableCell>

                <TableCell>
                  <Typography variant="body2" sx={{ color: '#334155' }}>
                    {transfer.originFacility}
                  </Typography>

                  <Typography variant="body2" sx={{ color: '#475569' }}>
                    → {transfer.destinationFacility}
                  </Typography>
                </TableCell>

                <TableCell>{transfer.securityLevel}</TableCell>
                <TableCell>{transfer.requestDate}</TableCell>

                <TableCell>
                  <Chip
                    label={transfer.status}
                    color={statusColors[transfer.status]}
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
            ))}

            {visibleTransfers.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={onSelectTransfer ? 6 : 5}
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
        onRowsPerPageChange={(event) => {
          setRowsPerPage(Number(event.target.value))
          setPage(0)
        }}
        rowsPerPageOptions={[5, 10, 25]}
      />

      <Typography
        variant="caption"
        sx={{ color: '#475569' }}
      >
        Showing {filteredTransfers.length} matching transfer record(s).
      </Typography>
    </Paper>
  )
}

export default TransferTable
