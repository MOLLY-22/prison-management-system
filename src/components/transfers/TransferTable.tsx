
import { useMemo, useState } from 'react'
import {
  Box,
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

    return transfers.filter(transfer => {
      const searchableValues = [
        transfer.inmateNumber,
        transfer.inmateName,
        transfer.originFacility,
        transfer.destinationFacility,
        transfer.requestedBy,
        transfer.reason,
        String(transfer.id),
      ]

      const matchesSearch =
        !searchTerm ||
        searchableValues.some(value =>
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
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 3 },
        minWidth: 0,
        borderColor: '#e2e8f0',
        borderRadius: 2,
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          mb: 1,
        }}
      >
        <Typography
          variant="h6"
          component="h2"
          sx={{
            color: '#172033',
            fontWeight: 750,
            fontSize: '1.1rem',
          }}
        >
          Movement Tracking
        </Typography>

        <Chip
          label={`${filteredTransfers.length} records`}
          size="small"
          sx={{
            color: '#334155',
            backgroundColor: '#f1f5f9',
            fontWeight: 600,
          }}
        />
      </Box>

      <Typography
        variant="body2"
        sx={{ mb: 2.5, color: '#64748b', lineHeight: 1.6 }}
      >
        Search transfer requests and filter them by their current status.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            sm: 'minmax(0, 1.5fr) minmax(160px, 1fr)',
          },
          gap: 1.5,
          mb: 2.5,
          '& .MuiOutlinedInput-root': {
            borderRadius: 1.5,
            backgroundColor: '#ffffff',
          },
        }}
      >
        <TextField
          label="Search transfers"
          placeholder="Inmate, ID, facility, officer or reason"
          value={search}
          onChange={event => handleSearchChange(event.target.value)}
          fullWidth
          size="small"
          slotProps={{
            htmlInput: {
              'aria-label': 'Search transfer records',
            },
          }}
        />

        <FormControl fullWidth size="small">
          <InputLabel id="transfer-status-filter-label">
            Filter by Status
          </InputLabel>

          <Select
            labelId="transfer-status-filter-label"
            value={statusFilter}
            label="Filter by Status"
            onChange={event => handleStatusChange(event.target.value)}
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
      </Box>

      <TableContainer
        sx={{
          width: '100%',
          overflowX: 'auto',
          border: '1px solid #e2e8f0',
          borderRadius: 1.5,
        }}
      >
        <Table
          size="small"
          aria-label="Transfer records"
          sx={{ minWidth: 620 }}
        >
          <TableHead>
            <TableRow
              sx={{
                backgroundColor: '#f1f5f9',
                '& th': {
                  color: '#334155',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  borderColor: '#e2e8f0',
                  py: 1.5,
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
            {visibleTransfers.map(transfer => (
              <TableRow
                key={transfer.id}
                hover
                sx={{
                  '& td': {
                    color: '#334155',
                    borderColor: '#e2e8f0',
                    py: 1.5,
                    verticalAlign: 'top',
                  },
                  '&:last-child td': {
                    borderBottom: 0,
                  },
                }}
              >
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      color: '#172033',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {transfer.inmateName}
                  </Typography>

                  <Typography
                    variant="caption"
                    sx={{ display: 'block', mt: 0.5, color: '#64748b' }}
                  >
                    {transfer.inmateNumber}
                  </Typography>
                </TableCell>

                <TableCell sx={{ minWidth: 155 }}>
                  <Typography
                    variant="body2"
                    sx={{ color: '#334155', lineHeight: 1.5 }}
                  >
                    {transfer.originFacility}
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{
                      mt: 0.5,
                      color: '#64748b',
                      lineHeight: 1.5,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    → {transfer.destinationFacility}
                  </Typography>
                </TableCell>

                <TableCell>
                  <Chip
                    label={transfer.securityLevel}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontWeight: 600,
                      borderColor: '#cbd5e1',
                      color: '#334155',
                    }}
                  />
                </TableCell>

                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {transfer.requestDate}
                </TableCell>

                <TableCell>
                  <Chip
                    label={transfer.status}
                    color={statusColors[transfer.status]}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                </TableCell>

                {onSelectTransfer && (
                  <TableCell>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => onSelectTransfer(transfer)}
                      sx={{
                        minWidth: 0,
                        px: 1,
                        color: '#1d4ed8',
                        fontWeight: 700,
                        textTransform: 'none',
                        '&:hover': {
                          backgroundColor: '#eff6ff',
                        },
                      }}
                    >
                      Review
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}

            {visibleTransfers.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={onSelectTransfer ? 6 : 5}
                  align="center"
                  sx={{ py: 5, color: '#64748b', borderBottom: 0 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    No transfer records found
                  </Typography>

                  <Typography
                    variant="caption"
                    sx={{ display: 'block', mt: 0.5 }}
                  >
                    Try changing your search or status filter.
                  </Typography>
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
        onRowsPerPageChange={event => {
          setRowsPerPage(Number(event.target.value))
          setPage(0)
        }}
        rowsPerPageOptions={[5, 10, 25]}
        sx={{
          mt: 1,
          color: '#475569',
          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows':
            {
              fontSize: '0.8rem',
            },
        }}
      />

      <Typography
        variant="caption"
        sx={{ color: '#64748b', display: 'block', mt: 0.5 }}
      >
        Showing {filteredTransfers.length} matching transfer record(s).
      </Typography>
    </Paper>
  )
}

export default TransferTable
