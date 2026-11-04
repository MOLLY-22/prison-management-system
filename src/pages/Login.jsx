import LoginComponent from "../components/LoginForm";

export default function Login() {
    return (
        <main className="login-page">
            <div className="login-layout">
                <header className="login-brand">
                    <span className="login-brand-rule" aria-hidden="true" />
                    <h1>Prison System Management</h1>
                </header>
                <LoginComponent />
            </div>
        </main>
    );
}
