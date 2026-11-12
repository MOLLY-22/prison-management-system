// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  inmateService,
  type Inmate as ApiInmate,
  type InmateRequest,
  type Cell,
} from "../api/inmateService";
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
import "./admissionDialog.css";
import "./inmateManagement.css";

type CustodyStatus = "Max Security" | "Active Sentence" | "Pre-Trial";
type Inmate = {
  id: string;
  fullName: string;
  offense: string;
  warrant: string;
  block: string;
  cell: string;
  status: CustodyStatus;
  admissionDate: string;
  arrestingStation: string;
  dateOfBirth: string;
  gender: string;
  sentenceStartDate: string;
  sentenceEndDate: string;
};
type Props = { canAdmit: boolean };
type AdmissionForm = {
  id: string;
  fullName: string;
  offense: string;
  warrant: string;
  block: string;
  cell: string;
  status: CustodyStatus;
  admissionDate: string;
  arrestingStation: string;
  dateOfBirth: string;
  gender: string;
  sentenceStartDate: string;
  sentenceEndDate: string;
};

const inmates: Inmate[] = [
  {
    id: "INM-88392",
    fullName: "Chimwemwe, Massa J.",
    offense: "Armed Robbery",
    warrant: "W-44901-X",
    block: "Block A",
    cell: "Cell 104-B",
    status: "Max Security",
    admissionDate: "Jan 12, 2021",
    arrestingStation: "Central Precinct #4",
  },
  {
    id: "INM-91024",
    fullName: "KElvin, Marie Namu",
    offense: "Securities Fraud",
    warrant: "W-99214-F",
    block: "Block B",
    cell: "Cell 210-A",
    status: "Active Sentence",
    admissionDate: "May 19, 2022",
    arrestingStation: "Metro Transit Hub",
  },
  {
    id: "INM-94012",
    fullName: "Khomnbo, Sam",
    offense: "Controlled Substances",
    warrant: "W-11029-B",
    block: "Block C",
    cell: "Cell 012-C",
    status: "Pre-Trial",
    admissionDate: "Aug 03, 2023",
    arrestingStation: "North District Precinct",
  },
  {
    id: "INM-95521",
    fullName: "Alinane, Pansi E.",
    offense: "Grand Larceny",
    warrant: "W-44012-L",
    block: "Block B",
    cell: "Cell 304-A",
    status: "Active Sentence",
    admissionDate: "Nov 14, 2021",
    arrestingStation: "Central Precinct #4",
  },
];
const scheduledTransfers = [
  {
    id: "TRN-1048",
    name: "fazala, mashona J.",
    inmateId: "INM-88392",
    court: "Central Criminal Court",
    time: "Oct 25, 2023 · 08:30",
    escort: "Unit Bravo",
  },
  {
    id: "TRN-1051",
    name: "Dunga, Marie Nkhwani",
    inmateId: "INM-91024",
    court: "Financial Crimes Division",
    time: "Oct 25, 2023 · 10:00",
    escort: "Unit Delta",
  },
  {
    id: "TRN-1054",
    name: "kayaman, Zako E.",
    inmateId: "INM-95521",
    court: "District Court 3",
    time: "Oct 26, 2023 · 09:15",
    escort: "Unit Bravo",
  },
];
const initials = (name: string) =>
  name
    .replace(",", "")
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("");
const emptyAdmission: AdmissionForm = {
  id: "",
  fullName: "",
  offense: "",
  warrant: "",
  block: "Block A",
  cell: "",
  status: "Pre-Trial",
  admissionDate: new Date().toISOString().slice(0, 10),
  arrestingStation: "",
  dateOfBirth: "",
  gender: "Other",
  sentenceStartDate: new Date().toISOString().slice(0, 10),
  sentenceEndDate: "",
};
const displayDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));

function toDirectoryRecord(inmate: ApiInmate): Inmate {
  return {
    id: inmate.id,
    fullName: `${inmate.firstName} ${inmate.lastName}`.trim(),
    offense: inmate.offence,
    warrant: "—",
    block: "Assigned cell",
    cell: inmate.cellId,
    status: "Active Sentence",
    admissionDate: inmate.admissionDate ? displayDate(inmate.admissionDate) : "—",
    arrestingStation: "—",
    dateOfBirth: inmate.dateOfBirth,
    gender: inmate.gender,
    sentenceStartDate: inmate.sentenceStartDate,
    sentenceEndDate: inmate.sentenceEndDate,
  };
}

