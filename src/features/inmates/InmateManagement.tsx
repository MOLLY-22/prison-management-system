import { useEffect, useMemo, useState } from 'react'
import { Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { PAGE_SIZE, createInmate, errorMessage, fetchInmates, fetchPrisonCells, fetchPrisons, fetchTransfers, httpStatus, moveInmateCell, updateInmate, type AdmissionPayload, type CellOption, type EditPayload, type Inmate, type Prison, type Transfer } from './api'
import './admissionDialog.css'

type Props = { canAdmit: boolean }
type AdmissionForm = AdmissionPayload

const emptyAdmission = (): AdmissionForm => ({ firstName: '', lastName: '', dateOfBirth: '', admissionDate: new Date().toLocaleDateString('en-CA'), offence: '', sentenceStartDate: '', sentenceEndDate: '', prisonId: '', cellId: '' })
const displayDate = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(date.length === 10 ? `${date}T00:00:00` : date))
const dateField = { inputLabel: { shrink: true } }

export function InmateManagement({ canAdmit }: Props) {
  const [search, setSearch] = useState(''); const [query, setQuery] = useState(''); const [offense, setOffense] = useState(''); const [block, setBlock] = useState(''); const [status, setStatus] = useState('All')
  const [records, setRecords] = useState<Inmate[]>([]); const [transfers, setTransfers] = useState<Transfer[]>([])
  const [pageIndex, setPageIndex] = useState(0); const [totalPages, setTotalPages] = useState(1); const [total, setTotal] = useState(0); const [reloadKey, setReloadKey] = useState(0)
  const [admissionOpen, setAdmissionOpen] = useState(false); const [admission, setAdmission] = useState<AdmissionForm>(emptyAdmission()); const [prisons, setPrisons] = useState<Prison[]>([]); const [cellOptions, setCellOptions] = useState<CellOption[]>([])
  const [saving, setSaving] = useState(false); const [admissionError, setAdmissionError] = useState<string | null>(null); const [loadError, setLoadError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null); const [page, setPage] = useState<'census' | 'transfers'>('census')
  const [editing, setEditing] = useState<Inmate | null>(null); const [editForm, setEditForm] = useState<EditPayload>({ firstName: '', lastName: '', dateOfBirth: '', admissionDate: '' })
  const [moving, setMoving] = useState<Inmate | null>(null); const [moveOptions, setMoveOptions] = useState<CellOption[]>([]); const [moveCellId, setMoveCellId] = useState('')
  const [actionError, setActionError] = useState<string | null>(null); const [busy, setBusy] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setPageIndex(0) }, 350)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let live = true
    fetchInmates(pageIndex, query)
      .then((result) => { if (!live) return; setRecords(result.records); setTotalPages(Math.max(result.totalPages, 1)); setTotal(result.totalElements); setLoadError(null) })
      .catch((error) => { if (live) setLoadError(errorMessage(error, 'Failed to load inmate records.')) })
    return () => { live = false }
  }, [pageIndex, query, reloadKey])

  useEffect(() => {
    fetchTransfers().then(setTransfers).catch((error) => { if (httpStatus(error) !== 403) setLoadError(errorMessage(error, 'Failed to load transfers.')) })
  }, [])

  useEffect(() => {
    if (!admissionOpen || prisons.length) return
    fetchPrisons().then(setPrisons).catch((error) => setAdmissionError(errorMessage(error, 'Failed to load prisons.')))
  }, [admissionOpen, prisons.length])

  useEffect(() => {
    if (!admission.prisonId) { setCellOptions([]); return }
    fetchPrisonCells(admission.prisonId).then(setCellOptions).catch((error) => setAdmissionError(errorMessage(error, 'Failed to load cells.')))
  }, [admission.prisonId])

  const filtered = useMemo(() => records.filter((record) => (!offense || record.offense.toLowerCase().includes(offense.toLowerCase())) && (!block || record.block.toLowerCase().includes(block.toLowerCase())) && (status === 'All' || record.status === status)), [records, offense, block, status])
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA')
  const addedSinceYesterday = records.filter((record) => record.admissionDate.slice(0, 10) >= yesterday).length
  const reload = () => setReloadKey((key) => key + 1)

  const openAdmission = () => { setAdmission({ ...emptyAdmission(), prisonId: prisons.length === 1 ? prisons[0].id : '' }); setAdmissionError(null); setAdmissionOpen(true) }
  const closeAdmission = () => { setAdmissionOpen(false); setAdmissionError(null) }
  const setField = (field: keyof AdmissionForm, value: string) => setAdmission((current) => ({ ...current, [field]: value, ...(field === 'prisonId' ? { cellId: '' } : {}) }))
  const saveAdmission = async () => {
    if (Object.values(admission).some((value) => !value)) { setAdmissionError('Please complete all required fields.'); return }
    setSaving(true); setAdmissionError(null)
    try { const created = await createInmate(admission); closeAdmission(); setPageIndex(0); reload(); setNotice(`${created.fullName} has been added to the census.`) } catch (error) { setAdmissionError(errorMessage(error, 'Failed to save admission.')) } finally { setSaving(false) }
  }

  const openEdit = (record: Inmate) => { setEditForm({ firstName: record.firstName, lastName: record.lastName, dateOfBirth: record.dateOfBirth, admissionDate: record.admissionDate.slice(0, 10) }); setActionError(null); setEditing(record) }
  const closeEdit = () => { setEditing(null); setActionError(null) }
  const saveEdit = async () => {
    if (!editing) return
    if (Object.values(editForm).some((value) => !value)) { setActionError('Please complete all required fields.'); return }
    setBusy(true); setActionError(null)
    try { await updateInmate(editing.id, editForm); setNotice(`${editForm.firstName} ${editForm.lastName} has been updated.`); closeEdit(); reload() } catch (error) { setActionError(errorMessage(error, 'Failed to update inmate.')) } finally { setBusy(false) }
  }

  const openMove = (record: Inmate) => {
    setMoving(record); setMoveCellId(''); setMoveOptions([]); setActionError(null)
    fetchPrisonCells(record.prisonId, record.cellId).then(setMoveOptions).catch((error) => setActionError(errorMessage(error, 'Failed to load cells.')))
  }
  const closeMove = () => { setMoving(null); setActionError(null) }
  const saveMove = async () => {
    if (!moving || !moveCellId) { setActionError('Select a target cell.'); return }
    setBusy(true); setActionError(null)
    try { await moveInmateCell(moving.id, moveCellId); setNotice(`${moving.fullName} has been moved.`); closeMove(); reload() } catch (error) { setActionError(errorMessage(error, 'Failed to move inmate.')) } finally { setBusy(false) }
  }

  const from = records.length ? pageIndex * PAGE_SIZE + 1 : 0
  const to = pageIndex * PAGE_SIZE + records.length
  if (page === 'transfers') return <TransferSchedule transfers={transfers} onBack={() => setPage('census')} />
  return <Box className="census-page">
    {notice && <Alert className="census-notice" severity="success" onClose={() => setNotice(null)}>{notice}</Alert>}
    {loadError && <Alert className="census-notice" severity="error" onClose={() => setLoadError(null)}>{loadError}</Alert>}
    <Box className="portal-heading"><Typography className="crumb">Operations / Inmate management</Typography><Box className="portal-title-row"><Box><Typography component="h1">Inmate census</Typography><Typography>Search active records, review custody details, and manage new admissions.</Typography></Box><Stack direction="row" gap={1}><Button className="workflow-button" disabled={!canAdmit} onClick={openAdmission}>New admission</Button><Button className="export-button">Export report</Button></Stack></Box></Box>
    <Box className="census-metrics"><Metric label="Active census" value={total.toLocaleString()} note={`${addedSinceYesterday} added since yesterday`} tone="blue" /><Metric label="Pending transfers" value={String(transfers.length)} note="Awaiting a decision" tone="blue" onAction={() => setPage('transfers')} actionLabel="View transfers" /></Box>
    <Paper className="filter-bar" elevation={0}><TextField placeholder="Search by name" value={search} onChange={(event) => setSearch(event.target.value)} /><Autocomplete freeSolo openOnFocus forcePopupIcon options={[...new Set(records.map((record) => record.offense))]} inputValue={offense} onInputChange={(_, value) => setOffense(value)} renderInput={(params) => <TextField {...params} placeholder="Filter by offense" />} /><TextField placeholder="Filter by cell block" value={block} onChange={(event) => setBlock(event.target.value)} /><Select value={status} onChange={(event) => setStatus(event.target.value)}>{['All', 'Active Sentence', 'Sentence Ended'].map((option) => <MenuItem key={option} value={option}>{option === 'All' ? 'All statuses' : option}</MenuItem>)}</Select><Button className="reset-button" onClick={() => { setSearch(''); setOffense(''); setBlock(''); setStatus('All') }}>Clear filters</Button></Paper>
    <Paper className="directory" elevation={0}><Box className="directory-title"><Box><Typography component="h2">Inmate Census Directory</Typography><Typography>{filtered.length} matching record{filtered.length === 1 ? '' : 's'} on this page</Typography></Box></Box><TableContainer><Table className="census-table"><TableHead><TableRow><TableCell>Inmate ID</TableCell><TableCell>Full Name</TableCell><TableCell>Offense &amp; Sentence</TableCell><TableCell>Location / Cell</TableCell><TableCell>Custody Status</TableCell><TableCell>Admission Date</TableCell><TableCell>Actions</TableCell></TableRow></TableHead><TableBody>{filtered.map((record) => <TableRow key={record.id}><TableCell><code title={record.id}>{record.id.slice(0, 8)}</code></TableCell><TableCell className="full-name">{record.fullName}</TableCell><TableCell>{record.offense}<small>{record.sentence}</small></TableCell><TableCell>{record.block}<small>{record.cell}</small></TableCell><TableCell><Chip className={`custody ${record.status.replace(' ', '-').toLowerCase()}`} label={`• ${record.status}`} /></TableCell><TableCell>{displayDate(record.admissionDate)}</TableCell><TableCell><Stack direction="row" gap={0.5}><Button size="small" disabled={!canAdmit} onClick={() => openEdit(record)}>Edit</Button><Button size="small" disabled={!canAdmit} onClick={() => openMove(record)}>Move cell</Button></Stack></TableCell></TableRow>)}</TableBody></Table></TableContainer><Box className="pagination"><span className="pagination-summary">{total === 0 ? 'No records' : <>Showing <strong>{from}–{to}</strong> of <strong>{total.toLocaleString()}</strong> records</>}</span><Box className="pagination-controls"><Button className="pagination-button" disabled={pageIndex === 0} onClick={() => setPageIndex((current) => current - 1)}>← Previous</Button><span className="pagination-page">Page <strong>{pageIndex + 1}</strong> of {totalPages}</span><Button className="pagination-button" disabled={pageIndex + 1 >= totalPages} onClick={() => setPageIndex((current) => current + 1)}>Next →</Button></Box></Box></Paper>

    <Dialog className="admission-dialog" open={admissionOpen} onClose={closeAdmission} fullWidth maxWidth="md"><DialogTitle className="admission-dialog-title"><Box><Typography component="h2">New inmate admission</Typography><Typography>Start a secure institutional census record.</Typography></Box><span>Required fields *</span></DialogTitle><DialogContent className="admission-dialog-content"><Typography className="admission-intro">Enter the verified details below. An inmate ID is assigned automatically after the record is saved.</Typography>{admissionError && <Alert severity="error">{admissionError}</Alert>}
      <Box component="fieldset" className="admission-section"><legend>Identity</legend><Box className="admission-fields admission-identity-fields"><TextField required label="First name" value={admission.firstName} onChange={(event) => setField('firstName', event.target.value)} /><TextField required label="Last name" value={admission.lastName} onChange={(event) => setField('lastName', event.target.value)} /><TextField required label="Date of birth" type="date" value={admission.dateOfBirth} onChange={(event) => setField('dateOfBirth', event.target.value)} slotProps={dateField} /></Box></Box>
      <Box component="fieldset" className="admission-section"><legend>Offence &amp; sentence</legend><Box className="admission-fields"><TextField required label="Offence" value={admission.offence} onChange={(event) => setField('offence', event.target.value)} /><TextField required label="Sentence start" type="date" value={admission.sentenceStartDate} onChange={(event) => setField('sentenceStartDate', event.target.value)} slotProps={dateField} /><TextField required label="Sentence end" type="date" value={admission.sentenceEndDate} onChange={(event) => setField('sentenceEndDate', event.target.value)} slotProps={dateField} /></Box></Box>
      <Box component="fieldset" className="admission-section"><legend>Placement &amp; custody</legend><Box className="admission-fields admission-placement-fields"><TextField select required label="Prison" value={admission.prisonId} onChange={(event) => setField('prisonId', event.target.value)}>{prisons.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField><TextField select required label="Cell" disabled={!admission.prisonId} value={admission.cellId} onChange={(event) => setField('cellId', event.target.value)} helperText={admission.prisonId && cellOptions.length === 0 ? 'No cells with free space' : undefined}>{cellOptions.map((item) => <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>)}</TextField></Box></Box>
      <Box component="fieldset" className="admission-section"><legend>Intake reference</legend><Box className="admission-fields admission-intake-fields"><TextField required label="Admission date" type="date" value={admission.admissionDate} onChange={(event) => setField('admissionDate', event.target.value)} slotProps={dateField} /></Box></Box></DialogContent><DialogActions className="admission-dialog-actions"><Button onClick={closeAdmission} disabled={saving}>Cancel</Button><Button variant="contained" onClick={saveAdmission} disabled={saving}>Save admission</Button></DialogActions></Dialog>

    <Dialog className="admission-dialog" open={Boolean(editing)} onClose={closeEdit} fullWidth maxWidth="sm"><DialogTitle className="admission-dialog-title"><Box><Typography component="h2">Edit inmate</Typography><Typography>Offence, sentence and cell can't be changed here.</Typography></Box><span>Required fields *</span></DialogTitle><DialogContent className="admission-dialog-content">{actionError && <Alert severity="error">{actionError}</Alert>}
      <Box component="fieldset" className="admission-section"><legend>Details</legend><Box className="admission-fields"><TextField required label="First name" value={editForm.firstName} onChange={(event) => setEditForm({ ...editForm, firstName: event.target.value })} /><TextField required label="Last name" value={editForm.lastName} onChange={(event) => setEditForm({ ...editForm, lastName: event.target.value })} /><TextField required label="Date of birth" type="date" value={editForm.dateOfBirth} onChange={(event) => setEditForm({ ...editForm, dateOfBirth: event.target.value })} slotProps={dateField} /><TextField required label="Admission date" type="date" value={editForm.admissionDate} onChange={(event) => setEditForm({ ...editForm, admissionDate: event.target.value })} slotProps={dateField} /></Box></Box></DialogContent><DialogActions className="admission-dialog-actions"><Button onClick={closeEdit} disabled={busy}>Cancel</Button><Button variant="contained" onClick={saveEdit} disabled={busy}>Save changes</Button></DialogActions></Dialog>

    <Dialog className="admission-dialog" open={Boolean(moving)} onClose={closeMove} fullWidth maxWidth="sm"><DialogTitle className="admission-dialog-title"><Box><Typography component="h2">Move cell</Typography><Typography>{moving ? `${moving.fullName} · currently ${moving.block} ${moving.cell}` : ''}</Typography></Box><span>Required fields *</span></DialogTitle><DialogContent className="admission-dialog-content">{actionError && <Alert severity="error">{actionError}</Alert>}
      <Box component="fieldset" className="admission-section"><legend>New placement</legend><Box className="admission-fields"><TextField select required label="Target cell" value={moveCellId} onChange={(event) => setMoveCellId(event.target.value)} helperText={moveOptions.length === 0 ? 'No other cells with free space' : undefined}>{moveOptions.map((item) => <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>)}</TextField></Box></Box></DialogContent><DialogActions className="admission-dialog-actions"><Button onClick={closeMove} disabled={busy}>Cancel</Button><Button variant="contained" onClick={saveMove} disabled={busy || !moveCellId}>Move inmate</Button></DialogActions></Dialog>
  </Box>
}

