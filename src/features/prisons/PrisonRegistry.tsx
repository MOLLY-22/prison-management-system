import { useEffect, useState } from 'react'
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { PAGE_SIZE, addBlock, createPrison, errorMessage, fetchPrison, fetchPrisons, updateBlock, updatePrison, type ActiveFilter, type Block, type BlockInput, type CellInput, type PrisonDetail, type PrisonInput, type PrisonSummary } from './api'
import '../inmates/admissionDialog.css'
import './prisonRegistry.css'

type Props = { canManage: boolean }
type CellDraft = { cellNumber: string; capacity: string }
type BlockDraft = { name: string; cells: CellDraft[] }
type ModalState = null | { kind: 'create' } | { kind: 'edit-prison' } | { kind: 'add-block' } | { kind: 'edit-block'; block: Block }

const dateFree = undefined
void dateFree

const newCell = (cellNumber: number, capacity = '10'): CellDraft => ({ cellNumber: String(cellNumber), capacity })
const newBlock = (name = ''): BlockDraft => ({ name, cells: [newCell(1)] })
const isPositiveInt = (value: string) => /^\d+$/.test(value.trim()) && Number(value) > 0
const toCells = (cells: CellDraft[]): CellInput[] => cells.map((cell) => ({ cellNumber: Number(cell.cellNumber), capacity: Number(cell.capacity) }))

function checkBlock(block: BlockDraft, label: string, takenNumbers: number[] = [], cellsOptional = false): string | null {
  const prefix = label ? `${label}: ` : ''
  const name = block.name.trim()
  if (!name) return `${prefix}enter a block name.`
  if (name.length > 50) return `${prefix}the block name can be at most 50 characters.`
  if (block.cells.length === 0) return cellsOptional ? null : `${prefix}add at least one cell.`
  const seen = new Set<number>(takenNumbers)
  for (const cell of block.cells) {
    if (!isPositiveInt(cell.cellNumber) || !isPositiveInt(cell.capacity)) return `${prefix}cell numbers and capacities must be positive whole numbers.`
    const number = Number(cell.cellNumber)
    if (seen.has(number)) return `${prefix}cell ${number} is used more than once.`
    seen.add(number)
  }
  return null
}

function CellRows({ cells, onChange, takenNumbers = [] }: { cells: CellDraft[]; onChange: (cells: CellDraft[]) => void; takenNumbers?: number[] }) {
  const update = (index: number, patch: Partial<CellDraft>) => onChange(cells.map((cell, i) => (i === index ? { ...cell, ...patch } : cell)))
  const addCell = () => {
    const highest = Math.max(0, ...takenNumbers, ...cells.map((cell) => Number(cell.cellNumber) || 0))
    onChange([...cells, newCell(highest + 1, cells[cells.length - 1]?.capacity ?? '10')])
  }
  return <Box className="cell-rows">
    {cells.map((cell, index) => <Box className="cell-row" key={index}>
      <TextField size="small" label="Cell number" type="number" value={cell.cellNumber} onChange={(event) => update(index, { cellNumber: event.target.value })} slotProps={{ htmlInput: { min: 1 } }} />
      <TextField size="small" label="Capacity" type="number" value={cell.capacity} onChange={(event) => update(index, { capacity: event.target.value })} slotProps={{ htmlInput: { min: 1 } }} />
      <Button size="small" color="error" onClick={() => onChange(cells.filter((_, i) => i !== index))}>Remove</Button>
    </Box>)}
    <Box><Button size="small" onClick={addCell}>+ Add cell</Button></Box>
  </Box>
}

function CreatePrisonDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (payload: PrisonInput) => Promise<void> }) {
  const [name, setName] = useState(''); const [location, setLocation] = useState('')
  const [blocks, setBlocks] = useState<BlockDraft[]>([newBlock('A')])
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false)
  const setBlock = (index: number, block: BlockDraft) => setBlocks((current) => current.map((item, i) => (i === index ? block : item)))

  const submit = async () => {
    if (!name.trim()) return setError('Enter the prison name.')
    if (name.trim().length > 160) return setError('The prison name can be at most 160 characters.')
    if (location.trim().length > 255) return setError('The location can be at most 255 characters.')
    if (blocks.length === 0) return setError('Add at least one block.')
    const names = new Set<string>()
    for (const [index, block] of blocks.entries()) {
      const problem = checkBlock(block, `Block ${index + 1}`)
      if (problem) return setError(problem)
      const key = block.name.trim().toLowerCase()
      if (names.has(key)) return setError(`The block name "${block.name.trim()}" is used more than once.`)
      names.add(key)
    }
    setBusy(true); setError(null)
    try {
      await onSubmit({ name: name.trim(), ...(location.trim() ? { location: location.trim() } : {}), blocks: blocks.map((block) => ({ name: block.name.trim(), cells: toCells(block.cells) })) })
    } catch (failure) { setError(errorMessage(failure, 'Failed to register the prison.')); setBusy(false) }
  }

  return <Dialog className="admission-dialog" open onClose={busy ? undefined : onClose} fullWidth maxWidth="md">
    <DialogTitle className="admission-dialog-title"><Box><Typography component="h2">Register prison</Typography><Typography>Create the prison with its first blocks and cells.</Typography></Box><span>Required fields *</span></DialogTitle>
    <DialogContent className="admission-dialog-content">
      {error && <Alert severity="error">{error}</Alert>}
      <Box component="fieldset" className="admission-section"><legend>Prison</legend><Box className="admission-fields"><TextField required label="Prison name" value={name} onChange={(event) => setName(event.target.value)} /><TextField label="Location" value={location} onChange={(event) => setLocation(event.target.value)} /></Box></Box>
      <Box component="fieldset" className="admission-section"><legend>Blocks &amp; cells</legend>
        <Box className="block-editors">
          {blocks.map((block, index) => <Box className="block-editor" key={index}>
            <Box className="block-editor-head"><TextField size="small" required label="Block name" value={block.name} onChange={(event) => setBlock(index, { ...block, name: event.target.value })} /><Button size="small" color="error" disabled={blocks.length === 1} onClick={() => setBlocks((current) => current.filter((_, i) => i !== index))}>Remove block</Button></Box>
            <CellRows cells={block.cells} onChange={(cells) => setBlock(index, { ...block, cells })} />
          </Box>)}
          <Box><Button onClick={() => setBlocks((current) => [...current, newBlock()])}>+ Add block</Button></Box>
        </Box>
      </Box>
    </DialogContent>
    <DialogActions className="admission-dialog-actions"><Button onClick={onClose} disabled={busy}>Cancel</Button><Button variant="contained" onClick={submit} disabled={busy}>Register prison</Button></DialogActions>
  </Dialog>
}

function EditPrisonDialog({ prison, onClose, onSubmit }: { prison: PrisonDetail; onClose: () => void; onSubmit: (payload: { name: string; location?: string }) => Promise<void> }) {
  const [name, setName] = useState(prison.name); const [location, setLocation] = useState(prison.location ?? '')
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (!name.trim()) return setError('Enter the prison name.')
    if (name.trim().length > 160) return setError('The prison name can be at most 160 characters.')
    if (location.trim().length > 255) return setError('The location can be at most 255 characters.')
    setBusy(true); setError(null)
    try { await onSubmit({ name: name.trim(), ...(location.trim() ? { location: location.trim() } : {}) }) } catch (failure) { setError(errorMessage(failure, 'Failed to update the prison.')); setBusy(false) }
  }
  return <Dialog className="admission-dialog" open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
    <DialogTitle className="admission-dialog-title"><Box><Typography component="h2">Edit prison</Typography><Typography>Blocks and cells are managed separately.</Typography></Box><span>Required fields *</span></DialogTitle>
    <DialogContent className="admission-dialog-content">{error && <Alert severity="error">{error}</Alert>}
      <Box component="fieldset" className="admission-section"><legend>Details</legend><Box className="admission-fields"><TextField required label="Prison name" value={name} onChange={(event) => setName(event.target.value)} /><TextField label="Location" value={location} onChange={(event) => setLocation(event.target.value)} /></Box></Box>
    </DialogContent>
    <DialogActions className="admission-dialog-actions"><Button onClick={onClose} disabled={busy}>Cancel</Button><Button variant="contained" onClick={submit} disabled={busy}>Save changes</Button></DialogActions>
  </Dialog>
}

