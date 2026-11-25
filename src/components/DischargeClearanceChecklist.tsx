
import { useEffect, useState } from 'react';
import { releaseDischargeService as ReleaseDischargeService } from '../api/releaseAndDischargeService';
import type { ClearanceChecklistItem } from '../api/releaseAndDischargeService';

const defaultChecklist: ClearanceChecklistItem[] = [
  {
    id: 'court',
    title: 'Court Order Verification',
    description: 'Confirm the legal authority for release.',
    completed: false,
  },
  {
    id: 'finance',
    title: 'Financial Restitution & Fines',
    description: 'Confirm applicable fines and restitution are resolved.',
    completed: false,
  },
  {
    id: 'property',
    title: 'Property & Valuables Return',
    description: 'Verify the inmate’s property inventory and return.',
    completed: false,
  },
  {
    id: 'medical',
    title: 'Medical & Psychological Sign-off',
    description: 'Confirm any required medical sign-off.',
    completed: false,
  },
  {
    id: 'department',
    title: 'Final Departmental Sign-off',
    description: 'Obtain required departmental approvals.',
    completed: false,
  },
];

type DischargeClearanceListProps = {
  inmateId: string;
  inmateName: string;
  canManage: boolean;
};

export default function DischargeClearanceList({
  inmateId,
  inmateName,
  canManage,
}: DischargeClearanceListProps) {
  const [checklist, setChecklist] = useState<ClearanceChecklistItem[]>([]);
  const [savedChecklist, setSavedChecklist] = useState<ClearanceChecklistItem[]>([]);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [loading, setLoading] = useState(Boolean(inmateId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (!inmateId) {
      return () => {
        mounted = false;
      };
    }

    ReleaseDischargeService.getChecklist(inmateId, defaultChecklist)
      .then((items) => {
        if (mounted) {
          setChecklist(items);
          setSavedChecklist(items);
        }
      })
      .catch((error) => {
        if (mounted) {
          setSaveError(error instanceof Error ? error.message : 'Unable to load the clearance checklist.');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [inmateId]);

  const completedCount = checklist.filter(
    (item) => item.completed
  ).length;

  const totalCount = checklist.length;
  const progress = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  const hasUnsavedChanges = checklist.some(
    (item, index) => item.completed !== savedChecklist[index]?.completed
  ) || checklist.length !== savedChecklist.length;

  function toggleItem(id) {
    if (!canManage) return;
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
    if (!canManage || !inmateId || saving) return;
    setSaveError('');
    setSaveMessage('');
    setSaving(true);
    try {
      const savedItems = await ReleaseDischargeService.saveChecklist(
        inmateId,
        checklist,
      );
      setSavedChecklist(savedItems);
      setChecklist(savedItems);
      setSaveMessage('Clearance checklist saved.');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save checklist.');
    } finally {
      setSaving(false);
    }
  }

  if (!inmateId) {
    return (
      <section className="rounded-lg border border-[#E1E7EE] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-[#17324D]">Release clearance</h2>
        <p className="mt-2 text-sm text-[#64748B]">
          Select an inmate from the eligibility queue to load their checklist.
        </p>
      </section>
    );
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
              Clearance Checklist
            </h3>

            <p className="mt-1 text-sm text-[#64748B]">
              Inmate: {inmateName} · {inmateId}
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
        {loading && (
          <p role="status" className="mt-4 text-sm text-[#64748B]">
            Loading clearance checklist…
          </p>
        )}

        {saveError && (
          <p role="alert" className="mt-4 rounded-md border border-[#F5C5C5] bg-[#FCE9E9] p-3 text-sm text-[#B42318]">
            {saveError}
          </p>
        )}

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
                disabled={!canManage}
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
        {totalCount > 0 && completedCount === totalCount && (
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

          {canManage && (
            <button
              type="button"
              onClick={saveProgress}
              disabled={loading || saving || !hasUnsavedChanges}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#17324D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#244968] disabled:cursor-not-allowed disabled:bg-[#CBD5E1] disabled:text-[#64748B]"
            >
              <span className="material-symbols-outlined text-[18px]">
                save
              </span>
              {saving ? 'Saving…' : 'Save checklist'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
