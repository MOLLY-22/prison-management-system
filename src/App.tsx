import type { PropsWithChildren } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { useAuth, AuthProvider } from "./context/AuthContext.tsx";
import Dashboard from "./dashboard/Dashboard";
import LoginForm from "./pages/LoginForm";

function RouteLoading() {
  return (
    <main className="route-loading" role="status">
      Checking your session…
    </main>
  );
}

function RequireAuth({ children }: PropsWithChildren) {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <RouteLoading />;
  return isAuthenticated ? (
    children
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  );
}

function GuestOnly({ children }: PropsWithChildren) {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) return <RouteLoading />;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function AppRoutes() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) return <RouteLoading />;

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
        }
      />
      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginForm />
          </GuestOnly>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