function BlockDialog({ block, otherNames, onClose, onSubmit }: { block?: Block; otherNames: string[]; onClose: () => void; onSubmit: (input: { name: string; cells: CellInput[] }) => Promise<void> }) {
  const editing = Boolean(block)
  const takenNumbers = block ? block.cells.map((cell) => cell.cellNumber) : []
  const [draft, setDraft] = useState<BlockDraft>(block ? { name: block.name, cells: [] } : newBlock())
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false)
  const submit = async () => {
    const problem = checkBlock(draft, '', takenNumbers, editing)
    if (problem) return setError(problem)
    const name = draft.name.trim()
    if (otherNames.some((other) => other.toLowerCase() === name.toLowerCase())) return setError(`A block named "${name}" already exists in this prison.`)
    if (block && name === block.name && draft.cells.length === 0) return setError('Nothing to change. Rename the block or add cells.')
    setBusy(true); setError(null)
    try { await onSubmit({ name, cells: toCells(draft.cells) }) } catch (failure) { setError(errorMessage(failure, editing ? 'Failed to update the block.' : 'Failed to add the block.')); setBusy(false) }
  }
  return <Dialog className="admission-dialog" open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
    <DialogTitle className="admission-dialog-title"><Box><Typography component="h2">{editing ? `Edit block ${block?.name}` : 'Add block'}</Typography><Typography>{editing ? 'Existing cells are kept. Cells added below are appended.' : 'Add a block with its cells.'}</Typography></Box><span>Required fields *</span></DialogTitle>
    <DialogContent className="admission-dialog-content">{error && <Alert severity="error">{error}</Alert>}
      <Box component="fieldset" className="admission-section"><legend>{editing ? 'Block' : 'New block'}</legend>
        <Box className="block-editor"><TextField size="small" required label="Block name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          {editing && <Typography className="block-hint">{block?.cells.length} existing cell{block?.cells.length === 1 ? '' : 's'} (numbers {takenNumbers.length ? takenNumbers.join(', ') : 'none'}). Existing cells can't be changed or removed.</Typography>}
          <CellRows cells={draft.cells} onChange={(cells) => setDraft({ ...draft, cells })} takenNumbers={takenNumbers} />
        </Box>
      </Box>
    </DialogContent>
    <DialogActions className="admission-dialog-actions"><Button onClick={onClose} disabled={busy}>Cancel</Button><Button variant="contained" onClick={submit} disabled={busy}>{editing ? 'Save block' : 'Add block'}</Button></DialogActions>
  </Dialog>
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <Paper className="metric-card blue" elevation={0}><Box><Typography>{label}</Typography><strong>{value}</strong><small>{note}</small></Box></Paper>
}

