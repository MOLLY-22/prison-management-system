import { useEffect, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  prisonService,
  type ActiveFilter,
  type Block,
  type BlockInput,
  type CellInput,
  PAGE_SIZE,
  type PrisonDetail,
  type PrisonInput,
  type PrisonSummary,
  type StationGender,
} from "../api/prisonService";
import "./admissionDialog.css";
import "./prisonRegistry.css";

type Props = {
  canManage: boolean;
  mode?: "registry" | "housing";
  assignedPrisonId?: string;
  assignedPrisonRequired?: boolean;
};
type CellDraft = { cellNumber: string; capacity: string };
type BlockDraft = { name: string; cells: CellDraft[] };
type ModalState =
  | null
  | { kind: "create" }
  | { kind: "edit-prison" }
  | { kind: "add-block" }
  | { kind: "edit-block"; block: Block };

const dateFree = undefined;
void dateFree;

function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as {
      response?: { data?: { message?: string } };
    }).response;
    if (response?.data?.message) return response.data.message;
  }
  return error instanceof Error ? error.message : fallback;
}

const newCell = (cellNumber: number, capacity = "10"): CellDraft => ({
  cellNumber: String(cellNumber),
  capacity,
});
const newBlock = (name = ""): BlockDraft => ({ name, cells: [newCell(1)] });
const isPositiveInt = (value: string) =>
  /^\d+$/.test(value.trim()) && Number(value) > 0;
const toCells = (cells: CellDraft[]): CellInput[] =>
  cells.map((cell) => ({
    cellNumber: Number(cell.cellNumber),
    capacity: Number(cell.capacity),
  }));

function checkBlock(
  block: BlockDraft,
  label: string,
  takenNumbers: number[] = [],
  cellsOptional = false,
): string | null {
  const prefix = label ? `${label}: ` : "";
  const name = block.name.trim();
  if (!name) return `${prefix}enter a block name.`;
  if (name.length > 50)
    return `${prefix}the block name can be at most 50 characters.`;
  if (block.cells.length === 0)
    return cellsOptional ? null : `${prefix}add at least one cell.`;
  const seen = new Set<number>(takenNumbers);
  for (const cell of block.cells) {
    if (!isPositiveInt(cell.cellNumber) || !isPositiveInt(cell.capacity))
      return `${prefix}cell numbers and capacities must be positive whole numbers.`;
    const number = Number(cell.cellNumber);
    if (seen.has(number))
      return `${prefix}cell ${number} is used more than once.`;
    seen.add(number);
  }
  return null;
}

function CellRows({
  cells,
  onChange,
  takenNumbers = [],
}: {
  cells: CellDraft[];
  onChange: (cells: CellDraft[]) => void;
  takenNumbers?: number[];
}) {
  const update = (index: number, patch: Partial<CellDraft>) =>
    onChange(
      cells.map((cell, i) => (i === index ? { ...cell, ...patch } : cell)),
    );
  const addCell = () => {
    const highest = Math.max(
      0,
      ...takenNumbers,
      ...cells.map((cell) => Number(cell.cellNumber) || 0),
    );
    onChange([
      ...cells,
      newCell(highest + 1, cells[cells.length - 1]?.capacity ?? "10"),
    ]);
  };
  return (
    <Box className="cell-rows">
      {cells.map((cell, index) => (
        <Box className="cell-row" key={index}>
          <TextField
            size="small"
            label="Cell number"
            type="number"
            value={cell.cellNumber}
            onChange={(event) =>
              update(index, { cellNumber: event.target.value })
            }
            slotProps={{ htmlInput: { min: 1 } }}
          />
          <TextField
            size="small"
            label="Capacity"
            type="number"
            value={cell.capacity}
            onChange={(event) =>
              update(index, { capacity: event.target.value })
            }
            slotProps={{ htmlInput: { min: 1 } }}
          />
          <Button
            size="small"
            color="error"
            onClick={() => onChange(cells.filter((_, i) => i !== index))}
          >
            Remove
          </Button>
        </Box>
      ))}
      <Box>
        <Button size="small" onClick={addCell}>
          + Add cell
        </Button>
      </Box>
    </Box>
  );
}

function CreatePrisonDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (payload: PrisonInput) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [gender, setGender] = useState<StationGender | "">("");
  const [blocks, setBlocks] = useState<BlockDraft[]>([newBlock("A")]);
  const [error, setError] = useState<string | null>(null);
  const [outcomeUncertain, setOutcomeUncertain] = useState(false);
  const [busy, setBusy] = useState(false);
  const setBlock = (index: number, block: BlockDraft) =>
    setBlocks((current) =>
      current.map((item, i) => (i === index ? block : item)),
    );

  const submit = async () => {
    if (busy || outcomeUncertain) return;
    if (!name.trim()) return setError("Enter the prison name.");
    if (name.trim().length > 160)
      return setError("The prison name can be at most 160 characters.");
    if (location.trim().length > 255)
      return setError("The location can be at most 255 characters.");
    if (!gender) return setError("Choose whether this station is for men or women.");
    if (blocks.length === 0) return setError("Add at least one block.");
    const names = new Set<string>();
    for (const [index, block] of blocks.entries()) {
      const problem = checkBlock(block, `Block ${index + 1}`);
      if (problem) return setError(problem);
      const key = block.name.trim().toLowerCase();
      if (names.has(key))
        return setError(
          `The block name "${block.name.trim()}" is used more than once.`,
        );
      names.add(key);
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        gender,
        ...(location.trim() ? { location: location.trim() } : {}),
        blocks: blocks.map((block) => ({
          name: block.name.trim(),
          cells: toCells(block.cells),
        })),
      });
    } catch (failure) {
      const uncertain = axios.isAxiosError(failure) &&
        (!failure.response || failure.response.status >= 500);
      if (uncertain) {
        setOutcomeUncertain(true);
        setError("The API returned an error and may still have saved this prison. Close this dialog and check the directory before retrying.");
      } else {
        setError(errorMessage(failure, "Failed to register the prison."));
      }
      setBusy(false);
    }
  };

  return (
    <Dialog
      className="admission-dialog"
      open
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle className="admission-dialog-title">
        <Box>
          <Typography component="h2">Register prison</Typography>
          <Typography>
            Create the prison with its first blocks and cells.
          </Typography>
        </Box>
        <span>Required fields *</span>
      </DialogTitle>
      <DialogContent className="admission-dialog-content">
        {error && <Alert severity="error">{error}</Alert>}
        <Box component="fieldset" className="admission-section">
          <legend>Prison</legend>
          <Box className="admission-fields">
            <TextField
              required
              label="Prison name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <TextField
              label="Location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
            <TextField select required label="Station gender" value={gender} onChange={(event) => setGender(event.target.value as StationGender)}>
              <MenuItem value="" disabled>Choose station gender</MenuItem>
              <MenuItem value="MALE">Male</MenuItem>
              <MenuItem value="FEMALE">Female</MenuItem>
            </TextField>
          </Box>
        </Box>
        <Box component="fieldset" className="admission-section">
          <legend>Blocks &amp; cells</legend>
          <Typography className="block-hint">
            Set capacity for each cell individually. Cells in the same block can have different capacities.
          </Typography>
          <Box className="block-editors">
            {blocks.map((block, index) => (
              <Box className="block-editor" key={index}>
                <Box className="block-editor-head">
                  <TextField
                    size="small"
                    required
                    label="Block name"
                    value={block.name}
                    onChange={(event) =>
                      setBlock(index, { ...block, name: event.target.value })
                    }
                  />
                  <Button
                    size="small"
                    color="error"
                    disabled={blocks.length === 1}
                    onClick={() =>
                      setBlocks((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                  >
                    Remove block
                  </Button>
                </Box>
                <CellRows
                  cells={block.cells}
                  onChange={(cells) => setBlock(index, { ...block, cells })}
                />
              </Box>
            ))}
            <Box>
              <Button
                onClick={() => setBlocks((current) => [...current, newBlock()])}
              >
                + Add block
              </Button>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions className="admission-dialog-actions">
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={busy || outcomeUncertain}>
          Register prison
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function EditPrisonDialog({
  prison,
  onClose,
  onSubmit,
}: {
  prison: PrisonDetail;
  onClose: () => void;
  onSubmit: (payload: { name: string; location?: string; gender: StationGender }) => Promise<void>;
}) {
  const [name, setName] = useState(prison.name);
  const [location, setLocation] = useState(prison.location ?? "");
  const [gender, setGender] = useState<StationGender | "">(prison.gender ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!name.trim()) return setError("Enter the prison name.");
    if (name.trim().length > 160)
      return setError("The prison name can be at most 160 characters.");
    if (location.trim().length > 255)
      return setError("The location can be at most 255 characters.");
    if (!gender) return setError("Choose whether this station is for men or women.");
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        gender,
        ...(location.trim() ? { location: location.trim() } : {}),
      });
    } catch (failure) {
      setError(errorMessage(failure, "Failed to update the prison."));
      setBusy(false);
    }
  };
  return (
    <Dialog
      className="admission-dialog"
      open
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle className="admission-dialog-title">
        <Box>
          <Typography component="h2">Edit prison</Typography>
          <Typography>Blocks and cells are managed separately.</Typography>
        </Box>
        <span>Required fields *</span>
      </DialogTitle>
      <DialogContent className="admission-dialog-content">
        {error && <Alert severity="error">{error}</Alert>}
        <Box component="fieldset" className="admission-section">
          <legend>Details</legend>
          <Box className="admission-fields">
            <TextField
              required
              label="Prison name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <TextField
              label="Location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
            <TextField select required label="Station gender" value={gender} onChange={(event) => setGender(event.target.value as StationGender)}>
              <MenuItem value="" disabled>Choose station gender</MenuItem>
              <MenuItem value="MALE">Male</MenuItem>
              <MenuItem value="FEMALE">Female</MenuItem>
            </TextField>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions className="admission-dialog-actions">
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={busy}>
          Save changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function BlockDialog({
  block,
  otherNames,
  onClose,
  onSubmit,
}: {
  block?: Block;
  otherNames: string[];
  onClose: () => void;
  onSubmit: (input: { name: string; cells: CellInput[] }) => Promise<void>;
}) {
  const editing = Boolean(block);
  const takenNumbers = block ? block.cells.map((cell) => cell.cellNumber) : [];
  const [draft, setDraft] = useState<BlockDraft>(
    block ? { name: block.name, cells: [] } : newBlock(),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const problem = checkBlock(draft, "", takenNumbers, editing);
    if (problem) return setError(problem);
    const name = draft.name.trim();
    if (otherNames.some((other) => other.toLowerCase() === name.toLowerCase()))
      return setError(`A block named "${name}" already exists in this prison.`);
    if (block && name === block.name && draft.cells.length === 0)
      return setError("Nothing to change. Rename the block or add cells.");
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ name, cells: toCells(draft.cells) });
    } catch (failure) {
      setError(
        errorMessage(
          failure,
          editing ? "Failed to update the block." : "Failed to add the block.",
        ),
      );
      setBusy(false);
    }
  };
  return (
    <Dialog
      className="admission-dialog"
      open
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle className="admission-dialog-title">
        <Box>
          <Typography component="h2">
            {editing ? `Edit block ${block?.name}` : "Add block"}
          </Typography>
          <Typography>
            {editing
              ? "Existing cells are kept. Added cells are appended; each added cell can have its own capacity."
              : "Add a block and set capacity separately for each cell."}
          </Typography>
        </Box>
        <span>Required fields *</span>
      </DialogTitle>
      <DialogContent className="admission-dialog-content">
        {error && <Alert severity="error">{error}</Alert>}
        <Box component="fieldset" className="admission-section">
          <legend>{editing ? "Block" : "New block"}</legend>
          <Box className="block-editor">
            <TextField
              size="small"
              required
              label="Block name"
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />
            {editing && (
              <Typography className="block-hint">
                {block?.cells.length} existing cell
                {block?.cells.length === 1 ? "" : "s"} (numbers{" "}
                {takenNumbers.length ? takenNumbers.join(", ") : "none"}).
                Existing cells can't be changed or removed.
              </Typography>
            )}
            <CellRows
              cells={draft.cells}
              onChange={(cells) => setDraft({ ...draft, cells })}
              takenNumbers={takenNumbers}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions className="admission-dialog-actions">
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={busy}>
          {editing ? "Save block" : "Add block"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Metric({
  label,
  value,
  note,
  onClick,
  actionLabel,
}: {
  label: string;
  value: string;
  note: string;
  onClick?: () => void;
  actionLabel?: string;
}) {
  return (
    <Paper
      className={`metric-card blue ${onClick ? "metric-card-interactive metric-card-link" : ""}`}
      elevation={0}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `${label}: ${value}. ${actionLabel ?? "Open details"}` : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <Box>
        <Typography>{label}</Typography>
        <strong>{value}</strong>
        {note && <small>{note}</small>}
        {onClick && actionLabel && <span className="metric-card-action">{actionLabel} →</span>}
      </Box>
    </Paper>
  );
}

export function PrisonRegistry({
  canManage,
  mode = "registry",
  assignedPrisonId = "",
  assignedPrisonRequired = false,
}: Props) {
  const housingMode = mode === "housing";
  const [showBlocks, setShowBlocks] = useState(!housingMode);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [records, setRecords] = useState<PrisonSummary[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(
    housingMode && assignedPrisonId ? assignedPrisonId : null,
  );
  const [prison, setPrison] = useState<PrisonDetail | null>(null);
  const [detailKey, setDetailKey] = useState(0);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [scrollToBlocks, setScrollToBlocks] = useState(false);
  const [blockAvailabilityFilter, setBlockAvailabilityFilter] = useState<"all" | "available" | "full">("all");
  const [modal, setModal] = useState<ModalState>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (housingMode) {
      setSelectedId(assignedPrisonId || null);
      setPrison(null);
      setSelectedBlockId(null);
      setShowBlocks(false);
    } else {
      setSelectedId(null);
      setPrison(null);
    }
  }, [housingMode, assignedPrisonId]);

  useEffect(() => {
    if (!scrollToBlocks || selectedBlockId || !showBlocks) return;
    document.getElementById("housing-block-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setScrollToBlocks(false);
  }, [scrollToBlocks, selectedBlockId, showBlocks]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPageIndex(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (housingMode && (assignedPrisonId || assignedPrisonRequired)) {
      setRecords([]);
      setTotal(0);
      setTotalPages(1);
      if (assignedPrisonRequired && !assignedPrisonId) {
        setError("Your account's assigned prison was not returned by the profile service. The account may still be assigned; reload your profile or ask an administrator to verify the assignment.");
      }
      return;
    }
    let live = true;
    prisonService.getPrisons(pageIndex, query, activeFilter)
      .then((result) => {
        if (!live) return;
        setRecords(result.records);
        setTotalPages(Math.max(result.totalPages, 1));
        setTotal(result.totalElements);
        setError(null);
      })
      .catch((failure) => {
        if (live) setError(errorMessage(failure, "Failed to load prisons."));
      });
    return () => {
      live = false;
    };
  }, [pageIndex, query, activeFilter, reloadKey, housingMode, assignedPrisonId, assignedPrisonRequired]);

  useEffect(() => {
    if (!selectedId) return;
    let live = true;
    prisonService.getPrison(selectedId)
      .then((result) => {
        if (live) {
          setPrison(result);
          setError(null);
        }
      })
      .catch((failure) => {
        if (live) setError(errorMessage(failure, "Failed to load the prison."));
      });
    return () => {
      live = false;
    };
  }, [selectedId, detailKey]);

  const reloadList = () => setReloadKey((key) => key + 1);
  const reloadDetail = () => setDetailKey((key) => key + 1);
  const openPrison = (id: string) => {
    setPrison(null);
    setSelectedBlockId(null);
    setShowBlocks(true);
    setError(null);
    setNotice(null);
    setSelectedId(id);
  };
  const backToList = () => {
    setSelectedId(null);
    setPrison(null);
    setError(null);
    reloadList();
  };

  const handleCreate = async (payload: PrisonInput) => {
    const matches = (await prisonService.getPrisons(0, payload.name, "all", 100)).records;
    const key = (value: string | null | undefined) => (value ?? "").trim().toLocaleLowerCase();
    const samePrison = (candidate: PrisonSummary) =>
      key(candidate.name) === key(payload.name) && key(candidate.location) === key(payload.location);
    if (matches.some(samePrison)) {
      throw new Error("A prison with this name and location already exists. Check the directory before creating another.");
    }
    try {
      await prisonService.createPrison(payload);
    } catch (failure) {
      if (axios.isAxiosError(failure) && (!failure.response || failure.response.status >= 500)) {
        try {
          const refreshed = await prisonService.getPrisons(0, payload.name, "all", 100);
          if (refreshed.records.some(samePrison)) {
            setModal(null);
            setNotice(`${payload.name} is present in the directory. The API reported an error after saving; no retry was needed.`);
            setPageIndex(0);
            reloadList();
            return;
          }
        } catch {
          // Preserve the original failure if the confirmation lookup also fails.
        }
      }
      throw failure;
    }
    setModal(null);
    setNotice(`${payload.name} has been registered.`);
    setPageIndex(0);
    reloadList();
  };
  const handleEditPrison = async (payload: {
    name: string;
    location?: string;
    gender: StationGender;
  }) => {
    if (!prison) return;
    await prisonService.updatePrison(prison.id, payload);
    setModal(null);
    setNotice("Prison details updated.");
    reloadDetail();
  };
  const handleAddBlock = async (input: {
    name: string;
    cells: CellInput[];
  }) => {
    if (!prison) return;
    await prisonService.addBlock(prison.id, input as BlockInput);
    setModal(null);
    setNotice(`Block ${input.name} has been added.`);
    reloadDetail();
  };
  const handleEditBlock = async (
    blockId: string,
    input: { name: string; cells: CellInput[] },
  ) => {
    if (!prison) return;
    await prisonService.updateBlock(prison.id, blockId, {
      name: input.name,
      ...(input.cells.length ? { cells: input.cells } : {}),
    });
    setModal(null);
    setNotice(`Block ${input.name} has been updated.`);
    reloadDetail();
  };

  const from = records.length ? pageIndex * PAGE_SIZE + 1 : 0;
  const to = pageIndex * PAGE_SIZE + records.length;

  const banners = (
    <>
      {notice && (
        <Alert
          className="census-notice"
          severity="success"
          onClose={() => setNotice(null)}
        >
          {notice}
        </Alert>
      )}
      {error && (
        <Alert
          className="census-notice"
          severity="error"
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
    </>
  );

  const detailView = () => {
    if (!prison)
      return (
        <Box className="census-page">
          {banners}
          {!(housingMode && assignedPrisonId) && (
            <Button className="back-button" onClick={backToList}>
              ← Back to {housingMode ? "housing list" : "prison registry"}
            </Button>
          )}
          {!error && <Typography>Loading prison…</Typography>}
        </Box>
      );
    const cells = prison.blocks.flatMap((block) => block.cells);
    const capacity = cells.reduce((sum, cell) => sum + cell.capacity, 0);
    const occupied = cells.reduce(
      (sum, cell) => sum + cell.currentOccupancy,
      0,
    );
    const selectedBlock = prison.blocks.find((block) => block.id === selectedBlockId) ?? null;
    const showBlockBrowser = !housingMode || showBlocks;
    const visibleBlocks = prison.blocks.filter((block) => {
      const available = block.cells.reduce((sum, cell) => sum + cell.availableSpaces, 0);
      if (blockAvailabilityFilter === "available") return available > 0;
      if (blockAvailabilityFilter === "full") return available === 0;
      return true;
    });
    const availableBlockCount = prison.blocks.filter((block) =>
      block.cells.reduce((sum, cell) => sum + cell.availableSpaces, 0) > 0,
    ).length;
    const fullBlockCount = prison.blocks.length - availableBlockCount;
    return (
      <Box className="census-page">
        {banners}
        {housingMode && showBlocks && !selectedBlock && (
          <Paper className="block-filter-toolbar" elevation={0}>
            <Box className="block-filter-copy">
              <Typography component="p">HOUSING &amp; CELLS</Typography>
              <Typography component="h2">Block availability</Typography>
            </Box>
            <Box className="block-filter-options" role="group" aria-label="Filter blocks by availability">
              {([
                { value: "all", label: "All blocks", count: prison.blocks.length },
                { value: "available", label: "Space available", count: availableBlockCount },
                { value: "full", label: "Full", count: fullBlockCount },
              ] as const).map((option) => (
                <Button
                  key={option.value}
                  className={`block-filter-option ${blockAvailabilityFilter === option.value ? "active" : ""}`}
                  aria-pressed={blockAvailabilityFilter === option.value}
                  onClick={() => setBlockAvailabilityFilter(option.value)}
                >
                  <span>{option.label}</span>
                  <strong>{option.count}</strong>
                </Button>
              ))}
            </Box>
          </Paper>
        )}
        {!(housingMode && assignedPrisonId) && (
          <Button className="back-button" onClick={backToList}>
            ← Back to {housingMode ? "housing list" : "prison registry"}
          </Button>
        )}
        {(!housingMode || canManage) && (
          <Box className="portal-heading">
            {!housingMode && <Typography className="crumb">Operations / Prison registry</Typography>}
            <Box className="portal-title-row">
              {!housingMode && (
                <Box>
                  <Typography component="h1">{prison.name}</Typography>
                  <Typography>
                    {[prison.gender === "MALE" ? "Male station" : prison.gender === "FEMALE" ? "Female station" : "Station gender not set", prison.location].filter(Boolean).join(" · ")}
                  </Typography>
                </Box>
              )}
              {canManage && (
              <Stack direction="row" spacing={1}>
                <Button
                  className="workflow-button"
                  onClick={() => setModal({ kind: "add-block" })}
                >
                  Add block
                </Button>
                {!housingMode && <Button
                  className="export-button"
                  onClick={() => setModal({ kind: "edit-prison" })}
                >
                  Edit prison
                </Button>}
              </Stack>
              )}
            </Box>
          </Box>
        )}
        {!selectedBlock && <Box className="census-metrics prison-metrics">
          <Metric
            label="Blocks"
            value={String(prison.blocks.length)}
            note={housingMode ? "" : "In this prison"}
            onClick={housingMode ? () => {
              const opening = !showBlocks;
              setShowBlocks(opening);
              setScrollToBlocks(opening);
              if (!opening) setSelectedBlockId(null);
            } : undefined}
            actionLabel={housingMode ? (showBlocks ? "Hide blocks" : "View blocks") : undefined}
          />
          <Metric
            label="Cells"
            value={String(cells.length)}
            note="Across all blocks"
          />
          <Metric label="Capacity" value={String(capacity)} note="Total beds" />
          <Metric
            label="Occupied"
            value={String(occupied)}
            note={`${Math.max(capacity - occupied, 0)} spaces available`}
          />
        </Box>}
        {showBlockBrowser && (selectedBlock ? (
          <>
            <Button className="back-button" onClick={() => setSelectedBlockId(null)}>
              ← Back to blocks
            </Button>
            <Paper className="directory" elevation={0}>
              <Box className="directory-title block-detail-title">
                <Box>
                  <Typography component="h2">Block {selectedBlock.name}</Typography>
                  <Typography>
                    {selectedBlock.cells.length} cells · Capacity {selectedBlock.cells.reduce((sum, cell) => sum + cell.capacity, 0)} · {selectedBlock.cells.reduce((sum, cell) => sum + cell.availableSpaces, 0)} spaces available
                  </Typography>
                </Box>
                {canManage && <Button size="small" onClick={() => setModal({ kind: "edit-block", block: selectedBlock })}>Edit block</Button>}
              </Box>
              <TableContainer>
                <Table className="census-table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Cell</TableCell>
                      <TableCell>Capacity</TableCell>
                      <TableCell>Occupied</TableCell>
                      <TableCell>Available spaces</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...selectedBlock.cells].sort((a, b) => a.cellNumber - b.cellNumber).map((cell) => (
                      <TableRow key={cell.id}>
                        <TableCell>Cell {cell.cellNumber}</TableCell>
                        <TableCell>{cell.capacity}</TableCell>
                        <TableCell>{cell.currentOccupancy}</TableCell>
                        <TableCell><span className={`cell-state ${cell.availableSpaces === 0 ? "full" : ""}`}>{cell.availableSpaces === 0 ? "Full" : cell.availableSpaces}</span></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        ) : (
          <>
            {prison.blocks.length === 0 ? (
              <Paper className="directory" elevation={0}>
                <Box className="directory-title"><Typography>This prison has no blocks yet.</Typography></Box>
              </Paper>
            ) : visibleBlocks.length === 0 ? (
              <Paper className="directory" elevation={0}>
                <Box className="directory-title"><Typography>No blocks match this availability filter.</Typography></Box>
              </Paper>
            ) : (
              <Paper className="directory block-directory" elevation={0} id="housing-block-list">
                <TableContainer>
                  <Table className="census-table block-list-table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Block</TableCell>
                        <TableCell>Cells</TableCell>
                        <TableCell>Capacity</TableCell>
                        <TableCell>Available spaces</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                {visibleBlocks.map((block) => {
                  const blockCapacity = block.cells.reduce((sum, cell) => sum + cell.capacity, 0);
                  const blockAvailable = block.cells.reduce((sum, cell) => sum + cell.availableSpaces, 0);
                  const openBlock = () => setSelectedBlockId(block.id);
                  return (
                    <TableRow
                      className="block-list-row"
                      key={block.id}
                      tabIndex={0}
                      role="button"
                      onClick={openBlock}
                      onKeyDown={(event) => {
                        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                          event.preventDefault();
                          openBlock();
                        }
                      }}
                    >
                      <TableCell className="full-name">Block {block.name}</TableCell>
                      <TableCell>{block.cells.length}</TableCell>
                      <TableCell>{blockCapacity}</TableCell>
                      <TableCell><span className={`cell-state ${blockAvailable === 0 ? "full" : ""}`}>{blockAvailable === 0 ? "Full" : blockAvailable}</span></TableCell>
                      <TableCell align="right" className="block-list-actions">
                        {canManage && <Button size="small" onClick={(event) => { event.stopPropagation(); setModal({ kind: "edit-block", block }); }}>Edit</Button>}
                        <Button className="block-list-view" onClick={(event) => { event.stopPropagation(); openBlock(); }}>View →</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}
          </>
        ))}
      </Box>
    );
  };

  const listView = () => (
    <Box className="census-page">
      {banners}
      <Box className="portal-heading">
        <Typography className="crumb">Operations / {housingMode ? "Housing & cells" : "Prison registry"}</Typography>
        <Box className="portal-title-row">
          <Box>
            <Typography component="h1">{housingMode ? "Housing & cells" : "Prison registry"}</Typography>
            <Typography>
              {housingMode
                ? "Review blocks, cell capacities, occupancy, and available spaces."
                : "Register prisons and manage their blocks and cells."}
            </Typography>
          </Box>
          {canManage && !housingMode && (
            <Stack direction="row" spacing={1}>
              <Button
                className="workflow-button"
                onClick={() => setModal({ kind: "create" })}
              >
                Register prison
              </Button>
            </Stack>
          )}
        </Box>
      </Box>
      <Box className="census-metrics">
        <Metric
          label="Registered prisons"
          value={total.toLocaleString()}
          note="Matching the current filters"
        />
      </Box>
      <Paper className="filter-bar prison-filter-bar" elevation={0}>
        <TextField
          placeholder="Search by name or location"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          value={activeFilter}
          onChange={(event) => {
            setActiveFilter(event.target.value as ActiveFilter);
            setPageIndex(0);
          }}
        >
          <MenuItem value="all">All statuses</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </Select>
        <Button
          className="reset-button"
          onClick={() => {
            setSearch("");
            setActiveFilter("all");
          }}
        >
          Clear filters
        </Button>
      </Paper>
      <Paper className="directory" elevation={0}>
        <Box className="directory-title">
          <Box>
            <Typography component="h2">{housingMode ? "Select a prison" : "Prison directory"}</Typography>
            <Typography>
              {total} prison{total === 1 ? "" : "s"} found
            </Typography>
          </Box>
        </Box>
        <TableContainer>
          <Table className="census-table">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Station gender</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="full-name">{record.name}</TableCell>
                  <TableCell>{record.gender === "MALE" ? "Male" : record.gender === "FEMALE" ? "Female" : "Not set"}</TableCell>
                  <TableCell>{record.location || "—"}</TableCell>
                  <TableCell>
                    <Chip
                      className={`custody ${record.active ? "active-sentence" : ""}`}
                      label={`• ${record.active ? "Active" : "Inactive"}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => openPrison(record.id)}>
                      {housingMode ? (canManage ? "Manage housing" : "View housing") : "View layout"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box className="pagination">
          <span className="pagination-summary">
            {total === 0 ? (
              "No records"
            ) : (
              <>
                Showing{" "}
                <strong>
                  {from}–{to}
                </strong>{" "}
                of <strong>{total.toLocaleString()}</strong> records
              </>
            )}
          </span>
          <Box className="pagination-controls">
            <Button
              className="pagination-button"
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((current) => current - 1)}
            >
              ← Previous
            </Button>
            <span className="pagination-page">
              Page <strong>{pageIndex + 1}</strong> of {totalPages}
            </span>
            <Button
              className="pagination-button"
              disabled={pageIndex + 1 >= totalPages}
              onClick={() => setPageIndex((current) => current + 1)}
            >
              Next →
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );

  const missingAssignedPrisonView = () => (
    <Box className="census-page">
      <Box className="portal-heading">
        <Typography className="crumb">Operations / Housing &amp; cells</Typography>
        <Box className="portal-title-row">
          <Box>
            <Typography component="h1">Housing &amp; cells</Typography>
            <Typography>View blocks, cell capacities, occupancy, and available spaces for your assigned prison.</Typography>
          </Box>
        </Box>
      </Box>
      <Paper className="directory" elevation={0}>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            The system could not load your assigned prison from your account profile. This does not confirm that you are unassigned. Reload the page to refresh your profile; if the issue remains, ask an administrator to verify your Chichiri Prison assignment.
          </Alert>
          <Button className="workflow-button" sx={{ mt: 2 }} onClick={() => window.location.reload()}>
            Reload profile
          </Button>
        </Box>
      </Paper>
    </Box>
  );

  return (
    <>
      {housingMode && assignedPrisonRequired && !assignedPrisonId
        ? missingAssignedPrisonView()
        : selectedId ? detailView() : listView()}
      {modal?.kind === "create" && (
        <CreatePrisonDialog
          onClose={() => { setModal(null); reloadList(); }}
          onSubmit={handleCreate}
        />
      )}
      {prison && modal?.kind === "edit-prison" && (
        <EditPrisonDialog
          prison={prison}
          onClose={() => setModal(null)}
          onSubmit={handleEditPrison}
        />
      )}
      {prison && modal?.kind === "add-block" && (
        <BlockDialog
          key="add"
          otherNames={prison.blocks.map((block) => block.name)}
          onClose={() => setModal(null)}
          onSubmit={handleAddBlock}
        />
      )}
      {prison && modal?.kind === "edit-block" && (
        <BlockDialog
          key={modal.block.id}
          block={modal.block}
          otherNames={prison.blocks
            .filter((block) => block.id !== modal.block.id)
            .map((block) => block.name)}
          onClose={() => setModal(null)}
          onSubmit={(input) => handleEditBlock(modal.block.id, input)}
        />
      )}
    </>
  );
}
