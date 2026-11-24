import { useEffect, useMemo, useState } from "react";
import { visitorService, type Visitor } from "../api/visitorService";
import "./visitorManagement.css";

type AnalyticsPeriod = "week" | "month" | "year" | "all";

function classifyVisit(visitor: Visitor) {
  const type = visitor.visitType || "";
  if (/legal|attorney|lawyer|counsel/i.test(type)) return "Legal";
  if (/family|friend/i.test(type)) return "Family & friends";
  if (/official|professional|staff|government/i.test(type)) return "Official";
  return "Other";
}

export default function VisitorAnalytics() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [period, setPeriod] = useState<AnalyticsPeriod>("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    visitorService
      .getVisitors()
      .then((records) => {
        if (active) setVisitors(records);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Could not load visit analytics.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reload]);

  const analytics = useMemo(() => {
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setHours(0, 0, 0, 0);

    if (period === "week") periodStart.setDate(periodStart.getDate() - 6);
    if (period === "month") periodStart.setDate(periodStart.getDate() - 29);
    if (period === "year") periodStart.setFullYear(periodStart.getFullYear() - 1);

    const filtered = period === "all"
      ? visitors
      : visitors.filter((visitor) => {
          if (!visitor.date) return false;
          const date = new Date(`${visitor.date}T00:00:00`);
          return !Number.isNaN(date.getTime()) && date >= periodStart && date <= now;
        });

    const types = filtered.reduce<Record<string, number>>((counts, visitor) => {
      const category = classifyVisit(visitor);
      counts[category] = (counts[category] || 0) + 1;
      return counts;
    }, {});

    const uniqueVisitors = new Set(
      filtered.map((visitor) => visitor.name.trim().toLowerCase()).filter(Boolean),
    ).size;

    let buckets: { label: string; count: number }[] = [];

    if (period === "week") {
      buckets = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(periodStart);
        date.setDate(periodStart.getDate() + index);
        const key = date.toISOString().slice(0, 10);
        return {
          label: date.toLocaleDateString(undefined, { weekday: "short" }),
          count: filtered.filter((visitor) => visitor.date === key).length,
        };
      });
    } else if (period === "month") {
      buckets = Array.from({ length: 5 }, (_, index) => {
        const start = new Date(periodStart);
        start.setDate(periodStart.getDate() + index * 7);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const count = filtered.filter((visitor) => {
          if (!visitor.date) return false;
          const date = new Date(`${visitor.date}T00:00:00`);
          return date >= start && date <= end;
        }).length;
        return {
          label: start.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
          count,
        };
      });
    } else {
      const monthCount = period === "year" ? 12 : 6;
      buckets = Array.from({ length: monthCount }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - monthCount + 1 + index, 1);
        return {
          label: date.toLocaleDateString(undefined, { month: "short", year: period === "all" ? "2-digit" : undefined }),
          count: filtered.filter((visitor) => {
            if (!visitor.date) return false;
            const visitDate = new Date(`${visitor.date}T00:00:00`);
            return visitDate.getFullYear() === date.getFullYear() && visitDate.getMonth() === date.getMonth();
          }).length,
        };
      });
    }

    return { filtered, types, uniqueVisitors, buckets };
  }, [period, visitors]);

  const maxCount = Math.max(...analytics.buckets.map((bucket) => bucket.count), 1);

  return (
    <main className="page-content visitor-dashboard visitor-analytics-page" id="visitor-dashboard">
      <header className="analytics-page-heading">
        <div>
          <p className="eyebrow">FACILITY OPERATIONS / ANALYTICS</p>
          <h1>Visitor Analytics</h1>
          <p>Monitor visit activity, visitor volume, and visit categories.</p>
        </div>
        <button type="button" className="analytics-refresh" onClick={() => setReload((count) => count + 1)} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh data"}
        </button>
      </header>

      {error && (
        <p className="pending-note" role="alert">
          {error}{" "}
          <button type="button" className="history-retry" onClick={() => setReload((count) => count + 1)}>Retry</button>
        </p>
      )}

      <section className="visitor-analytics" aria-labelledby="visitor-analytics-title">
        <div className="analytics-heading">
          <div>
            <p className="visitor-section-kicker">Visit performance</p>
            <h2 id="visitor-analytics-title">Visitor activity overview</h2>
          </div>
          <div className="analytics-periods" role="group" aria-label="Analytics period">
            {([["week", "Week"], ["month", "Month"], ["year", "Year"], ["all", "All time"]] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={period === value ? "selected" : ""}
                aria-pressed={period === value}
                onClick={() => setPeriod(value)}
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
              <strong>{analytics.filtered.length}</strong>
              <small>{period === "all" ? "Across all records" : `In the selected ${period}`}</small>
            </article>
            <article>
              <span>Unique visitors</span>
              <strong>{analytics.uniqueVisitors}</strong>
              <small>Distinct visitor names</small>
            </article>
            <article>
              <span>Family &amp; friends</span>
              <strong>{analytics.types["Family & friends"] || 0}</strong>
              <small>Family visit volume</small>
            </article>
          </div>

          <div className="analytics-chart" aria-label="Visitor volume chart">
            <div className="analytics-chart-heading">
              <span>Visitor volume</span>
              <strong>{analytics.filtered.length} visits</strong>
            </div>
            {loading ? (
              <p className="analytics-loading">Loading analytics…</p>
            ) : (
              <div className="analytics-bars">
                {analytics.buckets.map((bucket) => {
                  const height = Math.max(bucket.count ? 18 : 4, (bucket.count / maxCount) * 100);
                  return (
                    <div className="analytics-bar-item" key={bucket.label}>
                      <strong>{bucket.count}</strong>
                      <div className="analytics-bar-track"><span style={{ height: `${height}%` }} /></div>
                      <small>{bucket.label}</small>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="analytics-breakdown">
            <div className="analytics-chart-heading"><span>Visits by type</span></div>
            {[["Family & friends", "#2563eb"], ["Legal", "#14a38b"], ["Official", "#d97706"], ["Other", "#94a3b8"]].map(([type, color]) => {
              const count = analytics.types[type] || 0;
              const percentage = analytics.filtered.length ? Math.round((count / analytics.filtered.length) * 100) : 0;
              return (
                <div className="analytics-type-row" key={type}>
                  <div><i style={{ background: color }} /><span>{type}</span></div>
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
