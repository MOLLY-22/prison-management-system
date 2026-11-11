import { useCallback, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import SuperAdmin from './dashboard/superadmin'
import Topbanner from './components/Topbanner'
import ReleaseEligibilityQueueDashboard from './components/ReleaseEligibilityQueueDashboard'
import OfficerinChargeReleaseAuthorizationModal from './components/OfficerinChargeReleaseAuthorizationModal'
import DischargeEventRecording from './components/DischargeEventRecording'
import DischageClearance from './components/DischageClearance'
import DashboardMetricsQueueHeader from './components/DashboardMetrics&QueueHeader '
import DischargeClearanceList from './components/DischargeClearanceChecklist'
import DataTable from './components/DataTable'
import { API_BASE_URL } from './api/apiConfig'
import { AuthProvider } from './context/AuthContext.jsx'
import { useAuth } from './context/authContext'
import './App.css'

const EMPTY_FORM = {
  name: '',
  phone: '',
  itemsBrought: '',
  date: '',
  startTime: '09:00',
  endTime: '10:00',
}

function readJson(response) {
  if (response.status === 204) return null

  return response.text().then((text) => {
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  })
}

function getStoredToken() {
  return localStorage.getItem('pms-access-token') || ''
}

function formatTime(value) {
  if (!value) return '—'

  const timePart = String(value).split('T').at(-1)
  const match = timePart.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return String(value)

  const hourNumber = Number(match[1])
  const suffix = hourNumber >= 12 ? 'PM' : 'AM'
  return `${hourNumber % 12 || 12}:${match[2]} ${suffix}`
}

function toApiTime(value) {
  return value.length === 5 ? `${value}:00` : value
}

function getInmateName(inmate) {
  return inmate.fullName || [inmate.firstName, inmate.lastName].filter(Boolean).join(' ') || 'Unknown inmate'
}

function normalizeInmate(inmate) {
  return { ...inmate, fullName: getInmateName(inmate) }
}

function buildVisitPayload(form, inmate) {
  const inmateName = inmate?.fullName || inmate?.name || ''

  if (!inmateName) {
    throw new Error('Select a valid inmate before registering the visit.')
  }

  return {
    name: form.name.trim(),
    inmate: inmateName,
    phone: form.phone.trim(),
    date: form.date,
    time: toApiTime(form.startTime),
    status: 'Pending',
    purpose: form.itemsBrought.trim(),
    checkedItems: form.itemsBrought.trim() ? [form.itemsBrought.trim()] : [],
    nationalId: '',
    relationshipToInmate: '',
  }
}

function normalizeVisit(record) {
  return {
    id: record.id || record.visitId || record._id,
    name: record.name || record.visitorFullName || record.visitorName || record.visitor?.fullName || 'Unknown visitor',
    inmate: record.inmate || record.inmateName || (record.inmate ? getInmateName(record.inmate) : 'Unknown inmate'),
    status: record.status || 'Recorded',
    date: record.date || record.visitDate || '',
    time: record.time || record.startTime || record.visitStartTime || '',
    endTime: record.endTime || '',
    itemsBrought: record.itemsBrought || record.purpose || '',
    loggedBy: record.loggedBy || record.loggingUserName || record.loggedByName || '',
    inmateId: record.inmateId || record.inmate?.id || '',
    entryTimestamp: record.entryTimestamp || '',
    exitTimestamp: record.exitTimestamp || '',
    source: record,
  }
}

function getStatusClass(status) {
  const normalized = String(status || '').toLowerCase()

  if (normalized === 'approved') return 'scheduled'
  if (normalized === 'rejected') return 'exited'
  if (normalized === 'pending') return 'scheduled'
  return 'scheduled'
}

function VisitorManagement() {
  const [visits, setVisits] = useState([])
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAllSessions, setShowAllSessions] = useState(false)
  const [formBusy, setFormBusy] = useState(false)
  const [inmateSearch, setInmateSearch] = useState('')
  const [inmateResults, setInmateResults] = useState([])
  const [selectedInmate, setSelectedInmate] = useState(null)
  const [lookingUpInmates, setLookingUpInmates] = useState(false)
  const [selectedVisitId, setSelectedVisitId] = useState('')
  const [tokenInput, setTokenInput] = useState(getStoredToken())
  const [authToken, setAuthToken] = useState(getStoredToken())

  const today = new Date().toLocaleDateString('en-CA')
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    date: today,
  })

  const visitCount = visits.length
  const todayLogCount = visits.filter((visit) => visit.date === today).length
  const visitorsToday = new Set(
    visits.filter((visit) => visit.date === today).map((visit) => visit.name.toLowerCase()),
  ).size

  const gateCandidates = useMemo(
    () => visits.filter((visit) => visit.date === today),
    [visits, today],
  )

  const selectedVisit = useMemo(() => {
    if (!selectedVisitId) return gateCandidates[0] || null

    return visits.find((visit) => String(visit.id) === String(selectedVisitId)) || gateCandidates[0] || null
  }, [gateCandidates, selectedVisitId, visits])

  const fetchJson = useCallback(async (url, options = {}) => {
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {}),
    }

    const response = await fetch(url, {
      ...options,
      headers: requestHeaders,
    })

    if (!response.ok) {
      const payload = await readJson(response)
      const message = typeof payload === 'string' ? payload : payload?.message || 'The server rejected the request.'
      throw new Error(message)
    }

    return readJson(response)
  }, [authToken])

  useEffect(() => {
    let active = true

    async function loadVisits() {
      setLoading(true)

      try {
        const response = await fetchJson(`${API_BASE_URL}/visitors?page=0&size=20`)
        const rows = Array.isArray(response)
          ? response
          : Array.isArray(response?.content)
            ? response.content
            : []

        if (!active) return

        setVisits(rows.map(normalizeVisit))
        setNotice('')
      } catch (error) {
        console.error('Loading visits failed:', error)
        if (!active) return
        setNotice(`Cannot load the PMS backend. Check the API at ${API_BASE_URL} and provide a valid bearer token.`)
        setVisits([])
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadVisits()

    return () => {
      active = false
    }
  }, [fetchJson])

  useEffect(() => {
    const query = inmateSearch.trim()
    if (query.length < 2 || selectedInmate) return

    let cancelled = false

    async function searchInmates() {
      setLookingUpInmates(true)
      try {
        const response = await fetchJson(`${API_BASE_URL}/inmates?search=${encodeURIComponent(query)}&page=0&size=10`)
        const rows = Array.isArray(response)
          ? response
          : Array.isArray(response?.content)
            ? response.content
            : []

        if (!cancelled) setInmateResults(rows.map(normalizeInmate))
      } catch (error) {
        if (!cancelled) {
          console.error('Search inmates failed:', error)
          setInmateResults([])
        }
      } finally {
        if (!cancelled) setLookingUpInmates(false)
      }
    }

    const timer = setTimeout(searchInmates, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [fetchJson, inmateSearch, selectedInmate])

  function resetRegistrationForm() {
    setForm({ ...EMPTY_FORM, date: today })
    setInmateSearch('')
    setInmateResults([])
    setSelectedInmate(null)
  }

  async function updateVisitStatus(visitId, status) {
    if (!visitId) return

    try {
      const updated = normalizeVisit(await fetchJson(`${API_BASE_URL}/visitors/${visitId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }))

      setVisits((current) => current.map((visit) => String(visit.id) === String(updated.id) ? updated : visit))
      setNotice(`Visit status changed to ${status}.`)
    } catch (error) {
      console.error('Updating visitor status failed:', error)
      setNotice(error.message || 'Could not update the visit status.')
    }
  }

  async function checkInVisitor(visitId) {
    if (!visitId) return

    try {
      const updated = normalizeVisit(await fetchJson(`${API_BASE_URL}/visitors/${visitId}/entry`, { method: 'POST' }))
      setVisits((current) => current.map((visit) => String(visit.id) === String(updated.id) ? updated : visit))
      setNotice('Visitor checked in successfully.')
    } catch (error) {
      console.error('Checking in visitor failed:', error)
      setNotice(error.message || 'Could not check in the visitor.')
    }
  }

  async function checkOutVisitor(visitId) {
    if (!visitId) return

    try {
      const updated = normalizeVisit(await fetchJson(`${API_BASE_URL}/visitors/${visitId}/exit`, { method: 'POST' }))
      setVisits((current) => current.map((visit) => String(visit.id) === String(updated.id) ? updated : visit))
      setNotice('Visitor checked out successfully.')
    } catch (error) {
      console.error('Checking out visitor failed:', error)
      setNotice(error.message || 'Could not check out the visitor.')
    }
  }

  async function registerVisitor(event) {
    event.preventDefault()

    if (!selectedInmate) {
      setNotice('Search for and select an inmate before registering the visit.')
      return
    }

    const payload = buildVisitPayload(form, selectedInmate)

    const startMinutes = form.startTime.split(':').map(Number).reduce((hours, value) => hours * 60 + value)
    const endMinutes = form.endTime.split(':').map(Number).reduce((hours, value) => hours * 60 + value)

    if (!payload.name || !payload.phone || !payload.date || !payload.time || endMinutes < startMinutes) {
      setNotice('Please complete all required visit details, including the visitor phone number.')
      return
    }

    setFormBusy(true)
    setNotice('')

    try {
      const created = await fetchJson(`${API_BASE_URL}/visitors`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const item = normalizeVisit(created)
      setVisits((current) => [item, ...current])
      resetRegistrationForm()
      setNotice('Visitor visit recorded successfully in the live backend.')
    } catch (error) {
      console.error('Register visitor failed:', error)
      setNotice(error.message || 'Could not register the visit.')
    } finally {
      setFormBusy(false)
    }
  }
  function handleUseToken() {
    const trimmed = tokenInput.trim()
    if (!trimmed) {
      localStorage.removeItem('pms-access-token')
      setAuthToken('')
      setNotice('Token cleared. Add a valid bearer token to query the live backend.')
      return
    }

    localStorage.setItem('pms-access-token', trimmed)
    setAuthToken(trimmed)
    setNotice('Bearer token saved and the live API is active.')
  }

  return (
    <div className="app-shell reference-shell">
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">
            <strong>Prison Management System</strong>
            <span className="breadcrumb-divider">/</span>
            <span>Visitor Management</span>
          </div>

          <div className="reference-topbar-right">
            <span className="secure-pill">● System Secure</span>
            <span>◉ API: {API_BASE_URL}</span>
            <input
              aria-label="Bearer token"
              type="password"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              placeholder="Bearer token"
              style={{ width: '180px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #c8d1dc' }}
            />
            <button type="button" className="primary-button" onClick={handleUseToken}>Use token</button>
          </div>
        </header>

        <div className="page-content" id="visitor-dashboard">
          <section className="page-heading">
            <div>
              <p className="eyebrow">FACILITY OPERATIONS / RECORDS</p>
              <h1>Visitor Management</h1>
              <p className="page-description">
                Register and review visits using the live PMS API contract.
              </p>
            </div>
          </section>

          {notice && (
            <div className="notice" role="status">
              <span>{notice}</span>
              <button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}>×</button>
            </div>
          )}

          <section className="stats-grid" aria-label="Visitor statistics">
            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Visitors today</span>
                <span className="stat-icon stat-blue">♙</span>
              </div>
              <div className="stat-number">{visitorsToday}</div>
              <p className="stat-footnote">Unique visitors in loaded records</p>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Today's total visits</span>
                <span className="stat-icon stat-amber">◷</span>
              </div>
              <div className="stat-number">{todayLogCount}</div>
              <p className="stat-footnote">From the current search page</p>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Gatehouse status</span>
                <span className="stat-icon stat-green">♙</span>
              </div>
              <div className="stat-number secure-word">API ONLY</div>
              <p className="stat-footnote">No check-in/out routes documented</p>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Today's total logs</span>
                <span className="stat-icon stat-purple">◴</span>
              </div>
              <div className="stat-number">{visitCount}</div>
              <p className="stat-footnote">Visit records on this page</p>
            </article>
          </section>

          <div className="reference-dashboard-grid">
            <div className="reference-left-stack">
              <section className="reference-panel reference-registration">
                <div className="reference-panel-heading">
                  <h2><span>♧</span> Visitor Registration Form</h2>
                  <small>Live PMS API</small>
                </div>

                <form className="reference-inline-form" onSubmit={registerVisitor}>
                  <div className="reference-fields-grid">
                    <label>
                      Full Name
                      <input
                        required
                        maxLength="100"
                        placeholder="e.g. Jonathan R. Vance"
                        value={form.name}
                        onChange={(event) => setForm({ ...form, name: event.target.value })}
                      />
                    </label>
                  </div>

                  <label className="reference-wide-field">
                    Inmate Lookup
                    <input
                      placeholder="Search inmate name or ID..."
                      value={inmateSearch}
                      onChange={(event) => {
                        setInmateSearch(event.target.value)
                        setSelectedInmate(null)
                      }}
                    />
                  </label>

                  {lookingUpInmates && <p className="reference-help">Searching inmate records...</p>}

                  {inmateResults.length > 0 && !selectedInmate && (
                    <div className="reference-inmate-results">
                      {inmateResults.map((inmate) => (
                        <button
                          type="button"
                          key={inmate.id || inmate.fullName}
                          onClick={() => {
                            setSelectedInmate(inmate)
                            setInmateSearch(inmate.fullName)
                            setInmateResults([])
                          }}
                        >
                          <strong>{inmate.fullName}</strong>
                          <span>{inmate.prisonName || 'Prison not provided'} · ID {inmate.id}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedInmate && (
                    <div className="reference-selected-inmate">
                      <strong>{selectedInmate.fullName}</strong>
                      <span>{selectedInmate.cellBlock || 'Cell block not provided'} · {selectedInmate.visitationAllowed ? 'Visitation allowed' : 'Restricted'}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInmate(null)
                          setInmateSearch('')
                        }}
                      >
                        Change
                      </button>
                    </div>
                  )}

                  <label className="reference-wide-field">
                    Phone number
                    <input
                      required
                      maxLength="30"
                      placeholder="e.g. 0999 123 456"
                      value={form.phone}
                      onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    />
                  </label>

                  <label className="reference-wide-field">
                    Items brought (optional)
                    <input
                      maxLength="1000"
                      placeholder="List any items brought"
                      value={form.itemsBrought}
                      onChange={(event) => setForm({ ...form, itemsBrought: event.target.value })}
                    />
                  </label>

                  <div className="reference-form-footer">
                    <label>
                      Visit date
                      <input
                        required
                        type="date"
                        min={today}
                        value={form.date}
                        onChange={(event) => setForm({ ...form, date: event.target.value })}
                      />
                    </label>

                    <label>
                      Start time
                      <input
                        required
                        type="time"
                        value={form.startTime}
                        onChange={(event) => setForm({ ...form, startTime: event.target.value })}
                      />
                    </label>

                    <label>
                      End time
                      <input
                        required
                        type="time"
                        value={form.endTime}
                        onChange={(event) => setForm({ ...form, endTime: event.target.value })}
                      />
                    </label>

                    <div>
                      <button className="outline-button" type="button" onClick={resetRegistrationForm}>Clear Form</button>
                      <button className="dark-button" type="submit" disabled={formBusy}>
                        {formBusy ? 'Registering...' : 'Register & Issue Pass'}
                      </button>
                    </div>
                  </div>
                </form>
              </section>

              <section className="reference-panel reference-lookup">
                <div className="reference-panel-heading">
                  <h2><span>⌕</span> Inmate Lookup</h2>
                  <small>Minimum access data from live API</small>
                </div>

                <label className="reference-lookup-search">
                  <input
                    aria-label="Search inmate"
                    placeholder="Search inmate name..."
                    value={inmateSearch}
                    onChange={(event) => setInmateSearch(event.target.value)}
                  />
                  <button type="button" onClick={() => setSelectedInmate(null)}>Lookup</button>
                </label>

                {selectedInmate ? (
                  <div className="reference-inmate-card">
                    <div className="reference-photo-placeholder">
                      {selectedInmate.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div>
                      <h3>{selectedInmate.fullName}</h3>
                      <p>Prison: <strong>{selectedInmate.prisonName || 'Not available'}</strong></p>
                      <small>✓ Verified minimum information displayed</small>
                    </div>
                    <button type="button" disabled>Selected for visit</button>
                  </div>
                ) : (
                  <p className="reference-lookup-empty">Search for an inmate to attach to the visit record.</p>
                )}
              </section>
            </div>

            <div className="reference-right-stack">
              <section className="reference-panel reference-gatehouse">
                <div className="reference-panel-heading">
                  <h2><span>♧</span> Gatehouse Touch Controls</h2>
                  <span className="live-port">LIVE PORT</span>
                </div>

                <label className="gate-visitor-select">
                  Today's visit records
                  <select
                    aria-label="Today's visit records"
                    value={selectedVisit?.id ?? ''}
                    onChange={(event) => setSelectedVisitId(event.target.value)}
                    disabled={gateCandidates.length === 0}
                  >
                    <option value="">Select a visit record...</option>
                    {gateCandidates.map((visitor) => (
                      <option key={visitor.id} value={visitor.id}>{visitor.name}</option>
                    ))}
                  </select>
                </label>

                <div className="reference-gate-buttons">
                  <button
                    className="gate-check-in"
                    type="button"
                    disabled={
                      !selectedVisit ||
                      selectedVisit.status !== 'Approved' ||
                      !!selectedVisit.entryTimestamp ||
                      selectedVisit.date !== today
                    }
                    onClick={() => checkInVisitor(selectedVisit?.id)}
                  >
                    <span>⇥</span>CHECK-IN
                  </button>
                  <button
                    className="gate-check-out"
                    type="button"
                    disabled={
                      !selectedVisit ||
                      !selectedVisit.entryTimestamp ||
                      !!selectedVisit.exitTimestamp ||
                      selectedVisit.date !== today
                    }
                    onClick={() => checkOutVisitor(selectedVisit?.id)}
                  >
                    <span>⇤</span>CHECK-OUT
                  </button>
                </div>

                <p className="reference-gate-empty">
                  Visitor check-in and check-out are now driven by the backend contract for approved visitors.
                </p>

                <div className="reference-port-details">
                  <p><span>Active Station Terminal</span><strong>GT-PORT-04</strong></p>
                  <p><span>Gatekeeper Officer ID</span><strong>SEC-OFF-882</strong></p>
                  <p><span>System Synchronization</span><strong className="optimal-label">Connected</strong></p>
                </div>
              </section>

              <section className="reference-panel reference-session-logs">
                <div className="reference-panel-heading">
                  <h2><span>▤</span> Active Session Logs</h2>
                  <button className="clear-filters" type="button" onClick={() => setShowAllSessions((value) => !value)}>
                    {showAllSessions ? 'Show recent' : `View all (${visitCount})`}
                  </button>
                </div>

                <div className="reference-log-header">
                  <span>VISITOR / INMATE</span>
                  <span>ENTRY</span>
                  <span>STATUS</span>
                </div>

                {loading ? (
                  <p className="reference-log-empty">Loading sessions...</p>
                ) : (showAllSessions ? visits : visits.slice(0, 6)).map((visit) => (
                  <div className="reference-log-row" key={visit.id || `${visit.name}-${visit.date}`}>
                    <div>
                      <strong>{visit.name}</strong>
                      <span>↳ {visit.inmate}</span>
                    </div>
                    <time>{visit.time ? formatTime(visit.time) : '—'}</time>
                    <div className="reference-log-actions">
                      <span className={`reference-log-status ${getStatusClass(visit.status)}`}>{visit.status}</span>
                      <div className="reference-review-actions">
                        <button type="button" disabled={visit.status === 'Approved' || visit.status === 'Rejected'} onClick={() => updateVisitStatus(visit.id, 'Approved')}>Approve</button>
                        <button type="button" className="gate-row-action" disabled={visit.status === 'Rejected' || visit.status === 'Approved'} onClick={() => updateVisitStatus(visit.id, 'Rejected')}>Reject</button>
                      </div>
                    </div>
                  </div>
                ))}

                {!loading && visits.length === 0 && <p className="reference-log-empty">No visitor sessions have been recorded yet.</p>}
              </section>
            </div>
          </div>

          <footer className="page-footer">
            <span>Prison Management System</span>
            <span>Visitor Management · Real API integration</span>
          </footer>
        </div>
      </main>
    </div>
  )

}

function ReleaseDischargeDashboard() {
  const [search, setSearch] = useState('')
  const [eligibilityStatus, setEligibilityStatus] = useState('all')

  return (
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
  )
}

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
    const { isInitializing } = useAuth();

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
              path="/release-discharge"
              element={<RequireAuth><ReleaseDischargeDashboard /></RequireAuth>}
            />
            <Route
              path="/visitors"
              element={<VisitorManagement />}
            />
            <Route
                path="/"
                element={<Navigate to="/visitors" replace />}
            />
            <Route path="*" element={<Navigate to="/visitors" replace />} />
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
