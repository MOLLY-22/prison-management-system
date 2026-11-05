
import { useState } from 'react';

export default function DischageClearance() {
  const [form, setForm] = useState({
    inmateId: '#REC-88392',
    inmateName: 'Marcus T. Vance',
    facility: 'Block C - Max 4',
    dischargeDate: '',
    receivingOfficer: '',
    releaseType: 'Sentence completion',
    notes: '',
  });

  const [message, setMessage] = useState('');

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setMessage('');
  }

  function handleSubmit(event) {
    event.preventDefault();
    setMessage(
      'Form validated. Connect this form to your backend to record the discharge.'
    );
  }

  return (
    <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Discharge details form */}
      <div className="overflow-hidden rounded-lg border border-[#E1E7EE] bg-white shadow-sm">
        <div className="border-b border-[#E7ECF2] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8F2FC] text-[#246BA8]">
              <span className="material-symbols-outlined text-[23px]">
                assignment_add
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#17324D]">
                Discharge Event Recording
              </h3>
              <p className="mt-1 text-sm text-[#64748B]">
                Record the planned discharge details.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="inmateId"
                className="mb-2 block text-xs font-semibold text-[#475569]"
              >
                Inmate ID
              </label>
              <input
                id="inmateId"
                name="inmateId"
                value={form.inmateId}
                onChange={updateField}
                required
                className="w-full rounded-md border border-[#DCE3EA] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#17324D] outline-none focus:border-[#246BA8] focus:ring-2 focus:ring-[#246BA8]/15"
              />
            </div>

            <div>
              <label
                htmlFor="facility"
                className="mb-2 block text-xs font-semibold text-[#475569]"
              >
                Facility / Block
              </label>
              <input
                id="facility"
                name="facility"
                value={form.facility}
                onChange={updateField}
                required
                className="w-full rounded-md border border-[#DCE3EA] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#17324D] outline-none focus:border-[#246BA8] focus:ring-2 focus:ring-[#246BA8]/15"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="inmateName"
              className="mb-2 block text-xs font-semibold text-[#475569]"
            >
              Inmate full name
            </label>
            <input
              id="inmateName"
              name="inmateName"
              value={form.inmateName}
              onChange={updateField}
              required
              className="w-full rounded-md border border-[#DCE3EA] bg-white px-3 py-2.5 text-sm text-[#17324D] outline-none focus:border-[#246BA8] focus:ring-2 focus:ring-[#246BA8]/15"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="dischargeDate"
                className="mb-2 block text-xs font-semibold text-[#475569]"
              >
                Planned discharge date
              </label>
              <input
                type="date"
                id="dischargeDate"
                name="dischargeDate"
                value={form.dischargeDate}
                onChange={updateField}
                required
                className="w-full rounded-md border border-[#DCE3EA] bg-white px-3 py-2.5 text-sm text-[#17324D] outline-none focus:border-[#246BA8] focus:ring-2 focus:ring-[#246BA8]/15"
              />
            </div>

            <div>
              <label
                htmlFor="releaseType"
                className="mb-2 block text-xs font-semibold text-[#475569]"
              >
                Release type
              </label>
              <select
                id="releaseType"
                name="releaseType"
                value={form.releaseType}
                onChange={updateField}
                required
                className="w-full rounded-md border border-[#DCE3EA] bg-white px-3 py-2.5 text-sm text-[#17324D] outline-none focus:border-[#246BA8] focus:ring-2 focus:ring-[#246BA8]/15"
              >
                <option>Sentence completion</option>
                <option>Remission</option>
                <option>Court-ordered release</option>
                <option>Other authorized release</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="receivingOfficer"
              className="mb-2 block text-xs font-semibold text-[#475569]"
            >
              Responsible officer
            </label>
            <input
              id="receivingOfficer"
              name="receivingOfficer"
              value={form.receivingOfficer}
              onChange={updateField}
              required
              placeholder="Enter officer name or staff ID"
              className="w-full rounded-md border border-[#DCE3EA] bg-white px-3 py-2.5 text-sm text-[#17324D] outline-none placeholder:text-[#94A3B8] focus:border-[#246BA8] focus:ring-2 focus:ring-[#246BA8]/15"
            />
          </div>

          <div>
            <label
              htmlFor="notes"
              className="mb-2 block text-xs font-semibold text-[#475569]"
            >
              Additional notes
              <span className="ml-1 font-normal text-[#94A3B8]">
                (optional)
              </span>
            </label>
            <textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={updateField}
              rows={3}
              placeholder="Enter relevant discharge notes..."
              className="w-full resize-y rounded-md border border-[#DCE3EA] bg-white px-3 py-2.5 text-sm text-[#17324D] outline-none placeholder:text-[#94A3B8] focus:border-[#246BA8] focus:ring-2 focus:ring-[#246BA8]/15"
            />
          </div>

          {message && (
            <div
              role="status"
              className="rounded-md border border-[#F0D9A5] bg-[#FFF8E8] p-3 text-sm leading-5 text-[#805B10]"
            >
              {message}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-[#E7ECF2] pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setForm({
                  inmateId: '',
                  inmateName: '',
                  facility: '',
                  dischargeDate: '',
                  receivingOfficer: '',
                  releaseType: 'Sentence completion',
                  notes: '',
                });
                setMessage('');
              }}
              className="rounded-md border border-[#DCE3EA] bg-white px-4 py-2.5 text-sm font-semibold text-[#475569] transition hover:bg-[#F1F5F9]"
            >
              Clear Form
            </button>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#17324D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#244968]"
            >
              <span className="material-symbols-outlined text-[18px]">
                save
              </span>
              Validate Discharge Details
            </button>
          </div>
        </form>
      </div>

      {/* Release readiness summary */}
      <div className="flex flex-col overflow-hidden rounded-lg border border-[#E1E7EE] bg-white shadow-sm">
        <div className="border-b border-[#E7ECF2] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8F2FC] text-[#246BA8]">
              <span className="material-symbols-outlined text-[23px]">
                fact_check
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#17324D]">
                Release Readiness
              </h3>
              <p className="mt-1 text-sm text-[#64748B]">
                Pre-release verification overview.
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 p-5">
          <div className="rounded-lg border border-[#E1E7EE] bg-[#F8FAFC] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
              Selected inmate
            </p>
            <p className="mt-2 text-base font-bold text-[#17324D]">
              {form.inmateName || 'No inmate name entered'}
            </p>
            <p className="mt-1 text-sm text-[#64748B]">
              {form.inmateId || 'No inmate ID entered'}
            </p>
            <p className="mt-2 text-sm text-[#475569]">
              {form.facility || 'Facility not specified'}
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                label: 'Court warrant verification',
                description: 'Confirm the current legal release authority.',
                icon: 'gavel',
              },
              {
                label: 'Clearance checklist',
                description: 'Confirm all required departments have signed off.',
                icon: 'checklist',
              },
              {
                label: 'Officer authorization',
                description: 'Obtain approval from the authorized officer.',
                icon: 'admin_panel_settings',
              },
              {
                label: 'Identity confirmation',
                description: 'Complete required identity checks before discharge.',
                icon: 'fingerprint',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-3 rounded-md border border-[#E7ECF2] p-3"
              >
                <span className="material-symbols-outlined text-[21px] text-[#246BA8]">
                  {item.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#17324D]">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#64748B]">
                    {item.description}
                  </p>
                </div>
                <span className="ml-auto rounded bg-[#FFF4DE] px-2 py-1 text-[10px] font-semibold text-[#946200]">
                  Verify
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2 rounded-md border border-[#F0D9A5] bg-[#FFF8E8] p-3">
            <span className="material-symbols-outlined text-[20px] text-[#A66A0A]">
              info
            </span>
            <p className="text-xs leading-5 text-[#805B10]">
              This summary is informational only. Do not treat a completed
              form as authorization to release an inmate. Verify legal
              authority, clearances, identity, and approvals through the
              official system.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
