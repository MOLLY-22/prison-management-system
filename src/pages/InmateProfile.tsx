import { useEffect, useState } from "react";
import api from "../api/axiosClient";
import { collectionFrom, asRecord, itemFrom } from "../api/dataContract";

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
  | "extension"
  | "incident"
  | "enrollment"
  | "attendance";
type Props = {
  inmateId: string;
  userRole?: string;
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
  userRole = "",
  initialTab = "Overview",
  onBack,
}: Props) {
  const role = userRole
    .replace(/^ROLE_/, "")
    .replace(/_/g, " ")
    .toUpperCase();
  const canLogConduct = [
    "RECORDS OFFICER",
    "DISCIPLINARY OFFICER",
    "PRISON OFFICER",
  ].includes(role);
  const canManagePrograms = role === "PROGRAM FACILITATOR";
  const canRecordAttendance = ["PROGRAM FACILITATOR", "INSTRUCTOR"].includes(
    role,
  );
  const visibleTabs: Tab[] = ["Overview", "Sentences"];
  const [tab, setTab] = useState<Tab>(initialTab);
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

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    let active = true;
    setError("");
    setNotice("");
    setLoading(true);
    const load = async () => {
      try {
        if (tab === "Overview") {
          const { data } = await api.get(
            `/inmates/${encodeURIComponent(inmateId)}`,
          );
          if (active) setRecord(asRecord(itemFrom(data)));
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
          const { data } = await api.get(
            `/inmates/${encodeURIComponent(inmateId)}/sentences`,
          );
          if (active) setSentences(collectionFrom(data).map(asRecord));
        } else if (tab === "Transfers") {
          const { data } = await api.get("/transfers", {
            params: { page: 0, size: 500 },
          });
          if (active)
            setTransferRows(
              collectionFrom(itemFrom(data))
                .map(asRecord)
                .filter((row) => String(field(row, "inmateId")) === inmateId),
            );
        } else if (tab === "Visits") {
          const { data } = await api.get(
            `/inmates/${encodeURIComponent(inmateId)}/visits`,
            { params: { page: 0, size: 100 } },
          );
          if (active)
            setVisitRows(collectionFrom(itemFrom(data)).map(asRecord));
        } else if (tab === "Medical") {
          const { data } = await api.get("/medical-visits", {
            params: { inmateId, size: 100 },
          });
          if (active)
            setMedicalRows(collectionFrom(itemFrom(data)).map(asRecord));
        } else if (tab === "Cell allocations") {
          const cellId = String(field(record, "cellId") ?? "");
          if (cellId) {
            const { data } = await api.get(
              `/cells/${encodeURIComponent(cellId)}`,
            );
            if (active) setCellRecord(asRecord(itemFrom(data)));
          } else if (active) setCellRecord({});
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
  }, [tab, inmateId, revision]);

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
    setError("");
    setForm({
      kind,
      ...(sentenceId ? { sentenceId } : {}),
      ...(kind === "attendance" ? { attendanceStatus: "present" } : {}),
    });
    setFormKind(kind);
  };

  const saveProfile = async () => {
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
          : formKind === "extension"
            ? [form.sentenceId, form.proposedEndDate, form.reason]
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
      } else if (formKind === "remission") {
        await api.post(
          `/sentences/${encodeURIComponent(form.sentenceId)}/remissions`,
          {
            remissionPercentage: Number(form.remissionPercentage),
            effectiveDate: form.effectiveDate,
            reason: form.reason?.trim(),
          },
        );
        setNotice("Remission recorded.");
      } else if (formKind === "extension") {
        await api.post(
          `/sentences/${encodeURIComponent(form.sentenceId)}/extensions`,
          {
            proposedEndDate: form.proposedEndDate,
            reason: form.reason?.trim(),
          },
        );
        setNotice("Extension request sent.");
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

  const updateSentenceStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/sentences/${encodeURIComponent(id)}/status`, {
        status,
      });
      setRevision((current) => current + 1);
      setNotice("Sentence status updated.");
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };

  return (
    <section className="mx-auto max-w-[1440px] space-y-5">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#35657b] hover:text-[#123c55]"
      >
        ← <span>Back to inmate list</span>
      </button>
      <header className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold text-[#162d40]">
            {inmateName}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {inmateId} · {shown(field(record, "prisonName"))}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
          {shown(field(record, "inmateType"))}
        </span>
      </header>

      <nav
        className="flex gap-1 overflow-x-auto border-b border-slate-200"
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
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${tab === name ? "border-[#168c91] text-[#126b73]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
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
            {["RECORDS OFFICER", "PRISON OFFICER"].includes(role) &&
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
            {["RECORDS OFFICER", "PRISON OFFICER"].includes(role) && (
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
              const offence = shown(field(sentence, "offence"));
              return (
                <article
                  key={id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {offence}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {shown(field(sentence, "sentenceType"))} ·{" "}
                        {dateLabel(field(sentence, "startDate"))}
                        {field(sentence, "endDate")
                          ? ` – ${dateLabel(field(sentence, "endDate"))}`
                          : ""}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      Status
                      <select
                        value={String(field(sentence, "status") ?? "ACTIVE")}
                        onChange={(event) =>
                          void updateSentenceStatus(id, event.target.value)
                        }
                        className="rounded-md border border-slate-300 px-2 py-2"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="COMMUTED">Commuted</option>
                      </select>
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["RECORDS OFFICER", "PRISON OFFICER"].includes(role) && (
                      <button
                        onClick={() => openForm("remission", id)}
                        className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        Add remission
                      </button>
                    )}
                    {[
                      "RECORDS OFFICER",
                      "PRISON OFFICER",
                      "SUPER ADMIN",
                      "COMMISSIONER",
                    ].includes(role) && (
                      <button
                        onClick={() => openForm("extension", id)}
                        className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        Request extension
                      </button>
                    )}
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Remissions sentenceId={id} revision={revision} />
                    <Extensions
                      sentenceId={id}
                      revision={revision}
                      canDecide={false}
                    />
                  </div>
                </article>
              );
            })
          )}
        </section>
      ) : tab === "Transfers" ? (
        <HistoryList
          title="Transfer history"
          rows={transferRows}
          fields={[
            ["Date", "requestedAt"],
            ["From", "sourcePrisonName"],
            ["To", "destinationPrisonName"],
            ["Status", "status"],
            ["Reason", "reason"],
          ]}
        />
      ) : tab === "Visits" ? (
        <HistoryList
          title="Visit history"
          rows={visitRows}
          fields={[
            ["Date", "visitDate"],
            ["Type", "visitType"],
            ["Visitor", "visitor"],
            ["Start", "startDateTime"],
            ["End", "endDateTime"],
            ["Items brought", "itemsBrought"],
            ["Legal representative", "legalRepresentative"],
          ]}
        />
      ) : tab === "Medical" ? (
        <HistoryList
          title="Medical history"
          rows={medicalRows}
          fields={[
            ["Date", "visitDate"],
            ["Sickness", "sickness"],
            ["Diagnosis", "diagnosis"],
            ["Medication", "medicationsProvided"],
            ["Recommendations", "recommendations"],
          ]}
        />
      ) : tab === "Cell allocations" ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-800">Current cell</h2>
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
    api
      .get(`/sentences/${encodeURIComponent(sentenceId)}/remissions`)
      .then(({ data }) => active && setRows(collectionFrom(data).map(asRecord)))
      .catch((reason) => active && setError(errorMessage(reason)));
    return () => {
      active = false;
    };
  }, [sentenceId, revision]);
  return (
    <details className="rounded-lg border border-slate-200 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-700">
        Remissions ({rows.length})
      </summary>
      {error ? (
        <p className="mt-2 text-xs text-rose-700">{error}</p>
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
    </details>
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

function Extensions({
  sentenceId,
  revision,
  canDecide,
}: {
  sentenceId: string;
  revision: number;
  canDecide: boolean;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");
  useEffect(() => {
    let active = true;
    api
      .get(`/sentences/${encodeURIComponent(sentenceId)}/extensions`)
      .then(({ data }) => active && setRows(collectionFrom(data).map(asRecord)))
      .catch((reason) => active && setError(errorMessage(reason)));
    return () => {
      active = false;
    };
  }, [sentenceId, revision]);
  const decide = async (id: string, decision: "APPROVED" | "REJECTED") => {
    setSavingId(id);
    setError("");
    try {
      await api.post(
        `/sentence-extensions/${encodeURIComponent(id)}/decision`,
        { decision },
      );
      const { data } = await api.get(
        `/sentences/${encodeURIComponent(sentenceId)}/extensions`,
      );
      setRows(collectionFrom(data).map(asRecord));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSavingId("");
    }
  };
  return (
    <details className="rounded-lg border border-slate-200 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-700">
        Extensions ({rows.length})
      </summary>
      {error ? (
        <p className="mt-2 text-xs text-rose-700">{error}</p>
      ) : rows.length ? (
        <div className="mt-2 space-y-2">
          {rows.map((row) => {
            const id = String(field(row, "id") ?? "");
            const decision = String(field(row, "decision") ?? "PENDING");
            return (
              <div
                key={id}
                className="border-t border-slate-100 pt-2 text-xs text-slate-600"
              >
                <p>
                  {dateLabel(field(row, "originalEndDate"))} →{" "}
                  {dateLabel(field(row, "proposedEndDate"))} · {decision}
                </p>
                <p className="mt-1">{shown(field(row, "reason"))}</p>
                {canDecide && decision === "PENDING" && (
                  <div className="mt-2 flex gap-2">
                    <button
                      disabled={savingId === id}
                      onClick={() => void decide(id, "APPROVED")}
                      className="rounded border border-slate-300 px-2 py-1"
                    >
                      Approve
                    </button>
                    <button
                      disabled={savingId === id}
                      onClick={() => void decide(id, "REJECTED")}
                      className="rounded border border-slate-300 px-2 py-1"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-500">No extension requests.</p>
      )}
    </details>
  );
}

function ProfileActionForm({
  kind,
  form,
  programs,
  onChange,
  onCancel,
  onSave,
}: {
  kind: FormKind;
  form: Record<string, string>;
  programs: Row[];
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
        : kind === "extension"
          ? "Request extension"
          : kind === "incident"
            ? "Log incident"
            : kind === "enrollment"
              ? "Enroll in program"
              : "Record attendance";
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 font-semibold text-slate-800">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
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
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              End date (optional)
              <input
                type="date"
                value={form.endDate ?? ""}
                onChange={(event) => change("endDate", event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
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
        {kind === "extension" && (
          <>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Proposed end date
              <input
                required
                type="date"
                value={form.proposedEndDate ?? ""}
                onChange={(event) =>
                  change("proposedEndDate", event.target.value)
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
