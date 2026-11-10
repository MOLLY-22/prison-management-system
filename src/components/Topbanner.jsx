
export default function Topbanner() {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-[#0B2541] text-white rounded-md shadow-sm">
      <div className="flex items-center gap-4">
        <span className="material-symbols-outlined text-[28px] text-[#8CBCE8]">
          {/* verified user icon */}
        </span>

        <div>
          <h4 className="text-base font-semibold text-white">
            Discharge Security Protocol
          </h4>

          <p className="mt-1 text-sm leading-relaxed text-[#C5D3E1]">
            All discharges require identity verification, legal authorization,
            and required clearance checks.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="inline-block h-2 w-2 rounded-full bg-[#65C6A0]"></span>

        <span className="px-3 py-2 bg-[#246BA8] text-white rounded-sm text-xs font-semibold">
          Trial Mode: Mock Backend Active
        </span>
      </div>
    </div>
  );
}
