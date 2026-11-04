import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";

function getErrorMessage(error) {
    return error.response?.data?.message || error.message || "Unable to sign in. Please try again.";
}

export default function LoginForm() {
    const { login, loading, authError } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [credentials, setCredentials] = useState({
        email: "",
        password: "",
        rememberMe: false,
    });
    const [errorMessage, setErrorMessage] = useState("");
    const [passwordShown, setPasswordShown] = useState(false);

    const handleChange = (event) => {
        const { name, value, checked, type } = event.target;
        setCredentials((current) => ({
            ...current,
            [name]: type === "checkbox" ? checked : value,
        }));
        setErrorMessage("");
    };

    const handleSubmit = async (event) => {
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

    return (
        <form className="login-card" onSubmit={handleSubmit}>
            <header className="login-card-heading">
                <span className="login-mark" aria-hidden="true">◇</span>
                <h2>Sign in</h2>
                <p>Use your authorized staff account to continue.</p>
            </header>

            <label className="login-field" htmlFor="email">
                <span>Email</span>
                <input
                    autoComplete="username"
                    id="email"
                    name="email"
                    onChange={handleChange}
                    placeholder="Enter your email"
                    required
                    type="email"
                    value={credentials.email}
                />
            </label>

            <label className="login-field" htmlFor="password">
                <span>Password</span>
                <span className="password-control">
                    <input
                        autoComplete="current-password"
                        id="password"
                        name="password"
                        onChange={handleChange}
                        placeholder="Enter your password"
                        required
                        type={passwordShown ? "text" : "password"}
                        value={credentials.password}
                    />
                    <button
                        aria-label={passwordShown ? "Hide password" : "Show password"}
                        aria-pressed={passwordShown}
                        className="password-toggle"
                        onClick={() => setPasswordShown((shown) => !shown)}
                        type="button"
                    >
                        {passwordShown ? "Hide" : "Show"}
                    </button>
                </span>
            </label>

            <div className="login-options">
                <label className="remember-option" htmlFor="remember-me">
                    <input
                        checked={credentials.rememberMe}
                        id="remember-me"
                        name="rememberMe"
                        onChange={handleChange}
                        type="checkbox"
                    />
                    <span>Remember me</span>
                </label>
            </div>

            {(authError || errorMessage) && (
                <p className="login-feedback login-error" role="alert">
                    {errorMessage || authError}
                </p>
            )}

            <button className="login-submit" disabled={loading} type="submit">
                {loading ? "Signing in…" : "Sign in"}
            </button>
        </form>
    );
}