export function PrisonRegistry({ canManage }: Props) {
  const [search, setSearch] = useState(''); const [query, setQuery] = useState(''); const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all')
  const [pageIndex, setPageIndex] = useState(0); const [records, setRecords] = useState<PrisonSummary[]>([]); const [totalPages, setTotalPages] = useState(1); const [total, setTotal] = useState(0); const [reloadKey, setReloadKey] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null); const [prison, setPrison] = useState<PrisonDetail | null>(null); const [detailKey, setDetailKey] = useState(0)
  const [modal, setModal] = useState<ModalState>(null)
  const [notice, setNotice] = useState<string | null>(null); const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setPageIndex(0) }, 350)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let live = true
    fetchPrisons(pageIndex, query, activeFilter)
      .then((result) => { if (!live) return; setRecords(result.records); setTotalPages(Math.max(result.totalPages, 1)); setTotal(result.totalElements); setError(null) })
      .catch((failure) => { if (live) setError(errorMessage(failure, 'Failed to load prisons.')) })
    return () => { live = false }
  }, [pageIndex, query, activeFilter, reloadKey])

  useEffect(() => {
    if (!selectedId) return
    let live = true
    fetchPrison(selectedId)
      .then((result) => { if (live) { setPrison(result); setError(null) } })
      .catch((failure) => { if (live) setError(errorMessage(failure, 'Failed to load the prison.')) })
    return () => { live = false }
  }, [selectedId, detailKey])

  const reloadList = () => setReloadKey((key) => key + 1)
  const reloadDetail = () => setDetailKey((key) => key + 1)
  const openPrison = (id: string) => { setPrison(null); setError(null); setNotice(null); setSelectedId(id) }
  const backToList = () => { setSelectedId(null); setPrison(null); setError(null); reloadList() }

  const handleCreate = async (payload: PrisonInput) => { await createPrison(payload); setModal(null); setNotice(`${payload.name} has been registered.`); setPageIndex(0); reloadList() }
  const handleEditPrison = async (payload: { name: string; location?: string }) => { if (!prison) return; await updatePrison(prison.id, payload); setModal(null); setNotice('Prison details updated.'); reloadDetail() }
  const handleAddBlock = async (input: { name: string; cells: CellInput[] }) => { if (!prison) return; await addBlock(prison.id, input as BlockInput); setModal(null); setNotice(`Block ${input.name} has been added.`); reloadDetail() }
  const handleEditBlock = async (blockId: string, input: { name: string; cells: CellInput[] }) => {
    if (!prison) return
    await updateBlock(prison.id, blockId, { name: input.name, ...(input.cells.length ? { cells: input.cells } : {}) })
    setModal(null); setNotice(`Block ${input.name} has been updated.`); reloadDetail()
  }

  const from = records.length ? pageIndex * PAGE_SIZE + 1 : 0
  const to = pageIndex * PAGE_SIZE + records.length

  const banners = <>
    {notice && <Alert className="census-notice" severity="success" onClose={() => setNotice(null)}>{notice}</Alert>}
    {error && <Alert className="census-notice" severity="error" onClose={() => setError(null)}>{error}</Alert>}
  </>

  const detailView = () => {
    if (!prison) return <Box className="census-page">{banners}<Button className="back-button" onClick={backToList}>← Back to prison registry</Button>{!error && <Typography>Loading prison…</Typography>}</Box>
    const cells = prison.blocks.flatMap((block) => block.cells)
    const capacity = cells.reduce((sum, cell) => sum + cell.capacity, 0)
    const occupied = cells.reduce((sum, cell) => sum + cell.currentOccupancy, 0)
    return <Box className="census-page">
      {banners}
      <Button className="back-button" onClick={backToList}>← Back to prison registry</Button>
      <Box className="portal-heading"><Typography className="crumb">Operations / Prison registry</Typography>
        <Box className="portal-title-row"><Box><Typography component="h1">{prison.name}</Typography><Typography>{prison.location || 'No location recorded'}</Typography></Box>
          {canManage && <Stack direction="row" gap={1}><Button className="workflow-button" onClick={() => setModal({ kind: 'add-block' })}>Add block</Button><Button className="export-button" onClick={() => setModal({ kind: 'edit-prison' })}>Edit prison</Button></Stack>}
        </Box>
      </Box>
      <Box className="census-metrics prison-metrics"><Metric label="Blocks" value={String(prison.blocks.length)} note="In this prison" /><Metric label="Cells" value={String(cells.length)} note="Across all blocks" /><Metric label="Capacity" value={String(capacity)} note="Total beds" /><Metric label="Occupied" value={String(occupied)} note={`${Math.max(capacity - occupied, 0)} spaces available`} /></Box>
      {prison.blocks.length === 0 && <Paper className="directory" elevation={0}><Box className="directory-title"><Typography>This prison has no blocks yet.</Typography></Box></Paper>}
      {prison.blocks.map((block) => {
        const blockCapacity = block.cells.reduce((sum, cell) => sum + cell.capacity, 0)
        const blockOccupied = block.cells.reduce((sum, cell) => sum + cell.currentOccupancy, 0)
        return <Paper className="directory block-card" elevation={0} key={block.id}>
          <Box className="directory-title block-title"><Box><Typography component="h2">Block {block.name}</Typography><Typography>{block.cells.length} cell{block.cells.length === 1 ? '' : 's'} · {blockOccupied} of {blockCapacity} occupied</Typography></Box>{canManage && <Button size="small" onClick={() => setModal({ kind: 'edit-block', block })}>Edit block</Button>}</Box>
          <TableContainer><Table className="census-table"><TableHead><TableRow><TableCell>Cell</TableCell><TableCell>Capacity</TableCell><TableCell>Occupied</TableCell><TableCell>Available</TableCell></TableRow></TableHead>
            <TableBody>{[...block.cells].sort((a, b) => a.cellNumber - b.cellNumber).map((cell) => <TableRow key={cell.id}><TableCell>Cell {cell.cellNumber}</TableCell><TableCell>{cell.capacity}</TableCell><TableCell>{cell.currentOccupancy}</TableCell><TableCell><span className={`cell-state ${cell.availableSpaces === 0 ? 'full' : ''}`}>{cell.availableSpaces === 0 ? 'Full' : cell.availableSpaces}</span></TableCell></TableRow>)}</TableBody></Table></TableContainer>
        </Paper>
      })}
    </Box>
  }

  const listView = () => <Box className="census-page">
    {banners}
    <Box className="portal-heading"><Typography className="crumb">Operations / Prison registry</Typography>
      <Box className="portal-title-row"><Box><Typography component="h1">Prison registry</Typography><Typography>Register prisons and manage their blocks and cells.</Typography></Box>
        {canManage && <Stack direction="row" gap={1}><Button className="workflow-button" onClick={() => setModal({ kind: 'create' })}>Register prison</Button></Stack>}
      </Box>
    </Box>
    <Box className="census-metrics"><Metric label="Registered prisons" value={total.toLocaleString()} note="Matching the current filters" /></Box>
    <Paper className="filter-bar prison-filter-bar" elevation={0}>
      <TextField placeholder="Search by name or location" value={search} onChange={(event) => setSearch(event.target.value)} />
      <Select value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value as ActiveFilter); setPageIndex(0) }}><MenuItem value="all">All statuses</MenuItem><MenuItem value="active">Active</MenuItem><MenuItem value="inactive">Inactive</MenuItem></Select>
      <Button className="reset-button" onClick={() => { setSearch(''); setActiveFilter('all') }}>Clear filters</Button>
    </Paper>
    <Paper className="directory" elevation={0}>
      <Box className="directory-title"><Box><Typography component="h2">Prison directory</Typography><Typography>{total} prison{total === 1 ? '' : 's'} found</Typography></Box></Box>
      <TableContainer><Table className="census-table"><TableHead><TableRow><TableCell>Name</TableCell><TableCell>Location</TableCell><TableCell>Status</TableCell><TableCell>Actions</TableCell></TableRow></TableHead>
        <TableBody>{records.map((record) => <TableRow key={record.id}><TableCell className="full-name">{record.name}</TableCell><TableCell>{record.location || '—'}</TableCell><TableCell><Chip className={`custody ${record.active ? 'active-sentence' : ''}`} label={`• ${record.active ? 'Active' : 'Inactive'}`} /></TableCell><TableCell><Button size="small" onClick={() => openPrison(record.id)}>View layout</Button></TableCell></TableRow>)}</TableBody></Table></TableContainer>
      <Box className="pagination"><span className="pagination-summary">{total === 0 ? 'No records' : <>Showing <strong>{from}–{to}</strong> of <strong>{total.toLocaleString()}</strong> records</>}</span><Box className="pagination-controls"><Button className="pagination-button" disabled={pageIndex === 0} onClick={() => setPageIndex((current) => current - 1)}>← Previous</Button><span className="pagination-page">Page <strong>{pageIndex + 1}</strong> of {totalPages}</span><Button className="pagination-button" disabled={pageIndex + 1 >= totalPages} onClick={() => setPageIndex((current) => current + 1)}>Next →</Button></Box></Box>
    </Paper>
  </Box>

  return <>
    {selectedId ? detailView() : listView()}
    {modal?.kind === 'create' && <CreatePrisonDialog onClose={() => setModal(null)} onSubmit={handleCreate} />}
    {prison && modal?.kind === 'edit-prison' && <EditPrisonDialog prison={prison} onClose={() => setModal(null)} onSubmit={handleEditPrison} />}
    {prison && modal?.kind === 'add-block' && <BlockDialog key="add" otherNames={prison.blocks.map((block) => block.name)} onClose={() => setModal(null)} onSubmit={handleAddBlock} />}
    {prison && modal?.kind === 'edit-block' && <BlockDialog key={modal.block.id} block={modal.block} otherNames={prison.blocks.filter((block) => block.id !== modal.block.id).map((block) => block.name)} onClose={() => setModal(null)} onSubmit={(input) => handleEditBlock(modal.block.id, input)} />}
  </>
}