function Metric({ label, value, note, tone, onAction, actionLabel }: { label: string; value: string; note: string; tone: string; onAction?: () => void; actionLabel?: string }) { return <Paper className={`metric-card ${tone}`} elevation={0}><Box><Typography>{label}</Typography><strong>{value}</strong><small>{note}</small></Box>{onAction && <Button className="metric-action-link" onClick={onAction}>{actionLabel} →</Button>}</Paper> }

function TransferSchedule({ transfers, onBack }: { transfers: Transfer[]; onBack: () => void }) { return <Box className="census-page transfer-page"><Button className="back-button" onClick={onBack}>← Back to inmate census</Button><Box className="transfer-heading"><Typography className="crumb">Operations</Typography><Typography component="h1">Pending transfers</Typography><Typography>Transfer requests awaiting a decision.</Typography></Box><Paper className="directory transfer-directory" elevation={0}><Box className="directory-title"><Box><Typography component="h2">Requests</Typography><Typography>{transfers.length} pending transfer{transfers.length === 1 ? '' : 's'}</Typography></Box></Box><TableContainer><Table className="census-table"><TableHead><TableRow><TableCell>Transfer ID</TableCell><TableCell>Inmate</TableCell><TableCell>Destination facility</TableCell><TableCell>Requested</TableCell><TableCell>Status</TableCell></TableRow></TableHead><TableBody>{transfers.map((transfer) => <TableRow key={transfer.id}><TableCell><code title={transfer.id}>{transfer.id.slice(0, 8)}</code></TableCell><TableCell><Box><Typography className="full-name">{transfer.name}</Typography><small>{transfer.inmateId.slice(0, 8)}</small></Box></TableCell><TableCell>{transfer.court}</TableCell><TableCell>{transfer.time}</TableCell><TableCell><Chip className="custody active-sentence" label={transfer.escort} /></TableCell></TableRow>)}</TableBody></Table></TableContainer></Paper></Box> }
