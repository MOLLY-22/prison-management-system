import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function LoginForm() {
    const { login, loading } = useAuth();
    const [credentials, setCredentials] = useState({
        email: "",
        password: "",
        rememberMe: false,
    });
    const [errorMessage, setErrorMessage] = useState("");
    const [message, setMessage] = useState("");
    const [passwordShown, setPasswordShown] = useState(false);

    const handleChange = (event) => {
        const { name, value, checked, type } = event.target;
        setCredentials((current) => ({
            ...current,
            [name]: type === "checkbox" ? checked : value,
        }));
        setErrorMessage("");
        setMessage("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrorMessage("");
        setMessage("");

        try {
            await login(credentials);
            setMessage("Login successful");
        } catch (error) {
            console.error("Login failed:", error);
            setErrorMessage(error.response?.data?.message || "Invalid email or password");
        }
    };

    return (
        <form className="login-card" onSubmit={handleSubmit}>
            <header className="login-card-heading">
                <span className="login-mark" aria-hidden="true">◇</span>
                <h2>Login Form</h2>
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
                        placeholder="*********"
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
                <p className="forgot-password">Forgot password?</p>
            </div>

            {errorMessage && <p className="login-feedback login-error" role="alert">{errorMessage}</p>}
            {message && <p className="login-feedback login-success" role="status">{message}</p>}

            <button className="login-submit" disabled={loading} type="submit">
                {loading ? "Logging in…" : "Login"}
            </button>
        </form>
    );
}
