import { useEffect, useMemo, useState } from "react";
import { userService, type User } from "../api/userService";
import AddUserForm from "../components/addUserForm";
import "./userAccess.css";

type AccessRole = "Officer-in-Charge" | "Senior Prison Officer" | "Prison Officer" | "Records Officer" | "Gatekeeper";

const roles: AccessRole[] = [
    "Officer-in-Charge",
    "Senior Prison Officer",
    "Prison Officer",
    "Records Officer",
    "Gatekeeper",
];

const permissionRows = [
    ["Inmate Management", "Records and biometric data", ["full", "full", "view", "full", "none"]],
    ["Sentence & Custody", "Sentence and custody modification", ["full", "full", "none", "view", "none"]],
    ["Transfer Management", "Transfer requests and authorization", ["full", "full", "none", "view", "none"]],
    ["Visitor Pass Issuance", "Issuance and identity verification", ["full", "full", "full", "full", "full"]],
    ["Release & Discharge", "Discharge processing and approval", ["full", "review", "none", "view", "none"]],
    ["User & Access Control", "Roles, credentials and access policy", ["full", "none", "none", "none", "none"]],
] as const;

const auditEvents = [
    { title: "Unauthorized release attempt", detail: "Badge SEC-01459 · Gatekeeper Alan Lee · Release & Discharge", time: "Today, 14:22:05", outcome: "Blocked", tone: "danger" },
    { title: "Privilege escalation warning", detail: "Badge SEC-01104 · Prison Officer Robert King · Admin token", time: "Today, 11:05:41", outcome: "Rejected", tone: "danger" },
    { title: "Invalid badge identifier", detail: "External IP 192.168.4.102 · Malformed security hash", time: "Yesterday, 23:14:00", outcome: "IP flagged", tone: "warning" },
];

