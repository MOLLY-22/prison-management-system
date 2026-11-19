import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import axios from "axios";
import { prisonService, type PrisonSummary } from "../api/prisonService";
import { userService, type CreateUserRequest, type User, type UserRole } from "../api/userService";
type IconName = "badge" | "lock" | "eye" | "eyeOff" | "arrow" | "info" | "shield";

function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
    const paths: Record<IconName, ReactNode> = {
        badge: (
            <>
                <path d="M15 11a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z" />
                <path d="M5.5 20a5.5 5.5 0 0 1 11 0M18 8.5h2.5a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H18M6 20.5H3a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1h2.5" />
            </>
        ),
        lock: (
            <>
                <rect height="10" rx="1.5" width="14" x="5" y="10" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" />
            </>
        ),
        eye: (
            <>
                <path d="M2.5 12s3.2-5 9.5-5 9.5 5 9.5 5-3.2 5-9.5 5-9.5-5-9.5-5Z" />
                <circle cx="12" cy="12" r="2.5" />
            </>
        ),
        eyeOff: (
            <>
                <path d="m3 3 18 18M10.6 6.2A10.7 10.7 0 0 1 12 6c6.3 0 9.5 6 9.5 6a17 17 0 0 1-3.1 3.7M6.2 6.8C3.9 8.3 2.5 12 2.5 12s3.2 6 9.5 6c1.4 0 2.6-.3 3.7-.8" />
                <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            </>
        ),
        arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
        info: (
            <>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5M12 8h.01" />
            </>
        ),
        shield: (
            <>
                <path d="M12 3 19 6v5c0 4.5-2.8 8.3-7 10-4.2-1.7-7-5.5-7-10V6l7-3Z" />
                <path d="m9 12 2 2 4-4" />
            </>
        ),
    };

    return (
        <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">
            {paths[name]}
        </svg>
    );
}
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
    const [prisons, setPrisons] = useState<PrisonSummary[]>([]);
    const [loadingPrisons, setLoadingPrisons] = useState(true);
    const [prisonLoadError, setPrisonLoadError] = useState("");
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);
    const isEditing = Boolean(userToEdit);
    const isSuperAdmin = newUser.role === "Super Admin";
    const roleOptions = userToEdit && !roles.includes(userToEdit.role as UserRole)
        ? [userToEdit.role, ...roles]
        : roles;
    const [passwordShown, setPasswordShown] = useState(false);

    useEffect(() => {
        let mounted = true;
        prisonService.getPrisons(0, "", "active", 100)
            .then(({ records }) => {
                if (mounted) setPrisons(records);
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
                persistedUser = await userService.updateUser(userToEdit.id, {
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
            setFormError(
                axios.isAxiosError(error) && !error.response
                    ? "The save could not be confirmed; the API may have accepted it before the connection failed. Check the personnel list before retrying."
                    : getErrorMessage(error),
            );
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
                            <label className="modal-field" htmlFor="password">
                                Password
                                <span className="modal-password-control">
                                    <input
                                        id="password"
                                        name="password"
                                        type={passwordShown ? "text" : "password"}
                                        className="modal-password-input"
                                        value={newUser.password}
                                        onChange={(event) => handleFieldChange("password", event.target.value)}
                                        autoComplete="new-password"
                                        minLength={8}
                                        maxLength={16}
                                        required
                                    />
                                    <button
                                        aria-label={passwordShown ? "Hide password" : "Show password"}
                                        aria-pressed={passwordShown}
                                        className="modal-password-toggle"
                                        onClick={() => setPasswordShown((shown) => !shown)}
                                        type="button"
                                    >
                                        <Icon name={passwordShown ? "eyeOff" : "eye"} className="size-[18px]" />
                                    </button>
                                </span>
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
