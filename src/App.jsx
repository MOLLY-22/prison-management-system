
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
