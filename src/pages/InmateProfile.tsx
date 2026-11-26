import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import type { Permission } from "../config/rbas";
import api from "../api/axiosClient";
import { collectionFrom, asRecord, fetchAllPages, itemFrom } from "../api/dataContract";
import { sentenceService } from "../api/sentenceService";
import { visitorService } from "../api/visitorService";
import { transferService } from "../api/transferService";
import { prisonService, type PrisonSummary } from "../api/prisonService";
import { inmateService, type Cell } from "../api/inmateService";

type Row = Record<string, unknown>;
type Tab =
  | "Overview"
  | "Sentences"
  | "Transfers"
  | "Visits"
  | "Medical"
  | "Cell allocations"
  | "Conduct"
  | "Rehabilitation";
type FormKind =
  | "sentence"
  | "remission"
  | "transfer"
  | "visit"
  | "medical"
  | "cell"
  | "incident"
  | "enrollment"
  | "attendance";
type Props = {
  inmateId: string;
  initialTab?: Tab;
  onBack: () => void;
};

const labels: Record<string, string> = {
  inmateType: "Custody type",
  firstName: "First name",
  lastName: "Last name",
  dateOfBirth: "Date of birth",
  admissionDate: "Admission date",
  bio: "Profile notes",
  expectedCourtDate: "Expected court date",
  nextOfKinName: "Next of kin",
  nextOfKinRelationship: "Relationship",
  nextOfKinPhone: "Next of kin phone",
  nextOfKinEmail: "Next of kin email",
  contactPhone: "Contact phone",
  contactEmail: "Contact email",
  prisonName: "Station",
  cellId: "Cell",
};
const field = (row: Row, key: string) =>
  row[key] ??
  row[key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)];
