// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import api from "../api/axiosClient";
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
  MenuItem,
  Paper,
  Select,
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
import InmateProfile from "./InmateProfile";

type Inmate = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  inmateType: "REMAND" | "SENTENCED";
  admissionDate: string;
  dateOfBirth: string;
  prisonName: string;
  cellId: string;
};
type Section = "overview" | "profile" | "admission" | "profile-sentences";
type Props = { canAdmit: boolean; userRole: string; section: Section; onBack?: () => void };
type AdmissionForm = {
  firstName: string;
  lastName: string;
  offense: string;
  offenseOther: string;
  warrant: string;
  cell: string;
  admissionDate: string;
  dateOfBirth: string;
  sentenceType: "FIXED_TERM" | "LIFE" | "UNDETERMINED";
  sentenceStartDate: string;
  sentenceEndDate: string;
  homeAddress: string;
  appearance: string;
  custodyType: "Remand" | "Sentenced";
  crimeDescription: string;
  expectedCourtDate: string;
  medicalHistory: string;
  nextOfKinName: string;
  nextOfKinRelationship: string;
  nextOfKinPhone: string;
  nextOfKinEmail: string;
  contactPhone: string;
  contactEmail: string;
};

const initials = (name: string) =>
  name
    .replace(",", "")
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("");
const emptyAdmission: AdmissionForm = {
  firstName: "",
  lastName: "",
  offense: "",
  offenseOther: "",
  warrant: "",
  cell: "",
  admissionDate: new Date().toISOString().slice(0, 10),
  dateOfBirth: "",
  sentenceType: "FIXED_TERM",
  sentenceStartDate: new Date().toISOString().slice(0, 10),
  sentenceEndDate: "",
  homeAddress: "",
  appearance: "",
  custodyType: "Remand",
  crimeDescription: "",
  expectedCourtDate: "",
  medicalHistory: "",
  nextOfKinName: "",
  nextOfKinRelationship: "",
  nextOfKinPhone: "",
  nextOfKinEmail: "",
  contactPhone: "",
  contactEmail: "",
};
const displayDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
const ageAtAdmission = (birthDate: string, admissionDate: string) => {
  if (!birthDate || !admissionDate) return null;
  const birth = new Date(`${birthDate}T00:00:00`);
  const admitted = new Date(`${admissionDate}T00:00:00`);
  if (Number.isNaN(birth.valueOf()) || Number.isNaN(admitted.valueOf())) return null;
  let age = admitted.getFullYear() - birth.getFullYear();
  if (admitted.getMonth() < birth.getMonth() || (admitted.getMonth() === birth.getMonth() && admitted.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
};

function toDirectoryRecord(inmate: ApiInmate): Inmate {
  return {
    id: inmate.id,
    fullName: `${inmate.firstName} ${inmate.lastName}`.trim(),
    firstName: inmate.firstName,
    lastName: inmate.lastName,
    inmateType: inmate.inmateType,
    admissionDate: inmate.admissionDate ? displayDate(inmate.admissionDate) : "—",
    dateOfBirth: inmate.dateOfBirth,
    prisonName: inmate.prisonName,
    cellId: inmate.cellId,
  };
}

export function InmateManagement({ canAdmit, userRole, section, onBack }: Props) {
  const [search, setSearch] = useState("");
  const [custodyType, setCustodyType] = useState("All");
  const [records, setRecords] = useState<Inmate[]>([]);
  const [loading, setLoading] = useState(true);
  const [censusLoadError, setCensusLoadError] = useState(false);
  const [admissionOpen, setAdmissionOpen] = useState(section === "admission");
  const [admission, setAdmission] = useState<AdmissionForm>(emptyAdmission);
  const [savingAdmission, setSavingAdmission] = useState(false);
  const [admissionPhotos, setAdmissionPhotos] = useState<File[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [loadingCells, setLoadingCells] = useState(false);
  const [cellLoadError, setCellLoadError] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [admissionError, setAdmissionError] = useState<string | null>(null);
  const [selectedInmateId, setSelectedInmateId] = useState<string | null>(null);
  const [pendingSentence, setPendingSentence] = useState<{ inmate: string; inmateId: string; payload: Record<string, string> } | null>(null);
  const [retryingSentence, setRetryingSentence] = useState(false);

  useEffect(() => {
    setAdmissionOpen(section === "admission");
    setAdmissionError(null);
    setSelectedInmateId(null);
  }, [section]);

  const loadInmates = async () => {
    setLoading(true);
    setCensusLoadError(false);
    setNotice(null);
    try {
      // The API caps page size at 100; let the service follow its pagination metadata.
      const data = await inmateService.getInmates({ size: 100 });
      setRecords(data.map(toDirectoryRecord));
    } catch (error: unknown) {
      setCensusLoadError(true);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setNotice("Your session expired. Sign in again to load inmate records.");
      } else if (axios.isAxiosError(error) && error.response?.status === 403) {
        setNotice("The server declined access to these records. Check your sign-in and try again.");
      } else if (axios.isAxiosError(error) && error.response?.data?.message) {
        setNotice(String(error.response.data.message));
      } else if (axios.isAxiosError(error) && error.response?.status) {
        setNotice(`The inmate API returned HTTP ${error.response.status}.`);
      } else {
        setNotice("The inmate API could not be reached. Check that the backend is running and try again.");
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void loadInmates(); }, []);
  useEffect(() => {
    if (!admissionOpen) return;

    setLoadingCells(true);
    setCellLoadError("");
    inmateService.getCells({ size: 100, singlePage: true })
      .then(setCells)
      .catch((error) => { setCells([]); setCellLoadError(error instanceof Error ? error.message : "Could not load cells."); })
      .finally(() => setLoadingCells(false));
  }, [admissionOpen, userRole]);
  const filtered = useMemo(
    () =>
      records.filter((record) => {
        const haystack = `${record.fullName} ${record.id} ${record.prisonName} ${record.cellId}`.toLowerCase();
        return (
          (!search || haystack.includes(search.toLowerCase())) &&
          (custodyType === "All" || record.inmateType === custodyType)
        );
      }),
    [records, search, custodyType],
  );
  const closeAdmission = () => {
    setAdmission(emptyAdmission);
    setAdmissionPhotos([]);
    setAdmissionError(null);
    if (section === "admission") onBack?.();
    else setAdmissionOpen(false);
  };
  const retrySentence = async () => {
    if (!pendingSentence) return;
    setRetryingSentence(true);
    try {
      await api.post("/sentences", pendingSentence.payload);
      setNotice(`Sentence recorded for ${pendingSentence.inmate}.`);
      setPendingSentence(null);
    } catch (error) {
      const reason = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : "sentence service error";
      setNotice(`Inmate ${pendingSentence.inmate} is enrolled, but the sentence could not be recorded: ${reason}.`);
    } finally {
      setRetryingSentence(false);
    }
  };
  const saveAdmission = async () => {
    const missingFields = [
      ["first name", admission.firstName.trim()],
      ["last name", admission.lastName.trim()],
      ["date of birth", admission.dateOfBirth],
      ["admission date", admission.admissionDate],
      ["home address", admission.homeAddress.trim()],
      ["next of kin name", admission.nextOfKinName.trim()],
      ["next of kin relationship", admission.nextOfKinRelationship.trim()],
      ["next of kin phone", admission.nextOfKinPhone.trim()],
      ["medical history", admission.medicalHistory.trim()],
      ...(admission.custodyType === "Remand" ? [["expected court date", admission.expectedCourtDate]] : []),
      ...(admission.custodyType === "Sentenced" ? [["offence category", admission.offense.trim()], ["crime description", admission.crimeDescription.trim()], ["sentence start date", admission.sentenceStartDate]] : []),
      ["cell", admission.cell],
    ].filter(([, value]) => !value).map(([field]) => field);
    if (missingFields.length) {
      setAdmissionError(`Complete the following required fields: ${missingFields.join(", ")}.`);
      return;
    }
    const offenceText = [admission.offense === "Other" ? admission.offenseOther.trim() : admission.offense.trim(), admission.crimeDescription.trim()].filter(Boolean).join(" — ");
    if (admission.custodyType === "Sentenced" && admission.offense === "Other" && !admission.offenseOther.trim()) {
      setAdmissionError("Enter the offence category.");
      return;
    }
    if (admission.custodyType === "Sentenced" && offenceText.length > 500) {
      setAdmissionError("Keep the offence and crime description within 500 characters.");
      return;
    }

    const request: InmateRequest = {
      firstName: admission.firstName.trim(),
      lastName: admission.lastName.trim(),
      dateOfBirth: admission.dateOfBirth,
      // The backend requires a gender string. The UI suppresses it by station policy.
      gender: "Not recorded",
      admissionDate: admission.admissionDate,
      inmateType: admission.custodyType.toUpperCase() as "REMAND" | "SENTENCED",
      bio: [`Age at admission: ${ageAtAdmission(admission.dateOfBirth, admission.admissionDate) ?? "Not calculated"}`, `Home address: ${admission.homeAddress}`, admission.appearance ? `Distinguishing features: ${admission.appearance}` : "", admission.crimeDescription ? `Crime description: ${admission.crimeDescription}` : "", admission.warrant ? `Warrant reference: ${admission.warrant}` : ""].filter(Boolean).join("\n"),
      medicalHistory: admission.medicalHistory,
      ...(admission.custodyType === "Remand" ? { expectedCourtDate: admission.expectedCourtDate } : {}),
      nextOfKinName: admission.nextOfKinName,
      nextOfKinRelationship: admission.nextOfKinRelationship,
      nextOfKinPhone: admission.nextOfKinPhone,
      ...(admission.nextOfKinEmail ? { nextOfKinEmail: admission.nextOfKinEmail } : {}),
      ...(admission.contactPhone ? { contactPhone: admission.contactPhone } : {}),
      ...(admission.contactEmail ? { contactEmail: admission.contactEmail } : {}),
      cellId: admission.cell,
    };
    if (request.bio.length > 10000) {
      setAdmissionError("Please shorten the admission notes before saving.");
      return;
    }
    setSavingAdmission(true);
    setAdmissionError(null);
    setNotice(null);
    try {
      const created = admissionPhotos.length
        ? await inmateService.createInmateWithPhoto(request, admissionPhotos)
        : await inmateService.createInmate(request);
      let sentenceWarning = "";
      if (admission.custodyType === "Sentenced" && created.id) {
        const sentencePayload = { inmateId: created.id, offence: offenceText, sentenceType: admission.sentenceType, startDate: admission.sentenceStartDate, ...(admission.sentenceEndDate ? { endDate: admission.sentenceEndDate } : {}) };
        try {
          await api.post("/sentences", sentencePayload);
        } catch (error) {
          const reason = axios.isAxiosError(error) ? error.response?.data?.message || error.message : "sentence service error";
          sentenceWarning = ` Inmate enrolled, but the sentence could not be recorded: ${reason}.`;
          setPendingSentence({ inmate: `${created.firstName} ${created.lastName}`.trim(), inmateId: created.id, payload: sentencePayload });
        }
      }
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
      setNotice(`${savedInmate.firstName} ${savedInmate.lastName} has been added to the census.${sentenceWarning}`);
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
          setNotice(`Inmate was saved, but the census could not be refreshed.${sentenceWarning}`);
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
  if (selectedInmateId && section === "overview") return <InmateProfile inmateId={selectedInmateId} userRole={userRole} initialTab="Transfers" onBack={() => setSelectedInmateId(null)} />;
  if (section === "profile-sentences") return <SentenceInmatePicker records={records} loading={loading} error={censusLoadError ? notice : ""} onRetry={() => void loadInmates()} onSelect={setSelectedInmateId} />;
  return (
    <Box className="census-page">
      {!admissionOpen && <>
      {notice && (
        <Alert
          className="census-notice"
          severity={censusLoadError || pendingSentence ? "error" : "success"}
          action={pendingSentence ? <Button color="inherit" size="small" disabled={retryingSentence} onClick={() => void retrySentence()}>{retryingSentence ? "Retrying…" : "Retry sentence"}</Button> : censusLoadError ? <Button color="inherit" size="small" onClick={() => void loadInmates()}>Retry</Button> : undefined}
          onClose={() => setNotice(null)}
        >
          {notice}
        </Alert>
      )}
      {!admissionOpen && <Box className="portal-heading">
        <Box className="portal-title-row">
          <Box>
          <Typography component="h1">{section === "admission" ? "Admission" : section === "profile-sentences" ? "Sentences" : section === "profile" ? "Profile" : "Inmates"}</Typography>
          </Box>
        </Box>
      </Box>}
      {section !== "admission" && <>
      {section === "profile-sentences" && <Alert severity="info">Select an inmate from the table to open their Sentences.</Alert>}
      <Paper className="filter-bar" elevation={0}>
        <TextField
          placeholder="Search by name, ID, station, or cell"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          value={custodyType}
          onChange={(event) => setCustodyType(event.target.value)}
        >
          {["All", "REMAND", "SENTENCED"].map(
            (option) => (
              <MenuItem key={option} value={option}>
                {option === "All" ? "All inmate types" : option}
              </MenuItem>
            ),
          )}
        </Select>
        <Button
          className="reset-button"
          onClick={() => {
            setSearch("");
            setCustodyType("All");
          }}
        >
          Clear filters
        </Button>
      </Paper>
      <Paper className="directory" elevation={0}>
        <Box className="directory-title">
          <Box>
          <Typography component="h2">{section === "profile" ? "Inmate profiles" : "Inmate directory"}</Typography>
            <Typography>
              {section === "profile" ? "Choose an inmate to view their profile." : `${filtered.length} matching record${filtered.length === 1 ? "" : "s"} in the census.`}
            </Typography>
          </Box>
          {canAdmit && <Button variant="contained" onClick={() => setAdmissionOpen(true)}>Admit inmate</Button>}
        </Box>
        <TableContainer>
          <Table className="census-table">
            <TableHead>
              <TableRow>
                <TableCell>Inmate ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Date of Birth</TableCell>
                <TableCell>Inmate Type</TableCell>
                <TableCell>Station</TableCell>
                <TableCell>Cell ID</TableCell>
                <TableCell>Admission Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={8}>Loading inmate records...</TableCell></TableRow> : censusLoadError ? <TableRow><TableCell colSpan={8}>Inmate records are unavailable. Use Retry above after checking the API connection and your account access.</TableCell></TableRow> : !filtered.length ? <TableRow><TableCell colSpan={8}>No inmate records match these filters.</TableCell></TableRow> : filtered.map((record) => (
                <TableRow key={record.id} hover>
                  <TableCell>
                    <Box className="id-photo">
                      <span className="mugshot">
                        {initials(record.fullName)}
                      </span>
                      <code>{record.id}</code>
                    </Box>
                  </TableCell>
                  <TableCell className="full-name">{record.fullName}</TableCell>
                  <TableCell>{displayDate(record.dateOfBirth)}</TableCell>
                  <TableCell><Chip label={record.inmateType} /></TableCell>
                  <TableCell>{record.prisonName || "—"}</TableCell>
                  <TableCell>{record.cellId || "—"}</TableCell>
                  <TableCell>{record.admissionDate}</TableCell>
                  <TableCell><Button size="small" variant="outlined" onClick={() => setSelectedInmateId(record.id)}>View</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box className="pagination">Showing <strong>{filtered.length} of {records.length}</strong> returned inmate records</Box>
      </Paper>
      </>}
      </>}
      {admissionOpen && <Paper component="section" className="admission-page" elevation={0}>
        <Box className="admission-dialog-title">
          <Box>
          <Typography component="h2">Admission</Typography>
          </Box>
        </Box>
        <Box className="admission-dialog-content">
          {admissionError && (
            <Alert
              severity="error"
              onClose={() => setAdmissionError(null)}
              sx={{ mb: 2 }}
            >
              {admissionError}
            </Alert>
          )}
          <Box component="fieldset" className="admission-section">
            <legend>Identity &amp; legal record</legend>
            <Box className="admission-fields admission-identity-fields">
              <TextField
                required
                label="First name"
                inputProps={{ maxLength: 100 }}
                value={admission.firstName}
                onChange={(event) => setAdmission({ ...admission, firstName: event.target.value })}
              />
              <TextField required label="Last name" inputProps={{ maxLength: 100 }} value={admission.lastName} onChange={(event) => setAdmission({ ...admission, lastName: event.target.value })} />
              <TextField required label="Home address" inputProps={{ maxLength: 10000 }} value={admission.homeAddress} onChange={(event) => setAdmission({ ...admission, homeAddress: event.target.value })} />
              <TextField required label="Date of birth" type="date" value={admission.dateOfBirth} onChange={(event) => setAdmission({ ...admission, dateOfBirth: event.target.value })} helperText={ageAtAdmission(admission.dateOfBirth, admission.admissionDate) === null ? "Age is calculated from date of birth." : `Age at admission: ${ageAtAdmission(admission.dateOfBirth, admission.admissionDate)}`} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField select required label="Inmate type" value={admission.custodyType} onChange={(event) => setAdmission({ ...admission, custodyType: event.target.value })}>
                {["Remand", "Sentenced"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
              </TextField>
              {admission.custodyType === "Sentenced" && <TextField select required label="Offence category" value={admission.offense} onChange={(event) => setAdmission({ ...admission, offense: event.target.value })}><MenuItem value="" disabled>Select offence</MenuItem>{["Murder", "Theft", "Robbery", "Assault", "Fraud", "Drug offence", "Sexual offence", "Other"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField>}
              {admission.custodyType === "Sentenced" && admission.offense === "Other" && <TextField required label="Other offence category" inputProps={{ maxLength: 300 }} value={admission.offenseOther} onChange={(event) => setAdmission({ ...admission, offenseOther: event.target.value })} />}
              {admission.custodyType === "Sentenced" && <TextField multiline minRows={2} inputProps={{ maxLength: 500 }} label="Description of crime" value={admission.crimeDescription} onChange={(event) => setAdmission({ ...admission, crimeDescription: event.target.value })} />}
              <TextField
                label="Warrant reference"
                inputProps={{ maxLength: 1000 }}
                value={admission.warrant}
                onChange={(event) =>
                  setAdmission({ ...admission, warrant: event.target.value })
                }
              />
            </Box>
          </Box>
          <Box component="fieldset" className="admission-section">
            <legend>Bio</legend>
            <Box className="admission-fields admission-identity-fields">
              <Button component="label" variant="outlined">Upload photos<input hidden multiple type="file" accept="image/jpeg,image/png" onChange={(event) => { const files = Array.from(event.target.files ?? []); if (files.some((file) => !["image/jpeg", "image/png"].includes(file.type))) { setAdmissionError("Please choose JPEG or PNG images."); event.target.value = ""; return; } setAdmissionError(null); setAdmissionPhotos((current) => [...current, ...files]); event.target.value = ""; }} /></Button>
              {admissionPhotos.length > 0 && <Box className="flex flex-wrap items-center gap-2">{admissionPhotos.map((photo, index) => <Chip key={`${photo.name}-${photo.lastModified}-${index}`} size="small" label={photo.name} onDelete={() => setAdmissionPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))} />)}</Box>}
              <TextField multiline minRows={2} inputProps={{ maxLength: 1000 }} label="Distinguishing features" placeholder="Tattoos, scars, birthmarks, build, hair, identifying marks" value={admission.appearance} onChange={(event) => setAdmission({ ...admission, appearance: event.target.value })} />
            </Box>
          </Box>
          <Box component="fieldset" className="admission-section">
            <legend>Cell allocation</legend>
            <Box className="admission-fields admission-placement-fields">
              {loadingCells ? <Typography className="text-sm text-slate-500">Loading available cells…</Typography> : cellLoadError ? <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => { setLoadingCells(true); setCellLoadError(""); inmateService.getCells({ size: 100, singlePage: true }).then(setCells).catch((error) => setCellLoadError(error instanceof Error ? error.message : "Could not load cells.")).finally(() => setLoadingCells(false)); }}>Retry</Button>}>{cellLoadError}</Alert> : cells.length > 0 ? <TextField
                select
                required
                label="Cell"
                value={admission.cell}
                onChange={(event) =>
                  setAdmission({ ...admission, cell: event.target.value })
                }
                helperText="Choose a cell with available space."
              >
                {cells.map((cell) => (
                  <MenuItem
                    key={cell.id}
                    value={cell.id}
                    disabled={cell.availableSpaces <= 0}
                  >
                    {cell.name || cell.id} ({cell.availableSpaces} available · {cell.currentOccupancy}/{cell.capacity} occupied)
                  </MenuItem>
                ))}
              </TextField> : <Alert severity="warning">No cells are available to select. Add cells in the prison registry, then retry admission.</Alert>}
            </Box>
          </Box>
          <Box component="fieldset" className="admission-section">
            <legend>Contacts &amp; medical</legend>
            <Box className="admission-fields admission-identity-fields">
              <TextField required label="Next of kin name" inputProps={{ maxLength: 200 }} value={admission.nextOfKinName} onChange={(event) => setAdmission({ ...admission, nextOfKinName: event.target.value })} />
              <TextField required label="Relationship to next of kin" inputProps={{ maxLength: 100 }} value={admission.nextOfKinRelationship} onChange={(event) => setAdmission({ ...admission, nextOfKinRelationship: event.target.value })} />
              <TextField required label="Next of kin phone" inputProps={{ maxLength: 40 }} value={admission.nextOfKinPhone} onChange={(event) => setAdmission({ ...admission, nextOfKinPhone: event.target.value })} />
              <TextField label="Next of kin email" type="email" inputProps={{ maxLength: 254 }} value={admission.nextOfKinEmail} onChange={(event) => setAdmission({ ...admission, nextOfKinEmail: event.target.value })} />
              <TextField label="Inmate contact phone" inputProps={{ maxLength: 40 }} value={admission.contactPhone} onChange={(event) => setAdmission({ ...admission, contactPhone: event.target.value })} />
              <TextField label="Inmate contact email" type="email" inputProps={{ maxLength: 254 }} value={admission.contactEmail} onChange={(event) => setAdmission({ ...admission, contactEmail: event.target.value })} />
              <TextField required multiline minRows={2} inputProps={{ maxLength: 10000 }} label="Medical history" value={admission.medicalHistory} onChange={(event) => setAdmission({ ...admission, medicalHistory: event.target.value })} />
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
              {admission.custodyType === "Sentenced" && <TextField
                select
                required
                label="Sentence type"
                value={admission.sentenceType}
                onChange={(event) => setAdmission({ ...admission, sentenceType: event.target.value as AdmissionForm["sentenceType"] })}
              >
                {["FIXED_TERM", "LIFE", "UNDETERMINED"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
              </TextField>}
              {admission.custodyType === "Sentenced" && <TextField
                required
                label="Sentence start date"
                type="date"
                value={admission.sentenceStartDate}
                onChange={(event) => setAdmission({ ...admission, sentenceStartDate: event.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />}
              {admission.custodyType === "Sentenced" && <TextField
                label="Sentence end date (optional)"
                type="date"
                value={admission.sentenceEndDate}
                onChange={(event) => setAdmission({ ...admission, sentenceEndDate: event.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />}
              {admission.custodyType === "Remand" && <TextField required label="Expected court date" type="date" value={admission.expectedCourtDate} onChange={(event) => setAdmission({ ...admission, expectedCourtDate: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />}
            </Box>
          </Box>
        </Box>
        <Box className="admission-dialog-actions">
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
        </Box>
      </Paper>}
    </Box>
  );
}

function SentenceInmatePicker({ records, loading, error, onRetry, onSelect }: { records: Inmate[]; loading: boolean; error: string; onRetry: () => void; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const matches = records.filter((record) => `${record.fullName} ${record.id}`.toLowerCase().includes(query.toLowerCase()));
  return <Box className="census-page">
    {error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={onRetry}>Retry</Button>}>{error}</Alert>}
    <Paper className="directory mx-auto max-w-5xl" elevation={0}>
      <Box className="directory-title flex flex-wrap items-center justify-between gap-3">
        <Box><Typography component="h2">Find an inmate</Typography><Typography>Search by name or inmate ID, then open their sentence record.</Typography></Box>
        <Chip size="small" label={loading ? "Loading…" : `${matches.length} ${matches.length === 1 ? "inmate" : "inmates"}`} sx={{ bgcolor: "#edf4f8", color: "#28566f", fontWeight: 700 }} />
      </Box>
      <Box className="flex flex-col gap-3 border-b border-slate-100 bg-[#fbfcfd] p-4 sm:flex-row sm:items-center">
        <TextField fullWidth label="Search name or inmate ID" placeholder="Type a name or ID" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Typography className="shrink-0 text-xs text-slate-500">{loading ? "Loading inmate records…" : error ? "Inmate list unavailable" : "Select one inmate to continue"}</Typography>
      </Box>
      <Box className="max-h-[60vh] overflow-y-auto">
        {!loading && !error && !matches.length && <Box className="flex flex-col items-center px-6 py-14 text-center">
          <Box className="mb-4 grid size-14 place-items-center rounded-2xl bg-[#edf4f8] text-[#28566f]"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-7"><circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.7"/><path d="m16 16 4.5 4.5M8 10.8h5.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg></Box>
          <Typography className="font-semibold text-slate-800">{query.trim() ? "No matching inmates" : "No inmate records yet"}</Typography>
          <Typography className="mt-1 max-w-md text-sm text-slate-500">{query.trim() ? "Try another name or ID." : "When inmate records are available, search and select one here to manage their sentences and remissions."}</Typography>
          {query.trim() && <Button size="small" onClick={() => setQuery("")} sx={{ mt: 1.5 }}>Clear search</Button>}
        </Box>}
        {matches.map((record) => <Box key={record.id} className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-4 transition-colors hover:bg-[#f7fafc] sm:px-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#e7eff4] text-xs font-bold text-[#28566f]">{initials(record.fullName)}</span>
          <Box className="min-w-[180px] flex-1">
            <Typography className="truncate text-sm font-semibold text-slate-800">{record.fullName}</Typography>
            <Typography className="mt-0.5 truncate text-xs text-slate-500">ID {record.id}</Typography>
          </Box>
          <Box className="flex min-w-[155px] items-center gap-2">
            <Chip size="small" label={record.inmateType === "REMAND" ? "Remand" : "Sentenced"} variant="outlined" sx={{ borderColor: "#d9e3e9", color: "#526579", fontSize: 11 }} />
            <Typography className="text-xs text-slate-500">Cell {record.cellId || "—"}</Typography>
          </Box>
          <Button variant="contained" size="small" onClick={() => onSelect(record.id)} endIcon={<span aria-hidden="true">→</span>} sx={{ ml: "auto", minWidth: 142, textTransform: "none", bgcolor: "#173a59", "&:hover": { bgcolor: "#245879" } }}>View sentences</Button>
        </Box>)}
      </Box>
    </Paper>
  </Box>;
}
