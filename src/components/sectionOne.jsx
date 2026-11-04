import { useEffect, useMemo, useState } from "react";
import { userService, INITIAL_MOCK_USERS } from "../api/userService";
import AddUserForm from "./addUserForm";

export default function SectionOne() {
    const [users, setUsers] = useState(INITIAL_MOCK_USERS);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    useEffect(() => {
        let mounted = true;

        async function loadUsers() {
            setLoading(true);
            try {
                const data = await userService.getUsers();
                if (mounted) setUsers(data);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        loadUsers();
        return () => {
            mounted = false;
        };
    }, []);

    const filteredUsers = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return users;
        return users.filter((user) =>
            `${user.name} ${user.badgeId} ${user.role} ${user.facility}`.toLowerCase().includes(query)
        );
    }, [search, users]);

    const editUser = (user) => {
        setEditingUser(user);
        setShowForm(true);
    };

    const toggleUserStatus = async (user) => {
        const updatedUser = {
            ...user,
            status: user.status === "Active" ? "Inactive" : "Active",
        };

        setUsers((currentUsers) =>
            currentUsers.map((currentUser) => currentUser.id === user.id ? updatedUser : currentUser)
        );
        await userService.updateUser(updatedUser);
    };

    const deleteUser = async (user) => {
        if (!window.confirm(`Delete ${user.name} from personnel access?`)) return;

        await userService.deleteUser(user.id);
        setUsers((currentUsers) => currentUsers.filter((currentUser) => currentUser.id !== user.id));
    };

    return (
        <section className="content-panel personnel-panel" id="personnel">
            {showForm && (
                <AddUserForm
                    key={editingUser?.id ?? "new-user"}
                    userToEdit={editingUser}
                    onClose={() => {
                        setShowForm(false);
                        setEditingUser(null);
                    }}
                    onUserCreated={(createdUser) => setUsers((currentUsers) => [createdUser, ...currentUsers])}
                    onUserUpdated={(updatedUser) => setUsers((currentUsers) =>
                        currentUsers.map((user) => user.id === updatedUser.id ? updatedUser : user)
                    )}
                />
            )}
            <div className="panel-heading panel-heading-row">
                <div>
                    <h2>Personnel authentication &amp; roles</h2>
                    <p className="panel-description">Manage security clearances and active role allocations across facilities.</p>
                </div>
                <button className="primary-button" type="button" onClick={() => setShowForm(true)}>
                    Add user
                </button>
            </div>

            <div className="table-toolbar">
                <label className="search-control">
                    <span className="search-symbol" aria-hidden="true">⌕</span>
                    <span className="visually-hidden">Search personnel</span>
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search personnel..."
                    />
                </label>
                <span className="record-count">{filteredUsers.length} personnel</span>
            </div>

            <div className="table-scroll">
                <table className="data-table personnel-table">
                    <thead>
                        <tr>
                            <th scope="col">Personnel</th>
                            <th scope="col">Badge ID</th>
                            <th scope="col">Assigned role</th>
                            <th scope="col">Facility sector</th>
                            <th scope="col">Status</th>
                            <th scope="col">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td className="empty-state" colSpan="6">Loading personnel records…</td></tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr><td className="empty-state" colSpan="6">No personnel match “{search}”.</td></tr>
                        ) : filteredUsers.map((user) => (
                            <tr key={user.id ?? user.badgeId}>
                                <td>
                                    <div className="person-cell">
                                        <span className="person-avatar" aria-hidden="true">
                                            {user.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                                        </span>
                                        <span className="person-name">{user.name}</span>
                                    </div>
                                </td>
                                <td><span className="badge-code">{user.badgeId}</span></td>
                                <td><span className="role-tag">{user.role}</span></td>
                                <td className="muted-cell">{user.facility}</td>
                                <td>
                                    <span className={`status-tag ${user.status === "Active" ? "status-active" : "status-inactive"}`}>
                                        <span aria-hidden="true" />
                                        {user.status}
                                    </span>
                                </td>
                                <td>
                                    <div className="personnel-actions">
                                        <button type="button" onClick={() => editUser(user)}>Edit</button>
                                        <button
                                            type="button"
                                            className="action-deactivate"
                                            onClick={() => toggleUserStatus(user)}
                                        >
                                            {user.status === "Active" ? "Deactivate" : "Activate"}
                                        </button>
                                        <button
                                            type="button"
                                            className="action-delete"
                                            onClick={() => deleteUser(user)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </section>
    );
}
