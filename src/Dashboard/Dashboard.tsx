import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { collectionFrom } from "../api/dataContract";
import { InmateManagement } from "../pages/InmateManagement";
import Visitors from "../pages/Visitors";
import ReleaseManagement from "../pages/ReleaseManagement";
import UserAccess from "../pages/UserAccess";
import TransferManagement from "../pages/TransferManagement";

type View =
  | "overview"
  | "inmates"
  | "visitors"
  | "transfers"
  | "release"
  | "access";
type RecordItem = Record<string, string | number | boolean | null>;

const navigation: { id: View; label: string; short: string }[] = [
  { id: "overview", label: "Overview", short: "OV" },
  { id: "inmates", label: "Inmate census", short: "IN" },
  { id: "visitors", label: "Visitors", short: "VI" },
  { id: "transfers", label: "Transfers", short: "TR" },
  { id: "release", label: "Release & discharge", short: "RD" },
  { id: "access", label: "User access", short: "UA" },
];

const endpointFor: Partial<Record<View, string>> = {
  inmates: "/inmates",
  visitors: "/visitors",
  transfers: "/transfers",
  release: "/releases",
  access: "/users",
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
    setLoading(true);
    api
      .get(resource)
      .then(({ data }) => active && setRecords(collectionFrom<RecordItem>(data)))
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

function Overview({ onNavigate }: { onNavigate: (view: View) => void }) {
  const cards: { label: string; id: View; note: string }[] = [
    {
      label: "Inmate census",
      id: "inmates",
      note: "Records and custody status",
    },
    {
      label: "Visitor control",
      id: "visitors",
      note: "Appointments and gate events",
    },
    {
      label: "Transfer desk",
      id: "transfers",
      note: "Movement requests and approvals",
    },
    {
      label: "Release control",
      id: "release",
      note: "Eligibility and discharge",
    },
  ];
  return (
    <>
      <section className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2876a8]">
            Facility command center
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#526579]">
            Review the operational workspaces used to manage custody, movement,
            visits, release, and staff access.
          </p>
        </div>
        <span className="border-l-2 border-[#c58a36] pl-3 text-xs font-bold uppercase tracking-[0.12em] text-[#748696]">
          Secure operations
        </span>
      </section>
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
      <section className="relative mt-6 overflow-hidden rounded-[5px] bg-[#173a59] p-7 text-white shadow-[0_18px_50px_rgba(23,50,77,0.16)]">
        <div className="absolute right-[-48px] top-[-72px] size-52 rounded-full border border-[#72b7c8]/20" />
        <div className="absolute right-[-20px] top-[-42px] size-32 rounded-full border border-[#c58a36]/25" />
        <p className="relative text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#8bd8df]">
          Operations brief
        </p>
        <p className="relative mt-3 max-w-2xl font-['Georgia',_'Times_New_Roman',serif] text-3xl font-medium tracking-[-0.04em] text-white">
          One command surface for a safer facility.
        </p>
        <p className="relative mt-3 max-w-xl text-sm leading-6 text-[#d5e4ec]">
          Use the navigation to move between related records. Connected tables
          read through the authenticated API client and share the same session.
        </p>
      </section>
    </>
  );
}

function ModuleView({ view }: { view: View }) {
  switch (view) {
    case "inmates":
      return <InmateManagement canAdmit />;
    case "visitors":
      return <Visitors />;
    case "release":
      return <ReleaseManagement />;
    case "access":
      return <UserAccess />;
    case "transfers":
      return <TransferManagement />;
    case "overview":
      return null;
  }
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<View>("overview");
  const active = navigation.find((item) => item.id === view) ?? navigation[0];
  return (
    <div className="min-h-screen bg-[#f4f7fb] font-['DM_Sans',_'Segoe_UI',sans-serif] text-[#17243a]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[250px] flex-col bg-[#0c2038] text-white lg:flex">
        <div className="border-b border-white/10 px-[25px] py-7">
          <div className="flex items-center gap-3">
            <span className="grid size-[42px] place-items-center rounded-[12px] border border-[#087f9b] bg-[#087f9b] font-['Manrope',sans-serif] text-2xl font-extrabold text-white">
              PMS
            </span>
            <div className="text-white">
              <p className="text-[17px] font-extrabold tracking-[-0.04em] text-white">PRISON</p>
              <p className="text-[11px] text-[#94a5bb]">
                Management system
              </p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-2 px-[17px] py-6" aria-label="Primary navigation">
          {navigation.map((item) => (
            <button
              className={`flex min-h-[46px] w-full items-center gap-3 rounded-[9px] border px-3 text-left text-[13px] transition ${view === item.id ? "border-[#087f9b] bg-[#087f9b] font-bold text-white" : "border-transparent text-[#c0ccdb] hover:bg-[#17334f] hover:text-white"}`}
              key={item.id}
              onClick={() => setView(item.id)}
            >
              <span className={`grid size-[29px] place-items-center rounded-lg border text-[9px] font-bold tracking-[0.03em] ${view === item.id ? "border-white/20 text-white" : "border-[#334761] text-[#c0ccdb]"}`}>
                {item.short}
              </span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-white/10 p-5 text-[10px] text-[#8192a9]">
          Secure session
          <br />
          <span className="text-[#8bd8df]">All events monitored</span>
        </div>
      </aside>
      <main className="lg:pl-[250px]">
        <header className="sticky top-0 z-10 flex min-h-20 items-center justify-between border-b border-[#dfe6ed]/80 bg-[#f4f7fb]/90 px-5 backdrop-blur-md sm:px-8">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2876a8]">
              Operations / {active.label}
            </p>
            <h1 className="mt-1 font-['Georgia',_'Times_New_Roman',serif] text-[clamp(28px,4vw,36px)] font-medium leading-[1.1] tracking-[-0.04em] text-[#132d47]">
              {view === "overview" ? "Facility overview" : active.label}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-[13px] font-bold">
                {user?.name ?? "Administrator"}
              </p>
              <p className="text-[10px] text-[#7a8898]">
                {user?.role ?? "Authorized officer"}
              </p>
            </div>
            <button
              onClick={() => void logout()}
              className="rounded-[4px] border border-[#d5dee7] bg-white px-3 py-2 text-[11px] font-extrabold text-[#587087] transition hover:border-[#7fa9c3] hover:text-[#1d5f86]"
            >
              Sign out
            </button>
          </div>
        </header>
        <div className="p-5 sm:p-8">
          <div className="mb-7 flex items-center gap-2 overflow-x-auto lg:hidden">
            {navigation.map((item) => (
              <button
                onClick={() => setView(item.id)}
                className={`whitespace-nowrap rounded-[4px] border px-3 py-2 text-xs font-bold ${view === item.id ? "border-[#087f9b] bg-[#087f9b] text-white" : "border-[#dfe6ed] bg-white text-[#526a7c]"}`}
                key={item.id}
              >
                {item.label}
              </button>
            ))}
          </div>
          {view === "overview" ? <Overview onNavigate={setView} /> : <ModuleView view={view} />}
        </div>
      </main>
    </div>
  );
}
