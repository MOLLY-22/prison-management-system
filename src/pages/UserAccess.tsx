import { useEffect, useMemo, useState } from "react";
import { userService, type User } from "../api/userService";
import AddUserForm from "../components/addUserForm";
import "./userAccess.css";

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
                <div className="summary-card"><span>Active personnel</span><strong>{activeCount}</strong><small>From loaded API records</small></div>
                <div className="summary-card"><span>Inactive accounts</span><strong>{inactiveCount}</strong><small>From loaded API records</small></div>
            </section>

            <section className="access-panel" id="personnel">
                <div className="access-panel-heading">
                    <div>
                        <p className="section-kicker">Identity governance</p>
                        <h2>Personnel Detail </h2>
                        <p>Manage security clearances and active role allocations</p>
                    </div>
                    <button className="access-primary" type="button" onClick={() => { setEditingUser(null); setShowForm(true); }}>
                        <span aria-hidden="true">+</span> Add User
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
                                    <td>{user.role}</td>
                                    <td className="muted">{user.prisonName || user.facility || "—"}</td>
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

            <p className="table-note">
                Available roles are defined by the backend. The API does not expose a configurable permission matrix or security-audit feed for this screen.
            </p>
        </div>
    );
}
