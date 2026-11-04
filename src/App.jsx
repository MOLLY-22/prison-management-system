import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import SuperAdmin from "./dashboard/superadmin";
import { AuthProvider } from "./context/AuthContext.jsx";
import { useAuth } from "./context/authContext";

function RequireAuth({ children }) {
    const { isAuthenticated, isInitializing } = useAuth();
    const location = useLocation();

    if (isInitializing) {
        return <main className="route-loading" role="status">Checking your session…</main>;
    }

    return isAuthenticated
        ? children
        : <Navigate to="/login" replace state={{ from: location }} />;
}

function GuestOnly({ children }) {
    const { isAuthenticated, isInitializing } = useAuth();

    if (isInitializing) {
        return <main className="route-loading" role="status">Checking your session…</main>;
    }

    return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function AppRoutes() {
    const { isAuthenticated, isInitializing } = useAuth();

    if (isInitializing) {
        return <main className="route-loading" role="status">Checking your session…</main>;
    }

    return (
        <Routes>
            <Route
                path="/login"
                element={<GuestOnly><Login /></GuestOnly>}
            />
            <Route
                path="/dashboard"
                element={<RequireAuth><SuperAdmin /></RequireAuth>}
            />
            <Route
                path="/"
                element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppRoutes />
            </BrowserRouter>
        </AuthProvider>
    );
}
