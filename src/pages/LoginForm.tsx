import { useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./loginForm.css";

type LoginLocationState = {
    from?: {
        pathname: string;
    };
};

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

function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError<{ message?: string }>(error)) {
        if (!error.response && (error.code === "ERR_NETWORK" || error.message === "Network Error")) {
            return "The sign-in service is unreachable. Please make sure the API is running and try again.";
        }

        return error.response?.data?.message || error.message;
    }

    return error instanceof Error ? error.message : "Unable to sign in. Please try again.";
}

export default function LoginForm() {
    const { login, loading, authError } = useAuth();
    const navigate = useNavigate();
    const location = useLocation() as ReturnType<typeof useLocation> & {
        state: LoginLocationState | null;
    };
    const [credentials, setCredentials] = useState({
        username: "",
        password: "",
        rememberMe: false,
    });
    const [errorMessage, setErrorMessage] = useState("");
    const [passwordShown, setPasswordShown] = useState(false);

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { name, value, checked, type } = event.target;
        setCredentials((current) => ({
            ...current,
            [name]: type === "checkbox" ? checked : value,
        }));
        setErrorMessage("");
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorMessage("");

        try {
            await login(credentials);
            const destination = location.state?.from?.pathname || "/dashboard";
            navigate(destination, { replace: true });
        } catch (error) {
            setErrorMessage(getErrorMessage(error));
        }
    };

    const displayedError = errorMessage || authError;

    return (
        <main className="login-page relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f8fa] px-4 py-8 font-sans text-[#191c1e] sm:px-8">
            <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(67,71,77,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(67,71,77,0.055)_1px,transparent_1px)] [background-size:52px_52px]" />
            <div className="pointer-events-none absolute -left-40 top-1/4 size-[20rem] rounded-full bg-[#d2e4ff]/35 blur-3xl" />
            <div className="pointer-events-none absolute -right-32 bottom-0 size-[24rem] rounded-full bg-[#ffdcc3]/25 blur-3xl" />

            <section className="login-card relative grid w-full max-w-4xl overflow-hidden rounded-[1.25rem] border border-[#c4c6ce]/55 bg-[#f2f4f6]/90 shadow-[0_24px_70px_rgba(25,28,30,0.12)] backdrop-blur-sm lg:grid-cols-[0.86fr_1.14fr]">
                <aside className="relative hidden min-h-[680px] flex-col justify-between overflow-hidden bg-[#0a2540] p-10 text-white lg:flex">
                    <div className="absolute -right-24 -top-20 size-72 rounded-full border border-[#87c0fe]/15" />
                    <div className="absolute -right-7 top-2 size-40 rounded-full border border-[#87c0fe]/15" />
                    <div className="absolute bottom-28 -left-20 size-56 rounded-full border border-[#ffb77d]/15" />
                    <div className="relative z-10 flex flex-col gap-6 text-white">
                        <div className="flex items-center gap-3">
                            <span className="grid size-11 place-items-center rounded-lg bg-[#d2e4ff] text-[#0a2540] shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
                                <Icon name="shield" className="size-6" />
                            </span>
                            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white">PMS / Secure</span>
                        </div>
                        <div className="mt-24 max-w-xs text-white">
                            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-white">Custody operations</p>
                            <h2 className="text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white">Order, protected.</h2>
                            <p className="mt-6 text-sm leading-6 text-[#b0c8eb]">One secure gateway for the people and systems responsible for safe, accountable facility operations.</p>
                        </div>
                    </div>
                    <div className="relative border-l border-[#87c0fe]/35 pl-4 text-xs leading-5 text-[#b0c8eb]">
                        <p className="font-medium text-white">System status: operational</p>
                        <p>All access events are monitored and recorded.</p>
                    </div>
                </aside>

                <div className="flex min-h-[680px] flex-col justify-center px-6 py-10 sm:px-14 lg:px-16">
                    <header className="mb-9">
                        <div className="mb-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#314865]">
                            <span className="size-2 animate-pulse rounded-full bg-[#1e629a]" />
                            PMS-992 · Authorized gateway
                        </div>
                        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#191c1e] sm:text-[2.15rem]">Prison Management System</h1>
                        <p className="mt-2 text-sm text-[#43474d]">Official secure access for authorized personnel.</p>
                    </header>

                    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                        <label className="flex flex-col gap-2" htmlFor="username">
                            <span className="text-sm font-medium text-[#191c1e]">Agency ID or username</span>
                            <span className="relative flex items-center">
                                <Icon name="badge" className="pointer-events-none absolute left-3.5 size-[18px] text-[#74777e]" />
                                <input
                                    autoComplete="username"
                                    className="w-full rounded-lg border border-transparent bg-white px-3.5 py-3.5 pl-11 text-sm text-[#191c1e] outline-none ring-1 ring-[#e0e3e5] transition placeholder:text-[#74777e] hover:ring-[#9ccaff] focus:ring-2 focus:ring-[#1e629a]"
                                    id="username"
                                    name="username"
                                    onChange={handleChange}
                                    placeholder="e.g. AGENT-84920"
                                    required
                                    type="text"
                                    value={credentials.username}
                                />
                            </span>
                        </label>

                        <label className="flex flex-col gap-2" htmlFor="password">
                            <span className="text-sm font-medium text-[#191c1e]">Password</span>
                            <span className="relative flex items-center">
                                <Icon name="lock" className="pointer-events-none absolute left-3.5 size-[18px] text-[#74777e]" />
                                <input
                                    autoComplete="current-password"
                                    className="w-full rounded-lg border border-transparent bg-white px-3.5 py-3.5 pl-11 pr-12 text-sm text-[#191c1e] outline-none ring-1 ring-[#e0e3e5] transition placeholder:text-[#74777e] hover:ring-[#9ccaff] focus:ring-2 focus:ring-[#1e629a]"
                                    id="password"
                                    name="password"
                                    onChange={handleChange}
                                    placeholder="Enter your passphrase"
                                    required
                                    type={passwordShown ? "text" : "password"}
                                    value={credentials.password}
                                />
                                <button
                                    aria-label={passwordShown ? "Hide password" : "Show password"}
                                    aria-pressed={passwordShown}
                                    className="absolute right-3.5 rounded p-1 text-[#74777e] transition hover:bg-[#f2f4f6] hover:text-[#191c1e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e629a]"
                                    onClick={() => setPasswordShown((shown) => !shown)}
                                    type="button"
                                >
                                    <Icon name={passwordShown ? "eyeOff" : "eye"} className="size-[18px]" />
                                </button>
                            </span>
                        </label>

                        <div className="flex items-center justify-between pt-1">
                            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#43474d]" htmlFor="remember-me">
                                <input
                                    checked={credentials.rememberMe}
                                    className="size-4 rounded border-[#74777e] accent-[#1e629a] focus:ring-[#1e629a]"
                                    id="remember-me"
                                    name="rememberMe"
                                    onChange={handleChange}
                                    type="checkbox"
                                />
                                Remember device
                            </label>
                            {/* <button className="text-sm font-medium text-[#1e629a] transition hover:text-[#004e82] hover:underline" type="button">Hardware key?</button> */}
                        </div>

                        {displayedError && (
                            <p className="rounded-lg border border-[#ffdad6] bg-[#fff4f2] px-3 py-2.5 text-sm text-[#93000a]" id="login-error" role="alert">
                                {displayedError}
                            </p>
                        )}

                        <button
                            className="mt-1 flex w-full items-center justify-center gap-3 rounded-lg bg-[#0a2540] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(10,37,64,0.18)] transition hover:bg-[#314865] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e629a] disabled:cursor-wait disabled:opacity-70"
                            disabled={loading}
                            type="submit"
                        >
                            {loading ? "Verifying credentials…" : "Sign in to secure gateway"}
                            {!loading && <Icon name="arrow" className="size-5" />}
                        </button>
                    </form>

                    <div className="mt-10 border-t border-[#c4c6ce]/70 pt-5">
                        <button className="text-left text-xs leading-5 text-[#74777e] transition hover:text-[#191c1e] hover:underline" type="button">
                            Forgot credentials / request clearance level
                        </button>
                        <div className="mt-5 flex items-start gap-2.5 rounded-lg bg-[#e6e8ea]/75 p-3.5 text-xs leading-5 text-[#43474d]">
                            <Icon name="info" className="mt-0.5 size-4 shrink-0 text-[#1e629a]" />
                            <p>Unauthorized access is a federal violation. Session parameters and telemetry are logged.</p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
