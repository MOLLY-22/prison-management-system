import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosClient";
import { collectionFrom } from "../api/dataContract";
import { InmateManagement } from "../pages/InmateManagement";
import Visitors from "../pages/Visitors";
import TransferManagement from "../pages/TransferManagement";
import UserAccess from "../pages/UserAccess";
import TransferAnalytics from "../pages/TransferAnalytics";
import { PrisonRegistry } from "../pages/PrisonRegistry";
import { prisonService } from "../api/prisonService";
import { transferService } from "../api/transferService";
import ReleaseManagement from "../pages/ReleaseManagement";
import { getRoleProfile, normalizeRole, type Workspace } from "../auth/roleAccess";



type View = Workspace | "profile" | "admission" | "sentences" | "transfer-analytics";
type RecordItem = Record<string, string | number | boolean | null>;

const navigation: { id: View; label: string; short: string }[] = [
  { id: "overview", label: "Dashboard", short: "grid" },
  { id: "inmates", label: "Inmates", short: "people" },
  { id: "housing", label: "Blocks & cells", short: "building" },
  { id: "visitors", label: "Visits", short: "visit" },
  { id: "transfer-analytics", label: "Transfers", short: "chart" },
  { id: "release", label: "Releases", short: "exit" },
  { id: "access", label: "Users", short: "shield" },
  { id: "prisons", label: "Prisons", short: "building" },
];

function NavigationIcon({ name }: { name: string }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const icons: Record<string, React.ReactNode> = {
    grid: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </>
    ),
    people: (
      <>
        <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" />
        <circle cx="10" cy="8" r="3.5" />
        <path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M17 15h1.5a3.5 3.5 0 0 1 3.5 3.5V20" />
      </>
    ),
    file: (
      <>
        <path d="M7 3.5h7l4 4V20H7z" />
        <path d="M14 3.5V8h4M10 12h5M10 16h5" />
      </>
    ),
    visit: (
      <>
        <path d="M3 12s3.2-5 9-5 9 5 9 5-3.2 5-9 5-9-5-9-5Z" />
        <circle cx="12" cy="12" r="2.2" />
      </>
    ),
    arrows: (
      <>
        <path d="M4 8h14m-4-4 4 4-4 4M20 16H6m4 4-4-4 4-4" />
      </>
    ),
    exit: (
      <>
        <path d="M13 4h6v16h-6M10 8l4 4-4 4M14 12H3" />
      </>
    ),
    shield: (
      <>
        <path d="m12 3 7 3v5c0 4.5-2.8 8-7 10-4.2-2-7-5.5-7-10V6z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    building: (
      <>
        <path d="M4 20V5l8-2v17M12 8h8v12M2 20h20M7 8v.01M7 12v.01M7 16v.01M16 12v.01M16 16v.01" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      className="size-[18px] shrink-0"
      viewBox="0 0 24 24"
      {...common}
    >
      {icons[name] ?? icons.file}
    </svg>
  );
}

const endpointFor: Partial<Record<View, string>> = {
  inmates: "/inmates",
  visitors: "/visits",
  access: "/users",
  prisons: "/prisons",
};

