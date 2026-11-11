import { useState, type FormEvent } from "react";
import axios from "axios";
import { userService } from "../api/userService";
import type { User } from "../api/userService";

type UserForm = Omit<User, "id"> & { password?: string };

const emptyUserForm: UserForm = {
    name: "",
    badgeId: "",
    role: "Records Officer",
    facility: "",
    status: "Active",
    password: "",
};

type AddUserFormProps = {
    onClose: () => void;
    onUserCreated: (user: User) => void;
    userToEdit: User | null;
    onUserUpdated: (user: User) => void;
};

const roles = ["Records Officer"];

function getErrorMessage(error: unknown) {
    if (axios.isAxiosError<{ message?: string }>(error)) {
        return error.response?.data?.message || error.message;
    }
    return error instanceof Error ? error.message : "Could not save this user.";
}

export default function AddUserForm({ onClose, onUserCreated, userToEdit, onUserUpdated }: AddUserFormProps) {
    const [newUser, setNewUser] = useState<UserForm>(() => userToEdit
        ? { name: userToEdit.name, badgeId: userToEdit.badgeId, role: userToEdit.role, facility: userToEdit.facility, status: userToEdit.status }
        : emptyUserForm);
    const [formError, setFormError] = useState("");
    const isEditing = Boolean(userToEdit);
    const roleOptions = userToEdit && !roles.includes(userToEdit.role)
        ? [userToEdit.role, ...roles]
        : roles;

    const handleFieldChange = (field: keyof UserForm, value: string) => {
        setNewUser((currentUser) => ({ ...currentUser, [field]: value }));
        if (formError) setFormError("");
    };

    const addUser = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const name = newUser.name.trim();
        const badgeId = newUser.badgeId.trim();
        const password = newUser.password?.trim() || "";

        if (!name || !badgeId || (!isEditing && !password)) {
            setFormError(isEditing ? "Name and username are required." : "Name, username, and password are required.");
            return;
        }

        const savedUser: UserForm & { password?: string } = { ...newUser, name, badgeId, password };

        try {
            const persistedUser = isEditing
                ? await userService.updateUser({ ...savedUser, id: userToEdit!.id })
                : await userService.createUser(savedUser);

            if (isEditing) {
                onUserUpdated(persistedUser);
            } else {
                onUserCreated(persistedUser);
            }
            onClose();
        } catch (error: unknown) {
            setFormError(getErrorMessage(error));
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
                                {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                            </select>
                        </label>
                        <label className="modal-field">
                            Password {isEditing ? "(leave blank to keep current)" : ""}
                            <input type="password" value={newUser.password || ""} onChange={(event) => handleFieldChange("password", event.target.value)} />
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