function initials(name: string) {
    return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function messageFrom(error: unknown, fallback: string) {
    if (error && typeof error === "object" && "response" in error) {
        const response = (error as { response?: { data?: { message?: string } } }).response;
        if (response?.data?.message) return response.data.message;
    }
    return error instanceof Error ? error.message : fallback;
}

export default function UserAccess() {
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "Inactive">("all");
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    useEffect(() => {
        let mounted = true;
        userService.getUsers()
            .then((data: User[]) => {
                if (mounted) setUsers(Array.isArray(data) ? data : []);
            })
            .catch((reason: unknown) => {
                if (mounted) setError(messageFrom(reason, "Could not load personnel records."));
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });
        return () => { mounted = false; };
    }, []);

    const filteredUsers = useMemo(() => {
        const query = search.trim().toLowerCase();
        return users.filter((user) => {
            const matchesQuery = !query || `${user.name} ${user.badgeId} ${user.role} ${user.facility}`.toLowerCase().includes(query);
            return matchesQuery && (statusFilter === "all" || user.status === statusFilter);
        });
    }, [search, statusFilter, users]);

    const updateRole = async (user: User, role: AccessRole) => {
        setSavingId(user.id);
        setError("");
        try {
            const updated = await userService.updateUserRole(user.id, role);
            setUsers((current) => current.map((item) => item.id === user.id ? updated : item));
        } catch (reason) {
            setError(messageFrom(reason, "Could not update this user's role."));
        } finally {
            setSavingId(null);
        }
    };

    const toggleStatus = async (user: User) => {
        setSavingId(user.id);
        setError("");
        try {
            const updated = await userService.setUserStatus(user.id, user.status !== "Active");
            setUsers((current) => current.map((item) => item.id === user.id ? updated : item));
        } catch (reason) {
            setError(messageFrom(reason, "Could not update personnel status."));
        } finally {
            setSavingId(null);
        }
    };

    const openEdit = (user: User) => {
        setEditingUser(user);
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingUser(null);
    };

    const activeCount = users.filter((user) => user.status === "Active").length;
    const inactiveCount = users.filter((user) => user.status !== "Active").length;

    return (
        <div className="access-page">
            {showForm && (
                <AddUserForm
                    key={editingUser?.id ?? "new-user"}
                    userToEdit={editingUser}
                    onClose={closeForm}
                    onUserCreated={(user: User) => { setUsers((current) => [user, ...current]); closeForm(); }}
                    onUserUpdated={(user: User) => { setUsers((current) => current.map((item) => item.id === user.id ? user : item)); closeForm(); }}
                />
            )}

            <section className="access-summary" aria-label="Access control summary">
                <div className="summary-card"><span>Active personnel</span><strong>{activeCount || "—"}</strong><small>+3 this week</small></div>
                <div className="summary-card"><span>Privilege escalations</span><strong>0</strong><small className="good">Optimal security</small></div>
                <div className="summary-card"><span>Failed auth attempts</span><strong>12</strong><small className="alert">Requires audit</small></div>
                <div className="summary-card"><span>Inactive accounts</span><strong>{inactiveCount || "—"}</strong><small>Review access levels</small></div>
            </section>

            <section className="access-panel" id="personnel">
                <div className="access-panel-heading">
                    <div>
                        <p className="section-kicker">Identity governance</p>
                        <h2>Personnel authentication &amp; roles</h2>
                        <p>Manage security clearances and active role allocations across facilities.</p>
                    </div>
                    <button className="access-primary" type="button" onClick={() => { setEditingUser(null); setShowForm(true); }}>
                        <span aria-hidden="true">+</span> Assign role
                    </button>
                </div>

                {error && <p className="access-alert" role="alert">{error}</p>}

                <div className="access-toolbar">
                    <label className="access-search">
                        <span aria-hidden="true">⌕</span>
                        <span className="visually-hidden">Search personnel</span>
                        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search personnel..." />
                    </label>
                    <label className="filter-label">
                        Status
                        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                            <option value="all">All personnel</option>
                            <option value="Active">Active only</option>
                            <option value="Inactive">Inactive only</option>
                        </select>
                    </label>
                </div>

                <div className="access-table-wrap">
                    <table className="access-table">
                        <thead><tr><th>Personnel name</th><th>Badge ID</th><th>Assigned role</th><th>Facility sector</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            {loading && <tr><td className="access-empty" colSpan={6}>Loading personnel records…</td></tr>}
                            {!loading && filteredUsers.length === 0 && <tr><td className="access-empty" colSpan={6}>No personnel match the current filters.</td></tr>}
                            {!loading && filteredUsers.map((user) => (
                                <tr key={user.id}>
                                    <td><span className="person-chip"><span className="person-initials">{initials(user.name)}</span><strong>{user.name}</strong></span></td>
                                    <td><code>{user.badgeId}</code></td>
                                    <td>
                                        <select className="role-select" value={user.role} disabled={savingId === user.id} onChange={(event) => void updateRole(user, event.target.value as AccessRole)}>
                                            {roles.map((role) => <option key={role}>{role}</option>)}
                                        </select>
                                    </td>
                                    <td className="muted">{user.facility}</td>
                                    <td><span className={`status-pill ${user.status === "Active" ? "is-active" : "is-inactive"}`}><i aria-hidden="true" />{user.status}</span></td>
                                    <td><div className="row-actions">
                                        <button type="button" onClick={() => openEdit(user)} aria-label={`Edit ${user.name}`}>Edit</button>
                                        <button type="button" onClick={() => void toggleStatus(user)} disabled={savingId === user.id}>{user.status === "Active" ? "Disable" : "Enable"}</button>
                                    </div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="table-footer"><span>Showing {filteredUsers.length} of {users.length} personnel entries</span><span className="table-note">Role changes are logged automatically</span></div>
            </section>

            <section className="access-panel" id="permissions">
                <div className="access-panel-heading compact"><div><p className="section-kicker">Least privilege policy</p><h2>UI permission matrix</h2><p>Configure feature access by operational role.</p></div></div>
                <div className="access-table-wrap">
                    <table className="access-table permission-table">
                        <thead><tr><th>Module / feature scope</th>{roles.map((role) => <th key={role}>{role}</th>)}</tr></thead>
                        <tbody>{permissionRows.map(([name, detail, levels]) => <tr key={name}><th scope="row"><strong>{name}</strong><small>{detail}</small></th>{levels.map((level, index) => <td key={`${name}-${roles[index]}`}><span className={`permission-mark permission-${level}`} aria-label={level}>{level === "full" ? "✓" : level === "view" ? "◉" : level === "review" ? "↗" : "—"}</span></td>)}</tr>)}</tbody>
                    </table>
                </div>
                <div className="permission-legend"><span><i className="permission-mark permission-full">✓</i> Full access</span><span><i className="permission-mark permission-view">◉</i> View only</span><span><i className="permission-mark permission-review">↗</i> Review required</span><span><i className="permission-mark permission-none">—</i> No access</span></div>
            </section>

            <section className="access-lower-grid" id="audit">
                <article className="access-panel guard-panel"><p className="section-kicker">Policy enforcement</p><h2>Restricted operation guard</h2><p>Configure strict multi-factor or biometric guard rails for elevated actions.</p><label>Require secondary approval<select defaultValue="release"><option value="release">For all Releases &amp; Discharges</option><option value="transfer">For all Transfers</option></select></label><label>Auto-lockout threshold<select defaultValue="3"><option value="3">3 failed attempts</option><option value="5">5 failed attempts</option></select></label><label className="checkbox-label"><input type="checkbox" defaultChecked /> Immediate IP geofencing alert</label><button className="access-primary full-width" type="button">Save guard configuration</button></article>
                <article className="access-panel audit-panel"><div className="audit-heading"><div><p className="section-kicker">Security telemetry</p><h2>Failed authorization audit logs</h2><p>Real-time record of unauthorized module access attempts.</p></div><button type="button" className="export-button">↓ Export CSV</button></div><div className="audit-list">{auditEvents.map((event) => <div className={`audit-event ${event.tone}`} key={event.title}><span className="audit-icon" aria-hidden="true">{event.tone === "danger" ? "!" : "△"}</span><div><strong>{event.title}</strong><p>{event.detail}</p></div><time>{event.time}<b>{event.outcome}</b></time></div>)}</div></article>
            </section>
        </div>
    );
}
