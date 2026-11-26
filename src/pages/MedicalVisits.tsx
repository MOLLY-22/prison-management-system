import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { AxiosError } from "axios";
import { inmateService, type Inmate } from "../api/inmateService";
import { medicalVisitService, type MedicalVisit, type MedicalVisitRequest } from "../api/medicalVisitService";

const emptyMedicalForm = {
  visitDate: new Date().toISOString().slice(0, 10),
  startTime: "09:00",
  endTime: "09:30",
  sickness: "",
  diagnosis: "",
  medicationsProvided: "",
  recommendations: "",
};

function errorMessage(error: unknown, fallback: string): string {
  const apiError = error as AxiosError<{ message?: string; detail?: string }>;
  return apiError.response?.data?.message
    ?? apiError.response?.data?.detail
    ?? (error instanceof Error ? error.message : fallback);
}

function formatDate(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function InmateLabel({ inmate }: { inmate: Inmate }) {
  const name = `${inmate.firstName} ${inmate.lastName}`.trim() || "Unnamed inmate";
  return <>{name} · {inmate.id}</>;
}

export default function MedicalVisits() {
  const [inmates, setInmates] = useState<Inmate[]>([]);
  const [selectedInmateId, setSelectedInmateId] = useState("");
  const [inmatesLoading, setInmatesLoading] = useState(true);
  const [inmatesError, setInmatesError] = useState("");
  const [visits, setVisits] = useState<MedicalVisit[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [visitsError, setVisitsError] = useState("");
  const [reloadInmates, setReloadInmates] = useState(0);
  const [reloadVisits, setReloadVisits] = useState(0);
  const [medicalForm, setMedicalForm] = useState(emptyMedicalForm);
  const [savingVisit, setSavingVisit] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(() => {
        if (!active) return undefined;
        setInmatesLoading(true);
        setInmatesError("");
        return inmateService.getInmates({ size: 100 });
      })
      .then((records) => {
        if (!active || !records) return;
        setInmates(records);
        setSelectedInmateId((current) => records.some((item) => item.id === current)
          ? current
          : "");
      })
      .catch((error: unknown) => {
        if (active) setInmatesError(errorMessage(error, "Could not load inmate records."));
      })
      .finally(() => {
        if (active) setInmatesLoading(false);
      });
    return () => { active = false; };
  }, [reloadInmates]);

  useEffect(() => {
    if (!selectedInmateId) return;

    let active = true;
    void Promise.resolve()
      .then(() => {
        if (!active) return undefined;
        setVisitsLoading(true);
        setVisitsError("");
        setVisits([]);
        return medicalVisitService.getMedicalVisits(selectedInmateId);
      })
      .then((records) => { if (active && records) setVisits(records); })
      .catch((error: unknown) => {
        if (active) setVisitsError(errorMessage(error, "Could not load medical visit history."));
      })
      .finally(() => { if (active) setVisitsLoading(false); });
    return () => { active = false; };
  }, [selectedInmateId, reloadVisits]);

  const selectedInmate = inmates.find((inmate) => inmate.id === selectedInmateId);

  async function recordMedicalVisit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedInmateId) return;
    if (medicalForm.endTime <= medicalForm.startTime) {
      setSaveError("The medical visit end time must be later than its start time.");
      return;
    }
    setSavingVisit(true);
    setSaveNotice("");
    setSaveError("");
    const payload: MedicalVisitRequest = {
      inmateId: selectedInmateId,
      ...medicalForm,
    };
    try {
      await medicalVisitService.recordMedicalVisit(payload);
      setMedicalForm({ ...emptyMedicalForm, visitDate: new Date().toISOString().slice(0, 10) });
      setSaveNotice("Medical visit recorded successfully.");
      setReloadVisits((count) => count + 1);
    } catch (error: unknown) {
      setSaveError(errorMessage(error, "Could not record medical visit."));
    } finally {
      setSavingVisit(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[5px] border border-[#dce4e7] bg-[#fffdf9] shadow-[0_12px_30px_rgba(35,54,72,0.05)]">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[#e5ebf0] p-6 sm:p-8">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#2876a8]">Clinical records</p>
          <h2 className="mt-2 font-['Georgia',_'Times_New_Roman',serif] text-3xl font-medium tracking-[-0.04em] text-[#132d47]">Medical visit history</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#657789]">Review recorded visits, reported sickness, diagnosis, medication, and care recommendations.</p>
        </div>
        <label className="grid min-w-[min(100%,320px)] gap-2 text-xs font-bold text-[#536b7d]">
          Select inmate
          <select
            className="min-h-11 rounded border border-[#cfdbe3] bg-white px-3 text-sm font-medium text-[#17324d] outline-none focus:border-[#2876a8] focus:ring-2 focus:ring-[#2876a8]/15"
            value={selectedInmateId}
            onChange={(event) => {
              setSelectedInmateId(event.target.value);
              setReloadVisits(0);
            }}
            disabled={inmatesLoading || !!inmatesError || inmates.length === 0}
            aria-label="Select inmate for medical history"
          >
            <option value="">{inmatesLoading ? "Loading inmates…" : "Choose an inmate"}</option>
            {inmates.map((inmate) => (
              <option key={inmate.id} value={inmate.id}>{`${inmate.firstName} ${inmate.lastName}`.trim()} · {inmate.id}</option>
            ))}
          </select>
        </label>
      </header>

      {inmatesError && (
        <div className="m-6 flex flex-wrap items-center justify-between gap-3 rounded border border-[#f1c5c2] bg-[#fff4f2] p-4 text-sm text-[#9b3028]" role="alert">
          <span>Could not load inmates: {inmatesError}</span>
          <button className="font-bold underline" onClick={() => setReloadInmates((count) => count + 1)}>Retry</button>
        </div>
      )}

      {!inmatesLoading && !inmatesError && inmates.length === 0 && (
        <p className="m-6 rounded border border-[#dce4e7] bg-[#f7fafb] p-5 text-sm text-[#657789]" role="status">No inmate records are available to select.</p>
      )}

      {selectedInmate && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5ebf0] bg-[#f7fafb] px-6 py-4 sm:px-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#718293]">Selected record</p>
            <p className="mt-1 text-sm font-bold text-[#17324d]"><InmateLabel inmate={selectedInmate} /></p>
          </div>
          <span className="rounded-full bg-[#e6f4ee] px-3 py-1 text-xs font-bold text-[#16734f]">
            {visitsLoading ? "Loading history…" : `${visits.length} ${visits.length === 1 ? "visit" : "visits"}`}
          </span>
        </div>
      )}

      {selectedInmateId && (
        <form className="grid gap-4 border-b border-[#e5ebf0] bg-white p-6 sm:grid-cols-2 sm:p-8" onSubmit={recordMedicalVisit}>
          <div className="sm:col-span-2">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#2876a8]">Clinical records</p>
            <h3 className="mt-1 text-lg font-bold text-[#17324d]">Record a medical visit</h3>
            <p className="mt-1 text-xs text-[#718293]">This record will be saved for the selected inmate.</p>
          </div>
          {saveNotice && <p className="sm:col-span-2 rounded border border-[#b9ddc9] bg-[#f0faf4] p-3 text-sm text-[#276344]" role="status">{saveNotice}</p>}
          {saveError && <p className="sm:col-span-2 rounded border border-[#f1c5c2] bg-[#fff4f2] p-3 text-sm text-[#9b3028]" role="alert">{saveError}</p>}
          <label className="grid gap-2 text-xs font-bold text-[#536b7d]">
            Visit date
            <input required type="date" max={new Date().toISOString().slice(0, 10)} value={medicalForm.visitDate} onChange={(event) => setMedicalForm((current) => ({ ...current, visitDate: event.target.value }))} className="min-h-11 rounded border border-[#cfdbe3] bg-white px-3 text-sm font-medium text-[#17324d] outline-none focus:border-[#2876a8] focus:ring-2 focus:ring-[#2876a8]/15" />
          </label>
          <label className="grid gap-2 text-xs font-bold text-[#536b7d]">
            Start time
            <input required type="time" value={medicalForm.startTime} onChange={(event) => setMedicalForm((current) => ({ ...current, startTime: event.target.value }))} className="min-h-11 rounded border border-[#cfdbe3] bg-white px-3 text-sm font-medium text-[#17324d] outline-none focus:border-[#2876a8] focus:ring-2 focus:ring-[#2876a8]/15" />
          </label>
          <label className="grid gap-2 text-xs font-bold text-[#536b7d]">
            End time
            <input required type="time" value={medicalForm.endTime} onChange={(event) => setMedicalForm((current) => ({ ...current, endTime: event.target.value }))} className="min-h-11 rounded border border-[#cfdbe3] bg-white px-3 text-sm font-medium text-[#17324d] outline-none focus:border-[#2876a8] focus:ring-2 focus:ring-[#2876a8]/15" />
          </label>
          <label className="grid gap-2 text-xs font-bold text-[#536b7d]">
            Sickness / complaint
            <textarea required maxLength={1000} rows={3} value={medicalForm.sickness} onChange={(event) => setMedicalForm((current) => ({ ...current, sickness: event.target.value }))} className="rounded border border-[#cfdbe3] bg-white px-3 py-2 text-sm font-medium text-[#17324d] outline-none focus:border-[#2876a8] focus:ring-2 focus:ring-[#2876a8]/15" />
          </label>
          <label className="grid gap-2 text-xs font-bold text-[#536b7d]">
            Diagnosis
            <textarea required maxLength={1000} rows={3} value={medicalForm.diagnosis} onChange={(event) => setMedicalForm((current) => ({ ...current, diagnosis: event.target.value }))} className="rounded border border-[#cfdbe3] bg-white px-3 py-2 text-sm font-medium text-[#17324d] outline-none focus:border-[#2876a8] focus:ring-2 focus:ring-[#2876a8]/15" />
          </label>
          <label className="grid gap-2 text-xs font-bold text-[#536b7d]">
            Medication provided
            <textarea maxLength={1000} rows={3} value={medicalForm.medicationsProvided} onChange={(event) => setMedicalForm((current) => ({ ...current, medicationsProvided: event.target.value }))} className="rounded border border-[#cfdbe3] bg-white px-3 py-2 text-sm font-medium text-[#17324d] outline-none focus:border-[#2876a8] focus:ring-2 focus:ring-[#2876a8]/15" />
          </label>
          <label className="grid gap-2 text-xs font-bold text-[#536b7d]">
            Recommendations / follow-up
            <textarea maxLength={1000} rows={3} value={medicalForm.recommendations} onChange={(event) => setMedicalForm((current) => ({ ...current, recommendations: event.target.value }))} className="rounded border border-[#cfdbe3] bg-white px-3 py-2 text-sm font-medium text-[#17324d] outline-none focus:border-[#2876a8] focus:ring-2 focus:ring-[#2876a8]/15" />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={savingVisit} className="min-h-10 rounded bg-[#123c55] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-[#1d5f86] disabled:cursor-not-allowed disabled:opacity-60">
              {savingVisit ? "Saving visit…" : "Record medical visit"}
            </button>
          </div>
        </form>
      )}

      {!selectedInmateId && !inmatesLoading && !inmatesError && inmates.length > 0 && (
        <div className="p-10 text-center" role="status">
          <p className="font-semibold text-[#17324d]">Choose an inmate to view medical history</p>
          <p className="mt-2 text-sm text-[#718293]">The visit list will load when an inmate is selected.</p>
        </div>
      )}

      {selectedInmateId && visitsLoading && (
        <div className="p-10 text-center text-sm text-[#657789]" role="status" aria-live="polite">Loading medical visit history…</div>
      )}

      {selectedInmateId && visitsError && !visitsLoading && (
        <div className="m-6 flex flex-wrap items-center justify-between gap-3 rounded border border-[#f1c5c2] bg-[#fff4f2] p-4 text-sm text-[#9b3028]" role="alert">
          <span>Could not load medical visit history: {visitsError}</span>
          <button className="font-bold underline" onClick={() => setReloadVisits((count) => count + 1)}>Retry</button>
        </div>
      )}

      {selectedInmateId && !visitsLoading && !visitsError && visits.length === 0 && (
        <div className="p-10 text-center" role="status">
          <p className="font-semibold text-[#17324d]">No medical visits recorded</p>
          <p className="mt-2 text-sm text-[#718293]">There is no medical visit history for this inmate.</p>
        </div>
      )}

      {selectedInmateId && !visitsLoading && !visitsError && visits.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[#f7fafb] text-[10px] uppercase tracking-[0.12em] text-[#718293]">
              <tr>
                <th scope="col" className="px-5 py-4 font-extrabold">Date</th>
                <th scope="col" className="px-5 py-4 font-extrabold">Sickness</th>
                <th scope="col" className="px-5 py-4 font-extrabold">Diagnosis</th>
                <th scope="col" className="px-5 py-4 font-extrabold">Medication</th>
                <th scope="col" className="px-5 py-4 font-extrabold">Recommendations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f4]">
              {visits.map((visit, index) => (
                <tr className="align-top hover:bg-[#fbfdff]" key={visit.id || `${visit.date}-${index}`}>
                  <td className="whitespace-nowrap px-5 py-5 font-semibold text-[#17324d]">{formatDate(visit.date)}</td>
                  <td className="px-5 py-5 text-[#344b60]">{visit.sickness || "—"}</td>
                  <td className="px-5 py-5 text-[#344b60]">{visit.diagnosis || "—"}</td>
                  <td className="px-5 py-5 text-[#344b60]">{visit.medication || "—"}</td>
                  <td className="px-5 py-5 text-[#344b60]">{visit.recommendations || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <footer className="border-t border-[#e5ebf0] px-6 py-3 text-[11px] text-[#8191a0] sm:px-8">
        Read-only history · Showing all recorded visits
      </footer>
    </section>
  );
}