const shown = (value: unknown) => {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "object" && !Array.isArray(value)) {
    const item = asRecord(value);
    return String(item.fullName ?? item.name ?? item.username ?? "—");
  }
  return String(value);
};
const dateLabel = (value: unknown) => {
  if (typeof value !== "string" || !value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
};
const errorMessage = (reason: unknown) => {
  if (typeof reason === "object" && reason && "response" in reason) {
    const response = (reason as { response?: { data?: { message?: string } } })
      .response;
    if (response?.data?.message) return response.data.message;
  }
  return reason instanceof Error
    ? reason.message
    : "The request could not be completed.";
};

export default function InmateProfile({
  inmateId,
  initialTab = "Overview",
  onBack,
}: Props) {
  const { can, canAny } = useAuth();
  const canReadInmates = can("inmates:read");
  const canReadPhoto = can("inmates:photo:read");
  const canLogConduct = can("incidents:create");
  const canManagePrograms = can("programs:enroll");
  const canRecordAttendance = can("attendance:record");
  const canInitiateTransfer = can("transfers:create");
  const canRecordFamilyVisit = can("visits:create:family");
  const canRecordLegalVisit = can("visits:create:legal");
  const canRecordVisit = canAny(["visits:create:family", "visits:create:legal"]);
  const canRecordMedical = can("visits:create:health");
  const canAllocateCell = can("cells:allocate");
  const allowedVisitTypes = [
    ...(canRecordFamilyVisit ? ["FAMILY" as const] : []),
    ...(canRecordLegalVisit ? ["LEGAL" as const] : []),
  ];
  const tabPermissions: [Tab, Permission[]][] = [
    ["Sentences", ["sentences:manage"]],
    ["Transfers", ["transfers:read"]],
    ["Visits", ["visits:read"]],
    ["Medical", ["visits:read"]],
    ["Cell allocations", ["cells:read"]],
    ["Conduct", ["incidents:read"]],
    ["Rehabilitation", ["programs:read"]],
  ];
  const visibleTabs: Tab[] = [
    "Overview",
    ...tabPermissions
      .filter(([, permissions]) => canAny(permissions))
      .map(([name]) => name),
  ];
  const [tab, setTab] = useState<Tab>(
    visibleTabs.includes(initialTab) ? initialTab : "Overview",
  );
  const [record, setRecord] = useState<Row>({});
  const [sentences, setSentences] = useState<Row[]>([]);
  const [transferRows, setTransferRows] = useState<Row[]>([]);
  const [visitRows, setVisitRows] = useState<Row[]>([]);
  const [medicalRows, setMedicalRows] = useState<Row[]>([]);
  const [cellRecord, setCellRecord] = useState<Row>({});
  const [incidents, setIncidents] = useState<Row[]>([]);
  const [programs, setPrograms] = useState<Row[]>([]);
  const [enrollments, setEnrollments] = useState<Row[]>([]);
  const [attendance, setAttendance] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [formKind, setFormKind] = useState<FormKind | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState("");
  const [revision, setRevision] = useState(0);
  const [prisons, setPrisons] = useState<PrisonSummary[]>([]);
  const [availableCells, setAvailableCells] = useState<Cell[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!canReadInmates) {
        setError("Your role does not have permission to view inmate records.");
        setLoading(false);
        return;
      }
      if (active) {
        setError("");
        setNotice("");
        setLoading(true);
      }
      try {
        const inmateResponse = await api.get(
          `/inmates/${encodeURIComponent(inmateId)}`,
        );
        const inmateRecord = asRecord(itemFrom(inmateResponse.data));
        if (active) setRecord(inmateRecord);

        if (tab === "Transfers" && canReadPhoto) {
          try {
            const image = await api.get(
              `/inmates/${encodeURIComponent(inmateId)}/photo`,
              { responseType: "blob" },
            );
            if (active) setPhoto(URL.createObjectURL(image.data));
          } catch {
            /* Inmates may not have a photo. */
          }
        }

        if (tab === "Overview" && canReadPhoto) {
          try {
            const image = await api.get(
              `/inmates/${encodeURIComponent(inmateId)}/photo`,
              { responseType: "blob" },
            );
            if (active) setPhoto(URL.createObjectURL(image.data));
          } catch {
            /* Inmates may not have a photo. */
          }
        } else if (tab === "Sentences") {
          const rows = await sentenceService.listForInmate(inmateId);
          if (active) setSentences(rows);
        } else if (tab === "Transfers") {
          const [rows, prisonPage] = await Promise.all([
            fetchAllPages<unknown>((page) =>
              api.get("/transfers", { params: { page, size: 100 } }).then(({ data }) => data),
            ),
            prisonService.getPrisons(0, "", "active", 100),
          ]);
          if (active) setPrisons(prisonPage.records);
          if (active)
            setTransferRows(
              rows.map(asRecord)
                .filter((row) => String(field(row, "inmateId")) === inmateId),
            );
        } else if (tab === "Visits") {
          const visits = await visitorService.getInmateVisitHistory(inmateId);
          if (active) setVisitRows(visits.map((visit) => ({
            ...visit,
            visitDate: visit.date,
            visitor: visit.name,
            startDateTime: visit.time,
            endDateTime: visit.endTime,
          })));
        } else if (tab === "Medical") {
          const visits = await visitorService.getInmateVisitHistory(inmateId);
          if (active) setMedicalRows(visits.filter((visit) => visit.visitType === "HEALTH").map((visit) => ({ ...visit, visitDate: visit.date })));
        } else if (tab === "Cell allocations") {
          const cellId = String(field(inmateRecord, "cellId") ?? "");
          const [cellResult, cellsResult] = await Promise.all([
            cellId ? api.get(`/cells/${encodeURIComponent(cellId)}`).then(({ data }) => asRecord(itemFrom(data))) : Promise.resolve({}),
            inmateService.getCells({ prisonId: String(field(inmateRecord, "prisonId") ?? "") || undefined }),
          ]);
          if (active) {
            setCellRecord(cellResult);
            setAvailableCells(cellsResult.filter((cell) => cell.availableSpaces > 0));
          }
        } else if (tab === "Conduct") {
          const { data } = await api.get(
            `/inmates/${encodeURIComponent(inmateId)}/incidents`,
          );
          if (active) setIncidents(collectionFrom(data).map(asRecord));
        } else {
          const [programResult, enrollmentResult, attendanceResult] =
            await Promise.all([
              api.get("/programs", { params: { page: 0, size: 100 } }),
              api.get("/programs/enrollments", {
                params: { inmateId, page: 0, size: 100 },
              }),
              api.get("/programs/attendance", {
                params: { inmateId, page: 0, size: 100 },
              }),
            ]);
          if (active) {
            setPrograms(collectionFrom(programResult.data).map(asRecord));
            setEnrollments(collectionFrom(enrollmentResult.data).map(asRecord));
            setAttendance(collectionFrom(attendanceResult.data).map(asRecord));
          }
        }
      } catch (reason) {
        if (active) setError(errorMessage(reason));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [tab, inmateId, revision, canReadInmates, canReadPhoto]);

  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo);
    },
    [photo],
  );

  const inmateName =
    [field(record, "firstName"), field(record, "lastName")]
      .filter(Boolean)
      .join(" ") || "Inmate profile";
  const openForm = (kind: FormKind, sentenceId?: string) => {
    const allowed =
      kind === "sentence" || kind === "remission"
        ? can("sentences:manage")
        : kind === "transfer"
          ? can("transfers:create")
          : kind === "visit"
            ? canRecordVisit
            : kind === "medical"
              ? canRecordMedical
              : kind === "cell"
                ? canAllocateCell
                : kind === "incident"
                  ? canLogConduct
                  : kind === "enrollment"
                    ? canManagePrograms
                    : canRecordAttendance;
    if (!allowed) {
      setError("Your role does not have permission to perform this action.");
      return;
    }
    setError("");
    setForm({
      kind,
      ...(sentenceId ? { sentenceId } : {}),
      ...(kind === "attendance" ? { attendanceStatus: "present" } : {}),
      ...(kind === "visit" ? { visitType: allowedVisitTypes[0] ?? "FAMILY", visitDate: new Date().toISOString().slice(0, 10) } : {}),
      ...(kind === "medical" ? { visitDate: new Date().toISOString().slice(0, 10) } : {}),
    });
    setFormKind(kind);
  };

  const saveProfile = async () => {
    if (!can("inmates:manage")) {
      setError("Your role does not have permission to edit inmate records.");
      return;
    }
    const keys = ["firstName", "lastName", "dateOfBirth", "admissionDate"];
    const payload = Object.fromEntries(
      keys
        .filter((key) => form[key] !== undefined)
        .map((key) => [key, form[key]]),
    );
    try {
      const { data } = await api.patch(
        `/inmates/${encodeURIComponent(inmateId)}`,
        payload,
      );
      setRecord(asRecord(itemFrom(data)));
      setEditing(false);
      setNotice("Profile updated.");
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };

  const saveSentenceAction = async () => {
    setError("");
    setNotice("");
    const allowed =
      formKind === "sentence" || formKind === "remission"
        ? can("sentences:manage")
        : formKind === "transfer"
          ? can("transfers:create")
          : formKind === "visit"
            ? can(form.visitType === "LEGAL" ? "visits:create:legal" : "visits:create:family")
            : formKind === "medical"
              ? can("visits:create:health")
              : formKind === "cell"
                ? can("cells:allocate")
                : formKind === "incident"
                  ? can("incidents:create")
                  : formKind === "enrollment"
                    ? can("programs:enroll")
                    : formKind === "attendance" && can("attendance:record");
    if (!formKind || !allowed) {
      setError("Your role does not have permission to perform this action.");
      return;
    }
    const offenceText = [
      form.offenceCategory === "Other"
        ? form.offenceOther?.trim()
        : form.offenceCategory,
      form.crimeDescription?.trim(),
    ]
      .filter(Boolean)
      .join(" — ");
    const required =
      formKind === "sentence"
        ? [
            form.offenceCategory,
            form.crimeDescription,
            form.sentenceType,
            form.startDate,
          ]
        : formKind === "remission"
          ? [
              form.sentenceId,
              form.remissionPercentage,
              form.effectiveDate,
              form.reason,
            ]
          : formKind === "transfer"
            ? [form.destinationPrisonId, form.reason]
            : formKind === "visit"
              ? [
                  form.visitType === "LEGAL"
                    ? form.legalCaseNumber
                    : form.visitorFullName,
                  form.visitDate,
                  form.startTime,
                  form.endTime,
                ]
              : formKind === "medical"
                ? [form.visitDate, form.startTime, form.endTime, form.sickness, form.diagnosis]
                : formKind === "cell"
                  ? [form.cellId]
            : formKind === "incident"
              ? [form.incidentDate, form.description]
              : formKind === "enrollment"
                ? [form.programId, form.enrollmentDate]
                : [form.programId, form.sessionDate, form.attendanceStatus];
    if (required.some((value) => !String(value ?? "").trim())) {
      setError("Complete the required fields.");
      return;
    }
    if (
      formKind === "sentence" &&
      form.offenceCategory === "Other" &&
      !form.offenceOther?.trim()
    ) {
      setError("Enter the offence category.");
      return;
    }
    if (formKind === "sentence" && offenceText.length > 500) {
      setError("Offence must be 500 characters or fewer.");
      return;
    }
    if (
      formKind === "remission" &&
      (Number(form.remissionPercentage) < 0.01 ||
        Number(form.remissionPercentage) > 100)
    ) {
      setError("Remission must be between 0.01% and 100%.");
      return;
    }
    if (
      formKind === "incident" &&
      (form.description.trim().length === 0 ||
        form.roleInIncident?.length > 255 ||
        form.outcome?.length > 255)
    ) {
      setError(
        "Check the incident details and keep the role and outcome within 255 characters.",
      );
      return;
    }
    try {
      if (formKind === "sentence") {
        await api.post("/sentences", {
          inmateId,
          offence: offenceText,
          sentenceType: form.sentenceType,
          startDate: form.startDate,
          ...(form.endDate ? { endDate: form.endDate } : {}),
        });
        setNotice("Sentence recorded.");
      } else if (formKind === "transfer") {
        await transferService.createTransfer({
          inmateId,
          destinationPrisonId: form.destinationPrisonId,
          reason: form.reason.trim(),
        });
        setNotice("Transfer request submitted.");
      } else if (formKind === "visit") {
        if (form.endTime <= form.startTime) {
          setError("The visit end time must be later than its start time.");
          return;
        }
        if (form.visitType === "LEGAL") {
          await visitorService.registerLegalVisit({
            inmateId,
            visitDate: form.visitDate,
            startTime: form.startTime,
            endTime: form.endTime,
            legalCaseNumber: form.legalCaseNumber.trim(),
            ...(form.legalRepresentative?.trim() ? { legalRepresentative: form.legalRepresentative.trim() } : {}),
          });
        } else {
          await visitorService.registerVisitor({
            inmateId,
            visitorFullName: form.visitorFullName.trim(),
            visitDate: form.visitDate,
            startTime: form.startTime,
            endTime: form.endTime,
            ...(form.itemsBrought?.trim() ? { itemsBrought: form.itemsBrought.trim() } : {}),
          });
        }
        setNotice("Visit recorded.");
      } else if (formKind === "medical") {
        if (form.endTime <= form.startTime) {
          setError("The medical visit end time must be later than its start time.");
          return;
        }
        await visitorService.registerMedicalVisit({
          inmateId,
          visitDate: form.visitDate,
          startTime: form.startTime,
          endTime: form.endTime,
          sickness: form.sickness.trim(),
          diagnosis: form.diagnosis.trim(),
          ...(form.medicationsProvided?.trim() ? { medicationsProvided: form.medicationsProvided.trim() } : {}),
          ...(form.recommendations?.trim() ? { recommendations: form.recommendations.trim() } : {}),
        });
        setNotice("Medical visit recorded.");
      } else if (formKind === "cell") {
        await inmateService.allocateCell(inmateId, form.cellId);
        setNotice("Cell allocation updated.");
      } else if (formKind === "remission") {
        await sentenceService.addRemission(form.sentenceId, {
          remissionPercentage: Number(form.remissionPercentage),
          effectiveDate: form.effectiveDate,
          reason: form.reason?.trim() ?? "",
        });
        setNotice("Remission recorded.");
      } else if (formKind === "incident") {
        await api.post("/incidents", {
          participants: [
            {
              inmateId,
              ...(form.roleInIncident?.trim()
                ? { roleInIncident: form.roleInIncident.trim() }
                : {}),
            },
          ],
          incidentDate: form.incidentDate,
          description: form.description?.trim(),
          ...(form.outcome?.trim() ? { outcome: form.outcome.trim() } : {}),
        });
        setNotice("Conduct record added.");
      } else if (formKind === "enrollment") {
        await api.post("/programs/enrollments", {
          inmateId,
          programId: form.programId,
          enrollmentDate: form.enrollmentDate,
        });
        setNotice("Program enrollment added.");
      } else if (formKind === "attendance") {
        await api.post("/programs/attendance", {
          inmateId,
          programId: form.programId,
          sessionDate: form.sessionDate,
          attendanceStatus: form.attendanceStatus,
          ...(form.remarks?.trim() ? { remarks: form.remarks.trim() } : {}),
        });
        setNotice("Attendance recorded.");
      }
      setFormKind(null);
      setForm({});
      setRevision((current) => current + 1);
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };

  if (!canReadInmates) {
    return (
      <section role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Your role does not have permission to view inmate records.
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1440px] space-y-5">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#35657b] hover:text-[#123c55]"
      >
        ← <span>Back to inmate list</span>
      </button>
      <header className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
        {photo ? (
          <img
            src={photo}
            alt={`Photo of ${inmateName}`}
            className="size-16 rounded-xl object-cover"
          />
        ) : (
          <div className="grid size-16 place-items-center rounded-xl bg-[#e7eff4] text-lg font-bold text-[#28566f]">
            {inmateName
              .split(" ")
              .map((part) => part[0])
              .slice(0, 2)
              .join("")}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold text-[#162d40]">
            {inmateName}
          </h1>
        </div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold capitalize text-slate-600">
          {shown(field(record, "inmateType"))}
        </span>
      </header>

      <nav
        role="tablist"
        className="inmate-profile-tabs flex max-w-full flex-wrap gap-3 overflow-x-auto py-1"
        aria-label="Inmate profile tabs"
      >
        {visibleTabs.map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={tab === name}
            onClick={() => {
              setFormKind(null);
              setTab(name);
            }}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#168c91] focus-visible:ring-offset-2 ${tab === name ? "border-[#123c55] bg-[#123c55] text-white shadow-md" : "border-slate-200 bg-white text-slate-600 shadow-sm hover:border-[#168c91] hover:bg-[#f3fbfb] hover:text-[#123c55]"}`}
          >
            <span aria-hidden="true" className={`size-2 rounded-full ${tab === name ? "bg-[#69d2ca]" : "bg-slate-300"}`} />
            {name}
          </button>
        ))}
      </nav>
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {notice}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          Loading…
        </div>
      ) : tab === "Overview" ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">
              Personal and custody details
            </h2>
            {can("inmates:manage") &&
              !editing && (
                <button
                  onClick={() => {
                    setForm(
                      Object.fromEntries(
                        [
                          "firstName",
                          "lastName",
                          "dateOfBirth",
                          "admissionDate",
                        ].map((key) => [key, String(field(record, key) ?? "")]),
                      ),
                    );
                    setEditing(true);
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  Edit
                </button>
              )}
          </div>
          {editing ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {["firstName", "lastName", "dateOfBirth", "admissionDate"].map(
                (key) => (
                  <label
                    className="grid gap-1 text-xs font-medium text-slate-600"
                    key={key}
                  >
                    {labels[key]}
                    <input
                      type={
                        key.toLowerCase().includes("date") ? "date" : "text"
                      }
                      value={form[key] ?? ""}
                      onChange={(event) =>
                        setForm({ ...form, [key]: event.target.value })
                      }
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800"
                    />{" "}
                  </label>
                ),
              )}
              <div className="flex items-end gap-2">
                <button
                  onClick={() => void saveProfile()}
                  className="rounded-md bg-[#123c55] px-4 py-2 text-xs font-semibold text-white"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <dl className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
              {[
                "inmateType",
                "firstName",
                "lastName",
                "dateOfBirth",
                "admissionDate",
                "bio",
                "expectedCourtDate",
                "nextOfKinName",
                "nextOfKinRelationship",
                "nextOfKinPhone",
                "nextOfKinEmail",
                "contactPhone",
                "contactEmail",
                "prisonName",
                "cellId",
              ].map((key) => (
                <div key={key} className="border-b border-slate-100 py-3">
                  <dt className="text-[11px] font-medium text-slate-500">
                    {labels[key] ?? key}
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-slate-800">
                    {shown(field(record, key))}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      ) : tab === "Sentences" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-800">
              Sentence records
            </h2>
            {can("sentences:manage") && (
              <button
                onClick={() => openForm("sentence")}
                className="rounded-lg bg-[#123c55] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1e607a]"
              >
                Record sentence
              </button>
            )}
          </div>
          {formKind && (
            <ProfileActionForm
              kind={formKind}
              form={form}
              programs={[]}
              onChange={setForm}
              onCancel={() => setFormKind(null)}
              onSave={() => void saveSentenceAction()}
            />
          )}
          {!sentences.length ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              No sentence records.
            </div>
          ) : (
            sentences.map((sentence) => {
              const id = String(field(sentence, "id") ?? "");
              const offenceValue = shown(field(sentence, "offence"));
              const [offence, embeddedDescription] = offenceValue.split(" — ", 2);
              const crimeDescription = shown(field(sentence, "crimeDescription") ?? embeddedDescription);
              return (
                <article
                  key={id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Offence</p>
                      <h3 className="mt-1 text-base font-semibold text-slate-800">{offence}</h3>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{shown(field(sentence, "status"))}</span>
                  </div>
                  <dl className="grid gap-3 px-5 py-4 sm:grid-cols-3">
                    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Sentence type</dt>
                      <dd className="mt-1 text-sm font-semibold capitalize text-slate-700">{shown(field(sentence, "sentenceType")).replace(/_/g, " ")}</dd>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Start date</dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-700">{dateLabel(field(sentence, "startDate"))}</dd>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">End date</dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-700">{field(sentence, "endDate") ? dateLabel(field(sentence, "endDate")) : "Not set"}</dd>
                    </div>
                  </dl>
                  <div className="mx-5 mb-4 rounded-lg border border-slate-100 px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Crime description</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{crimeDescription === "—" ? "No separate description recorded." : crimeDescription}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-100 bg-slate-50/70 px-5 py-3">
                    <span className="text-xs font-semibold text-slate-600">Sentence actions</span>
                    <div className="flex flex-wrap gap-2">
                      {can("sentences:manage") && <button onClick={() => openForm("remission", id)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Add remission</button>}
                    </div>
                  </div>
                  <div className="grid gap-3 p-4 md:grid-cols-2">
                    <Remissions sentenceId={id} revision={revision} />
                  </div>
                </article>
              );
            })
          )}
        </section>
      ) : tab === "Transfers" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-800">Transfer history</h2>
            {canInitiateTransfer && <button onClick={() => openForm("transfer")} className="rounded-lg bg-[#123c55] px-3.5 py-2 text-xs font-semibold text-white">Initiate transfer</button>}
          </div>
          {formKind === "transfer" && <ProfileActionForm kind="transfer" form={form} programs={[]} prisons={prisons} currentPrisonId={String(field(record, "prisonId") ?? "")} onChange={setForm} onCancel={() => setFormKind(null)} onSave={() => void saveSentenceAction()} />}
          <HistoryList title="Transfer history" rows={transferRows} fields={[["Date", "requestedAt"], ["From", "sourcePrisonName"], ["To", "destinationPrisonName"], ["Status", "status"], ["Reason", "reason"]]} />
        </section>
      ) : tab === "Visits" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-800">Visit history</h2>
            {canRecordVisit && <button onClick={() => openForm("visit")} className="rounded-lg bg-[#123c55] px-3.5 py-2 text-xs font-semibold text-white">Record visit</button>}
          </div>
          {formKind === "visit" && <ProfileActionForm kind="visit" form={form} programs={[]} allowedVisitTypes={allowedVisitTypes} onChange={setForm} onCancel={() => setFormKind(null)} onSave={() => void saveSentenceAction()} />}
          <HistoryList title="Visit history" rows={visitRows} fields={[["Date", "visitDate"], ["Type", "visitType"], ["Visitor", "name"], ["Start", "time"], ["End", "endTime"], ["Items brought", "itemsBrought"], ["Legal representative", "legalRepresentative"]]} />
        </section>
      ) : tab === "Medical" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-800">Medical history</h2>
            {canRecordMedical && <button onClick={() => openForm("medical")} className="rounded-lg bg-[#123c55] px-3.5 py-2 text-xs font-semibold text-white">Record medical visit</button>}
          </div>
          {formKind === "medical" && <ProfileActionForm kind="medical" form={form} programs={[]} onChange={setForm} onCancel={() => setFormKind(null)} onSave={() => void saveSentenceAction()} />}
          <HistoryList title="Medical history" rows={medicalRows} fields={[["Date", "visitDate"], ["Sickness", "sickness"], ["Diagnosis", "diagnosis"], ["Medication", "medicationsProvided"], ["Recommendations", "recommendations"]]} />
        </section>
      ) : tab === "Cell allocations" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-800">Cell allocation</h2>
            {canAllocateCell && <button onClick={() => openForm("cell")} className="rounded-lg bg-[#123c55] px-3.5 py-2 text-xs font-semibold text-white">Change cell</button>}
          </div>
          {formKind === "cell" && <ProfileActionForm kind="cell" form={form} programs={[]} cells={availableCells} onChange={setForm} onCancel={() => setFormKind(null)} onSave={() => void saveSentenceAction()} />}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-800">Current cell</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              ["Cell", "name"],
              ["Block", "blockName"],
              ["Capacity", "capacity"],
              ["Occupied", "currentOccupancy"],
              ["Available", "availableSpaces"],
            ].map(([label, key]) => (
              <div key={key}>
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="mt-1 text-sm font-medium text-slate-800">
                  {shown(field(cellRecord, key))}
                </dd>
              </div>
            ))}
          </dl>
          </div>
        </section>
      ) : tab === "Conduct" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-800">
              Conduct history
            </h2>
            {canLogConduct && (
              <button
                onClick={() => openForm("incident")}
                className="rounded-lg bg-[#123c55] px-3.5 py-2 text-xs font-semibold text-white"
              >
                Log incident
              </button>
            )}
          </div>
          {formKind === "incident" && (
            <ProfileActionForm
              kind="incident"
              form={form}
              programs={programs}
              onChange={setForm}
              onCancel={() => setFormKind(null)}
              onSave={() => void saveSentenceAction()}
            />
          )}
          {!incidents.length ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              No conduct records.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Incident</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {incidents.map((incident) => (
                    <tr key={String(field(incident, "id"))}>
                      <td className="px-4 py-3">
                        {dateLabel(field(incident, "incidentDate"))}
                      </td>
                      <td className="px-4 py-3">
                        {shown(field(incident, "description"))}
                      </td>
                      <td className="px-4 py-3">
                        {shown(field(incident, "roleInIncident"))}
                      </td>
                      <td className="px-4 py-3">
                        {shown(field(incident, "status"))}
                      </td>
                      <td className="px-4 py-3">
                        {shown(field(incident, "outcome"))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-800">
              Rehabilitation
            </h2>
            <div className="flex gap-2">
              {canManagePrograms && (
                <button
                  onClick={() => openForm("enrollment")}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  Enroll in program
                </button>
              )}
              {canRecordAttendance && (
                <button
                  onClick={() => openForm("attendance")}
                  className="rounded-lg bg-[#123c55] px-3 py-2 text-xs font-semibold text-white"
                >
                  Record attendance
                </button>
              )}
            </div>
          </div>
          {(formKind === "enrollment" || formKind === "attendance") && (
            <ProfileActionForm
              kind={formKind}
              form={form}
              programs={programs.filter(
                (program) =>
                  formKind !== "attendance" ||
                  enrollments.some(
                    (enrollment) =>
                      String(field(enrollment, "programId")) ===
                      String(field(program, "id")),
                  ),
              )}
              onChange={setForm}
              onCancel={() => setFormKind(null)}
              onSave={() => void saveSentenceAction()}
            />
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="font-semibold text-slate-800">
                Program enrollments
              </h3>
              {enrollments.length ? (
                <div className="mt-3 space-y-2">
                  {enrollments.map((enrollment) => (
                    <div
                      key={String(field(enrollment, "id"))}
                      className="border-t border-slate-100 pt-2 text-sm"
                    >
                      <p className="font-medium text-slate-700">
                        {shown(field(enrollment, "programName"))}
                      </p>
                      <p className="text-xs text-slate-500">
                        {dateLabel(field(enrollment, "enrollmentDate"))} ·{" "}
                        {shown(field(enrollment, "status"))}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  No program enrollments.
                </p>
              )}
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="font-semibold text-slate-800">Attendance</h3>
              {attendance.length ? (
                <div className="mt-3 space-y-2">
                  {attendance.map((entry) => {
                    const enrollment = enrollments.find(
                      (row) =>
                        String(field(row, "id")) ===
                        String(field(entry, "enrollmentId")),
                    );
                    return (
                      <div
                        key={String(field(entry, "id"))}
                        className="border-t border-slate-100 pt-2 text-sm"
                      >
                        <p className="font-medium text-slate-700">
                          {shown(field(enrollment ?? {}, "programName"))} ·{" "}
                          {shown(field(entry, "attendanceStatus"))}
                        </p>
                        <p className="text-xs text-slate-500">
                          {dateLabel(field(entry, "sessionDate"))}
                          {field(entry, "remarks")
                            ? ` · ${shown(field(entry, "remarks"))}`
                            : ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  No attendance recorded.
                </p>
              )}
            </section>
          </div>
          {!programs.length && (
            <p className="text-xs text-slate-500">
              No rehabilitation programs are available.
            </p>
          )}
        </section>
      )}
    </section>
  );
}

function Remissions({
  sentenceId,
  revision,
}: {
  sentenceId: string;
  revision: number;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    sentenceService
      .listRemissions(sentenceId)
      .then((data) => active && setRows(data))
      .catch((reason) => active && setError(errorMessage(reason)));
    return () => {
      active = false;
    };
  }, [sentenceId, revision]);
  return (
    <section className="rounded-lg border border-slate-200 p-3">
      <h4 className="text-sm font-semibold text-slate-700">Remissions ({rows.length})</h4>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-rose-700">{error}</p>
      ) : rows.length ? (
        <div className="mt-2 space-y-2">
          {rows.map((row) => (
            <div
              key={String(field(row, "id"))}
              className="border-t border-slate-100 pt-2 text-xs text-slate-600"
            >
              <strong>{shown(field(row, "remissionPercentage"))}%</strong> ·{" "}
              {dateLabel(field(row, "effectiveDate"))}
              <p className="mt-1">{shown(field(row, "reason"))}</p>
              {Boolean(field(row, "projectedReleaseDate")) && (
                <p>
                  Projected release:{" "}
                  {dateLabel(field(row, "projectedReleaseDate"))}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-500">No remissions recorded.</p>
      )}
    </section>
  );
}

function HistoryList({
  title,
  rows,
  fields,
}: {
  title: string;
  rows: Row[];
  fields: [string, string][];
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-semibold text-slate-800">{title}</h2>
      </div>
      {!rows.length ? (
        <p className="p-5 text-sm text-slate-500">No records.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                {fields.map(([label]) => (
                  <th key={label} className="px-4 py-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={String(field(row, "id") ?? index)}>
                  {fields.map(([, key]) => (
                    <td key={key} className="px-4 py-3 text-slate-700">
                      {key.toLowerCase().includes("date") ||
                      key.toLowerCase().includes("at")
                        ? dateLabel(field(row, key))
                        : shown(field(row, key))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ProfileActionForm({
  kind,
  form,
  programs,
  allowedVisitTypes = ["FAMILY", "LEGAL"],
  prisons = [],
  cells = [],
  currentPrisonId = "",
  onChange,
  onCancel,
  onSave,
}: {
  kind: FormKind;
  form: Record<string, string>;
  programs: Row[];
  allowedVisitTypes?: ("FAMILY" | "LEGAL")[];
  prisons?: PrisonSummary[];
  cells?: Cell[];
  currentPrisonId?: string;
  onChange: (form: Record<string, string>) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const change = (key: string, value: string) =>
    onChange({ ...form, [key]: value });
  const title =
    kind === "sentence"
      ? "Record sentence"
      : kind === "remission"
        ? "Add remission"
      : kind === "transfer"
          ? "Initiate transfer"
          : kind === "visit"
            ? "Record visit"
            : kind === "medical"
              ? "Record medical visit"
              : kind === "cell"
                ? "Change cell allocation"
        : kind === "incident"
            ? "Log incident"
            : kind === "enrollment"
              ? "Enroll in program"
              : "Record attendance";
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 font-semibold text-slate-800">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {kind === "transfer" && <>
          <label className="grid gap-1 text-xs font-medium text-slate-600 sm:col-span-2">Destination prison
            <select required value={form.destinationPrisonId ?? ""} onChange={(event) => change("destinationPrisonId", event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">Choose a destination</option>{prisons.filter((prison) => prison.id !== currentPrisonId).map((prison) => <option key={prison.id} value={prison.id}>{prison.name}{prison.location ? ` · ${prison.location}` : ""}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-600 sm:col-span-2">Transfer reason
            <textarea required maxLength={2000} value={form.reason ?? ""} onChange={(event) => change("reason", event.target.value)} className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>
        </>}
        {kind === "visit" && <>
          <label className="grid gap-1 text-xs font-medium text-slate-600">Visit type
            <select value={form.visitType ?? allowedVisitTypes[0] ?? "FAMILY"} onChange={(event) => change("visitType", event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">{allowedVisitTypes.map((type) => <option key={type} value={type}>{type === "FAMILY" ? "Family or friends" : "Legal representative"}</option>)}</select>
          </label>
          {form.visitType === "LEGAL" ? <>
            <label className="grid gap-1 text-xs font-medium text-slate-600">Legal case number<input required maxLength={255} value={form.legalCaseNumber ?? ""} onChange={(event) => change("legalCaseNumber", event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">Legal representative<input maxLength={255} value={form.legalRepresentative ?? ""} onChange={(event) => change("legalRepresentative", event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
          </> : <label className="grid gap-1 text-xs font-medium text-slate-600">Visitor full name<input required maxLength={255} value={form.visitorFullName ?? ""} onChange={(event) => change("visitorFullName", event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>}
          <label className="grid gap-1 text-xs font-medium text-slate-600">Visit date<input required type="date" value={form.visitDate ?? ""} onChange={(event) => change("visitDate", event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="grid gap-1 text-xs font-medium text-slate-600">Start time<input required type="time" value={form.startTime ?? ""} onChange={(event) => change("startTime", event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="grid gap-1 text-xs font-medium text-slate-600">End time<input required type="time" value={form.endTime ?? ""} onChange={(event) => change("endTime", event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
          {form.visitType !== "LEGAL" && <label className="grid gap-1 text-xs font-medium text-slate-600 sm:col-span-2">Items brought (optional)<textarea maxLength={1000} value={form.itemsBrought ?? ""} onChange={(event) => change("itemsBrought", event.target.value)} className="min-h-16 rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>}
        </>}
        {kind === "medical" && <>
          <label className="grid gap-1 text-xs font-medium text-slate-600">Visit date<input required type="date" value={form.visitDate ?? ""} onChange={(event) => change("visitDate", event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="grid gap-1 text-xs font-medium text-slate-600">Start time<input required type="time" value={form.startTime ?? ""} onChange={(event) => change("startTime", event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="grid gap-1 text-xs font-medium text-slate-600">End time<input required type="time" value={form.endTime ?? ""} onChange={(event) => change("endTime", event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="grid gap-1 text-xs font-medium text-slate-600">Sickness / complaint<input required maxLength={10000} value={form.sickness ?? ""} onChange={(event) => change("sickness", event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="grid gap-1 text-xs font-medium text-slate-600 sm:col-span-2">Diagnosis<textarea required maxLength={10000} value={form.diagnosis ?? ""} onChange={(event) => change("diagnosis", event.target.value)} className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="grid gap-1 text-xs font-medium text-slate-600">Medication provided<textarea maxLength={10000} value={form.medicationsProvided ?? ""} onChange={(event) => change("medicationsProvided", event.target.value)} className="min-h-16 rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="grid gap-1 text-xs font-medium text-slate-600">Recommendations<textarea maxLength={10000} value={form.recommendations ?? ""} onChange={(event) => change("recommendations", event.target.value)} className="min-h-16 rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
        </>}
        {kind === "cell" && <label className="grid gap-1 text-xs font-medium text-slate-600 sm:col-span-2">Available cell
          <select required value={form.cellId ?? ""} onChange={(event) => change("cellId", event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm"><option value="">Choose a cell</option>{cells.map((cell) => <option key={cell.id} value={cell.id}>{cell.blockName} · {cell.name} ({cell.availableSpaces} available)</option>)}</select>
        </label>}
        {kind === "sentence" && (
          <>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Offence category
              <select
                required
                value={form.offenceCategory ?? ""}
                onChange={(event) =>
                  change("offenceCategory", event.target.value)
                }
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select offence</option>
                {[
                  "Murder",
                  "Theft",
                  "Robbery",
                  "Assault",
                  "Fraud",
                  "Drug offence",
                  "Sexual offence",
                  "Other",
                ].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            {form.offenceCategory === "Other" && (
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                Other offence category
                <input
                  required
                  maxLength={300}
                  value={form.offenceOther ?? ""}
                  onChange={(event) =>
                    change("offenceOther", event.target.value)
                  }
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            )}
            <label className="grid gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
              Crime description
              <textarea
                required
                maxLength={450}
                value={form.crimeDescription ?? ""}
                onChange={(event) =>
                  change("crimeDescription", event.target.value)
                }
                className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Sentence type
              <select
                required
                value={form.sentenceType ?? "FIXED_TERM"}
                onChange={(event) => change("sentenceType", event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="FIXED_TERM">Fixed term</option>
                <option value="LIFE">Life</option>
                <option value="UNDETERMINED">Undetermined</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Start date
              <input
                required
                type="date"
                value={form.startDate ?? ""}
                onChange={(event) => change("startDate", event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            {form.sentenceType === "FIXED_TERM" && (
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                End date (optional)
                <input
                  type="date"
                  value={form.endDate ?? ""}
                  onChange={(event) => change("endDate", event.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            )}
          </>
        )}
        {kind === "remission" && (
          <>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Remission (%)
              <input
                required
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                value={form.remissionPercentage ?? ""}
                onChange={(event) =>
                  change("remissionPercentage", event.target.value)
                }
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Effective date
              <input
                required
                type="date"
                value={form.effectiveDate ?? ""}
                onChange={(event) =>
                  change("effectiveDate", event.target.value)
                }
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
              Reason
              <textarea
                required
                value={form.reason ?? ""}
                onChange={(event) => change("reason", event.target.value)}
                className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </>
        )}
        {kind === "incident" && (
          <>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Incident date
              <input
                required
                type="date"
                value={form.incidentDate ?? ""}
                onChange={(event) => change("incidentDate", event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Role in incident
              <input
                maxLength={255}
                value={form.roleInIncident ?? ""}
                onChange={(event) =>
                  change("roleInIncident", event.target.value)
                }
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
              Incident description
              <textarea
                required
                value={form.description ?? ""}
                onChange={(event) => change("description", event.target.value)}
                className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
              Outcome (optional)
              <textarea
                maxLength={255}
                value={form.outcome ?? ""}
                onChange={(event) => change("outcome", event.target.value)}
                className="min-h-16 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </>
        )}
        {(kind === "enrollment" || kind === "attendance") && (
          <>
            <label className="grid gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
              Program
              <select
                required
                value={form.programId ?? ""}
                onChange={(event) => change("programId", event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Choose a program</option>
                {programs.map((program) => (
                  <option
                    key={String(field(program, "id"))}
                    value={String(field(program, "id"))}
                  >
                    {shown(field(program, "name"))}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {kind === "enrollment" && (
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            Enrollment date
            <input
              required
              type="date"
              value={form.enrollmentDate ?? ""}
              onChange={(event) => change("enrollmentDate", event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        )}
        {kind === "attendance" && (
          <>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Session date
              <input
                required
                type="date"
                value={form.sessionDate ?? ""}
                onChange={(event) => change("sessionDate", event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Attendance
              <select
                required
                value={form.attendanceStatus ?? "present"}
                onChange={(event) =>
                  change("attendanceStatus", event.target.value)
                }
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
              Remarks (optional)
              <textarea
                value={form.remarks ?? ""}
                onChange={(event) => change("remarks", event.target.value)}
                className="min-h-16 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </>
        )}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="rounded-md bg-[#123c55] px-4 py-2 text-xs font-semibold text-white"
        >
          Save
        </button>
      </div>
    </section>
  );
}
