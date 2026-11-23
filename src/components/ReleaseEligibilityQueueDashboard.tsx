
type EligibilityStatus = 'all' | 'progress' | 'ready' | 'hold';
import { useEffect, useState } from 'react';
import type { InmateRecord } from '../api/releaseAndDischargeService';

type ReleaseEligibilityQueueDashboardProps = {
  search: string;
  setSearch: (value: string) => void;
  eligibilityStatus: EligibilityStatus;
  setEligibilityStatus: (value: EligibilityStatus) => void;
  inmates: InmateRecord[];
};

export default function ReleaseEligibilityQueueDashboard({
  search,
  setSearch,
  eligibilityStatus,
  setEligibilityStatus,
  inmates,
}: ReleaseEligibilityQueueDashboardProps) {
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [searchDisplay, setSearchDisplay] = useState(search);

  useEffect(() => {
    setSearchDisplay(search);
  }, [search]);

  const inmateName = (inmate: InmateRecord) =>
    (typeof inmate.fullName === 'string' && inmate.fullName.trim()) ||
    (typeof inmate.name === 'string' && inmate.name.trim()) ||
    [inmate.firstName, inmate.lastName].filter(Boolean).join(' ') ||
    'Name unavailable';

  const inmateOptions = inmates.map((inmate) => {
    return {
      id: String(inmate.id),
      label: `${inmateName(inmate)} · ${String(inmate.id)}`,
    };
  });

  const query = search.trim().toLowerCase();
  const suggestedOptions = inmateOptions.filter((option) =>
    !query || option.label.toLowerCase().includes(query),
  );

  return (
    <section>
      <div className="queue-header flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
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
        </div>

        <div className="queue-controls flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <div className="relative min-w-0 flex-1 sm:min-w-[230px] lg:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[19px] text-[#8795A5]">
              {/* search icon */}
            </span>

            <input
              type="search"
              value={searchDisplay}
              onChange={(event) => {
                const value = event.target.value;
                setSearchDisplay(value);
                setSearch(value);
                setSuggestionsOpen(true);
              }}
              onFocus={() => setSuggestionsOpen(true)}
              onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 150)}
              placeholder="Search or select inmate..."
              aria-label="Search or select inmate ID"
              className="w-full rounded-md border border-[#DCE3EA] bg-white py-2.5 pl-10 pr-9 text-sm text-[#172337] outline-none focus:border-[#246BA8] focus:ring-2 focus:ring-[#246BA8]/15"
            />
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setSuggestionsOpen((open) => !open)}
              className="absolute right-2 top-1/2 -translate-y-1/2 border-0 bg-transparent px-1 text-lg text-[#64748B]"
              aria-label="Show inmate suggestions"
            >
              ▾
            </button>
            {suggestionsOpen && (
              <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto border border-[#DCE3EA] bg-white shadow-lg">
                {suggestedOptions.length ? suggestedOptions.map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setSearchDisplay(option.label);
                      setSearch(option.id);
                      setSuggestionsOpen(false);
                    }}
                    className="block w-full border-0 border-b border-[#EEF2F6] bg-white px-3 py-2 text-left text-sm text-[#17324D] last:border-b-0 hover:bg-[#EEF5FB]"
                  >
                    {option.label}
                  </button>
                )) : (
                  <div className="px-3 py-3 text-sm text-[#64748B]">No matching inmates</div>
                )}
              </div>
            )}
          </div>

          <label className="sr-only" htmlFor="eligibility-status">
            Filter by eligibility status
          </label>

          <select
            id="eligibility-status"
            value={eligibilityStatus}
            onChange={(event) => {
              const status = event.target.value;
              if (['all', 'progress', 'ready', 'hold'].includes(status)) {
                setEligibilityStatus(status as EligibilityStatus);
              }
            }}
            className=" border border-[#DCE3EA] bg-white px-3 py-2 text-sm text-[#17324D] outline-none focus:border-[#246BA8] focus:ring-2 focus:ring-[#246BA8]/15"
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
