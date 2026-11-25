import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext.tsx";
import "./visitorManagement.css";
import {
  visitorService,
  type InmateLookup,
  type Visitor,
} from "../api/visitorService";

type FormState = {
  name: string;
  date: string;
  startTime: string;
  endTime: string;
};

type VisitorLogView = "all" | "upcoming" | "family" | "today";
type InmateHistoryView = "all" | "family" | "legal";
type AnalyticsPeriod = "week" | "month" | "year" | "all";

const emptyForm: FormState = {
  name: "",
  date: new Date().toISOString().slice(0, 10),
  startTime: "",
  endTime: "",
};

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    if (error.response?.status === 401) {
      return "Authentication is required. Sign in before managing visits.";
    }
    if (!error.response)
      return "The visits service is unreachable. Please try again.";
    return error.response.data?.message || error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

export default function Visitors() {
  const { can } = useAuth();
  const canReadVisits = can("visits:read");
  const canCreateFamilyVisit = can("visits:create:family");
  const canReadInmates = can("inmates:read");
  const canLookupInmates = canCreateFamilyVisit || canReadInmates;
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [inmates, setInmates] = useState<InmateLookup[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [selectedInmate, setSelectedInmate] = useState<InmateLookup | null>(
    null,
  );
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [visitorsError, setVisitorsError] = useState("");
  const [visitorsReload, setVisitorsReload] = useState(0);
  const [loadingInmates, setLoadingInmates] = useState(canLookupInmates);
  const [inmatesError, setInmatesError] = useState("");
  const [inmatesReload, setInmatesReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [logView, setLogView] = useState<VisitorLogView>("all");
  const [inmateHistory, setInmateHistory] = useState<Visitor[]>([]);
  const [historyView, setHistoryView] = useState<InmateHistoryView>("all");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyReload, setHistoryReload] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>("month");
  const visitorLogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!canReadVisits) return;
    let active = true;
    void Promise.resolve()
      .then(() => {
        if (!active) return undefined;
        setLoading(true);
        setVisitorsError("");
        return visitorService.getVisitors();
      })
      .then((records) => { if (active && records) setVisitors(records); })
      .catch((error: unknown) => {
        if (active) setVisitorsError(getErrorMessage(error, "Could not load visit records."));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [canReadVisits, visitorsReload]);

  useEffect(() => {
    if (!selectedInmate?.id || !canReadVisits) return;

    let active = true;
    void Promise.resolve()
      .then(() => {
        if (!active) return undefined;
        setHistoryLoading(true);
        setHistoryError("");
        return visitorService.getInmateVisitHistory(selectedInmate.id);
      })
      .then((records) => { if (active && records) setInmateHistory(records); })
      .catch((error: unknown) => {
        if (active) setHistoryError(getErrorMessage(error, "Could not load inmate visit history."));
      })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [selectedInmate?.id, historyReload, canReadVisits]);

  useEffect(() => {
    if (!canLookupInmates) return;
    let active = true;
    void Promise.resolve()
      .then(() => {
        if (!active) return undefined;
        setLoadingInmates(true);
        setInmatesError("");
        return visitorService.getInmates();
      })
      .then((records) => { if (active && records) setInmates(records); })
      .catch((error: unknown) => {
        if (active) setInmatesError(getErrorMessage(error, "Could not load inmate records."));
      })
      .finally(() => { if (active) setLoadingInmates(false); });
    return () => { active = false; };
  }, [canLookupInmates, inmatesReload]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    const initialUpdate = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(initialUpdate);
    };
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  function isUpcoming(visitor: Visitor) {
    const visitTime = Date.parse(`${visitor.date}T${visitor.time}`);
    return currentTime > 0 && Number.isFinite(visitTime) && visitTime >= currentTime;
  }
  const filteredVisitors = visitors.filter((visitor) => {
    if (logView === "upcoming") return isUpcoming(visitor);
    if (logView === "family") return /family|friend/i.test(visitor.visitType);
    if (logView === "today") return visitor.date === today;
    return true;
  });
  const upcomingVisits = visitors.filter(isUpcoming).length;
  const familyVisits = visitors.filter((visitor) => /family|friend/i.test(visitor.visitType)).length;
  const todayLogs = visitors.filter((visitor) => visitor.date === today).length;
  const isLegalVisit = (visitor: Visitor) =>
    /legal|attorney|lawyer|counsel/i.test(visitor.visitType);
  const filteredInmateHistory = inmateHistory.filter((visitor) => {
    if (historyView === "legal") return isLegalVisit(visitor);
    if (historyView === "family") return /family|friend/i.test(visitor.visitType);
    return true;
  });

  function showVisitorLog(view: VisitorLogView) {
    setLogView(view);
    visitorLogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateForm(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm(clearInmate = true) {
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
    if (clearInmate) setSelectedInmate(null);
  }

  function refreshVisitors() {
    setLoading(true);
    setVisitorsError("");
    setVisitorsReload((count) => count + 1);
  }

  function refreshInmates() {
    setLoadingInmates(true);
    setInmatesError("");
    setInmatesReload((count) => count + 1);
  }

  async function registerVisitor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreateFamilyVisit) return;
    const visitorName = form.name.trim();
    if (!visitorName) {
      setNotice("Enter the visitor full name.");
      return;
    }
    if (!selectedInmate?.id) {
      setNotice(
        "Search for an inmate and select a result before scheduling the visit.",
      );
      return;
    }
    if (!form.date || !form.startTime || !form.endTime) {
      setNotice("Enter the visit date, start time, and end time.");
      return;
    }
    if (form.endTime <= form.startTime) {
      setNotice("The end time must be later than the start time.");
      return;
    }

    setSaving(true);
    setNotice("");
    try {
      const result = await visitorService.registerVisitor({
        visitorFullName: visitorName,
        inmateId: selectedInmate.id,
        visitDate: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
      });
      setVisitors((current) => [result, ...current.filter((visitor) => visitor.id !== result.id)]);
      setVisitorsError("");
      resetForm(false);
      setHistoryReload((count) => count + 1);
      setNotice("Visit recorded successfully.");
      refreshVisitors();
    } catch (error) {
      setNotice(
        axios.isAxiosError(error) && !error.response
          ? "The visit could not be confirmed; the API may have saved it before the connection failed. Refresh the visit log before retrying."
          : getErrorMessage(error, "Could not register visitor."),
      );
    } finally {
      setSaving(false);
    }
  }

  const analytics = useMemo(() => {
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setHours(0, 0, 0, 0);

    if (analyticsPeriod === "week") periodStart.setDate(periodStart.getDate() - 6);
    if (analyticsPeriod === "month") periodStart.setDate(periodStart.getDate() - 29);
    if (analyticsPeriod === "year") periodStart.setFullYear(periodStart.getFullYear() - 1);

    const periodVisitors = analyticsPeriod === "all"
      ? visitors
      : visitors.filter((visitor) => {
          if (!visitor.date) return false;
          const date = new Date(`${visitor.date}T00:00:00`);
          return !Number.isNaN(date.getTime()) && date >= periodStart && date <= now;
        });

    const classify = (visitor: Visitor) => {
      const type = visitor.visitType || "";
      if (/legal|attorney|lawyer|counsel/i.test(type)) return "Legal";
      if (/family|friend/i.test(type)) return "Family & friends";
      if (/official|professional|staff|government/i.test(type)) return "Official";
      return "Other";
    };

    const typeCounts = periodVisitors.reduce<Record<string, number>>((counts, visitor) => {
      const category = classify(visitor);
      counts[category] = (counts[category] || 0) + 1;
      return counts;
    }, {});

    const uniqueVisitors = new Set(periodVisitors.map((visitor) => visitor.name.trim().toLowerCase()).filter(Boolean)).size;

    let buckets: { label: string; count: number }[] = [];
    if (analyticsPeriod === "week") {
      buckets = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(periodStart);
        date.setDate(periodStart.getDate() + index);
        const key = date.toISOString().slice(0, 10);
        return {
          label: date.toLocaleDateString(undefined, { weekday: "short" }),
          count: periodVisitors.filter((visitor) => visitor.date === key).length,
        };
      });
    } else if (analyticsPeriod === "month") {
      buckets = Array.from({ length: 5 }, (_, index) => {
        const start = new Date(periodStart);
        start.setDate(periodStart.getDate() + index * 7);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const count = periodVisitors.filter((visitor) => {
          if (!visitor.date) return false;
          const date = new Date(`${visitor.date}T00:00:00`);
          return date >= start && date <= end;
        }).length;
        return {
          label: start.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
          count,
        };
      });
    } else if (analyticsPeriod === "year" || analyticsPeriod === "all") {
      const monthCount = analyticsPeriod === "year" ? 12 : 6;
      buckets = Array.from({ length: monthCount }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - monthCount + 1 + index, 1);
        const keyYear = date.getFullYear();
        const keyMonth = date.getMonth();
        return {
          label: date.toLocaleDateString(undefined, { month: "short" }),
          count: periodVisitors.filter((visitor) => {
            if (!visitor.date) return false;
            const visitDate = new Date(`${visitor.date}T00:00:00`);
            return visitDate.getFullYear() === keyYear && visitDate.getMonth() === keyMonth;
          }).length,
        };
      });
    }

    return {
      periodVisitors,
      typeCounts,
      uniqueVisitors,
      buckets,
    };
  }, [analyticsPeriod, visitors]);

  if (!canReadVisits) {
    return (
      <main className="page-content visitor-dashboard" id="visitor-dashboard">
        <p className="pending-note" role="alert">
          Your role does not have permission to view visit records.
        </p>
      </main>
    );
  }

  return (
    <main className="page-content visitor-dashboard" id="visitor-dashboard">
      <header className="page-heading">
        <div>
          <p className="eyebrow">FACILITY OPERATIONS / VISITORS</p>
          <h1>Visitor Management</h1>
          <p className="page-description">
            Schedule visits using the fields accepted by the visits API.
          </p>
        </div>
      </header>

      {notice && (
        <p className="pending-note" role="status">
          {notice}
        </p>
      )}
      {inmatesError && (
        <p className="pending-note" role="alert">
          {inmatesError}{" "}
          <button type="button" className="history-retry" onClick={refreshInmates}>
            Retry inmate list
          </button>
        </p>
      )}

      <section
        className="visitor-stats"
        aria-label="Visit operations summary"
      >
        <button
          className={`visitor-stat${logView === "upcoming" ? " active" : ""}`}
          type="button"
          aria-pressed={logView === "upcoming"}
          onClick={() => showVisitorLog("upcoming")}
        >
          <div>
            <span>Upcoming visits</span>
            <strong>{upcomingVisits}</strong>
          </div>
          <b className="stat-mark">VIS</b>
        </button>
        <button
          className={`visitor-stat${logView === "all" ? " active" : ""}`}
          type="button"
          aria-pressed={logView === "all"}
          onClick={() => showVisitorLog("all")}
        >
          <div>
            <span>API visit records</span>
            <strong>{visitors.length}</strong>
          </div>
          <b className="stat-mark pending">PEN</b>
        </button>
        <button
          className={`visitor-stat${logView === "family" ? " active" : ""}`}
          type="button"
          aria-pressed={logView === "family"}
          onClick={() => showVisitorLog("family")}
        >
          <div>
            <span>Family &amp; friends</span>
            <strong>{familyVisits}</strong>
          </div>
          <b className="stat-mark lock">SEC</b>
        </button>
        <button
          className={`visitor-stat${logView === "today" ? " active" : ""}`}
          type="button"
          aria-pressed={logView === "today"}
          onClick={() => showVisitorLog("today")}
        >
          <div>
            <span>Today's total logs</span>
            <strong>{todayLogs}</strong>
          </div>
          <b className="stat-mark neutral">LOG</b>
        </button>
      </section>

      {canCreateFamilyVisit && <div className=" my-10">
        <section className="dashboard-section visitor-registration">
          <div className="visitor-section-heading">
            <div>
              <p className="visitor-section-kicker">Visits</p>
              <h2>Record a family &amp; friends visit</h2>
            </div>
          </div>
          <form className="visitor-form" onSubmit={registerVisitor}>
            <label>
              Visitor full name
              <input
                required
                placeholder="e.g. Jonathan R. Vance"
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
              />
            </label>
            <label>
              Inmate
              <select
                required
                value={selectedInmate?.id || ""}
                disabled={loadingInmates || !inmates.length}
                onChange={(event) => {
                  setSelectedInmate(
                    inmates.find((inmate) => inmate.id === event.target.value) || null,
                  );
                }}
              >
                <option value="">
                  {loadingInmates ? "Loading inmates..." : "Select an inmate"}
                </option>
                {inmates.map((inmate) => (
                  <option key={inmate.id} value={inmate.id}>
                    {inmate.fullName}{inmate.cellId ? ` · Cell ID ${inmate.cellId}` : ""}
                  </option>
                ))}
              </select>
              <span className="form-help">
                The selected inmate ID will be sent as <code>inmateId</code>.
              </span>
            </label>
            <label>
              Visit date
              <input
                required
                type="date"
                min={emptyForm.date}
                value={form.date}
                onChange={(event) => updateForm("date", event.target.value)}
              />
            </label>
            <label>
              Start time
              <input
                required
                type="time"
                value={form.startTime}
                onChange={(event) =>
                  updateForm("startTime", event.target.value)
                }
              />
            </label>
            <label>
              End time
              <input
                required
                type="time"
                value={form.endTime}
                onChange={(event) => updateForm("endTime", event.target.value)}
              />
            </label>
            
            <button className="primary-button" type="submit" disabled={saving || !selectedInmate?.id}>
              {saving ? "Registering..." : "Register visit"}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => resetForm()}
            >
              Clear
            </button>
          </form>
        </section>

        {/* <section className="dashboard-section visitor-sessions">
                <div className="visitor-section-heading">
                    <div>
                        <p className="visitor-section-kicker">Gatehouse touch controls</p>
                        <h2>Gatehouse controls</h2>
                    </div>
                    <span className="live-port">LIVE PORT</span>
                </div>
                <div className="gate-actions">
                    <p className="pending-note">The current API supports scheduled visit records only. Gate entry and exit controls are not available.</p>
                </div>
                <div className="station-details">
                    <span>Active station terminal <b>GT-PORT-04</b></span>
                    <span>Gatekeeper officer ID <b>SEC-OFF-882</b></span>
                    <span>System synchronization <b className="sync-status">Optimal</b></span>
                </div>
                <div className="session-log-heading">
                    <div>
                        <p className="visitor-section-kicker">Auto-updating</p>
                        <h2>Active session logs</h2>
                    </div>
                    <div className="session-filter">
                        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                            <option>All</option><option>Scheduled</option>
                        </select>
                    </div>
                </div>
                {loading ? <p>Loading visitor records...</p> : filteredVisitors.length === 0 ? <p>No visitor records found.</p> : (
                    <div className="visitor-list">
                        {filteredVisitors.map((visitor) => (
                            <article className="visitor-row" key={visitor.id}>
                                <div><strong>{visitor.name}</strong><span>{visitor.inmate} · {visitor.date} at {visitor.time}</span></div>
                                <span>{visitor.status}</span>
                            </article>
                        ))}
                    </div>
                )}
            </section> */}
      </div>}
      <section className="dashboard-section visitor-log-table" aria-labelledby="inmate-history-title">
        <div className="visitor-section-heading">
          <div>
            <p className="visitor-section-kicker">Inmate records</p>
            <h2 id="inmate-history-title">
              {selectedInmate ? `${selectedInmate.fullName} · Visit history` : "Inmate visit history"}
            </h2>
          </div>
          <div className="history-inmate-picker">
            <label htmlFor="history-inmate-select">Choose inmate</label>
            <select
              id="history-inmate-select"
              value={selectedInmate?.id || ""}
              disabled={loadingInmates || !inmates.length}
              onChange={(event) => {
                setSelectedInmate(
                  inmates.find((inmate) => inmate.id === event.target.value) || null,
                );
              }}
            >
              <option value="">
                {loadingInmates ? "Loading inmates..." : "Select an inmate"}
              </option>
              {inmates.map((inmate) => (
                <option key={inmate.id} value={inmate.id}>
                  {inmate.fullName}{inmate.cellId ? ` · Cell ID ${inmate.cellId}` : ""}
                </option>
              ))}
            </select>
            <span className="live-port">
              {selectedInmate ? `${filteredInmateHistory.length} RECORDS` : "0 RECORDS"}
            </span>
          </div>
        </div>
        <div className="history-filter" role="group" aria-label="Filter inmate visit history">
          {([
            ["all", "All history"],
            ["family", "Family & friends"],
            ["legal", "Legal visits"],
          ] as const).map(([view, label]) => (
            <button
              key={view}
              type="button"
              className={historyView === view ? "selected" : ""}
              aria-pressed={historyView === view}
              onClick={() => setHistoryView(view)}
            >
              {label}
            </button>
          ))}
        </div>
        {!selectedInmate ? (
          <p className="pending-note">Select an inmate in the visit form above to load their visit history.</p>
        ) : historyLoading ? (
          <p role="status">Loading visit history…</p>
        ) : historyError ? (
          <p className="pending-note" role="alert">
            {historyError} <button type="button" className="history-retry" onClick={() => setHistoryReload((count) => count + 1)}>Retry</button>
          </p>
        ) : filteredInmateHistory.length === 0 ? (
          <p className="pending-note">No {historyView === "all" ? "visit" : historyView === "legal" ? "legal visit" : "family or friends visit"} records found for this inmate.</p>
        ) : (
          <div className="visitor-log-scroll">
            <table>
              <thead>
                <tr><th>Visit type</th><th>Visitor</th><th>Date</th><th>Start</th><th>End</th><th>Duration</th></tr>
              </thead>
              <tbody>
                {filteredInmateHistory.map((visitor) => (
                  <tr key={visitor.id}>
                    <td>{isLegalVisit(visitor) ? "Legal" : visitor.visitType || "Family / friends"}</td>
                    <td><strong>{visitor.name || "Name unavailable"}</strong></td>
                    <td>{visitor.date || "—"}</td>
                    <td>{visitor.time || "—"}</td>
                    <td>{visitor.endTime || "—"}</td>
                    <td>{visitor.durationMinutes != null ? `${visitor.durationMinutes} min` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section
        className="dashboard-section visitor-log-table"
        aria-labelledby="visitor-log-title"
        ref={visitorLogRef}
      >
        <div className="visitor-section-heading mt-10">
          <div>
            <p className="visitor-section-kicker">Visits</p>
            <h2 id="visitor-log-title">
              {logView === "upcoming"
                ? "Upcoming visits"
                : logView === "family"
                  ? "Family & friends visits"
                  : logView === "today"
                    ? "Today's visitor logs"
                    : "All visitor records"}
            </h2>
          </div>
          <span className="live-port">{filteredVisitors.length} RECORDS</span>
        </div>
        {visitorsError ? (
          <p className="pending-note" role="alert">
            {visitorsError}{" "}
            <button type="button" className="history-retry" onClick={refreshVisitors}>
              Retry visit log
            </button>
          </p>
        ) : loading ? (
          <p>Loading visitor records...</p>
        ) : filteredVisitors.length === 0 ? (
          <p className="pending-note">
            No visit records match the current filter.
          </p>
        ) : (
          <div className="visitor-log-scroll">
            <table>
              <thead>
                <tr>
                  <th>Visitor</th>
                  <th>Inmate</th>
                  <th>Visit date</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Visit type</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisitors.map((visitor) => (
                  <tr key={visitor.id}>
                    <td>
                      <strong>{visitor.name || "Unnamed visitor"}</strong>
                      <small>Visit ID: {visitor.id}</small>
                    </td>
                    <td>
                      <strong>{visitor.inmate || "Inmate unavailable"}</strong>
                      <small>{visitor.inmateId}</small>
                    </td>
                    <td>{visitor.date || "—"}</td>
                    <td>{visitor.time || "—"}</td>
                    <td>{visitor.endTime || "—"}</td>
                    <td>
                      <span className="visitor-state">{visitor.visitType || "Not specified"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="visitor-analytics" aria-labelledby="visitor-analytics-title">
        <div className="analytics-heading">
          <div>
            <p className="visitor-section-kicker">Visitor analytics</p>
            <h2 id="visitor-analytics-title">Visit activity overview</h2>
          </div>
          <div className="analytics-periods" role="group" aria-label="Analytics period">
            {([
              ["week", "Week"],
              ["month", "Month"],
              ["year", "Year"],
              ["all", "All time"],
            ] as const).map(([period, label]) => (
              <button
                key={period}
                type="button"
                className={analyticsPeriod === period ? "selected" : ""}
                aria-pressed={analyticsPeriod === period}
                onClick={() => setAnalyticsPeriod(period)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="analytics-content">
          <div className="analytics-summary">
            <article>
              <span>Total visits</span>
              <strong>{analytics.periodVisitors.length}</strong>
              <small>{analyticsPeriod === "all" ? "Across all records" : `In the selected ${analyticsPeriod}`}</small>
            </article>
            <article>
              <span>Unique visitors</span>
              <strong>{analytics.uniqueVisitors}</strong>
              <small>Distinct visitor names</small>
            </article>
            <article>
              <span>Family &amp; friends</span>
              <strong>{analytics.typeCounts["Family & friends"] || 0}</strong>
              <small>Most common visit category</small>
            </article>
          </div>

          <div className="analytics-chart" aria-label="Visitor volume chart">
            <div className="analytics-chart-heading">
              <span>Visitor volume</span>
              <strong>{analytics.periodVisitors.length} visits</strong>
            </div>
            <div className="analytics-bars">
              {analytics.buckets.map((bucket) => {
                const max = Math.max(...analytics.buckets.map((item) => item.count), 1);
                const height = Math.max(bucket.count ? 18 : 4, (bucket.count / max) * 100);
                return (
                  <div className="analytics-bar-item" key={bucket.label}>
                    <strong>{bucket.count}</strong>
                    <div className="analytics-bar-track">
                      <span style={{ height: `${height}%` }} />
                    </div>
                    <small>{bucket.label}</small>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="analytics-breakdown">
            <div className="analytics-chart-heading">
              <span>Visits by type</span>
            </div>
            { [
              ["Family & friends", "#2563eb"],
              ["Legal", "#14a38b"],
              ["Official", "#d97706"],
              ["Other", "#94a3b8"],
            ].map(([type, color]) => {
              const count = analytics.typeCounts[type] || 0;
              const percentage = analytics.periodVisitors.length
                ? Math.round((count / analytics.periodVisitors.length) * 100)
                : 0;
              return (
                <div className="analytics-type-row" key={type}>
                  <div>
                    <i style={{ background: color }} />
                    <span>{type}</span>
                  </div>
                  <strong>{count}</strong>
                  <small>{percentage}%</small>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
