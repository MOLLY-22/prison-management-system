/* eslint-disable react-hooks/set-state-in-effect */
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
  const [admissionPhoto, setAdmissionPhoto] = useState<File | null>(null);
  const [cells, setCells] = useState<Cell[]>([]);
  const [loadingCells, setLoadingCells] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [admissionError, setAdmissionError] = useState<string | null>(null);
  const [selectedInmateId, setSelectedInmateId] = useState<string | null>(null);

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
      const data = await inmateService.getInmates({ page: 0, size: 1000 });
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
    inmateService.getCells({ size: 100 })
      .then(setCells)
      .catch(() => setCells([]))
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
    setAdmissionError(null);
    if (section === "admission") onBack?.();
    else setAdmissionOpen(false);
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
      const created = admissionPhoto
        ? await inmateService.createInmateWithPhoto(request, admissionPhoto)
        : await inmateService.createInmate(request);
      let sentenceWarning = "";
      if (admission.custodyType === "Sentenced" && created.id) {
        try {
          await inmateService.createSentence({
            inmateId: created.id,
            offence: offenceText,
            sentenceType: admission.sentenceType,
            startDate: admission.sentenceStartDate,
            ...(admission.sentenceEndDate ? { endDate: admission.sentenceEndDate } : {}),
          });
        } catch (error) {
          sentenceWarning = ` Inmate enrolled, but the sentence could not be recorded: ${axios.isAxiosError(error) ? error.response?.data?.message || error.message : "sentence service error"}.`;
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  if (selectedInmateId && ["overview", "profile", "profile-sentences"].includes(section)) return <InmateProfile key={`${selectedInmateId}-${section}`} inmateId={selectedInmateId} userRole={userRole} initialTab={section === "profile-sentences" ? "Sentences" : "Overview"} onBack={() => setSelectedInmateId(null)} />;
  if (section === "profile-sentences") return <SentenceInmatePicker records={records} loading={loading} error={censusLoadError ? notice : ""} onRetry={() => void loadInmates()} onSelect={setSelectedInmateId} />;
  return (
    <Box className="census-page">
      {!admissionOpen && <>
      {notice && section !== "admission" && (
        <Alert
          className="census-notice"
          severity={censusLoadError ? "error" : "success"}
          action={censusLoadError ? <Button color="inherit" size="small" onClick={() => void loadInmates()}>Retry</Button> : undefined}
          onClose={() => setNotice(null)}
        >
          {notice}
        </Alert>
      )}
      {!admissionOpen && <Box className="portal-heading">
        <Box className="portal-title-row">
          <Box>
          <Typography component="h1">{section === "admission" ? "Admission" : section === "profile-sentences" ? "Sentences" : section === "profile" ? "Profile" : "Overview"}</Typography>
          </Box>
        </Box>
      </Box>}
      {section !== "admission" && <>
      {section === "profile-sentences" && <Alert severity="info">Select an inmate from the table to open their Sentences.</Alert>}
      {section === "overview" && !censusLoadError && <Box className="census-metrics">
        <Metric
          label="Total inmate records"
          value={censusLoadError ? "—" : records.length.toLocaleString()}
          note={censusLoadError ? "Unavailable" : "Current census"}
          tone="blue"
        />
        <Metric label="On remand" value={loading ? "—" : records.filter((record) => record.inmateType === "REMAND").length.toLocaleString()} note="From inmate type" tone="blue" />
        <Metric label="Sentenced" value={loading ? "—" : records.filter((record) => record.inmateType === "SENTENCED").length.toLocaleString()} note="From inmate type" tone="blue" />
      </Box>}
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
          <Typography component="h2">{section === "profile" ? "Inmate profiles" : "Inmate Census Directory"}</Typography>
            <Typography>
              {section === "profile" ? "Choose an inmate to view their profile." : `${filtered.length} matching record${filtered.length === 1 ? "" : "s"} in the census.`}
            </Typography>
          </Box>
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
                <TableCell>Profile</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={8}>Loading inmate records...</TableCell></TableRow> : censusLoadError ? <TableRow><TableCell colSpan={8}>Inmate records are unavailable. Use Retry above after checking the API connection and your account access.</TableCell></TableRow> : !filtered.length ? <TableRow><TableCell colSpan={8}>No inmate records match these filters.</TableCell></TableRow> : filtered.map((record) => (
                <TableRow key={record.id} hover onClick={() => setSelectedInmateId(record.id)} sx={{ cursor: "pointer" }}>
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
                  <TableCell><Button size="small" onClick={(event) => { event.stopPropagation(); setSelectedInmateId(record.id); }}>View</Button></TableCell>
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
              <Button component="label" variant="outlined">Take or upload photo<input hidden type="file" accept="image/jpeg,image/png" capture="user" onChange={(event) => { const file = event.target.files?.[0] ?? null; if (file && !["image/jpeg", "image/png"].includes(file.type)) { setAdmissionError("Please choose a JPEG or PNG image."); return; } setAdmissionError(null); setAdmissionPhoto(file); }} /></Button>
              {admissionPhoto && <Typography variant="caption">Selected: {admissionPhoto.name}</Typography>}
              <TextField multiline minRows={2} inputProps={{ maxLength: 1000 }} label="Distinguishing features" placeholder="Tattoos, scars, birthmarks, build, hair, identifying marks" value={admission.appearance} onChange={(event) => setAdmission({ ...admission, appearance: event.target.value })} />
            </Box>
          </Box>
          <Box component="fieldset" className="admission-section">
            <legend>Cell allocation</legend>
            <Box className="admission-fields admission-placement-fields">
              {cells.length > 0 ? <TextField
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
                    {cell.name || cell.id} ({cell.availableSpaces} available)
                  </MenuItem>
                ))}
              </TextField> : <TextField required label="Cell ID" value={admission.cell} onChange={(event) => setAdmission({ ...admission, cell: event.target.value })} helperText={loadingCells ? "Loading cells…" : "Enter the cell identifier."} />}
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
    <Box className="portal-heading"><Box className="portal-title-row"><Box><Typography component="h1">Sentences</Typography></Box></Box></Box>
    {error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={onRetry}>Retry</Button>}>{error}</Alert>}
    <Paper className="directory max-w-3xl" elevation={0}>
      <Box className="directory-title"><Box><Typography component="h2">Select an inmate</Typography></Box></Box>
      <Box className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr]">
        <TextField label="Search name or ID" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Typography className="self-center text-sm text-slate-500">{loading ? "Loading inmates…" : `${matches.length} inmates`}</Typography>
      </Box>
      <Box className="max-h-[55vh] overflow-y-auto divide-y divide-slate-100">
        {!loading && !matches.length && <Typography className="p-5 text-sm text-slate-500">No inmates found.</Typography>}
        {matches.map((record) => <button key={record.id} onClick={() => onSelect(record.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e7eff4] text-xs font-bold text-[#28566f]">{initials(record.fullName)}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{record.fullName}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{record.id} · {record.inmateType} · {record.cellId || "No cell"}</span></span>
          <span className="text-xs font-semibold text-[#2876a8]">Open sentences →</span>
        </button>)}
      </Box>
    </Paper>
  </Box>;
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
