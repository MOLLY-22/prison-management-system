
export default function ReleaseEligibilityQueueDashboard({
  search,
  setSearch,
  eligibilityStatus,
  setEligibilityStatus,
}) {
  return (
    <section className="queue-section w-full min-w-0">
      <div className="queue-header flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-1 w-7 rounded-full bg-[#246BA8]" />
            <span className="text-xs font-semibold uppercase tracking-[0.13em] text-[#64748B]">
              Release Management
            </span>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-[#0B1F36] sm:text-2xl">
            Release Eligibility Queue
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#596574]">
            Review inmates approaching discharge eligibility based on sentence
            length and remission calculations.
          </p>
        </div>

        <div className="queue-controls flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <div className="relative min-w-0 flex-1 sm:min-w-[230px] lg:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[19px] text-[#8795A5]">
              {/* search icon */}
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search inmate or ID..."
              aria-label="Search inmate or ID"
              className="w-full rounded-md border border-[#DCE3EA] bg-white py-2.5 pl-10 pr-3 text-sm text-[#172337] outline-none focus:border-[#246BA8] focus:ring-2 focus:ring-[#246BA8]/15"
            />
          </div>

          <label className="sr-only" htmlFor="eligibility-status">
            Filter by eligibility status
          </label>

          <select
            id="eligibility-status"
            value={eligibilityStatus}
            onChange={(event) => setEligibilityStatus(event.target.value)}
            className="rounded-md border border-[#DCE3EA] bg-white px-3 py-2.5 text-sm text-[#17324D] outline-none focus:border-[#246BA8] focus:ring-2 focus:ring-[#246BA8]/15"
          >
            <option value="all">All statuses</option>
            <option value="progress">In progress</option>
            <option value="ready">Ready for authorization</option>
            <option value="hold">On hold</option>
          </select>
        </div>
      </div>
    </section>
  );
}
