import { useState } from "react";
import { userService } from "../api/userService";

const emptyUserForm = {
    name: "",
    badgeId: "",
    role: "User",
    facility: "",
    status: "Active",
};

export default function AddUserForm({ onClose, onUserCreated, userToEdit, onUserUpdated }) {
    const [newUser, setNewUser] = useState(() => userToEdit ?? emptyUserForm);
    const [formError, setFormError] = useState("");
    const isEditing = Boolean(userToEdit);

    const handleFieldChange = (field, value) => {
        setNewUser((currentUser) => ({ ...currentUser, [field]: value }));
        if (formError) setFormError("");
    };

    const addUser = async (event) => {
        event.preventDefault();

        const name = newUser.name.trim();
        const badgeId = newUser.badgeId.trim();
        const facility = newUser.facility.trim();

        if (!name || !badgeId || !facility) {
            setFormError("Name, badge ID, and facility are required.");
            return;
        }

        const savedUser = {
            ...(userToEdit ?? {}),
            id: userToEdit?.id ?? Date.now().toString(),
            name,
            badgeId,
            role: newUser.role,
            facility,
            status: newUser.status,
        };

        if (isEditing) {
            onUserUpdated(savedUser);
        } else {
            onUserCreated(savedUser);
        }
        onClose();
        if (isEditing) {
            await userService.updateUser(savedUser);
        } else {
            await userService.createUser(savedUser);
        }
    };

    return (
        <div className="modal-backdrop">
            <button
                type="button"
                aria-label="Close add user dialog"
                onClick={onClose}
                className="modal-dismiss"
            />
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-user-title"
                className="modal-panel"
            >
                <form onSubmit={addUser}>
                    <div className="modal-heading">
                        <div>
                            <p>Personnel access</p>
                            <h2 id="add-user-title">{isEditing ? "Edit user" : "Add user"}</h2>
                        </div>
                        <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">
                            ×
                        </button>
                    </div>

                    <div className="modal-fields">
                        <label className="modal-field">
                            Name
                            <input
                                type="text"
                                value={newUser.name}
                                onChange={(event) => handleFieldChange("name", event.target.value)}
                                autoComplete="name"
                            />
                        </label>
                        <label className="modal-field">
                            Badge ID
                            <input
                                type="text"
                                value={newUser.badgeId}
                                onChange={(event) => handleFieldChange("badgeId", event.target.value)}
                            />
                        </label>
                        <label className="modal-field">
                            Role
                            <select
                                value={newUser.role}
                                onChange={(event) => handleFieldChange("role", event.target.value)}
                            >
                                <option value="User">User</option>
                                <option value="Admin">Admin</option>
                                <option value="Viewer">Viewer</option>
                            </select>
                        </label>
                        <label className="modal-field">
                            Facility
                            <input
                                type="text"
                                value={newUser.facility}
                                onChange={(event) => handleFieldChange("facility", event.target.value)}
                            />
                        </label>
                        <label className="modal-field">
                            Status
                            <select
                                value={newUser.status}
                                onChange={(event) => handleFieldChange("status", event.target.value)}
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </label>
                    </div>

                    {formError && <p className="modal-error" role="alert">{formError}</p>}

                    <div className="modal-actions">
                        <button type="button" className="modal-cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="primary-button">
                            {isEditing ? "Save changes" : "Save user"}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