function valueLabel(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function DataView({ view }: { view: View }) {
  const endpoint = endpointFor[view];
  const resource = endpoint ?? `/${view}`;
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .get(resource)
      .then(
        ({ data }) => active && setRecords(collectionFrom<RecordItem>(data)),
      )
      .catch(
        (reason: unknown) =>
          active &&
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load records.",
          ),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [resource]);

  const columns = useMemo(() => {
    const keys = new Set<string>();
    records
      .slice(0, 8)
      .forEach((record) => Object.keys(record).forEach((key) => keys.add(key)));
    return [...keys].filter((key) => key !== "id").slice(0, 5);
  }, [records]);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#d9e2ec] bg-white shadow-[0_12px_40px_rgba(27,53,79,0.06)]">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e5ebf0] p-6">
        <div>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#17324d]">
            {navigation.find((item) => item.id === view)?.label}
          </h2>
        </div>
        <span className="rounded-full bg-[#e6f4ee] px-3 py-1 text-xs font-semibold text-[#16734f]">
          {loading ? "Syncing…" : `${records.length} records`}
        </span>
      </div>
      {error && (
        <p
          className="border-b border-[#f4c8c8] bg-[#fff3f3] px-6 py-3 text-sm text-[#b42318]"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-[#f7fafc] text-xs uppercase tracking-wider text-[#6b7f90]">
            <tr>
              {columns.map((column) => (
                <th className="px-6 py-4 font-semibold" key={column}>
                  {column.replace(/[A-Z]/g, (letter) => ` ${letter}`).trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf1f4]">
            {records.map((record, index) => (
              <tr
                className="hover:bg-[#fbfdff]"
                key={String(record.id ?? index)}
              >
                {columns.map((column) => (
                  <td className="px-6 py-4 text-[#344b60]" key={column}>
                    {valueLabel(record[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && !records.length && (
        <p className="p-8 text-sm text-[#617386]">
          No records were returned by the backend.
        </p>
      )}
    </section>
  );
  return (
    <section className="overflow-hidden rounded-2xl border border-[#d9e2ec] bg-white shadow-[0_12px_40px_rgba(27,53,79,0.06)]">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e5ebf0] p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#3f769e]">
            Live API records
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#17324d]">
            {navigation.find((item) => item.id === view)?.label}
          </h2>
        </div>
        <span className="rounded-full bg-[#e6f4ee] px-3 py-1 text-xs font-semibold text-[#16734f]">
          {loading ? "Syncing…" : `${records.length} records`}
        </span>
      </div>
      {error && (
        <p
          className="border-b border-[#f4c8c8] bg-[#fff3f3] px-6 py-3 text-sm text-[#b42318]"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-[#f7fafc] text-xs uppercase tracking-wider text-[#6b7f90]">
            <tr>
              {columns.map((column) => (
                <th className="px-6 py-4 font-semibold" key={column}>
                  {column.replace(/[A-Z]/g, (letter) => ` ${letter}`).trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf1f4]">
            {records.map((record, index) => (
              <tr
                className="hover:bg-[#fbfdff]"
                key={String(record.id ?? index)}
              >
                {columns.map((column) => (
                  <td className="px-6 py-4 text-[#344b60]" key={column}>
                    {valueLabel(record[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && !records.length && (
        <p className="p-8 text-sm text-[#617386]">
          No records were returned by the backend.
        </p>
      )}
    </section>
  );
}

void DataView;

function Overview({
  onNavigate,
  role,
  navigationItems,
}: {
  onNavigate: (view: View) => void;
  role: string;
  navigationItems: typeof navigation;
}) {
  const profile = getRoleProfile(role);
  const cardDetails: Record<string, { label: string; note: string }> = {
    inmates: { label: "Inmate records", note: profile.canAdmit ? "Custody records and new admissions" : "Assigned custody and inmate records" },
    visitors: { label: "Visit operations", note: "Appointments and gate activity" },
    "transfer-analytics": { label: "Transfer Analytics", note: "Transfer volumes and request details" },
    release: { label: "Release & discharge", note: "Eligibility, clearance, and authorization" },
    access: { label: "User management", note: "Personnel accounts and role assignments" },
    prisons: { label: "Prison registry", note: "Facility and block information" },
    housing: { label: "Housing & cells", note: "Blocks, cells, and occupancy" },
  };
  const cards = profile.primary
    .map((id): View => id === "transfers" ? "transfer-analytics" : id)
    .filter((id) => navigationItems.some((item) => item.id === id))
    .map((id) => ({ id, ...cardDetails[id] }));
  return (
    <>
      <section className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2876a8]">
            {profile.label}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#526579]">
            {profile.summary}
          </p>
        </div>
        <span className="border-l-2 border-[#c58a36] pl-3 text-xs font-bold uppercase tracking-[0.12em] text-[#748696]">
          Secure operations
        </span>
      </section>
      {cards.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <button
              onClick={() => onNavigate(card.id)}
              className="group relative overflow-hidden rounded-[5px] border border-[#dce4e7] bg-[#fffdf9] p-6 text-left shadow-[0_12px_30px_rgba(35,54,72,0.05)] transition hover:-translate-y-0.5 hover:border-[#aac3cf] hover:shadow-[0_16px_34px_rgba(35,54,72,0.09)]"
              key={card.id}
            >
              <span className="absolute inset-y-0 left-0 w-1 bg-[#2876a8]" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#2876a8]">
                Workspace
              </span>
              <h2 className="mt-5 font-['Georgia',_'Times_New_Roman',serif] text-[23px] font-medium tracking-[-0.03em] text-[#132337]">
                {card.label}
              </h2>
              <p className="mt-2 text-xs text-[#748696]">{card.note}</p>
              <span className="mt-6 inline-block text-[11px] font-extrabold text-[#2876a8]">
                Open module →
              </span>
            </button>
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-[#d9e2ec] bg-white p-6 text-sm text-[#526579]">
          Your role does not currently have an operational workspace assigned.
          Contact your system administrator to review your role.
        </section>
      )}
    </>
  );
}

function ModuleView({ view, onNavigate, userRole, userPrisonId }: { view: View; onNavigate: (view: View) => void; userRole: string; userPrisonId?: string }) {
  const roleProfile = getRoleProfile(userRole);
  switch (view) {
    case "inmates": case "profile": case "admission": case "sentences":
      return <InmateManagement canAdmit={roleProfile.canAdmit} userRole={userRole} section={view === "admission" ? "admission" : "overview"} onBack={() => onNavigate("inmates")} />;
    case "visitors":
      return <Visitors />;
    case "release":
      return <ReleaseManagement />;
    case "access":
      return <UserAccess />;
    case "transfer-analytics":
      return <TransferAnalytics />;
    case "transfers":
      return <TransferManagement />;
    case "prisons":
      return <PrisonRegistry key="prisons" canManage={roleProfile.canManagePrisons} />;
    case "housing":
      return <PrisonRegistry key="housing" canManage={roleProfile.canManagePrisons} mode="housing" assignedPrisonId={userPrisonId ?? ""} assignedPrisonRequired={["OFFICER IN CHARGE", "RECORDS OFFICER"].includes(normalizeRole(userRole))} />;
    case "overview":
      return null;
  }
}

export default function Dashboard() {
  const { user, logout, authError } = useAuth();
  const roleProfile = getRoleProfile(user?.role);
  const [assignedPrison, setAssignedPrison] = useState<{ name: string; location: string | null } | null>(null);
  const visibleNavigation = navigation.filter((item) =>
    item.id === "transfer-analytics"
      ? roleProfile.workspaces.includes("transfers")
      : roleProfile.workspaces.includes(item.id as Workspace),
  );
  const [view, setView] = useState<View>("overview");
  const [incomingTransferCount, setIncomingTransferCount] = useState(0);
  const active = navigation.find((item) => item.id === view) ?? navigation[0];

  useEffect(() => {
    const prisonId = user?.prisonId;
    if (!prisonId || !roleProfile.workspaces.includes("transfers")) {
      setIncomingTransferCount(0);
      return;
    }
    let live = true;
    const refreshIncomingCount = () => {
      transferService.getTransfers({ prisonId })
        .then((records) => {
          if (!live) return;
          const openStatuses = new Set(["PENDING", "APPROVED", "CONFIRMED", "IN_TRANSIT"]);
          setIncomingTransferCount(records.filter((transfer) =>
            transfer.destinationPrisonId === prisonId && openStatuses.has(transfer.status),
          ).length);
        })
        .catch(() => {
          // Keep the last known count when a brief refresh fails.
        });
    };
    refreshIncomingCount();
    const interval = window.setInterval(refreshIncomingCount, 30_000);
    window.addEventListener("focus", refreshIncomingCount);
    return () => {
      live = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshIncomingCount);
    };
  }, [user?.prisonId, roleProfile.workspaces]);

  const incomingBadge = () => incomingTransferCount > 0 && (
    <span aria-label={`${incomingTransferCount} incoming transfers awaiting completion`} className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-[#db5947] px-1 text-[10px] font-bold leading-none text-white">
      {incomingTransferCount > 99 ? "99+" : incomingTransferCount}
    </span>
  );

  useEffect(() => {
    if (!user?.prisonId) {
      setAssignedPrison(null);
      return;
    }
    let live = true;
    prisonService.getPrison(user.prisonId)
      .then((prison) => {
        if (live) setAssignedPrison({ name: prison.name, location: prison.location });
      })
      .catch(() => {
        if (live) setAssignedPrison(null);
      });
    return () => { live = false; };
  }, [user?.prisonId]);

  return (
    <div className="min-h-screen bg-[#f5f7fa] font-['DM_Sans',_'Segoe_UI',sans-serif] text-[#182638]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[264px] flex-col border-r border-white/[0.06] bg-[#101a2d] text-white lg:flex">
        <div className="flex h-[76px] items-center gap-3 border-b border-white/[0.08] px-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#0e8c94] text-sm font-extrabold tracking-wide text-white">MP</span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-white" style={{ color: "#ffffff" }}>{assignedPrison?.name ?? "Malawi Prison Management"}</p>
            {assignedPrison?.location && <p className="truncate text-[10px] text-slate-400" style={{ color: "#cbd5e1" }}>{assignedPrison.location}</p>}
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Primary navigation">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Operational modules</p>
          {visibleNavigation.filter((item) => item.id === "overview").map((item) => (
            <button
              aria-current={view === item.id ? "page" : undefined}
              className={`relative flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] transition-colors ${view === item.id ? "bg-[#16435a] font-semibold text-white before:absolute before:left-0 before:h-7 before:w-[3px] before:rounded-r before:bg-[#36c6bf]" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"}`}
              key={item.id}
              onClick={() => setView(item.id)}
            >
              <NavigationIcon name={item.short} />
              <span className="truncate">{item.label}</span>
              {item.id === "transfers" && incomingBadge()}
            </button>
          ))}
          {visibleNavigation.filter((item) => item.id !== "overview").map((item) => (
            <button
              aria-current={view === item.id ? "page" : undefined}
              className={`relative flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] transition-colors ${view === item.id ? "bg-[#16435a] font-semibold text-white before:absolute before:left-0 before:h-7 before:w-[3px] before:rounded-r before:bg-[#36c6bf]" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"}`}
              key={item.id}
              onClick={() => setView(item.id)}
            >
              <NavigationIcon name={item.short} />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-white/[0.08] p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#26364e] text-xs font-bold text-[#d9e7f5]">
              {(user?.name ?? "A").slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">
                {user?.name ?? "Administrator"}
              </p>
              <p className="truncate text-[10px] text-slate-400">
                {user?.role ?? "Prototype"}
              </p>
            </div>
            {user && (
              <button
                onClick={() => void logout()}
                className="rounded-md px-2 py-1.5 text-[11px] font-medium text-slate-400 hover:bg-white/10 hover:text-white"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </aside>
      <main className="lg:pl-[264px]">
        <header className="sticky top-0 z-10 flex min-h-20 items-center justify-between border-b border-[#dfe6ed]/80 bg-[#f4f7fb]/90 px-5 backdrop-blur-md sm:px-8">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2876a8]">
              Operations / {active.label}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-[13px] font-bold">
                {user?.name ?? "Authorized officer"}
              </p>
              <p className="text-[10px] text-[#7a8898]">
                {user?.role ?? "Authorized officer"}
              </p>
            </div>
            {
              <button
                onClick={() => void logout()}
                className="rounded-[4px] border border-[#d5dee7] bg-white px-3 py-2 text-[11px] font-extrabold text-[#587087] transition hover:border-[#7fa9c3] hover:text-[#1d5f86]"
              >
                Sign out
              </button>
            }
          </div>
        </header>
        <div className="p-5 sm:p-8">
          {authError && (
            <p
              className="mb-5 rounded-lg border border-[#f4c8c8] bg-[#fff3f3] px-4 py-3 text-sm text-[#b42318]"
              role="alert"
            >
              {authError}
            </p>
          )}
          <div className="mb-7 flex items-center gap-2 overflow-x-auto lg:hidden">
            {visibleNavigation.map((item) => (
              <button
                onClick={() => setView(item.id)}
                className={`whitespace-nowrap rounded-[4px] border px-3 py-2 text-xs font-bold ${view === item.id ? "border-[#087f9b] bg-[#087f9b] text-white" : "border-[#dfe6ed] bg-white text-[#526a7c]"}`}
                key={item.id}
              >
                {item.label}{item.id === "transfers" && incomingTransferCount > 0 ? ` (${incomingTransferCount})` : ""}
              </button>
            ))}
          </div>
          {view === "overview" ? <Overview onNavigate={setView} role={user?.role ?? ""} navigationItems={visibleNavigation} /> : <div className="module-host"><ModuleView view={view} onNavigate={setView} userRole={user?.role ?? ""} userPrisonId={user?.prisonId ?? undefined} /></div>}
        </div>
      </main>
    </div>
  );
}
