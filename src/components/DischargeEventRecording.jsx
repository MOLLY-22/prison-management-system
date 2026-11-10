
import { useEffect, useState } from 'react';
import { ReleaseDischargeService } from '../api/ReleaseAndDischargeService';

const initialForm = {
  inmateId: '',
  inmateName: '',
  dischargeDate: '',
  dischargeTime: '',
  dischargeType: 'Sentence completion',
  destination: '',
  transportArrangement: 'Not arranged',
  notes: '',
};

export default function DischargeEventRecording() {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [events, setEvents] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    ReleaseDischargeService.getAllDischargeEvents()
      .then((savedEvents) => {
        if (mounted) {
          setEvents(savedEvents);
        }
      })
      .catch((error) => {
        if (mounted) {
          setMessage(
            error instanceof Error ? error.message : 'Unable to load trial discharge events.',
          );
          setMessageIsError(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setMessage('');
    setMessageIsError(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setMessageIsError(false);
    setSaving(true);

    try {
      const savedEvent = await ReleaseDischargeService.recordDischarge(form);
      setEvents((currentEvents) => [savedEvent, ...currentEvents]);
      setMessage(`Trial discharge event ${savedEvent.id} saved in this browser.`);
      setForm(initialForm);
    } catch (error) {
      setMessageIsError(true);
      setMessage(
        error instanceof Error
          ? `Could not save trial discharge event: ${error.message}`
          : 'Could not save trial discharge event.',
      );
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setForm(initialForm);
    setMessage('');
    setMessageIsError(false);
  }

  return (
    <section className="w-full min-w-0 overflow-hidden rounded-xl border border-[#E1E7EE] bg-white shadow-sm">
      {/* Heading */}
      <div className="border-b border-[#E7ECF2] px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#EAF2FB] text-[#246BA8]">
            <svg
              viewBox="0 0 24 24"
              width="23"
              height="23"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="5" y="3" width="14" height="18" rx="2" />
              <path d="M9 3.5h6" />
              <path d="M8.5 10h7" />
              <path d="M8.5 14h4" />
              <path d="m14 17 1.5 1.5L19 15" />
            </svg>
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">
              Discharge Management
            </p>

            <h2 className="mt-1 text-xl font-bold tracking-tight text-[#17324D] sm:text-2xl">
              Discharge Event Recording
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
              Record the planned discharge date, destination, and
              arrangements for an inmate leaving the facility.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-5 sm:p-6">
        <div className="mb-5">
          <h3 className="text-sm font-bold text-[#17324D]">
            Discharge details
          </h3>

          <p className="mt-1 text-sm text-[#64748B]">
            Enter the required information below.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Inmate ID */}
          <div>
            <label
              htmlFor="inmateId"
              className="mb-2 block text-sm font-semibold text-[#334155]"
            >
              Inmate ID <span className="text-red-600">*</span>
            </label>

            <input
              id="inmateId"
              name="inmateId"
              value={form.inmateId}
              onChange={handleChange}
              placeholder="e.g. REC-88392"
              required
              className="w-full rounded-lg border border-[#DCE3EA] bg-white px-3.5 py-3 text-sm text-[#17324D] outline-none transition placeholder:text-[#94A3B8] focus:border-[#246BA8] focus:ring-2 focus:ring-[#246BA8]/15"
            />
          </div>

          {/* Inmate name */}
          <div>
            <label
              htmlFor="inmateName"
              className="mb-2 block text-sm font-semibold text-[#334155]"
            >
              Inmate full name <span className="text-red-600">*</span>
            </label>

            <input
              id="inmateName"
              name="inmateName"
              value={form.inmateName}
              onChange={handleChange}
              placeholder="Enter full name"
              required
              className="w-full rounded-lg border border-[#DCE3EA] bg-white px-3.5 py-3 text-sm text-[#17324D] outline-none transition placeholder:text-[#94A3B8] focus:border-[#246BA8] focus:ring-2 focus:ring-[#246BA8]/15"
            />
          </div>

          {/* Discharge date */}
          <div>
            <label
              htmlFor="dischargeDate"
              className="mb-2 block text-sm font-semibold text-[#334155]"
            >
              Planned discharge date{' '}
              <span className="text-red-600">*</span>
            </label>

            <input
              id="dischargeDate"
              name="dischargeDate"
              type="date"
              value={form.dischargeDate}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-[#DCE3EA] bg-white px-3.5 py-3 text-sm text-[#17324D] outline-none transition focus:border-[#246BA8] focus:ring-2 focus:ring-[#246BA8]/15"
            />
          </div>

          {/* Discharge time */}
          <div>
            <label
              htmlFor="dischargeTime"
              className="mb-2 block text-sm font-semibold text-[#334155]"
            >
              Planned discharge time
            </label>

            <input
              id="dischargeTime"
              name="dischargeTime"
              type="time"
              value={form.dischargeTime}
              onChange={handleChange}
              className="w-full rounded-lg border border-[#DCE3EA] bg-white px-3.5 py-3 text-sm text-[#17324D] outline-none transition focus:border-[#246BA8] focus:ring-2 focus:ring-[#246BA8]/15"
            />
          </div>

          {/* Discharge type */}
          <div>
            <label
              htmlFor="dischargeType"
              className="mb-2 block text-sm font-semibold text-[#334155]"
            >
              Discharge type <span className="text-red-600">*</span>
            </label>

            <select
              id="dischargeType"
              name="dischargeType"
              value={form.dischargeType}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-[#DCE3EA] bg-white px-3.5 py-3 text-sm text-[#17324D] outline-none transition focus:border-[#246BA8] focus:ring-2 focus:ring-[#246BA8]/15"
            >
              <option>Sentence completion</option>
              <option>Approved remission</option>
              <option>Court order</option>
              <option>Other authorized discharge</option>
            </select>
          </div>

          {/* Destination */}
          <div>
            <label
              htmlFor="destination"
              className="mb-2 block text-sm font-semibold text-[#334155]"
            >
              Destination after discharge{' '}
              <span className="text-red-600">*</span>
            </label>

            <input
              id="destination"
              name="destination"
              value={form.destination}
              onChange={handleChange}
              placeholder="Enter destination"
              required
              className="w-full rounded-lg border border-[#DCE3EA] bg-white px-3.5 py-3 text-sm text-[#17324D] outline-none transition placeholder:text-[#94A3B8] focus:border-[#246BA8] focus:ring-2 focus:ring-[#246BA8]/15"
            />
          </div>

          {/* Transport */}
          <div className="sm:col-span-2">
            <label
              htmlFor="transportArrangement"
              className="mb-2 block text-sm font-semibold text-[#334155]"
            >
              Transport arrangement
            </label>

            <select
              id="transportArrangement"
              name="transportArrangement"
              value={form.transportArrangement}
              onChange={handleChange}
              className="w-full rounded-lg border border-[#DCE3EA] bg-white px-3.5 py-3 text-sm text-[#17324D] outline-none transition focus:border-[#246BA8] focus:ring-2 focus:ring-[#246BA8]/15"
            >
              <option>Not arranged</option>
              <option>Family or guardian collection</option>
              <option>Facility transport</option>
              <option>Independent transport</option>
              <option>Other arrangement</option>
            </select>
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label
              htmlFor="notes"
              className="mb-2 block text-sm font-semibold text-[#334155]"
            >
              Additional notes
            </label>

            <textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={4}
              placeholder="Enter any relevant discharge arrangements or remarks..."
              className="w-full resize-y rounded-lg border border-[#DCE3EA] bg-white px-3.5 py-3 text-sm leading-6 text-[#17324D] outline-none transition placeholder:text-[#94A3B8] focus:border-[#246BA8] focus:ring-2 focus:ring-[#246BA8]/15"
            />
          </div>
        </div>

        {/* Notice */}
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-[#DCE7F4] bg-[#F4F8FD] p-4">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 shrink-0 text-[#246BA8]"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5" />
            <path d="M12 8h.01" />
          </svg>

          <p className="text-sm leading-6 text-[#475569]">
            Confirm the inmate's identity, legal authorization, and
            required clearances before finalizing any discharge.
          </p>
        </div>

        {/* Feedback */}
        {message && (
          <div
            role={messageIsError ? 'alert' : 'status'}
            className={`mt-5 rounded-lg border p-3 text-sm leading-6 ${
              messageIsError
                ? 'border-[#F5C5C5] bg-[#FCE9E9] text-[#B42318]'
                : 'border-[#B9E4CE] bg-[#EAF7F0] text-[#16734F]'
            }`}
          >
            {message}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#E7ECF2] pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center rounded-lg border border-[#DCE3EA] bg-white px-5 py-3 text-sm font-semibold text-[#334155] transition hover:bg-[#F8FAFC]"
          >
            Clear form
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#17324D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#244968] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BA8] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 3h12l4 4v14H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
              <path d="M8 3v6h8V3" />
              <path d="M8 21v-8h8v8" />
            </svg>

            {saving ? 'Saving trial record...' : 'Record discharge details'}
          </button>
        </div>
      </form>

      <div className="border-t border-[#E7ECF2] px-5 py-5 sm:px-6">
        <h3 className="text-sm font-bold text-[#17324D]">Saved trial discharge events</h3>
        {events.length === 0 ? (
          <p className="mt-2 text-sm text-[#64748B]">No discharge events have been recorded.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#E7ECF2]">
            {events.map((savedEvent) => (
              <li key={savedEvent.id} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="font-semibold text-[#17324D]">
                  {savedEvent.inmateName} ({savedEvent.inmateId})
                </span>
                <span className="text-[#64748B]">
                  {savedEvent.dischargeDate} · {savedEvent.dischargeType} · {savedEvent.id}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