export function InmateManagement({ canAdmit }: Props) {
  const [search, setSearch] = useState("");
  const [offense, setOffense] = useState("All");
  const [block, setBlock] = useState("All");
  const [status, setStatus] = useState("All");
  const [records, setRecords] = useState<Inmate[]>([]);
  const [loading, setLoading] = useState(true);
  const [censusLoadError, setCensusLoadError] = useState(false);
  const [admissionOpen, setAdmissionOpen] = useState(false);
  const [admission, setAdmission] = useState<AdmissionForm>(emptyAdmission);
  const [savingAdmission, setSavingAdmission] = useState(false);
  const [cells, setCells] = useState<Cell[]>([]);
  const [loadingCells, setLoadingCells] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [admissionError, setAdmissionError] = useState<string | null>(null);
  const [page, setPage] = useState<"census" | "transfers">("census");

  useEffect(() => {
    inmateService.getInmates()
      .then((data) => setRecords(data.map(toDirectoryRecord)))
      .catch((error: unknown) => {
        setCensusLoadError(true);
        if (axios.isAxiosError(error) && error.response?.status === 403) {
          setNotice("Access denied: inmate records require a Records Officer or Super Admin account.");
        } else if (axios.isAxiosError(error) && error.response?.data?.message) {
          setNotice(error.response.data.message);
        } else {
          setNotice("Could not load inmate records. Check the API connection and try again.");
        }
      })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!admissionOpen) return;

    setLoadingCells(true);
    inmateService.getCells({ size: 100 })
      .then(setCells)
      .catch(() => setAdmissionError("Could not load available cells. Please try again."))
      .finally(() => setLoadingCells(false));
  }, [admissionOpen]);
  const filtered = useMemo(
    () =>
      records.filter((record) => {
        const haystack =
          `${record.fullName} ${record.offense} ${record.block}`.toLowerCase();
        return (
          (!search || haystack.includes(search.toLowerCase())) &&
          (offense === "All" || record.offense === offense) &&
          (block === "All" || record.block === block) &&
          (status === "All" || record.status === status)
        );
      }),
    [records, search, offense, block, status],
  );
  const closeAdmission = () => {
    setAdmissionOpen(false);
    setAdmission(emptyAdmission);
    setAdmissionError(null);
  };
  const saveAdmission = async () => {
    const missingFields = [
      ["full name", admission.fullName.trim()],
      ["date of birth", admission.dateOfBirth],
      ["gender", admission.gender],
      ["admission date", admission.admissionDate],
      ["offense", admission.offense.trim()],
      ["sentence start date", admission.sentenceStartDate],
      ["sentence end date", admission.sentenceEndDate],
      ["cell", admission.cell],
    ].filter(([, value]) => !value).map(([field]) => field);
    if (missingFields.length) {
      setAdmissionError(`Complete the following required fields: ${missingFields.join(", ")}.`);
      return;
    }

    const selectedCell = cells.find((cell) => cell.id === admission.cell);
    if (!selectedCell?.prisonId) {
      setAdmissionError("The selected cell has no prison assignment. Reload the cell list and try again.");
      return;
    }

    const [firstName, ...lastNameParts] = admission.fullName.trim().split(/\s+/);
    const request: InmateRequest = {
      firstName,
      lastName: lastNameParts.join(" ") || firstName,
      dateOfBirth: admission.dateOfBirth,
      gender: admission.gender,
      admissionDate: admission.admissionDate,
      offence: admission.offense,
      sentenceStartDate: admission.sentenceStartDate,
      sentenceEndDate: admission.sentenceEndDate,
      prisonId: selectedCell.prisonId,
      cellId: admission.cell,
    };
    setSavingAdmission(true);
    setAdmissionError(null);
    setNotice(null);
    try {
      const created = await inmateService.createInmate(request);
      const savedInmate: ApiInmate = {
        ...request,
        ...created,
        id: created.id || `new-${Date.now()}`,
      };

      setRecords((current) => [
        toDirectoryRecord(savedInmate),
        ...current.filter((record) => record.id !== savedInmate.id),
      ]);
      closeAdmission();
      setNotice(`${savedInmate.firstName} ${savedInmate.lastName} has been added to the census.`);
      try {
        const refreshed = await inmateService.getInmates();
        setRecords((current) => {
          const refreshedRecords = refreshed.map(toDirectoryRecord);
          const savedRecord = toDirectoryRecord(savedInmate);
          return refreshedRecords.some((record) => record.id === savedRecord.id)
            ? refreshedRecords
            : [savedRecord, ...refreshedRecords];
        });
      } catch {
        setNotice("Inmate was saved, but the census could not be refreshed.");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          setAdmissionError("Your session has expired. Sign in again before saving an admission.");
        } else if (!error.response) {
          setAdmissionError("The inmate service is unreachable. Make sure the API is running on localhost:8080.");
        } else {
          const responseMessage = error.response.data &&
            typeof error.response.data === "object" &&
            "message" in error.response.data
            ? String(error.response.data.message)
            : undefined;
          setAdmissionError(responseMessage || `Could not save inmate admission (${error.response.status}).`);
        }
      } else {
        setAdmissionError(error instanceof Error ? error.message : "Could not save inmate admission.");
      }
    } finally {
      setSavingAdmission(false);
    }
  };
  if (page === "transfers")
    return <TransferSchedule onBack={() => setPage("census")} />;
  return (
    <Box className="census-page">
      {notice && (
        <Alert
          className="census-notice"
          severity="success"
          onClose={() => setNotice(null)}
        >
          {notice}
        </Alert>
      )}
      <Box className="portal-heading">
        <Typography className="crumb">
          Operations / Inmate management
        </Typography>
        <Box className="portal-title-row">
          <Box>
            <Typography component="h1">Inmate census</Typography>
            <Typography>
              Search active records, review custody details, and manage new
              admissions.
            </Typography>
          </Box>
          <Stack direction="row" gap={1} className="portal-actions gap-5">
            <Button
              type="button"
              className="workflow-button"
              onClick={() => {
                setAdmissionError(null);
                setAdmissionOpen(true);
              }}
            >
              New admission
            </Button>
            <Button className="export-button">Export report</Button>
          </Stack>
        </Box>
      </Box>
      <Box className="census-metrics">
        <Metric
          label="Active census"
          value={censusLoadError ? "—" : records.length.toLocaleString()}
          note={censusLoadError ? "Records could not be loaded" : "Records loaded from the API"}
          tone="blue"
        />
        <Metric
          label="Scheduled transfers"
          value="8"
          note="Outbound court transit"
          tone="blue"
          onClick={() => setPage("transfers")}
        />
      </Box>
      <Paper className="filter-bar" elevation={0}>
        <TextField
          placeholder="Search by name, offense, or block"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          value={offense}
          onChange={(event) => setOffense(event.target.value)}
        >
          {["All", ...new Set(records.map((record) => record.offense))].map(
            (option) => (
              <MenuItem key={option} value={option}>
                {option === "All" ? "All offenses" : option}
              </MenuItem>
            ),
          )}
        </Select>
        <Select
          value={block}
          onChange={(event) => setBlock(event.target.value)}
        >
          {["All", "Block A", "Block B", "Block C"].map((option) => (
            <MenuItem key={option} value={option}>
              {option === "All" ? "All blocks" : option}
            </MenuItem>
          ))}
        </Select>
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {["All", "Max Security", "Active Sentence", "Pre-Trial"].map(
            (option) => (
              <MenuItem key={option} value={option}>
                {option === "All" ? "All statuses" : option}
              </MenuItem>
            ),
          )}
        </Select>
        <Button
          className="reset-button"
          onClick={() => {
            setSearch("");
            setOffense("All");
            setBlock("All");
            setStatus("All");
          }}
        >
          Clear filters
        </Button>
      </Paper>
      <Paper className="directory" elevation={0}>
        <Box className="directory-title">
          <Box>
            <Typography component="h2">Inmate Census Directory</Typography>
            <Typography>
              {filtered.length} matching record
              {filtered.length === 1 ? "" : "s"} in the active institutional
              census
            </Typography>
          </Box>
        </Box>
        <TableContainer>
          <Table className="census-table">
            <TableHead>
              <TableRow>
                <TableCell>Inmate ID / Photo</TableCell>
                <TableCell>Full Name</TableCell>
                <TableCell>Offense &amp; Warrant</TableCell>
                <TableCell>Location / Cell</TableCell>
                <TableCell>Custody Status</TableCell>
                <TableCell>Admission Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6}>Loading inmate records...</TableCell></TableRow> : filtered.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <Box className="id-photo">
                      <span className="mugshot">
                        {initials(record.fullName)}
                      </span>
                      <code>{record.id}</code>
                    </Box>
                  </TableCell>
                  <TableCell className="full-name">{record.fullName}</TableCell>
                  <TableCell>
                    {record.offense}
                    <small>{record.warrant}</small>
                  </TableCell>
                  <TableCell>
                    {record.block}
                    <small>{record.cell}</small>
                  </TableCell>
                  <TableCell>
                    <Chip
                      className={`custody ${record.status.replace(" ", "-").toLowerCase()}`}
                      label={`• ${record.status}`}
                    />
                  </TableCell>
                  <TableCell>{record.admissionDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box className="pagination">
          Showing           <strong>1 - {filtered.length} of {records.length}</strong> total records{" "}
          <Box sx={{ flexGrow: 1 }} />
          <Button disabled>Previous</Button>
          <Button className="active-page">1</Button>
          <Button>2</Button>
          <Button>3</Button>
          <span>...</span>
          <Button>242</Button>
          <Button>Next</Button>
        </Box>
      </Paper>
      <Dialog
        className="admission-dialog"
        open={admissionOpen}
        onClose={closeAdmission}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle className="admission-dialog-title">
          <Box>
            <Typography component="h2">New inmate admission</Typography>
            <Typography>Start a secure institutional census record.</Typography>
          </Box>
          <span>Required fields *</span>
        </DialogTitle>
        <DialogContent className="admission-dialog-content">
          {admissionError && (
            <Alert
              severity="error"
              onClose={() => setAdmissionError(null)}
              sx={{ mb: 2 }}
            >
              {admissionError}
            </Alert>
          )}
          <Typography className="admission-intro">
            Enter the verified details below. An inmate ID is assigned
            automatically after the record is saved.
          </Typography>
          <Box component="fieldset" className="admission-section">
            <legend>Identity &amp; legal record</legend>
            <Box className="admission-fields admission-identity-fields">
              <TextField
                required
                label="Full name"
                value={admission.fullName}
                onChange={(event) =>
                  setAdmission({ ...admission, fullName: event.target.value })
                }
              />
              <TextField
                required
                label="Date of birth"
                type="date"
                value={admission.dateOfBirth}
                onChange={(event) => setAdmission({ ...admission, dateOfBirth: event.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                select
                required
                label="Gender"
                value={admission.gender}
                onChange={(event) => setAdmission({ ...admission, gender: event.target.value })}
              >
                {["Male", "Female", "Other"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
              </TextField>
              <TextField
                required
                label="Offense"
                value={admission.offense}
                onChange={(event) =>
                  setAdmission({ ...admission, offense: event.target.value })
                }
              />
              <TextField
                label="Warrant number"
                value={admission.warrant}
                onChange={(event) =>
                  setAdmission({ ...admission, warrant: event.target.value })
                }
              />
            </Box>
          </Box>
          <Box component="fieldset" className="admission-section">
            <legend>Placement &amp; custody</legend>
            <Box className="admission-fields admission-placement-fields">
              <TextField
                select
                required
                label="Cell block"
                value={admission.block}
                onChange={(event) =>
                  setAdmission({ ...admission, block: event.target.value })
                }
              >
                {["Block A", "Block B", "Block C"].map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                required
                label="Cell"
                value={admission.cell}
                onChange={(event) =>
                  setAdmission({ ...admission, cell: event.target.value })
                }
                helperText={
                  loadingCells
                    ? "Loading available cells..."
                    : cells.length
                      ? "Only existing cells can be assigned."
                      : "No available cells were found."
                }
                disabled={loadingCells || !cells.length}
              >
                {cells.map((cell) => (
                  <MenuItem
                    key={cell.id}
                    value={cell.id}
                    disabled={cell.availableSpaces <= 0}
                  >
                    {cell.name || cell.id} ({cell.availableSpaces} available)
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                required
                label="Custody status"
                value={admission.status}
                onChange={(event) =>
                  setAdmission({
                    ...admission,
                    status: event.target.value as CustodyStatus,
                  })
                }
              >
                {["Max Security", "Active Sentence", "Pre-Trial"].map(
                  (item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ),
                )}
              </TextField>
            </Box>
          </Box>
          <Box component="fieldset" className="admission-section">
            <legend>Intake reference</legend>
            <Box className="admission-fields admission-intake-fields">
              <TextField
                required
                label="Admission date"
                type="date"
                value={admission.admissionDate}
                onChange={(event) =>
                  setAdmission({
                    ...admission,
                    admissionDate: event.target.value,
                  })
                }
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                required
                label="Sentence start date"
                type="date"
                value={admission.sentenceStartDate}
                onChange={(event) => setAdmission({ ...admission, sentenceStartDate: event.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                required
                label="Sentence end date"
                type="date"
                value={admission.sentenceEndDate}
                onChange={(event) => setAdmission({ ...admission, sentenceEndDate: event.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Arresting station"
                value={admission.arrestingStation}
                onChange={(event) =>
                  setAdmission({
                    ...admission,
                    arrestingStation: event.target.value,
                  })
                }
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions className="admission-dialog-actions">
          <Button onClick={closeAdmission}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              await saveAdmission();
            }}
            disabled={savingAdmission}
          >
            {savingAdmission ? "Saving..." : "Save admission"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function Metric({
  label,
  value,
  note,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  note: string;
  tone: string;
  onClick?: () => void;
}) {
  return (
    <Paper
      className={`metric-card ${tone} ${onClick ? "metric-card-link" : ""}`}
      elevation={0}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) onClick();
      }}
    >
      <Box>
        <Typography>{label}</Typography>
        <strong>{value}</strong>
        <small>{note}</small>
      </Box>
      {onClick && (
        <Typography className="metric-action">View schedule →</Typography>
      )}
    </Paper>
  );
}

function TransferSchedule({ onBack }: { onBack: () => void }) {
  return (
    <Box className="census-page transfer-page">
      <Button className="back-button" onClick={onBack}>
        ← Back to inmate census
      </Button>
      <Box className="transfer-heading">
        <Typography className="crumb">Operations</Typography>
        <Typography component="h1">Scheduled court transfers</Typography>
        <Typography>
          Inmates scheduled for escorted transport to court.
        </Typography>
      </Box>
      <Paper className="directory transfer-directory" elevation={0}>
        <Box className="directory-title">
          <Box>
            <Typography component="h2">Schedules</Typography>
            <Typography>
              {scheduledTransfers.length} upcoming court movements
            </Typography>
          </Box>
        </Box>
        <TableContainer>
          <Table className="census-table">
            <TableHead>
              <TableRow>
                <TableCell>Transfer ID</TableCell>
                <TableCell>Inmate</TableCell>
                <TableCell>Destination facility</TableCell>
                <TableCell>Departure</TableCell>
                <TableCell>Escort detail</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scheduledTransfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell>
                    <code>{transfer.id}</code>
                  </TableCell>
                  <TableCell>
                    <Box className="id-photo">
                      <span className="mugshot">{initials(transfer.name)}</span>
                      <Box>
                        <Typography className="full-name">
                          {transfer.name}
                        </Typography>
                        <small>{transfer.inmateId}</small>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{transfer.court}</TableCell>
                  <TableCell>{transfer.time}</TableCell>
                  <TableCell>
                    <Chip
                      className="custody active-sentence"
                      label={transfer.escort}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
