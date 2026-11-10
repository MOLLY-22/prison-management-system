const auditEvents = [
    {
        type: "blocked",
        title: "Unauthorized release attempt",
        detail: "Badge SEC-01459 · Gatekeeper Alan Lee · Release & discharge",
        time: "Today, 14:22:05",
        outcome: "Blocked",
    },
    {
        type: "blocked",
        title: "Privilege escalation warning",
        detail: "Badge SEC-01104 · Prison Officer Robert King · Admin token",
        time: "Today, 11:05:41",
        outcome: "Rejected",
    },
    {
        type: "review",
        title: "Invalid badge identifier",
        detail: "External IP 192.168.4.102 · Malformed security hash",
        time: "Yesterday, 23:14:00",
        outcome: "IP flagged",
    },
];

export default function SectionThree() {
    return (
        <section className="content-panel audit-panel" id="audit">
            <div className="panel-heading">
                <h2>Failed authorization audit logs</h2>
                <p className="panel-description">Recent unauthorized access attempts.</p>
            </div>

            <div className="audit-list">
                {auditEvents.map((event) => (
                    <article className={`audit-event audit-${event.type}`} key={event.title}>
                        <span className="audit-symbol" aria-hidden="true">{event.type === "blocked" ? "!" : "⌁"}</span>
                        <div className="audit-copy">
                            <h3>{event.title}</h3>
                            <p>{event.detail}</p>
                        </div>
                        <div className="audit-meta">
                            <time>{event.time}</time>
                            <strong>{event.outcome}</strong>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}
