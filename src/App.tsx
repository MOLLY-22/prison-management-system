import { BrowserRouter } from "react-router-dom";
import Dashboard from "./dashboard/Dashboard";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginForm from "./pages/LoginForm";

function AppContent() {
    const { isAuthenticated } = useAuth();
    const isVisitorsPreview =
        import.meta.env.DEV &&
        ["localhost", "127.0.0.1"].includes(window.location.hostname) &&
        new URLSearchParams(window.location.search).get("preview") === "visitors";
    return isAuthenticated || isVisitorsPreview ? <Dashboard /> : <LoginForm />;
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </BrowserRouter>
    );
}
