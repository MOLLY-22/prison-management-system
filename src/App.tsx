import type { PropsWithChildren } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Login from "./pages/LoginForm";
import Dashboard from "./Dashboard/Dashboard";
import { AuthProvider, useAuth } from "./context/AuthContext";

function RequireAuth({ children }: PropsWithChildren) {
    const { isAuthenticated, isInitializing } = useAuth();
    const location = useLocation();

    if (isInitializing) {
        return <main className="route-loading" role="status">Checking your session…</main>;
    }

    return isAuthenticated
        ? children
        : <Navigate to="/login" replace state={{ from: location }} />;
}

function GuestOnly({ children }: PropsWithChildren) {
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
                element={<RequireAuth><Dashboard /></RequireAuth>}
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
