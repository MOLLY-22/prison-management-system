const metrics = [
    { label: "Active personnel", value: "142", note: "+3 this week" },
    { label: "Privilege escalations", value: "0", note: "Optimal security" },
    { label: "Failed auth attempts", value: "12", note: "Requires audit", alert: true },
    { label: "Active guards", value: "4", note: "Levels configured" },
];

export default function TopBanner() {
    return (
        <section className="metric-grid" id="overview" aria-label="Access control summary">
            {metrics.map((metric) => (
                <article className="metric-card" key={metric.label}>
                    <p>{metric.label}</p>
                    <div className="metric-value-row">
                        <strong>{metric.value}</strong>
                        <span className={metric.alert ? "metric-alert" : ""}>{metric.note}</span>
                    </div>
                </article>
            ))}
        </section>
    );
}
