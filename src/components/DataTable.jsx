
import { useEffect, useMemo, useState } from 'react';
import { ReleaseDischargeService } from '../api/ReleaseAndDischargeService';

const statusStyles = {
  progress:
    'bg-[#FFF4DE] text-[#946200] ring-1 ring-inset ring-[#F0D9A5]',
  ready:
    'bg-[#E4F5EC] text-[#16734F] ring-1 ring-inset ring-[#B9E4CE]',
  hold: 'bg-[#FCE9E9] text-[#B42318] ring-1 ring-inset ring-[#F5C5C5]',
};

const statusIcons = {
  progress: 'pending_actions',
  ready: 'verified',
  hold: 'warning',
};

const tableHeaders = [
  'Inmate ID / Name',
  'Facility Block',
  'Sentence Expiry',
  'Remission Days',
  'Clearance Status',
  'Actions',
];

export default function DataTable({ search = '', eligibilityStatus = 'all' }) {
  const [inmateRecords, setInmateRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedInmate, setSelectedInmate] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadInmate() {
      setLoading(true);

      try {
        const data = await ReleaseDischargeService.getAllInmates();
        if (mounted && Array.isArray(data)) {
          setInmateRecords(data);
        }
      } catch (error) {
        if (mounted) {
          setLoadError(
            error instanceof Error ? error.message : 'Unable to load trial records.',
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadInmate();

    return () => {
      mounted = false;
    };
  }, []);

  const safeRecords = useMemo(
    () => (Array.isArray(inmateRecords) ? inmateRecords : []),
    [inmateRecords],
  );

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return safeRecords.filter((inmate) => {
      const matchesSearch =
        inmate.id.toLowerCase().includes(query) ||
        inmate.name.toLowerCase().includes(query) ||
        inmate.fullName.toLowerCase().includes(query) ||
        inmate.block.toLowerCase().includes(query) ||
        inmate.status.toLowerCase().includes(query);

      const matchesStatus =
        eligibilityStatus === 'all' || inmate.statusType === eligibilityStatus;

      return matchesSearch && matchesStatus;
    });
  }, [eligibilityStatus, safeRecords, search]);

  const statusCounts = useMemo(
    () => ({
      all: safeRecords.length,
      progress: safeRecords.filter((item) => item.statusType === 'progress').length,
      ready: safeRecords.filter((item) => item.statusType === 'ready').length,
      hold: safeRecords.filter((item) => item.statusType === 'hold').length,
    }),
    [safeRecords],
  );

  function handleAction(inmate) {
    setSelectedInmate(inmate);
  }

  function closeDialog() {
    setSelectedInmate(null);
  }

  return (
    <section className="w-full min-w-0 overflow-hidden rounded-lg border border-[#E1E7EE] bg-white shadow-sm">
      <div className="border-b border-[#E7ECF2] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[#246BA8]">
              {/* <span className="material-symbols-outlined text-[18px]">groups</span> */}
              <span className="text-[11px] font-bold uppercase tracking-[0.12em]">
                Release management
              </span>
            </div>

            <h3 className="text-lg font-bold text-[#17324D]">
              Discharge Eligibility Queue
            </h3>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-[#DCE3EA] bg-[#F8FAFC] px-3 py-1.5 text-[11px] font-semibold text-[#475569]">
            <span className="material-symbols-outlined text-[15px] text-[#246BA8]">
              checklist
            </span>
            {filteredRecords.length} visible
          </div>
        </div>

        <p className="mt-2 text-sm text-[#64748B]">
          Review inmate eligibility and outstanding release requirements.
        </p>
        <p className="mt-2 text-xs font-medium text-[#946200]">
          Trial mode: sample records are stored in this browser only.
        </p>
        </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7ECF2] bg-[#F8FAFC] px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="material-symbols-outlined text-[19px] text-[#64748B]">
            groups
          </span>
          <span className="text-sm font-medium text-[#475569]">Inmate records</span>
          <span className="rounded-full bg-[#E7EEF7] px-2 py-0.5 text-xs font-bold text-[#246BA8]">
            {filteredRecords.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#64748B]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF4DE] px-2 py-1 text-[#946200]">
            <span className="material-symbols-outlined text-[14px]">pending_actions</span>
            {statusCounts.progress}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E4F5EC] px-2 py-1 text-[#16734F]">
            <span className="material-symbols-outlined text-[14px]">verified</span>
            {statusCounts.ready}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FCE9E9] px-2 py-1 text-[#B42318]">
            <span className="material-symbols-outlined text-[14px]">warning</span>
            {statusCounts.hold}
          </span>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm font-medium text-[#475569]">
          <span className="material-symbols-outlined animate-[spin_1s_linear_infinite] text-[18px]">
            sync
          </span>
          Loading inmate records...
        </div>
      )}

      {loadError && (
        <p role="alert" className="border-b border-[#F5C5C5] bg-[#FCE9E9] px-5 py-3 text-sm text-[#B42318]">
          Could not load trial records: {loadError}
        </p>
      )}

      {!loading && (
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[950px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#E1E7EE] bg-[#F1F5F9]">
                {tableHeaders.map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className={`px-5 py-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[#64748B] ${
                      heading === 'Actions' ? 'text-right' : ''
                    }`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E7ECF2]">
              {filteredRecords.map((inmate) => (
                <tr key={inmate.id} className="transition-colors hover:bg-[#F8FAFC]">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-[#17324D]">{inmate.id}</div>
                    <div className="mt-1 text-sm text-[#64748B]">{inmate.name}</div>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm text-[#475569]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#94A3B8]">
                        domain
                      </span>
                      {inmate.block}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm text-[#475569]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[17px] text-[#94A3B8]">
                        calendar_month
                      </span>
                      {inmate.expiry}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4">
                    <span className="font-mono text-sm font-semibold text-[#246BA8]">
                      {inmate.remission} days
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-semibold ${statusStyles[inmate.statusType]}`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {statusIcons[inmate.statusType]}
                      </span>
                      {inmate.status}
                      {inmate.progress && ` (${inmate.progress})`}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleAction(inmate)}
                      className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BA8] focus-visible:ring-offset-2 ${
                        inmate.statusType === 'ready'
                          ? 'bg-[#246BA8] text-white hover:bg-[#1B527F]'
                          : 'border border-[#DCE3EA] bg-white text-[#17324D] hover:border-[#246BA8] hover:bg-[#EFF6FF]'
                      }`}
                    >
                      {inmate.action}
                      <span className="material-symbols-outlined text-[16px]">
                        arrow_forward
                      </span>
                    </button>
                  </td>
                </tr>
              ))}

              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <span className="material-symbols-outlined text-3xl text-[#94A3B8]">
                      search_off
                    </span>
                    <p className="mt-2 text-sm font-semibold text-[#475569]">
                      No matching records found
                    </p>
                    <p className="mt-1 text-xs text-[#94A3B8]">
                      Try another name, ID, block, or status.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-[#E7ECF2] bg-white px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#64748B]">
          Displaying {filteredRecords.length} of {safeRecords.length} records
        </p>

        <span className="inline-flex items-center gap-1.5 text-xs text-[#64748B]">
          <span className="material-symbols-outlined text-[15px]">lock</span>
          Authorized personnel only
        </span>
      </div>

      {selectedInmate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1D30]/50 p-4"
          onClick={closeDialog}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="inmate-dialog-title"
            className="w-full max-w-md rounded-xl border border-[#E1E7EE] bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                  Inmate record
                </p>
                <h3 id="inmate-dialog-title" className="mt-1 text-xl font-bold text-[#17324D]">
                  {selectedInmate.fullName}
                </h3>
                <p className="mt-1 text-sm text-[#64748B]">{selectedInmate.id}</p>
              </div>

              <button
                type="button"
                onClick={closeDialog}
                aria-label="Close dialog"
                className="rounded-md p-2 text-[#64748B] hover:bg-[#F1F5F9]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="mt-5 rounded-lg bg-[#F8FAFC] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                  Current clearance status
                </p>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold ${statusStyles[selectedInmate.statusType]}`}
                >
                  <span className="material-symbols-outlined text-[12px]">
                    {statusIcons[selectedInmate.statusType]}
                  </span>
                  {selectedInmate.status}
                </span>
              </div>

              <div className="mt-3 space-y-2 text-sm text-[#64748B]">
                <p>Facility: {selectedInmate.block}</p>
                <p>Sentence expiry: {selectedInmate.expiry}</p>
                <p>Remission: {selectedInmate.remission} days</p>
              </div>
            </div>

            {selectedInmate.statusType === 'hold' && (
              <p className="mt-4 rounded-md bg-[#FCE9E9] p-3 text-sm text-[#B42318]">
                This record is on hold. Resolve the missing property issue and verify all
                requirements before proceeding.
              </p>
            )}

            {selectedInmate.statusType === 'ready' && (
              <p className="mt-4 rounded-md bg-[#E4F5EC] p-3 text-sm text-[#16734F]">
                This record is marked ready for authorization. Verify all legal and clearance
                requirements before approving release.
              </p>
            )}

            {selectedInmate.statusType === 'progress' && (
              <p className="mt-4 rounded-md bg-[#FFF4DE] p-3 text-sm text-[#946200]">
                Clearance is still in progress. Complete the outstanding checklist items before
                proceeding.
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-md border border-[#DCE3EA] bg-white px-4 py-2.5 text-sm font-semibold text-[#17324D] hover:border-[#246BA8] hover:bg-[#EFF6FF]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-md bg-[#17324D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#244968]"
              >
                Review record
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
