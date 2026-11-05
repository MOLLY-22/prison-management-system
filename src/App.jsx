
import { useState } from 'react';

import Topbanner from './components/Topbanner';
import ReleaseEligibilityQueueDashboard from './components/ReleaseEligibilityQueueDashboard';
import OfficerinChargeReleaseAuthorizationModal from './components/OfficerinChargeReleaseAuthorizationModal';
import DischargeEventRecording from './components/DischargeEventRecording';
import DischageClearance from './components/DischageClearance';
import DashboardMetricsQueueHeader from './components/DashboardMetrics&QueueHeader ';
import DischargeClearanceList from './components/DischargeClearanceChecklist';
import DataTable from './components/DataTable';

import './App.css';
import { AuthProvider } from './context/AuthContext';

function App() {
  const [search, setSearch] = useState('');
  const [eligibilityStatus, setEligibilityStatus] = useState('all');

  return (
    <AuthProvider>
      <div className="dashboard-container">
        <main className="main-content">
          <section className="dashboard-section">
            <Topbanner />
          </section>

          <section className="dashboard-section">
            <ReleaseEligibilityQueueDashboard
              search={search}
              setSearch={setSearch}
              eligibilityStatus={eligibilityStatus}
              setEligibilityStatus={setEligibilityStatus}
            />
          </section>

          <section className="dashboard-section">
            <DashboardMetricsQueueHeader />
          </section>

          <section className="dashboard-section">
            <DataTable
              search={search}
              eligibilityStatus={eligibilityStatus}
            />
          </section>

          <section className="dashboard-section">
            <DischargeClearanceList />
          </section>

          <section className="dashboard-section">
            <DischageClearance />
          </section>

          <section className="dashboard-section">
            <DischargeEventRecording />
          </section>
        </main>

        <OfficerinChargeReleaseAuthorizationModal />
      </div>
    </AuthProvider>
  );
}

export default App;
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
