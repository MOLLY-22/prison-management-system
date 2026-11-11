import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
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

const emptyForm: FormState = {
  name: "",
  date: new Date().toISOString().slice(0, 10),
  startTime: "",
  endTime: "",
};

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    if (error.response?.status === 401) {
      return "Your session has expired. Sign in again before managing visitors.";
    }
    if (!error.response)
      return "The visits service is unreachable. Please try again.";
    return error.response.data?.message || error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

export default function Visitors() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [inmates, setInmates] = useState<InmateLookup[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [selectedInmate, setSelectedInmate] = useState<InmateLookup | null>(
    null,
  );
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingInmates, setLoadingInmates] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    visitorService
      .getVisitors()
      .then(setVisitors)
      .catch((error: unknown) =>
        setNotice(getErrorMessage(error, "Could not load visitor records.")),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    visitorService
      .getInmates()
      .then(setInmates)
      .catch((error: unknown) =>
        setNotice(getErrorMessage(error, "Could not load inmate records.")),
      )
      .finally(() => setLoadingInmates(false));
  }, []);

  const filteredVisitors = visitors;
  const scheduledVisits = visitors.filter(
    (visitor) => visitor.status === "Scheduled",
  ).length;
  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = visitors.filter((visitor) => visitor.date === today).length;

  function updateForm(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
    setSelectedInmate(null);
  }

  async function registerVisitor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const visitorName = form.name.trim();
    if (!visitorName) {
      setNotice("Enter the visitor full name.");
      return;
    }
    if (!selectedInmate?.id || !selectedInmate.visitationAllowed) {
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
      resetForm();
      setNotice("Visitor registered successfully.");
      try {
        const refreshedVisitors = await visitorService.getVisitors();
        setVisitors(refreshedVisitors);
      } catch {
        setNotice("Visitor registered successfully, but the log could not be refreshed.");
      }
    } catch (error) {
      setNotice(getErrorMessage(error, "Could not register visitor."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page-content visitor-dashboard" id="visitor-dashboard">
      <header className="page-heading">
        <div>
          <p className="eyebrow">FACILITY OPERATIONS / RECORDS</p>
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

      <section
        className="visitor-stats"
        aria-label="Visitor operations summary"
      >
        <article className="visitor-stat">
          <div>
            <span>Scheduled visits</span>
            <strong>{scheduledVisits}</strong>
          </div>
          <b className="stat-mark">VIS</b>
        </article>
        <article className="visitor-stat">
          <div>
            <span>API visit records</span>
            <strong>{visitors.length}</strong>
          </div>
          <b className="stat-mark pending">PEN</b>
        </article>
        <article className="visitor-stat">
          <div>
            <span>Visit status</span>
            <strong className="secure">SCHEDULED</strong>
          </div>
          <b className="stat-mark lock">SEC</b>
        </article>
        <article className="visitor-stat">
          <div>
            <span>Today's total logs</span>
            <strong>{todayLogs}</strong>
          </div>
          <b className="stat-mark neutral">LOG</b>
        </article>
      </section>

      <div className=" my-10">
        <section className="dashboard-section visitor-registration">
          <div className="visitor-section-heading">
            <div>
              <p className="visitor-section-kicker">Visits</p>
              <h2>Register a visit</h2>
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
                    {inmate.fullName} · {inmate.cellBlock}
                  </option>
                ))}
              </select>
              <span className="form-help">
                The selected inmate UUID will be sent as <code>inmateId</code>.
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
            
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Registering..." : "Register visit"}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={resetForm}
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
      </div>
      <section
        className="dashboard-section visitor-log-table"
        aria-labelledby="visitor-log-title"
      >
        <div className="visitor-section-heading mt-10">
          <div>
            <p className="visitor-section-kicker">Visits </p>
            <h2 id="visitor-log-title">Visitor log</h2>
          </div>
          <span className="live-port">{filteredVisitors.length} RECORDS</span>
        </div>
        {loading ? (
          <p>Loading visitor records...</p>
        ) : filteredVisitors.length === 0 ? (
          <p className="pending-note">
            No visitor records match the current filter.
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
                  <th>Current state</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisitors.map((visitor) => (
                  <tr key={visitor.id}>
                    <td>
                      <strong>{visitor.name || "Unnamed visitor"}</strong>
                      <small>{visitor.visitorId || "ID unavailable"}</small>
                    </td>
                    <td>
                      <strong>{visitor.inmate || "Inmate unavailable"}</strong>
                      <small>{visitor.inmateId}</small>
                    </td>
                    <td>{visitor.date || "—"}</td>
                    <td>{visitor.time || "—"}</td>
                    <td>{visitor.endTime || "—"}</td>
                    <td>
                      <span className="visitor-state">{visitor.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
