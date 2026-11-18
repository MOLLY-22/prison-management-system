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

type CustodyStatus = "REMAND" | "SENTENCED";
type Inmate = {
  id: string;
  fullName: string;
  bio: string;
  cell: string;
  status: CustodyStatus;
  admissionDate: string;
  dateOfBirth: string;
  gender: string;
  expectedCourtDate?: string;
};
type Props = { canAdmit: boolean };
type AdmissionForm = {
  fullName: string;
  cell: string;
  status: CustodyStatus;
  admissionDate: string;
  dateOfBirth: string;
  gender: string;
  bio: string;
  medicalHistory: string;
  expectedCourtDate: string;
  nextOfKinName: string;
  nextOfKinRelationship: string;
  nextOfKinPhone: string;
};

const initials = (name: string) =>
  name
    .replace(",", "")
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("");
const emptyAdmission: AdmissionForm = {
  fullName: "",
  cell: "",
  status: "REMAND",
  admissionDate: new Date().toISOString().slice(0, 10),
  dateOfBirth: "",
  gender: "Other",
  bio: "",
  medicalHistory: "",
  expectedCourtDate: "",
  nextOfKinName: "",
  nextOfKinRelationship: "",
  nextOfKinPhone: "",
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
    bio: inmate.bio,
    cell: inmate.cellId,
    status: inmate.inmateType,
    admissionDate: inmate.admissionDate ? displayDate(inmate.admissionDate) : "—",
    dateOfBirth: inmate.dateOfBirth,
    gender: inmate.gender,
    expectedCourtDate: inmate.expectedCourtDate,
  };
}
export function InmateManagement({ canAdmit }: Props) {
  const [search, setSearch] = useState("");
  const [bio, setBio] = useState("All");
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

    inmateService.getCells({ size: 100 })
      .then(setCells)
      .catch((error: unknown) => {
        setAdmissionError(
          error instanceof Error ? error.message : "Could not load available cells.",
        );
      })
      .finally(() => setLoadingCells(false));
  }, [admissionOpen]);
  const filtered = useMemo(
    () =>
      records.filter((record) => {
        const haystack = `${record.fullName} ${record.bio} ${record.cell}`.toLowerCase();
        return (
          (!search || haystack.includes(search.toLowerCase())) &&
          (bio === "All" || record.bio === bio) &&
          (status === "All" || record.status === status)
        );
      }),
    [records, search, bio, status],
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
      ["bio", admission.bio.trim()],
      ["medical history", admission.medicalHistory.trim()],
      ["next-of-kin name", admission.nextOfKinName.trim()],
      ["next-of-kin relationship", admission.nextOfKinRelationship.trim()],
      ["next-of-kin phone", admission.nextOfKinPhone.trim()],
      ["cell", admission.cell],
      ...(admission.status === "REMAND"
        ? [["expected court date", admission.expectedCourtDate]]
        : []),
    ].filter(([, value]) => !value).map(([field]) => field);
    if (missingFields.length) {
      setAdmissionError(`Complete the following required fields: ${missingFields.join(", ")}.`);
      return;
    }

    const selectedCell = cells.find((cell) => cell.id === admission.cell);
    if (!selectedCell || selectedCell.availableSpaces <= 0) {
      setAdmissionError("The selected cell is unavailable or full. Reload the cell list and choose another cell.");
      return;
    }

    const [firstName, ...lastNameParts] = admission.fullName.trim().split(/\s+/);
    const request: InmateRequest = {
      firstName,
      lastName: lastNameParts.join(" ") || firstName,
      dateOfBirth: admission.dateOfBirth,
      gender: admission.gender,
      admissionDate: admission.admissionDate,
      inmateType: admission.status,
      bio: admission.bio.trim(),
      medicalHistory: admission.medicalHistory.trim(),
      nextOfKinName: admission.nextOfKinName.trim(),
      nextOfKinRelationship: admission.nextOfKinRelationship.trim(),
      nextOfKinPhone: admission.nextOfKinPhone.trim(),
      cellId: admission.cell,
      ...(admission.status === "REMAND"
        ? { expectedCourtDate: admission.expectedCourtDate }
        : {}),
    };
    setSavingAdmission(true);
    setAdmissionError(null);
    setNotice(null);
    try {
      const created = await inmateService.createInmate(request);
      setRecords((current) => [
        toDirectoryRecord(created),
        ...current.filter((record) => record.id !== created.id),
      ]);
      closeAdmission();
      setNotice(`${created.firstName} ${created.lastName} has been added to the census.`);
      try {
        const refreshed = await inmateService.getInmates();
        setRecords(refreshed.map(toDirectoryRecord));
      } catch {
        setNotice("Inmate was saved, but the census could not be refreshed. Reload the page before retrying this admission.");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          setAdmissionError("Your session has expired. Sign in again before saving an admission.");
        } else if (!error.response) {
          setAdmissionError("The admission could not be confirmed; the API may have saved it before the connection failed. Check the census before retrying.");
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
  return (
    <Box className="census-page">
      {notice && (
        <Alert
          className="census-notice"
          severity={censusLoadError ? "error" : "success"}
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
            <Typography component="h1">Inmate Records</Typography>
            <Typography>
              Search active records, review custody details, and manage new
              admissions.
            </Typography>
          </Box>
          <Stack direction="row" className="portal-actions gap-5">
            <Button
              type="button"
              className="workflow-button"
              onClick={() => {
                setAdmissionError(null);
                setLoadingCells(true);
                setAdmissionOpen(true);
              }}
              disabled={!canAdmit}
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
          value="—"
          note="Court scheduling is not exposed by the API"
          tone="blue"
        />
      </Box>
      <Paper className="filter-bar" elevation={0}>
        <TextField
        placeholder="Search by name, bio, or cell"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          value={bio}
          onChange={(event) => setBio(event.target.value)}
        >
          {["All", ...new Set(records.map((record) => record.bio))].map(
            (option) => (
              <MenuItem key={option} value={option}>
                {option === "All" ? "All bios" : option}
              </MenuItem>
            ),
          )}
        </Select>
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {["All", "SENTENCED", "REMAND"].map(
            (option) => (
              <MenuItem key={option} value={option}>
                {option === "All" ? "All custody types" : option}
              </MenuItem>
            ),
          )}
        </Select>
        <Button
          className="reset-button"
          onClick={() => {
            setSearch("");
            setBio("All");
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
                <TableCell>Inmate Bio</TableCell>
                <TableCell>Assigned Cell</TableCell>
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
                    {record.bio}
                  </TableCell>
                  <TableCell>{record.cell}</TableCell>
                  <TableCell>
                    <Chip
                      className={`custody ${record.status.replace(" ", "-").toLowerCase()}`}
                      label={`• ${record.status === "SENTENCED" ? "Sentenced" : "Remand"}`}
                    />
                  </TableCell>
                  <TableCell>{record.admissionDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box className="pagination">
          Showing <strong>{filtered.length} of {records.length}</strong> loaded API records
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
            </Box>
          </Box>
          <Box component="fieldset" className="admission-section">
            <legend>Placement &amp; custody</legend>
            <Box className="admission-fields admission-placement-fields">
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
                label="Inmate type"
                value={admission.status}
                onChange={(event) =>
                  setAdmission({
                    ...admission,
                    status: event.target.value as CustodyStatus,
                  })
                }
              >
                <MenuItem value="REMAND">Remand</MenuItem>
                <MenuItem value="SENTENCED">Sentenced</MenuItem>
              </TextField>
            </Box>
            {admission.status === "SENTENCED" && (
              <Alert severity="info" sx={{ mt: 2 }}>
                This request enrolls the inmate only. The backend requires a
                separate sentence record; sentence dates and offences are not
                saved by this admission form.
              </Alert>
            )}
          </Box>
          <Box component="fieldset" className="admission-section">
            <legend>Required personal and medical details</legend>
            <Box className="admission-fields">
              <TextField
                required
                label="Bio"
                multiline
                minRows={2}
                value={admission.bio}
                onChange={(event) => setAdmission({ ...admission, bio: event.target.value })}
              />
              <TextField
                required
                label="Medical history"
                multiline
                minRows={2}
                value={admission.medicalHistory}
                onChange={(event) => setAdmission({ ...admission, medicalHistory: event.target.value })}
              />
              <TextField
                required
                label="Next-of-kin name"
                value={admission.nextOfKinName}
                onChange={(event) => setAdmission({ ...admission, nextOfKinName: event.target.value })}
              />
              <TextField
                required
                label="Next-of-kin relationship"
                value={admission.nextOfKinRelationship}
                onChange={(event) => setAdmission({ ...admission, nextOfKinRelationship: event.target.value })}
              />
              <TextField
                required
                label="Next-of-kin phone"
                value={admission.nextOfKinPhone}
                onChange={(event) => setAdmission({ ...admission, nextOfKinPhone: event.target.value })}
              />
              {admission.status === "REMAND" && (
                <TextField
                  required
                  label="Expected court date"
                  type="date"
                  value={admission.expectedCourtDate}
                  onChange={(event) => setAdmission({ ...admission, expectedCourtDate: event.target.value })}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              )}
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
