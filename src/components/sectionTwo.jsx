const permissions = [
    ["Inmate management", "Records and biometric data", "full", "full", "view", "none"],
    ["Sentence & custody", "Sentence and custody modification", "full", "full", "none", "none"],
    ["Transfer management", "Transfer requests and authorization", "full", "full", "none", "none"],
    ["Visitor passes", "Issuance and identity verification", "full", "full", "full", "full"],
    ["Release & discharge", "Discharge processing and approval", "full", "review", "none", "none"],
    ["User access control", "Roles, credentials and access policy", "full", "none", "none", "none"],
];

const roles = ["Officer-in-charge", "Senior officer", "Prison officer", "Gatekeeper"];

function PermissionMark({ level }) {
    const labels = { full: "Full access", view: "View only", review: "Review", none: "No access" };
    return (
        <span className={`permission-mark permission-${level}`} aria-label={labels[level]} title={labels[level]}>
            <span aria-hidden="true">{level === "full" ? "✓" : level === "view" ? "◉" : level === "review" ? "↗" : "—"}</span>
        </span>
    );
}

export default function SectionTwo() {
    return (
        <section className="content-panel permission-panel" id="permissions">
            <div className="panel-heading panel-heading-row">
                <div>
                    <h2>UI permission matrix</h2>
                    <p className="panel-description">Configure feature access by operational role.</p>
                </div>
            </div>

            <div className="table-scroll">
                <table className="data-table permission-table">
                    <thead>
                        <tr>
                            <th scope="col">Feature scope</th>
                            {roles.map((role) => <th scope="col" key={role}>{role}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {permissions.map(([name, detail, ...levels]) => (
                            <tr key={name}>
                                <th className="scope-cell" scope="row">
                                    <span>{name}</span>
                                    <small>{detail}</small>
                                </th>
                                {levels.map((level, index) => (
                                    <td key={`${name}-${roles[index]}`}><PermissionMark level={level} /></td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="permission-legend" aria-label="Permission legend">
                <span><PermissionMark level="full" /> Full access</span>
                <span><PermissionMark level="view" /> View only</span>
                <span><PermissionMark level="review" /> Review required</span>
                <span><PermissionMark level="none" /> No access</span>
            </div>
        </section>
    );
}
