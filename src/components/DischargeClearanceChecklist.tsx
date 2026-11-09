
import { useEffect, useState } from 'react';
import { releaseDischargeService as ReleaseDischargeService } from '../api/releaseAndDischargeService';

const initialChecklist = [
  {
    id: 'court',
    title: 'Court Order Verification',
    description: 'Verified against Docket #CR-2021-9942',
    completed: true,
  },
  {
    id: 'finance',
    title: 'Financial Restitution & Fines',
    description: 'Balance cleared by treasury on 2023-10-10',
    completed: true,
  },
  {
    id: 'property',
    title: 'Property & Valuables Return',
    description: 'Locker #410 inventory audit pending',
    completed: false,
  },
  {
    id: 'medical',
    title: 'Medical & Psychological Sign-off',
    description: 'Final debriefing scheduled with Dr. Aris',
    completed: false,
  },
  {
    id: 'department',
    title: 'Final Departmental Sign-off',
    description: 'Awaiting authorized department confirmation',
    completed: false,
  },
];

export default function DischargeClearanceList() {
  const [checklist, setChecklist] = useState(initialChecklist);
  const [savedChecklist, setSavedChecklist] = useState(initialChecklist);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    let mounted = true;

    ReleaseDischargeService.getChecklist('#REC-88392', initialChecklist)
      .then((items) => {
        if (mounted) {
          setChecklist(items);
          setSavedChecklist(items);
        }
      })
      .catch((error) => {
        if (mounted) {
          setSaveError(error instanceof Error ? error.message : 'Unable to load checklist.');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const completedCount = checklist.filter(
    (item) => item.completed
  ).length;

  const totalCount = checklist.length;
  const progress = Math.round((completedCount / totalCount) * 100);

  const hasUnsavedChanges = checklist.some(
    (item, index) => item.completed !== savedChecklist[index].completed
  );

  function toggleItem(id) {
    setChecklist((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, completed: !item.completed }
          : item
      )
    );

    setSaveMessage('');
  }

  async function saveProgress() {
    setSaveError('');
    try {
      const savedItems = await ReleaseDischargeService.saveChecklist(
        '#REC-88392',
        checklist,
      );
      setSavedChecklist(savedItems);
      setSaveMessage('Checklist progress saved to this browser’s trial data.');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save checklist.');
      setSaveMessage('');
    }
  }

  return (
    <section className="flex w-full flex-col justify-between gap-6 rounded-lg border border-[#E1E7EE] bg-white p-5 shadow-sm sm:p-6">
      <div>
        {/* Heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px] text-[#246BA8]">
                fact_check
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
                Release clearance
              </span>
            </div>

            <h3 className="mt-2 text-lg font-bold text-[#17324D]">
              Active Checklist: #REC-88392
            </h3>

            <p className="mt-1 text-sm text-[#64748B]">
              Inmate: Vance, Marcus T.
            </p>
          </div>

          <span
            className={`inline-flex w-fit items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold ${
              completedCount === totalCount
                ? 'bg-[#E4F5EC] text-[#16734F]'
                : 'bg-[#E8F2FC] text-[#246BA8]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {completedCount === totalCount ? 'check_circle' : 'pending_actions'}
            </span>
            Step {completedCount} of {totalCount}
          </span>
        </div>

        <p className="mt-4 text-sm leading-6 text-[#64748B]">
          Verify court order authenticity, property inventory return, and
          departmental sign-offs before the release is authorized.
        </p>

        {/* Progress */}
        <div className="mt-5 rounded-lg border border-[#E7ECF2] bg-[#F8FAFC] p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-[#17324D]">
              Clearance progress
            </span>
            <span className="text-sm font-bold text-[#246BA8]">
              {progress}%
            </span>
          </div>

          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-[#E2E8F0]"
            role="progressbar"
            aria-label="Checklist completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="h-full rounded-full bg-[#246BA8] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-2 text-xs text-[#64748B]">
            {completedCount} of {totalCount} requirements completed
          </p>
        </div>

        {/* Checklist items */}
        <div className="mt-5 flex flex-col gap-3">
          {checklist.map((item, index) => (
            <label
              key={item.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                item.completed
                  ? 'border-[#CBE9D9] bg-[#F5FBF7]'
                  : 'border-[#E1E7EE] bg-white hover:border-[#B7CDE2] hover:bg-[#F8FAFC]'
              }`}
            >
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => toggleItem(item.id)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#246BA8]"
                aria-label={`Mark ${item.title} as completed`}
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-[#94A3B8]">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <span
                    className={`text-sm font-semibold ${
                      item.completed ? 'text-[#17324D]' : 'text-[#334155]'
                    }`}
                  >
                    {item.title}
                  </span>
                </div>

                <p className="mt-1 text-xs leading-5 text-[#64748B]">
                  {item.description}
                </p>
              </div>

              <span
                className={`material-symbols-outlined shrink-0 text-[21px] ${
                  item.completed ? 'text-[#16805D]' : 'text-[#94A3B8]'
                }`}
              >
                {item.completed ? 'check_circle' : 'radio_button_unchecked'}
              </span>
            </label>
          ))}
        </div>

        {/* Completion warning */}
        {completedCount === totalCount && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-[#B9E4CE] bg-[#EAF7F0] p-3">
            <span className="material-symbols-outlined text-[20px] text-[#16734F]">
              verified
            </span>
            <p className="text-sm leading-5 text-[#16734F]">
              All checklist items are marked complete. An authorized officer
              must still verify the records and approve release separately.
            </p>
          </div>
        )}
      </div>

      {/* Save controls */}
      <div className="border-t border-[#E7ECF2] pt-4">
        {saveError && (
          <p role="alert" className="mb-3 text-sm text-[#B42318]">
            Checklist error: {saveError}
          </p>
        )}

        {saveMessage && (
          <p role="status" className="mb-3 text-sm text-[#16734F]">
            {saveMessage}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#64748B]">
            {hasUnsavedChanges
              ? 'You have unsaved checklist changes.'
              : 'No unsaved changes.'}
          </p>

          <button
            type="button"
            onClick={saveProgress}
            disabled={!hasUnsavedChanges}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#17324D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#244968] disabled:cursor-not-allowed disabled:bg-[#CBD5E1] disabled:text-[#64748B]"
          >
            <span className="material-symbols-outlined text-[18px]">
              save
            </span>
            Save Checklist Progress
          </button>
        </div>
      </div>
    </section>
  );
}
