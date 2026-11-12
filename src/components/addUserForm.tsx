import { useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import { prisonService, type Prison } from "../api/prisonService";
import { userService, type CreateUserRequest, type User, type UserRole } from "../api/userService";

type UserForm = {
    name: string;
    username: string;
    email: string;
    password: string;
    role: UserRole | string;
    prisonId: string;
};

const emptyUserForm: UserForm = {
    name: "",
    username: "",
    email: "",
    password: "",
    role: "Records Officer",
    prisonId: "",
};

type AddUserFormProps = {
    onClose: () => void;
    onUserCreated: (user: User) => void;
    userToEdit: User | null;
    onUserUpdated: (user: User) => void;
};

const roles: UserRole[] = [
    "Super Admin",
    "Records Officer",
    "Disciplinary Officer",
    "Case Officer",
    "Visitor Officer",
    "Rehabilitation Officer",
    "Instructor",
    "Medical Officer",
    "Duty Officer",
];

function getErrorMessage(error: unknown) {
    if (axios.isAxiosError<{ message?: string }>(error)) {
        return error.response?.data?.message || error.message;
    }
    return error instanceof Error ? error.message : "Could not save this user.";
}

function formFromUser(user: User | null): UserForm {
    if (!user) return emptyUserForm;
    return {
        name: user.name,
        username: user.username || user.badgeId,
        email: user.email || "",
        password: "",
        role: user.role,
        prisonId: user.prisonId || "",
    };
}

export default function AddUserForm({
    onClose,
    onUserCreated,
    userToEdit,
    onUserUpdated,
}: AddUserFormProps) {
    const [newUser, setNewUser] = useState<UserForm>(() => formFromUser(userToEdit));
    const [prisons, setPrisons] = useState<Prison[]>([]);
    const [loadingPrisons, setLoadingPrisons] = useState(true);
    const [prisonLoadError, setPrisonLoadError] = useState("");
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);
    const isEditing = Boolean(userToEdit);
    const isSuperAdmin = newUser.role === "Super Admin";
    const roleOptions = userToEdit && !roles.includes(userToEdit.role as UserRole)
        ? [userToEdit.role, ...roles]
        : roles;

    useEffect(() => {
        let mounted = true;
        prisonService.getPrisons({ active: true, size: 100 })
            .then((items) => {
                if (mounted) setPrisons(items);
            })
            .catch((error: unknown) => {
                if (mounted) setPrisonLoadError(getErrorMessage(error));
            })
            .finally(() => {
                if (mounted) setLoadingPrisons(false);
            });
        return () => {
            mounted = false;
        };
    }, []);

    const handleFieldChange = (field: keyof UserForm, value: string) => {
        setNewUser((currentUser) => ({
            ...currentUser,
            [field]: value,
            ...(field === "role" && value === "Super Admin" ? { prisonId: "" } : {}),
        }));
        if (formError) setFormError("");
    };

    const addUser = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const name = newUser.name.trim();
        const username = newUser.username.trim();
        const email = newUser.email.trim();
        const password = newUser.password;

        if (!name || !username) {
            setFormError("Full name and username are required.");
            return;
        }
        if (username.length > 16) {
            setFormError("Username must be 16 characters or fewer.");
            return;
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setFormError("Enter a valid email address.");
            return;
        }
        if (!isEditing && (!password || password.length < 8 || password.length > 16 || !/\d/.test(password) || !/[^\w\s]/.test(password))) {
            setFormError("Password must be 8–16 characters and include at least one digit and one punctuation mark.");
            return;
        }
        if (!isSuperAdmin && !newUser.prisonId) {
            setFormError("Select a prison for this user role.");
            return;
        }

        setSaving(true);
        setFormError("");
        try {
            let persistedUser: User;
            if (isEditing && userToEdit) {
                persistedUser = await userService.updateUser({
                    id: userToEdit.id,
                    name,
                    username,
                    email: email || undefined,
                    role: newUser.role,
                    prisonId: isSuperAdmin ? null : newUser.prisonId,
                });
                onUserUpdated(persistedUser);
            } else {
                const payload: CreateUserRequest = {
                    fullName: name,
                    username,
                    email: email || undefined,
                    password,
                    role: newUser.role,
                    ...(!isSuperAdmin ? { prisonId: newUser.prisonId } : {}),
                };
                persistedUser = await userService.createUser(payload);
                onUserCreated(persistedUser);
            }
            onClose();
        } catch (error: unknown) {
            setFormError(getErrorMessage(error));
        } finally {
            setSaving(false);
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
                            Full name
                            <input
                                type="text"
                                value={newUser.name}
                                onChange={(event) => handleFieldChange("name", event.target.value)}
                                autoComplete="name"
                                required
                            />
                        </label>
                        <label className="modal-field">
                            Username
                            <input
                                type="text"
                                value={newUser.username}
                                onChange={(event) => handleFieldChange("username", event.target.value)}
                                autoComplete="username"
                                maxLength={16}
                                required
                            />
                        </label>
                        <label className="modal-field">
                            Email (optional)
                            <input
                                type="email"
                                value={newUser.email}
                                onChange={(event) => handleFieldChange("email", event.target.value)}
                                autoComplete="email"
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
                        {!isSuperAdmin && (
                            <label className="modal-field">
                                Assigned prison
                                <select
                                    value={newUser.prisonId}
                                    onChange={(event) => handleFieldChange("prisonId", event.target.value)}
                                    disabled={loadingPrisons || Boolean(prisonLoadError)}
                                    required
                                >
                                    <option value="">
                                        {loadingPrisons ? "Loading prisons…" : "Select a prison"}
                                    </option>
                                    {prisons.map((prison) => (
                                        <option key={prison.id} value={prison.id}>{prison.name}</option>
                                    ))}
                                    {userToEdit?.prisonId && !prisons.some((prison) => prison.id === userToEdit.prisonId) && (
                                        <option value={userToEdit.prisonId}>
                                            {userToEdit.prisonName || userToEdit.facility || "Current prison"}
                                        </option>
                                    )}
                                </select>
                                {prisonLoadError && <span role="alert">{prisonLoadError}</span>}
                            </label>
                        )}
                        {!isEditing && (
                            <label className="modal-field">
                                Password
                                <input
                                    type="password"
                                    value={newUser.password}
                                    onChange={(event) => handleFieldChange("password", event.target.value)}
                                    autoComplete="new-password"
                                    minLength={8}
                                    maxLength={16}
                                    required
                                />
                            </label>
                        )}
                    </div>

                    {formError && <p className="modal-error" role="alert">{formError}</p>}

                    <div className="modal-actions">
                        <button type="button" className="modal-cancel" onClick={onClose} disabled={saving}>Cancel</button>
                        <button type="submit" className="primary-button" disabled={saving || (!isSuperAdmin && loadingPrisons)}>
                            {saving ? "Saving…" : isEditing ? "Save changes" : "Save user"}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
